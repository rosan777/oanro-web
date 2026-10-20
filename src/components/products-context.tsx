"use client";
import { createContext, useContext, type ReactNode } from "react";
import { demoCollections, products as demoProducts, services as demoServices, type Product, type Service, type StoreCollection } from "@/lib/catalog";

type Catalog = { products: Product[]; services: Service[]; collections: StoreCollection[]; popular: string[] };
const CatalogContext = createContext<Catalog>({ products: demoProducts, services: demoServices, collections: demoCollections, popular: [] });
export function ProductsProvider({ products, services, collections, popular = [], children }: Omit<Catalog, "popular"> & { popular?: string[]; children: ReactNode }) {
  return <CatalogContext.Provider value={{ products, services, collections, popular }}>{children}</CatalogContext.Provider>;
}
/** Most-viewed products (last 30 days), topped up with in-stock products when there are few views yet. */
export function usePopularProducts(count = 4) {
  const { products, popular } = useContext(CatalogContext);
  const viewed = popular.flatMap(slug => products.filter(p => p.slug === slug && p.inStock !== false));
  const rest = products.filter(p => p.inStock !== false && !viewed.includes(p));
  return [...viewed, ...rest].slice(0, count);
}
/** The live storefront catalog (database products, or the demo list before the owner manages products). */
export function useProducts() { return useContext(CatalogContext).products; }
export function useServices() { return useContext(CatalogContext).services; }
/**
 * Published product lines (sections) that actually show on the storefront: sections with products,
 * plus empty Caps/Tech sections (they show placeholder ideas). Each comes with a cover product for its thumbnail.
 */
export function useProductLines() {
  const { products, collections } = useContext(CatalogContext);
  return collections.flatMap(collection => {
    const items = products.filter(p => (p.collectionId ?? "seasonal") === collection.id);
    if (!items.length && collection.preset !== "caps" && collection.preset !== "tech") return [];
    return [{ collection, count: items.length, cover: items.find(p => p.image) ?? items[0] }];
  });
}
