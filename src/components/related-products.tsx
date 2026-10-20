"use client";
// "More from this section" + "You may also like" shelves under a product.
// Fresh-shelf style: cards rise in one by one when the shelf scrolls into view, lift on hover,
// and a quick "Add to bag" button slides up (always visible on touch screens).
import { useEffect, useRef, useState } from "react";
import Link from "@/components/locale-link";
import { addToCart } from "@/lib/cart";
import { type Product } from "@/lib/catalog";
import { PriceTag, ProductPhoto } from "./shell";
import { useLocale } from "./locale";

function QuickAdd({ product, bn }: { product: Product; bn: boolean }) {
  const [added, setAdded] = useState(false);
  if (product.inStock === false) return <span className="shelf-quick is-out">{bn ? "স্টক শেষ" : "Out of stock"}</span>;
  return <button type="button" aria-label={`${bn ? "ব্যাগে যোগ করুন" : "Add to bag"}: ${bn && product.bn ? product.bn.name : product.name}`} className={`shelf-quick${added ? " is-added" : ""}`} onClick={() => {
    addToCart(product.slug, product.sizes[0]); window.dispatchEvent(new Event("oanro-open-bag"));
    setAdded(true); setTimeout(() => setAdded(false), 1600);
  }}>
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{added ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 5v14M5 12h14" />}</svg>
    {added ? (bn ? "যোগ হয়েছে" : "Added") : bn ? "ব্যাগে যোগ করুন" : "Add to bag"}
  </button>;
}

function Shelf({ title, items, bn }: { title: string; items: Product[]; bn: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setPlay(true); io.disconnect(); } }, { rootMargin: "0px 0px -10% 0px" });
    io.observe(el); return () => io.disconnect();
  }, []);
  if (!items.length) return null;
  return <section className="shelf" aria-label={title}>
    <div className="shelf-head"><h2>{title}</h2></div>
    <div ref={ref} className={`shelf-row${play ? " is-playing" : ""}`}>
      {items.map((p, i) => { const name = bn && p.bn ? p.bn.name : p.name;
        // The photo link is a mouse/touch shortcut; keyboard and screen readers use the name link (no button inside a link).
        return <div key={p.slug} className={`shelf-card${p.inStock === false ? " is-out-of-stock" : ""}`} style={{ "--i": i } as React.CSSProperties}>
          <div className="shelf-photo"><Link href={`/products/${p.slug}`} tabIndex={-1} aria-hidden="true"><ProductPhoto position={p.position} image={p.image} label={name} /></Link>
            {(p.sizes.length > 1 || (p.colors?.length ?? 0) > 0) && p.inStock !== false ? <Link href={`/products/${p.slug}`} className="shelf-quick" tabIndex={-1} aria-hidden="true">{p.colors?.length ? (bn ? "অপশন বেছে নিন" : "Choose options") : bn ? "সাইজ বেছে নিন" : "Choose size"}</Link> : <QuickAdd product={p} bn={bn} />}</div>
          <Link href={`/products/${p.slug}`} className="shelf-name">{name}</Link>
          <PriceTag className="shelf-price" price={p.price} compareAt={p.compareAt} locale={bn ? "bn" : "en"} />
        </div>; })}
    </div>
  </section>;
}

export function RelatedProducts({ same, others, sectionName }: { same: Product[]; others: Product[]; sectionName: { en: string; bn: string } | null }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  if (!same.length && !others.length) return null;
  return <div className="related-products">
    <Shelf bn={bn} items={same} title={sectionName ? (bn ? `আরও ${sectionName.bn}` : `More ${sectionName.en}`) : bn ? "একই ধরনের আরও" : "More like this"} />
    <Shelf bn={bn} items={others} title={bn ? "আপনার পছন্দ হতে পারে" : "You may also like"} />
  </div>;
}
