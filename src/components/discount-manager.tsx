"use client";

import { useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog";

type Row = { code: string; kind: "percent" | "amount"; value: number; minSubtotal: number; maxUses: number | null; used: number; startsAt: string | null; endsAt: string | null; active: boolean; note: string };
const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const errText: Record<string, string> = { code: "Code: 3–20 letters, numbers or dashes.", value: "Value: percent 1–90, or taka 1 or more.", endsAt: "The end date must be after the start date.", minSubtotal: "Minimum order must be a whole number.", maxUses: "Use limit must be 1 or more." };

/** Create, edit and switch discount codes. */
export function DiscountManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const call = async (method: "POST" | "PATCH", body: object) => {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/discounts", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { discounts?: (Row & { startsAt: string | null; endsAt: string | null })[]; field?: string } | undefined;
    setBusy(false);
    if (!res?.ok || !data?.discounts) { setMsg(errText[data?.field ?? ""] ?? "Could not save. Please try again."); return false; }
    setRows(data.discounts); return true;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); const num = (k: string) => f.get(k) === "" ? "" : Number(f.get(k));
    const ok = await call("POST", { code: f.get("code"), kind: f.get("kind"), value: num("value"), minSubtotal: num("minSubtotal"), maxUses: num("maxUses"),
      startsAt: f.get("startsAt") || null, endsAt: f.get("endsAt") ? `${f.get("endsAt")}T23:59:59+06:00` : null, note: f.get("note"), active: true });
    if (ok) { e.currentTarget.reset(); setMsg("Saved."); }
  }
  return <section className="disc-wrap">
    <form className="disc-form" onSubmit={submit}>
      <label>Code<input name="code" required minLength={3} maxLength={20} placeholder="WINTER10" style={{ textTransform: "uppercase" }} /></label>
      <label>Type<select name="kind" defaultValue="percent"><option value="percent">% off</option><option value="amount">৳ off</option></select></label>
      <label>Value<input name="value" type="number" min={1} required placeholder="10" /></label>
      <label>Minimum order (৳)<input name="minSubtotal" type="number" min={0} placeholder="0" /></label>
      <label>Use limit<input name="maxUses" type="number" min={1} placeholder="Unlimited" /></label>
      <label>Starts<input name="startsAt" type="date" /></label>
      <label>Ends<input name="endsAt" type="date" /></label>
      <label className="wide">Note (team only)<input name="note" maxLength={120} placeholder="Facebook ad, November" /></label>
      <button className="btn btn-primary" disabled={busy}>Save code</button>
      <p className="small-note" role="status">{msg}</p>
    </form>
    {rows.length === 0 ? <p className="small-note">No discount codes yet.</p> : <table className="disc-table">
      <thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Used</th><th>Dates</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.code} className={r.active ? "" : "is-off"}>
        <td><strong>{r.code}</strong>{r.note && <small>{r.note}</small>}</td>
        <td>{r.kind === "percent" ? `${r.value}%` : formatPrice(r.value, "en")}</td>
        <td>{r.minSubtotal ? formatPrice(r.minSubtotal, "en") : "—"}</td>
        <td>{r.used}{r.maxUses !== null ? ` / ${r.maxUses}` : ""}</td>
        <td>{when(r.startsAt)} → {when(r.endsAt)}</td>
        <td>{r.active ? "On" : "Off"}</td>
        <td><button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => call("PATCH", { code: r.code, active: !r.active })}>{r.active ? "Turn off" : "Turn on"}</button></td>
      </tr>)}</tbody>
    </table>}
  </section>;
}
