"use client";
import Link from "@/components/locale-link";
import { Check } from "lucide-react";
import { formatPrice } from "@/lib/catalog";
import { formatDhaka } from "@/lib/dhaka-time";
import { deliveryPath, stageText } from "@/lib/order-stages";
import { useLocale } from "./locale";

type Order = { id: string; code: string; status: "pending" | "paid" | "rejected"; deliveryStatus: string | null; courier: string | null; trackingCode: string | null;
  method: string; trxId: string; total: number; paymentType?: string; deliveryCharge?: number; codDue?: number; createdAt: string; rejectReason: string | null;
  items: { name: string; size: string; quantity: number }[]; events: { stage: string; note: string; at: string }[] };
const label = { pending: ["Waiting for payment check", "পেমেন্ট যাচাই চলছে"], paid: ["Payment successful", "পেমেন্ট সফল"], rejected: ["Payment not confirmed", "পেমেন্ট নিশ্চিত হয়নি"] } as const;

/** Progress bar: Payment confirmed → Handed to courier → Out for delivery → Delivered. */
function Progress({ order, bn }: { order: Order; bn: boolean }) {
  if (order.status !== "paid" || order.deliveryStatus === "returned") return null;
  const reached = new Set(order.events.map(e => e.stage));
  if (order.deliveryStatus === "delivered") deliveryPath.forEach(s => reached.add(s));
  const current = deliveryPath.findLastIndex(s => reached.has(s));
  return <ol className="order-progress" aria-label={bn ? "ডেলিভারির অগ্রগতি" : "Delivery progress"}>{deliveryPath.map((s, i) =>
    <li key={s} className={i <= current ? "is-done" : ""} aria-current={i === current ? "step" : undefined}><span className="dot">{i <= current && <Check size={12} aria-hidden="true" />}</span>{stageText[s][bn ? 1 : 0]}</li>)}</ol>;
}
export function MyOrders({ orders }: { orders: Order[] }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  return <section className="my-orders" aria-labelledby="orders-title"><h2 id="orders-title">{bn ? "আমার অর্ডার" : "My orders"}</h2>
    {!orders.length ? <p>{bn ? "এখনো কোনো অর্ডার নেই।" : "No orders yet."} <Link href="/#products">{bn ? "পণ্য দেখুন" : "Browse products"}</Link></p> :
    <ul>{orders.map(o => <li key={o.id} className={`order-card is-${o.status}`}>
      <div className="order-head"><strong>{o.code}</strong><span className={`order-status is-${o.deliveryStatus && o.status === "paid" ? `delivery is-${o.deliveryStatus}` : o.status}`}>{o.status === "paid" && o.deliveryStatus ? stageText[o.deliveryStatus][bn ? 1 : 0] : label[o.status][bn ? 1 : 0]}</span></div>
      <p>{o.items.map(i => `${i.name} (${i.size}) × ${i.quantity}`).join(", ")}</p>
      <small>{formatDhaka(o.createdAt, locale, { year: true })} · {o.method === "bkash" ? "bKash" : "Nagad"} · TrxID {o.trxId} · <strong>{formatPrice(o.total, locale)}</strong>{o.paymentType === "cod" ? <> · {locale === "bn" ? `ক্যাশ অন ডেলিভারি: নগদ ${formatPrice(o.codDue ?? 0, locale)} বাকি` : `Cash on delivery: ${formatPrice(o.codDue ?? 0, locale)} to pay at the door`}</> : null}</small>
      <Progress order={o} bn={bn} />
      {o.courier && <p className="order-courier">{bn ? "কুরিয়ার: " : "Courier: "}<strong>{o.courier}</strong>{o.trackingCode && <>{bn ? " · ট্র্যাকিং নম্বর: " : " · Tracking number: "}<code>{o.trackingCode}</code></>}</p>}
      {o.status === "rejected" && o.rejectReason && <p className="order-reason">{bn ? "কারণ: " : "Reason: "}{o.rejectReason}</p>}
      <details className="order-updates" open={o.status !== "paid" || o.deliveryStatus !== "delivered"}><summary>{bn ? `আপডেট (${o.events.length})` : `Updates (${o.events.length})`}</summary>
        <ol className="order-timeline">{[...o.events].reverse().map((e, i) => <li key={i} className={`stage-${e.stage}`}><strong>{stageText[e.stage]?.[bn ? 1 : 0] ?? e.stage}</strong><small>{formatDhaka(e.at, locale, { year: true })}</small>{e.note && <span>{e.note}</span>}</li>)}</ol>
      </details>
    </li>)}</ul>}
  </section>;
}
