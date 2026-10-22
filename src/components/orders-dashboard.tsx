"use client";
import { OrderExtras } from "./team-extras";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/catalog";
import type { AdminOrder } from "@/lib/order-store";
import { useAdminCall } from "./admin-ui";
import { ActionIcon, type ActionIconName } from "./action-icon";
import { couriers } from "@/lib/order-input";
import { stageText } from "@/lib/order-stages";
import { nextStages } from "@/lib/order-flow";
import { formatDhaka } from "@/lib/dhaka-time";
import { ChevronDown } from "lucide-react";

type Filter = "pending" | "delivery" | "paid" | "cod" | "rejected" | "all";
const statusText = { pending: "Pending check", paid: "Paid", rejected: "Rejected" } as const;
const filterText: Record<Filter, string> = { pending: "Pending check", delivery: "To deliver", paid: "All paid", cod: "Cash on delivery", rejected: "Rejected", all: "All" };
const inDelivery = (o: AdminOrder) => o.status === "paid" && o.deliveryStatus !== "delivered" && o.deliveryStatus !== "returned";
const matches = (o: AdminOrder, f: Filter) => f === "all" || (f === "delivery" ? inDelivery(o) : f === "cod" ? o.paymentType === "cod" : o.status === f);
/** Where the COD cash stands: waiting for approval, with the courier, received, or not collected (returned/rejected). */
function codState(o: AdminOrder): [string, string] {
  if (o.codCollectedAt) return ["Cash received", "is-done"];
  if (o.status === "rejected" || o.deliveryStatus === "returned") return ["Not collected", "is-off"];
  if (o.status === "pending") return ["Waiting for advance check", "is-wait"];
  return [o.deliveryStatus === "delivered" ? "Delivered: collect cash from courier" : "Cash due on delivery", "is-due"];
}
const stepLabel: Record<string, string> = { shipped: "Handed to courier", out_for_delivery: "Out for delivery", delivered: "Mark delivered", returned: "Returned / failed" };
const stepStyle: Record<string, [string, ActionIconName]> = { shipped: ["btn-progress", "courier"], out_for_delivery: ["btn-progress", "route"], delivered: ["btn-primary", "delivered"], returned: ["btn-danger", "returned"] };

