"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { useLocale } from "./locale";
import { useFeature } from "./site-content-context";
import { ProductCard } from "./collection-conveyor";

type Sort = "featured" | "price-asc" | "price-desc";
/** Category page grid with simple filters (in stock, size, colour, max price) and sorting. All in the browser: no reloads. */
export function CollectionBrowser({ items }: { items: Product[] }) {
  const filtersOn = useFeature("filters");
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const sizes = useMemo(() => [...new Set(items.flatMap(p => p.sizes))].filter(s => s && !/^(standard|one size)$/i.test(s)), [items]);
  const colors = useMemo(() => { const m = new Map<string, { name: string; bn: string; hex: string }>(); items.forEach(p => p.colors?.forEach(c => { if (!m.has(c.name)) m.set(c.name, c); })); return [...m.values()]; }, [items]);
  const top = Math.max(0, ...items.map(p => p.price));
  const [sort, setSort] = useState<Sort>("featured");
  const [inStock, setInStock] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [max, setMax] = useState(top);
  const shown = useMemo(() => {
    const list = items.filter(p => (!inStock || p.inStock !== false) && (!size || p.sizes.includes(size)) && (!color || p.colors?.some(c => c.name === color)) && p.price <= max);
    return sort === "featured" ? list : [...list].sort((a, b) => sort === "price-asc" ? a.price - b.price : b.price - a.price);
  }, [items, inStock, size, color, max, sort]);
  const active = inStock || size || color || max < top;
  const reset = () => { setInStock(false); setSize(null); setColor(null); setMax(top); };
  if (items.length < 2 || !filtersOn) return <div className="category-grid">{items.map((p, i) => <ProductCard key={p.slug} product={p} index={i} duplicate={false} />)}</div>;
  return <>
    <div className="cb-bar" role="group" aria-label={t("Filter and sort", "ফিল্টার ও সাজানো")}>
      <label className="cb-check"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} />{t("In stock only", "শুধু স্টকে আছে")}</label>
      {sizes.length > 1 && <div className="cb-chips" aria-label={t("Size", "সাইজ")}>{sizes.map(s => <button type="button" key={s} aria-pressed={size === s} onClick={() => setSize(size === s ? null : s)}>{s}</button>)}</div>}
      {colors.length > 1 && <div className="cb-chips cb-colors" aria-label={t("Colour", "রং")}>{colors.map(c => <button type="button" key={c.name} aria-pressed={color === c.name} title={bn ? c.bn : c.name} aria-label={bn ? c.bn : c.name} onClick={() => setColor(color === c.name ? null : c.name)}><span style={{ background: c.hex }} /></button>)}</div>}
      {top > 0 && <label className="cb-range">{t("Up to", "সর্বোচ্চ")} <b>{formatPrice(max, locale)}</b><input type="range" min={0} max={top} step={Math.max(10, Math.round(top / 50 / 10) * 10)} value={max} onChange={e => setMax(Number(e.target.value))} /></label>}
      <label className="cb-sort">{t("Sort", "সাজান")}<select value={sort} onChange={e => setSort(e.target.value as Sort)}>
        <option value="featured">{t("Featured", "বাছাই করা")}</option><option value="price-asc">{t("Price: low to high", "দাম: কম থেকে বেশি")}</option><option value="price-desc">{t("Price: high to low", "দাম: বেশি থেকে কম")}</option>
      </select></label>
    </div>
    <p className="cb-count" role="status">{t(`${shown.length} of ${items.length} products`, `${items.length}টির মধ্যে ${shown.length}টি পণ্য`)}{active && <button type="button" onClick={reset}>{t("Clear filters", "ফিল্টার মুছুন")}</button>}</p>
    {shown.length ? <div className="category-grid">{shown.map((p, i) => <ProductCard key={p.slug} product={p} index={i} duplicate={false} />)}</div>
      : <div className="cb-empty"><p>{t("Nothing matches these filters.", "এই ফিল্টারে কিছু পাওয়া যায়নি।")}</p><button type="button" className="button light-button" onClick={reset}>{t("Clear filters", "ফিল্টার মুছুন")}</button></div>}
  </>;
}
