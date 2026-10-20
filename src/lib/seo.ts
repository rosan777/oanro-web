import { siteUrl } from "@/lib/site-url";

// Shared SEO copy and structured data. Public values only: no keys or secrets belong here.
export const SITE_NAME = "OANRO";
export const DEFAULT_TITLE = "OANRO | Winter Clothing, Tech Solutions & IT Services";
export const DEFAULT_DESCRIPTION = "A Bangladesh-based brand working for the world: winter clothing, caps and tech items, plus web development, mobile apps and business software for clients worldwide.";
export const DEFAULT_TITLE_BN = "OANRO | শীতের পোশাক, টেক সলিউশন ও আইটি সেবা";
export const DEFAULT_DESCRIPTION_BN = "বাংলাদেশভিত্তিক, কাজ করি বিশ্বের জন্য: শীতের পোশাক, ক্যাপ ও টেক পণ্য, আর বিশ্বজুড়ে ক্লায়েন্টদের জন্য ওয়েবসাইট, মোবাইল অ্যাপ ও বিজনেস সফটওয়্যার।";
export const DEFAULT_OG_IMAGE = { url: "/images/campaign.png", width: 1850, height: 850, alt: "OANRO winter clothing collection" };

export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function organizationJsonLd(contact: { contactEmail: string; messengerUrl: string }) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org", "@type": "Organization", "@id": `${base}/#organization`,
    name: SITE_NAME, url: base, logo: absoluteUrl("/logo.svg"), description: DEFAULT_DESCRIPTION,
    address: { "@type": "PostalAddress", addressCountry: "BD" },
    areaServed: "Worldwide",
    ...(contact.contactEmail ? { email: contact.contactEmail } : {}),
    ...(contact.messengerUrl ? { sameAs: [contact.messengerUrl] } : {}),
  };
}

export function websiteJsonLd() {
  const base = siteUrl();
  return { "@context": "https://schema.org", "@type": "WebSite", "@id": `${base}/#website`, name: SITE_NAME, url: base, inLanguage: ["en", "bn"], publisher: { "@id": `${base}/#organization` } };
}

/** Product price/stock data for Google. Only emitted when OANRO_STORE_LIVE=true, so sample prices are never published as real offers. */
export const storeLive = () => process.env.OANRO_STORE_LIVE === "true";
