import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getStoreProducts } from "@/lib/store-products";
import ProductDetail from "@/components/product-detail";
type Props = { params: Promise<{ slug: string }> };
async function find(slug: string) { return getSiteConfig().products ? (await getStoreProducts()).find(p => p.slug === slug) : undefined; }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const product = await find((await params).slug); return { title: product?.name || "Product unavailable" }; }
export default async function ProductPage({ params }: Props) { const product = await find((await params).slug); if (!product) notFound(); return <ProductDetail product={product} contact={getSiteConfig()} />; }
