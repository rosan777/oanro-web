import Link from "@/components/locale-link";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getStoreCollections, getStoreProducts } from "@/lib/store-products";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { absoluteUrl } from "@/lib/seo";
import { localePath } from "@/lib/locale-path";
import { JsonLd } from "@/components/json-ld";
import { CollectionBrowser } from "@/components/collection-browser";

// The whole store in one place (approved design "Shop"): every live product with search, collection,
// availability, size, colour and budget filters. Collections keep their own pages at /<slug>.

export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const title = bn ? "সব পণ্য – অনলাইনে কিনুন" : "Shop all products";
  const description = bn
      ? "OANRO-র সব পণ্য এক জায়গায়: খুঁজুন, ফিল্টার করুন, তুলনা করুন। সারা বাংলাদেশে ডেলিভারি, বিকাশ, নগদ ও ক্যাশ অন ডেলিভারি।"
      : "Every OANRO product in one place: search, filter and compare. Delivery across Bangladesh with bKash, Nagad and cash on delivery.";
  const { openGraph, twitter } = await parent;
  return {
    title,
    description,
    openGraph: { ...openGraph, title, description },
    twitter: { ...twitter, title, description },
    alternates: alternatesFor("/shop", locale),
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; c?: string }>;
}) {
  if (!getSiteConfig().products) notFound();
  const [{ locale }, products, lines, params] = await Promise.all([
    requestLocale(),
    getStoreProducts(),
    getStoreCollections(),
    searchParams,
  ]);
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const collections = lines
    .filter(c => products.some(p => (p.collectionId ?? "seasonal") === c.id))
    .map(c => ({ id: c.id, slug: c.slug, name: c.name, bn: c.bn?.name }));
  const initialCollection = lines.find(c => c.slug === params.c)?.id ?? null;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: bn ? "সব পণ্য" : "All products",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(localePath(`/products/${p.slug}`, locale)),
      name: bn && p.bn ? p.bn.name : p.name,
    })),
  };
  return (
    <main id="main-content">
      {products.length > 0 && <JsonLd data={itemList} />}
      <section className="o-shop-banner">
        <div>
          <span className="o-eyebrow">{t("THE STORE / EVERYTHING", "স্টোর / সব পণ্য")}</span>
          <h1>
            {t("Find your", "আপনার পছন্দের")}
            <br />
            <mark>{t("everyday extraordinary.", "অসাধারণ খুঁজুন।")}</mark>
          </h1>
          <p>
            {t(
              "Good pieces. Quiet details. A collection that feels like you.",
              "পছন্দের পণ্য। সুন্দর বিস্তারিত। আপনার মতো একটি কালেকশন।",
            )}
          </p>
        </div>
        <span className="o-banner-flower" aria-hidden="true">
          ✳
        </span>
      </section>
      <section className="o-section">
        {products.length ? (
          <CollectionBrowser
            items={products}
            collections={collections}
            initialQuery={typeof params.q === "string" ? params.q.slice(0, 80) : ""}
            initialCollection={initialCollection}
          />
        ) : (
          <div className="o-empty">
            <h2>{t("New products are on the way.", "নতুন পণ্য আসছে।")}</h2>
            <p>{t("Please check back soon.", "শীঘ্রই আবার দেখুন।")}</p>
          </div>
        )}
      </section>
      {getSiteConfig().partners && (
        <section className="o-section print-partners" id="partners" aria-labelledby="partners-title">
          <h2 id="partners-title">{t("Partner picks", "পার্টনার পছন্দ")}</h2>
          <p>{t("Interested in featuring a product with OANRO?", "ওনারোর সঙ্গে আপনার পণ্য তুলে ধরতে চান?")}</p>
          <Link href="/contact">{t("Discuss a product partnership", "পণ্য নিয়ে অংশীদারত্বের কথা বলুন")}</Link>
        </section>
      )}
    </main>
  );
}
