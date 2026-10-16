// Technology services ("Tech solutions") data access; mirrors product-store.
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { auditEvent, service } from "./db/schema";
import { services as demoServices, type Service } from "./catalog";
import { categoryBn } from "./categories";
import type { ProductStatus, ServiceInput } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

const fields = ["slug", "status", "titleEn", "titleBn", "word", "categoryEn", "categoryBn", "summaryEn", "summaryBn", "detailEn", "detailBn", "displayOrder"] as const;
export type OwnerService = ServiceInput & { id: string; hasImage: boolean };
export async function listOwnerServices(db: CatalogDb): Promise<OwnerService[]> {
  const rows = await db.select().from(service).where(isNull(service.archivedAt)).orderBy(asc(service.displayOrder), desc(service.createdAt)).limit(200);
  return rows.map(r => ({ id: r.id, slug: r.slug, status: r.status, titleEn: r.titleEn, titleBn: r.titleBn, word: r.word, categoryEn: r.categoryEn, categoryBn: r.categoryBn,
    summaryEn: r.summaryEn, summaryBn: r.summaryBn, detailEn: r.detailEn, detailBn: r.detailBn, displayOrder: r.displayOrder, hasImage: Boolean(r.imageData) }));
}
export async function hasManagedServices(db: CatalogDb) {
  const [row] = await db.select({ n: count() }).from(service);
  return Number(row?.n ?? 0) > 0;
}
export async function listStorefrontServices(db: CatalogDb): Promise<Service[]> {
  const rows = await db.select().from(service).where(and(eq(service.status, "published"), isNull(service.archivedAt))).orderBy(asc(service.displayOrder), desc(service.createdAt)).limit(100);
  return rows.map(r => ({ slug: r.slug, title: r.titleEn, word: r.word || r.titleEn.split(/\s+/)[0].toUpperCase().slice(0, 12), text: r.summaryEn, detail: r.detailEn, category: r.categoryEn,
    image: r.imageData ? `/api/services/${encodeURIComponent(r.slug)}/image?v=${r.updatedAt.getTime()}` : null,
    bn: r.titleBn ? { title: r.titleBn, text: r.summaryBn || r.summaryEn, detail: r.detailBn || r.detailEn } : null }));
}
export async function publishedServiceImage(db: CatalogDb, slug: string) {
  const [row] = await db.select({ image: service.imageData }).from(service).where(and(eq(service.slug, slug), eq(service.status, "published"), isNull(service.archivedAt))).limit(1);
  return row?.image ?? null;
}
async function slugTaken(db: CatalogDb, slug: string, exceptId?: string) {
  const [row] = await db.select({ id: service.id }).from(service).where(eq(service.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}
export async function createService(db: CatalogDb, actorId: string, input: ServiceInput, image: string | null) {
  if (await slugTaken(db, input.slug)) throw new ProductStoreError("SLUG_TAKEN");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(service).values({ id, ...input, imageData: image, createdBy: actorId, updatedBy: actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "service.create", targetId: id, reason: `${input.slug} (${input.status})` });
  });
  return id;
}
export async function updateService(db: CatalogDb, actorId: string, id: string, input: ServiceInput, image: string | null | undefined) {
  const [current] = await db.select().from(service).where(and(eq(service.id, id), isNull(service.archivedAt))).limit(1);
  if (!current) throw new ProductStoreError("NOT_FOUND");
  if (input.slug !== current.slug && await slugTaken(db, input.slug, id)) throw new ProductStoreError("SLUG_TAKEN");
  const changed = fields.filter(f => current[f] !== input[f]) as string[];
  if (image !== undefined && image !== current.imageData) changed.push("image");
  if (!changed.length) return false;
  await db.transaction(async tx => {
    await tx.update(service).set({ ...input, ...(image !== undefined ? { imageData: image } : {}), updatedBy: actorId, updatedAt: new Date() }).where(eq(service.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "service.update", targetId: id, reason: changed.join(",").slice(0, 300) });
  });
  return true;
}
export async function setServiceStatus(db: CatalogDb, actorId: string, id: string, status: ProductStatus) {
  await db.transaction(async tx => {
    const done = await tx.update(service).set({ status, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(service.id, id), isNull(service.archivedAt))).returning({ id: service.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "service.status", targetId: id, reason: status });
  });
}
export async function archiveService(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(service).set({ status: "hidden", archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(and(eq(service.id, id), isNull(service.archivedAt))).returning({ slug: service.slug });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "service.archive", targetId: id, reason: done[0].slug });
  });
}
export async function importDemoServices(db: CatalogDb, actorId: string) {
  await db.transaction(async tx => {
    const [row] = await tx.select({ n: count() }).from(service);
    if (Number(row?.n ?? 0) > 0) throw new ProductStoreError("CATALOG_NOT_EMPTY");
    await tx.insert(service).values(demoServices.map((s, index) => ({
      id: randomUUID(), slug: s.slug, status: "published" as const, titleEn: s.title, word: s.word, categoryEn: s.title, categoryBn: categoryBn(s.title),
      summaryEn: s.text, detailEn: s.detail, displayOrder: index * 10, createdBy: actorId, updatedBy: actorId,
    })));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "service.import-demo", targetId: "services", reason: `${demoServices.length} demo services` });
  });
}
