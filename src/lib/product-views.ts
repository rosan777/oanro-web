import "server-only";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { product, productCollection, productViewDaily } from "./db/schema";
import { storefrontCached } from "./storefront-cache";
import type { CatalogDb } from "./product-store";
import { catalogDb } from "./store-products";

const dhakaDay = (d = new Date()) => new Date(d.getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
/** +1 view for a published product (unknown or hidden slugs are ignored). */
export async function recordView(db: CatalogDb, slug: string) {
  const [p] = await db.select({ id: product.id }).from(product).where(and(eq(product.slug, slug), eq(product.status, "published"), isNull(product.archivedAt))).limit(1);
  if (!p) return;
  await db.insert(productViewDaily).values({ productId: p.id, day: dhakaDay(), views: 1 })
    .onConflictDoUpdate({ target: [productViewDaily.productId, productViewDaily.day], set: { views: sql`${productViewDaily.views} + 1` } });
}
/** Most-viewed live products in the last 30 days (slugs, best first). Uses the storefront cache (about a minute). */
const cachedPopular = storefrontCached("popular", async () => {
  const since = dhakaDay(new Date(Date.now() - 30 * 86_400_000));
  const db = catalogDb();
  const rows = await db.select({ slug: product.slug, views: sql<number>`sum(${productViewDaily.views})`.mapWith(Number) }).from(productViewDaily)
    .innerJoin(product, eq(product.id, productViewDaily.productId)).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
    .where(and(gte(productViewDaily.day, since), eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published")))
    .groupBy(product.slug).orderBy(desc(sql`sum(${productViewDaily.views})`)).limit(8);
  return rows.map(r => r.slug);
});
/** Views per product for a date range (for reports). */
export async function viewsSince(db: CatalogDb, since: Date | null) {
  const rows = await db.select({ productId: productViewDaily.productId, views: sql<number>`sum(${productViewDaily.views})`.mapWith(Number) }).from(productViewDaily)
    .where(since ? gte(productViewDaily.day, dhakaDay(since)) : undefined).groupBy(productViewDaily.productId);
  return new Map(rows.map(r => [r.productId, r.views]));
}
/** Never fails: no table yet (migration not run) or a DB blip just means "no popular list". */
export async function popularSlugs(): Promise<string[]> { try { return await cachedPopular(); } catch { return []; } }
