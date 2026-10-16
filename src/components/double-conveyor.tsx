"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Globe2, ShieldCheck, MessageCircle, PackageCheck } from "lucide-react";
import { useProductLines, useServices } from "./products-context";
import { useLocale, useT } from "./locale";
import { ProductPhoto } from "./shell";
import { FlipPanel } from "./flip-panel";
import { useMotion } from "./experience";
import styles from "./conveyor-effects.module.css";

type Entry = { title: string; category: string; detail: string; href: string; position?: string; image?: string | null; word?: string; icon?: typeof Globe2 };
const principles = (t: (en: string, bn: string) => string): Entry[] => [
  { title: t("Bangladesh first", "বাংলাদেশ প্রথম"), category: t("Our approach", "আমাদের পদ্ধতি"), detail: t("Starting locally, with room to grow.", "স্থানীয়ভাবে শুরু, বড় হওয়ার সুযোগসহ।"), href: "/#about", icon: Globe2 },
  { title: t("Clear information", "স্পষ্ট তথ্য"), category: t("Our commitment", "আমাদের অঙ্গীকার"), detail: t("Understand what you are choosing.", "আপনি কী বেছে নিচ্ছেন, তা বুঝুন।"), href: "/#about", icon: ShieldCheck },
  { title: t("Thoughtful support", "যত্নশীল সহায়তা"), category: t("Our commitment", "আমাদের অঙ্গীকার"), detail: t("People behind the experience.", "অভিজ্ঞতার পেছনে আছেন মানুষ।"), href: "/#contact", icon: MessageCircle },
  { title: t("Useful by design", "নকশাতেই কার্যকর"), category: t("Our approach", "আমাদের পদ্ধতি"), detail: t("Practical products and technology.", "কাজের পণ্য ও প্রযুক্তি।"), href: "/#about", icon: PackageCheck },
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
      if (visible && !hovering.current && !node.matches(":focus-visible") && !node.querySelector(":focus-visible") && !document.hidden && time > idleUntil.current) {
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
      <div className={styles.visual}>{entry.position ? <ProductPhoto position={entry.position} image={entry.image} label={entry.title} /> : entry.icon ? <entry.icon className={styles.symbol} size={62} strokeWidth={1.3} aria-hidden="true" /> : <strong className={styles.word}>{entry.word}</strong>}</div>
    </FlipPanel>
    <div className={styles.label}><small>{entry.category}</small><h3>{entry.title}</h3></div>
  </Link>);
  return <div className={styles.shelf} ref={track} role="region" aria-label={label} tabIndex={0} onMouseEnter={() => { hovering.current = true; }} onMouseLeave={() => { hovering.current = false; }} onPointerDown={() => { idleUntil.current = performance.now() + 2500; }} onWheel={() => { idleUntil.current = performance.now() + 2500; }}>
    <div className={styles.group} ref={group}>{render(false)}</div><div className={styles.group} aria-hidden="true">{render(true)}</div><div className={styles.group} aria-hidden="true">{render(true)}</div>
  </div>;
}

export function DoubleConveyor({ showProducts, showServices }: { showProducts: boolean; showServices: boolean }) {
  const lines = useProductLines(); const services = useServices(); const t = useT(); const bn = useLocale().locale === "bn";
  // One card per product line (Seasonal, Caps, Tech, custom sections) linking to its row, not every product.
  const merchandise: Entry[] = showProducts ? lines.map(({ collection: c, count, cover }) => ({
    title: bn && c.bn ? c.bn.name : c.name, category: t("Product line", "পণ্যের লাইন"),
    detail: count ? t(`${count} product${count === 1 ? "" : "s"} · ${c.headline}`, `${count}টি পণ্য · ${c.bn?.headline || c.headline}`) : (bn && c.bn ? c.bn.description : c.description),
    href: `/#${c.anchor}`, position: cover?.position ?? "0% 0%", image: cover?.image,
  })) : [];
  const work: Entry[] = showServices ? services.map(s => ({ title: bn && s.bn ? s.bn.title : s.title, category: t("Technology service", "প্রযুক্তি সেবা"), detail: bn && s.bn ? s.bn.text : s.text, href: `/#service-${s.slug}`, word: s.word })) : [];
  const values = principles(t);
  const fill = (items: Entry[]) => Array.from({ length: Math.max(6, items.length) }, (_, index) => items[index % items.length]);
  const first = fill([...merchandise, ...work.slice(0, 2), ...values.slice(0, 2)]);
  const second = fill([...work.slice(2), ...values.slice(2), ...merchandise]);
  return <section className={styles.section} aria-labelledby="oanro-world-title"><div className={`container ${styles.heading}`}><p className="eyebrow">{t("The world of OANRO", "OANRO-র জগৎ")}</p><h2 id="oanro-world-title">{t("What we offer. What we stand for.", "আমরা যা দিই, আমরা যার পক্ষে।")}</h2><p>{t("Products, practical technology, and the principles behind the experience.", "পণ্য, কার্যকর প্রযুক্তি এবং অভিজ্ঞতার পেছনের নীতিগুলো।")}</p></div>
    <Shelf entries={first} direction={1} label={t("OANRO first shelf", "OANRO প্রথম তাক")} /><Shelf entries={second} direction={-1} label={t("OANRO second shelf", "OANRO দ্বিতীয় তাক")} />
  </section>;
}
