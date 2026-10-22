"use client";

import { useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog";

type Row = { code: string; kind: "percent" | "amount"; value: number; minSubtotal: number; maxUses: number | null; used: number; startsAt: string | null; endsAt: string | null; active: boolean; note: string; collections: string[]; products: string[] };
type Section = { id: string; name: string };
type Item = { slug: string; name: string; collectionId: string; status: string };
const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
const day = (iso: string | null) => iso ? new Date(new Date(iso).getTime() + 6 * 3600_000).toISOString().slice(0, 10) : "";
const errText: Record<string, string> = { code: "Code: 3–20 letters, numbers or dashes.", value: "Value: percent 1–90, or taka 1 or more.", endsAt: "The end date must be after the start date.", minSubtotal: "Minimum order must be a whole number.", maxUses: "Use limit must be 1 or more.", collections: "Please check the chosen sections.", products: "Please check the chosen products." };

/** Create, edit and switch discount codes. Each code covers everything, or only chosen sections and products. */
export function DiscountManager({ initial, sections, products }: { initial: Row[]; sections: Section[]; products: Item[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [scoped, setScoped] = useState(false);
  const [pickSections, setPickSections] = useState<string[]>([]);
  const [pickProducts, setPickProducts] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const sectionName = (id: string) => sections.find(s => s.id === id)?.name ?? id;
  const productName = (slug: string) => products.find(p => p.slug === slug)?.name ?? slug;
  const flip = (list: string[], v: string) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];
  const startEdit = (r: Row | null) => { setEditing(r); setScoped(Boolean(r && (r.collections.length || r.products.length))); setPickSections(r?.collections ?? []); setPickProducts(r?.products ?? []); setSearch(""); setMsg(""); };

  const call = async (method: "POST" | "PATCH", body: object) => {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/discounts", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { discounts?: Row[]; field?: string } | undefined;
    setBusy(false);
    if (!res?.ok || !data?.discounts) { setMsg(errText[data?.field ?? ""] ?? "Could not save. Please try again."); return false; }
    setRows(data.discounts); return true;
  };
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); const num = (k: string) => f.get(k) === "" ? "" : Number(f.get(k));
    if (scoped && !pickSections.length && !pickProducts.length) { setMsg("Choose at least one section or product, or switch to “Everything”."); return; }
    const ok = await call("POST", { code: f.get("code"), kind: f.get("kind"), value: num("value"), minSubtotal: num("minSubtotal"), maxUses: num("maxUses"),
      startsAt: f.get("startsAt") || null, endsAt: f.get("endsAt") ? `${f.get("endsAt")}T23:59:59+06:00` : null, note: f.get("note"), active: editing ? editing.active : true,
      collections: scoped ? pickSections : [], products: scoped ? pickProducts : [] });
    if (ok) { form.reset(); startEdit(null); setMsg("Saved."); }
  }
  const scopeText = (r: Row) => !r.collections.length && !r.products.length ? "Everything" : [...r.collections.map(sectionName), ...r.products.map(productName)].join(", ");
  const q = search.trim().toLowerCase();
  const shown = products.filter(p => !q || p.name.toLowerCase().includes(q) || p.slug.includes(q));
  const e = editing;

  return <section className="disc-wrap">
    <form className="disc-form" onSubmit={submit} key={e?.code ?? "new"}>
      <label>Code<input name="code" required minLength={3} maxLength={20} placeholder="WINTER10" defaultValue={e?.code} readOnly={Boolean(e)} style={{ textTransform: "uppercase" }} /></label>
      <label>Type<select name="kind" defaultValue={e?.kind ?? "percent"}><option value="percent">% off</option><option value="amount">৳ off</option></select></label>
      <label>Value<input name="value" type="number" min={1} required placeholder="10" defaultValue={e?.value} /></label>
      <label>Minimum order (৳)<input name="minSubtotal" type="number" min={0} placeholder="0" defaultValue={e?.minSubtotal || ""} /></label>
      <label>Use limit<input name="maxUses" type="number" min={1} placeholder="Unlimited" defaultValue={e?.maxUses ?? ""} /></label>
      <label>Starts<input name="startsAt" type="date" defaultValue={day(e?.startsAt ?? null)} /></label>
      <label>Ends<input name="endsAt" type="date" defaultValue={day(e?.endsAt ?? null)} /></label>
      <label className="wide">Note (team only)<input name="note" maxLength={120} placeholder="Facebook ad, November" defaultValue={e?.note} /></label>

      <fieldset className="wide disc-scope"><legend>Applies to</legend>
        <div className="disc-scope-mode">
          <label><input type="radio" name="scope" checked={!scoped} onChange={() => setScoped(false)} /> Everything in the store</label>
          <label><input type="radio" name="scope" checked={scoped} onChange={() => setScoped(true)} /> Only chosen sections or products</label>
        </div>
        {scoped && <>
          <p className="small-note">The discount is taken only from these items. Other products in the bag pay full price. The minimum order counts only these items too.</p>
          <div className="disc-pick"><strong>Sections</strong>
            {sections.length ? sections.map(s => <label key={s.id}><input type="checkbox" checked={pickSections.includes(s.id)} onChange={() => setPickSections(l => flip(l, s.id))} /> {s.name} <small>(all products in it, including new ones)</small></label>) : <p className="small-note">No sections yet.</p>}
          </div>
          <div className="disc-pick"><strong>Single products</strong>
            <input type="search" placeholder="Search products…" value={search} onChange={ev => setSearch(ev.target.value)} aria-label="Search products" />
            <div className="disc-pick-list">{shown.map(p => <label key={p.slug}><input type="checkbox" checked={pickProducts.includes(p.slug)} onChange={() => setPickProducts(l => flip(l, p.slug))} /> {p.name} <small>{sectionName(p.collectionId)}{p.status !== "published" ? ` · ${p.status}` : ""}</small></label>)}
              {!shown.length && <p className="small-note">No products match.</p>}</div>
          </div>
          {(pickSections.length > 0 || pickProducts.length > 0) && <p className="small-note">Chosen: {[...pickSections.map(sectionName), ...pickProducts.map(productName)].join(", ")}</p>}
        </>}
      </fieldset>

      <button className="btn btn-primary" disabled={busy}>{e ? "Save changes" : "Save code"}</button>
      {e && <button type="button" className="btn btn-neutral" onClick={() => startEdit(null)}>Cancel</button>}
      <p className="small-note" role="status">{msg}</p>
    </form>
    {rows.length === 0 ? <p className="small-note">No discount codes yet.</p> : <table className="disc-table">
      <thead><tr><th>Code</th><th>Discount</th><th>Applies to</th><th>Min. order</th><th>Used</th><th>Dates</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.code} className={r.active ? "" : "is-off"}>
        <td><strong>{r.code}</strong>{r.note && <small>{r.note}</small>}</td>
        <td>{r.kind === "percent" ? `${r.value}%` : formatPrice(r.value, "en")}</td>
        <td>{scopeText(r)}</td>
        <td>{r.minSubtotal ? formatPrice(r.minSubtotal, "en") : "—"}</td>
        <td>{r.used}{r.maxUses !== null ? ` / ${r.maxUses}` : ""}</td>
        <td>{when(r.startsAt)} → {when(r.endsAt)}</td>
        <td>{r.active ? "On" : "Off"}</td>
        <td><button type="button" className="btn btn-neutral btn-sm" onClick={() => { startEdit(r); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button> <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => call("PATCH", { code: r.code, active: !r.active })}>{r.active ? "Turn off" : "Turn on"}</button></td>
      </tr>)}</tbody>
    </table>}
  </section>;
}
