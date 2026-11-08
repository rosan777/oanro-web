// Search insights: what visitors search for, which results they open, and what they cannot find.
//
// WHAT IS COUNTED (one search interaction = one open search box in one tab, identified by a random id
// that lives only in that tab's memory and is never tied to an account):
//   - "search": a query that settled (no typing for ~1 second) while results were shown. Counted once per
//     interaction and normalised query, so retyping the same words does not count again.
//   - "submit": the visitor pressed Enter or chose "View all results". Counted once per interaction and
//     query; it is a search on its own when no "search" row exists for the same interaction and query.
//   - "select": the visitor opened a result. Stored with the query, result type, slug and position, once
//     per interaction and query, which links the click to the search it came from.
// Keystrokes, partial words and anything typed without consent are never sent.
//
// PRIVACY: only with the visitor's Analytics consent (checked in the browser and again on the server
// from the consent cookie). No account id, IP address, user agent or device data is stored; the rate
// limiter keeps only a salted IP hash in its own short-lived table. Queries that look like personal or
// payment data (emails, phone numbers, long digit runs, links, passwords) are dropped, never stored.
// Bots (by user agent) are ignored. Rows older than RETENTION_DAYS are deleted.

import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { product, productCollection, searchEvent } from "./db/schema";
import type { CatalogDb } from "./product-store";

export const RETENTION_DAYS = 180;
export const TREND_MIN_COUNT = 5;
const DAY = 86_400_000;

