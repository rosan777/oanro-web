import type { Metadata } from "next";
import Image from "next/image";
import Link from "@/components/locale-link";
import { requestLocale } from "@/lib/request-locale";
import { getSiteContent } from "@/lib/site-content";
import { pick, type TextKey } from "@/lib/site-content-data";
export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  return locale === "bn" ? { title: "OANRO সম্পর্কে", description: "OANRO কারা, কী করে আর কীভাবে কাজ করে — যত্নে বাছাই করা পণ্য আর নির্ভরযোগ্য প্রযুক্তি।" }
    : { title: "About OANRO", description: "Who OANRO is, what we do and how we work — thoughtfully chosen products and dependable technology." };
}

export default async function AboutPage() {
  const { locale } = await requestLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const content = await getSiteContent(); const tx = (k: TextKey) => pick(content, k, locale);
  const values = bn
    ? [["নিজস্বতা", "আমরা নিজেদের মতো করে বাছাই করি আর বানাই — কপি-পেস্ট নয়।"], ["উচ্চাকাঙ্ক্ষা", "ছোট থেকে শুরু, কিন্তু মান সবসময় বড়দের মতো।"], ["ভবিষ্যৎমুখী", "আধুনিক প্রযুক্তি, যাতে আপনার জিনিস আগামীতেও কাজে আসে।"], ["নির্ভরযোগ্যতা", "যা বলি তা-ই করি: স্পষ্ট দাম, সময়মতো ডেলিভারি।"], ["সম্ভাবনা", "পণ্য আর প্রযুক্তি দিয়ে মানুষ ও ব্যবসার জন্য নতুন সুযোগ।"]]
    : [["Originality", "We choose and build things our own way — no copy-paste stores, no template websites."], ["Ambition", "Starting small, but always held to a big-brand standard."], ["Next-generation", "Modern technology, so what you get still works tomorrow."], ["Reliability", "We do what we say: clear prices, delivery on time."], ["Opportunity", "Products and technology that open new doors for people and businesses."]];
  return <main id="main-content" className="container about-page">
    <section className="about-hero"><Image src="/logo.svg" alt="" width={64} height={64} />
      <p className="eyebrow">{t("About OANRO", "OANRO সম্পর্কে")}</p>
      <h1>{tx("aboutPage.headline")}</h1>
      <p className="about-lede">{tx("aboutPage.lede")}</p>
    </section>
    <section className="about-split">
      <div><h2>{t("The store", "স্টোর")}</h2><p>{tx("aboutPage.store")}</p><Link href="/#products" className="text-link">{t("Browse the store →", "স্টোর দেখুন →")}</Link></div>
      <div><h2>{t("The studio", "স্টুডিও")}</h2><p>{tx("aboutPage.studio")}</p><Link href="/#studio" className="text-link">{t("Meet OANRO Studio →", "OANRO স্টুডিও দেখুন →")}</Link></div>
    </section>
    <section className="about-values"><h2>{t("Five letters, five promises", "পাঁচটি অক্ষর, পাঁচটি প্রতিশ্রুতি")}</h2>
      <ol>{values.map(([title, text], i) => <li key={title}><span>{"OANRO"[i]}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol>
    </section>
    <section className="about-facts"><h2>{t("The details", "বিস্তারিত")}</h2>
      <dl><div><dt>{t("Licensed business", "লাইসেন্সপ্রাপ্ত ব্যবসা")}</dt><dd>{t("Trade License No. 002039", "ট্রেড লাইসেন্স নং ০০২০৩৯")}</dd></div>
        <div><dt>{t("Languages", "ভাষা")}</dt><dd>{t("English and Bangla", "ইংরেজি ও বাংলা")}</dd></div>
        <div><dt>{t("Talk to us", "কথা বলুন")}</dt><dd><Link href="/contact">{t("Contact page", "যোগাযোগ পেজ")}</Link></dd></div></dl>
    </section>
    <p className="about-sign">Team oanro</p>
  </main>;
}
