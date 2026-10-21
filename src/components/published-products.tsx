"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/catalog";

export type PublishedRow = { id: string; slug: string; name: string; section: string; sectionId: string; price: number; stock: number | null;
  lowStockAt: number | null; perVariant: boolean; hasImage: boolean; updatedAt: string };
const state = (r: PublishedRow) => r.stock === 0 ? "out" : r.stock !== null && r.lowStockAt !== null && r.stock <= r.lowStockAt ? "low" : "in";

/** Numbered list of live products with quick stock controls: exact count, out of stock, or unlimited. */
export function PublishedProducts({ initial, canStock }: { initial: PublishedRow[]; canStock: boolean }) {
  const [rows, setRows] = useState(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const save = async (r: PublishedRow, stock: number | null) => {
    setBusy(r.id); setMsg("");
    const res = await fetch("/api/admin/products", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: r.id, stock }) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { setMsg(`Could not update “${r.name}”. Please try again.`); return; }
    setRows(list => list.map(x => x.id === r.id ? { ...x, stock } : x));
    setDrafts(d => { const n = { ...d }; delete n[r.id]; return n; });
    setMsg(`Saved: ${r.name} — ${stock === null ? "unlimited stock" : stock === 0 ? "out of stock" : `${stock} in stock`}.`);
  };
  const shown = rows.filter(r => !q || `${r.name} ${r.section} ${r.slug}`.toLowerCase().includes(q.toLowerCase()));
  const counts = { all: rows.length, out: rows.filter(r => state(r) === "out").length, low: rows.filter(r => state(r) === "low").length };
  return <section className="pub-wrap">
    <div className="pub-bar">
      <span><b>{counts.all}</b> live · <b className="is-out">{counts.out}</b> out of stock · <b className="is-low">{counts.low}</b> running low</span>
      <input type="search" placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search published products" />
    </div>
    <p className="pub-msg" role="status">{msg}</p>
    {shown.length === 0 ? <p className="small-note">No published products{q ? " match your search" : " yet"}.</p> :
    <ol className="pub-list">
      {shown.map((r, i) => { const st = state(r); const draft = drafts[r.id] ?? (r.stock === null ? "" : String(r.stock));
        return <li key={r.id} className={`pub-row is-${st}`}>
          <span className="pub-no">{i + 1}</span>
          <div className="pub-main"><strong>{r.name}</strong><small>{r.section} · {formatPrice(r.price, "en")}{r.hasImage ? "" : " · no photo yet"}</small></div>
          <span className={`pub-state is-${st}`}>{st === "out" ? "Out of stock" : r.stock === null ? "In stock · unlimited" : st === "low" ? `Low · ${r.stock} left` : `In stock · ${r.stock}`}</span>
          <div className="pub-stock">
            {r.perVariant ? <Link href={`/admin/sections/${r.sectionId}`} className="btn btn-neutral btn-sm">Stock per colour/size →</Link> : canStock ? <>
              <input type="number" min={0} max={1000000} inputMode="numeric" placeholder="∞" value={draft} disabled={busy === r.id} aria-label={`Stock for ${r.name}`}
                onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))} />
              <button type="button" className="btn btn-primary btn-sm" disabled={busy === r.id || draft === (r.stock === null ? "" : String(r.stock)) || (draft !== "" && !/^\d+$/.test(draft))} onClick={() => save(r, draft === "" ? null : Number(draft))}>Save</button>
              <button type="button" className="btn btn-neutral btn-sm" disabled={busy === r.id || r.stock === 0} onClick={() => save(r, 0)}>Out of stock</button>
              <button type="button" className="btn btn-neutral btn-sm" disabled={busy === r.id || r.stock === null} onClick={() => save(r, null)}>Unlimited</button>
            </> : <small>View only</small>}
          </div>
          <div className="pub-links"><Link href={`/products/${r.slug}`} target="_blank">View</Link><Link href={`/admin/sections/${r.sectionId}`}>Edit</Link></div>
        </li>; })}
    </ol>}
  </section>;
}
