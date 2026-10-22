"use client";

import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Image from "next/image";
import { useMotion } from "./experience";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/locale-link";
import { formatPrice } from "@/lib/catalog";
import type { CheckoutRules } from "@/lib/order-store";
import { chargeFor } from "@/lib/delivery-fee";
import { bnDigits, dayText } from "@/lib/text-format";
import { useProductLines, useProducts, useServices } from "./products-context";
import { PriceTag, ProductPhoto } from "./shell";
import { useLocale } from "./locale";
import { useFeature, useText } from "./site-content-context";

/** Category tabs + product cards. Uses the live catalog; the "Web & apps" tab lists real services. */
/** Product cards lean gently toward the pointer (desktop mouse only; skipped when motion is paused). */
function tilt(e: MouseEvent<HTMLElement>) {
  if (e.currentTarget.closest("[data-motion=paused]") || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -7}deg`);
  e.currentTarget.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 9}deg`);
}
function untilt(e: MouseEvent<HTMLElement>) { e.currentTarget.style.removeProperty("--rx"); e.currentTarget.style.removeProperty("--ry"); }

export function ShopTabs({ showServices, chips }: { showServices: boolean; chips?: ReactNode }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const lines = useProductLines().filter(l => l.count > 0);
  const products = useProducts(); const services = useServices();
  const name = (l: (typeof lines)[number]) => bn && l.collection.bn ? l.collection.bn.name : l.collection.name;
  // Three segments: the seasonal line, every other line together as "OANRO Store", and the tech services.
  const seasonal = lines.filter(l => l.collection.preset === "seasonal");
  const store = lines.filter(l => l.collection.preset !== "seasonal");
  const tabs = [
    ...(seasonal.length ? [{ id: "seasonal", label: t("Seasonal collection", "মৌসুমি কালেকশন"), lines: seasonal }] : []),
    ...(store.length ? [{ id: "store", label: t("OANRO Store", "OANRO স্টোর"), lines: store }] : []),
    ...(showServices && services.length ? [{ id: "tech", label: t("Technological solutions", "টেকনোলজি সলিউশন"), lines: [] as typeof lines }] : []),
  ];
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [sub, setSub] = useState("all");
  // Card photo chosen by hovering/tapping a colour dot (that colour's real photo; main photo if it has none).
  const [swatch, setSwatch] = useState<Record<string, string | null | undefined>>({});
  if (!tabs.length) return null;
  const current = tabs.find(x => x.id === active) ?? tabs[0];
  const isTech = current.id === "tech";
  const subLine = current.lines.find(l => l.collection.id === sub);
  const shown = subLine ? [subLine] : current.lines;
  const ids = new Set(shown.map(l => l.collection.id));
  const items = products.filter(p => ids.has(p.collectionId ?? "seasonal")).slice(0, 8);
  const single = shown.length === 1 ? shown[0] : undefined;
  const pick = (id: string) => { setActive(id); setSub("all"); };
  return <section className="v2-shop" id="products" aria-labelledby="shop-title">
    <div className="container">
      <div className="v2-tabs" role="tablist" aria-label={t("Shop by category", "ক্যাটাগরি অনুযায়ী দেখুন")}>
        {tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={tab.id === current.id} className={tab.id === current.id ? "is-active" : ""} onClick={() => pick(tab.id)}>{tab.label}</button>)}
      </div>
      {/* Promise strip: two identical copies slide left forever for a seamless loop (no pause control by design). */}
      {chips && <div className="v2-marquee"><div className="v2-marquee-track"><div className="v2-chips-row">{chips}</div><div className="v2-chips-row" aria-hidden="true">{chips}</div></div></div>}
      <div className="v2-shop-head">
        <h2 id="shop-title" className="v2-h2">{current.label}</h2>
        {single ? <Link href={`/${single.collection.slug}`} className="v2-link">{t(`See all ${name(single).toLowerCase()}`, `সব ${name(single)} দেখুন`)} →</Link>
          : isTech ? <Link href="/#studio" className="v2-link">{t("About OANRO Studio", "OANRO স্টুডিও সম্পর্কে")} →</Link> : null}
      </div>
      {current.id === "store" && current.lines.length > 1 && <div className="v2-subtabs" role="group" aria-label={t("Store sections", "স্টোরের সেকশন")}>
        <button type="button" aria-pressed={sub === "all"} onClick={() => setSub("all")}>{t("All", "সব")}</button>
        {current.lines.map(l => <button key={l.collection.id} type="button" aria-pressed={sub === l.collection.id} onClick={() => setSub(l.collection.id)}>{name(l)}</button>)}
      </div>}
      {single && !isTech && <p className="v2-shop-intro">{bn && single.collection.bn ? single.collection.bn.description : single.collection.description}</p>}
      <div className="v2-grid" key={`${current.id}-${sub}`}>
        {!isTech ? items.map(p => {
          const pname = bn && p.bn ? p.bn.name : p.name; const out = p.inStock === false;
          // Second photo for the hover reveal: the first colour photo that differs from the main one (real photos only).
          const alt = p.colors?.find(c => c.image && c.image !== p.image)?.image ?? null;
          return <Link key={p.slug} href={`/products/${p.slug}`} className={`v2-card v2-tilt${alt ? " has-alt" : ""}`} onMouseMove={tilt} onMouseLeave={untilt}>
            <div className="v2-card-photo"><ProductPhoto position={p.position} image={swatch[p.slug] !== undefined ? swatch[p.slug] : p.image} label={pname} />{alt && <ProductPhoto position={p.position} image={alt} label="" className="v2-card-alt" />}{out && <span className="v2-badge v2-badge-dark">{t("Out of stock", "স্টক শেষ")}</span>}<span className="v2-card-cta">{out ? t("View details", "বিস্তারিত দেখুন") : p.sizes.length > 1 ? t("Choose size", "সাইজ বেছে নিন") : t("View & add to bag", "দেখুন ও ব্যাগে নিন")}</span></div>
            <div className="v2-card-body"><strong>{pname}</strong>
              {p.colors && p.colors.length > 0 && <span className="v2-swatches" aria-label={t(`${p.colors.length} colours`, `${p.colors.length}টি রং`)}>{p.colors.slice(0, 5).map(col => <span key={col.id} className={swatch[p.slug] !== undefined && swatch[p.slug] === (col.image ?? p.image ?? null) ? "is-picked" : undefined} onMouseEnter={() => setSwatch(x => ({ ...x, [p.slug]: col.image ?? p.image ?? null }))} onClick={e => { e.preventDefault(); setSwatch(x => ({ ...x, [p.slug]: col.image ?? p.image ?? null })); }} style={{ background: col.hex }} title={bn ? col.bn : col.name} />)}</span>}
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
    <p className="v2-result" key={area}>{bn ? <>পৌঁছাবে <strong>{n(dayText(a.days))} দিনে</strong> · ডেলিভারি চার্জ {formatPrice(chargeFor(rules, a.id === "outside" ? "outside" : "dhaka"), locale)}{cod ? " · ক্যাশ অন ডেলিভারি আছে" : ""}</> : <>Arrives in <strong>{dayText(a.days)} days</strong> · Delivery {formatPrice(chargeFor(rules, a.id === "outside" ? "outside" : "dhaka"), locale)}{cod ? " · Cash on delivery available" : ""}</>}</p>
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
    <p className="v2-eyebrow v2-center" id="values-title">{bn ? "পাঁচটি অক্ষর, পাঁচটি প্রতিশ্রুতি — মাউস রাখুন বা চাপুন" : "Five letters, five promises — hover or tap one"}</p>
    <div className="v2-letters" role="tablist" aria-label="OANRO">{VALUES.map((x, k) => <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={bn ? x.bn[0] : x.en[0]} className={k === i ? "is-active" : ""} onClick={() => setI(k)} onMouseEnter={() => setI(k)} onFocus={() => setI(k)}>{x.ch}</button>)}</div>
    <div className="v2-value-panel" key={i} role="tabpanel">
      <div><div className="v2-value-word">{bn ? v.bn[0] : v.en[0]}</div></div>
      <div><p>{bn ? v.bn[1] : v.en[1]}</p><p className="v2-value-you">{bn ? "আপনার জন্য এর মানে: " : "What it means for you: "}{bn ? v.bn[2] : v.en[2]}</p></div>
    </div>
  </div></section>;
}

/** Studio section (J4): services list + live-build terminal animation. */
export function StudioTerminal() {
  const studioEyebrow = useText("studio.eyebrow"), studioHeadline = useText("studio.headline"), studioLede = useText("studio.lede");
  const showProcess = useFeature("studioProcess"), showDevices = useFeature("studioDevices");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const services = useServices();
  const lines = bn
    ? ["সপ্তাহ ১ · লক্ষ্য, পরিকল্পনা ও ডিজাইন অনুমোদিত", "সপ্তাহ ২ · মূল ফিচার তৈরি ও টেস্ট", "সপ্তাহ ৩ · পেমেন্ট, API ও ইন্টিগ্রেশন যুক্ত", "সপ্তাহ ৩ · নিরাপত্তা, স্পিড ও SEO যাচাই", "সপ্তাহ ৪ · অ্যাডমিন প্যানেল, রোল ও হ্যান্ডওভার"]
    : ["Week 1 · goals, plan & design approved", "Week 2 · core features built & tested", "Week 3 · payments, APIs & integrations connected", "Week 3 · security, speed & SEO checks", "Week 4 · admin panel, roles & handover"];
  // Two rows that slide forever in opposite directions: the stack we work in, and what we deliver with it.
  const stack = ["Next.js", "React", "Vue", "Angular", "Node.js", "TypeScript", "Go", "Java", "Spring Boot", "PHP", "Laravel", "Python", "Django", "FastAPI", ".NET", "Flutter", "React Native", "Swift", "Kotlin", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure"];
  const offer = bn
    ? ["ওয়েবসাইট", "ই-কমার্স স্টোর", "মোবাইল অ্যাপ", "কাস্টম সফটওয়্যার", "ERP ও CRM", "AI ও চ্যাটবট", "API ইন্টিগ্রেশন", "পেমেন্ট গেটওয়ে", "UI/UX ডিজাইন", "ক্লাউড ও হোস্টিং", "DevOps ও CI/CD", "সাইবার নিরাপত্তা", "ডেটা ও অ্যানালিটিক্স", "অটোমেশন", "মেইনটেন্যান্স ও সাপোর্ট"]
    : ["Websites", "E-commerce stores", "Mobile apps", "Custom software", "ERP & CRM", "AI & chatbots", "API integration", "Payment gateways", "UI/UX design", "Cloud & hosting", "DevOps & CI/CD", "Cybersecurity", "Data & analytics", "Automation", "Maintenance & support"];
  const row = (items: string[], reverse = false) => <div className={`v2-marquee v2-marquee-dark${reverse ? " is-reverse" : ""}`}><div className="v2-marquee-track">
    <div className="v2-chips">{items.map(x => <span key={x}>{x}</span>)}</div><div className="v2-chips" aria-hidden="true">{items.map(x => <span key={x}>{x}</span>)}</div>
  </div></div>;
  return <section id="studio" className="v2-studio" aria-labelledby="studio-title"><div className="container v2-studio-grid">
    <div>
      <p className="v2-eyebrow">{studioEyebrow}</p>
      <h2 id="studio-title" className="v2-h2 v2-on-dark v2-mask">{studioHeadline.split("|").map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</h2>
      <p className="v2-lede">{studioLede}</p>
      <ul className="v2-service-rows">{services.map(s => <li key={s.slug}><Link href={`/services/${s.slug}`}>{bn && s.bn ? s.bn.title : s.title}<span>{t("Get a quote", "কোট নিন")} →</span></Link></li>)}</ul>
      <div className="v2-actions"><Link href="/contact" className="v2-btn v2-btn-light">{t("Get a free quote", "ফ্রি কোট নিন")} <ArrowUpRight size={17} /></Link></div>
    </div>
    <div>
      <div className="v2-terminal" aria-hidden="true">
        <div className="v2-terminal-bar"><i /><i /><i /><span>studio — your-project</span></div>
        <div className="v2-terminal-body">
          <div className="t-line" style={{ animationDelay: "0s" }}><b>$</b> build your-project</div>
          {lines.map((l, k) => <div key={l} className="t-line t-dim" style={{ animationDelay: `${0.8 * (k + 1)}s` }}>✓ {l}</div>)}
          <div className="t-line t-go" style={{ animationDelay: "4.8s" }}>→ {t("Live on your own domain", "লাইভ: আপনার নিজের ডোমেইনে")} <span className="t-caret">▍</span></div>
        </div>
      </div>
      {row(stack)}
      {row(offer, true)}
    </div>
  </div>{showProcess && <StudioProcess />}{showDevices && <StudioDevices />}</section>;
}

const MEANING = {
  en: ["Originality", "Ambition", "Next-generation", "Reliability", "Opportunity"],
  bn: ["নিজস্বতা", "উচ্চাকাঙ্ক্ষা", "ভবিষ্যৎমুখী উদ্ভাবন", "নির্ভরযোগ্যতা", "নতুন সম্ভাবনা"],
};
/** Hero brand block: holographic logo card + H1 (search keywords in the small line) + the original O-A-N-R-O letter cycle. */
export function HeroBrand() {
  const heroEyebrow = useText("hero.eyebrow"), heroHeadline = useText("hero.headline");
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
      <span className="v2-eyebrow v2-fade">{heroEyebrow}</span>
      <span className="v2-h1 v2-track">{heroHeadline}</span>
    </h1>
    <p className="v2-letters-line v2-fade" aria-hidden="true">
      <span className="v2-mini-letters">{"OANRO".split("").map((ch, i) => <span key={i} className={i === active ? "is-active" : undefined}>{ch}</span>)}</span>
      <span>{bn ? "যার ভিত্তি" : "Built on"} <span key={`${locale}-${active}`} className="v2-word">{words[active]}</span></span>
    </p>
    <p className="sr-only">{bn ? `OANRO মানে: ${MEANING.bn.join(", ")}।` : `OANRO stands for ${MEANING.en.slice(0, 4).join(", ")} and ${MEANING.en[4]}.`}</p>
  </>;
}

/** Scroll story for one product: the photo stays in place while three short panels pass by.
 * Uses the first in-stock product with a real photo (or the first product), so everything shown is real catalog data. */
export function ProductStory() {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const products = useProducts();
  const p = products.find(x => x.image && x.inStock !== false) ?? products.find(x => x.inStock !== false) ?? products[0];
  if (!p) return null;
  const copy = bn && p.bn ? p.bn : p;
  const specs = (bn && p.bn ? p.bn.specs : p.specs)?.slice(0, 3) ?? [];
  return <section className="v2-story container" aria-labelledby="story-title">
    <div className="v2-story-media"><div className="v2-story-photo"><ProductPhoto position={p.position} image={p.image} label={copy.name} /></div></div>
    <div className="v2-story-panels">
      <article className="v2-story-panel">
        <p className="v2-eyebrow">{t("In focus", "বিশেষ নজরে")} · {copy.category}</p>
        <h2 id="story-title" className="v2-h2">{copy.name}</h2>
        <p className="v2-body">{copy.tagline}</p>
      </article>
      <article className="v2-story-panel">
        <p className="v2-eyebrow">{t("Why we picked it", "কেন বেছে নিয়েছি")}</p>
        <p className="v2-body">{copy.description}</p>
        {specs.length > 0 && <dl className="v2-story-specs">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
      </article>
      <article className="v2-story-panel">
        <p className="v2-eyebrow">{t("Make it yours", "আপনার করে নিন")}</p>
        {p.colors && p.colors.length > 0 && <div className="v2-swatches v2-story-swatches">{p.colors.slice(0, 6).map(c => <span key={c.id} style={{ background: c.hex }} title={bn ? c.bn : c.name} />)}</div>}
        {p.sizes.length > 0 && <p className="v2-story-sizes">{p.sizes.join(" · ")}</p>}
        <PriceTag price={p.price} compareAt={p.compareAt} locale={locale} className="v2-story-price" />
        <div className="v2-actions"><Link href={`/products/${p.slug}`} className="v2-btn v2-btn-dark">{t("View the product", "পণ্যটি দেখুন")} <ArrowUpRight size={17} /></Link></div>
      </article>
    </div>
  </section>;
}

/** "Why OANRO" bento grid. Every number comes from the admin delivery rules; tiles without data are left out. */
export function WhyBento({ rules, services }: { rules: CheckoutRules; services: boolean }) {
  const bentoTitle = useText("bento.title");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const n = (s: string) => bn ? bnDigits(s) : s;
  return <section className="container v2-bento-wrap" aria-labelledby="bento-title">
    <p className="v2-eyebrow v2-center">{t("Why OANRO", "কেন OANRO")}</p>
    <h2 id="bento-title" className="v2-h2 v2-center">{bentoTitle}</h2>
    <div className="v2-bento">
      <div className="v2-tile v2-tile-big v2-tile-dark">
        <span className="v2-tile-label">{t("Delivery", "ডেলিভারি")}</span>
        <strong className="v2-tile-num">{n(dayText(rules.dhakaDays))} <small>{t("days in Dhaka", "দিন ঢাকায়")}</small></strong>
        <p>{t(`${dayText(rules.outsideDays)} days everywhere else in Bangladesh.`, `সারা বাংলাদেশে ${n(dayText(rules.outsideDays))} দিন।`)}</p>
      </div>
      {rules.codLimit > 0 && <div className="v2-tile v2-tile-green">
        <span className="v2-tile-label">{t("Cash on delivery", "ক্যাশ অন ডেলিভারি")}</span>
        <p>{t(`Pay when it arrives, up to ${formatPrice(rules.codLimit, locale)}.`, `${formatPrice(rules.codLimit, locale)} পর্যন্ত পণ্য হাতে পেয়ে টাকা দিন।`)}</p>
      </div>}
      <div className="v2-tile">
        <span className="v2-tile-label">{t("Pay your way", "যেভাবে খুশি পেমেন্ট")}</span>
        <p className="v2-tile-pay"><b className="is-bkash">bKash</b><b className="is-nagad">Nagad</b></p>
      </div>
      {rules.returnDays > 0 && <div className="v2-tile">
        <span className="v2-tile-label">{t("Problem?", "সমস্যা?")}</span>
        <strong className="v2-tile-num">{n(String(rules.returnDays))} <small>{t("days", "দিন")}</small></strong>
        <p>{t("to tell us about a wrong or damaged item.", "ভুল বা ক্ষতিগ্রস্ত পণ্যের কথা জানাতে।")}</p>
      </div>}
      <div className="v2-tile">
        <span className="v2-tile-label">{t("Real people", "আসল মানুষ")}</span>
        <p>{t("Every message is answered by someone on our team.", "প্রতিটি বার্তার উত্তর দেন আমাদের টিমের কেউ।")}</p>
      </div>
      {services && <Link href="/#studio" className="v2-tile v2-tile-wide v2-tile-dark v2-tile-link">
        <span className="v2-tile-label">OANRO Studio</span>
        <p>{t("Software, websites, apps and IT solutions — built the same careful way.", "সফটওয়্যার, ওয়েবসাইট, অ্যাপ ও আইটি সলিউশন — একই যত্নে তৈরি।")}</p>
        <span className="v2-tile-go">{t("Explore the studio", "স্টুডিও দেখুন")} <ArrowUpRight size={16} /></span>
      </Link>}
    </div>
  </section>;
}

/** "How we work": five steps; the line between them draws itself as you scroll. */
function StudioProcess() {
  const { locale } = useLocale(); const bn = locale === "bn";
  const steps = bn
    ? [["আলোচনা", "লক্ষ্য, বাজেট ও সময় বুঝে নিই"], ["ডিজাইন", "লেআউট দেখে আপনি অনুমোদন দেন"], ["তৈরি", "ফিচার বানাই, প্রতি সপ্তাহে প্রিভিউ"], ["লঞ্চ", "আপনার নিজের ডোমেইনে লাইভ"], ["সাপোর্ট", "আপডেট, ঠিকঠাক রাখা ও সাহায্য"]]
    : [["Discover", "We learn your goals, budget and timeline"], ["Design", "You see the layout and approve it"], ["Build", "Features built, with a live preview every week"], ["Launch", "Live on your own domain"], ["Support", "Updates, upkeep and help after launch"]];
  return <div className="container v2-process" aria-label={bn ? "আমরা কীভাবে কাজ করি" : "How we work"}>
    <p className="v2-eyebrow">{bn ? "আমরা কীভাবে কাজ করি" : "How we work"}</p>
    <ol className="v2-process-list">{steps.map(([title, text], i) => <li key={title}><span className="v2-process-dot">{bn ? bnDigits(String(i + 1)) : i + 1}</span><strong>{title}</strong><small>{text}</small></li>)}</ol>
  </div>;
}

/** One website on three screens at once (laptop, tablet, phone), each slowly scrolling. A neutral sample layout, not a client project. */
function StudioDevices() {
  const { locale } = useLocale(); const bn = locale === "bn";
  const page = <div className="v2-mock"><i className="m-nav" /><i className="m-hero" /><i className="m-row" /><i className="m-cards"><b /><b /><b /></i><i className="m-row" /><i className="m-hero m-alt" /><i className="m-cards"><b /><b /><b /></i><i className="m-row" /></div>;
  return <div className="container v2-devices">
    <div className="v2-devices-stage" role="img" aria-label={bn ? "একই ওয়েবসাইট ল্যাপটপ, ট্যাবলেট ও ফোনে" : "The same website on a laptop, a tablet and a phone"}>
    <div className="v2-device is-laptop"><div className="v2-screen">{page}</div></div>
    <div className="v2-device is-tablet"><div className="v2-screen">{page}</div></div>
    <div className="v2-device is-phone"><div className="v2-screen">{page}</div></div>
    </div>
    <p className="v2-devices-note">{bn ? "প্রতিটি সাইট ল্যাপটপ, ট্যাবলেট ও ফোনে সমান সুন্দর — একবার বানাই, সব স্ক্রিনে চলে।" : "Every site we build works beautifully on laptop, tablet and phone — built once, ready for every screen."}</p>
  </div>;
}
