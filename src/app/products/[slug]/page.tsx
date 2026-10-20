import { ViewCounter } from "@/components/view-counter";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getStoreCollections, getStoreProducts } from "@/lib/store-products";
import ProductDetail from "@/components/product-detail";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, absoluteUrl, storeLive } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
type Props = { params: Promise<{ slug: string }> };
async function find(slug: string) { return getSiteConfig().products ? (await getStoreProducts()).find(p => p.slug === slug) : undefined; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await find((await params).slug);
  if (!product) return { title: "Product unavailable", robots: { index: false } };
  const description = (product.tagline ? `${product.tagline} ` : "") + product.description.slice(0, 150);
  return { title: product.name, description, alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, url: `/products/${product.slug}`, images: product.image ? [{ url: product.image, width: 800, height: 800, alt: product.name }] : ["/images/campaign.png"] } };
}
export default async function ProductPage({ params }: Props) {
  const product = await find((await params).slug); if (!product) notFound();
  const [all, collections] = await Promise.all([getStoreProducts(), getStoreCollections()]);
  // Same section first, then everything else; in-stock items before sold-out ones (stable sort keeps the shop's order).
  const rest = all.filter(p => p.slug !== product.slug).sort((a, b) => Number(a.inStock === false) - Number(b.inStock === false));
  const same = product.collectionId ? rest.filter(p => p.collectionId === product.collectionId) : [];
  const others = rest.filter(p => !same.includes(p));
  const section = collections.find(c => c.id === product.collectionId);
  const sectionName = section ? { en: section.name, bn: section.bn?.name ?? section.name } : null;
  const url = absoluteUrl(`/products/${product.slug}`);
  // Breadcrumb is always accurate, so it is always emitted.
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
    { "@type": "ListItem", position: 2, name: product.name, item: url },
  ] };
  // Price and stock only when the store is really selling (OANRO_STORE_LIVE=true): sample prices would mislead Google.
  const productSchema = storeLive() && product.price > 0 ? { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, sku: product.slug, category: product.category,
    image: [absoluteUrl(product.image || "/images/campaign.png")], brand: { "@type": "Brand", name: SITE_NAME },
    offers: { "@type": "Offer", url, priceCurrency: "BDT", price: product.price, itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", seller: { "@id": `${siteUrl()}/#organization` } } } : null;
  return <><JsonLd data={breadcrumb} />{productSchema && <JsonLd data={productSchema} />}<ViewCounter slug={product.slug} /><ProductDetail product={product} contact={getSiteConfig()} related={{ same, others, sectionName }} /></>;
}
