// Site search over published content only: live products, collections that have live products, and
// published services (when the Services switch is on). Shared by /api/search and the /search page.
// Uses the forgiving English/Bangla smart search (typos, word beginnings, synonyms).

import "server-only";
import { getSiteConfig } from "./site-config";
import { getStoreCollections, getStoreProducts, getStoreServices } from "./store-products";
import { getSectionState } from "./website-sections";
import { rank } from "./smart-search";

export type SearchHit = {
  type: "product" | "collection" | "service";
  slug: string;
  title: string;
  detail: string;
  href: string;
  image: string | null;
  position?: string;
  price?: number;
  compareAt?: number | null;
  inStock?: boolean;
};

export async function siteSearch(rawQuery: string, locale: "en" | "bn", limit: number) {
  const query = rawQuery.normalize("NFC").trim().slice(0, 80);
  if (query.length < 2) return { query, total: 0, hits: [] as SearchHit[] };
  const bn = locale === "bn";
  const config = getSiteConfig();
  const servicesOn =
    config.services && (await getSectionState().catch(() => ({ services: false }))).services;
  const [products, collections, services] = await Promise.all([
    config.products ? getStoreProducts() : [],
    config.products ? getStoreCollections() : [],
    servicesOn ? getStoreServices() : [],
  ]);
  const productHits: SearchHit[] = rank(query, products, p => [
    { text: `${p.name} ${p.bn?.name ?? ""}`, weight: 3 },
    { text: `${p.category} ${p.bn?.category ?? ""}`, weight: 2 },
    { text: `${p.tagline} ${p.bn?.tagline ?? ""}`, weight: 1 },
  ]).map(p => ({
    type: "product",
    slug: p.slug,
    title: bn && p.bn ? p.bn.name : p.name,
    detail: bn && p.bn ? p.bn.category : p.category,
    href: `/products/${p.slug}`,
    image: p.image ?? null,
    position: p.position,
    price: p.price,
    compareAt: p.compareAt ?? null,
    inStock: p.inStock !== false,
  }));
  const live = collections.filter(c => products.some(p => (p.collectionId ?? "seasonal") === c.id));
  const collectionHits: SearchHit[] = rank(query, live, c => [
    { text: `${c.name} ${c.bn?.name ?? ""}`, weight: 3 },
    { text: `${c.headline ?? ""} ${c.bn?.headline ?? ""}`, weight: 1 },
  ]).map(c => ({
    type: "collection",
    slug: c.slug,
    title: bn && c.bn ? c.bn.name : c.name,
    detail: `${products.filter(p => (p.collectionId ?? "seasonal") === c.id).length}`,
    href: `/${c.slug}`,
    image: products.find(p => (p.collectionId ?? "seasonal") === c.id && p.image)?.image ?? null,
  }));
  const serviceHits: SearchHit[] = rank(query, services, s => [
    { text: `${s.title} ${s.bn?.title ?? ""}`, weight: 3 },
    { text: `${s.category ?? ""} ${s.word}`, weight: 2 },
    { text: `${s.text} ${s.bn?.text ?? ""}`, weight: 1 },
  ]).map(s => ({
    type: "service",
    slug: s.slug,
    title: bn && s.bn ? s.bn.title : s.title,
    detail: s.word,
    href: `/services/${s.slug}`,
    image: s.image ?? null,
  }));
  // Collections first (a direct match is the most useful jump), then products, then services.
  const all = [
    ...collectionHits.slice(0, 2),
    ...productHits,
    ...serviceHits,
    ...collectionHits.slice(2),
  ];
  return { query, total: all.length, hits: all.slice(0, limit) };
}
