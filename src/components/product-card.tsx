"use client";

// The store's product card (approved design) and the quick-view dialog. Cards show live catalog data;
// the heart, compare and quick-view controls work for everyone. Quick view uses the same colour/size
// and stock rules as the product page and adds to the real bag; the server re-checks price and stock
// at checkout.

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Eye, Heart, Plus, ShoppingBag, X } from "lucide-react";
import Link from "./locale-link";
import { PriceTag, ProductPhoto } from "./shell";
import { useLocale } from "./locale";
import { useProducts } from "./products-context";
import type { Product } from "@/lib/catalog";
import { variantSoldOut } from "@/lib/catalog";
import { addToCart } from "@/lib/cart";
import { track } from "@/lib/meta-pixel";
import {
  COMPARE_LIMIT,
  syncWishlistOnce,
  toggleCompare,
  toggleWishlist,
  useCompare,
  useWishlist,
} from "@/lib/saved-lists";

/** Opens the quick-view dialog for a product (handled once by <QuickViewHost/>). */
export function openQuickView(slug: string) {
  window.dispatchEvent(new CustomEvent("oanro-quick-view", { detail: slug }));
}

/** Short announcement for screen readers and sighted users (compare list full, saved, …). */
function announce(message: string) {
  window.dispatchEvent(new CustomEvent("oanro-toast", { detail: message }));
}

export function ProductCard({ product, label }: { product: Product; label?: string }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const name = bn && product.bn ? product.bn.name : product.name;
  const tagline = bn && product.bn ? product.bn.tagline : product.tagline;
  const category = bn && product.bn ? product.bn.category : product.category;
  const saved = useWishlist().includes(product.slug);
  const compared = useCompare().includes(product.slug);
  const out = product.inStock === false;
  return (
    <article className={`o-product${out ? " is-out" : ""}`}>
      <div className="o-product-image">
        <Link className="o-image-link" href={`/products/${product.slug}`} aria-label={name}>
          <ProductPhoto position={product.position} image={product.image} label={name} />
        </Link>
        <button
          type="button"
          className={`o-save${saved ? " selected" : ""}`}
          aria-label={
            saved
              ? t(`Remove ${name} from wishlist`, `${name} পছন্দের তালিকা থেকে সরান`)
              : t(`Save ${name} to wishlist`, `${name} পছন্দের তালিকায় রাখুন`)
          }
          aria-pressed={saved}
          onClick={() => {
            const now = toggleWishlist(product.slug);
            announce(
              now
                ? t("Saved to your wishlist", "পছন্দের তালিকায় রাখা হয়েছে")
                : t("Removed from your wishlist", "পছন্দের তালিকা থেকে সরানো হয়েছে"),
            );
          }}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} />
        </button>
        <span className="o-image-label">
          {out ? t("Out of stock", "স্টক শেষ") : (label ?? category)}
        </span>
        <button type="button" className="o-quick" onClick={() => openQuickView(product.slug)}>
          <Eye size={15} aria-hidden="true" />
          {t("Quick view", "এক নজরে")}
          <span className="o-sr"> – {name}</span>
        </button>
      </div>
      <div className="o-product-copy">
        <Link className="o-text-button" href={`/products/${product.slug}`}>
          <h3>{name}</h3>
        </Link>
        <ArrowUpRight size={21} aria-hidden="true" />
      </div>
      <p>{tagline}</p>
      <div className="o-price-row">
        <PriceTag price={product.price} compareAt={product.compareAt} locale={locale} />
        <button
          type="button"
          onClick={() => {
            if (!toggleCompare(product.slug))
              announce(
                t(
                  `You can compare up to ${COMPARE_LIMIT} products.`,
                  `সর্বোচ্চ ${COMPARE_LIMIT}টি পণ্য তুলনা করা যায়।`,
                ),
              );
          }}
          aria-pressed={compared}
        >
          {compared ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Plus size={14} aria-hidden="true" />
          )}{" "}
          {t("Compare", "তুলনা")}
          <span className="o-sr"> – {name}</span>
        </button>
      </div>
    </article>
  );
}

