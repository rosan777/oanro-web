"use client";

import { useEffect, useState } from "react";
import { useMotion } from "./experience";
import Link from "./locale-link";
import { ProductPhoto } from "./shell";
import type { Product } from "@/lib/catalog";

export function PrintHeadline({ first, bn, rotate }: { first: string; bn: boolean; rotate: boolean }) {
  const { allowed } = useMotion();
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const phrases = bn
    ? [first, "স্বতন্ত্র ওয়েবসাইট ও অ্যাপ।", "প্রযুক্তিতে আরও সম্ভাবনা।", "প্রযুক্তির কাজ হোক সহজ।"]
    : [first, "Websites and apps that set you apart.", "Technology that makes more possible.", "All your tech needs. Made simple."];
  useEffect(() => {
    if (!allowed || !rotate || hold) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % 4);
    }, 5400);
    return () => window.clearInterval(timer);
  }, [allowed, rotate, hold]);
  return <h1 id="hero-title" className="print-headlines" aria-label={first}
    onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}>
    {phrases.slice(0, rotate ? 4 : 1).map((phrase,i) => (
      <span aria-hidden="true" key={i} data-current={i === (allowed && rotate ? index : 0)}>{phrase}</span>
    ))}
  </h1>;
}

export function StoreShelf({ items, bn, shopText }: {
  items: Pick<Product,"slug"|"position"|"image"|"name">[]; bn: boolean; shopText: string;
}) {
  const [replay, setReplay] = useState(0);
  const { allowed } = useMotion();
  return <section className="print-store print-shelf" aria-label={bn ? "ওনার স্টোর" : "Owner Store"}>
    <header>
      <strong>{bn ? "ওনার স্টোর" : "Owner Store"}</strong>
      {allowed && <button type="button" onClick={() => setReplay(i=>i+1)}>{bn ? "অ্যানিমেশন আবার দেখুন" : "Replay animation"}</button>}
      <Link className="print-shop" href="/shop">{shopText}</Link>
    </header>
    <ul key={replay} data-animate={allowed}>
      {items.map(item => <li key={item.slug}><Link href={`/products/${item.slug}`}>
        <ProductPhoto position={item.position} image={item.image} label={item.name} />
        <span>{item.name}</span>
      </Link></li>)}
    </ul>
  </section>;
}
