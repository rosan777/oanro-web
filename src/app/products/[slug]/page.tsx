import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getStoreProducts } from "@/lib/store-products";
import ProductDetail from "@/components/product-detail";
type Props = { params: Promise<{ slug: string }> };
async function find(slug: string) { return getSiteConfig().products ? (await getStoreProducts()).find(p => p.slug === slug) : undefined; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await find((await params).slug);
  if (!product) return { title: "Product unavailable", robots: { index: false } };
  const description = (product.tagline ? `${product.tagline} ` : "") + product.description.slice(0, 150);
  return { title: product.name, description, alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, url: `/products/${product.slug}`, images: product.image ? [{ url: product.image, width: 800, height: 800, alt: product.name }] : ["/images/campaign.png"] } };
}
export default async function ProductPage({ params }: Props) { const product = await find((await params).slug); if (!product) notFound(); return <ProductDetail product={product} contact={getSiteConfig()} />; }