/** One quick-view dialog for the whole site, opened by openQuickView(slug). */
export function QuickViewHost() {
  const products = useProducts();
  const [slug, setSlug] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const open = (e: Event) => {
      opener.current = document.activeElement as HTMLElement | null;
      setSlug((e as CustomEvent<string>).detail);
    };
    window.addEventListener("oanro-quick-view", open);
    return () => window.removeEventListener("oanro-quick-view", open);
  }, []);
  const product = products.find(p => p.slug === slug) ?? null;
  useEffect(() => {
    if (product && !dialog.current?.open) dialog.current?.showModal();
  }, [product]);
  const close = () => {
    dialog.current?.close();
  };
  return (
    <dialog
      ref={dialog}
      className="o-quickview"
      aria-labelledby="o-quickview-title"
      onClose={() => {
        setSlug(null);
        opener.current?.focus();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {product && <QuickView key={product.slug} product={product} onClose={close} />}
    </dialog>
  );
}

function QuickView({ product, onClose }: { product: Product; onClose: () => void }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const name = bn && product.bn ? product.bn.name : product.name;
  const copy = bn && product.bn ? product.bn : product;
  const colors = product.colors ?? [];
  // Start on the first colour/size combination that is still available (same rule as the product page).
  const firstOpen = (colors.length ? colors.map(c => c.id) : [""])
    .flatMap(c => product.sizes.map(s => ({ c, s })))
    .find(o => !variantSoldOut(product, o.s, o.c));
  const [color, setColor] = useState(firstOpen?.c ?? colors[0]?.id ?? "");
  const [size, setSize] = useState(firstOpen?.s ?? product.sizes[0]);
  const [added, setAdded] = useState(false);
  const soldOut = variantSoldOut(product, size, color);
  const saved = useWishlist().includes(product.slug);
  const image = colors.find(c => c.id === color)?.image ?? product.image;
  return (
    <div className="o-quickview-body">
      <button
        type="button"
        className="o-modal-close"
        aria-label={t("Close quick view", "এক নজর বন্ধ করুন")}
        onClick={onClose}
        autoFocus
      >
        <X size={20} />
      </button>
      <div className="o-quickview-photo">
        <ProductPhoto position={product.position} image={image} label={name} />
      </div>
      <div className="o-quickview-copy">
        <span className="o-eyebrow">
          {bn && product.bn ? product.bn.category : product.category}
        </span>
        <h2 id="o-quickview-title">{name}</h2>
        <p>{copy.tagline}</p>
        <PriceTag
          price={product.price}
          compareAt={product.compareAt}
          locale={locale}
          className="o-detail-price"
        />
        {colors.length > 0 && (
          <fieldset>
            <legend>{t("Colour", "রং")}</legend>
            <div className="o-choice-row">
              {colors.map(c => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={color === c.id}
                  onClick={() => setColor(c.id)}
                >
                  <i className="o-swatch" style={{ background: c.hex }} aria-hidden="true" />
                  {bn ? c.bn || c.name : c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {(product.sizes.length > 1 || !colors.length) && (
          <fieldset>
            <legend>{t("Size", "সাইজ")}</legend>
            <div className="o-choice-row">
              {product.sizes.map(s => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={size === s}
                  className={variantSoldOut(product, s, color) ? "is-soldout" : ""}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <p className="o-quickview-stock" role="status">
          {product.inStock === false
            ? t("Out of stock", "স্টক শেষ")
            : soldOut
              ? t(
                  "This colour/size is sold out. Pick another.",
                  "এই রং/সাইজটি স্টকে নেই। অন্যটি বেছে নিন।",
                )
              : product.left
                ? t(`Only ${product.left} left`, `মাত্র ${product.left}টি বাকি`)
                : t("In stock", "স্টকে আছে")}
        </p>
        <div className="o-actions">
          <button
            type="button"
            className="o-button"
            disabled={soldOut}
            onClick={() => {
              addToCart(product.slug, size, color);
              track("AddToCart", {
                content_ids: [product.slug],
                content_type: "product",
                value: product.price,
              });
              setAdded(true);
              onClose();
              window.dispatchEvent(new Event("oanro-open-bag"));
            }}
          >
            {soldOut
              ? t("Out of stock", "স্টক শেষ")
              : added
                ? t("Added", "যোগ হয়েছে")
                : t("Add to bag", "ব্যাগে যোগ করুন")}
            <ShoppingBag size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="o-button secondary"
            aria-pressed={saved}
            onClick={() => toggleWishlist(product.slug)}
          >
            {saved ? t("Saved", "রাখা হয়েছে") : t("Save", "রাখুন")}
            <Heart size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        </div>
        <Link className="o-underlined" href={`/products/${product.slug}`} onClick={onClose}>
          {t("See full details", "বিস্তারিত দেখুন")} <ArrowUpRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/** Keeps a signed-in shopper's wishlist in step with their account (runs once per page load). */
export function WishlistSync() {
  useEffect(() => {
    void syncWishlistOnce();
  }, []);
  return null;
}

/** Small status message at the bottom of the screen (wishlist saved, compare full…). */
export function ToastHost() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const show = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener("oanro-toast", show);
    return () => window.removeEventListener("oanro-toast", show);
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 4200);
    return () => clearTimeout(id);
  }, [message]);
  return (
    <div className="o-toast-region" role="status" aria-live="polite">
      {message && (
        <div className="o-toast">
          <Check size={18} aria-hidden="true" />
          <span>{message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
