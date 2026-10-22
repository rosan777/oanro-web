import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auditEvent, storeSetting } from "./db/schema";
import { storefrontCached } from "./storefront-cache";
import { catalogDb } from "./store-products";
import { cleanFaq, cleanFeatures, cleanGuides, cleanPackages, cleanText, defaultContent, mergeContent, type SiteContent } from "./site-content-data";
import { ProductInputError } from "./product-input";
import type { CatalogDb } from "./product-store";

// Everything the owner edits in Admin → Website content is one JSON value in store_setting (no extra table).
const KEY = "site.content";
async function readSaved(db: CatalogDb) {
  const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, KEY)).limit(1);
  try { return row ? JSON.parse(row.value) as Partial<Record<keyof SiteContent, unknown>> : null; } catch { return null; }
}
/** For pages: cached with the storefront and cleared on every admin save. Falls back to the defaults if the database is unreachable. */
export async function getSiteContent(): Promise<SiteContent> {
  if (!process.env.DATABASE_URL) return defaultContent();
  const saved = await storefrontCached("site-content", () => readSaved(catalogDb()))().catch(() => null);
  return mergeContent(saved);
}
export const getSiteContentFresh = async (db: CatalogDb) => mergeContent(await readSaved(db));

const cleaners = { text: cleanText, features: cleanFeatures, guides: cleanGuides, packages: cleanPackages, faq: cleanFaq } as const;
export type ContentPart = keyof typeof cleaners;
/** Save one part (texts, sections on/off, guides, packages or FAQ). "reset" puts that part back to the default. */
export async function saveSiteContent(db: CatalogDb, actorId: string, part: ContentPart, value: unknown, reset = false) {
  if (!(part in cleaners)) throw new ProductInputError("part");
  const saved = (await readSaved(db)) ?? {};
  if (reset) delete saved[part]; else saved[part] = cleaners[part](value);
  const json = JSON.stringify(saved);
  if (json.length > 200_000) throw new ProductInputError("value");
  await db.transaction(async tx => {
    await tx.insert(storeSetting).values({ key: KEY, value: json, updatedBy: actorId }).onConflictDoUpdate({ target: storeSetting.key, set: { value: json, updatedBy: actorId, updatedAt: new Date() } });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "content.save", targetId: part, reason: reset ? "reset to default" : "updated" });
  });
  return mergeContent(saved);
}
