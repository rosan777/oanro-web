import type { Metadata } from "next";
import { mediaUrl } from "@/lib/site-content-data";
import { getSiteContent } from "@/lib/site-content";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getStoreCollections, getStoreProducts } from "@/lib/store-products";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { localePath } from "@/lib/locale-path";
import { presetLabel } from "@/lib/categories";
import { categoryGuide } from "@/lib/seo-copy";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";
import { CollectionBrowser } from "@/components/collection-browser";
import Link from "@/components/locale-link";

// Category page for a product section, at a keyword URL: the section's slug from admin (e.g. /winter-clothing).
type Props = { params: Promise<{ collection: string }> };

/** The published section with this slug and its products; null when products are off or the slug is unknown. */
async function load(slug: string) {
  if (!getSiteConfig().products) return null;
  const [collections, products] = await Promise.all([getStoreCollections(), getStoreProducts()]);
  const collection = collections.find(c => c.slug === slug);
  if (!collection) return null;
  return {
    collection,
    items: products.filter(p => (p.collectionId ?? "seasonal") === collection.id),
  };
}

/** Section name and texts in the page language (Bangla only when the owner wrote it). */
function copyFor(
  collection: NonNullable<Awaited<ReturnType<typeof load>>>["collection"],
  bn: boolean,
) {
  return bn && collection.bn
    ? collection.bn
    : { name: collection.name, headline: collection.headline, description: collection.description };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { collection: slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Not available", robots: { index: false } };
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const copy = copyFor(data.collection, bn);
  const title = bn ? `${copy.name} – অনলাইনে কিনুন` : `${copy.name} – Shop Online`;
  const fallback = bn
    ? `OANRO থেকে ${copy.name} অনলাইনে কিনুন। ছবি, সাইজ ও বিস্তারিত দেখুন, সারা বাংলাদেশে ডেলিভারি।`
    : `Shop ${copy.name} online from OANRO. See photos, sizes and details, with delivery across Bangladesh.`;
  const description = (
    [copy.headline, copy.description].filter(Boolean).join(". ") || fallback
  ).slice(0, 158);
  const path = `/${data.collection.slug}`;
  return {
    title,
    description,
    alternates: alternatesFor(path, locale),
    // An empty section is a thin page: keep it out of Google until it has products.
    ...(data.items.length ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      siteName: "OANRO",
      url: localePath(path, locale),
      title,
      description,
      locale: bn ? "bn_BD" : "en_BD",
      images: [
        data.items.find(p => p.image)?.image ||
          mediaUrl(await getSiteContent(), "share") ||
          "/images/campaign.png",
      ],
    },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { collection: slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const { collection, items } = data;
  const copy = copyFor(collection, bn);
  const guide = categoryGuide(collection.preset, copy.name, locale);
  const pageUrl = absoluteUrl(localePath(`/${collection.slug}`, locale));

  // Structured data for search engines: the breadcrumb and the list of products on this page.

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: bn ? "হোম" : "Home",
        item: absoluteUrl(localePath("/", locale)),
      },
      { "@type": "ListItem", position: 2, name: copy.name, item: pageUrl },
    ],
  };
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: copy.name,
    itemListElement: items.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(localePath(`/products/${p.slug}`, locale)),
      name: bn && p.bn ? p.bn.name : p.name,
    })),
  };
  return (
    <main id="main-content" className="category-page">
      <JsonLd data={breadcrumb} />
      {items.length > 0 && <JsonLd data={itemList} />}
      <section className="o-shop-banner">
        <div>
          <nav className="o-breadcrumb" aria-label={bn ? "আপনি এখানে আছেন" : "Breadcrumb"}>
            <Link href="/">{bn ? "হোম" : "Home"}</Link>
            <span aria-hidden="true"> / </span>
            <Link href="/shop">{bn ? "স্টোর" : "Store"}</Link>
            <span aria-hidden="true"> / </span>
            <span aria-current="page">{copy.name}</span>
          </nav>
          <span className="o-eyebrow">{presetLabel[collection.preset][locale]}</span>
          <h1>
            <mark>{copy.name}</mark>
          </h1>
          <p>{[copy.headline, copy.description].filter(Boolean).join(". ")}</p>
        </div>
        <span className="o-banner-flower" aria-hidden="true">
          ✳
        </span>
      </section>
      <section className="o-section">
        {items.length ? (
          <CollectionBrowser items={items} />
        ) : (
          <div className="o-empty">
            <h2>
              {bn ? "এই সেকশনের পণ্য শীঘ্রই আসছে।" : "Products for this section are coming soon."}
            </h2>
            <Link className="o-button" href="/shop">
              {bn ? "সব পণ্য দেখুন" : "Shop everything"}
            </Link>
          </div>
        )}
      </section>
      <section className="o-section o-category-guide">
        <h2>{guide.heading}</h2>
        {guide.paragraphs.map(text => (
          <p key={text.slice(0, 24)}>{text}</p>
        ))}
        <p>
          <Link href="/delivery-returns" className="o-underlined">
            {bn ? "ডেলিভারি ও রিটার্ন" : "Delivery & Returns"}
          </Link>
        </p>
      </section>
    </main>
  );
}
