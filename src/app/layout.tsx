import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Geist, Hind_Siliguri, Instrument_Serif, JetBrains_Mono, Parisienne, Space_Grotesk } from "next/font/google";
import { TrustBar } from "@/components/trust-bar";
import { publicRules } from "@/lib/public-rules";
import { Experience, Intro } from "@/components/experience";
import { Header, Footer } from "@/components/shell";
import { LocaleProvider } from "@/components/locale";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";
import "./v2.css";
import { FloatingHelp } from "@/components/site-extras";
import { PrivacyCenter } from "@/components/privacy-center";
import { storeLive } from "@/lib/seo";
import { getApprovedPulseStories, getSectionState } from "@/lib/website-sections";
import { GlobalPulse } from "@/components/global-pulse";
import { ProductsProvider } from "@/components/products-context";
import { getStoreCollections, getStoreProducts, getStoreServices } from "@/lib/store-products";
import { siteUrl } from "@/lib/site-url";
import { popularSlugs } from "@/lib/product-views";
import { JsonLd } from "@/components/json-ld";
import { requestLocale, alternatesFor } from "@/lib/request-locale";
import { DEFAULT_DESCRIPTION, DEFAULT_DESCRIPTION_BN, DEFAULT_OG_IMAGE, DEFAULT_TITLE, DEFAULT_TITLE_BN, SITE_NAME, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap", preload: false });
// Bangla glyphs: Geist has none, so Bangla text falls through to Hind Siliguri.
const bangla = Hind_Siliguri({ variable: "--font-bangla", subsets: ["bengali"], weight: ["400", "500", "600"], display: "swap" });
// Accent serif for the brand words only (italic).
// New brand fonts (I1 design): condensed headings, grotesk body, mono labels, handwritten signature.
const display = Barlow_Condensed({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const body = Space_Grotesk({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });
const mono = JetBrains_Mono({ variable: "--font-label", subsets: ["latin"], weight: ["400", "500"], display: "swap", preload: false });
const script = Parisienne({ variable: "--font-script", subsets: ["latin"], weight: "400", display: "swap", preload: false });
const accent = Instrument_Serif({ variable: "--font-accent", subsets: ["latin"], weight: "400", style: ["normal", "italic"], display: "swap", preload: false });
export async function generateMetadata(): Promise<Metadata> {
  const { locale, path } = await requestLocale();
  const bn = locale === "bn";
  const title = bn ? DEFAULT_TITLE_BN : DEFAULT_TITLE, description = bn ? DEFAULT_DESCRIPTION_BN : DEFAULT_DESCRIPTION;
  return { metadataBase: new URL(siteUrl()), title: { default: title, template: "%s | OANRO" }, description, applicationName: SITE_NAME, icons: { icon: "/logo.svg" },
    // Every page gets its canonical URL and EN/BN hreflang links here unless it sets its own.
    alternates: alternatesFor(path, locale),
    openGraph: { type: "website", siteName: SITE_NAME, locale: bn ? "bn_BD" : "en_BD", alternateLocale: [bn ? "en_BD" : "bn_BD"], title, description, images: [DEFAULT_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE.url] } };
}
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = getSiteConfig();
  const { locale } = await requestLocale();
  const rules = await publicRules();
  const sections = await getSectionState();
  // The admin Services switch hides services everywhere (rows, menu, search), on top of the environment switch.
  const site = { ...config, services: config.services && sections.services };
  const [stories, catalog, serviceList, lines, popular] = await Promise.all([sections["global-pulse"] ? getApprovedPulseStories() : [], config.products ? getStoreProducts() : [], site.services ? getStoreServices() : [], config.products ? getStoreCollections() : [], config.products && process.env.DATABASE_URL ? popularSlugs() : []]);
  return <html lang={locale} data-scroll-behavior="smooth" className={`${sans.variable} ${bangla.variable} ${accent.variable} ${display.variable} ${body.variable} ${mono.variable} ${script.variable}`}><body><JsonLd data={organizationJsonLd(config)} /><JsonLd data={websiteJsonLd()} /><LocaleProvider initialLocale={locale}><ProductsProvider products={catalog} services={serviceList} collections={lines} popular={popular}><Experience><a className="skip-link" href="#main-content">Skip to content</a><div id="top" />{config.intro && <Intro />}<TrustBar rules={rules} locale={locale} live={storeLive()} services={site.services} /><Header config={site} />{children}<GlobalPulse stories={stories} /><Footer config={site} /><FloatingHelp whatsappUrl={config.whatsappUrl} /><PrivacyCenter gaId={process.env.NEXT_PUBLIC_GA_ID ?? ""} /></Experience></ProductsProvider></LocaleProvider></body></html>;
}
