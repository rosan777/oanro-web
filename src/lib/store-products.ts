import "server-only";
import { getDb } from "./db";
import { demoCollections, products as demoProducts, services as demoServices, type Product, type Service, type StoreCollection } from "./catalog";
import { hasManagedCatalog, listOwnerCollections, listOwnerProducts, listStorefrontCollections, listStorefrontProducts, type CatalogDb, type OwnerCollection, type OwnerProduct } from "./product-store";
import { hasManagedServices, listOwnerServices, listStorefrontServices, type OwnerService } from "./service-store";
import { getSectionState } from "./website-sections";
import { listActiveCampaigns, listOwnerCampaigns, type OwnerCampaign } from "./campaign-store";
import type { StoreCampaign } from "./catalog";

export const catalogDb = () => getDb() as unknown as CatalogDb;
function missingSchema(error: unknown) {
  // 42P01 = table missing, 42703 = column missing: a migration has not run yet.
  const e = error as { code?: string; cause?: { code?: string } };
  return ["42P01", "42703"].includes(e?.code ?? "") || ["42P01", "42703"].includes(e?.cause?.code ?? "");
}
/**
 * Storefront catalog. The demo list is shown only when no database is configured, a catalog migration
 * has not run yet, or the owner has never added a product. Other database errors fail closed (empty)
 * so hidden or archived products are never resurrected from the demo list.
 */
export async function getStoreProducts(): Promise<Product[]> {
  if (!process.env.DATABASE_URL) return demoProducts;
  try {
    const db = catalogDb();
    return await hasManagedCatalog(db) ? await listStorefrontProducts(db) : demoProducts;
  } catch (error) { return missingSchema(error) ? demoProducts : []; }
}
export async function getStoreServices(): Promise<Service[]> {
  if (!process.env.DATABASE_URL) return demoServices;
  try {
    const db = catalogDb();
    return await hasManagedServices(db) ? await listStorefrontServices(db) : demoServices;
  } catch (error) { return missingSchema(error) ? demoServices : []; }
}
/** Published product rows (sections), in display order. Before the migration, mirrors the old Caps/Tech switches. */
export async function getStoreCollections(): Promise<StoreCollection[]> {
  if (process.env.DATABASE_URL) {
    try { return await listStorefrontCollections(catalogDb()); }
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
export async function getActiveCampaigns(): Promise<StoreCampaign[]> {
  if (!process.env.DATABASE_URL) return [];
  try { return await listActiveCampaigns(catalogDb()); } catch { return []; }
}
export async function getOwnerCampaigns(): Promise<{ ready: boolean; campaigns: OwnerCampaign[] }> {
  if (!process.env.DATABASE_URL) return { ready: false, campaigns: [] };
  try { return { ready: true, campaigns: await listOwnerCampaigns(catalogDb()) }; } catch { return { ready: false, campaigns: [] }; }
}
