import Image from "next/image";
import type { CSSProperties } from "react";
import Link from "@/components/locale-link";
import { ArrowUpRight, Mail } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { FeatureStory, ServiceConveyor, StandardPanel, ValueFan } from "@/components/home-experience";
import { Reveal } from "@/components/experience";
import { DoubleConveyor } from "@/components/double-conveyor";
import { Localized } from "@/components/locale";
import { CollectionConveyor } from "@/components/collection-conveyor";
import { getActiveCampaigns, getStoreCollections } from "@/lib/store-products";
import { CampaignShowcase } from "@/components/campaign-showcase";
import { MessageReveal } from "@/components/message-reveal";
import { getSectionState } from "@/lib/website-sections";
import { CategoryTiles } from "@/components/category-tiles";
import { HomeFaq, HowWeWork, TrustStrip } from "@/components/home-trust";
import { requestLocale } from "@/lib/request-locale";
import { publicRules } from "@/lib/public-rules";

export default async function Home() {
  const env = getSiteConfig();
  const config = { ...env, services: env.services && (await getSectionState()).services };
  const [collections, campaigns] = config.products ? await Promise.all([getStoreCollections(), getActiveCampaigns()]) : [[], []];
  const [{ locale }, rules] = await Promise.all([requestLocale(), publicRules()]);
  return <main id="main-content">
    <section className="opening"><div className="container opening-layout"><Reveal className="opening-brand"><div className="holographic-mark"><Image src="/logo.svg" alt="" width={88} height={88} /></div><div><p className="eyebrow"><Localized en="Welcome to the first chapter" bn="শুরুর প্রথম অধ্যায়ে স্বাগতম" /></p><h1 className="hero-title"><span className="hero-brand">OANRO</span><span className="hero-tagline"><Localized en="A brand built for what's next." bn="ভবিষ্যতের জন্য গড়া একটি ব্র্যান্ড।" /></span></h1><p className="hero-lede"><Localized en="Winter clothing, tech items and IT services in Bangladesh: a versatile, forward-looking business spanning technology services and carefully selected products." bn="বাংলাদেশে শীতের পোশাক, টেক পণ্য ও আইটি সেবা: প্রযুক্তি সেবা ও যত্নে বেছে নেওয়া পণ্য নিয়ে একটি বহুমুখী, ভবিষ্যৎমুখী প্রতিষ্ঠান।" /></p><ul className="hero-acronym" aria-label="What OANRO stands for"><li style={{ "--i": 0 } as CSSProperties}><b>O</b><Localized en="Originality" bn="নিজস্বতা" /></li><li style={{ "--i": 1 } as CSSProperties}><b>A</b><Localized en="Ambition" bn="উচ্চাকাঙ্ক্ষা" /></li><li style={{ "--i": 2 } as CSSProperties}><b>N</b><Localized en="Next-generation" bn="ভবিষ্যৎমুখী উদ্ভাবন" /></li><li style={{ "--i": 3 } as CSSProperties}><b>R</b><Localized en="Reliability" bn="নির্ভরযোগ্যতা" /></li><li style={{ "--i": 4 } as CSSProperties}><b>O</b><Localized en="Opportunity" bn="নতুন সম্ভাবনা" /></li></ul><div className="hero-actions">{config.products && <Link className="button brand-button" href="#products"><Localized en="Shop the collection" bn="কালেকশন দেখুন" /><ArrowUpRight size={17} /></Link>}{config.services && <Link className="button light-button" href="#services"><Localized en="Get a website" bn="ওয়েবসাইট বানাতে চাই" /><ArrowUpRight size={17} /></Link>}</div><ul className="hero-ticks"><li><Localized en="bKash & Nagad" bn="বিকাশ ও নগদ" /></li>{rules.codLimit > 0 && <li><Localized en="Cash on delivery" bn="ক্যাশ অন ডেলিভারি" /></li>}<li><Localized en="Delivery across Bangladesh" bn="সারা বাংলাদেশে ডেলিভারি" /></li></ul></div></Reveal><StandardPanel /></div></section>
    <ValueFan showProducts={config.products} />
    {config.products && <CategoryTiles />}
    <nav className="discovery-nav container" aria-label="Explore OANRO">{config.products && <Link href="#products"><Localized en="Explore products" bn="পণ্য দেখুন" /><ArrowUpRight size={17} /></Link>}{config.services && <Link href="#services"><Localized en="Explore services" bn="সেবা দেখুন" /><ArrowUpRight size={17} /></Link>}<Link href="#about"><Localized en="Discover OANRO" bn="OANRO জানুন" /><ArrowUpRight size={17} /></Link></nav>
    {config.features && <FeatureStory />}
    {campaigns.map(c => <CampaignShowcase key={c.id} campaign={c} />)}
    {collections.map(collection => <CollectionConveyor key={collection.id} collection={collection} />)}
    {config.products && <TrustStrip rules={rules} locale={locale} />}
    {config.services && <ServiceConveyor />}
    {config.services && <HowWeWork locale={locale} />}
    <DoubleConveyor showProducts={config.products} showServices={config.services} />
    {config.partners && <section id="partners" className="partners-section section-space"><Reveal className="container partner-layout"><div><p className="eyebrow"><Localized en="Partner Picks" bn="পার্টনার পছন্দ" /></p><h2><Localized en={<>Good finds.<br />Wider possibilities.</>} bn={<>ভালো পছন্দ।<br />বিস্তৃত সম্ভাবনা।</>} /></h2></div><div><span className="outline-label"><Localized en="A separate selection" bn="আলাদা একটি নির্বাচন" /></span><p><Localized en="A dedicated space for selected partner offerings, brought together through OANRO." bn="OANRO-র মাধ্যমে বেছে নেওয়া পার্টনার অফারগুলোর জন্য একটি আলাদা জায়গা।" /></p><small><Localized en="Our first partner selection is taking shape." bn="আমাদের প্রথম পার্টনার নির্বাচন তৈরি হচ্ছে।" /></small></div></Reveal></section>}
    {config.products && <HomeFaq rules={rules} locale={locale} services={config.services} />}
    <section id="about" className="about-section section-space"><div className="container"><Reveal className="section-heading"><div><p className="eyebrow"><Localized en="Our approach" bn="আমাদের পদ্ধতি" /></p><h2><Localized en="Thoughtful from the start." bn="শুরু থেকেই চিন্তাশীল।" /></h2></div><p><Localized en={<>Useful choices. Clear information.<br />People at the center.</>} bn={<>কাজের পছন্দ। পরিষ্কার তথ্য।<br />মানুষ সবার কেন্দ্রে।</>} /></p></Reveal><div className="about-grid"><article><h3><Localized en="Clarity first." bn="আগে স্বচ্ছতা।" /></h3><p><Localized en="Understand what you are choosing and what happens next." bn="আপনি কী বেছে নিচ্ছেন এবং এরপর কী হবে, তা বুঝুন।" /></p></article><article><h3><Localized en="Useful by design." bn="নকশাতেই কার্যকর।" /></h3><p><Localized en="Products and technology with a practical place in everyday life." bn="দৈনন্দিন জীবনে বাস্তব কাজে লাগে এমন পণ্য ও প্রযুক্তি।" /></p></article><article><h3><Localized en="Room to grow." bn="বড় হওয়ার সুযোগ।" /></h3><p><Localized en="Starting in Bangladesh, with a wider world of possibilities ahead." bn="বাংলাদেশ থেকে শুরু, সামনে আরও বড় সম্ভাবনার জগৎ।" /></p></article></div>
      <div id="contact" className="contact-section"><div><p className="eyebrow"><Localized en="Contact OANRO" bn="OANRO-তে যোগাযোগ" /></p><h2><Localized en={<>Let&apos;s start<br />a conversation.</>} bn={<>চলুন শুরু করি<br />একটি কথোপকথন।</>} /></h2></div><div><p><Localized en="Have a question about a product, a service, or a partnership?" bn="পণ্য, সেবা বা পার্টনারশিপ নিয়ে কোনো প্রশ্ন আছে?" /></p><div className="contact-actions"><MessageReveal />{config.contactEmail && <a className="button light-button" href={`mailto:${config.contactEmail}`}><Mail size={17} />{config.contactEmail}</a>}</div>{!config.whatsappUrl && <p className="contact-pending"><Localized en="WhatsApp contact is being prepared." bn="WhatsApp যোগাযোগ প্রস্তুত করা হচ্ছে।" /></p>}<small><Localized en="Design preview: sample products and images. Ordering is not yet open." bn="ডিজাইন প্রিভিউ: এখানে নমুনা পণ্য ও ছবি আছে। অর্ডার এখনো চালু হয়নি।" /></small></div></div>
    </div></section>
  </main>;
}