function DeliveryControls({ order, busy, act }: { order: AdminOrder; busy: boolean; act: (body: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [stage, setStage] = useState<string | null>(null);
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const steps = order.deliveryStatus ? nextStages[order.deliveryStatus] : [];
  if (!steps.length) return null;
  const go = async () => { if (await act({ stage, courier, trackingCode: tracking, note }, `${order.code}: ${stepLabel[stage!]}.`)) { setStage(null); setNote(""); } };
  return <div className="delivery-controls">
    <div className="admin-product-actions">{steps.map(st => <button key={st} type="button" className={`btn ${stepStyle[st][0]}${stage === st ? " is-active" : ""}`} aria-pressed={stage === st} disabled={busy} onClick={() => setStage(stage === st ? null : st)}><ActionIcon name={stepStyle[st][1]} />{stepLabel[st]}</button>)}</div>
    {stage && <div className="delivery-form">
      {stage === "shipped" && <><label>Courier<input list={`couriers-${order.id}`} value={courier} maxLength={40} onChange={e => setCourier(e.target.value)} placeholder="e.g. Pathao Courier" /></label>
        <datalist id={`couriers-${order.id}`}>{couriers.map(c => <option key={c} value={c} />)}</datalist>
        <label>Tracking / consignment number (optional)<input value={tracking} maxLength={60} onChange={e => setTracking(e.target.value)} /></label></>}
      <label>{stage === "returned" ? "Reason (required)" : "Note for the customer (optional)"}<input value={note} maxLength={300} onChange={e => setNote(e.target.value)} placeholder={stage === "returned" ? "e.g. Customer not reachable" : ""} /></label>
      <button type="button" className={`btn ${stage === "returned" ? "btn-danger-solid" : "btn-primary"}`} disabled={busy || (stage === "shipped" && !courier.trim()) || (stage === "returned" && note.trim().length < 3)} onClick={go}><ActionIcon name={stage === "returned" ? "returned" : "approve"} />Confirm: {stepLabel[stage]}</button>
    </div>}
  </div>;
}
/** What the business paid the courier for this order. Internal: feeds net profit, never shown to customers. */
function ShippingCost({ order, busy, act }: { order: AdminOrder; busy: boolean; act: (body: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [value, setValue] = useState(order.shippingCost === null ? "" : String(order.shippingCost));
  const saved = order.shippingCost === null ? "" : String(order.shippingCost);
  return <form className="shipping-cost" onSubmit={e => { e.preventDefault(); void act({ shippingCost: value }, `${order.code}: courier charge ${value === "" ? "cleared" : `saved (${formatPrice(Number(value))})`}.`); }}>
    <label>Courier charge you paid (৳)<input type="number" min={0} max={100000} step={1} inputMode="numeric" value={value} placeholder="e.g. 60" disabled={busy} onChange={e => setValue(e.target.value)} /></label>
    <button className="btn btn-neutral btn-sm" disabled={busy || value === saved}><ActionIcon name="save" />Save charge</button>
    {order.shippingCost === null && order.deliveryStatus && order.deliveryStatus !== "processing" && <small className="shipping-missing">Not added yet: profit reports count it as ৳0.</small>}
  </form>;
}
/** Money sent back to the customer after approval. Saved amounts reduce revenue in the profit report. */
function Refund({ order, busy, act }: { order: AdminOrder; busy: boolean; act: (body: Record<string, unknown>, done: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(order.refundAmount > 0);
  const [amount, setAmount] = useState(order.refundAmount ? String(order.refundAmount) : ""), [note, setNote] = useState(order.refundNote ?? "");
  const received = order.total + (order.codCollectedAt ? order.codDue : 0);
  if (!open) return <button type="button" className="btn btn-neutral btn-sm refund-open" disabled={busy} onClick={() => setOpen(true)}><ActionIcon name="returned" />Record a refund</button>;
  return <form className="shipping-cost refund-form" onSubmit={e => { e.preventDefault(); void act({ amount: amount || "0", note }, Number(amount) ? `${order.code}: refund of ${formatPrice(Number(amount))} saved.` : `${order.code}: refund cleared.`); }}>
    <label>Refund sent to customer (৳)<input type="number" min={0} max={received} step={1} inputMode="numeric" value={amount} placeholder="0" disabled={busy} onChange={e => setAmount(e.target.value)} /></label>
    <label>Reason<input value={note} maxLength={200} placeholder="e.g. one item damaged, partial refund" disabled={busy} onChange={e => setNote(e.target.value)} /></label>
    <button className="btn btn-neutral btn-sm" disabled={busy || (amount === String(order.refundAmount || "") && note === (order.refundNote ?? ""))}><ActionIcon name="save" />Save refund</button>
    <small>Up to {formatPrice(received)} (what was received). {order.deliveryStatus === "returned" ? "This order was returned: its product money is already left out of revenue, so don't record that again." : "It is subtracted from net profit. Enter 0 to clear."}</small>
  </form>;
}
type Rules = { deliveryCharge: number; codLimit: number; dhakaDays: string; outsideDays: string; returnDays: number };
const days = (r: string) => r.replace("-", "–");
/** Owner card: delivery charge, COD limit, delivery times, return window. Checkout and the Delivery & returns page read these. */
function RulesCard({ rules, busy, save }: { rules: Rules; busy: boolean; save: (body: Record<string, unknown>) => void }) {
  const [d, setD] = useState({ deliveryCharge: String(rules.deliveryCharge), codLimit: String(rules.codLimit), dhakaDays: rules.dhakaDays, outsideDays: rules.outsideDays, returnDays: String(rules.returnDays) });
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement>) => setD(x => ({ ...x, [k]: e.target.value }));
  const charge = Number(d.deliveryCharge) || 0, limit = Number(d.codLimit) || 0, ret = Number(d.returnDays) || 0;
  return <form className="pulse-form product-form rules-card" onSubmit={e => { e.preventDefault(); save({ action: "rules", ...d }); }}>
    <h2>Delivery &amp; payment rules</h2>
    <small>These numbers appear at checkout and on the public <a href="/delivery-returns" target="_blank" rel="noreferrer">Delivery &amp; returns</a> page, which updates automatically when you save. Only you (the owner) can change them.</small>
    <fieldset><legend>Charges</legend><div className="product-form-row">
      <label>Delivery charge (৳, every order)<input type="number" min={0} max={100000} step={1} inputMode="numeric" value={d.deliveryCharge} onChange={set("deliveryCharge")} required disabled={busy} /><small>Non-refundable. For cash on delivery this is the only amount paid in advance.</small></label>
      <label>Cash on delivery limit (৳)<input type="number" min={0} max={10000000} step={1} inputMode="numeric" value={d.codLimit} onChange={set("codLimit")} required disabled={busy} /><small>Orders with a product total above this must pay in full. 0 turns cash on delivery off.</small></label>
    </div></fieldset>
    <fieldset><legend>Delivery time and returns</legend><div className="product-form-row three">
      <label>Inside Dhaka (days)<input value={d.dhakaDays} onChange={set("dhakaDays")} placeholder="1-3" pattern="\d{1,2}([-–]\d{1,2})?" maxLength={5} required disabled={busy} /></label>
      <label>Outside Dhaka (days)<input value={d.outsideDays} onChange={set("outsideDays")} placeholder="3-5" pattern="\d{1,2}([-–]\d{1,2})?" maxLength={5} required disabled={busy} /></label>
      <label>Report a problem within (days)<input type="number" min={0} max={30} step={1} inputMode="numeric" value={d.returnDays} onChange={set("returnDays")} required disabled={busy} /><small>0 = no returns.</small></label>
    </div></fieldset>
    <div className="rules-preview" aria-live="polite"><strong>Customers will see:</strong>
      <ul><li>Delivery charge {formatPrice(charge)} on every order (not refundable).</li>
        <li>{limit > 0 ? `Cash on delivery for orders up to ${formatPrice(limit)}; pay ${formatPrice(charge)} first.` : "Cash on delivery is turned off."}</li>
        <li>Delivery in {days(d.dhakaDays) || "?"} days inside Dhaka, {days(d.outsideDays) || "?"} days outside Dhaka.</li>
        <li>{ret > 0 ? `Report a wrong, damaged or missing item within ${ret} day${ret === 1 ? "" : "s"} of delivery.` : "Returns are not accepted."}</li></ul></div>
    <div className="product-form-actions"><button className="btn btn-primary" disabled={busy}><ActionIcon name="save" />Save rules</button><a className="btn btn-neutral" href="/delivery-returns" target="_blank" rel="noreferrer"><ActionIcon name="route" />View public page</a></div>
  </form>;
}
/** Order code, customer, phone or Transaction ID contains the search text. */
const found = (o: AdminOrder, q: string) => !q || [o.code, o.customerName, o.phone, o.trxId, o.payerNumber, o.accountEmail].some(v => (v ?? "").toLowerCase().includes(q));
/** mode "orders": the order list. mode "settings": the owner's payment numbers and delivery rules (own page in the side menu). */
export function OrdersDashboard({ initial, numbers: initialNumbers, rules: initialRules, canReview, canCod, isOwner, mode = "orders", openId, query = "" }: { initial: AdminOrder[]; numbers: { bkash: string; nagad: string }; rules: Rules; canReview: boolean; canCod: boolean; isOwner: boolean; mode?: "orders" | "settings"; openId?: string; query?: string }) {
  const [rules, setRules] = useState(initialRules);
  const mailTest = useAdminCall<{ sentTo: string }>("/api/admin/orders", {}, () => {});
  const [orders, setOrders] = useState(initial);
  const [numbers, setNumbers] = useState(initialNumbers);
  const [filter, setFilter] = useState<Filter>(query || (openId && initial.find(o => o.id === openId)?.status !== "pending") ? "all" : "pending");
  const [search, setSearch] = useState(query);
  const [open, setOpen] = useState<string | null>(openId ?? initial.find(o => o.status === "pending" && (canCod || o.paymentType !== "cod"))?.id ?? null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { busy, notice, call } = useAdminCall<{ orders: AdminOrder[]; numbers: { bkash: string; nagad: string }; rules: Rules }>("/api/admin/orders", { bkash: "bKash number", nagad: "Nagad number", decision: "Decision", shippingCost: "Courier charge", deliveryCharge: "Delivery charge", codLimit: "Cash on delivery limit", dhakaDays: "Inside Dhaka (days, like 1-3)", outsideDays: "Outside Dhaka (days, like 3-5)", returnDays: "Report a problem within (0–30 days)" }, data => { setOrders(data.orders); setNumbers(data.numbers); setRules(data.rules); });
  const term = search.trim().toLowerCase();
  const shown = orders.filter(o => matches(o, filter) && found(o, term));
  const count = (f: Filter) => orders.filter(o => matches(o, f)).length;
  return <section className="admin-sections orders-dashboard">
    {mode === "settings" && isOwner && <form className="pulse-form product-form payment-numbers" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void call("PUT", { bkash: f.get("bkash"), nagad: f.get("nagad") }, "Payment numbers saved. Customers now see these at checkout."); }}>
      <h2>Your payment numbers</h2>
      <small>Customers send money to these personal numbers. Leave one empty to hide that option. Only you (the owner) can change them.</small>
      <div className="product-form-row">
        <label>bKash personal number<input name="bkash" inputMode="tel" defaultValue={numbers.bkash} placeholder="01XXXXXXXXX" disabled={busy} /></label>
        <label>Nagad personal number<input name="nagad" inputMode="tel" defaultValue={numbers.nagad} placeholder="01XXXXXXXXX" disabled={busy} /></label>
      </div>
      <div className="product-form-actions"><button className="btn btn-primary" disabled={busy}><ActionIcon name="save" />Save numbers</button>
        <button type="button" className="btn btn-neutral" disabled={mailTest.busy} onClick={() => void mailTest.call("POST", { action: "test-email" }, "Test email sent to your address. Check your inbox (and Spam/Junk).")}><ActionIcon name="inquiry" />{mailTest.busy ? "Sending…" : "Send test email"}</button></div>
      {mailTest.notice && <small role="status">{mailTest.notice}</small>}
      <small>New orders email you (and staff who can approve payments). Customers get an email when their payment is confirmed or rejected and at each delivery step.</small>
    </form>}
    {mode === "settings" && isOwner && <RulesCard rules={rules} busy={busy} save={body => void call("PUT", body, "Rules saved. Checkout and the Delivery & returns page now show the new values.")} />}
    {!numbers.bkash && !numbers.nagad && <p className="admin-callout">Checkout is closed until a bKash or Nagad number is saved.{mode === "orders" && isOwner && <> <Link href="/admin/settings">Add one in Payment &amp; delivery</Link>.</>}</p>}
    {mode === "orders" && <>
    <div className="order-search"><input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order code, name, phone or Transaction ID" aria-label="Search orders" maxLength={60} /></div>
    <div className="order-filters" role="tablist" aria-label="Filter orders">{(["pending", "delivery", "paid", ...(canCod ? ["cod"] : []), "rejected", "all"] as Filter[]).map(f => <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{filterText[f]} ({count(f)})</button>)}</div>
    {!shown.length && <p>{term ? "No orders match your search." : "No orders here."}</p>}
    <ul className="admin-order-list">{shown.map(o => <li key={o.id} className={`order-card is-${o.status}${open === o.id ? " is-open" : ""}`}>
      <button type="button" className="order-row" aria-expanded={open === o.id} aria-controls={`order-${o.id}`} onClick={() => setOpen(open === o.id ? null : o.id)}>
        <code>{o.code}</code><span>{o.customerName}<br /><small>{formatDhaka(o.createdAt, "en")}</small></span><strong>{formatPrice(o.total)}</strong><span>{o.method === "bkash" ? "bKash" : "Nagad"}</span>
        <span className="order-badges">{o.deliveryStatus && <span className={`order-status is-delivery is-${o.deliveryStatus}`}>{stageText[o.deliveryStatus][0]}</span>}{o.paymentType === "cod" && <span className="order-status is-cod">COD</span>}<span className={`order-status is-${o.status}`}>{statusText[o.status]}</span></span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {open === o.id && <div className="order-body" id={`order-${o.id}`}>
      <dl className="order-facts">
        <div><dt>Customer</dt><dd>{o.customerName} <small>({o.accountName} · {o.accountEmail})</small></dd></div>
        <div><dt>Phone</dt><dd><a href={`tel:${o.phone}`}>{o.phone}</a></dd></div>
        <div><dt>{o.paymentType === "cod" ? "Advance received" : "Amount"}</dt><dd><strong>{formatPrice(o.total)}</strong>{o.deliveryCharge > 0 && <small> (incl. ৳{o.deliveryCharge} delivery)</small>}</dd></div>
        <div><dt>Paid with</dt><dd>{o.method === "bkash" ? "bKash" : "Nagad"} from <strong>{o.payerNumber}</strong> to {o.payTo}</dd></div>
        <div><dt>Transaction ID</dt><dd><code>{o.trxId}</code></dd></div>
        <div><dt>Placed</dt><dd>{formatDhaka(o.createdAt, "en", { year: true })}</dd></div>
        <div className="wide"><dt>Items</dt><dd>{o.items.map(i => `${i.name} (${i.size}) × ${i.quantity} @ ${formatPrice(i.unitPrice)}`).join(", ")}</dd></div>
        <div className="wide"><dt>Deliver to</dt><dd>{o.address}{o.note && <><br /><small>Note: {o.note}</small></>}</dd></div>
        {o.rejectReason && <div className="wide"><dt>Reject reason</dt><dd>{o.rejectReason}</dd></div>}
        {o.courier && <div><dt>Courier</dt><dd>{o.courier}{o.trackingCode && <> · <code>{o.trackingCode}</code></>}</dd></div>}
        <div className="wide"><dt>Timeline</dt><dd><ol className="order-timeline compact">{o.events.map((e, i) => <li key={i}><strong>{stageText[e.stage]?.[0] ?? e.stage}</strong> <small>{formatDhaka(e.at, "en", { year: true })}{e.note && ` · ${e.note}`}</small></li>)}</ol></dd></div>
      </dl>
      <OrderExtras orderId={o.id} />
      {o.paymentType === "cod" && (() => { const [label, tone] = codState(o); return <div className={`cod-panel ${tone}`}>
        <h3><ActionIcon name="wallet" />Cash on delivery</h3>
        <dl><div><dt>Advance (delivery charge)</dt><dd>{formatPrice(o.deliveryCharge)} by {o.method === "bkash" ? "bKash" : "Nagad"}</dd></div>
          <div><dt>Cash to collect</dt><dd><strong>{formatPrice(o.codDue)}</strong></dd></div>
          <div><dt>Cash status</dt><dd><span className="cod-state">{label}</span>{o.codCollectedAt && <small> · {formatDhaka(o.codCollectedAt, "en", { year: true })}</small>}</dd></div></dl>
        {canReview && o.status === "paid" && o.deliveryStatus === "delivered" && !o.codCollectedAt && <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { if (window.confirm(`Confirm the courier handed over ${formatPrice(o.codDue)} for ${o.code}? This adds it to revenue.`)) void call("PATCH", { id: o.id, action: "cod-collected" }, `${o.code}: cash received. It now counts as revenue.`); }}><ActionIcon name="coin" />Cash received: {formatPrice(o.codDue)}</button>}
      </div>; })()}
      {o.hasScreenshot && <details className="order-shot"><summary>View payment screenshot</summary>
        {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-checked image; not optimizable */}
        <img src={`/api/admin/orders/${o.id}/screenshot`} alt={`Payment screenshot for ${o.code}`} loading="lazy" /></details>}
      {canReview && o.status === "pending" && <div className="admin-product-actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => { if (window.confirm(`Approve ${o.code}? Confirm you received ${formatPrice(o.total)} with Transaction ID ${o.trxId}.`)) void call("PATCH", { id: o.id, decision: "approve" }, `${o.code} approved. The customer now sees "Payment successful".`); }}><ActionIcon name="approve" />Approve: money received</button>
        {rejecting === o.id ? <span className="reject-box"><input aria-label="Reason for rejecting" placeholder="e.g. Transaction ID not found" value={reason} maxLength={300} onChange={e => setReason(e.target.value)} /><button type="button" className="btn btn-danger-solid" disabled={busy || reason.trim().length < 3} onClick={async () => { if (await call("PATCH", { id: o.id, decision: "reject", reason }, `${o.code} rejected. Stock was returned.`)) { setRejecting(null); setReason(""); } }}><ActionIcon name="reject" />Confirm reject</button><button type="button" className="btn btn-neutral" onClick={() => setRejecting(null)}><ActionIcon name="cancel" />Cancel</button></span>
          : <button type="button" className="btn btn-danger" disabled={busy} onClick={() => { setRejecting(o.id); setReason(""); }}><ActionIcon name="reject" />Reject</button>}
      </div>}
      {canReview && o.status === "paid" && <ShippingCost order={o} busy={busy} act={(body, done) => call("PATCH", { id: o.id, action: "shipping-cost", ...body }, done)} />}
      {canReview && o.status === "paid" && <Refund order={o} busy={busy} act={(body, done) => call("PATCH", { id: o.id, action: "refund", ...body }, done)} />}
      {!canReview && o.refundAmount > 0 && <p className="small-note">Refunded {formatPrice(o.refundAmount)}{o.refundNote ? `: ${o.refundNote}` : ""}</p>}
      {canReview && o.status === "paid" && <DeliveryControls order={o} busy={busy} act={(body, done) => call("PATCH", { id: o.id, action: "delivery", ...body }, done)} />}
      </div>}
    </li>)}</ul>
    </>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
