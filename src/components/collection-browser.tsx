"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ShoppingBag } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/catalog";
import { rank } from "@/lib/smart-search";
import { useCompare } from "@/lib/saved-lists";
import { useLocale } from "./locale";
import { useFeature } from "./site-content-context";
import { ProductCard } from "./product-card";
import Link from "./locale-link";

type Sort = "featured" | "price-asc" | "price-desc";
export type BrowserCollection = { id: string; slug: string; name: string; bn?: string };

/**
 * Shop grid of the approved design with search, filters and sorting, all in the browser (no reloads).
 * Filters: collection (only on /shop), in stock, size, colour, budget (max price). Search uses the
 * forgiving English/Bangla smart search. Admin → Website content → "Filters and sorting" switches the
 * filter panel off, leaving the plain grid.
 */
export function CollectionBrowser({
  items,
  collections,
  initialQuery = "",
  initialCollection = null,
}: {
  items: Product[];
  collections?: BrowserCollection[];
  initialQuery?: string;
  initialCollection?: string | null;
}) {
  const filtersOn = useFeature("filters");
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const compared = useCompare();

  // Filter choices built from the products shown: sizes (generic ones left out), colours and the top price.

  const sizes = useMemo(
    () =>
      [...new Set(items.flatMap(p => p.sizes))].filter(s => s && !/^(standard|one size)$/i.test(s)),
    [items],
  );
  const colors = useMemo(() => {
    const m = new Map<string, { name: string; bn: string; hex: string }>();
    items.forEach(p =>
      p.colors?.forEach(c => {
        if (!m.has(c.name)) m.set(c.name, c);
      }),
    );
    return [...m.values()];
  }, [items]);
  const top = Math.max(0, ...items.map(p => p.price));
  const [query, setQuery] = useState(initialQuery);
  const [collection, setCollection] = useState<string | null>(
    collections?.some(c => c.id === initialCollection) ? initialCollection : null,
  );
  const [sort, setSort] = useState<Sort>("featured");
  const [inStock, setInStock] = useState(false);
  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [max, setMax] = useState(top);
  const inCollection = (p: Product, id: string) => (p.collectionId ?? "seasonal") === id;

  // Products that pass every active filter, in the chosen order (search relevance first when searching).

  const shown = useMemo(() => {
    const searched = query.trim()
      ? rank(query, items, p => [
          { text: `${p.name} ${p.bn?.name ?? ""}`, weight: 3 },
          { text: `${p.category} ${p.bn?.category ?? ""}`, weight: 2 },
          { text: `${p.tagline} ${p.bn?.tagline ?? ""}`, weight: 1 },
        ])
      : items;
    const list = searched.filter(
      p =>
        (!collection || inCollection(p, collection)) &&
        (!inStock || p.inStock !== false) &&
        (!size || p.sizes.includes(size)) &&
        (!color || p.colors?.some(c => c.name === color)) &&
        p.price <= max,
    );
    return sort === "featured"
      ? list
      : [...list].sort((a, b) => (sort === "price-asc" ? a.price - b.price : b.price - a.price));
  }, [items, query, collection, inStock, size, color, max, sort]);
  const active = Boolean(query.trim() || collection || inStock || size || color || max < top);
  const reset = () => {
    setQuery("");
    setCollection(null);
    setInStock(false);
    setSize(null);
    setColor(null);
    setMax(top);
  };

  // With one product, or filters switched off in admin, show the plain grid.

  if (items.length < 2 || !filtersOn)
    return (
      <div className="o-product-grid">
        {items.map(p => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    );
  return (
    <>
      <div className="o-shop-tools">
        <label className="o-search">
          <Search size={18} aria-hidden="true" />
          <span className="o-sr">{t("Search products", "পণ্য খুঁজুন")}</span>
          <input
            type="search"
            placeholder={t("Find your next favourite…", "পছন্দের পণ্য খুঁজুন…")}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </label>
        <label className="o-select">
          {t("Sort", "সাজান")}
          <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="featured">{t("Featured", "বাছাই করা")}</option>
            <option value="price-asc">{t("Price: low to high", "দাম: কম থেকে বেশি")}</option>
            <option value="price-desc">{t("Price: high to low", "দাম: বেশি থেকে কম")}</option>
          </select>
        </label>
      </div>
      <div className="o-shop-layout">
        <aside className="o-filters" aria-label={t("Filters", "ফিল্টার")}>
          <span className="o-eyebrow">
            <SlidersHorizontal size={14} aria-hidden="true" /> {t("Refine your edit", "বাছাই করুন")}
          </span>
          {collections && collections.length > 1 && (
            <>
              <h3>{t("Collection", "কালেকশন")}</h3>
              <button
                type="button"
                className={!collection ? "active" : ""}
                aria-pressed={!collection}
                onClick={() => setCollection(null)}
              >
                {t("All", "সব")}
                <span>{items.length}</span>
              </button>
              {collections.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={collection === c.id ? "active" : ""}
                  aria-pressed={collection === c.id}
                  onClick={() => setCollection(collection === c.id ? null : c.id)}
                >
                  {bn && c.bn ? c.bn : c.name}
                  <span>{items.filter(p => inCollection(p, c.id)).length}</span>
                </button>
              ))}
            </>
          )}
          <h3>{t("Availability", "স্টক")}</h3>
          <label className="o-check">
            <input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} />
            {t("In stock only", "শুধু স্টকে আছে")}
          </label>
          {sizes.length > 1 && (
            <>
              <h3>{t("Size", "সাইজ")}</h3>
              <div className="o-filter-chips" role="group" aria-label={t("Size", "সাইজ")}>
                {sizes.map(s => (
                  <button
                    type="button"
                    key={s}
                    aria-pressed={size === s}
                    onClick={() => setSize(size === s ? null : s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}
          {colors.length > 1 && (
            <>
              <h3>{t("Colour", "রং")}</h3>
              <div
                className="o-filter-chips o-filter-colors"
                role="group"
                aria-label={t("Colour", "রং")}
              >
                {colors.map(c => (
                  <button
                    type="button"
                    key={c.name}
                    aria-pressed={color === c.name}
                    title={bn ? c.bn : c.name}
                    aria-label={bn ? c.bn : c.name}
                    onClick={() => setColor(color === c.name ? null : c.name)}
                  >
                    <span style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </>
          )}
          {top > 0 && (
            <>
              <h3>{t("Your budget", "আপনার বাজেট")}</h3>
              <label htmlFor="o-budget">
                {t("Up to", "সর্বোচ্চ")} {formatPrice(max, locale)}
              </label>
              <input
                id="o-budget"
                type="range"
                min={0}
                max={top}
                step={Math.max(10, Math.round(top / 50 / 10) * 10)}
                value={max}
                onChange={e => setMax(Number(e.target.value))}
              />
            </>
          )}
          {active && (
            <button type="button" className="o-underlined" onClick={reset}>
              {t("Reset filters", "ফিল্টার রিসেট")}
            </button>
          )}
          <div className="o-filter-note">
            ✳<p>{t("Less searching. More finding.", "সহজে খুঁজুন। পছন্দটা বেছে নিন।")}</p>
          </div>
        </aside>
        <div>
          <div className="o-results">
            <span role="status">
              {t(
                `${shown.length} of ${items.length} products`,
                `${items.length}টির মধ্যে ${shown.length}টি পণ্য`,
              )}
            </span>
            <Link href="/compare">
              {t("Compare", "তুলনা")} ({compared.length}) →
            </Link>
          </div>
          {shown.length ? (
            <div className="o-product-grid">
              {shown.map(p => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          ) : (
            <div className="o-empty">
              <ShoppingBag size={38} aria-hidden="true" />
              <h2>{t("No matches, yet.", "কোনো পণ্য মেলেনি।")}</h2>
              <p>
                {t(
                  "Try a different search or widen your budget.",
                  "অন্য নামে খুঁজুন বা বাজেট বাড়ান।",
                )}
              </p>
              <button type="button" className="o-button" onClick={reset}>
                {t("Clear filters", "ফিল্টার মুছুন")}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
