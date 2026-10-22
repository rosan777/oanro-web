"use client";

import { useEffect, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog";

const QUICK = ["Call first", "Gift wrap", "VIP", "Fragile", "Urgent"];
/** Inside an opened order: team labels (quick picks or custom) and the discount code used, if any. */
export function OrderExtras({ orderId }: { orderId: string }) {
  const [data, setData] = useState<{ labels: string[]; discount: { code: string; amount: number } | null; canLabel: boolean } | null>(null);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { fetch(`/api/admin/order-extras?id=${orderId}`).then(r => r.ok ? r.json() : null).then(setData).catch(() => null); }, [orderId]);
  const change = async (label: string, add: boolean) => {
    setBusy(true);
    const res = await fetch("/api/admin/order-extras", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: orderId, label, add }) }).catch(() => null);
    if (res?.ok) setData(await res.json()); setBusy(false); setText("");
  };
  if (!data) return null;
  if (!data.canLabel) return <div className="order-extras">{data.discount && <p className="order-discount">Discount code <code>{data.discount.code}</code> · −{formatPrice(data.discount.amount)}</p>}{data.labels.length > 0 && <div className="order-labels"><span>Labels</span>{data.labels.map(l => <span key={l} className="label-chip is-on">{l}</span>)}</div>}</div>;
  return <div className="order-extras">
    {data.discount && <p className="order-discount">Discount code <code>{data.discount.code}</code> · −{formatPrice(data.discount.amount)}</p>}
    <div className="order-labels"><span>Labels</span>
      {data.labels.map(l => <button type="button" key={l} className="label-chip is-on" disabled={busy} onClick={() => change(l, false)} aria-label={`Remove label ${l}`}>{l} ×</button>)}
      {QUICK.filter(q => !data.labels.includes(q)).map(q => <button type="button" key={q} className="label-chip" disabled={busy} onClick={() => change(q, true)}>+ {q}</button>)}
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (text.trim().length >= 2) change(text.trim(), true); }}><input value={text} onChange={e => setText(e.target.value)} maxLength={24} placeholder="Custom label" aria-label="Custom label" /></form>
    </div>
  </div>;
}

type Note = { id: string; body: string; author: string; createdAt: string };
/** Private team notes on a customer page. */
export function CustomerNotes({ userId, initial }: { userId: string; initial: Note[] }) {
  const [notes, setNotes] = useState(initial); const [text, setText] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function add(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const res = await fetch("/api/admin/customer-notes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, body: text }) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { notes?: Note[] } | undefined;
    setBusy(false);
    if (data?.notes) { setNotes(data.notes); setText(""); } else setErr("Could not save the note (2–1000 characters).");
  }
  return <section className="profile-card customer-notes"><h2>Team notes</h2><p className="small-note">Private: only staff with customer access see these.</p>
    <form onSubmit={add}><textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000} placeholder="e.g. Prefers calls after 6 pm" /><button className="btn btn-primary btn-sm" disabled={busy || text.trim().length < 2}>Add note</button></form>
    {err && <p className="inquiry-error">{err}</p>}
    <ul>{notes.map(n => <li key={n.id}><p>{n.body}</p><small>{n.author} · {new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" })}</small></li>)}</ul>
  </section>;
}

/** Download a CSV export (opens the file download from an admin-only route). */
export function ExportButton({ type, label }: { type: "orders" | "customers" | "newsletter"; label: string }) {
  return <a className="btn btn-neutral btn-sm" href={`/api/admin/export?type=${type}`} download>{label}</a>;
}
