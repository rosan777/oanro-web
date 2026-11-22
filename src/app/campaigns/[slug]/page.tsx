import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getActiveCampaigns, getStoreProducts } from "@/lib/store-products";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteContent } from "@/lib/site-content";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import Link from "@/components/locale-link";
import { ProductCard } from "@/components/product-card";
import Image from "next/image";

type Props = { params: Promise<{ slug: string }> };

async function campaignFor(slug: string) {
  if (!getSiteConfig().products || !(await getSiteContent()).features.campaigns) notFound();
  const campaign = (await getActiveCampaigns()).find(item => item.slug === slug);
  if (!campaign) notFound();
  const { locale } = await requestLocale();
  const copy = locale === "bn" && campaign.bn ? campaign.bn : campaign;
  return { campaign, copy, locale };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { copy, locale } = await campaignFor(slug);
  return { title: copy.headline || copy.name, description: copy.description || copy.name,
    alternates: alternatesFor(`/campaigns/${slug}`, locale) };
}

export default async function CampaignPage({ params }: Props) {
  const { campaign, copy, locale } = await campaignFor((await params).slug);
  const catalog = await getStoreProducts();
  const products = campaign.productSlugs.flatMap(slug => catalog.filter(p => p.slug === slug));
  const bn = locale === "bn";
  return <main id="main-content" className="print-campaign">
    <header>
      {campaign.image?.startsWith("/api/campaigns/") && <Image src={campaign.image} alt="" width={1440} height={720} loading="eager" />}
      <div>
        {copy.headline && <p className="o-eyebrow">{copy.name}</p>}
        <h1>{copy.headline || copy.name}</h1>
        {copy.description && <p>{copy.description}</p>}
        <Link href="/shop">{bn ? "সব পণ্য দেখুন" : "Browse all products"}</Link>
      </div>
    </header>
    {products.length > 0 && <section className="o-section">
      <h2>{bn ? "এই ক্যাম্পেইনের পণ্য" : "Shop the campaign"}</h2>
      <div className="o-product-grid three">{products.map(product => <ProductCard key={product.slug} product={product} />)}</div>
    </section>}
  </main>;
}
