"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "@/components/locale-link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowUpRight } from "lucide-react";
import { useServices } from "./products-context";
import { useMotion, Reveal } from "./experience";
import { FlipPanel } from "./flip-panel";
import { Localized, useLocale, useT } from "./locale";
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="scene-loading" /> });

export function StandardPanel() {
  const t = useT();
  const lines = [t("Clear product details.", "স্পষ্ট পণ্যের তথ্য।"), t("Flexible ordering.", "সহজ অর্ডার।"), t("Human support.", "মানুষের সহায়তা।")];
  return <aside className="standard-panel" aria-label={t("The OANRO standard", "OANRO মানদণ্ড")}><Scene mode="universe" /><div className="standard-copy"><p className="standard-welcome"><Localized en="Welcome to the first chapter" bn="শুরুর প্রথম অধ্যায়ে স্বাগতম" /></p><p className="eyebrow"><Localized en="The OANRO standard" bn="OANRO মানদণ্ড" /></p>{lines.map((line, row) => <p className="letter-line" aria-label={line} key={line}>{Array.from(line).map((letter, index) => <span aria-hidden="true" style={{ "--letter-delay": `${row * 0.35 + index * 0.025}s` } as CSSProperties} key={index}>{letter === " " ? "\u00a0" : letter}</span>)}</p>)}<p className="standard-note"><Localized en="A little more thought. At every step." bn="প্রতিটি ধাপে একটু বেশি যত্ন।" /></p></div></aside>;
}

