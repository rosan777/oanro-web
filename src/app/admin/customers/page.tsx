import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { listCustomers } from "@/lib/customer-store";
import { catalogDb } from "@/lib/store-products";
import { formatDhaka } from "@/lib/dhaka-time";
import { formatPrice } from "@/lib/catalog";
import { AdminBack } from "@/components/admin-nav";
export const dynamic = "force-dynamic";
const PAGE = 50;
// Customer accounts (not staff, not deleted). Personal data: needs "View customers".
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdminPage("customers.read");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Math.min(1000, Number.parseInt(sp.page ?? "1", 10) || 1));
  const { rows, total } = await listCustomers(catalogDb(), { q, limit: PAGE, offset: (page - 1) * PAGE });
  const link = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return <main id="main-content" className="container auth-page admin-customers">
    <AdminBack />
    <h1>Customers</h1>
    <p>Everyone with a customer account, newest first. Total spent counts approved orders (cash on delivery only after the cash is received). {total} customer{total === 1 ? "" : "s"}{q ? " match" : ""}.</p>
    <form className="activity-filters" method="get" action="/admin/customers">
      <label>Search<input name="q" defaultValue={q} placeholder="Name, email or phone" maxLength={60} /></label>
      <button className="btn btn-primary">Search</button>{q && <Link className="btn btn-neutral" href="/admin/customers">Clear</Link>}
    </form>
    {!rows.length ? <p className="report-empty">{q ? "No customers match." : "No customers yet."}</p> : <div className="table-scroll"><table className="report-table">
      <thead><tr><th>Customer</th><th>Phone</th><th>Joined</th><th className="num">Orders</th><th className="num">Total spent</th><th>Last order</th></tr></thead>
      <tbody>{rows.map(c => <tr key={c.id}>
        <th><Link href={`/admin/customers/${encodeURIComponent(c.id)}`}>{c.name || "No name"}</Link><br /><small>{c.email}{!c.verified ? " (email not verified)" : ""}</small></th>
        <td>{c.phone || "—"}</td><td>{formatDhaka(c.joined, "en", { year: true })}</td>
        <td className="num">{c.orders}</td><td className="num">{formatPrice(c.spent)}</td><td>{c.lastOrder ? formatDhaka(c.lastOrder, "en", { year: true }) : "—"}</td>
      </tr>)}</tbody></table></div>}
    {total > PAGE && <nav className="activity-pages" aria-label="Pages">{page > 1 && <Link className="btn btn-neutral" href={link(page - 1)}>Previous</Link>}{page * PAGE < total && <Link className="btn btn-neutral" href={link(page + 1)}>Next</Link>}</nav>}
  </main>;
}
