import type { MetadataRoute } from "next";
import { getStoreCollections, getStoreProducts, getStoreServices } from "@/lib/store-products";
import { getSiteConfig } from "@/lib/site-config";
import { getSectionState } from "@/lib/website-sections";
import { siteUrl } from "@/lib/site-url";
import { localePath } from "@/lib/locale-path";
import { getSiteContent } from "@/lib/site-content";
export const dynamic = "force-dynamic";

// Every public page in English and Bangla, each entry linking to its other-language version (hreflang).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const config = getSiteConfig();
  const entry = (path: string, priority: number): MetadataRoute.Sitemap => {
    const languages = { en: `${base}${path === "/" ? "" : path}`, bn: `${base}${localePath(path, "bn")}` };
    return [{ url: languages.en, changeFrequency: "weekly", priority, alternates: { languages } }, { url: languages.bn, changeFrequency: "weekly", priority, alternates: { languages } }];
  };
  const guides = await getSiteContent().then(c => c.guides).catch(() => []);
  const paths: [string, number][] = [["/", 1], ["/about", 0.6], ["/guides", 0.6], ...guides.map(g => [`/guides/${g.slug}`, 0.5] as [string, number]), ["/track", 0.4], ["/contact", 0.4], ["/delivery-returns", 0.4], ["/privacy", 0.3], ["/terms", 0.3]];
  if (config.products) {
    const [products, collections] = await Promise.all([getStoreProducts(), getStoreCollections()]);
    // Only sections that have products: empty ones are kept out of Google.
    for (const c of collections) if (products.some(p => (p.collectionId ?? "seasonal") === c.id)) paths.push([`/${c.slug}`, 0.8]);
    for (const p of products) paths.push([`/products/${p.slug}`, 0.7]);
  }
  if (config.services && (await getSectionState()).services) for (const s of await getStoreServices()) paths.push([`/services/${s.slug}`, 0.7]);
  return paths.flatMap(([path, priority]) => entry(path, priority));
}
