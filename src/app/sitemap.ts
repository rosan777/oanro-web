import type { MetadataRoute } from "next";
import { getStoreProducts } from "@/lib/store-products";
import { getSiteConfig } from "@/lib/site-config";
import { siteUrl } from "@/lib/site-url";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/contact", "/delivery-returns", "/privacy", "/terms"].map(path => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path ? 0.4 : 1 }));
  const products = getSiteConfig().products ? (await getStoreProducts()).map(p => ({ url: `${base}/products/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })) : [];
  return [...pages, ...products];
}
