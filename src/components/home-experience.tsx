"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { products, services } from "@/lib/catalog";
import { useMotion, Reveal } from "./experience";
import { ProductPhoto } from "./shell";
import { FlipPanel } from "./flip-panel";
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="scene-loading" /> });

export function StandardPanel() {
  const lines = ["Clear product details.", "Flexible ordering.", "Human support."];
  return <aside className="standard-panel" aria-label="The OANRO standard"><Scene mode="universe" /><div className="standard-copy"><p className="eyebrow">The OANRO standard</p>{lines.map((line, row) => <p className="letter-line" aria-label={line} key={line}>{Array.from(line).map((letter, index) => <span aria-hidden="true" style={{ "--letter-delay": `${row * 0.35 + index * 0.025}s` } as CSSProperties} key={index}>{letter === " " ? "\u00a0" : letter}</span>)}</p>)}<p className="standard-note">A little more thought. At every step.</p></div></aside>;
}

export { ValueFan } from "./value-fan";
export function Conveyor({ id, title, eyebrow, description, children }: { id: string; title: string; eyebrow: string; description: string; children: (duplicate: boolean) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null); const group = useRef<HTMLDivElement>(null); const hover = useRef(false);
  const { allowed } = useMotion(); const [play, setPlay] = useState(true);
  useEffect(() => {
    const track = ref.current; const first = group.current; if (!track || !first || !play || !allowed) return;
    let frame = 0; let last = 0; let onScreen = false; let position = track.scrollLeft;
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }, { threshold: 0.1 }); observer.observe(track);
    const animate = (time: number) => { const delta = Math.min(time - last || 0, 50); last = time;
      if (onScreen && !hover.current && !document.hidden) { const width = first.getBoundingClientRect().width; position = (position + delta * 0.035) % width; track.scrollLeft = position; }
      else { position = track.scrollLeft; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [play, allowed]);
  function move(direction: number) { setPlay(false); const track = ref.current; if (track) track.scrollBy({ left: direction * 340, behavior: allowed ? "smooth" : "auto" }); }
  return <section id={id} className={`conveyor-section section-space ${id === "services" ? "services-section" : ""}`}><div className="container"><Reveal className="section-heading"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div><div className="row-controls"><button type="button" className="icon-button" aria-label={`${play && allowed ? "Pause" : "Play"} ${id}`} title={play && allowed ? "Pause" : "Play"} disabled={!allowed} onClick={() => setPlay(!play)}>{play && allowed ? <Pause size={17} /> : <Play size={17} />}</button><button type="button" className="icon-button" aria-label={`Previous ${id}`} title="Previous" onClick={() => move(-1)}><ArrowLeft size={18} /></button><button type="button" className="icon-button" aria-label={`Next ${id}`} title="Next" onClick={() => move(1)}><ArrowRight size={18} /></button></div></Reveal>
      <div className="conveyor" ref={ref} role="region" aria-label={`${id} carousel`} tabIndex={0} onMouseEnter={() => { hover.current = true; }} onMouseLeave={() => { hover.current = false; }} onPointerDown={() => setPlay(false)} onFocusCapture={() => setPlay(false)} onWheel={() => setPlay(false)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); move(event.key === "ArrowRight" ? 1 : -1); } }}><div className="conveyor-group" ref={group}>{children(false)}</div><div className="conveyor-group conveyor-clone" aria-hidden="true">{children(true)}</div></div>
    </div></section>;
}
export function ProductConveyor() {
  return <Conveyor id="products" title="Your next discovery." eyebrow="The collection" description="A first look at the possibilities. Sample products, made for exploration.">{duplicate => products.map((product, index) => <Link className="conveyor-card product-card" tabIndex={duplicate ? -1 : undefined} key={product.slug} href={`/products/${product.slug}`}><div className="product-card-media"><FlipPanel title={product.name} detail={product.tagline} index={index}><ProductPhoto position={product.position} label={product.name} /><span className="sample-badge">Sample collection</span><span className="card-arrow"><ArrowUpRight size={21} /></span></FlipPanel></div><div className="card-copy"><small>{product.category}</small><h3>{product.name}</h3><p>{product.tagline}</p></div></Link>)}</Conveyor>;
}
export function ServiceConveyor() {
  return <Conveyor id="services" title="Ideas, made practical." eyebrow="Technology services" description="A first introduction. Tell us what you have in mind.">{duplicate => services.map((service, index) => <a className="conveyor-card service-card" id={duplicate ? undefined : `service-${service.slug}`} tabIndex={duplicate ? -1 : undefined} key={service.slug} href="#contact"><FlipPanel title={service.title} detail={service.text} index={index}><div className={`service-visual service-tone-${index % 3}`}><span>OANRO STUDIO</span><strong>{service.word}</strong><ArrowUpRight size={27} /></div></FlipPanel><div className="card-copy"><h3>{service.title}</h3><p>{service.text}</p></div></a>)}</Conveyor>;
}

export function FeatureStory() {
  return <>
    <section className="campaign" aria-labelledby="campaign-title"><Image src="/images/campaign.png" alt="AI-generated model wearing the Forest Knit sample sweater" fill sizes="100vw" priority /><div className="container campaign-copy"><p className="eyebrow">The winter edit</p><h2 id="campaign-title">Feel the<br />difference.</h2><p>A quieter palette.<br />A richer texture. Your next layer.</p><Link href="/products/forest-knit" className="button brand-button">Meet the Forest Knit<ArrowUpRight size={17} /></Link><small>Generated campaign / sample collection</small></div></section>
    <section className="headphone-story" aria-labelledby="headphones-title"><Image src="/images/headphones.png" alt="Sample matte black over-ear headphones" fill sizes="100vw" /><div className="container headphone-copy"><p className="eyebrow">Studio Wireless / concept</p><h2 id="headphones-title">A world<br />of your own.</h2><p>Considered form.<br />An entirely different perspective.</p><Link href="/products/studio-headphones" className="button light-button">Explore the concept<ArrowUpRight size={17} /></Link></div></section>
    <section className="highlights section-space"><div className="container"><Reveal className="section-heading"><div><p className="eyebrow">Take a closer look</p><h2>It&apos;s all in the details.</h2></div><Link className="text-link" href="/products/forest-knit">Discover the story<ArrowUpRight size={17} /></Link></Reveal><div className="highlight-grid"><Link href="/products/forest-knit" className="highlight-photo"><Image src="/images/fabric.png" alt="Generated close-up of green cable-knit texture" fill sizes="(max-width: 767px) 100vw, 60vw" /><span>Texture. Up close.<ArrowUpRight /></span></Link><div className="highlight-copy"><p className="eyebrow">The Forest Knit</p><h3>Made to be<br />looked at closer.</h3><p>Explore the silhouette, see the texture, and discover the idea behind the collection.</p><Link href="/products/forest-knit" className="text-link">See the details<ArrowUpRight size={17} /></Link></div></div></div></section>
    <section className="model-feature"><div className="container model-heading"><p className="eyebrow">A different dimension</p><h2>Turn your perspective.</h2><p>Explore our interactive headphone concept.</p></div><Scene /><Link href="/products/studio-headphones" className="text-link model-link">Meet Studio Wireless<ArrowUpRight size={17} /></Link></section>
  </>;
}
