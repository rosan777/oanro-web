// Seasonal campaigns: scheduled banners with hand-picked products (attach, pin, reorder, remove without deleting).
import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { auditEvent, campaign, campaignProduct, product } from "./db/schema";
import type { StoreCampaign } from "./catalog";
import type { CampaignInput, ProductStatus } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

const fields = ["slug", "status", "nameEn", "nameBn", "headlineEn", "headlineBn", "descriptionEn", "descriptionBn", "startsAt", "endsAt", "displayOrder"] as const;
export type CampaignItem = { productId: string; pinned: boolean };
export type OwnerCampaign = Omit<CampaignInput, "startsAt" | "endsAt"> & { id: string; startsAt: string | null; endsAt: string | null; hasImage: boolean; items: CampaignItem[]; phase: "draft" | "scheduled" | "running" | "ended" | "hidden" };
function phase(status: ProductStatus, startsAt: Date | null, endsAt: Date | null, now: Date): OwnerCampaign["phase"] {
  if (status !== "published") return status;
  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt <= now) return "ended";
  return "running";
}
export async function listOwnerCampaigns(db: CatalogDb, now = new Date()): Promise<OwnerCampaign[]> {
  const rows = await db.select().from(campaign).where(isNull(campaign.archivedAt)).orderBy(asc(campaign.displayOrder), asc(campaign.createdAt));
  const items = rows.length ? await db.select().from(campaignProduct).where(inArray(campaignProduct.campaignId, rows.map(r => r.id))).orderBy(asc(campaignProduct.displayOrder)) : [];
  return rows.map(r => ({
    id: r.id, slug: r.slug, status: r.status, nameEn: r.nameEn, nameBn: r.nameBn, headlineEn: r.headlineEn, headlineBn: r.headlineBn,
    descriptionEn: r.descriptionEn, descriptionBn: r.descriptionBn, displayOrder: r.displayOrder,
    startsAt: r.startsAt?.toISOString() ?? null, endsAt: r.endsAt?.toISOString() ?? null, hasImage: Boolean(r.imageData),
    items: items.filter(i => i.campaignId === r.id).map(i => ({ productId: i.productId, pinned: i.pinned })), phase: phase(r.status, r.startsAt, r.endsAt, now),
  }));
}
const live = (now: Date) => and(eq(campaign.status, "published"), isNull(campaign.archivedAt), or(isNull(campaign.startsAt), lte(campaign.startsAt, now)), or(isNull(campaign.endsAt), gt(campaign.endsAt, now)));
/** Campaigns running right now, with their product slugs (pinned first). Products' own visibility is applied by the storefront. */
export async function listActiveCampaigns(db: CatalogDb, now = new Date()): Promise<StoreCampaign[]> {
  const rows = await db.select().from(campaign).where(live(now)).orderBy(asc(campaign.displayOrder), asc(campaign.startsAt)).limit(5);
  if (!rows.length) return [];
  const items = await db.select({ campaignId: campaignProduct.campaignId, slug: product.slug, pinned: campaignProduct.pinned, order: campaignProduct.displayOrder })
    .from(campaignProduct).innerJoin(product, eq(product.id, campaignProduct.productId))
    .where(and(inArray(campaignProduct.campaignId, rows.map(r => r.id)), isNull(product.archivedAt)));
  return rows.map(r => ({
    id: r.id, slug: r.slug, name: r.nameEn, headline: r.headlineEn, description: r.descriptionEn, endsAt: r.endsAt?.toISOString() ?? null,
    image: r.imageData ? `/api/campaigns/${encodeURIComponent(r.slug)}/image?v=${r.updatedAt.getTime()}` : null,
    productSlugs: items.filter(i => i.campaignId === r.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.order - b.order).map(i => i.slug),
    bn: r.nameBn ? { name: r.nameBn, headline: r.headlineBn || r.headlineEn, description: r.descriptionBn || r.descriptionEn } : null,
  }));
}
export async function activeCampaignImage(db: CatalogDb, slug: string, now = new Date()) {
  const [row] = await db.select({ image: campaign.imageData }).from(campaign).where(and(eq(campaign.slug, slug), live(now))).limit(1);
  return row?.image ?? null;
}
async function slugTaken(db: CatalogDb, slug: string, exceptId?: string) {
  const [row] = await db.select({ id: campaign.id }).from(campaign).where(eq(campaign.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}
export async function createCampaign(db: CatalogDb, actorId: string, input: CampaignInput, image: string | null) {
  if (await slugTaken(db, input.slug)) throw new ProductStoreError("SLUG_TAKEN");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(campaign).values({ id, ...input, imageData: image, createdBy: actorId, updatedBy: actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "campaign.create", targetId: id, reason: `${input.slug} (${input.status})` });
  });
  return id;
}
export async function updateCampaign(db: CatalogDb, actorId: string, id: string, input: CampaignInput, image: string | null | undefined) {
  const [current] = await db.select().from(campaign).where(and(eq(campaign.id, id), isNull(campaign.archivedAt))).limit(1);
  if (!current) throw new ProductStoreError("NOT_FOUND");
  if (input.slug !== current.slug && await slugTaken(db, input.slug, id)) throw new ProductStoreError("SLUG_TAKEN");
  const same = (a: unknown, b: unknown) => a instanceof Date || b instanceof Date ? (a as Date | null)?.getTime() === (b as Date | null)?.getTime() : a === b;
  const changed = fields.filter(f => !same(current[f], input[f])) as string[];
  if (image !== undefined && image !== current.imageData) changed.push("image");
  if (!changed.length) return false;
  await db.transaction(async tx => {
    await tx.update(campaign).set({ ...input, ...(image !== undefined ? { imageData: image } : {}), updatedBy: actorId, updatedAt: new Date() }).where(eq(campaign.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "campaign.update", targetId: id, reason: changed.join(",") });
  });
  return true;
}
export async function setCampaignStatus(db: CatalogDb, actorId: string, id: string, status: ProductStatus) {
  await db.transaction(async tx => {
    const done = await tx.update(campaign).set({ status, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(campaign.id, id), isNull(campaign.archivedAt))).returning({ id: campaign.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "campaign.status", targetId: id, reason: status });
  });
}
export async function archiveCampaign(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(campaign).set({ status: "hidden", archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(and(eq(campaign.id, id), isNull(campaign.archivedAt))).returning({ slug: campaign.slug });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "campaign.archive", targetId: id, reason: done[0].slug });
  });
}
/** Replace the campaign's product list (order = array order). Removing a product here never touches the product itself. */
export async function setCampaignProducts(db: CatalogDb, actorId: string, id: string, items: unknown) {
  if (!Array.isArray(items) || items.length > 60) throw new ProductStoreError("INVALID_ITEMS");
  const clean = items.map(i => {
    if (!i || typeof i !== "object" || typeof (i as CampaignItem).productId !== "string" || typeof (i as CampaignItem).pinned !== "boolean") throw new ProductStoreError("INVALID_ITEMS");
    return { productId: (i as CampaignItem).productId, pinned: (i as CampaignItem).pinned };
  });
  if (new Set(clean.map(i => i.productId)).size !== clean.length) throw new ProductStoreError("INVALID_ITEMS");
  const [current] = await db.select({ id: campaign.id }).from(campaign).where(and(eq(campaign.id, id), isNull(campaign.archivedAt))).limit(1);
  if (!current) throw new ProductStoreError("NOT_FOUND");
  if (clean.length) {
    const found = await db.select({ id: product.id }).from(product).where(and(inArray(product.id, clean.map(i => i.productId)), isNull(product.archivedAt)));
    if (found.length !== clean.length) throw new ProductStoreError("PRODUCT_NOT_FOUND");
  }
  await db.transaction(async tx => {
    await tx.delete(campaignProduct).where(eq(campaignProduct.campaignId, id));
    if (clean.length) await tx.insert(campaignProduct).values(clean.map((i, index) => ({ campaignId: id, productId: i.productId, pinned: i.pinned, displayOrder: index * 10, addedBy: actorId })));
    await tx.update(campaign).set({ updatedBy: actorId, updatedAt: new Date() }).where(eq(campaign.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "campaign.products", targetId: id, reason: `${clean.length} products, ${clean.filter(i => i.pinned).length} pinned` });
  });
}
