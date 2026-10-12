"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Globe2, ShieldCheck, MessageCircle, PackageCheck } from "lucide-react";
import { products, services } from "@/lib/catalog";
import { ProductPhoto } from "./shell";
import { FlipPanel } from "./flip-panel";
import { useMotion } from "./experience";
import styles from "./conveyor-effects.module.css";

type Entry = { title: string; category: string; detail: string; href: string; position?: string; word?: string; icon?: typeof Globe2 };
const principles: Entry[] = [
  { title: "Bangladesh first", category: "Our approach", detail: "Starting locally, with room to grow.", href: "/#about", icon: Globe2 },
  { title: "Clear information", category: "Our commitment", detail: "Understand what you are choosing.", href: "/#about", icon: ShieldCheck },
  { title: "Thoughtful support", category: "Our commitment", detail: "People behind the experience.", href: "/#contact", icon: MessageCircle },
  { title: "Useful by design", category: "Our approach", detail: "Practical products and technology.", href: "/#about", icon: PackageCheck },
];

function Shelf({ entries, direction, label }: { entries: Entry[]; direction: 1 | -1; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const idleUntil = useRef(0);
  const { allowed } = useMotion();
  useEffect(() => {
    const node = track.current; const first = group.current;
    if (!node || !first || !allowed) return;
    let visible = false; let frame = 0; let last = 0;
    let position = direction === -1 ? first.getBoundingClientRect().width : node.scrollLeft;
    node.scrollLeft = position;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); observer.observe(node);
    const animate = (time: number) => {
      const delta = Math.min(time - last || 0, 50); last = time;
      if (visible && !hovering.current && !node.contains(document.activeElement) && !document.hidden && time > idleUntil.current) {
        const width = first.getBoundingClientRect().width;
        if (width > 0) { position += direction * delta * 0.035; if (position >= width) position -= width; if (position < 0) position += width; node.scrollLeft = position; }
      } else { position = node.scrollLeft; }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [allowed, direction, entries]);
  const render = (duplicate: boolean) => entries.map((entry, index) => <Link key={`${entry.title}-${index}`} className={styles.card} href={entry.href} tabIndex={duplicate ? -1 : undefined}>
    <FlipPanel title={entry.title} detail={entry.detail} index={index}>
      <div className={styles.visual}>{entry.position ? <ProductPhoto position={entry.position} label={entry.title} /> : entry.icon ? <entry.icon className={styles.symbol} size={62} strokeWidth={1.3} aria-hidden="true" /> : <strong className={styles.word}>{entry.word}</strong>}</div>
    </FlipPanel>
    <div className={styles.label}><small>{entry.category}</small><h3>{entry.title}</h3></div>
  </Link>);
  return <div className={styles.shelf} ref={track} role="region" aria-label={label} tabIndex={0} onMouseEnter={() => { hovering.current = true; }} onMouseLeave={() => { hovering.current = false; }} onPointerDown={() => { idleUntil.current = performance.now() + 2500; }} onWheel={() => { idleUntil.current = performance.now() + 2500; }}>
    <div className={styles.group} ref={group}>{render(false)}</div><div className={styles.group} aria-hidden="true">{render(true)}</div><div className={styles.group} aria-hidden="true">{render(true)}</div>
  </div>;
}

export function DoubleConveyor({ showProducts, showServices }: { showProducts: boolean; showServices: boolean }) {
  const merchandise: Entry[] = showProducts ? products.map(p => ({ title: p.name, category: "Sample product", detail: p.tagline, href: `/products/${p.slug}`, position: p.position })) : [];
  const work: Entry[] = showServices ? services.map(s => ({ title: s.title, category: "Technology service", detail: s.text, href: `/#service-${s.slug}`, word: s.word })) : [];
  const fill = (items: Entry[]) => Array.from({ length: Math.max(6, items.length) }, (_, index) => items[index % items.length]);
  const first = fill([...merchandise, ...work.slice(0, 2), ...principles.slice(0, 2)]);
  const second = fill([...work.slice(2), ...principles.slice(2), ...merchandise]);
  return <section className={styles.section} aria-labelledby="oanro-world-title"><div className={`container ${styles.heading}`}><p className="eyebrow">The world of OANRO</p><h2 id="oanro-world-title">What we offer. What we stand for.</h2><p>Products, practical technology, and the principles behind the experience.</p></div>
    <Shelf entries={first} direction={1} label="OANRO first shelf" /><Shelf entries={second} direction={-1} label="OANRO second shelf" />
  </section>;
}
