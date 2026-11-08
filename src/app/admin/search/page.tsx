import { requireAdminPage } from "@/lib/admin-guard";
import {
  catalogDb,
  getStoreCollections,
  getStoreProducts,
  getStoreServices,
} from "@/lib/store-products";
import { parseRange, rangeBounds, reportRanges } from "@/lib/report-store";
import { RETENTION_DAYS, searchInsights } from "@/lib/search-insights";
import { requestLocale } from "@/lib/request-locale";
import { AdminBack } from "@/components/admin-nav";
import Link from "@/components/locale-link";
export const dynamic = "force-dynamic";

/**
 * Search insights: what visitors look for (Analytics-consent searches only). Uses the existing
 * "Sales & stock report" permission (reports.read): no new permission was added.
 */
export default async function SearchInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage("reports.read");
  const range = parseRange((await searchParams).range);
  const { from, prevFrom } = rangeBounds(range);
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const db = catalogDb();
  const [r, products, services, collections] = await Promise.all([
    searchInsights(db, from, prevFrom).catch(() => null),
    getStoreProducts().catch(() => []),
    getStoreServices().catch(() => []),
    getStoreCollections().catch(() => []),
  ]);
  const name = (type: string, slug: string) =>
    type === "product"
      ? (products.find(p => p.slug === slug)?.name ?? slug)
      : type === "service"
        ? (services.find(s => s.slug === slug)?.title ?? slug)
        : (collections.find(c => c.slug === slug)?.name ?? slug);
  const change = (now: number, before: number) =>
    !from
      ? ""
      : before === 0
        ? now
          ? t("new", "নতুন")
          : "—"
        : `${now >= before ? "+" : ""}${Math.round(((now - before) / before) * 100)}%`;
  const rangeLabel: Record<string, [string, string]> = {
    today: ["Today", "আজ"],
    "7d": ["7 days", "৭ দিন"],
    "30d": ["30 days", "৩০ দিন"],
    "90d": ["90 days", "৯০ দিন"],
    "365d": ["12 months", "১২ মাস"],
    all: ["All time", "সব সময়"],
  };
  return (
    <main id="main-content" className="container auth-page o-admin-insights">
      <AdminBack />
      <h1>{t("Search insights", "সার্চ ইনসাইট")}</h1>
      <p>
        {t(
          `What visitors searched for on the website, from visitors who allowed Analytics cookies. This shows interest, not sales: compare with the Sales & stock report before restocking. Personal-looking searches are never stored; data is kept ${RETENTION_DAYS} days.`,
          `ওয়েবসাইটে ভিজিটররা কী খুঁজেছেন (যাঁরা Analytics কুকি অনুমতি দিয়েছেন)। এটি আগ্রহ দেখায়, বিক্রি নয়: স্টক বাড়ানোর আগে সেলস ও স্টক রিপোর্টের সাথে মিলিয়ে নিন। ব্যক্তিগত তথ্যের মতো দেখায় এমন সার্চ কখনো সংরক্ষণ হয় না; ডেটা ${RETENTION_DAYS} দিন রাখা হয়।`,
        )}
      </p>
      <nav className="o-range-tabs" aria-label={t("Date range", "সময়কাল")}>
        {reportRanges.map(k => (
          <Link
            key={k}
            href={`/admin/search?range=${k}`}
            aria-current={k === range ? "page" : undefined}
            className={k === range ? "active" : ""}
          >
            {rangeLabel[k][bn ? 1 : 0]}
          </Link>
        ))}
      </nav>
      {!r ? (
        <p className="admin-callout">
          {t(
            "Search insights need the latest database migration.",
            "সার্চ ইনসাইটের জন্য সর্বশেষ ডেটাবেস মাইগ্রেশন দরকার।",
          )}
        </p>
      ) : (
        <>
          <section className="o-metrics" aria-label={t("Summary", "সারসংক্ষেপ")}>
            <div>
              <span>{t("Searches", "সার্চ")}</span>
              <strong>{r.searches}</strong>
              <small>
                {from
                  ? `${change(r.searches, r.prevSearches)} ${t("vs previous period", "আগের সময়ের তুলনায়")}`
                  : t("All time", "সব সময়")}
              </small>
            </div>
            <div>
              <span>{t("Click rate", "ক্লিক রেট")}</span>
              <strong>{r.clickRate}%</strong>
              <small>
                {t("Searches where a result was opened", "যেসব সার্চে কোনো ফলাফল খোলা হয়েছে")}
              </small>
            </div>
            <div>
              <span>{t("No results", "ফলাফল নেই")}</span>
              <strong>{r.zeroRate}%</strong>
              <small>{t("Searches that found nothing", "যেসব সার্চে কিছু পাওয়া যায়নি")}</small>
            </div>
            <div>
              <span>{t("Different terms", "ভিন্ন শব্দ")}</span>
              <strong>{r.terms.length}</strong>
              <small>{t("Top 25 shown below", "নিচে শীর্ষ ২৫টি")}</small>
            </div>
          </section>

          <div className="o-dashboard-panels">
            <section className="o-panel">
              <h2>{t("Top search terms", "শীর্ষ সার্চ শব্দ")}</h2>
              <div className="o-table-wrap">
                <table className="o-admin-table">
                  <thead>
                    <tr>
                      <th scope="col">{t("Term", "শব্দ")}</th>
                      <th scope="col">{t("Searches", "সার্চ")}</th>
                      <th scope="col">{t("Trend", "প্রবণতা")}</th>
                      <th scope="col">{t("Clicks", "ক্লিক")}</th>
                      <th scope="col">{t("Avg. results", "গড় ফলাফল")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.terms.map(x => (
                      <tr key={x.term}>
                        <td>{x.term}</td>
                        <td>{x.searches}</td>
                        <td>{change(x.searches, x.previous)}</td>
                        <td>{x.clicks}</td>
                        <td>{x.results}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!r.terms.length && (
                  <p className="o-table-empty">
                    {t("No searches in this period yet.", "এই সময়ে এখনো কোনো সার্চ নেই।")}
                  </p>
                )}
              </div>
            </section>
            <section className="o-panel">
              <h2>{t("Searches with no results", "ফলাফলহীন সার্চ")}</h2>
              <p className="o-muted">
                {t(
                  "Ideas for new products, better names or synonyms.",
                  "নতুন পণ্য, ভালো নাম বা সমার্থক শব্দের আইডিয়া।",
                )}
              </p>
              <ul className="o-row-list">
                {r.zeroTerms.map(x => (
                  <li key={x.term}>
                    <span>{x.term}</span>
                    <b>{x.zero}</b>
                  </li>
                ))}
              </ul>
              {!r.zeroTerms.length && (
                <p className="o-muted">{t("None in this period.", "এই সময়ে নেই।")}</p>
              )}
            </section>
          </div>

          <div className="o-dashboard-panels">
            <section className="o-panel">
              <h2>{t("Most opened results", "সবচেয়ে বেশি খোলা ফলাফল")}</h2>
              <ul className="o-row-list">
                {r.topItems.map(i => (
                  <li key={`${i.type}:${i.slug}`}>
                    <div>
                      <b>{name(i.type, i.slug)}</b>
                      <small>
                        {i.type === "product"
                          ? t("Product", "পণ্য")
                          : i.type === "service"
                            ? t("Service", "সেবা")
                            : t("Collection", "কালেকশন")}{" "}
                        · {t(`average position ${i.avgPosition}`, `গড় অবস্থান ${i.avgPosition}`)}
                      </small>
                    </div>
                    <b>{i.clicks}</b>
                  </li>
                ))}
              </ul>
              {!r.topItems.length && (
                <p className="o-muted">
                  {t("No result clicks in this period.", "এই সময়ে কোনো ক্লিক নেই।")}
                </p>
              )}
            </section>
            <section className="o-panel">
              <h2>{t("Category interest", "ক্যাটাগরিতে আগ্রহ")}</h2>
              <p className="o-muted">
                {t(
                  "Opened results grouped by collection (search interest, not sales).",
                  "খোলা ফলাফল কালেকশন অনুযায়ী (সার্চে আগ্রহ, বিক্রি নয়)।",
                )}
              </p>
              <ul className="o-row-list">
                {r.interest.map(i => (
                  <li key={i.name}>
                    <span>{i.name}</span>
                    <b>{i.clicks}</b>
                  </li>
                ))}
              </ul>
              {!r.interest.length && (
                <p className="o-muted">{t("Nothing yet.", "এখনো কিছু নেই।")}</p>
              )}
            </section>
          </div>
          <p className="o-muted">
            {t(
              "Counting: one search per search box and query once results have been shown for about a second (or on Enter); one click per search; nothing is counted without Analytics consent.",
              "গণনা: ফলাফল প্রায় এক সেকেন্ড দেখানোর পর (বা Enter চাপলে) প্রতিটি সার্চ বক্স ও শব্দে একটি সার্চ; প্রতি সার্চে একটি ক্লিক; Analytics অনুমতি ছাড়া কিছুই গোনা হয় না।",
            )}
          </p>
        </>
      )}
    </main>
  );
}
