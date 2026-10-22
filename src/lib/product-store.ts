// Catalog data access. Takes a Drizzle database so routes (node-postgres) and tests (PGlite) share it.
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, getTableColumns, inArray, isNull } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./db/schema";
import { withImageFlag } from "./db/light";
import { auditEvent, product, productCollection, productColorImage, productVariant } from "./db/schema";
import { collectionAnchor, products as demoProducts, type Product, type StoreCollection } from "./catalog";
import { variantKey, type CollectionInput, type ProductInput, type ProductStatus, type VariantStock } from "./product-input";

export type CatalogDb = PgDatabase<PgQueryResultHKT, typeof schema>;
export class ProductStoreError extends Error {}
const fields = ["slug", "status", "collectionId", "nameEn", "nameBn", "categoryEn", "categoryBn", "taglineEn", "taglineBn", "descriptionEn", "descriptionBn", "price", "compareAtPrice", "stock", "lowStockAt", "sizes", "colors", "specsEn", "specsBn", "featuredEligible", "featuredNoteEn", "featuredNoteBn", "featuredVideoUrl", "displayOrder"] as const;

export type OwnerProduct = ProductInput & { id: string; hasImage: boolean; hasFeaturedImage: boolean; imagePosition: string; updatedAt: string; colorImages: string[] };
async function variantsFor(db: CatalogDb, ids: string[]) {
  if (!ids.length) return { variants: [], images: [] };
  const [variants, images] = await Promise.all([
    db.select().from(productVariant).where(inArray(productVariant.productId, ids)),
    db.select({ productId: productColorImage.productId, color: productColorImage.color, updatedAt: productColorImage.updatedAt }).from(productColorImage).where(inArray(productColorImage.productId, ids)),
  ]);
  return { variants, images };
}
export async function listOwnerProducts(db: CatalogDb): Promise<OwnerProduct[]> {
  const rows = await db.select(withImageFlag(getTableColumns(product))).from(product).where(isNull(product.archivedAt)).orderBy(asc(product.displayOrder), desc(product.createdAt)).limit(200);
  const extra = await variantsFor(db, rows.map(r => r.id));
  return rows.map(row => ({ compareAtPrice: row.compareAtPrice, colors: row.colors,
    variants: (() => { const v = extra.variants.filter(x => x.productId === row.id); return v.length ? v.map(x => ({ color: x.color, size: x.size, stock: x.stock })) : null; })(),
    colorImages: extra.images.filter(x => x.productId === row.id).map(x => x.color),
    id: row.id, slug: row.slug, status: row.status, collectionId: row.collectionId, nameEn: row.nameEn, nameBn: row.nameBn, categoryEn: row.categoryEn, categoryBn: row.categoryBn,
    taglineEn: row.taglineEn, taglineBn: row.taglineBn, descriptionEn: row.descriptionEn, descriptionBn: row.descriptionBn,
    price: row.price, stock: row.stock, lowStockAt: row.lowStockAt, sizes: row.sizes, specsEn: row.specsEn, specsBn: row.specsBn, displayOrder: row.displayOrder,
    featuredEligible: row.featuredEligible, featuredNoteEn: row.featuredNoteEn, featuredNoteBn: row.featuredNoteBn, featuredVideoUrl: row.featuredVideoUrl,
    hasImage: Boolean(row.imageData), hasFeaturedImage: Boolean(row.featuredImageData), imagePosition: row.imagePosition, updatedAt: row.updatedAt.toISOString(),
  }));
}
/** True once the owner has any product row (even drafts or archived): the database becomes the catalog. */
export async function hasManagedCatalog(db: CatalogDb) {
  const [row] = await db.select({ n: count() }).from(product);
  return Number(row?.n ?? 0) > 0;
}
export async function listStorefrontProducts(db: CatalogDb): Promise<Product[]> {
  // Products are public only when both the product and its section are published.
  const rows = (await db.select({ row: withImageFlag(getTableColumns(product)) }).from(product).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
    .where(and(eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published"), isNull(productCollection.archivedAt)))
    .orderBy(asc(product.displayOrder), desc(product.createdAt)).limit(500)).map(r => r.row);
  const extra = await variantsFor(db, rows.map(r => r.id));
  return rows.map(row => ({ collectionId: row.collectionId,
    compareAt: row.compareAtPrice !== null && row.compareAtPrice > row.price ? row.compareAtPrice : null,
    colors: row.colors.map(c => { const img = extra.images.find(i => i.productId === row.id && i.color === c.id);
      return { id: c.id, name: c.en, bn: c.bn || c.en, hex: c.hex, image: img ? `/api/products/${encodeURIComponent(row.slug)}/image?color=${encodeURIComponent(c.id)}&v=${img.updatedAt.getTime()}` : null }; }),
    // Availability only (never the counts): which colour|size combinations are sold out.
    soldOut: extra.variants.filter(v => v.productId === row.id && v.stock <= 0).map(v => variantKey(v.color, v.size)),
    slug: row.slug, name: row.nameEn, category: row.categoryEn, tagline: row.taglineEn, description: row.descriptionEn,
    price: row.price, inStock: row.stock === null || row.stock > 0, left: row.stock !== null && row.stock > 0 && row.stock <= 5 ? row.stock : null, sizes: row.sizes, specs: row.specsEn, position: row.imagePosition,
    image: row.imageData ? `/api/products/${encodeURIComponent(row.slug)}/image?v=${row.updatedAt.getTime()}` : null,
    feature: { eligible: row.featuredEligible, note: row.featuredNoteEn, noteBn: row.featuredNoteBn, videoUrl: row.featuredVideoUrl,
      image: row.featuredImageData ? `/api/products/${encodeURIComponent(row.slug)}/image?feature=1&v=${row.updatedAt.getTime()}` : null },
    bn: row.nameBn ? { name: row.nameBn, category: row.categoryBn || row.categoryEn, tagline: row.taglineBn || row.taglineEn, description: row.descriptionBn || row.descriptionEn, specs: row.specsBn.length ? row.specsBn : row.specsEn } : null,
  }));
}
/** Photo for one colour of a published product. */
export async function publishedColorImage(db: CatalogDb, slug: string, color: string) {
  const [row] = await db.select({ image: productColorImage.imageData }).from(productColorImage).innerJoin(product, eq(product.id, productColorImage.productId)).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
    .where(and(eq(product.slug, slug), eq(productColorImage.color, color), eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published"), isNull(productCollection.archivedAt))).limit(1);
  return row?.image ?? null;
}
export async function publishedProductImage(db: CatalogDb, slug: string) {
  const [row] = await db.select({ image: product.imageData }).from(product).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
    .where(and(eq(product.slug, slug), eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published"), isNull(productCollection.archivedAt))).limit(1);
  return row?.image ?? null;
}
export async function publishedFeaturedImage(db: CatalogDb, slug: string) {
  const [row] = await db.select({ image: product.featuredImageData }).from(product).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
    .where(and(eq(product.slug, slug), eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published"), isNull(productCollection.archivedAt))).limit(1);
  return row?.image ?? null;
}
async function slugTaken(db: CatalogDb, slug: string, exceptId?: string) {
  const [row] = await db.select({ id: product.id }).from(product).where(eq(product.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}
async function requireCollection(db: CatalogDb, id: string) {
  const [row] = await db.select({ id: productCollection.id }).from(productCollection).where(and(eq(productCollection.id, id), isNull(productCollection.archivedAt))).limit(1);
  if (!row) throw new ProductStoreError("COLLECTION_NOT_FOUND");
}
export async function createProduct(db: CatalogDb, actorId: string, input: ProductInput, image: string | null, featuredImage: string | null = null) {
  await requireCollection(db, input.collectionId);
  if (await slugTaken(db, input.slug)) throw new ProductStoreError("SLUG_TAKEN");
  const id = randomUUID();
  const { variants, ...row } = input;
  await db.transaction(async tx => {
    await tx.insert(product).values({ id, ...row, imageData: image, featuredImageData: featuredImage, createdBy: actorId, updatedBy: actorId });
    if (variants?.length) await tx.insert(productVariant).values(variants.map(v => ({ productId: id, ...v })));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.create", targetId: id, reason: `${input.slug} (${input.status})` });
  });
  return id;
}
/** image: undefined keeps the current photo, null removes it. Audit reason lists the changed fields. */
export async function updateProduct(db: CatalogDb, actorId: string, id: string, input: ProductInput, image: string | null | undefined, featuredImage: string | null | undefined = undefined) {
  const [current] = await db.select().from(product).where(and(eq(product.id, id), isNull(product.archivedAt))).limit(1);
  if (!current) throw new ProductStoreError("NOT_FOUND");
  if (input.collectionId !== current.collectionId) await requireCollection(db, input.collectionId);
  if (input.slug !== current.slug && await slugTaken(db, input.slug, id)) throw new ProductStoreError("SLUG_TAKEN");
  const changed = fields.filter(f => JSON.stringify(current[f]) !== JSON.stringify(input[f])) as string[];
  if (image !== undefined && image !== current.imageData) changed.push("image");
  if (featuredImage !== undefined && featuredImage !== current.featuredImageData) changed.push("featured-image");
  const before = await db.select().from(productVariant).where(eq(productVariant.productId, id));
  const sortKey = (list: VariantStock[]) => JSON.stringify([...list].map(v => [v.color, v.size, v.stock]).sort());
  const variantsChanged = sortKey(before) !== sortKey(input.variants ?? []);
  if (variantsChanged) changed.push("variant-stock");
  if (!changed.length) return false;
  const { variants, ...row } = input;
  await db.transaction(async tx => {
    await tx.update(product).set({ ...row, ...(image !== undefined ? { imageData: image } : {}), ...(featuredImage !== undefined ? { featuredImageData: featuredImage } : {}), updatedBy: actorId, updatedAt: new Date() }).where(eq(product.id, id));
    if (variantsChanged) {
      await tx.delete(productVariant).where(eq(productVariant.productId, id));
      if (variants?.length) await tx.insert(productVariant).values(variants.map(v => ({ productId: id, ...v })));
    }
    // Photos of colours that were removed go too.
    const keep = input.colors.map(c => c.id);
    const images = await tx.select({ color: productColorImage.color }).from(productColorImage).where(eq(productColorImage.productId, id));
    const gone = images.map(i => i.color).filter(c => !keep.includes(c));
    if (gone.length) await tx.delete(productColorImage).where(and(eq(productColorImage.productId, id), inArray(productColorImage.color, gone)));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.update", targetId: id, reason: changed.join(",").slice(0, 300) });
  });
  return true;
}
/** Quick stock switch: 0 = out of stock, null = available (count not tracked). */
export async function setProductStock(db: CatalogDb, actorId: string, id: string, stock: number | null) {
  const [hasVariants] = await db.select({ n: count() }).from(productVariant).where(eq(productVariant.productId, id));
  if (Number(hasVariants?.n ?? 0) > 0) throw new ProductStoreError("HAS_VARIANTS");
  await db.transaction(async tx => {
    const done = await tx.update(product).set({ stock, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(product.id, id), isNull(product.archivedAt))).returning({ id: product.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.stock", targetId: id, reason: stock === 0 ? "out-of-stock" : stock === null ? "in-stock" : `stock=${stock}` });
  });
}
export async function setProductStatus(db: CatalogDb, actorId: string, id: string, status: ProductStatus) {
  await db.transaction(async tx => {
    const done = await tx.update(product).set({ status, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(product.id, id), isNull(product.archivedAt))).returning({ id: product.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.status", targetId: id, reason: status });
  });
}
/** Set (data URL) or remove (null) the photo for one colour of a product. */
export async function setColorImage(db: CatalogDb, actorId: string, id: string, color: string, image: string | null) {
  const [p] = await db.select({ colors: product.colors, slug: product.slug }).from(product).where(and(eq(product.id, id), isNull(product.archivedAt))).limit(1);
  if (!p) throw new ProductStoreError("NOT_FOUND");
  if (!p.colors.some(c => c.id === color)) throw new ProductStoreError("COLOR_NOT_FOUND");
  await db.transaction(async tx => {
    if (image === null) await tx.delete(productColorImage).where(and(eq(productColorImage.productId, id), eq(productColorImage.color, color)));
    else await tx.insert(productColorImage).values({ productId: id, color, imageData: image }).onConflictDoUpdate({ target: [productColorImage.productId, productColorImage.color], set: { imageData: image, updatedAt: new Date() } });
    await tx.update(product).set({ updatedBy: actorId, updatedAt: new Date() }).where(eq(product.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.update", targetId: id, reason: `${p.slug}: ${color} photo ${image === null ? "removed" : "updated"}` });
  });
}
/** Soft delete: hides the product permanently from the storefront and the owner list; the row and audit trail remain. */
export async function archiveProduct(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(product).set({ status: "hidden", archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(and(eq(product.id, id), isNull(product.archivedAt))).returning({ slug: product.slug });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.archive", targetId: id, reason: done[0].slug });
  });
}
/** Copies the built-in demo catalog into the database as published rows. Only allowed while the table is empty. */
export async function importDemoCatalog(db: CatalogDb, actorId: string) {
  await db.transaction(async tx => {
    const [row] = await tx.select({ n: count() }).from(product);
    if (Number(row?.n ?? 0) > 0) throw new ProductStoreError("CATALOG_NOT_EMPTY");
    await tx.insert(product).values(demoProducts.map((p, index) => ({
      id: randomUUID(), slug: p.slug, status: "published" as const, collectionId: p.collectionId ?? "seasonal", nameEn: p.name, categoryEn: p.category, taglineEn: p.tagline, descriptionEn: p.description,
      nameBn: p.bn?.name ?? "", categoryBn: p.bn?.category ?? "", taglineBn: p.bn?.tagline ?? "", descriptionBn: p.bn?.description ?? "",
      price: p.price, stock: null, sizes: p.sizes, specsEn: p.specs, specsBn: p.bn?.specs ?? [], imagePosition: p.position,
      displayOrder: index * 10, createdBy: actorId, updatedBy: actorId,
    })));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.import-demo", targetId: "catalog", reason: `${demoProducts.length} demo products` });
  });
}

// ---- Sections (product collections) ----
export const builtInCollections = ["seasonal", "caps", "tech"];
export type OwnerCollection = CollectionInput & { id: string; builtIn: boolean; productCount: number; publishedCount: number };
export async function listOwnerCollections(db: CatalogDb): Promise<OwnerCollection[]> {
  const rows = await db.select().from(productCollection).where(isNull(productCollection.archivedAt)).orderBy(asc(productCollection.displayOrder), asc(productCollection.createdAt));
  const counts = await db.select({ id: product.collectionId, status: product.status, n: count() }).from(product).where(isNull(product.archivedAt)).groupBy(product.collectionId, product.status);
  return rows.map(r => ({
    id: r.id, slug: r.slug, status: r.status, preset: r.preset, nameEn: r.nameEn, nameBn: r.nameBn, headlineEn: r.headlineEn, headlineBn: r.headlineBn,
    descriptionEn: r.descriptionEn, descriptionBn: r.descriptionBn, displayOrder: r.displayOrder, builtIn: builtInCollections.includes(r.id),
    productCount: counts.filter(c => c.id === r.id).reduce((sum, c) => sum + Number(c.n), 0),
    publishedCount: Number(counts.find(c => c.id === r.id && c.status === "published")?.n ?? 0),
  }));
}
export async function listStorefrontCollections(db: CatalogDb): Promise<StoreCollection[]> {
  const rows = await db.select().from(productCollection).where(and(eq(productCollection.status, "published"), isNull(productCollection.archivedAt))).orderBy(asc(productCollection.displayOrder), asc(productCollection.createdAt));
  return rows.map(r => ({ id: r.id, slug: r.slug, preset: r.preset, name: r.nameEn, headline: r.headlineEn, description: r.descriptionEn, anchor: collectionAnchor(r.slug),
    bn: r.nameBn ? { name: r.nameBn, headline: r.headlineBn || r.headlineEn, description: r.descriptionBn || r.descriptionEn } : null }));
}
async function collectionSlugTaken(db: CatalogDb, slug: string, exceptId?: string) {
  const [row] = await db.select({ id: productCollection.id }).from(productCollection).where(eq(productCollection.slug, slug)).limit(1);
  return Boolean(row && row.id !== exceptId);
}
export async function createCollection(db: CatalogDb, actorId: string, input: CollectionInput) {
  if (await collectionSlugTaken(db, input.slug)) throw new ProductStoreError("SLUG_TAKEN");
  const id = randomUUID();
  await db.transaction(async tx => {
    await tx.insert(productCollection).values({ id, ...input, createdBy: actorId, updatedBy: actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "collection.create", targetId: id, reason: `${input.slug} (${input.status})` });
  });
  return id;
}
const collectionFields = ["slug", "status", "preset", "nameEn", "nameBn", "headlineEn", "headlineBn", "descriptionEn", "descriptionBn", "displayOrder"] as const;
/** Built-in sections keep their slug (it anchors existing links such as #products). */
export async function updateCollection(db: CatalogDb, actorId: string, id: string, input: CollectionInput) {
  const [current] = await db.select().from(productCollection).where(and(eq(productCollection.id, id), isNull(productCollection.archivedAt))).limit(1);
  if (!current) throw new ProductStoreError("NOT_FOUND");
  if (builtInCollections.includes(id) && input.slug !== current.slug) throw new ProductStoreError("BUILT_IN");
  if (input.slug !== current.slug && await collectionSlugTaken(db, input.slug, id)) throw new ProductStoreError("SLUG_TAKEN");
  const changed = collectionFields.filter(f => current[f] !== input[f]);
  if (!changed.length) return false;
  await db.transaction(async tx => {
    await tx.update(productCollection).set({ ...input, updatedBy: actorId, updatedAt: new Date() }).where(eq(productCollection.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "collection.update", targetId: id, reason: changed.join(",") });
  });
  return true;
}
/** ON/OFF switch for a section (published = ON, hidden = OFF). */
export async function setCollectionStatus(db: CatalogDb, actorId: string, id: string, status: ProductStatus) {
  await db.transaction(async tx => {
    const done = await tx.update(productCollection).set({ status, updatedBy: actorId, updatedAt: new Date() }).where(and(eq(productCollection.id, id), isNull(productCollection.archivedAt))).returning({ id: productCollection.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "collection.status", targetId: id, reason: status });
  });
}
/** Archive a custom section. Built-in sections can only be hidden, and a section must be empty first. */
export async function archiveCollection(db: CatalogDb, actorId: string, id: string) {
  if (builtInCollections.includes(id)) throw new ProductStoreError("BUILT_IN");
  await db.transaction(async tx => {
    const [busy] = await tx.select({ n: count() }).from(product).where(and(eq(product.collectionId, id), isNull(product.archivedAt)));
    if (Number(busy?.n ?? 0) > 0) throw new ProductStoreError("COLLECTION_NOT_EMPTY");
    const done = await tx.update(productCollection).set({ status: "hidden", archivedAt: new Date(), updatedBy: actorId, updatedAt: new Date() }).where(and(eq(productCollection.id, id), isNull(productCollection.archivedAt))).returning({ slug: productCollection.slug });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "collection.archive", targetId: id, reason: done[0].slug });
  });
}
