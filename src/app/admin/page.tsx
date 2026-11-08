import { requestLocale } from "@/lib/request-locale";
import { adminTextFor } from "@/lib/admin-text-server";
import { Localized } from "@/components/locale";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { todayData } from "@/lib/admin-today";
import { formatPrice } from "@/lib/catalog";
import { formatDhaka } from "@/lib/dhaka-time";
import { canProduct } from "@/lib/permissions";
export const dynamic = "force-dynamic";

/** "2 h ago" style time; older than a day shows the date. */
function ago(value: Date | string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return formatDhaka(value, "en");
}
const kindText: Record<string, string> = {
  product: "Product question",
  restock: "Restock request",
  service: "Studio / service",
  general: "General",
  privacy: "Privacy request",
};

/** Admin home: what needs attention now, quick actions and recent activity. */
export default async function TodayPage() {
  const tr = adminTextFor((await requestLocale()).locale);
  const { access } = await requireAdminPage();
  const has = (p: Parameters<typeof access.permissions.has>[0]) => access.permissions.has(p);
  const data = await todayData(catalogDb(), access).catch(() => null);
  if (!data)
    return (
      <main id="main-content" className="container auth-page admin-today">
        <h1>
          <Localized en="Today" bn="আজ" />
        </h1>
        <p className="admin-callout">
          Could not load today&apos;s numbers. Run <code>npm run db:migrate</code>, then reload.
        </p>
      </main>
    );
  const { payments, inquiries, lowStock, paidToday, activity } = data;
  const taskCount = payments.length + inquiries.length + lowStock.length;
  const stockHref = has("reports.read") ? "/admin/reports/sales" : "/admin/sections";
  return (
    <main id="main-content" className="container auth-page admin-today">
      <h1>
        <Localized en="Today" bn="আজ" />
      </h1>
      <p className="admin-today-intro">
        {taskCount
          ? `${taskCount} thing${taskCount === 1 ? "" : "s"} need${taskCount === 1 ? "s" : ""} you. Oldest first.`
          : "All clear. Nothing is waiting for you."}
      </p>

      <div className="today-stats">
        {has("orders.read") && (
          <Link href="/admin/orders" className={`today-stat${payments.length ? " is-alert" : ""}`}>
            <span>
              <Localized en="Payments to check" bn="চেক করার পেমেন্ট" />
            </span>
            <strong>{payments.length}</strong>
            <small>
              <Localized en="Open orders →" bn="অর্ডার খুলুন →" />
            </small>
          </Link>
        )}
        {has("leads.read") && (
          <Link href="/admin/leads" className="today-stat">
            <span>
              <Localized en="New inquiries" bn="নতুন ইনকোয়ারি" />
            </span>
            <strong>{inquiries.length}</strong>
            <small>
              <Localized en="Open inquiries →" bn="ইনকোয়ারি খুলুন →" />
            </small>
          </Link>
        )}
        {(access.owner || has("products.manage") || has("reports.read")) && (
          <Link href={stockHref} className="today-stat">
            <span>
              <Localized en="Low or out of stock" bn="কম বা স্টক শেষ" />
            </span>
            <strong>{lowStock.length}</strong>
            <small>
              <Localized en="Restock →" bn="স্টক বাড়ান →" />
            </small>
          </Link>
        )}
        {paidToday && (
          <Link href="/admin/reports/sales" className="today-stat is-brand">
            <span>
              <Localized en="Approved today" bn="আজ অনুমোদিত" />
            </span>
            <strong>{formatPrice(paidToday.total)}</strong>
            <small>
              {paidToday.count} order{paidToday.count === 1 ? "" : "s"}
            </small>
          </Link>
        )}
      </div>

      <div className="today-grid">
        <section className="today-panel is-main" aria-labelledby="needs-you">
          <h2 id="needs-you">
            <Localized en="Needs you now" bn="এখনই আপনার কাজ" />
          </h2>
          {payments.map(o => (
            <div key={o.id} className="today-task">
              <span className="today-tag is-payment">PAYMENT</span>
              <div>
                <strong>
                  {o.code} · {o.name} sent {formatPrice(o.total)} by{" "}
                  {o.method === "bkash" ? "bKash" : "Nagad"}
                  {o.type === "cod" ? " (COD advance)" : ""}
                </strong>
                <small>
                  Trx {o.trxId} · {ago(o.at)}
                </small>
              </div>
              <Link
                className="btn btn-primary"
                href={`/admin/orders?open=${encodeURIComponent(o.id)}`}
              >
                <Localized en="Check payment" bn="পেমেন্ট চেক করুন" />
              </Link>
            </div>
          ))}
          {inquiries.map(l => (
            <div key={l.id} className="today-task">
              <span className="today-tag is-inquiry">INQUIRY</span>
              <div>
                <strong>
                  {l.name}
                  {l.subject ? `: ${l.subject}` : ""}
                </strong>
                <small>
                  {kindText[l.kind] ?? l.kind} · {ago(l.at)}
                </small>
              </div>
              <Link className="btn btn-primary" href="/admin/leads">
                {tr("Reply")}
              </Link>
            </div>
          ))}
          {lowStock.map(p => (
            <div key={p.id} className="today-task">
              <span className="today-tag is-stock">STOCK</span>
              <div>
                <strong>
                  {p.name} {p.stock === 0 ? "is sold out" : `has only ${p.stock} left`}
                </strong>
                <small>
                  <Localized en="Live on the website" bn="ওয়েবসাইটে লাইভ" />
                </small>
              </div>
              <Link className="btn btn-neutral" href={stockHref}>
                <Localized en="Restock" bn="স্টক বাড়ান" />
              </Link>
            </div>
          ))}
          {!taskCount && (
            <p className="today-empty">
              <Localized
                en="All clear. Nothing is waiting for you."
                bn="সব ঠিক আছে। আপনার জন্য কিছু অপেক্ষায় নেই।"
              />
            </p>
          )}
        </section>

        <div className="today-side">
          <section className="today-panel" aria-labelledby="quick">
            <h2 id="quick">
              <Localized en="Quick actions" bn="দ্রুত কাজ" />
            </h2>
            <div className="today-actions">
              {canProduct(has, "draft") && (
                <Link className="btn btn-neutral" href="/admin/sections">
                  <Localized en="Add or edit products" bn="পণ্য যোগ বা এডিট" />
                </Link>
              )}
              {has("campaigns.manage") && (
                <Link className="btn btn-neutral" href="/admin/campaigns">
                  <Localized en="Start a campaign" bn="ক্যাম্পেইন শুরু করুন" />
                </Link>
              )}
              {has("staff.manage") && (
                <Link className="btn btn-neutral" href="/admin/staff">
                  <Localized en="Invite a staff member" bn="স্টাফ আমন্ত্রণ" />
                </Link>
              )}
              {access.owner && (
                <Link className="btn btn-neutral" href="/admin/settings">
                  <Localized
                    en="Payment numbers & delivery rules"
                    bn="পেমেন্ট নম্বর ও ডেলিভারি নিয়ম"
                  />
                </Link>
              )}
              <a className="btn btn-neutral" href="/" target="_blank" rel="noreferrer">
                {tr("View the store ↗")}
              </a>
            </div>
          </section>
          {has("audit.read") && (
            <section className="today-panel" aria-labelledby="recent">
              <h2 id="recent">
                <Localized en="Recent activity" bn="সাম্প্রতিক কার্যক্রম" />
              </h2>
              {activity.length ? (
                <ul className="today-log">
                  {activity.map(a => (
                    <li key={a.id}>
                      <time dateTime={new Date(a.at).toISOString()}>{ago(a.at)}</time>
                      <span>
                        {a.name ?? "System"}: {a.reason || a.action}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="today-empty">
                  <Localized en="No activity yet." bn="এখনো কোনো কার্যক্রম নেই।" />
                </p>
              )}
              <div className="today-actions">
                <Link className="btn btn-neutral btn-sm" href="/admin/activity">
                  <Localized en="Full activity log" bn="পুরো কার্যক্রমের লগ" />
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
