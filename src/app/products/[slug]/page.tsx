import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "@/lib/catalog";
import { getSiteConfig } from "@/lib/site-config";
import ProductDetail from "@/components/product-detail";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const product = getSiteConfig().products ? products.find(p => p.slug === slug) : undefined; return { title: product?.name || "Product unavailable" }; }
export default async function ProductPage({ params }: Props) { const { slug } = await params; const config = getSiteConfig(); const product = products.find(p => p.slug === slug); if (!config.products || !product) notFound(); return <ProductDetail product={product} contact={config} />; }
