// Signed-in shoppers' wishlists. Only live (published) products are returned; slugs are matched
// to product rows on the server, so the browser can never save an unknown or hidden product.

import { and, eq, inArray, isNull } from "drizzle-orm";
import { product, wishlistItem } from "./db/schema";
import type { CatalogDb } from "./product-store";

const LIMIT = 100;

/** Slugs on the customer's wishlist that are currently live, newest first. */
export async function listWishlist(db: CatalogDb, userId: string) {
  const rows = await db
    .select({ slug: product.slug })
    .from(wishlistItem)
    .innerJoin(product, eq(product.id, wishlistItem.productId))
    .where(
      and(
        eq(wishlistItem.userId, userId),
        eq(product.status, "published"),
        isNull(product.archivedAt),
      ),
    )
    .orderBy(wishlistItem.createdAt);
  return rows.map(r => r.slug).reverse();
}

async function liveIds(db: CatalogDb, slugs: string[]) {
  if (!slugs.length) return [];
  return db
    .select({ id: product.id, slug: product.slug })
    .from(product)
    .where(
      and(
        inArray(product.slug, slugs),
        eq(product.status, "published"),
        isNull(product.archivedAt),
      ),
    );
}

/** Adds products (unknown or hidden slugs are ignored). Refuses when the list would exceed 100. */
export async function addToWishlist(db: CatalogDb, userId: string, slugs: string[]) {
  const rows = await liveIds(db, [...new Set(slugs)].slice(0, LIMIT));
  if (!rows.length) return listWishlist(db, userId);
  const current = await db
    .select({ productId: wishlistItem.productId })
    .from(wishlistItem)
    .where(eq(wishlistItem.userId, userId));
  const have = new Set(current.map(r => r.productId));
  const fresh = rows.filter(r => !have.has(r.id)).slice(0, Math.max(0, LIMIT - have.size));
  if (fresh.length)
    await db
      .insert(wishlistItem)
      .values(fresh.map(r => ({ userId, productId: r.id })))
      .onConflictDoNothing();
  return listWishlist(db, userId);
}

export async function removeFromWishlist(db: CatalogDb, userId: string, slug: string) {
  const [row] = await db
    .select({ id: product.id })
    .from(product)
    .where(eq(product.slug, slug))
    .limit(1);
  if (row)
    await db
      .delete(wishlistItem)
      .where(and(eq(wishlistItem.userId, userId), eq(wishlistItem.productId, row.id)));
  return listWishlist(db, userId);
}
