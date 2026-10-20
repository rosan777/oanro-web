"use client";
import Link from "@/components/locale-link";
import { ArrowUpRight } from "lucide-react";
import { useProductLines } from "./products-context";
import { ProductPhoto } from "./shell";
import { useLocale } from "./locale";

// "Shop by category": one tile per product section, linking to its keyword category page.
export function CategoryTiles() {
  const { locale } = useLocale(); const bn = locale === "bn";
  const lines = useProductLines().filter(line => line.count > 0);
  if (!lines.length) return null;
  return <section className="category-tiles container" aria-labelledby="category-tiles-title">
    <div className="tiles-head"><h2 id="category-tiles-title">{bn ? "ক্যাটাগরি অনুযায়ী দেখুন" : "Shop by category"}</h2></div>
    <div className="tiles-grid">{lines.map(({ collection, cover }) => { const name = bn && collection.bn ? collection.bn.name : collection.name;
      return <Link key={collection.id} href={`/${collection.slug}`} className="category-tile">
        <div className="category-tile-media">{cover && <ProductPhoto position={cover.position} image={cover.image} label={name} />}</div>
        <span>{name}<ArrowUpRight size={18} aria-hidden="true" /></span>
      </Link>; })}</div>
  </section>;
}
