import type { Metadata } from "next";
import Link from "@/components/locale-link";
import { getSiteContent } from "@/lib/site-content";
import { pick } from "@/lib/site-content-data";
import { requestLocale } from "@/lib/request-locale";
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn" ? { title: "গাইড", description: "শীতের পোশাকের যত্ন, সঠিক সাইজ বাছাই আর ওয়েবসাইট বানানোর প্রস্তুতি — OANRO-র সহজ গাইড।" }
    : { title: "Guides", description: "Simple guides from OANRO: caring for winter knitwear, choosing the right size online, and preparing for a website project." };
}
export default async function GuidesPage() {
  const { locale } = await requestLocale(); const bn = locale === "bn";
  const content = await getSiteContent(); const guides = content.guides;
  return <main id="main-content" className="container guides-page">
    <p className="eyebrow">{bn ? "গাইড" : "Guides"}</p><h1>{pick(content, "guides.title", locale)}</h1>
    <div className="guide-grid">{guides.map(g => <Link key={g.slug} href={`/guides/${g.slug}`} className="guide-card"><h2>{g.title[locale]}</h2><p>{g.summary[locale]}</p><span>{bn ? "পড়ুন →" : "Read →"}</span></Link>)}</div>
  </main>;
}
