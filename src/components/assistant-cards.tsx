"use client";
import { useMemo, useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { lineFits, variantSoldOut, type Product } from "@/lib/catalog";
import { addToCart } from "@/lib/cart";
import type { ProductCard } from "@/lib/assistant/types";
import { bnDigits } from "@/lib/text-format";
import { useLocale } from "./locale";
import Link from "./locale-link";
import { useProducts } from "./products-context";
import { PriceTag, ProductPhoto } from "./shell";

/** The existing cart helpers expect a Product; this is the same availability data the server just validated. */
const asProduct = (c: ProductCard): Product => ({ slug: c.slug, name: c.name, category: c.category, tagline: "", description: "", price: c.price, position: c.position, sizes: c.sizes, specs: [], inStock: c.inStock, soldOut: c.soldOut,
  colors: c.colors.map(x => ({ id: x.id, name: x.name, bn: x.nameBn || x.name, hex: x.hex, image: null })) });

/** One product, with current price and availability from the server, size/colour choice, and the shop's normal Add to bag. */
export function AssistantProductCard({ card, onAdded }: { card: ProductCard; onAdded?: () => void }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const live = useProducts(); // storefront catalog as the page loaded it: a second check that the item is still on sale
  const product = useMemo(() => asProduct(card), [card]);
  const firstColor = card.colors.find(c => card.sizes.some(s => !variantSoldOut(product, s, c.id)))?.id ?? card.colors[0]?.id ?? "";
  const [color, setColor] = useState(firstColor);
  const [size, setSize] = useState(card.sizes.find(s => !variantSoldOut(product, s, firstColor)) ?? card.sizes[0] ?? "");
  const [added, setAdded] = useState(false);
  const [problem, setProblem] = useState("");
  const out = !card.inStock;
  const blocked = out || variantSoldOut(product, size, color);
  const name = bn && card.nameBn ? card.nameBn : card.name;
  const n = (s: string) => bn ? bnDigits(s) : s;
  function add() {
    setProblem("");
    if (blocked) return setProblem(t("That option is sold out.", "এই অপশনটি স্টকে নেই।"));
    if (!lineFits(product, size, color)) return setProblem(t("Please choose a size and colour.", "সাইজ ও রং বেছে নিন।"));
    // Only products still published on the storefront can be added (a hidden product disappears from this list).
    if (live.length && !live.some(p => p.slug === card.slug)) return setProblem(t("This item is no longer available.", "এই পণ্যটি আর পাওয়া যাচ্ছে না।"));
    addToCart(card.slug, size, color); setAdded(true); onAdded?.(); window.setTimeout(() => setAdded(false), 2500);
  }
  return <article className="asst-card" aria-label={name}>
    <Link href={card.url} tabIndex={-1} aria-hidden="true"><ProductPhoto position={card.position} label={name} image={card.image} /></Link>
    <div className="asst-card-body">
      <div className="asst-card-top"><h3><Link href={card.url}>{name}</Link></h3><PriceTag price={card.price} compareAt={card.compareAt} locale={locale} /></div>
      <div className="asst-card-meta">
        {out ? <span className="asst-badge is-out">{t("Sold out", "স্টক শেষ")}</span>
          : card.left ? <span className="asst-badge">{t(`Only ${card.left} left`, `মাত্র ${n(String(card.left))}টি বাকি`)}</span>
          : <span className="asst-badge">{t("In stock", "স্টকে আছে")}</span>}
        {card.preview && <span className="asst-badge is-preview">{t("Preview", "প্রিভিউ")}</span>}
      </div>
      {!out && <div className="asst-card-pick">
        {card.colors.length > 0 && <div className="asst-options" role="group" aria-label={t("Colour", "রং")}>
          {card.colors.map(c => <button key={c.id} type="button" className="asst-swatch" aria-pressed={color === c.id} aria-label={bn ? c.nameBn || c.name : c.name} title={bn ? c.nameBn || c.name : c.name} style={{ backgroundColor: c.hex }}
            onClick={() => { setColor(c.id); if (variantSoldOut(product, size, c.id)) setSize(card.sizes.find(s => !variantSoldOut(product, s, c.id)) ?? size); }} />)}
        </div>}
        {card.sizes.length > 1 && <div className="asst-options" role="group" aria-label={t("Size", "সাইজ")}>
          {card.sizes.map(s => <button key={s} type="button" className="asst-option" aria-pressed={size === s} disabled={variantSoldOut(product, s, color)} onClick={() => setSize(s)}>{s}</button>)}
        </div>}
        <button type="button" className={`asst-add${added ? " is-added" : ""}`} onClick={add} disabled={blocked}>
          {added ? <Check size={14} aria-hidden="true" /> : <ShoppingBag size={14} aria-hidden="true" />}{added ? t("Added", "যোগ হয়েছে") : t("Add", "যোগ করুন")}</button>
      </div>}
      {added && <button type="button" className="asst-link-btn" onClick={() => window.dispatchEvent(new Event("oanro-open-bag"))}>{t("Open bag", "ব্যাগ খুলুন")}</button>}
      <p role="status" className="asst-sr">{added ? t("Added to bag", "ব্যাগে যোগ হয়েছে") : ""}</p>
      {problem && <p className="asst-notice" role="alert">{problem}</p>}
    </div>
  </article>;
}
