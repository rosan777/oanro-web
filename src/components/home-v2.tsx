"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useMotion } from "./experience";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/locale-link";
import { formatPrice } from "@/lib/catalog";
import type { CheckoutRules } from "@/lib/order-store";
import { bnDigits, dayText } from "@/lib/text-format";
import { useProductLines, useProducts, useServices } from "./products-context";
import { PriceTag, ProductPhoto } from "./shell";
import { useLocale } from "./locale";

/** Category tabs + product cards. Uses the live catalog; the "Web & apps" tab lists real services. */
export function ShopTabs({ showServices, chips }: { showServices: boolean; chips?: ReactNode }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const lines = useProductLines().filter(l => l.count > 0);
  const products = useProducts(); const services = useServices();
  const tabs = [...lines.map(l => ({ id: l.collection.id, label: bn && l.collection.bn ? l.collection.bn.name : l.collection.name, line: l })), ...(showServices && services.length ? [{ id: "studio", label: t("Web & apps", "ওয়েব ও অ্যাপ"), line: null }] : [])];
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  if (!tabs.length) return null;
  const current = tabs.find(x => x.id === active) ?? tabs[0];
  const c = current.line?.collection;
  const items = c ? products.filter(p => (p.collectionId ?? "seasonal") === c.id).slice(0, 8) : [];
  return <section className="v2-shop" id="products" aria-labelledby="shop-title">
    <div className="container">
      <div className="v2-tabs" role="tablist" aria-label={t("Shop by category", "ক্যাটাগরি অনুযায়ী দেখুন")}>
        {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={tab.id === current.id} className={tab.id === current.id ? "is-active" : ""} onClick={() => setActive(tab.id)}>{tab.label}</button>)}
      </div>
      {chips && <div className="v2-chips-row">{chips}</div>}
      <div className="v2-shop-head">
        <h2 id="shop-title" className="v2-h2">{current.label}</h2>
        {c ? <Link href={`/${c.slug}`} className="v2-link">{t(`See all ${current.label.toLowerCase()}`, `সব ${current.label} দেখুন`)} →</Link> : <Link href="/#studio" className="v2-link">{t("About OANRO Studio", "OANRO স্টুডিও সম্পর্কে")} →</Link>}
      </div>
      {c && <p className="v2-shop-intro">{bn && c.bn ? c.bn.description : c.description}</p>}
      <div className="v2-grid" key={current.id}>
        {c ? items.map(p => {
          const name = bn && p.bn ? p.bn.name : p.name; const out = p.inStock === false;
          return <Link key={p.slug} href={`/products/${p.slug}`} className="v2-card">
            <div className="v2-card-photo"><ProductPhoto position={p.position} image={p.image} label={name} />{out && <span className="v2-badge v2-badge-dark">{t("Out of stock", "স্টক শেষ")}</span>}<span className="v2-card-cta">{out ? t("View details", "বিস্তারিত দেখুন") : p.sizes.length > 1 ? t("Choose size", "সাইজ বেছে নিন") : t("View & add to bag", "দেখুন ও ব্যাগে নিন")}</span></div>
            <div className="v2-card-body"><strong>{name}</strong>
              {p.colors && p.colors.length > 0 && <span className="v2-swatches" aria-label={t(`${p.colors.length} colours`, `${p.colors.length}টি রং`)}>{p.colors.slice(0, 5).map(col => <span key={col.id} style={{ background: col.hex }} title={bn ? col.bn : col.name} />)}</span>}
              <div className="v2-card-foot"><PriceTag price={p.price} compareAt={p.compareAt} locale={locale} /><small className={out ? "is-out" : "is-in"}>{out ? t("Out of stock", "স্টক শেষ") : t("In stock", "স্টকে আছে")}</small></div>
            </div>
          </Link>;
        }) : services.slice(0, 8).map(s => <Link key={s.slug} href={`/services/${s.slug}`} className="v2-card v2-card-service">
          <div className="v2-card-photo v2-service-photo"><span>{s.word}</span><span className="v2-card-cta">{t("Get a free quote", "ফ্রি কোট নিন")}</span></div>
          <div className="v2-card-body"><strong>{bn && s.bn ? s.bn.title : s.title}</strong><p>{bn && s.bn ? s.bn.text : s.text}</p></div>
        </Link>)}
      </div>
    </div>
  </section>;
}

