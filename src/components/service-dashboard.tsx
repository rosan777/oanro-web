"use client";
import { useState, type FormEvent } from "react";
import { serviceCategories } from "@/lib/categories";
import { slugify, type ProductStatus } from "@/lib/product-input";
import type { OwnerServices } from "@/lib/store-products";
import { CategoryPicker, PhotoPicker, StatusSelect, statusLabel, useAdminCall } from "./admin-ui";

type Item = OwnerServices["services"][number];
type Draft = Record<string, string> & { status: ProductStatus };
const fieldLabel: Record<string, string> = { slug: "Web address", titleEn: "Title", word: "Card word", categoryEn: "Category", summaryEn: "Short text", detailEn: "Details", image: "Thumbnail", status: "Status", displayOrder: "Display order" };
const blank: Draft = { slug: "", status: "draft", titleEn: "", titleBn: "", word: "", categoryEn: "", categoryBn: "", summaryEn: "", summaryBn: "", detailEn: "", detailBn: "", displayOrder: "0" };
const toDraft = (s: Item): Draft => ({ slug: s.slug, status: s.status, titleEn: s.titleEn, titleBn: s.titleBn, word: s.word, categoryEn: s.categoryEn, categoryBn: s.categoryBn, summaryEn: s.summaryEn, summaryBn: s.summaryBn, detailEn: s.detailEn, detailBn: s.detailBn, displayOrder: String(s.displayOrder) });

export function ServiceDashboard({ initial }: { initial: OwnerServices }) {
  const [items, setItems] = useState(initial.services);
  const [managed, setManaged] = useState(initial.managed);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; hasImage: boolean } | null>(null);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [slugTouched, setSlugTouched] = useState(false);
  const { busy, notice, setNotice, call } = useAdminCall<{ services: Item[] }>("/api/admin/services", fieldLabel, data => { setItems(data.services); setManaged(true); });
  function open(item: Item | null) { setEditing(item ? { id: item.id, draft: toDraft(item), hasImage: item.hasImage } : { id: null, draft: { ...blank }, hasImage: false }); setPhoto(undefined); setSlugTouched(Boolean(item)); setNotice(""); }
  function set(patch: Record<string, string>) {
    setEditing(e => { if (!e) return e; const draft = { ...e.draft, ...patch } as Draft; if ("titleEn" in patch && !slugTouched) draft.slug = slugify(patch.titleEn); return { ...e, draft }; });
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    const body: Record<string, unknown> = { ...editing.draft, ...(photo !== undefined ? { image: photo } : {}) };
    if (await (editing.id ? call("PATCH", { id: editing.id, ...body }, "Service saved. Refresh the storefront to see it.") : call("POST", body, editing.draft.status === "published" ? "Service created and published." : "Service saved as a draft."))) setEditing(null);
  }
  const field = (name: string, label: string, props: Record<string, unknown> = {}) => <label>{label}<input value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} {...props} /></label>;
  const area = (name: string, label: string, max: number) => <label>{label}<textarea rows={3} maxLength={max} value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} /></label>;

  if (!initial.ready) return <p className="admin-callout">Services need the latest database migration. Run <code>npm run db:migrate</code>, then reload this page.</p>;
  return <section className="admin-sections admin-products" aria-labelledby="services-heading">
    <h2 id="services-heading">Services</h2>
    {!managed && <div className="admin-callout"><p>The storefront is showing the 4 built-in services. Import them to edit them, or add your own. Once any service exists, only published services are shown.</p><button type="button" className="button" disabled={busy} onClick={() => call("POST", { action: "import-demo" }, "Built-in services imported. You can now edit them.")}>Import the 4 current services</button></div>}
    {!editing && <button type="button" className="button brand-button" disabled={busy} onClick={() => open(null)}>Add service</button>}
    {editing && <form className="pulse-form product-form" onSubmit={save}>
      <h3>{editing.id ? `Edit ${editing.draft.titleEn || "service"}` : "New service"}</h3>
      {field("titleEn", "Title", { required: true, maxLength: 80 })}
      <CategoryPicker key={editing.id ?? "new"} options={serviceCategories} en={editing.draft.categoryEn} bn={editing.draft.categoryBn} disabled={busy} onChange={(en, bn) => set({ categoryEn: en, categoryBn: bn })} />
      {field("word", "Card word (big text on the card, e.g. WEB, APP)", { maxLength: 12 })}
      {area("summaryEn", "Short text (shown on the card)", 160)}
      {area("detailEn", "Details (shown when the card flips)", 800)}
      <details><summary>Bangla text (optional)</summary>{field("titleBn", "শিরোনাম", { maxLength: 80 })}{area("summaryBn", "সংক্ষিপ্ত লেখা", 160)}{area("detailBn", "বিস্তারিত", 800)}</details>
      <PhotoPicker legend="Thumbnail (optional)" value={photo} hasCurrent={editing.hasImage} disabled={busy} onChange={setPhoto} onError={setNotice} />
      <StatusSelect value={editing.draft.status} disabled={busy} onChange={status => set({ status })} />
      <details><summary>Advanced</summary>{field("slug", "Web address", { required: true, maxLength: 60, pattern: "[a-z0-9]+(-[a-z0-9]+)*", onInput: () => setSlugTouched(true) })}{field("displayOrder", "Display order (lower shows first)", { type: "number", min: -1000, max: 1000, step: 1 })}</details>
      <div className="product-form-actions"><button type="submit" className="button brand-button" disabled={busy}>{busy ? "Saving…" : editing.id ? "Save changes" : "Create service"}</button><button type="button" className="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    <ul className="admin-product-list">{items.map(item => <li key={item.id} className="admin-section-row">
      <div><strong>{item.titleEn}</strong><small>{item.categoryEn || "No category"}{item.hasImage ? " · thumbnail" : ""} · {statusLabel[item.status]}</small></div>
      <div className="admin-product-actions">
        <StatusSelect label="" value={item.status} disabled={busy} onChange={status => call("PATCH", { id: item.id, status }, `${item.titleEn}: ${statusLabel[status].toLowerCase()}.`)} />
        <button type="button" disabled={busy} onClick={() => open(item)}>Edit</button>
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Archive “${item.titleEn}”?`)) void call("DELETE", { id: item.id }, `${item.titleEn} archived.`); }}>Archive</button>
      </div>
    </li>)}</ul>
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
