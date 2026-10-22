import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin-guard";
import { getCustomer } from "@/lib/customer-store";
import { catalogDb } from "@/lib/store-products";
import { formatDhaka } from "@/lib/dhaka-time";
import { formatPrice } from "@/lib/catalog";
import { AdminBack } from "@/components/admin-nav";
import { CustomerDelete } from "@/components/customer-delete";
import { CustomerEmail } from "@/components/customer-email";
import { CustomerNotes } from "@/components/team-extras";
import { listCustomerNotes } from "@/lib/team-notes";
export const dynamic = "force-dynamic";
const orderState = (o: { status: string; delivery: string | null; paymentType: string; collected: Date | null }) =>
  o.status === "pending" ? "Waiting for review" : o.status === "rejected" ? "Rejected" : o.delivery === "delivered" ? (o.paymentType === "cod" && !o.collected ? "Delivered, cash not received" : "Delivered") : o.delivery === "returned" ? "Returned" : o.delivery ? `Approved, ${o.delivery.replaceAll("_", " ")}` : "Approved";
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await requireAdminPage("customers.read");
  const c = await getCustomer(catalogDb(), decodeURIComponent((await params).id).slice(0, 100));
  if (!c) notFound();
  const p = c.profile;
  const notes = (await listCustomerNotes(catalogDb(), c.user.id).catch(() => [])).map(n => ({ ...n, createdAt: n.createdAt.toISOString() }));
  const field = (label: string, value?: string | null) => value ? <div><dt>{label}</dt><dd>{value}</dd></div> : null;
  return <main id="main-content" className="container auth-page admin-customer">
    <AdminBack />
    <p><Link className="text-link" href="/admin/customers">All customers</Link></p>
    <h1>{c.user.name || "No name"}</h1>
    {c.deleted && <p className="report-empty">This account was deleted. Personal details were erased; orders are kept for the accounts.</p>}
    <div className="customer-stats"><div><span>Orders</span><strong>{c.orders.length}</strong></div><div><span>Total spent</span><strong>{formatPrice(c.spent)}</strong></div><div><span>Joined</span><strong>{formatDhaka(c.user.createdAt, "en", { year: true })}</strong></div></div>
    {!c.deleted && <section className="profile-card"><h2>Profile</h2><dl className="customer-fields">
      {field("Email", `${c.user.email}${c.user.emailVerified ? "" : " (not verified)"}`)}{field("Phone", p?.phone)}{field("Other phone", p?.altPhone)}
      {field("Address", [p?.address, p?.area, p?.city, p?.postcode].filter(Boolean).join(", "))}{field("Permanent address", p?.permanentAddress)}{field("Company", p?.company)}
    </dl></section>}
    {!c.deleted && access.permissions.has("customers.notes") && <CustomerNotes userId={c.user.id} initial={notes} />}
    <section className="profile-card"><h2>Orders</h2>{access.permissions.has("orders.read") && c.orders.length > 0 && <Link className="text-link" href="/admin/orders">Open orders</Link>}{!c.orders.length ? <p className="report-empty">No orders.</p> : <div className="table-scroll"><table className="report-table">
      <thead><tr><th>Order</th><th>Date</th><th>Payment</th><th className="num">Items</th><th className="num">Amount</th><th>Status</th></tr></thead>
      <tbody>{c.orders.map(o => <tr key={o.id}><th>{o.code}</th><td>{formatDhaka(o.createdAt, "en", { year: true })}</td>
        <td>{o.paymentType === "cod" ? "Cash on delivery" : o.method === "bkash" ? "bKash" : "Nagad"}</td><td className="num">{o.items}</td><td className="num">{formatPrice(o.total + o.codDue)}</td><td>{orderState(o)}</td></tr>)}</tbody></table></div>}</section>
    {!c.deleted && <section className="profile-card"><h2>Inquiries</h2>{!c.inquiries.length ? <p className="report-empty">No inquiries from this email.</p> : <ul className="customer-inquiries">{c.inquiries.map(i =>
      <li key={i.id}><strong>{i.subject || i.kind}</strong> <small>{formatDhaka(i.createdAt, "en", { year: true })} / {i.status}</small><p>{i.message.slice(0, 240)}</p></li>)}</ul>}
      {access.permissions.has("leads.read") && c.inquiries.length > 0 && <Link className="text-link" href="/admin/leads">Open inquiries</Link>}</section>}
    {!c.deleted && access.owner && <CustomerEmail customerId={c.user.id} name={c.user.name} />}
    {!c.deleted && access.permissions.has("customers.delete") && <CustomerDelete id={c.user.id} name={c.user.name} blockers={c.blockers} />}
  </main>;
}