/** Delivery time checker. Days and charge come from the admin delivery rules. */
export function DeliveryChecker({ rules }: { rules: CheckoutRules }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const n = (s: string) => bn ? bnDigits(s) : s;
  const areas = [{ id: "dhaka", label: bn ? "ঢাকার ভেতরে" : "Inside Dhaka", days: rules.dhakaDays }, { id: "outside", label: bn ? "ঢাকার বাইরে" : "Outside Dhaka", days: rules.outsideDays }];
  const [area, setArea] = useState("dhaka");
  const a = areas.find(x => x.id === area) ?? areas[0];
  const cod = rules.codLimit > 0;
  return <div className="v2-panel">
    <h2 className="v2-h3">{bn ? "কবে পৌঁছাবে?" : "When will it arrive?"}</h2>
    <div className="v2-pills" role="group" aria-label={bn ? "আপনার এলাকা" : "Your area"}>{areas.map(x => <button key={x.id} type="button" aria-pressed={x.id === area} onClick={() => setArea(x.id)}>{x.label}</button>)}</div>
    <p className="v2-result" key={area}>{bn ? <>পৌঁছাবে <strong>{n(dayText(a.days))} দিনে</strong> · ডেলিভারি চার্জ {formatPrice(rules.deliveryCharge, locale)}{cod ? " · ক্যাশ অন ডেলিভারি আছে" : ""}</> : <>Arrives in <strong>{dayText(a.days)} days</strong> · Delivery {formatPrice(rules.deliveryCharge, locale)}{cod ? " · Cash on delivery available" : ""}</>}</p>
  </div>;
}

const VALUES = [
  { ch: "O", en: ["Originality", "We choose and build things our own way — no copy-paste stores, no template websites.", "products and sites that feel different."], bn: ["নিজস্বতা", "আমরা নিজেদের মতো করে বেছে নিই ও তৈরি করি — কপি-পেস্ট দোকান বা টেমপ্লেট ওয়েবসাইট নয়।", "আলাদা অনুভূতির পণ্য ও সাইট।"] },
  { ch: "A", en: ["Ambition", "A small team with big standards. We aim to compete with the best, not the nearest.", "quality you would expect from a much bigger brand."], bn: ["উচ্চাকাঙ্ক্ষা", "ছোট দল, বড় মান। আমরা সবচেয়ে ভালোদের সাথে প্রতিযোগিতা করতে চাই।", "অনেক বড় ব্র্যান্ডের মতো মান।"] },
  { ch: "N", en: ["Next-generation", "Modern technology in everything — from our own store to the apps we build for clients.", "fast, secure, up-to-date work."], bn: ["ভবিষ্যৎমুখী উদ্ভাবন", "সবকিছুতে আধুনিক প্রযুক্তি — আমাদের দোকান থেকে ক্লায়েন্টের অ্যাপ পর্যন্ত।", "দ্রুত, নিরাপদ, আধুনিক কাজ।"] },
  { ch: "R", en: ["Reliability", "Clear prices, honest descriptions and a real reply every time.", "no surprises after you pay."], bn: ["নির্ভরযোগ্যতা", "স্পষ্ট দাম, সৎ বর্ণনা এবং প্রতিবার সত্যিকারের উত্তর।", "টাকা দেওয়ার পর কোনো চমক নেই।"] },
  { ch: "O", en: ["Opportunity", "Bangladesh-born, working for the whole world. We help people and businesses grow.", "a partner that grows with you."], bn: ["নতুন সম্ভাবনা", "বাংলাদেশে জন্ম, কাজ সারা বিশ্বের জন্য। আমরা মানুষ ও ব্যবসাকে বড় হতে সাহায্য করি।", "আপনার সাথে বেড়ে ওঠা সঙ্গী।"] },
];
/** "Click a letter" O-A-N-R-O values section. */
export function ValueLetters() {
  const { locale } = useLocale(); const bn = locale === "bn";
  const [i, setI] = useState(0);
  const v = VALUES[i];
  return <section className="container v2-values-wrap" aria-labelledby="values-title"><div className="v2-values">
    <p className="v2-eyebrow v2-center" id="values-title">{bn ? "পাঁচটি অক্ষর, পাঁচটি প্রতিশ্রুতি — একটিতে চাপুন" : "Five letters, five promises — tap one"}</p>
    <div className="v2-letters" role="tablist" aria-label="OANRO">{VALUES.map((x, k) => <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={bn ? x.bn[0] : x.en[0]} className={k === i ? "is-active" : ""} onClick={() => setI(k)}>{x.ch}</button>)}</div>
    <div className="v2-value-panel" key={i} role="tabpanel">
      <div><div className="v2-value-word">{v.en[0]}</div><div className="v2-value-bn" lang="bn">{v.bn[0]}</div></div>
      <div><p>{bn ? v.bn[1] : v.en[1]}</p><p className="v2-value-you">{bn ? "আপনার জন্য এর মানে: " : "What it means for you: "}{bn ? v.bn[2] : v.en[2]}</p></div>
    </div>
  </div></section>;
}

