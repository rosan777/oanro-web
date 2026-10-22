import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "@/components/locale-link";
import { JsonLd } from "@/components/json-ld";
import { getSiteContent } from "@/lib/site-content";
import { requestLocale } from "@/lib/request-locale";
import { localePath } from "@/lib/locale-path";
import { absoluteUrl } from "@/lib/seo";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const g = (await getSiteContent()).guides.find(x => x.slug === slug); if (!g) return { title: "Not available", robots: { index: false } };
  const { locale } = await requestLocale();
  return { title: g.title[locale], description: g.summary[locale], openGraph: { type: "article", title: g.title[locale], description: g.summary[locale] } };
}
export default async function GuidePage({ params }: Props) {
  const { slug } = await params; const g = (await getSiteContent()).guides.find(x => x.slug === slug); if (!g) notFound();
  const { locale } = await requestLocale(); const bn = locale === "bn";
  const article = { "@context": "https://schema.org", "@type": "Article", headline: g.title[locale], description: g.summary[locale], dateModified: g.updated, inLanguage: locale,
    author: { "@type": "Organization", name: "OANRO" }, publisher: { "@type": "Organization", name: "OANRO" }, mainEntityOfPage: absoluteUrl(localePath(`/guides/${g.slug}`, locale)) };
  return <main id="main-content" className="container legal-page guide-page">
    <JsonLd data={article} />
    <nav className="category-breadcrumb" aria-label={bn ? "আপনি এখানে আছেন" : "Breadcrumb"}><Link href="/guides">{bn ? "গাইড" : "Guides"}</Link></nav>
    <h1>{g.title[locale]}</h1><p className="legal-intro">{g.summary[locale]}</p>
    {g.sections.map(s => <section key={s.heading.en}><h2>{s.heading[locale]}</h2><p>{s.body[locale]}</p></section>)}
    <p className="legal-updated">{bn ? "হালনাগাদ" : "Updated"}: {new Date(g.updated).toLocaleDateString(bn ? "bn-BD" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
    <div className="contact-actions"><Link href="/guides" className="button light-button">{bn ? "আরও গাইড" : "More guides"}</Link><Link href="/#products" className="button brand-button">{bn ? "স্টোর দেখুন" : "Browse the store"}</Link></div>
  </main>;
}
