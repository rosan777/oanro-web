"use client";

// Wishlist and Compare pages (approved design). Both read the live catalog: a saved product that is no
// longer on sale simply drops out, and prices or stock are never taken from the saved list.

import { ArrowUpRight, Heart, ShoppingBag, X } from "lucide-react";
import Link from "./locale-link";
import { useLocale } from "./locale";
import { useProductLines, useProducts } from "./products-context";
import { PriceTag, ProductPhoto } from "./shell";
import { ProductCard, openQuickView } from "./product-card";
import { removeFromCompare, toggleWishlist, useCompare, useWishlist } from "@/lib/saved-lists";

function Empty({ heading, text, bn }: { heading: string; text: string; bn: boolean }) {
  return (
    <div className="o-empty">
      <Heart size={38} aria-hidden="true" />
      <h2>{heading}</h2>
      <p>{text}</p>
      <Link className="o-button" href="/shop">
        {bn ? "কালেকশন দেখুন" : "Explore the collection"}
        <ArrowUpRight size={17} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function WishlistView({ signedIn }: { signedIn: boolean }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const saved = useWishlist();
  const products = useProducts();
  const items = saved.flatMap(slug => products.filter(p => p.slug === slug));
  return (
    <section className="o-section">
      <div className="o-title">
        <span className="o-eyebrow">{t("SAVED FOR LATER", "পরে কেনার জন্য")}</span>
        <h1>{t("A little wish list.", "ছোট্ট পছন্দের তালিকা।")}</h1>
        <p>
          {signedIn
            ? t(
                "Your saved products, kept with your account.",
                "আপনার রাখা পণ্য, আপনার অ্যাকাউন্টে সংরক্ষিত।",
              )
            : t(
                "Saved in this browser. Sign in to keep your list on every device.",
                "এই ব্রাউজারে রাখা আছে। সব ডিভাইসে রাখতে সাইন ইন করুন।",
              )}
          {!signedIn && (
            <>
              {" "}
              <Link className="o-underlined" href="/sign-in?next=/wishlist">
                {t("Sign in", "সাইন ইন")}
              </Link>
            </>
          )}
        </p>
      </div>
      {items.length ? (
        <div className="o-product-grid">
          {items.map(p => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          bn={bn}
          heading={t("Your favourites start here.", "আপনার পছন্দের শুরু এখানে।")}
          text={t(
            "Tap the heart on any product to save it here.",
            "যেকোনো পণ্যের হার্টে চাপুন, এখানে জমা হবে।",
          )}
        />
      )}
    </section>
  );
}

export function CompareView() {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const chosen = useCompare();
  const saved = useWishlist();
  const products = useProducts();
  const lines = useProductLines();
  const items = chosen.flatMap(slug => products.filter(p => p.slug === slug));
  const collectionName = (id?: string) => {
    const c = lines.find(l => l.collection.id === (id ?? "seasonal"))?.collection;
    return c ? (bn && c.bn ? c.bn.name : c.name) : "";
  };
  const rows: [string, (p: (typeof items)[number]) => React.ReactNode][] = [
    [t("Price", "দাম"), p => <PriceTag price={p.price} compareAt={p.compareAt} locale={locale} />],
    [
      t("Availability", "স্টক"),
      p =>
        p.inStock === false
          ? t("Out of stock", "স্টক শেষ")
          : p.left
            ? t(`Only ${p.left} left`, `মাত্র ${p.left}টি বাকি`)
            : t("In stock", "স্টকে আছে"),
    ],
    [t("Collection", "কালেকশন"), p => collectionName(p.collectionId)],
    [t("Sizes", "সাইজ"), p => p.sizes.join(", ")],
    [
      t("Colours", "রং"),
      p => (p.colors?.length ? p.colors.map(c => (bn ? c.bn || c.name : c.name)).join(", ") : "—"),
    ],
    [t("In short", "সংক্ষেপে"), p => (bn && p.bn ? p.bn.tagline : p.tagline)],
  ];
  return (
    <section className="o-section">
      <div className="o-title">
        <span className="o-eyebrow">{t("SIDE BY SIDE", "পাশাপাশি")}</span>
        <h1>{t("The details make the difference.", "বিস্তারিতেই পার্থক্য।")}</h1>
        <p>
          {t(
            "Choose up to three products from the collection to compare.",
            "কালেকশন থেকে সর্বোচ্চ তিনটি পণ্য বেছে তুলনা করুন।",
          )}
        </p>
      </div>
      {items.length ? (
        <div className="o-table-wrap o-comparison-wrap">
          <table className="o-compare-table">
            <caption className="o-sr">{t("Product comparison", "পণ্যের তুলনা")}</caption>
            <thead>
              <tr>
                <td />
                {items.map(p => {
                  const name = bn && p.bn ? p.bn.name : p.name;
                  return (
                    <th key={p.slug} scope="col">
                      <ProductPhoto position={p.position} image={p.image} label={name} />
                      <Link href={`/products/${p.slug}`}>{name}</Link>
                      <button
                        type="button"
                        className="o-compare-remove"
                        onClick={() => removeFromCompare(p.slug)}
                        aria-label={t(`Remove ${name} from comparison`, `${name} তুলনা থেকে সরান`)}
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, cell]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {items.map(p => (
                    <td key={p.slug}>{cell(p)}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">
                  <span className="o-sr">{t("Actions", "কাজ")}</span>
                </th>
                {items.map(p => (
                  <td key={p.slug}>
                    <div className="o-compare-actions">
                      <button
                        type="button"
                        className="o-button"
                        disabled={p.inStock === false}
                        onClick={() => openQuickView(p.slug)}
                      >
                        {t("Choose & add", "বেছে ব্যাগে নিন")}{" "}
                        <ShoppingBag size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="o-button secondary"
                        aria-pressed={saved.includes(p.slug)}
                        onClick={() => toggleWishlist(p.slug)}
                      >
                        {saved.includes(p.slug) ? t("Saved", "রাখা হয়েছে") : t("Save", "রাখুন")}
                        <Heart
                          size={16}
                          fill={saved.includes(p.slug) ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          bn={bn}
          heading={t("Make a considered choice.", "ভেবেচিন্তে বেছে নিন।")}
          text={t(
            "Choose Compare on a product card to add it here.",
            "পণ্য কার্ডে “তুলনা” চাপুন, এখানে যোগ হবে।",
          )}
        />
      )}
    </section>
  );
}
