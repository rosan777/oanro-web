"use client";
import { useRef, useState, type FormEvent } from "react";
import { formatPrice } from "@/lib/catalog";
import { productCategories } from "@/lib/categories";
import { slugify, type ProductStatus } from "@/lib/product-input";
import type { OwnerCatalog } from "@/lib/store-products";
import { ActionIcon } from "./action-icon";
import { CategoryPicker, PhotoPicker, StatusSelect, statusLabel, useAdminCall } from "./admin-ui";

type Item = OwnerCatalog["products"][number];
type Section = OwnerCatalog["collections"][number];
type Draft = Record<string, string> & { status: ProductStatus };
const fieldLabel: Record<string, string> = { slug: "Web address", nameEn: "Name", nameBn: "Bangla name", categoryEn: "Category", price: "Price", stock: "Stock quantity", lowStockAt: "Restock alert level", costPrice: "Cost price", compareAtPrice: "Original price (must be higher than the price)", colors: "Colours", variants: "Stock per colour/size", en: "Colour name", bn: "Colour Bangla name", sizes: "Sizes / options", specsEn: "Specifications", specsBn: "Bangla specifications", descriptionEn: "Description", image: "Photo", status: "Status", displayOrder: "Display order", collectionId: "Section" };
const lines = (rows: [string, string][]) => rows.map(([k, v]) => `${k}: ${v}`).join("\n");
const blank = (collectionId: string): Draft => ({ compareAtPrice: "", slug: "", status: "draft", collectionId, nameEn: "", nameBn: "", categoryEn: "", categoryBn: "", taglineEn: "", taglineBn: "", descriptionEn: "", descriptionBn: "", price: "", stock: "", lowStockAt: "", costPrice: "", sizes: "Standard", specsEn: "", specsBn: "", displayOrder: "0" });
// Stock: "" = not counted (unlimited), a number = units left (orders take from it automatically).
const toDraft = (p: Item, cost: number | null = null): Draft => ({ compareAtPrice: p.compareAtPrice === null ? "" : String(p.compareAtPrice), lowStockAt: p.lowStockAt === null ? "" : String(p.lowStockAt), costPrice: cost === null ? "" : String(cost), slug: p.slug, status: p.status, collectionId: p.collectionId, nameEn: p.nameEn, nameBn: p.nameBn, categoryEn: p.categoryEn, categoryBn: p.categoryBn, taglineEn: p.taglineEn, taglineBn: p.taglineBn, descriptionEn: p.descriptionEn, descriptionBn: p.descriptionBn, price: String(p.price), stock: p.stock === null ? "" : String(p.stock), sizes: p.sizes.join(", "), specsEn: lines(p.specsEn), specsBn: lines(p.specsBn), displayOrder: String(p.displayOrder) });
const outOfStock = (stock: number | string | null) => stock === 0 || stock === "0";
/** Colours being edited (id is made from the English name, like the server does). */
type ColorRow = { en: string; bn: string; hex: string; key: string };
type Options = { colors: ColorRow[]; track: boolean; grid: Record<string, string>; photos: Record<string, string | null | undefined> };
const sizeList = (raw: string) => [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
const optionsOf = (p: Item | null): Options => ({
  colors: (p?.colors ?? []).map(c => ({ en: c.en, bn: c.bn, hex: c.hex, key: c.id })),
  track: Boolean(p?.variants), grid: Object.fromEntries((p?.variants ?? []).map(v => [`${v.color}|${v.size}`, String(v.stock)])), photos: {},
});
const swatches = ["#111111", "#ffffff", "#c62828", "#1565c0", "#2e7d32", "#f9a825", "#6a1b9a", "#ef6c9a", "#8d6e63", "#9e9e9e", "#1f513c", "#0d1b3e"];

/** costs is only passed to staff with "Cost prices" access; everyone else never receives cost data. */
type Rights = { manage: boolean; draft: boolean; publish: boolean; hide: boolean };
const fullRights: Rights = { manage: true, draft: true, publish: true, hide: true };
/** Statuses this person may move a product TO, given where it is now (mirrors the API's rules). */
function allowedStatuses(r: Rights, current: ProductStatus): ProductStatus[] {
  if (r.manage) return ["draft", "published", "hidden"];
  const out: ProductStatus[] = [];
  if (r.publish) out.push("published");
  if (r.hide) out.push("hidden");
  if (current === "published" ? r.hide : r.draft) out.push("draft");
  return out;
}
export function ProductDashboard({ initial, collectionId, costs: initialCosts = null, rights = fullRights }: { initial: OwnerCatalog; collectionId: string; costs?: Record<string, number | null> | null; rights?: Rights }) {
  const [costs, setCosts] = useState(initialCosts);
  const costApi = useAdminCall<{ costs: Record<string, number | null> }>("/api/admin/costs", { costPrice: "Cost price" }, data => setCosts(data.costs));
  const [all, setAll] = useState(initial.products);
  const [sections, setSections] = useState(initial.collections);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft; hasImage: boolean } | null>(null);
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [opts, setOpts] = useState<Options>(optionsOf(null));
  const latest = useRef<Item[]>(initial.products);
  const [slugTouched, setSlugTouched] = useState(false);
  const { busy, notice, setNotice, call } = useAdminCall<{ products: Item[]; collections: Section[] }>("/api/admin/products", fieldLabel, data => { latest.current = data.products; setAll(data.products); setSections(data.collections); });
  const section = sections.find(s => s.id === collectionId);
  const items = all.filter(p => p.collectionId === collectionId);
  const options = productCategories[section?.preset ?? "general"];

  function open(item: Item | null) {
    setEditing(item ? { id: item.id, draft: toDraft(item, costs?.[item.id] ?? null), hasImage: item.hasImage } : { id: null, draft: blank(collectionId), hasImage: false });
    setPhoto(undefined); setOpts(optionsOf(item)); setSlugTouched(Boolean(item)); setNotice("");
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
    const { costPrice, ...draft } = editing.draft;
    const colors = opts.colors.filter(c => c.en.trim()).map(c => ({ en: c.en.trim(), bn: c.bn.trim(), hex: c.hex }));
    const colorIds = colors.length ? colors.map(c => slugify(c.en).slice(0, 30)) : [""];
    const sizes = sizeList(editing.draft.sizes);
    const variants = opts.track ? colorIds.flatMap(color => sizes.map(size => ({ color, size, stock: opts.grid[`${color}|${size}`] ?? "0" }))) : null;
    const body: Record<string, unknown> = { ...draft, colors, variants, ...(photo !== undefined ? { image: photo } : {}) };
    const moved = editing.draft.collectionId !== collectionId ? ` It moved to “${sections.find(s => s.id === editing.draft.collectionId)?.nameEn}”.` : "";
    const ok = editing.id ? await call("PATCH", { id: editing.id, ...body }, `Product saved.${moved} Refresh the storefront to see it.`)
      : await call("POST", body, editing.draft.status === "published" ? `Product created and published.${moved}` : `Product saved as a draft.${moved} Publish it when ready.`);
    // Cost is saved separately (its own permission and audit entry), only when it changed.
    const before = editing.id ? costs?.[editing.id] ?? null : null;
    if (ok && costs && (costPrice === "" ? null : Number(costPrice)) !== before) {
      if (!await costApi.call("PATCH", { slug: editing.draft.slug, costPrice }, "")) { setNotice("Product saved, but the cost price was not. Check the number and try again."); return; }
    }
    // Colour photos go up one at a time after the product is saved (keeps each request small).
    if (ok) {
      const saved = latest.current.find(p => p.slug === editing.draft.slug);
      const changedPhotos = Object.entries(opts.photos).filter(([key, v]) => v !== undefined && colorIds.includes(slugify(opts.colors.find(c => c.key === key)?.en ?? "").slice(0, 30)));
      for (const [key, image] of changedPhotos) {
        const color = slugify(opts.colors.find(c => c.key === key)!.en).slice(0, 30);
        if (saved && !await call("PATCH", { id: saved.id, action: "color-image", color, image }, "")) { setNotice(`Product saved, but the photo for “${color}” was not. Try again.`); return; }
      }
      if (changedPhotos.length) setNotice("Product and colour photos saved.");
    }
    if (ok) setEditing(null);
  }
  const setColor = (i: number, patch: Partial<ColorRow>) => setOpts(o => ({ ...o, colors: o.colors.map((c, j) => j === i ? { ...c, ...patch } : c) }));
  const field = (name: string, label: string, props: Record<string, unknown> = {}) =>
    <label>{label}<input name={name} value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} {...props} /></label>;
  const area = (name: string, label: string, hint?: string) =>
    <label>{label}<textarea name={name} rows={4} value={editing!.draft[name]} onChange={e => set({ [name]: e.target.value })} disabled={busy} />{hint && <small>{hint}</small>}</label>;

  if (!initial.ready) return <p className="admin-callout">Product management needs the latest database migration. Run <code>npm run db:migrate</code>, then reload this page.</p>;
  return <section className="admin-sections admin-products" aria-labelledby="products-heading">
    <h2 id="products-heading">Products in this section</h2>
    {!rights.manage && <p className="admin-callout">Your role: {[rights.draft && "write drafts", rights.publish && "publish", rights.hide && "hide"].filter(Boolean).join(", ") || "view only"}. {rights.draft ? "You can edit products only while they are drafts." : ""}</p>}
    {!editing && rights.draft && <button type="button" className="button brand-button" disabled={busy} onClick={() => open(null)}>Add product</button>}
    {editing && <form className="pulse-form product-form" onSubmit={save}>
      <h3>{editing.id ? `Edit ${editing.draft.nameEn || "product"}` : `New product in ${section?.nameEn ?? "this section"}`}</h3>
      {field("nameEn", "Name", { required: true, maxLength: 80 })}
      <CategoryPicker key={editing.id ?? "new"} options={options} en={editing.draft.categoryEn} bn={editing.draft.categoryBn} disabled={busy} onChange={(en, bn) => set({ categoryEn: en, categoryBn: bn })} />
      <div className="product-form-row">
        {field("price", "Price (৳ BDT)", { required: true, type: "number", min: 0, max: 10000000, step: 1, inputMode: "numeric" })}
        <label>Original price (optional)<input name="compareAtPrice" type="number" min={0} max={10000000} step={1} inputMode="numeric" value={editing.draft.compareAtPrice} placeholder="For a sale" disabled={busy} onChange={e => set({ compareAtPrice: e.target.value })} /><small>{editing.draft.compareAtPrice && editing.draft.price && Number(editing.draft.compareAtPrice) > Number(editing.draft.price) ? `Shows ৳${editing.draft.compareAtPrice} crossed out, ${Math.round((Number(editing.draft.compareAtPrice) - Number(editing.draft.price)) / Number(editing.draft.compareAtPrice) * 100)}% off.` : "Shown crossed out next to the price. Must be higher than the price. Blank = no sale."}</small></label>
        <label>Restock alert at<input name="lowStockAt" type="number" min={0} max={100000} step={1} inputMode="numeric" value={editing.draft.lowStockAt} placeholder="5" disabled={busy} onChange={e => set({ lowStockAt: e.target.value })} /><small>The Sales &amp; stock report warns when stock drops to this number or below. Blank = 5.</small></label>
        {!opts.track && <label>Stock quantity<input name="stock" type="number" min={0} max={1000000} step={1} inputMode="numeric" value={editing.draft.stock} placeholder="Unlimited" disabled={busy} onChange={e => set({ stock: e.target.value })} /><small>Goes down automatically with each order and back up if you reject one. 0 = out of stock; blank = not counted. Customers never see the number.</small></label>}
      </div>
      {costs && <div className="cost-field">
        <label><span className="private-tag">Private</span> Cost price per unit (৳)<input name="costPrice" type="number" min={0} max={10000000} step={1} inputMode="numeric" value={editing.draft.costPrice} placeholder="What one unit costs you" disabled={busy} onChange={e => set({ costPrice: e.target.value })} />
          <small>Only people with “Cost prices” access see this. Used for profit reports. Customers never see it.</small></label>
        {editing.draft.costPrice !== "" && editing.draft.price !== "" && (() => { const cost = Number(editing.draft.costPrice), price = Number(editing.draft.price), profit = price - cost;
          return <p className={`cost-preview ${profit < 0 ? "is-bad" : "is-good"}`} role="status">{profit < 0 ? <><ActionIcon name="alert" />Loss of {formatPrice(-profit)} per unit: the cost is higher than the price.</> : <><ActionIcon name="coin" />Profit {formatPrice(profit)} per unit{price > 0 ? ` (${Math.round(profit / price * 100)}% margin)` : ""}.</>}</p>; })()}
      </div>}
      {field("taglineEn", "Short tagline", { maxLength: 140 })}
      {area("descriptionEn", "Description")}
      {field("sizes", "Sizes or options (comma separated)", { required: true })}
      <fieldset className="variant-editor"><legend>Colours (optional)</legend>
        <small>Add each colour this product comes in. Shoppers pick a colour, and its photo is shown. Leave empty if there is only one colour.</small>
        {opts.colors.map((c, i) => <div className="color-row" key={c.key}>
          <label className="color-pick">Swatch<input type="color" value={c.hex} disabled={busy} onChange={e => setColor(i, { hex: e.target.value })} /></label>
          <label>Colour name<input value={c.en} maxLength={30} required placeholder="e.g. Red" disabled={busy} onChange={e => setColor(i, { en: e.target.value })} /></label>
          <label>বাংলা নাম<input value={c.bn} maxLength={30} placeholder="যেমন লাল" disabled={busy} onChange={e => setColor(i, { bn: e.target.value })} /></label>
          <div className="color-quick" aria-label="Quick swatches">{swatches.map(h => <button type="button" key={h} title={h} aria-label={`Use ${h}`} style={{ background: h }} disabled={busy} onClick={() => setColor(i, { hex: h })} />)}</div>
          <PhotoPicker legend={`Photo for ${c.en || "this colour"}`} value={opts.photos[c.key]} hasCurrent={Boolean(editing.id && all.find(p => p.id === editing.id)?.colorImages.includes(slugify(c.en).slice(0, 30)))} disabled={busy} onChange={v => setOpts(o => ({ ...o, photos: { ...o.photos, [c.key]: v } }))} onError={setNotice} />
          <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => setOpts(o => ({ ...o, colors: o.colors.filter((_, j) => j !== i) }))}><ActionIcon name="remove" size={14} />Remove colour</button>
        </div>)}
        {opts.colors.length < 12 && <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => setOpts(o => ({ ...o, colors: [...o.colors, { en: "", bn: "", hex: swatches[o.colors.length % swatches.length], key: `${Date.now()}-${o.colors.length}` }] }))}><ActionIcon name="add" size={14} />Add colour</button>}
      </fieldset>
      <fieldset className="variant-editor"><legend>Stock per colour and size</legend>
        <label className="check-row"><input type="checkbox" checked={opts.track} disabled={busy} onChange={e => setOpts(o => ({ ...o, track: e.target.checked }))} /> Count stock separately for each {opts.colors.some(c => c.en.trim()) ? "colour and size" : "size"}</label>
        {opts.track && (() => { const rows = opts.colors.filter(c => c.en.trim()); const ids = rows.length ? rows.map(c => ({ id: slugify(c.en).slice(0, 30), label: c.en })) : [{ id: "", label: "Stock" }]; const sizes = sizeList(editing.draft.sizes);
          const total = ids.reduce((s, c) => s + sizes.reduce((t, z) => t + (Number(opts.grid[`${c.id}|${z}`] ?? 0) || 0), 0), 0);
          return <><div className="table-scroll"><table className="variant-grid"><thead><tr><th></th>{sizes.map(z => <th key={z}>{z}</th>)}</tr></thead><tbody>{ids.map(c => <tr key={c.id}><th>{c.label}</th>{sizes.map(z => { const k = `${c.id}|${z}`;
            return <td key={z}><input type="number" min={0} max={1000000} step={1} inputMode="numeric" aria-label={`${c.label} ${z} stock`} value={opts.grid[k] ?? ""} placeholder="0" disabled={busy} onChange={e => setOpts(o => ({ ...o, grid: { ...o.grid, [k]: e.target.value } }))} /></td>; })}</tr>)}</tbody></table></div>
            <small>Total {total} units. Each order takes from the exact colour and size; 0 shows that option as sold out. Customers never see the numbers.</small></>; })()}
      </fieldset>
      {area("specsEn", "Specifications", "One per line, for example “Material: Cotton”.")}
      <details><summary>Bangla text (optional)</summary>
        {field("nameBn", "নাম", { maxLength: 80 })}{field("taglineBn", "ট্যাগলাইন", { maxLength: 140 })}
        {area("descriptionBn", "বিবরণ")}{area("specsBn", "স্পেসিফিকেশন", "প্রতি লাইনে একটি, যেমন “ম্যাটেরিয়াল: কটন”।")}
      </details>
      <PhotoPicker value={photo} hasCurrent={editing.hasImage} disabled={busy} onChange={setPhoto} onError={setNotice} />
      <div className="product-form-row">
        <StatusSelect value={editing.draft.status} disabled={busy} onChange={status => set({ status })} allowed={allowedStatuses(rights, "draft")} />
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
      <div><strong>{item.nameEn}</strong><small>{item.categoryEn || "No category"} · {formatPrice(item.price)} · {outOfStock(item.stock) ? <b className="stock-badge">Out of stock</b> : item.stock === null ? "In stock (not counted)" : `${item.stock} in stock${item.variants ? " (per colour/size)" : ""}`}{item.colors.length ? ` · ${item.colors.length} colour${item.colors.length === 1 ? "" : "s"}` : ""}{item.compareAtPrice ? ` · sale (was ${formatPrice(item.compareAtPrice)})` : ""}{item.hasImage ? " · photo" : ""} · {statusLabel[item.status]}</small></div>
      <div className="admin-product-actions">
        <StatusSelect id={`status-${item.id}`} label="" value={item.status} disabled={busy} allowed={allowedStatuses(rights, item.status)} onChange={status => call("PATCH", { id: item.id, status }, `${item.nameEn}: ${statusLabel[status].toLowerCase()}.`)} />
        {rights.manage && !item.variants && <button type="button" className="btn btn-neutral" disabled={busy} onClick={() => call("PATCH", { id: item.id, stock: outOfStock(item.stock) ? null : 0 }, outOfStock(item.stock) ? `${item.nameEn} is back in stock.` : `${item.nameEn} marked out of stock.`)}>{outOfStock(item.stock) ? "Back in stock" : "Mark out of stock"}</button>}
        {(rights.manage || (rights.draft && item.status === "draft")) && <button type="button" className="btn btn-neutral" disabled={busy} onClick={() => open(item)}><ActionIcon name="edit" />Edit</button>}
        {rights.manage && <button type="button" className="btn btn-danger" disabled={busy} onClick={() => { if (window.confirm(`Archive “${item.nameEn}”? It disappears from the store and this list. The record is kept for the audit log.`)) void call("DELETE", { id: item.id }, `${item.nameEn} archived.`); }}><ActionIcon name="archive" />Archive</button>}
      </div>
    </li>)}</ul>
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
