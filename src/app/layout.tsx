import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Experience, Intro } from "@/components/experience";
import { Header, Footer } from "@/components/shell";
import { getSiteConfig } from "@/lib/site-config";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });
export const metadata: Metadata = { title: { default: "OANRO | Find your next", template: "%s | OANRO" }, description: "Seasonal products and practical technology services. Discover OANRO's first chapter.", icons: { icon: "/logo.svg" } };
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: { children: ReactNode }) {
  const config = getSiteConfig();
  return <html lang="en" className={`${sans.variable} ${mono.variable}`}><body><Experience><a className="skip-link" href="#main-content">Skip to content</a><div id="top" />{config.intro && <Intro />}<Header config={config} />{children}<Footer config={config} /></Experience></body></html>;
}
