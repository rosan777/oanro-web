import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auditEvent, storeSetting } from "./db/schema";
import { storefrontCached } from "./storefront-cache";
import { catalogDb } from "./store-products";
import { cleanProfile, defaultProfile, mergeProfile, type CompanyProfile } from "./company-profile-data";
import { ProductInputError } from "./product-input";
import type { CatalogDb } from "./product-store";

// The whole company profile is one JSON value in store_setting (same idea as Website content; no extra table).
const KEY = "site.companyProfile";
async function readSaved(db: CatalogDb): Promise<unknown> {
  const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, KEY)).limit(1);
  try { return row ? JSON.parse(row.value) : null; } catch { return null; }
}
/** For the public page: cached with the storefront and cleared on every admin save. Defaults if the database is unreachable. */
export async function getCompanyProfile(): Promise<CompanyProfile> {
  if (!process.env.DATABASE_URL) return defaultProfile();
  const saved = await storefrontCached("company-profile", () => readSaved(catalogDb()))().catch(() => null);
  return mergeProfile(saved);
}
export const getCompanyProfileFresh = async (db: CatalogDb) => mergeProfile(await readSaved(db));

/** Save the whole profile, or put it back to the default (reset). Every save is written to the activity log. */
export async function saveCompanyProfile(db: CatalogDb, actorId: string, value: unknown, reset = false) {
  const profile = reset ? null : cleanProfile(value);
  if (profile) {
    const json = JSON.stringify(profile);
    if (json.length > 400_000) throw new ProductInputError("value");
    await db.transaction(async tx => {
      await tx.insert(storeSetting).values({ key: KEY, value: json, updatedBy: actorId }).onConflictDoUpdate({ target: storeSetting.key, set: { value: json, updatedBy: actorId, updatedAt: new Date() } });
      await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "profile.save", targetId: "company-profile", reason: "updated" });
    });
    return profile;
  }
  await db.transaction(async tx => {
    await tx.delete(storeSetting).where(eq(storeSetting.key, KEY));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "profile.save", targetId: "company-profile", reason: "reset to default" });
  });
  return defaultProfile();
}
