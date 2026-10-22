import { ViewCounter } from "@/components/view-counter";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { publicRules } from "@/lib/public-rules";
import { getStoreCollections, getStoreProducts } from "@/lib/store-products";
import ProductDetail from "@/components/product-detail";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, absoluteUrl, storeLive } from "@/lib/seo";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { localePath } from "@/lib/locale-path";
import { siteUrl } from "@/lib/site-url";
type Props = { params: Promise<{ slug: string }> };
async function find(slug: string) { return getSiteConfig().products ? (await getStoreProducts()).find(p => p.slug === slug) : undefined; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await find((await params).slug);
  if (!product) return { title: "Product unavailable", robots: { index: false } };
  const { locale } = await requestLocale(); const bn = locale === "bn" && Boolean(product.bn);
  const name = bn ? product.bn!.name : product.name, tagline = bn ? product.bn!.tagline : product.tagline, body = bn ? product.bn!.description : product.description;
  const description = ((tagline ? `${tagline} ` : "") + body).slice(0, 158);
  const path = `/products/${product.slug}`;
  return { title: name, description, alternates: alternatesFor(path, locale),
    openGraph: { type: "website", siteName: SITE_NAME, title: name, description, url: localePath(path, locale), locale: locale === "bn" ? "bn_BD" : "en_BD", images: [{ url: `/og/product/${product.slug}`, width: 1200, height: 630, alt: name }] },
    twitter: { card: "summary_large_image", title: name, description, images: [`/og/product/${product.slug}`] } };
}
export default async function ProductPage({ params }: Props) {
  const product = await find((await params).slug); if (!product) notFound();
  const [all, collections, rules] = await Promise.all([getStoreProducts(), getStoreCollections(), publicRules()]);
  // Same section first, then everything else; in-stock items before sold-out ones (stable sort keeps the shop's order).
  const rest = all.filter(p => p.slug !== product.slug).sort((a, b) => Number(a.inStock === false) - Number(b.inStock === false));
  const same = product.collectionId ? rest.filter(p => p.collectionId === product.collectionId) : [];
  const others = rest.filter(p => !same.includes(p));
  const section = collections.find(c => c.id === product.collectionId);
  const sectionName = section ? { en: section.name, bn: section.bn?.name ?? section.name } : null;
  // Breadcrumb is always accurate, so it is always emitted: Home > category page > product.
  const { locale } = await requestLocale(); const bnName = locale === "bn" && product.bn ? product.bn.name : product.name;
  const pageUrl = absoluteUrl(localePath(`/products/${product.slug}`, locale));
  const crumbs = [{ name: locale === "bn" ? "হোম" : "Home", item: absoluteUrl(localePath("/", locale)) },
    ...(section && sectionName ? [{ name: locale === "bn" ? sectionName.bn : sectionName.en, item: absoluteUrl(localePath(`/${section.slug}`, locale)) }] : []),
    { name: bnName, item: pageUrl }];
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, ...c })) };
  // Price and stock only when the store is really selling (OANRO_STORE_LIVE=true): sample prices would mislead Google.
  const live = storeLive();
  const days = (range: string) => { const [min, max = min] = range.split("-").map(Number); return { minValue: min, maxValue: max, unitCode: "DAY" }; };
  const shipping = (charge: number, region?: string) => ({ "@type": "OfferShippingDetails", shippingRate: { "@type": "MonetaryAmount", value: charge, currency: "BDT" },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "BD", ...(region ? { addressRegion: region } : {}) },
    deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" }, transitTime: { "@type": "QuantitativeValue", ...days(region ? rules.dhakaDays : rules.outsideDays) } } });
  const productSchema = live && product.price > 0 ? { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description, sku: product.slug, category: product.category,
    image: [absoluteUrl(product.image || "/images/campaign.png")], brand: { "@type": "Brand", name: SITE_NAME },
    offers: { "@type": "Offer", url: pageUrl, priceCurrency: "BDT", price: product.price, itemCondition: "https://schema.org/NewCondition",
      availability: product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", seller: { "@id": `${siteUrl()}/#organization` },
      shippingDetails: [shipping(rules.deliveryCharge, "Dhaka"), shipping(rules.outsideCharge)] } } : null;
  return <><JsonLd data={breadcrumb} />{productSchema && <JsonLd data={productSchema} />}<ViewCounter slug={product.slug} /><ProductDetail product={product} rules={rules} contact={getSiteConfig()} live={live} related={{ same, others, sectionName }} /></>;
}