export { ValueFan } from "./value-fan";
export function Conveyor({ id, title, eyebrow, description, children }: { id: string; title: ReactNode; eyebrow: ReactNode; description: ReactNode; children: (duplicate: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const group = useRef<HTMLDivElement>(null); const hover = useRef(false);
  const { allowed } = useMotion(); const idleUntil = useRef(0); const touching = useRef(false);
  useEffect(() => {
    const track = ref.current; const first = group.current; if (!track || !first || !allowed) return;
    let frame = 0; let last = 0; let onScreen = false; let position = track.scrollLeft;
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }, { threshold: 0.1 }); observer.observe(track);
    const animate = (time: number) => { const delta = Math.min(time - last || 0, 50); last = time;
      if (onScreen && !hover.current && !touching.current && !track.matches(":focus-visible") && !track.querySelector(":focus-visible") && !document.hidden && time > idleUntil.current) { const width = first.getBoundingClientRect().width; if (width > 0) { position = (position + delta * 0.035) % width; track.scrollLeft = position; } }
      else { position = track.scrollLeft; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [allowed]);
  function move(direction: number) { idleUntil.current = performance.now() + 2500; const track = ref.current; if (track) track.scrollBy({ left: direction * 340, behavior: allowed ? "smooth" : "auto" }); }
  return <section id={id} className={`conveyor-section section-space ${id === "services" ? "services-section" : ""}`}><div className="container"><Reveal className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div></Reveal>
      <div className="conveyor" ref={ref} role="region" aria-label={`${id} carousel`} tabIndex={0} onMouseEnter={() => { hover.current = true; }} onMouseLeave={() => { hover.current = false; }} onPointerDown={() => { touching.current = true; }} onPointerUp={() => { touching.current = false; idleUntil.current = performance.now() + 1500; }} onPointerCancel={() => { touching.current = false; }} onPointerLeave={() => { touching.current = false; }} onWheel={() => { idleUntil.current = performance.now() + 1500; }} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}><div className="conveyor-group" ref={group}>{children(false)}</div><div className="conveyor-group conveyor-clone" aria-hidden="true">{children(true)}</div></div>
    </div></section>;
}
export function ServiceConveyor() {
  const services = useServices(); const { locale } = useLocale();
  return <Conveyor id="services" title={<Localized en="Ideas, made practical." bn="ভাবনা, বাস্তবে রূপ।" />} eyebrow={<Localized en="Technology services" bn="প্রযুক্তি সেবা" />} description={<Localized en="A first introduction. Tell us what you have in mind." bn="প্রথম পরিচয়। আপনার ভাবনার কথা আমাদের জানান।" />}>{duplicate => services.map((service, index) => <Link className="conveyor-card service-card" id={duplicate ? undefined : `service-${service.slug}`} tabIndex={duplicate ? -1 : undefined} key={service.slug} href={`/services/${service.slug}`}><FlipPanel title={locale === "bn" && service.bn ? service.bn.title : service.title} detail={locale === "bn" && service.bn ? service.bn.detail : service.detail || service.text} index={index}><div className={`service-visual service-tone-${index % 3}${service.image ? " has-photo" : ""}`} style={service.image?.startsWith("/api/services/") ? { backgroundImage: `linear-gradient(#0008, #0008), url("${service.image}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><span>OANRO STUDIO</span><strong>{service.word}</strong><ArrowUpRight size={27} /></div></FlipPanel><div className="card-copy"><h3>{locale === "bn" && service.bn ? service.bn.title : service.title}</h3><p>{locale === "bn" && service.bn ? service.bn.text : service.text}</p></div></Link>)}</Conveyor>;
}

export function FeatureStory() {
  return <>
    <section className="campaign" aria-labelledby="campaign-title"><Image src="/images/campaign.png" alt="AI-generated model wearing the Forest Knit sample sweater" fill sizes="100vw" priority /><div className="container campaign-copy"><p className="eyebrow"><Localized en="The winter edit" bn="শীতের সংগ্রহ" /></p><h2 id="campaign-title"><Localized en="Feel the" bn="অনুভব করুন" /><br /><Localized en="difference." bn="পার্থক্যটা।" /></h2><p><Localized en="A quieter palette." bn="শান্ত রঙের সমন্বয়।" /><br /><Localized en="A richer texture. Your next layer." bn="সমৃদ্ধ টেক্সচার। আপনার পরবর্তী লেয়ার।" /></p><Link href="/products/forest-knit" className="button brand-button"><Localized en="Meet the Forest Knit" bn="ফরেস্ট নিট দেখুন" /><ArrowUpRight size={17} /></Link><small><Localized en="Generated campaign / sample collection" bn="জেনারেটেড ক্যাম্পেইন / নমুনা কালেকশন" /></small></div></section>
    <section className="headphone-story" aria-labelledby="headphones-title"><Image src="/images/headphones.png" alt="Sample matte black over-ear headphones" fill sizes="100vw" /><div className="container headphone-copy"><p className="eyebrow"><Localized en="Studio Wireless / concept" bn="স্টুডিও ওয়্যারলেস / কনসেপ্ট" /></p><h2 id="headphones-title"><Localized en="A world" bn="নিজের একটি" /><br /><Localized en="of your own." bn="জগৎ।" /></h2><p><Localized en="Considered form." bn="ভেবেচিন্তে তৈরি গড়ন।" /><br /><Localized en="An entirely different perspective." bn="একেবারে নতুন দৃষ্টিভঙ্গি।" /></p><Link href="/products/studio-headphones" className="button light-button"><Localized en="Explore the concept" bn="কনসেপ্টটি দেখুন" /><ArrowUpRight size={17} /></Link></div></section>
    <section className="highlights section-space"><div className="container"><Reveal className="section-heading"><div><p className="eyebrow"><Localized en="Take a closer look" bn="কাছ থেকে দেখুন" /></p><h2><Localized en="It&apos;s all in the details." bn="সবকিছুই খুঁটিনাটিতে।" /></h2></div><Link className="text-link" href="/products/forest-knit"><Localized en="Discover the story" bn="গল্পটি জানুন" /><ArrowUpRight size={17} /></Link></Reveal><div className="highlight-grid"><Link href="/products/forest-knit" className="highlight-photo"><Image src="/images/fabric.png" alt="Generated close-up of green cable-knit texture" fill sizes="(max-width: 767px) 100vw, 60vw" /><span><Localized en="Texture. Up close." bn="কাছ থেকে টেক্সচার।" /><ArrowUpRight /></span></Link><div className="highlight-copy"><p className="eyebrow"><Localized en="The Forest Knit" bn="দ্য ফরেস্ট নিট" /></p><h3><Localized en="Made to be" bn="কাছ থেকে" /><br /><Localized en="looked at closer." bn="দেখার মতো করে তৈরি।" /></h3><p><Localized en="Explore the silhouette, see the texture, and discover the idea behind the collection." bn="সিলুয়েট দেখুন, টেক্সচার অনুভব করুন এবং কালেকশনের পেছনের ভাবনা জানুন।" /></p><Link href="/products/forest-knit" className="text-link"><Localized en="See the details" bn="বিস্তারিত দেখুন" /><ArrowUpRight size={17} /></Link></div></div></div></section>
    <section className="model-feature"><div className="container model-heading"><p className="eyebrow"><Localized en="A different dimension" bn="ভিন্ন এক মাত্রা" /></p><h2><Localized en="Turn your perspective." bn="দৃষ্টিভঙ্গি ঘুরিয়ে দেখুন।" /></h2><p><Localized en="Explore our interactive headphone concept." bn="আমাদের ইন্টারঅ্যাকটিভ হেডফোন কনসেপ্ট দেখুন।" /></p></div><Scene /><Link href="/products/studio-headphones" className="text-link model-link"><Localized en="Meet Studio Wireless" bn="স্টুডিও ওয়্যারলেস দেখুন" /><ArrowUpRight size={17} /></Link></section>
  </>;
}
