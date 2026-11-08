import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/locale-link";
import { requestLocale } from "@/lib/request-locale";
import { siteSearch } from "@/lib/site-search";
import { getStoreProducts } from "@/lib/store-products";
import { ProductCard } from "@/components/product-card";

// Internal search results are not indexed (Google Search Essentials), but their links are followed.
export const metadata: Metadata = { title: "Search", robots: { index: false, follow: true } };

/** All results for a query: collections, products (as store cards) and Studio services. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = String((await searchParams).q ?? "").slice(0, 80);
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const [result, products] = await Promise.all([
    siteSearch(q, locale, 50).catch(() => null),
    getStoreProducts().catch(() => []),
  ]);
  const hits = result?.hits ?? [];
  const collections = hits.filter(h => h.type === "collection");
  const items = hits
    .filter(h => h.type === "product")
    .flatMap(h => products.filter(p => p.slug === h.slug));
  const services = hits.filter(h => h.type === "service");
  return (
    <main id="main-content" className="o-section">
      <div className="o-title">
        <span className="o-eyebrow">{t("SEARCH", "খুঁজুন")}</span>
        <h1>
          {q.trim()
            ? t(`Results for “${q.trim()}”`, `“${q.trim()}”-এর ফলাফল`)
            : t("Search OANRO", "OANRO-তে খুঁজুন")}
        </h1>
        <p role="status">
          {!result
            ? t(
                "Search is not available right now. Please try again.",
                "এই মুহূর্তে খোঁজা যাচ্ছে না। আবার চেষ্টা করুন।",
              )
            : q.trim().length < 2
              ? t(
                  "Type at least two letters in the search box above.",
                  "উপরের খোঁজার ঘরে অন্তত দুটি অক্ষর লিখুন।",
                )
              : t(`${result.total} results`, `${result.total}টি ফলাফল`)}
        </p>
      </div>
      {collections.length > 0 && (
        <section className="o-search-group" aria-labelledby="sr-collections">
          <h2 id="sr-collections">{t("Collections", "কালেকশন")}</h2>
          <div className="o-quick-links">
            {collections.map(c => (
              <Link key={c.slug} href={c.href}>
                {c.title} ({c.detail}) <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
      {items.length > 0 && (
        <section className="o-search-group" aria-labelledby="sr-products">
          <h2 id="sr-products">{t("Products", "পণ্য")}</h2>
          <div className="o-product-grid">
            {items.map(p => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
      {services.length > 0 && (
        <section className="o-search-group" aria-labelledby="sr-services">
          <h2 id="sr-services">{t("Studio services", "স্টুডিও সেবা")}</h2>
          <ul className="o-row-list">
            {services.map(s => (
              <li key={s.slug}>
                <div>
                  <b>{s.title}</b>
                  <small>{s.detail}</small>
                </div>
                <Link className="o-button secondary" href={s.href}>
                  {t("View service", "সেবা দেখুন")} <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {result && q.trim().length >= 2 && !hits.length && (
        <div className="o-empty">
          <h2>{t("No matches, yet.", "কোনো কিছু মেলেনি।")}</h2>
          <p>
            {t(
              "Try another word, or tell us what you need.",
              "অন্য শব্দে খুঁজুন, অথবা কী দরকার জানান।",
            )}
          </p>
          <div className="o-actions">
            <Link className="o-button" href="/shop">
              {t("Browse the store", "স্টোর দেখুন")}
            </Link>
            <Link className="o-button secondary" href="/contact">
              {t("Ask us", "জিজ্ঞাসা করুন")}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
