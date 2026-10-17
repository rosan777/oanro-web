import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
// Storefront data (products, sections, services, campaigns, pulse) is the same for every visitor, so it is
// cached across requests instead of hitting the database on every page. Any admin change or order clears it.
// Loaders passed here must THROW on database errors: errors are never cached, so a blip can't stick for a minute.
export const STOREFRONT_TAG = "storefront";
export function storefrontCached<T>(key: string, load: () => Promise<T>) {
  return unstable_cache(load, ["storefront", key], { tags: [STOREFRONT_TAG], revalidate: 60 });
}
/** Call after anything a shopper could see changes (admin edits, orders, stock). Expires the cache immediately. */
export function storefrontChanged() {
  try { revalidateTag(STOREFRONT_TAG, { expire: 0 }); } catch { /* outside a request (tests, scripts): nothing cached */ }
}
