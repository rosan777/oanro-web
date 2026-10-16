"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { collectionPresets, presetLabel, type CollectionPreset } from "@/lib/categories";
import { slugify, type ProductStatus } from "@/lib/product-input";
import type { OwnerCatalog } from "@/lib/store-products";
import { StatusSelect, useAdminCall } from "./admin-ui";

type Section = OwnerCatalog["collections"][number];
const labels: Record<string, string> = { nameEn: "Section name", slug: "Web address", headlineEn: "Headline", descriptionEn: "Description", preset: "Section type", displayOrder: "Display order", status: "Status" };
const toDraft = (s: Section) => ({ slug: s.slug, status: s.status, preset: s.preset, nameEn: s.nameEn, nameBn: s.nameBn, headlineEn: s.headlineEn, headlineBn: s.headlineBn, descriptionEn: s.descriptionEn, descriptionBn: s.descriptionBn, displayOrder: String(s.displayOrder) });

/** Section settings: names and texts shown above the storefront row, visibility, order, archive. */
export function CollectionSettings({ section }: { section: Section }) {
  const router = useRouter();
  const [draft, setDraft] = useState(toDraft(section));
  const [open, setOpen] = useState(false);
  const { busy, notice, call } = useAdminCall<{ collections: Section[] }>("/api/admin/collections", labels, data => { const s = data.collections.find(c => c.id === section.id); if (s) setDraft(toDraft(s)); router.refresh(); });
  const set = (patch: Partial<typeof draft>) => setDraft(d => ({ ...d, ...patch }));
  const input = (name: keyof typeof draft, label: string, max: number, required = false) =>
    <label>{label}<input value={draft[name]} maxLength={max} required={required} disabled={busy} onChange={e => set({ [name]: e.target.value })} /></label>;
  async function save(event: FormEvent) { event.preventDefault(); if (await call("PATCH", { id: section.id, ...draft }, "Section saved. Refresh the storefront to see it.")) setOpen(false); }
  return <section className="admin-sections section-settings">
    <div className="admin-section-row"><div><strong>Section visibility</strong><small>{draft.status === "published" ? "Shown on the storefront" : draft.status === "hidden" ? "Hidden from the storefront" : "Draft, not shown yet"} · type: {presetLabel[draft.preset].en}</small></div>
      <div className="admin-product-actions">
        <StatusSelect label="" value={draft.status} disabled={busy} onChange={(status: ProductStatus) => { const next = { ...draft, status }; setDraft(next); void call("PATCH", { id: section.id, ...next }, status === "published" ? "Section is now visible." : "Section is no longer visible."); }} />
        <button type="button" disabled={busy} onClick={() => setOpen(o => !o)}>{open ? "Close settings" : "Edit section texts"}</button>
        {!section.builtIn && <button type="button" disabled={busy} onClick={async () => { if (window.confirm(`Archive the section “${section.nameEn}”? It must be empty.`) && await call("DELETE", { id: section.id }, "Section archived.")) router.push("/admin"); }}>Archive section</button>}
      </div>
    </div>
    {open && <form className="pulse-form product-form" onSubmit={save}>
      {input("nameEn", "Section name (small label above the row)", 60, true)}
      {input("headlineEn", "Headline (large text)", 100)}
      <label>Description<textarea rows={2} maxLength={300} value={draft.descriptionEn} disabled={busy} onChange={e => set({ descriptionEn: e.target.value })} /></label>
      <details><summary>Bangla text (optional)</summary>{input("nameBn", "সেকশনের নাম", 60)}{input("headlineBn", "শিরোনাম", 100)}<label>বিবরণ<textarea rows={2} maxLength={300} value={draft.descriptionBn} disabled={busy} onChange={e => set({ descriptionBn: e.target.value })} /></label></details>
      <div className="product-form-row">
        <label>Section type (sets the category list)<select value={draft.preset} disabled={busy} onChange={e => set({ preset: e.target.value as CollectionPreset })}>{collectionPresets.map(p => <option key={p} value={p}>{presetLabel[p].en}</option>)}</select></label>
        <label>Display order (lower shows first)<input type="number" min={-1000} max={1000} step={1} value={draft.displayOrder} disabled={busy} onChange={e => set({ displayOrder: e.target.value })} /></label>
      </div>
      <div className="product-form-actions"><button className="button brand-button" disabled={busy}>{busy ? "Saving…" : "Save section"}</button></div>
    </form>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}

/** Create a new storefront section (e.g. a second tech section). Opens its page once created. */
export function CreateCollection() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ nameEn: "", nameBn: "", headlineEn: "", preset: "tech" as CollectionPreset, status: "draft" as ProductStatus, displayOrder: "100" });
  const { busy, notice, call } = useAdminCall<{ collections: Section[] }>("/api/admin/collections", labels, data => {
    const created = data.collections.find(c => c.slug === slugify(draft.nameEn));
    if (created) router.push(`/admin/sections/${created.id}`); else router.refresh();
  });
  if (!open) return <button type="button" className="button brand-button" onClick={() => setOpen(true)}>+ Create a new section</button>;
  return <form className="pulse-form product-form" onSubmit={e => { e.preventDefault(); void call("POST", { ...draft, slug: slugify(draft.nameEn) }, "Section created."); }}>
    <h3>New section</h3>
    <label>Section name<input required maxLength={60} value={draft.nameEn} disabled={busy} onChange={e => setDraft(d => ({ ...d, nameEn: e.target.value }))} placeholder="e.g. Gaming gear" /></label>
    <label>সেকশনের নাম (বাংলা, optional)<input maxLength={60} value={draft.nameBn} disabled={busy} onChange={e => setDraft(d => ({ ...d, nameBn: e.target.value }))} /></label>
    <label>Headline (large text on the storefront)<input maxLength={100} value={draft.headlineEn} disabled={busy} onChange={e => setDraft(d => ({ ...d, headlineEn: e.target.value }))} placeholder="e.g. Level up your setup." /></label>
    <label>Section type (sets the category list)<select value={draft.preset} disabled={busy} onChange={e => setDraft(d => ({ ...d, preset: e.target.value as CollectionPreset }))}>{collectionPresets.map(p => <option key={p} value={p}>{presetLabel[p].en} · {presetLabel[p].bn}</option>)}</select></label>
    <small>New sections start as drafts. Add products, then set the section to Published.</small>
    <div className="product-form-actions"><button className="button brand-button" disabled={busy || !draft.nameEn.trim()}>{busy ? "Creating…" : "Create section"}</button><button type="button" className="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button></div>
    <p role="status" aria-live="polite">{notice}</p>
  </form>;
}
