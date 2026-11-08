import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { listSubscribers, subscriberCounts } from "@/lib/marketing";
import { requestLocale } from "@/lib/request-locale";
import { formatDhaka } from "@/lib/dhaka-time";
import { AdminBack } from "@/components/admin-nav";
import Link from "@/components/locale-link";
export const dynamic = "force-dynamic";

/**
 * Newsletter subscribers: status, consent time and source (existing newsletter.read permission).
 * Unsubscribed addresses are kept only to record the choice and are never mailed.
 */
export default async function NewsletterAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage("newsletter.read");
  const q = String((await searchParams).q ?? "").slice(0, 100);
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const db = catalogDb();
  const [rows, counts] = await Promise.all([
    listSubscribers(db, q).catch(() => null),
    subscriberCounts(db).catch(() => null),
  ]);
  return (
    <main id="main-content" className="container auth-page">
      <AdminBack />
      <h1>{t("Newsletter subscribers", "নিউজলেটার সাবস্ক্রাইবার")}</h1>
      <p>
        {t(
          "People who asked for offers by email, with when and where they agreed. Unsubscribed addresses are kept only to remember the choice and never receive marketing emails.",
          "যাঁরা ইমেইলে অফার পেতে চেয়েছেন, কখন ও কোথায় সম্মতি দিয়েছেন সহ। আনসাবস্ক্রাইব করা ঠিকানা শুধু সিদ্ধান্তটি মনে রাখার জন্য রাখা হয়; তাঁদের কখনো মার্কেটিং ইমেইল পাঠানো হয় না।",
        )}
      </p>
      {counts && (
        <section className="o-metrics" aria-label={t("Summary", "সারসংক্ষেপ")}>
          <div>
            <span>{t("Subscribed", "সাবস্ক্রাইবড")}</span>
            <strong>{counts.active}</strong>
          </div>
          <div>
            <span>{t("Unsubscribed", "আনসাবস্ক্রাইবড")}</span>
            <strong>{counts.unsubscribed}</strong>
          </div>
        </section>
      )}
      <form className="o-table-tools" role="search">
        <label className="o-search">
          <span className="o-sr">{t("Search by email", "ইমেইল দিয়ে খুঁজুন")}</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("Search by email", "ইমেইল দিয়ে খুঁজুন")}
          />
        </label>
        <button className="o-button secondary">{t("Search", "খুঁজুন")}</button>
        {/* The newsletter export uses the same newsletter.read permission as this page. */}
        <Link className="o-underlined" href="/api/admin/export?type=newsletter">
          {t("Export CSV", "CSV এক্সপোর্ট")}
        </Link>
      </form>
      {rows ? (
        <div className="o-table-wrap">
          <table className="o-admin-table">
            <thead>
              <tr>
                <th scope="col">{t("Email", "ইমেইল")}</th>
                <th scope="col">{t("Status", "অবস্থা")}</th>
                <th scope="col">{t("Consent given", "সম্মতির সময়")}</th>
                <th scope="col">{t("Source", "উৎস")}</th>
                <th scope="col">{t("Language", "ভাষা")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.email}>
                  <td>{r.email}</td>
                  <td>
                    <span className="o-status">
                      {r.unsubscribedAt
                        ? `${t("Unsubscribed", "আনসাবস্ক্রাইবড")} ${formatDhaka(r.unsubscribedAt, locale)}`
                        : t("Subscribed", "সাবস্ক্রাইবড")}
                    </span>
                  </td>
                  <td>{formatDhaka(r.consentAt, locale, { year: true, time: true })}</td>
                  <td>
                    {r.source === "account"
                      ? t("Account preferences", "অ্যাকাউন্ট সেটিংস")
                      : t("Website footer", "ওয়েবসাইটের ফুটার")}
                  </td>
                  <td>{r.locale === "bn" ? "বাংলা" : "English"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="o-table-empty">
              {t("No subscribers found.", "কোনো সাবস্ক্রাইবার পাওয়া যায়নি।")}
            </p>
          )}
        </div>
      ) : (
        <p className="admin-callout">
          {t(
            "Subscribers need the latest database migration.",
            "সাবস্ক্রাইবারের জন্য সর্বশেষ ডেটাবেস মাইগ্রেশন দরকার।",
          )}
        </p>
      )}
    </main>
  );
}
