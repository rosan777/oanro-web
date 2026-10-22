import "server-only";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { auditEvent, storeSetting } from "./db/schema";
import { validateUploadedImage } from "./pulse-upload";
import type { CatalogDb } from "./product-store";

// Owner-uploaded design images (menu pictures and the default link-share picture). One row each in store_setting,
// served from /api/site-media/<key>; pages only receive a version stamp, never the image data itself.
export const mediaKeys = ["menu-products", "menu-services", "menu-about", "share"] as const;
export type MediaKey = typeof mediaKeys[number];
export const isMediaKey = (k: unknown): k is MediaKey => mediaKeys.includes(k as MediaKey);
const settingKey = (k: MediaKey) => `site.media.${k}`;

/** Which images exist, with a version stamp for cache-safe URLs ({ "menu-products": "1729..." }). */
export async function mediaVersions(db: CatalogDb): Promise<Partial<Record<MediaKey, string>>> {
  const rows = await db.select({ key: storeSetting.key, at: storeSetting.updatedAt }).from(storeSetting).where(inArray(storeSetting.key, mediaKeys.map(settingKey)));
  return Object.fromEntries(rows.map(r => [r.key.replace("site.media.", ""), String(new Date(r.at).getTime())]));
}
export async function readMedia(db: CatalogDb, key: MediaKey) {
  const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, settingKey(key))).limit(1);
  return row?.value ?? null;
}
/** Save (data URL, checked like every other upload) or remove (null) one image. */
export async function saveMedia(db: CatalogDb, actorId: string, key: MediaKey, image: unknown) {
  const value = image === null ? null : validateUploadedImage(image);
  await db.transaction(async tx => {
    if (value === null) await tx.delete(storeSetting).where(eq(storeSetting.key, settingKey(key)));
    else await tx.insert(storeSetting).values({ key: settingKey(key), value, updatedBy: actorId })
      .onConflictDoUpdate({ target: storeSetting.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "media.save", targetId: key, reason: value === null ? "removed" : "uploaded" });
  });
}
