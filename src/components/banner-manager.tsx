"use client";

import { useState, type FormEvent } from "react";

type Row = { id: string; textEn: string; textBn: string; link: string; startsAt: string | null; endsAt: string | null; enabled: boolean; displayOrder: number };
const day = (iso: string | null) => iso ? iso.slice(0, 10) : "";
/** Add, edit, switch and delete announcement bar messages. */
export function BannerManager({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial); const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const call = async (method: "POST" | "DELETE", body: object) => {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/banners", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { banners?: Row[]; field?: string } | undefined; setBusy(false);
    if (!data?.banners) { setMsg(data?.field === "link" ? "Links must start with / (a page on this site), e.g. /seasonal" : data?.field ? `Please check: ${data.field}` : "Could not save."); return false; }
    setRows(data.banners.map(b => ({ ...b, startsAt: b.startsAt, endsAt: b.endsAt }))); return true;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    const ok = await call("POST", { id: editing?.id, textEn: f.get("textEn"), textBn: f.get("textBn"), link: f.get("link"), displayOrder: f.get("displayOrder"),
      startsAt: f.get("startsAt") ? `${f.get("startsAt")}T00:00:00+06:00` : null, endsAt: f.get("endsAt") ? `${f.get("endsAt")}T23:59:59+06:00` : null, enabled: f.get("enabled") === "on" });
    if (ok) { setEditing(null); form.reset(); setMsg("Saved."); }
  }
  const e = editing;
  return <section className="disc-wrap">
    <form className="disc-form" onSubmit={submit} key={e?.id ?? "new"}>
      <label className="wide">Message (English)<input name="textEn" required minLength={3} maxLength={120} defaultValue={e?.textEn} placeholder="Winter sale: 10% off with code WINTER10" /></label>
      <label className="wide">Message (Bangla)<input name="textBn" maxLength={160} defaultValue={e?.textBn} placeholder="শীতের অফার: WINTER10 কোডে ১০% ছাড়" /></label>
      <label>Link (optional)<input name="link" maxLength={200} defaultValue={e?.link} placeholder="/seasonal" /></label>
      <label>Order<input name="displayOrder" type="number" min={0} max={999} defaultValue={e?.displayOrder ?? 0} /></label>
      <label>Starts<input name="startsAt" type="date" defaultValue={day(e?.startsAt ?? null)} /></label>
      <label>Ends<input name="endsAt" type="date" defaultValue={day(e?.endsAt ?? null)} /></label>
      <label className="disc-check"><input type="checkbox" name="enabled" defaultChecked={e ? e.enabled : true} /> On</label>
      <button className="btn btn-primary" disabled={busy}>{e ? "Save changes" : "Add message"}</button>
      {e && <button type="button" className="btn btn-neutral" onClick={() => setEditing(null)}>Cancel</button>}
      <p className="small-note" role="status">{msg}</p>
    </form>
    {rows.length === 0 ? <p className="small-note">No custom messages yet.</p> : <table className="disc-table"><thead><tr><th>Message</th><th>Link</th><th>Dates</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className={r.enabled ? "" : "is-off"}><td><strong>{r.textEn}</strong>{r.textBn && <small>{r.textBn}</small>}</td><td>{r.link || "—"}</td><td>{day(r.startsAt) || "—"} → {day(r.endsAt) || "—"}</td><td>{r.enabled ? "On" : "Off"}</td>
        <td><button type="button" className="btn btn-neutral btn-sm" onClick={() => setEditing(r)}>Edit</button> <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => { if (window.confirm("Delete this message?")) call("DELETE", { id: r.id }); }}>Delete</button></td></tr>)}</tbody></table>}
  </section>;
}
