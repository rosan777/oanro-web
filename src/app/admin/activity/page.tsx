import Link from "next/link";
import { and, count, desc, eq, ilike, lt, or, type SQL } from "drizzle-orm";
import { requireAdminPage } from "@/lib/admin-guard";
import { auditEvent, user } from "@/lib/db/schema";
import { catalogDb } from "@/lib/store-products";
import { formatDhaka } from "@/lib/dhaka-time";
import { AdminBack } from "@/components/admin-nav";
export const dynamic = "force-dynamic";

// Read-only view of the append-only audit log: who changed what, and when. Nothing here can edit or delete entries.
const PAGE = 50;
const groups: [string, string][] = [["", "Everything"], ["order", "Orders & payments"], ["product", "Products"], ["collection", "Sections"], ["staff", "Staff & roles"], ["role", "Roles"], ["campaign", "Campaigns"], ["service", "Services"], ["lead", "Inquiries"], ["pulse", "Global Pulse"], ["payment", "Payment numbers"], ["checkout", "Delivery rules"]];
const tone = (action: string) => /archive|reject|delete|revoke|deactivat|clear|return/.test(action) ? "is-danger" : /create|approve|publish|join|invite|collected/.test(action) ? "is-good" : "";
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ group?: string; q?: string; before?: string }> }) {
  await requireAdminPage("audit.read");
  const sp = await searchParams;
  const group = groups.some(([g]) => g === sp.group) ? sp.group ?? "" : "";
  const q = (sp.q ?? "").trim().slice(0, 60);
  const before = sp.before && !Number.isNaN(Date.parse(sp.before)) ? new Date(sp.before) : null;
  const where: SQL[] = [];
  if (group) where.push(ilike(auditEvent.action, `${group}%`));
  if (q) { const like = `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`; where.push(or(ilike(auditEvent.reason, like), ilike(auditEvent.action, like), ilike(user.name, like), ilike(user.email, like))!); }
  const filter = where.length ? and(...where) : undefined;
  const db = catalogDb();
  const [rows, [total]] = await Promise.all([
    db.select({ id: auditEvent.id, action: auditEvent.action, target: auditEvent.targetId, reason: auditEvent.reason, at: auditEvent.createdAt, name: user.name, email: user.email })
      .from(auditEvent).leftJoin(user, eq(user.id, auditEvent.actorId)).where(and(filter, before ? lt(auditEvent.createdAt, before) : undefined))
      .orderBy(desc(auditEvent.createdAt)).limit(PAGE + 1),
    db.select({ n: count() }).from(auditEvent).leftJoin(user, eq(user.id, auditEvent.actorId)).where(filter),
  ]);
  const shown = rows.slice(0, PAGE), more = rows.length > PAGE;
  const link = (extra: Record<string, string>) => `/admin/activity?${new URLSearchParams({ ...(group ? { group } : {}), ...(q ? { q } : {}), ...extra })}`;
  return <main id="main-content" className="container auth-page admin-activity">
    <AdminBack />
    <h1>Activity log</h1>
    <p>Every change made in the admin, newest first. The log can&apos;t be edited or deleted by anyone, including the owner. {Number(total?.n ?? 0)} entr{Number(total?.n ?? 0) === 1 ? "y" : "ies"}{group || q ? " match" : " in total"}.</p>
    <form className="activity-filters" method="get" action="/admin/activity">
      <label>Area<select name="group" defaultValue={group}>{groups.map(([g, l]) => <option key={g} value={g}>{l}</option>)}</select></label>
      <label>Search<input name="q" defaultValue={q} placeholder="Name, email, order code, product…" maxLength={60} /></label>
      <button className="btn btn-primary">Filter</button>{(group || q) && <Link className="btn btn-neutral" href="/admin/activity">Clear</Link>}
    </form>
    {!shown.length ? <p className="report-empty">No activity matches.</p> : <ol className="activity-list">{shown.map(r =>
      <li key={r.id} className={tone(r.action)}>
        <time dateTime={r.at.toISOString()}>{formatDhaka(r.at, "en", { year: true, time: true })}</time>
        <div><strong>{r.name ?? "System"}</strong>{r.email && <small> {r.email}</small>}<span className="activity-action">{r.action}</span></div>
        <p>{r.reason || <em>No details</em>}</p>
      </li>)}</ol>}
    {(before || more) && <nav className="activity-pages" aria-label="Pages">{before && <Link className="btn btn-neutral" href={link({})}>Newest</Link>}{more && <Link className="btn btn-neutral" href={link({ before: shown.at(-1)!.at.toISOString() })}>Older entries</Link>}</nav>}
  </main>;
}
