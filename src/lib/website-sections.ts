import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { websiteSection, pulseStory } from "./db/schema";

export const sectionCodes = ["caps", "tech-items", "global-pulse", "services"] as const;
export type SectionCode = typeof sectionCodes[number];
export type SectionState = Record<SectionCode, boolean>;

// Until PostgreSQL is configured, showcase the two catalog concepts only.
const preview: SectionState = { caps: true, "tech-items": true, "global-pulse": false, services: true };
export async function getSectionState(): Promise<SectionState> {
  if (!process.env.DATABASE_URL) return preview;
  try {
    const rows = await getDb().select().from(websiteSection);
    return { caps: rows.find(r => r.code === "caps")?.enabled ?? false,
      "tech-items": rows.find(r => r.code === "tech-items")?.enabled ?? false,
      "global-pulse": rows.find(r => r.code === "global-pulse")?.enabled ?? false,
      // Services were always shown before this switch existed, so a missing row means ON.
      services: rows.find(r => r.code === "services")?.enabled ?? true };
  } catch {
    // Never publish a DB-controlled section based on a stale cached preference.
    return { caps: false, "tech-items": false, "global-pulse": false, services: false };
  }
}
export async function getApprovedPulseStories() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const rows = await getDb().select({ id: pulseStory.id, publisher: pulseStory.publisher, headline: pulseStory.headline, url: pulseStory.url, thumbnailUrl: pulseStory.thumbnailUrl, publishedAt: pulseStory.publishedAt })
      .from(pulseStory).where(and(eq(pulseStory.visible, true), eq(pulseStory.rightsConfirmed, true)))
      .orderBy(desc(pulseStory.approvedAt)).limit(20);
    return rows.map(r => ({ ...r, thumbnailUrl: r.thumbnailUrl ? `/api/pulse/${encodeURIComponent(r.id)}/thumbnail` : null, publishedAt: r.publishedAt?.toISOString() ?? null }));
  } catch { return []; }
}
export async function getOwnerPulseStories() {
  if (!process.env.DATABASE_URL) return [];
  try {
    return await getDb().select({ id: pulseStory.id, publisher: pulseStory.publisher, headline: pulseStory.headline, url: pulseStory.url, visible: pulseStory.visible }).from(pulseStory).orderBy(desc(pulseStory.createdAt)).limit(50);
  } catch { return []; }
}