/** Lower-case, single-spaced, trimmed; Bangla text is kept as typed (NFC). */
export function normalizeQuery(raw: string) {
  return raw
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/["'`“”‘’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** True when a query looks like personal or payment data and must not be stored. */
export function isSensitive(q: string) {
  return (
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(q) || // email
    /(?:\+?88)?0?1[3-9][\d\s-]{8,}/.test(q) || // Bangladeshi mobile number
    /\d[\d\s-]{5,}\d/.test(q) || // long digit runs (card, account, transaction numbers)
    /https?:\/\/|www\./i.test(q) ||
    /\b(pass(word)?|pin|otp|cvv)\b|পাসওয়ার্ড|পিন/i.test(q)
  );
}

export const isBot = (userAgent: string | null) =>
  !userAgent ||
  /bot|crawl|spider|slurp|preview|headless|lighthouse|curl|wget|python|axios|node-fetch/i.test(
    userAgent,
  );

export type SearchEventInput = {
  interactionId: string;
  kind: "search" | "submit" | "select";
  query: string;
  locale: "en" | "bn";
  resultCount: number;
  selectedType: "product" | "collection" | "service" | null;
  selectedSlug: string | null;
  position: number | null;
};

/** Validates a browser report. Returns null when the event must be ignored (sensitive or malformed). */
export function parseSearchEvent(data: Record<string, unknown>): SearchEventInput | null {
  const kind = data.kind;
  if (kind !== "search" && kind !== "submit" && kind !== "select") return null;
  if (typeof data.interactionId !== "string" || !/^[0-9a-f-]{36}$/.test(data.interactionId))
    return null;
  if (typeof data.query !== "string") return null;
  const query = normalizeQuery(data.query);
  if (query.length < 2 || isSensitive(query)) return null;
  const resultCount = Number(data.resultCount);
  if (!Number.isInteger(resultCount) || resultCount < 0 || resultCount > 1000) return null;
  let selectedType: SearchEventInput["selectedType"] = null,
    selectedSlug: string | null = null,
    position: number | null = null;
  if (kind === "select") {
    if (
      data.selectedType !== "product" &&
      data.selectedType !== "collection" &&
      data.selectedType !== "service"
    )
      return null;
    if (typeof data.selectedSlug !== "string" || !/^[a-z0-9-]{1,60}$/.test(data.selectedSlug))
      return null;
    const p = Number(data.position);
    if (!Number.isInteger(p) || p < 1 || p > 50) return null;
    selectedType = data.selectedType;
    selectedSlug = data.selectedSlug;
    position = p;
  }
  return {
    interactionId: data.interactionId,
    kind,
    query,
    locale: data.locale === "bn" ? "bn" : "en",
    resultCount,
    selectedType,
    selectedSlug,
    position,
  };
}

/** Stores one counted event (duplicates for the same interaction, kind and query are ignored). */
export async function recordSearchEvent(db: CatalogDb, e: SearchEventInput, now = new Date()) {
  await db
    .insert(searchEvent)
    .values({ id: randomUUID(), ...e, normalized: e.query, createdAt: now })
    .onConflictDoNothing();
  // Retention: an occasional clean-up as part of normal traffic (cheap thanks to the time index).
  if (Math.random() < 0.02) await pruneSearchEvents(db, now);
}

export async function pruneSearchEvents(db: CatalogDb, now = new Date()) {
  await db
    .delete(searchEvent)
    .where(lt(searchEvent.createdAt, new Date(now.getTime() - RETENTION_DAYS * DAY)));
}

// Admin report -----------------------------------------------------------------------------------

type Window = { from: Date | null; to: Date };

/** Searches in a window: distinct (interaction, query) pairs from "search" and "submit" rows. */
async function termCounts(db: CatalogDb, w: Window) {
  const rows = await db
    .select({
      term: searchEvent.normalized,
      searches: sql<number>`count(distinct ${searchEvent.interactionId})::int`,
      zero: sql<number>`count(distinct ${searchEvent.interactionId}) filter (where ${searchEvent.resultCount} = 0)::int`,
      results: sql<number>`coalesce(round(avg(${searchEvent.resultCount})), 0)::int`,
    })
    .from(searchEvent)
    .where(
      and(
        inArray(searchEvent.kind, ["search", "submit"]),
        w.from ? gte(searchEvent.createdAt, w.from) : undefined,
        lt(searchEvent.createdAt, w.to),
      ),
    )
    .groupBy(searchEvent.normalized);
  return rows;
}

/** The Search insights report for a date window, with the previous equal-length period for trends. */
export async function searchInsights(
  db: CatalogDb,
  from: Date | null,
  prevFrom: Date | null,
  now = new Date(),
) {
  const current = await termCounts(db, { from, to: now });
  const previous = from && prevFrom ? await termCounts(db, { from: prevFrom, to: from }) : [];
  const prevBy = new Map(previous.map(r => [r.term, r.searches]));
  const inWindow = and(
    from ? gte(searchEvent.createdAt, from) : undefined,
    lt(searchEvent.createdAt, now),
  );
  const clicks = await db
    .select({
      term: searchEvent.normalized,
      type: searchEvent.selectedType,
      slug: searchEvent.selectedSlug,
      position: searchEvent.position,
      interactionId: searchEvent.interactionId,
    })
    .from(searchEvent)
    .where(and(eq(searchEvent.kind, "select"), inWindow));
  const clicksByTerm = new Map<string, number>();
  for (const c of clicks) clicksByTerm.set(c.term, (clicksByTerm.get(c.term) ?? 0) + 1);
  const searches = current.reduce((s, r) => s + r.searches, 0);
  const prevSearches = previous.reduce((s, r) => s + r.searches, 0);
  // Click rate: searches (interaction + query) followed by at least one opened result, out of all searches.
  const clicked = new Set(clicks.map(c => `${c.interactionId}|${c.term}`)).size;
  const terms = current
    .map(r => ({ ...r, clicks: clicksByTerm.get(r.term) ?? 0, previous: prevBy.get(r.term) ?? 0 }))
    .sort((a, b) => b.searches - a.searches || a.term.localeCompare(b.term));
  const items = new Map<string, { type: string; slug: string; clicks: number; position: number }>();
  for (const c of clicks) {
    const key = `${c.type}:${c.slug}`;
    const it = items.get(key) ?? { type: c.type ?? "", slug: c.slug ?? "", clicks: 0, position: 0 };
    it.clicks += 1;
    it.position += c.position ?? 0;
    items.set(key, it);
  }
  const topItems = [...items.values()]
    .map(i => ({ ...i, avgPosition: i.clicks ? Math.round((i.position / i.clicks) * 10) / 10 : 0 }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 15);
  // Category interest: clicks on products (by their collection) and on collections themselves.
  const productSlugs = topItems.length
    ? [...items.values()].filter(i => i.type === "product").map(i => i.slug)
    : [];
  const owners = productSlugs.length
    ? await db
        .select({ slug: product.slug, collection: productCollection.nameEn })
        .from(product)
        .innerJoin(productCollection, eq(productCollection.id, product.collectionId))
        .where(inArray(product.slug, productSlugs))
    : [];
  const interest = new Map<string, number>();
  for (const i of items.values()) {
    const name =
      i.type === "product"
        ? (owners.find(o => o.slug === i.slug)?.collection ?? "Other products")
        : i.type === "collection"
          ? `Collection: ${i.slug}`
          : "Studio services";
    interest.set(name, (interest.get(name) ?? 0) + i.clicks);
  }
  return {
    searches,
    prevSearches,
    clickRate: searches ? Math.round((clicked / searches) * 1000) / 10 : 0,
    zeroRate: searches
      ? Math.round((terms.reduce((s, r) => s + r.zero, 0) / searches) * 1000) / 10
      : 0,
    terms: terms.slice(0, 25),
    zeroTerms: terms
      .filter(r => r.zero > 0)
      .sort((a, b) => b.zero - a.zero)
      .slice(0, 20),
    topItems,
    interest: [...interest]
      .map(([name, n]) => ({ name, clicks: n }))
      .sort((a, b) => b.clicks - a.clicks),
  };
}

// JUNO: aggregate trends only ---------------------------------------------------------------------

/**
 * Terms searched at least TREND_MIN_COUNT times in the last `days` days (distinct search interactions),
 * most popular first. Aggregates only: no individual searches, no click paths, no rare terms.
 */
export async function searchTrends(db: CatalogDb, days = 14, now = new Date(), limit = 10) {
  const from = new Date(now.getTime() - days * DAY);
  const rows = await db
    .select({
      term: searchEvent.normalized,
      searches: sql<number>`count(distinct ${searchEvent.interactionId})::int`,
      found: sql<number>`count(distinct ${searchEvent.interactionId}) filter (where ${searchEvent.resultCount} > 0)::int`,
    })
    .from(searchEvent)
    .where(
      and(
        inArray(searchEvent.kind, ["search", "submit"]),
        gte(searchEvent.createdAt, from),
        lt(searchEvent.createdAt, now),
      ),
    )
    .groupBy(searchEvent.normalized)
    .having(sql`count(distinct ${searchEvent.interactionId}) >= ${TREND_MIN_COUNT}`)
    .orderBy(desc(sql`count(distinct ${searchEvent.interactionId})`))
    .limit(limit);
  const [latest] = await db
    .select({ n: count() })
    .from(searchEvent)
    .where(gte(searchEvent.createdAt, from));
  return {
    windowDays: days,
    generatedAt: now.toISOString(),
    eventsInWindow: Number(latest?.n ?? 0),
    minimumCount: TREND_MIN_COUNT,
    terms: rows.filter(r => !isSensitive(r.term)),
  };
}
