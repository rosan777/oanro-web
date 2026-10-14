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

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { title: { default: "OANRO | Find your next", template: "%s | OANRO" }, description: "Seasonal products and practical technology services. Discover OANRO's first chapter.", icons: { icon: "/logo.svg" } };
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: { children: ReactNode }) {
  const config = getSiteConfig();
  const sections = await getSectionState();
  const stories = sections["global-pulse"] ? await getApprovedPulseStories() : [];
  return <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable}`}><body><LocaleProvider><Experience><a className="skip-link" href="#main-content">Skip to content</a><div id="top" />{config.intro && <Intro />}<Header config={config} />{children}<GlobalPulse stories={stories} /><Footer config={config} /></Experience></LocaleProvider></body></html>;
}
