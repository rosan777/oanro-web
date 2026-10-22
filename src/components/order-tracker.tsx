"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Circle, PackageSearch } from "lucide-react";
import { deliveryPath, stageText } from "@/lib/order-stages";
import { useLocale } from "./locale";
import Link from "./locale-link";

type Tracked = { code: string; status: string; delivery: string | null; courier: string | null; trackingCode: string | null; placedAt: string; events: { stage: string; at: string }[] };
/** Order number + phone → progress bar and dated timeline. No sign-in needed. */
export function OrderTracker() {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [order, setOrder] = useState<Tracked | null>(null);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const fmt = (iso: string) => new Intl.DateTimeFormat(bn ? "bn-BD" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(iso));
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy(true); setError(""); setOrder(null);
    const res = await fetch("/api/order-status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: f.get("code"), phone: f.get("phone") }) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { order?: Tracked } | undefined;
    setBusy(false);
    if (data?.order) setOrder(data.order); else setError(t("We couldn't find that order. Check the order number (starts with OA-) and use the phone number you ordered with.", "অর্ডারটি পাওয়া যায়নি। অর্ডার নম্বর (OA- দিয়ে শুরু) আর অর্ডারের ফোন নম্বর মিলিয়ে দেখুন।"));
  }
  const reached = order ? new Set(order.events.map(e => e.stage)) : new Set<string>();
  return <section className="tracker">
    <PackageSearch size={40} aria-hidden="true" className="tracker-icon" />
    <h1>{t("Track your order", "অর্ডার ট্র্যাক করুন")}</h1>
    <p>{t("Enter your order number and the phone number you used. No sign-in needed.", "অর্ডার নম্বর আর অর্ডারের ফোন নম্বর দিন। লগইন লাগবে না।")}</p>
    <form className="tracker-form" onSubmit={submit}>
      <label>{t("Order number", "অর্ডার নম্বর")}<input name="code" required placeholder="OA-…" autoComplete="off" style={{ textTransform: "uppercase" }} /></label>
      <label>{t("Phone number", "ফোন নম্বর")}<input name="phone" required inputMode="tel" placeholder="01XXXXXXXXX" autoComplete="tel" /></label>
      <button className="button brand-button" disabled={busy} aria-busy={busy}>{t("Track", "ট্র্যাক করুন")}</button>
    </form>
    {error && <p className="tracker-error" role="alert">{error}</p>}
    {order && <div className="tracker-result" role="status">
      <h2>{order.code}</h2>
      {order.status === "rejected" ? <p className="tracker-error">{t("Payment could not be confirmed for this order. Please contact us.", "এই অর্ডারের পেমেন্ট নিশ্চিত করা যায়নি। আমাদের সাথে যোগাযোগ করুন।")}</p> :
      <ol className="tracker-steps">{["placed", ...deliveryPath].map(s => <li key={s} className={reached.has(s) ? "is-done" : ""}>{reached.has(s) ? <CheckCircle2 size={20} aria-hidden="true" /> : <Circle size={20} aria-hidden="true" />}<span>{stageText[s]?.[bn ? 1 : 0] ?? s}</span></li>)}</ol>}
      {order.courier && <p className="small-note">{t("Courier", "কুরিয়ার")}: {order.courier}{order.trackingCode ? ` · #${order.trackingCode}` : ""}</p>}
      <ul className="tracker-log">{[...order.events].reverse().map((e, i) => <li key={i}><b>{stageText[e.stage]?.[bn ? 1 : 0] ?? e.stage}</b><span>{fmt(e.at)}</span></li>)}</ul>
    </div>}
    <p className="small-note">{t("Have an account? ", "অ্যাকাউন্ট আছে? ")}<Link href="/account">{t("See all your orders", "সব অর্ডার দেখুন")}</Link></p>
  </section>;
}
