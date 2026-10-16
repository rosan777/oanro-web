"use client";
import { useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog";
import { productCategories } from "@/lib/categories";
import { slugify, type ProductStatus } from "@/lib/product-input";
import type { OwnerCatalog } from "@/lib/store-products";
import { CategoryPicker, PhotoPicker, StatusSelect, statusLabel, useAdminCall } from "./admin-ui";

type Item = OwnerCatalog["products"][number];
type Section = OwnerCatalog["collections"][number];
type Draft = Record<string, string> & { status: ProductStatus };
const fieldLabel: Record<string, string> = { slug: "Web address", nameEn: "Name", nameBn: "Bangla name", categoryEn: "Category", price: "Price", stock: "Availability", sizes: "Sizes / options", specsEn: "Specifications", specsBn: "Bangla specifications", descriptionEn: "Description", image: "Photo", status: "Status", displayOrder: "Display order", collectionId: "Section" };
const lines = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");
const blank = (collectionId: string): Draft => ({ slug: "", status: "draft", collectionId, nameEn: "", nameBn: "", categoryEn: "", categoryBn: "", taglineEn: "", taglineBn: "", descriptionEn: "", descriptionBn: "", price: "", stock: "", sizes: "Standard", specsEn: "", specsBn: "", displayOrder: "0" });
// Availability only: "" = in stock (count not tracked), "0" = out of stock. Other counts are preserved as-is.
const toDraft = (p: Item): Draft => ({ slug: p.slug, status: p.status, collectionId: p.collectionId, nameEn: p.nameEn, nameBn: p.nameBn, categoryEn: p.categoryEn, categoryBn: p.categoryBn, taglineEn: p.taglineEn, taglineBn: p.taglineBn, descriptionEn: p.descriptionEn, descriptionBn: p.descriptionBn, price: String(p.price), stock: p.stock === null ? "" : String(p.stock), sizes: p.sizes.join(", "), specsEn: lines(p.specsEn), specsBn: lines(p.specsBn), displayOrder: String(p.displayOrder) });
const outOfStock = (stock: number | string | null) => stock === 0 || stock === "0";

export function ProductDashboard({ initial, collectionId }: { initial: OwnerCatalog; collectionId: string }) {
  const [all, setAll] = useState(initial.products);
  const [sections, setSections] = useState(initial.collections);
  const [managed, setManaged] = useState(initial.managed);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; hasImage: boolean } | null>(null);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [slugTouched, setSlugTouched] = useState(false);
  const { busy, notice, setNotice, call } = useAdminCall<{ products: Item[]; collections: Section[] }>("/api/admin/products", fieldLabel, data => { setAll(data.products); setSections(data.collections); setManaged(true); });
  const section = sections.find(s => s.id === collectionId);
  const items = all.filter(p => p.collectionId === collectionId);
  const options = productCategories[section?.preset ?? "general"];

  function open(item: Item | null) {
    setEditing(item ? { id: item.id, draft: toDraft(item), hasImage: item.hasImage } : { id: null, draft: blank(collectionId), hasImage: false });
    setPhoto(undefined); setSlugTouched(Boolean(item)); setNotice("");
  }
  function set(patch: Record<string, string>) {
    setEditing(e => {
      if (!e) return e;
      const draft = { ...e.draft, ...patch } as Draft;
      if ("nameEn" in patch && !slugTouched) draft.slug = slugify(patch.nameEn);
      return { ...e, draft };
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const body: Record<string, unknown> = { ...editing.draft, ...(photo !== undefined ? { image: photo } : {}) };
    const moved = editing.draft.collectionId !== collectionId ? ` It moved to “${sections.find(s => s.id === editing.draft.collectionId)?.nameEn}”.` : "";
    const ok = editing.id ? await call("PATCH", { id: editing.id, ...body }, `Product saved.${moved} Refresh the storefront to see it.`)
      : await call("POST", body, editing.draft.status === "published" ? `Product created and published.${moved}` : `Product saved as a draft.${moved} Publish it when ready.`);
    if (ok) setEditing(null);
  }
  const field = (name: string, label: string, props: Record<string, unknown> = {}) =>
    <label>{label}<input name={name} value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} {...props} /></label>;
  const area = (name: string, label: string, hint?: string) =>
    <label>{label}<textarea name={name} rows={4} value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} />{hint && <small>{hint}</small>}</label>;

  if (!initial.ready) return <p className="admin-callout">Product management needs the latest database migration. Run <code>npm run db:migrate</code>, then reload this page.</p>;
  return <section className="admin-sections admin-products" aria-labelledby="products-heading">
    <h2 id="products-heading">Products in this section</h2>
    {!managed && collectionId === "seasonal" && <div className="admin-callout"><p>The storefront is showing built-in demo products. Import them to edit them here, or add your own. Once any product exists, only products you publish are shown.</p><button type="button" className="button" disabled={busy} onClick={() => call("POST", { action: "import-demo" }, "Demo products imported. You can now edit, hide or archive them.")}>Import the 4 demo products</button></div>}
    {!editing && <button type="button" className="button brand-button" disabled={busy} onClick={() => open(null)}>Add product</button>}
    {editing && <form className="pulse-form product-form" onSubmit={save}>
      <h3>{editing.id ? `Edit ${editing.draft.nameEn || "product"}` : `New product in ${section?.nameEn ?? "this section"}`}</h3>
      {field("nameEn", "Name", { required: true, maxLength: 80 })}
      <CategoryPicker key={editing.id ?? "new"} options={options} en={editing.draft.categoryEn} bn={editing.draft.categoryBn} disabled={busy} onChange={(en, bn) => set({ categoryEn: en, categoryBn: bn })} />
      <div className="product-form-row">
        {field("price", "Price (৳ BDT)", { required: true, type: "number", min: 0, max: 10000000, step: 1, inputMode: "numeric" })}
        <label>Availability<select value={outOfStock(editing.draft.stock) ? "0" : ""} disabled={busy} onChange={e => set({ stock: e.target.value })}><option value="">In stock</option><option value="0">Out of stock</option></select><small>Customers only see “Out of stock”, never a count.</small></label>
      </div>
      {field("taglineEn", "Short tagline", { maxLength: 140 })}
      {area("descriptionEn", "Description")}
      {field("sizes", "Sizes or options (comma separated)", { required: true })}
      {area("specsEn", "Specifications", "One per line, for example “Material: Cotton”.")}
      <details><summary>Bangla text (optional)</summary>
        {field("nameBn", "নাম", { maxLength: 80 })}{field("taglineBn", "ট্যাগলাইন", { maxLength: 140 })}
        {area("descriptionBn", "বিবরণ")}{area("specsBn", "স্পেসিফিকেশন", "প্রতি লাইনে একটি, যেমন “ম্যাটেরিয়াল: কটন”।")}
      </details>
      <PhotoPicker value={photo} hasCurrent={editing.hasImage} disabled={busy} onChange={setPhoto} onError={setNotice} />
      <div className="product-form-row">
        <StatusSelect value={editing.draft.status} disabled={busy} onChange={status => set({ status })} />
        <label>Section<select value={editing.draft.collectionId} disabled={busy} onChange={e => set({ collectionId: e.target.value })}>{sections.map(s => <option key={s.id} value={s.id}>{s.nameEn}</option>)}</select></label>
      </div>
      <details><summary>Advanced</summary>
        {field("slug", "Web address", { required: true, maxLength: 60, pattern: "[a-z0-9]+(-[a-z0-9]+)*", onInput: () => setSlugTouched(true) })}
        <small>Product page: /products/{editing.draft.slug || "…"} — filled in from the name automatically.</small>
        {field("displayOrder", "Display order (lower shows first)", { type: "number", min: -1000, max: 1000, step: 1 })}
      </details>
      <div className="product-form-actions"><button type="submit" className="button brand-button" disabled={busy}>{busy ? "Saving…" : editing.id ? "Save changes" : "Create product"}</button><button type="button" className="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    {items.length === 0 && <p>No products in this section yet.{section?.preset === "caps" || section?.preset === "tech" ? " Until you add some, the storefront shows placeholder idea cards here." : " Empty sections are not shown on the storefront."}</p>}
    <ul className="admin-product-list">{items.map(item => <li key={item.id} className="admin-section-row">
      <div><strong>{item.nameEn}</strong><small>{item.categoryEn || "No category"} · {formatPrice(item.price)} · {outOfStock(item.stock) ? <b className="stock-badge">Out of stock</b> : "In stock"}{item.hasImage ? " · photo" : ""} · {statusLabel[item.status]}</small></div>
      <div className="admin-product-actions">
        <StatusSelect id={`status-${item.id}`} label="" value={item.status} disabled={busy} onChange={status => call("PATCH", { id: item.id, status }, `${item.nameEn}: ${statusLabel[status].toLowerCase()}.`)} />
        <button type="button" disabled={busy} onClick={() => call("PATCH", { id: item.id, stock: outOfStock(item.stock) ? null : 0 }, outOfStock(item.stock) ? `${item.nameEn} is back in stock.` : `${item.nameEn} marked out of stock.`)}>{outOfStock(item.stock) ? "Back in stock" : "Mark out of stock"}</button>
        <button type="button" disabled={busy} onClick={() => open(item)}>Edit</button>
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Archive “${item.nameEn}”? It disappears from the store and this list. The record is kept for the audit log.`)) void call("DELETE", { id: item.id }, `${item.nameEn} archived.`); }}>Archive</button>
      </div>
    </li>)}</ul>
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
