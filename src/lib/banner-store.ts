// Owner-managed messages for the top announcement bar. Active = switched on and inside its dates (if any).
import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { auditEvent, siteBanner } from "./db/schema";
import { ProductInputError } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export type Banner = typeof siteBanner.$inferSelect;
export const listBanners = (db: CatalogDb) => db.select().from(siteBanner).orderBy(asc(siteBanner.displayOrder), asc(siteBanner.updatedAt));
export const isActive = (b: Pick<Banner, "enabled" | "startsAt" | "endsAt">, now = new Date()) => b.enabled && (!b.startsAt || b.startsAt <= now) && (!b.endsAt || b.endsAt > now);
export function parseBanner(d: Record<string, unknown>) {
  const str = (v: unknown, f: string, min: number, max: number) => { const s = typeof v === "string" ? v.trim() : ""; if (s.length < min || s.length > max) throw new ProductInputError(f); return s; };
  const link = str(d.link, "link", 0, 200);
  if (link && !/^\/[A-Za-z0-9/_#?=&.-]*$/.test(link)) throw new ProductInputError("link");
  const date = (v: unknown, f: string) => { if (!v) return null; const t = new Date(String(v)); if (Number.isNaN(t.getTime())) throw new ProductInputError(f); return t; };
  const order = d.displayOrder === undefined || d.displayOrder === "" ? 0 : Number(d.displayOrder);
  if (!Number.isInteger(order) || order < 0 || order > 999) throw new ProductInputError("displayOrder");
  return { textEn: str(d.textEn, "textEn", 3, 120), textBn: str(d.textBn, "textBn", 0, 160), link, startsAt: date(d.startsAt, "startsAt"), endsAt: date(d.endsAt, "endsAt"), enabled: d.enabled !== false, displayOrder: order };
}
export async function saveBanner(db: CatalogDb, actorId: string, id: string | null, input: ReturnType<typeof parseBanner>) {
  await db.transaction(async tx => {
    if (id) { const done = await tx.update(siteBanner).set({ ...input, updatedBy: actorId, updatedAt: new Date() }).where(eq(siteBanner.id, id)).returning({ id: siteBanner.id }); if (!done.length) throw new ProductStoreError("NOT_FOUND"); }
    else await tx.insert(siteBanner).values({ id: randomUUID(), ...input, updatedBy: actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "banner.save", targetId: id ?? "new", reason: input.textEn.slice(0, 80) });
  });
}
export async function deleteBanner(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.delete(siteBanner).where(eq(siteBanner.id, id)).returning({ text: siteBanner.textEn });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "banner.delete", targetId: id, reason: done[0].text.slice(0, 80) });
  });
}
/** Banners showing right now, in the page language. Works with cached rows, where dates come back as strings. */
export function activeBanners(rows: { enabled: boolean; startsAt: Date | string | null; endsAt: Date | string | null; textEn: string; textBn: string; link: string }[], locale: "en" | "bn") {
  const now = Date.now();
  return rows.filter(b => b.enabled && (!b.startsAt || new Date(b.startsAt).getTime() <= now) && (!b.endsAt || new Date(b.endsAt).getTime() > now))
    .map(b => ({ text: locale === "bn" && b.textBn ? b.textBn : b.textEn, link: b.link }));
}
