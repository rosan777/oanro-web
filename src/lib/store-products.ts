import "server-only";
import { cache } from "react";
import { getDb } from "./db";
import { storefrontCached } from "./storefront-cache";
import { demoCollections, products as demoProducts, services as demoServices, type Product, type Service, type StoreCollection } from "./catalog";
import { hasManagedCatalog, listOwnerCollections, listOwnerProducts, listStorefrontCollections, listStorefrontProducts, type CatalogDb, type OwnerCollection, type OwnerProduct } from "./product-store";
import { hasManagedServices, listOwnerServices, listStorefrontServices, type OwnerService } from "./service-store";
import { getSectionState } from "./website-sections";
import { listActiveCampaigns, listOwnerCampaigns, type OwnerCampaign } from "./campaign-store";
import type { StoreCampaign } from "./catalog";

export const catalogDb = () => getDb() as unknown as CatalogDb;
function missingSchema(error: unknown) {
  // 42P01 = table missing, 42703 = column missing: a migration has not run yet.
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const e = current as { code?: string; cause?: unknown; message?: string };
    if (["42P01", "42703"].includes(e.code ?? "")) return true;
    if (/column .* does not exist|relation .* does not exist/i.test(e.message ?? "")) return true;
    current = e.cause;
  }
  return false;
}
/**
 * Storefront catalog. The demo list is shown only when no database is configured or a catalog migration has not
 * run yet. With a database, the shop shows exactly what the owner published, even when that is nothing
 * (an empty shop never fills up with sample products). Other database errors fail closed (empty).
 */
const cachedProducts = storefrontCached("products", () => listStorefrontProducts(catalogDb()));
const cachedServices = storefrontCached("services", () => listStorefrontServices(catalogDb()));
const cachedCollections = storefrontCached("collections", () => listStorefrontCollections(catalogDb()));
const cachedCampaigns = storefrontCached("campaigns", () => listActiveCampaigns(catalogDb()));
async function loadStoreProducts(): Promise<Product[]> {
  if (!process.env.DATABASE_URL) return demoProducts;
  try { return await cachedProducts(); }
  catch (error) { return missingSchema(error) ? demoProducts : []; }
}
async function loadStoreServices(): Promise<Service[]> {
  if (!process.env.DATABASE_URL) return demoServices;
  try { return await cachedServices(); }
  catch (error) { return missingSchema(error) ? demoServices : []; }
}
/** Published product rows (sections), in display order. Before the migration, mirrors the old Caps/Tech switches. */
async function loadStoreCollections(): Promise<StoreCollection[]> {
  if (process.env.DATABASE_URL) {
    try { return await cachedCollections(); }
    catch (error) { if (!missingSchema(error)) return []; }
  }
  const sections = await getSectionState();
  return demoCollections.filter(c => c.id === "seasonal" || (c.id === "caps" ? sections.caps : sections["tech-items"]));
}
export type OwnerCatalog = { ready: boolean; managed: boolean; products: OwnerProduct[]; collections: OwnerCollection[] };
export async function getOwnerCatalog(): Promise<OwnerCatalog> {
  if (!process.env.DATABASE_URL) return { ready: false, managed: false, products: [], collections: [] };
  try {
    const db = catalogDb();
    const [managed, products, collections] = await Promise.all([hasManagedCatalog(db), listOwnerProducts(db), listOwnerCollections(db)]);
    return { ready: true, managed, products, collections };
  } catch { return { ready: false, managed: false, products: [], collections: [] }; }
}
export type OwnerServices = { ready: boolean; managed: boolean; services: OwnerService[] };
export async function getOwnerServices(): Promise<OwnerServices> {
  if (!process.env.DATABASE_URL) return { ready: false, managed: false, services: [] };
  try {
    const db = catalogDb();
    return { ready: true, managed: await hasManagedServices(db), services: await listOwnerServices(db) };
  } catch { return { ready: false, managed: false, services: [] }; }
}
/** Campaigns running now (Dhaka-time schedule is stored as exact instants). Fails closed. */
async function loadActiveCampaigns(): Promise<StoreCampaign[]> {
  if (!process.env.DATABASE_URL) return [];
  try { return await cachedCampaigns(); } catch { return []; }
}
export async function getOwnerCampaigns(): Promise<{ ready: boolean; campaigns: OwnerCampaign[] }> {
  if (!process.env.DATABASE_URL) return { ready: false, campaigns: [] };
  try { return { ready: true, campaigns: await listOwnerCampaigns(catalogDb()) }; } catch { return { ready: false, campaigns: [] }; }
}
/** Cached per request: layout and page share one database round trip. */
export const getStoreProducts = cache(loadStoreProducts);
/** Cached per request: layout and page share one database round trip. */
export const getStoreServices = cache(loadStoreServices);
/** Cached per request: layout and page share one database round trip. */
export const getStoreCollections = cache(loadStoreCollections);
/** Cached per request: layout and page share one database round trip. */
export const getActiveCampaigns = cache(loadActiveCampaigns);
