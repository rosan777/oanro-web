import "server-only";
import { cache } from "react";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { storefrontCached } from "./storefront-cache";
import { websiteSection, pulseStory } from "./db/schema";

export const sectionCodes = ["caps", "tech-items", "global-pulse", "services", "back-to-top"] as const;
export type SectionCode = typeof sectionCodes[number];
export type SectionState = Record<SectionCode, boolean>;

// Until PostgreSQL is configured, showcase the two catalog concepts only.
const preview: SectionState = { caps: true, "tech-items": true, "global-pulse": false, services: true, "back-to-top": true };
const cachedSectionRows = storefrontCached("sections", () => getDb().select().from(websiteSection));
async function loadSectionState(): Promise<SectionState> {
  if (!process.env.DATABASE_URL) return preview;
  try {
    const rows = await cachedSectionRows();
    return { caps: rows.find(r => r.code === "caps")?.enabled ?? false,
      "tech-items": rows.find(r => r.code === "tech-items")?.enabled ?? false,
      "global-pulse": rows.find(r => r.code === "global-pulse")?.enabled ?? false,
      // Services were always shown before this switch existed, so a missing row means ON.
      services: rows.find(r => r.code === "services")?.enabled ?? true,
      // The back-to-top arrow was always shown before this switch existed, so a missing row means ON.
      "back-to-top": rows.find(r => r.code === "back-to-top")?.enabled ?? true };
  } catch {
    // Never publish a DB-controlled section based on a stale cached preference.
    return { caps: false, "tech-items": false, "global-pulse": false, services: false, "back-to-top": true };
  }
}
// Cached rows go through JSON, so the date is converted here and read back as a string.
const cachedPulse = storefrontCached("pulse", async () => (await getDb().select({ id: pulseStory.id, publisher: pulseStory.publisher, headline: pulseStory.headline, url: pulseStory.url, thumbnailUrl: pulseStory.thumbnailUrl, publishedAt: pulseStory.publishedAt })
  .from(pulseStory).where(and(eq(pulseStory.visible, true), eq(pulseStory.rightsConfirmed, true), isNull(pulseStory.archivedAt)))
  .orderBy(desc(pulseStory.approvedAt)).limit(20)).map(r => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null })));
export async function getApprovedPulseStories() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await cachedPulse();
    return rows.map(r => ({ ...r, thumbnailUrl: r.thumbnailUrl ? `/api/pulse/${encodeURIComponent(r.id)}/thumbnail` : null, publishedAt: r.publishedAt }));
  } catch { return []; }
}
export async function getOwnerPulseStories() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await getDb().select({ id: pulseStory.id, publisher: pulseStory.publisher, headline: pulseStory.headline, url: pulseStory.url, visible: pulseStory.visible, archived: sql<boolean>`${pulseStory.archivedAt} is not null` }).from(pulseStory).orderBy(desc(pulseStory.createdAt)).limit(100);
  } catch { return []; }
}
/** Cached per request: layout and page share one database round trip. */
export const getSectionState = cache(loadSectionState);
