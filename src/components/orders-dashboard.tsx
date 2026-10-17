"use client";
import { useState } from "react";
import { formatPrice } from "@/lib/catalog";
import type { AdminOrder } from "@/lib/order-store";
import { useAdminCall } from "./admin-ui";
import { ActionIcon, type ActionIconName } from "./action-icon";
import { couriers } from "@/lib/order-input";
import { stageText } from "@/lib/order-stages";
import { nextStages } from "@/lib/order-flow";
import { formatDhaka } from "@/lib/dhaka-time";

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
type Rules = { deliveryCharge: number; codLimit: number };
export function OrdersDashboard({ initial, numbers: initialNumbers, rules: initialRules, canReview, canCod, isOwner }: { initial: AdminOrder[]; numbers: { bkash: string; nagad: string }; rules: Rules; canReview: boolean; canCod: boolean; isOwner: boolean }) {
  const [rules, setRules] = useState(initialRules);
  const [orders, setOrders] = useState(initial);
  const [numbers, setNumbers] = useState(initialNumbers);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { busy, notice, call } = useAdminCall<{ orders: AdminOrder[]; numbers: { bkash: string; nagad: string }; rules: Rules }>("/api/admin/orders", { bkash: "bKash number", nagad: "Nagad number", decision: "Decision", shippingCost: "Courier charge", deliveryCharge: "Delivery charge", codLimit: "Cash on delivery limit" }, data => { setOrders(data.orders); setNumbers(data.numbers); setRules(data.rules); });
  const shown = orders.filter(o => matches(o, filter));
  const count = (f: Filter) => orders.filter(o => matches(o, f)).length;
  return <section className="admin-sections orders-dashboard">
    {isOwner && <form className="pulse-form product-form payment-numbers" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void call("PUT", { bkash: f.get("bkash"), nagad: f.get("nagad"), deliveryCharge: f.get("deliveryCharge"), codLimit: f.get("codLimit") }, "Saved. Customers now see these at checkout."); }}>
      <h2>Your payment numbers</h2>
      <small>Customers send money to these personal numbers. Leave one empty to hide that option. Only you (the owner) can change them.</small>
      <div className="product-form-row">
        <label>bKash personal number<input name="bkash" inputMode="tel" defaultValue={numbers.bkash} placeholder="01XXXXXXXXX" disabled={busy} /></label>
        <label>Nagad personal number<input name="nagad" inputMode="tel" defaultValue={numbers.nagad} placeholder="01XXXXXXXXX" disabled={busy} /></label>
      </div>
      <div className="product-form-row">
        <label>Delivery charge (৳, every order)<input name="deliveryCharge" type="number" min={0} max={100000} step={1} inputMode="numeric" defaultValue={rules.deliveryCharge} required disabled={busy} /><small>Non-refundable. For cash on delivery this is the only amount paid in advance.</small></label>
        <label>Cash on delivery limit (৳)<input name="codLimit" type="number" min={0} max={10000000} step={1} inputMode="numeric" defaultValue={rules.codLimit} required disabled={busy} /><small>Orders above this product total must pay in full. 0 turns cash on delivery off.</small></label>
      </div>
      <div className="product-form-actions"><button className="btn btn-primary" disabled={busy}><ActionIcon name="save" />Save numbers</button></div>
    </form>}
    {!numbers.bkash && !numbers.nagad && <p className="admin-callout">Checkout is closed until a bKash or Nagad number is saved.</p>}
    <div className="order-filters" role="tablist" aria-label="Filter orders">{(["pending", "delivery", "paid", ...(canCod ? ["cod"] : []), "rejected", "all"] as Filter[]).map(f => <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{filterText[f]} ({count(f)})</button>)}</div>
    {!shown.length && <p>No orders here.</p>}
    <ul className="admin-order-list">{shown.map(o => <li key={o.id} className={`order-card is-${o.status}`}>
      <div className="order-head"><strong>{o.code}</strong><span className="order-badges">{o.deliveryStatus && <span className={`order-status is-delivery is-${o.deliveryStatus}`}>{stageText[o.deliveryStatus][0]}</span>}{o.paymentType === "cod" && <span className="order-status is-cod">COD</span>}<span className={`order-status is-${o.status}`}>{statusText[o.status]}</span></span></div>
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
      {canReview && o.status === "paid" && <DeliveryControls order={o} busy={busy} act={(body, done) => call("PATCH", { id: o.id, action: "delivery", ...body }, done)} />}
    </li>)}</ul>
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
