import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteConfig } from "@/lib/site-config";
import { getSectionState } from "@/lib/website-sections";
import { getStoreServices } from "@/lib/store-products";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { localePath } from "@/lib/locale-path";
import { serviceGuide } from "@/lib/seo-copy";
import { absoluteUrl } from "@/lib/seo";
import { siteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/json-ld";
import { getSiteContent } from "@/lib/site-content";
import { FormPopup } from "@/components/form-popup";
import { InquiryForm } from "@/components/inquiry-form";
import Link from "@/components/locale-link";

// One page per published service (e.g. /services/web), so each service can rank on its own keywords.
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  if (!getSiteConfig().services || !(await getSectionState()).services) return null;
  return (await getStoreServices()).find(s => s.slug === slug) ?? null;
}

function copyFor(service: NonNullable<Awaited<ReturnType<typeof load>>>, bn: boolean) {
  return bn && service.bn ? service.bn : { title: service.title, text: service.text, detail: service.detail };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await load((await params).slug);
  if (!service) return { title: "Not available", robots: { index: false } };
  const { locale } = await requestLocale(); const bn = locale === "bn";
  const copy = copyFor(service, bn);
  const title = bn ? `${copy.title} – বিশ্বজুড়ে সেবা` : `${copy.title} Services for Clients Worldwide`;
  const description = ([copy.text, copy.detail].filter(Boolean).join(" ") || title).slice(0, 158);
  const path = `/services/${service.slug}`;
  return { title, description, alternates: alternatesFor(path, locale),
    openGraph: { type: "website", siteName: "OANRO", url: localePath(path, locale), title, description, locale: bn ? "bn_BD" : "en_BD", images: [service.image || "/images/campaign.png"] } };
}

export default async function ServicePage({ params }: Props) {
  const service = await load((await params).slug); if (!service) notFound();
  const { locale } = await requestLocale(); const bn = locale === "bn";
  const content = await getSiteContent(); const showPkgs = content.features.studioPackages && content.packages.length > 0, showFaq = content.features.serviceFaq && content.faq.length > 0;
  const copy = copyFor(service, bn);
  const guide = serviceGuide(copy.title, locale);
  const pageUrl = absoluteUrl(localePath(`/services/${service.slug}`, locale));
  const schema = { "@context": "https://schema.org", "@type": "Service", name: copy.title, description: copy.detail || copy.text, url: pageUrl, serviceType: service.category || copy.title,
    provider: { "@id": `${siteUrl()}/#organization` }, areaServed: "Worldwide" };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: bn ? "হোম" : "Home", item: absoluteUrl(localePath("/", locale)) },
    { "@type": "ListItem", position: 2, name: copy.title, item: pageUrl } ] };
  return <main id="main-content" className="container legal-page service-page">
    <JsonLd data={schema} /><JsonLd data={breadcrumb} />
    <nav className="category-breadcrumb" aria-label={bn ? "আপনি এখানে আছেন" : "Breadcrumb"}><Link href="/">{bn ? "হোম" : "Home"}</Link><span aria-hidden="true"> / </span><Link href="/#services">{bn ? "সেবা" : "Services"}</Link><span aria-hidden="true"> / </span><span aria-current="page">{copy.title}</span></nav>
    <p className="eyebrow">{bn ? "প্রযুক্তি সেবা" : "Technology services"}</p>
    <h1>{copy.title}</h1>
    {copy.text && <p className="legal-intro">{copy.text}</p>}
    {copy.detail && <p>{copy.detail}</p>}
    <section><h2>{guide.heading}</h2>{guide.paragraphs.map(text => <p key={text.slice(0, 24)}>{text}</p>)}</section>
    {showPkgs && <section className="studio-packages" aria-labelledby="pkg-title"><h2 id="pkg-title">{bn ? "যেভাবে আমরা কাজ নিই" : "Ways to work with us"}</h2>
      <div className="pkg-grid">{content.packages.map(p => <article key={p.name.en} className="pkg-card"><h3>{p.name[locale]}</h3><p>{p.for[locale]}</p><ul>{p.includes.map(i => <li key={i.en}>{i[locale]}</li>)}</ul></article>)}</div>
      <p className="small-note">{bn ? "প্রতিটি প্রজেক্টের দাম ফ্রি কলের পর লিখিতভাবে নির্দিষ্ট করে দেওয়া হয়।" : "Every project gets a fixed written price after a free call."}</p>
    </section>}
    {showFaq && <><section className="service-faq" aria-labelledby="faq-title"><h2 id="faq-title">{bn ? "সাধারণ প্রশ্ন" : "Common questions"}</h2>
      {content.faq.map(f => <details key={f.q.en}><summary>{f.q[locale]}</summary><p>{f.a[locale]}</p></details>)}
    </section>
    <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faq.map(f => ({ "@type": "Question", name: f.q[locale], acceptedAnswer: { "@type": "Answer", text: f.a[locale] } })) }} /></>}
    <div className="contact-actions">
      <FormPopup label={bn ? "ফ্রি কল বুক করুন" : "Book a free call"} dialogLabel={bn ? "ফ্রি কল বুক করুন" : "Book a free call"}><InquiryForm kind="general" services={[{ slug: service.slug, title: copy.title }]} /></FormPopup>
      <Link href="/contact" className="button light-button">{bn ? "আপনার প্রজেক্ট নিয়ে কথা বলুন" : "Talk about your project"}</Link>
    </div>
  </main>;
}