/** Studio section (J4): services list + live-build terminal animation. */
export function StudioTerminal() {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const services = useServices();
  const lines = bn
    ? ["সপ্তাহ ১ · পরিকল্পনা ও ডিজাইন অনুমোদিত", "সপ্তাহ ২ · পণ্য, কার্ট ও চেকআউট", "সপ্তাহ ৩ · বিকাশ ও ক্যাশ অন ডেলিভারি যুক্ত", "সপ্তাহ ৩ · SEO, সাইটম্যাপ ও গুগল প্রস্তুত", "সপ্তাহ ৪ · অ্যাডমিন প্যানেল ও স্টাফ রোল"]
    : ["Week 1 · plan & design approved", "Week 2 · products, cart & checkout", "Week 3 · bKash + cash on delivery connected", "Week 3 · SEO, sitemap & Google ready", "Week 4 · admin panel & staff roles"];
  return <section id="studio" className="v2-studio" aria-labelledby="studio-title"><div className="container v2-studio-grid">
    <div>
      <p className="v2-eyebrow">{t("OANRO Studio · Website & app development", "OANRO স্টুডিও · ওয়েবসাইট ও অ্যাপ ডেভেলপমেন্ট")}</p>
      <h2 id="studio-title" className="v2-h2 v2-on-dark">{bn ? <>আমরা বানাই।<br />আপনি ব্যবসা চালান।</> : <>We build it.<br />You run your business.</>}</h2>
      <p className="v2-lede">{t("Website & app development for businesses in Bangladesh and abroad — fixed quote, live preview, launched on your own domain.", "বাংলাদেশ ও বিদেশের ব্যবসার জন্য ওয়েবসাইট ও অ্যাপ ডেভেলপমেন্ট — নির্দিষ্ট দাম, লাইভ প্রিভিউ, আপনার নিজের ডোমেইনে লঞ্চ।")}</p>
      <ul className="v2-service-rows">{services.map(s => <li key={s.slug}><Link href={`/services/${s.slug}`}>{bn && s.bn ? s.bn.title : s.title}<span>{t("Get a quote", "কোট নিন")} →</span></Link></li>)}</ul>
      <div className="v2-actions"><Link href="/contact" className="v2-btn v2-btn-light">{t("Get a free quote", "ফ্রি কোট নিন")} <ArrowUpRight size={17} /></Link></div>
    </div>
    <div>
      <div className="v2-terminal" aria-hidden="true">
        <div className="v2-terminal-bar"><i /><i /><i /><span>oanro-studio — your project</span></div>
        <div className="v2-terminal-body">
          <div className="t-line" style={{ animationDelay: "0s" }}><b>$</b> oanro new your-store</div>
          {lines.map((l, k) => <div key={l} className="t-line t-dim" style={{ animationDelay: `${0.8 * (k + 1)}s` }}>✓ {l}</div>)}
          <div className="t-line t-go" style={{ animationDelay: "4.8s" }}>→ {t("Live at yourstore.com", "লাইভ: yourstore.com")} <span className="t-caret">▍</span></div>
        </div>
      </div>
      <div className="v2-chips"><span>Next.js</span><span>PostgreSQL</span><span>2FA</span><span>{t("Fast on phones", "ফোনে দ্রুত")}</span><span>{t("Same stack as OANRO.com", "OANRO.com-এর একই প্রযুক্তি")}</span></div>
    </div>
  </div></section>;
}

const MEANING = {
  en: ["Originality", "Ambition", "Next-generation", "Reliability", "Opportunity"],
  bn: ["নিজস্বতা", "উচ্চাকাঙ্ক্ষা", "ভবিষ্যৎমুখী উদ্ভাবন", "নির্ভরযোগ্যতা", "নতুন সম্ভাবনা"],
};
/** Hero brand block: holographic logo card + H1 (search keywords in the small line) + the original O-A-N-R-O letter cycle. */
export function HeroBrand() {
  const { locale } = useLocale(); const bn = locale === "bn";
  const { allowed } = useMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % 5), 2400);
    return () => window.clearInterval(timer);
  }, [allowed]);
  const words = bn ? MEANING.bn : MEANING.en;
  return <>
    <span className="holographic-mark v2-holo v2-fade" aria-hidden="true"><Image src="/logo.svg" alt="" width={56} height={56} priority /></span>
    <h1 id="hero-title" className="v2-hero-h1">
      <span className="v2-eyebrow v2-fade">{bn ? "যা পরবেন · যা গড়বেন · যেখানেই থাকুন" : "What you wear · What you build · Wherever you are"}</span>
      <span className="v2-h1 v2-track">{bn ? "আগামীর জন্য তৈরি" : "Built for what's next"}</span>
    </h1>
    <p className="v2-letters-line v2-fade" aria-hidden="true">
      <span className="v2-mini-letters">{"OANRO".split("").map((ch, i) => <span key={i} className={i === active ? "is-active" : undefined}>{ch}</span>)}</span>
      <span>{bn ? "যার ভিত্তি" : "Built on"} <span key={`${locale}-${active}`} className="v2-word">{words[active]}</span></span>
    </p>
    <p className="sr-only">{bn ? `OANRO মানে: ${MEANING.bn.join(", ")}।` : `OANRO stands for ${MEANING.en.slice(0, 4).join(", ")} and ${MEANING.en[4]}.`}</p>
  </>;
}
