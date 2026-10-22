import type { Metadata } from "next";
import "./company-profile.css";
import { CompanyProfileView } from "@/components/company-profile-view";
import { JsonLd } from "@/components/json-ld";
import { getCompanyProfile } from "@/lib/company-profile";
import { getSiteContent } from "@/lib/site-content";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";

const copy = {
  en: { title: "Company Profile | Software, AI, Cloud & IT Services", description: "OANRO company profile: software and embedded AI, managed services, cloud architecture and DevOps, and business support for clients worldwide." },
  bn: { title: "কোম্পানি প্রোফাইল | সফটওয়্যার, এআই, ক্লাউড ও আইটি সেবা", description: "OANRO কোম্পানি প্রোফাইল: সফটওয়্যার ও এমবেডেড এআই, ম্যানেজড সার্ভিস, ক্লাউড আর্কিটেকচার ও ডেভঅপস এবং বিশ্বজুড়ে ক্লায়েন্টদের জন্য বিজনেস সাপোর্ট।" },
};
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale(); const c = copy[locale];
  return { title: c.title, description: c.description, alternates: alternatesFor("/company-profile", locale),
    openGraph: { type: "website", title: `OANRO ${c.title}`, description: c.description, url: absoluteUrl(locale === "bn" ? "/bn/company-profile" : "/company-profile"), images: [DEFAULT_OG_IMAGE] } };
}

export default async function CompanyProfilePage() {
  const { locale } = await requestLocale();
  const [profile, content] = await Promise.all([getCompanyProfile(), getSiteContent()]);
  const email = content.contact.email || "support@oanro.com";
  const services = profile.sections.find(s => s.id === "services")?.groups[0]?.items.map(i => i.title.en).filter(Boolean) ?? [];
  return <main id="main-content" className="container cp-page">
    <JsonLd data={{ "@context": "https://schema.org", "@type": "AboutPage", name: "OANRO Company Profile", url: absoluteUrl("/company-profile"), inLanguage: locale,
      about: { "@type": "Organization", name: "OANRO", url: absoluteUrl("/"), email, slogan: "A brand built for what's next.",
        hasOfferCatalog: { "@type": "OfferCatalog", name: "OANRO services", itemListElement: services.map(name => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } })) } } }} />
    <JsonLd data={{ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Company profile", item: absoluteUrl("/company-profile") }] }} />
    <CompanyProfileView profile={profile} locale={locale} email={email} />
  </main>;
}
