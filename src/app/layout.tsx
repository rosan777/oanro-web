import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Experience, Intro } from "@/components/experience";
import { Header, Footer } from "@/components/shell";
import { LocaleProvider } from "@/components/locale";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";
import { getApprovedPulseStories, getSectionState } from "@/lib/website-sections";
import { GlobalPulse } from "@/components/global-pulse";
import { ProductsProvider } from "@/components/products-context";
import { getStoreCollections, getStoreProducts, getStoreServices } from "@/lib/store-products";
import { siteUrl } from "@/lib/site-url";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { metadataBase: new URL(siteUrl()), title: { default: "OANRO | Find your next", template: "%s | OANRO" }, description: "Seasonal products and practical technology services. Discover OANRO's first chapter.", icons: { icon: "/logo.svg" }, openGraph: { type: "website", siteName: "OANRO", locale: "en_BD", alternateLocale: ["bn_BD"] } };
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = getSiteConfig();
  const sections = await getSectionState();
  // The admin Services switch hides services everywhere (rows, menu, search), on top of the environment switch.
  const site = { ...config, services: config.services && sections.services };
  const [stories, catalog, serviceList, lines] = await Promise.all([sections["global-pulse"] ? getApprovedPulseStories() : [], config.products ? getStoreProducts() : [], site.services ? getStoreServices() : [], config.products ? getStoreCollections() : []]);
  return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable}`}><body><LocaleProvider><ProductsProvider products={catalog} services={serviceList} collections={lines}><Experience><a className="skip-link" href="#main-content">Skip to content</a><div id="top" />{config.intro && <Intro />}<Header config={site} />{children}<GlobalPulse stories={stories} /><Footer config={site} /></Experience></ProductsProvider></LocaleProvider></body></html>;
}
