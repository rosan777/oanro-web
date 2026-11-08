import { requestLocale } from "@/lib/request-locale";
import { adminTextFor } from "@/lib/admin-text-server";
import { Localized } from "@/components/locale";
import Link from "next/link";
import { and, count, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin-guard";
import { auditEvent, user } from "@/lib/db/schema";
import { catalogDb } from "@/lib/store-products";
import { formatDhaka } from "@/lib/dhaka-time";
import { AdminBack } from "@/components/admin-nav";
import { ActivityDeleteAll, ActivityDeleteOne } from "@/components/activity-delete";
export const dynamic = "force-dynamic";

// View of the append-only audit log: who changed what, and when. Entries can never be edited; only the owner can delete them.
const PAGE = 50;

// Area filter: each value is the start of the action names it matches ("order" → "order.approve"…).

const groups: [string, string][] = [
  ["", "Everything"],
  ["order", "Orders & payments"],
  ["product", "Products"],
  ["collection", "Sections"],
  ["staff", "Staff & roles"],
  ["role", "Roles"],
  ["campaign", "Campaigns"],
  ["service", "Services"],
  ["lead", "Inquiries"],
  ["pulse", "Global Pulse"],
  ["payment", "Payment numbers"],
  ["checkout", "Delivery rules"],
];

/** Red for removals and refusals, green for creations and approvals. */
const tone = (action: string) =>
  /archive|reject|delete|revoke|deactivat|clear|return/.test(action)
    ? "is-danger"
    : /create|approve|publish|join|invite|collected/.test(action)
      ? "is-good"
      : "";
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string; before?: string }>;
}) {
  const tr = adminTextFor((await requestLocale()).locale);
  const { access } = await requireAdminPage("audit.read");
  const sp = await searchParams;
  const group = groups.some(([g]) => g === sp.group) ? (sp.group ?? "") : "";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const before = sp.before && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : null;

  // Filters from the URL: area, free-text search (matched literally), and "before" for paging back in time.

  const where: SQL[] = [];
  if (group) where.push(ilike(auditEvent.action, `${group}%`));
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`;
    where.push(
      or(
        ilike(auditEvent.reason, like),
        ilike(auditEvent.action, like),
        ilike(user.name, like),
        ilike(user.email, like),
      )!,
    );
  }
  const filter = where.length ? and(...where) : undefined;
  const db = catalogDb();
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: auditEvent.id,
        action: auditEvent.action,
        target: auditEvent.targetId,
        reason: auditEvent.reason,
        at: auditEvent.createdAt,
        name: user.name,
        email: user.email,
      })
      .from(auditEvent)
      .leftJoin(user, eq(user.id, auditEvent.actorId))
      .where(and(filter, before ? lt(auditEvent.createdAt, before) : undefined))
      .orderBy(desc(auditEvent.createdAt))
      .limit(PAGE + 1),
    db
      .select({ n: count() })
      .from(auditEvent)
      .leftJoin(user, eq(user.id, auditEvent.actorId))
      .where(filter),
  ]);

  // One extra row is loaded only to know whether an "Older entries" page exists.

  const shown = rows.slice(0, PAGE),
    more = rows.length > PAGE;
  const link = (extra: Record<string, string>) =>
    `/admin/activity?${new URLSearchParams({ ...(group ? { group } : {}), ...(q ? { q } : {}), ...extra })}`;
  return (
    <main id="main-content" className="container auth-page admin-activity">
      <AdminBack />
      <h1>
        <Localized en="Activity log" bn="কার্যক্রমের লগ" />
      </h1>
      <p>
        Every change made in the admin, with the person&apos;s name, newest first. Entries
        can&apos;t be edited. Only the owner can delete them, and each deletion is recorded.{" "}
        {Number(total?.n ?? 0)} entr
        {Number(total?.n ?? 0) === 1 ? "y" : "ies"}
        {group || q ? " match" : " in total"}.
      </p>
      <form className="activity-filters" method="get" action="/admin/activity">
        <label>
          {tr("Area")}
          <select name="group" defaultValue={group}>
            {groups.map(([g, l]) => (
              <option key={g} value={g}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          {tr("Search")}
          <input
            name="q"
            defaultValue={q}
            placeholder={tr("Name, email, order code, product…")}
            maxLength={60}
          />
        </label>
        <button className="btn btn-primary">{tr("Filter")}</button>
        {(group || q) && (
          <Link className="btn btn-neutral" href="/admin/activity">
            {tr("Clear")}
          </Link>
        )}
      </form>
      {access.owner && Number(total?.n ?? 0) > 0 && (
        <ActivityDeleteAll total={Number(total?.n ?? 0)} />
      )}
      {!shown.length ? (
        <p className="report-empty">{tr("No activity matches.")}</p>
      ) : (
        <ol className="activity-list">
          {shown.map(r => (
            <li key={r.id} className={tone(r.action)}>
              <time dateTime={r.at.toISOString()}>
                {formatDhaka(r.at, "en", { year: true, time: true })}
              </time>
              <div>
                <strong>{r.name ?? "System"}</strong>
                {r.email && <small> {r.email}</small>}
                <span className="activity-action">{r.action}</span>
              </div>
              <p>{r.reason || <em>{tr("No details")}</em>}</p>
              {access.owner && <ActivityDeleteOne id={r.id} />}
            </li>
          ))}
        </ol>
      )}
      {(before || more) && (
        <nav className="activity-pages" aria-label={tr("Pages")}>
          {before && (
            <Link className="btn btn-neutral" href={link({})}>
              {tr("Newest")}
            </Link>
          )}
          {more && (
            <Link
              className="btn btn-neutral"
              href={link({ before: shown.at(-1)!.at.toISOString() })}
            >
              {tr("Older entries")}
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
