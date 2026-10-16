"use client";
import { createContext, useContext, type ReactNode } from "react";
import { demoCollections, products as demoProducts, services as demoServices, type Product, type Service, type StoreCollection } from "@/lib/catalog";

const CatalogContext = createContext<{ products: Product[]; services: Service[]; collections: StoreCollection[] }>({ products: demoProducts, services: demoServices, collections: demoCollections });
export function ProductsProvider({ products, services, collections, children }: { products: Product[]; services: Service[]; collections: StoreCollection[]; children: ReactNode }) {
  return <CatalogContext.Provider value={{ products, services, collections }}>{children}</CatalogContext.Provider>;
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
