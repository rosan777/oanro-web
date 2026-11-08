"use client";
import { useAdminText } from "./admin-text";
import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Pin, PinOff, X } from "lucide-react";
import { slugify, type ProductStatus } from "@/lib/product-input";
import { formatDhaka, toDhakaInput } from "@/lib/dhaka-time";
import type { OwnerCampaign, CampaignItem } from "@/lib/campaign-store";
import { PhotoPicker, StatusSelect, statusLabel, useAdminCall } from "./admin-ui";

type Pick = { id: string; name: string; section: string; status: ProductStatus };
type Draft = Record<string, string> & { status: ProductStatus };

// Field names for error messages, and the badge text and colour for each campaign phase.

const fieldLabel: Record<string, string> = {
  slug: "Web address",
  nameEn: "Campaign name",
  startsAt: "Starts",
  endsAt: "Ends (must be after the start)",
  image: "Banner",
  headlineEn: "Headline",
  descriptionEn: "Description",
};
const phaseLabel: Record<OwnerCampaign["phase"], [string, string]> = {
  running: ["Running now", "is-on"],
  scheduled: ["Scheduled", "is-scheduled"],
  ended: ["Ended", "is-off"],
  draft: ["Draft", "is-off"],
  hidden: ["Hidden", "is-off"],
};
const blank: Draft = {
  slug: "",
  status: "draft",
  nameEn: "",
  nameBn: "",
  headlineEn: "",
  headlineBn: "",
  descriptionEn: "",
  descriptionBn: "",
  startsAt: "",
  endsAt: "",
  displayOrder: "0",
};
const toDraft = (c: OwnerCampaign): Draft => ({
  slug: c.slug,
  status: c.status,
  nameEn: c.nameEn,
  nameBn: c.nameBn,
  headlineEn: c.headlineEn,
  headlineBn: c.headlineBn,
  descriptionEn: c.descriptionEn,
  descriptionBn: c.descriptionBn,
  startsAt: toDhakaInput(c.startsAt),
  endsAt: toDhakaInput(c.endsAt),
  displayOrder: String(c.displayOrder),
});

/** Admin campaigns: create and edit, pick and order the products in each campaign, change status, archive. */
export function CampaignDashboard({
  initial,
  products,
}: {
  initial: OwnerCampaign[];
  products: Pick[];
}) {
  const tr = useAdminText();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<{
    id: string | null;
    draft: Draft;
    hasImage: boolean;
  } | null>(null);
  const [picking, setPicking] = useState<{ id: string; name: string; list: CampaignItem[] } | null>(
    null,
  );
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [slugTouched, setSlugTouched] = useState(false);
  const { busy, notice, setNotice, call } = useAdminCall<{ campaigns: OwnerCampaign[] }>(
    "/api/admin/campaigns",
    fieldLabel,
    d => setItems(d.campaigns),
  );
  const productName = (id: string) => products.find(p => p.id === id);
  function open(c: OwnerCampaign | null) {
    setPicking(null);
    setEditing(
      c
        ? { id: c.id, draft: toDraft(c), hasImage: c.hasImage }
        : { id: null, draft: { ...blank }, hasImage: false },
    );
    setPhoto(undefined);
    setSlugTouched(Boolean(c));
    setNotice("");
  }

  // Updates the draft; the web address follows the English name until it is edited by hand.

  const set = (patch: Record<string, string>) =>
    setEditing(e => {
      if (!e) return e;
      const draft = { ...e.draft, ...patch } as Draft;
      if ("nameEn" in patch && !slugTouched) draft.slug = slugify(patch.nameEn);
      return { ...e, draft };
    });
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const body: Record<string, unknown> = {
      ...editing.draft,
      ...(photo !== undefined ? { image: photo } : {}),
    };
    if (
      await (editing.id
        ? call("PATCH", { id: editing.id, ...body }, tr("Campaign saved."))
        : call("POST", body, tr("Campaign created. Now attach products to it.")))
    )
      setEditing(null);
  }
  const field = (name: string, label: string, props: Record<string, unknown> = {}) => (
    <label>
      {label}
      <input
        value={editing!.draft[name]}
        onChange={e => set({ [name]: e.target.value })}
        disabled={busy}
        {...props}
      />
    </label>
  );

  // Moves a product up or down in the campaign's product list.

  const move = (index: number, delta: number) =>
    setPicking(p => {
      if (!p) return p;
      const list = [...p.list];
      const [x] = list.splice(index, 1);
      list.splice(index + delta, 0, x);
      return { ...p, list };
    });

  return (
    <section className="admin-sections admin-products">
      <p>
        A campaign shows a banner and its products on the homepage, only between its start and end
        time (Bangladesh time). Leave a time empty for “no limit”.
      </p>
      {!editing && !picking && (
        <button
          type="button"
          className="button brand-button"
          disabled={busy}
          onClick={() => open(null)}
        >
          {tr("New campaign")}
        </button>
      )}
      {editing && (
        <form className="pulse-form product-form" onSubmit={save}>
          <h3>{editing.id ? `Edit ${editing.draft.nameEn || "campaign"}` : tr("New campaign")}</h3>
          {field("nameEn", tr("Campaign name (e.g. Winter Sale 2026)"), {
            required: true,
            maxLength: 80,
          })}
          {field("headlineEn", tr("Headline on the banner"), { maxLength: 120 })}
          <label>
            {tr("Short description")}
            <textarea
              rows={2}
              maxLength={400}
              value={editing.draft.descriptionEn}
              disabled={busy}
              onChange={e => set({ descriptionEn: e.target.value })}
            />
          </label>
          <div className="product-form-row">
            {field("startsAt", tr("Starts (Dhaka time)"), { type: "datetime-local" })}
            {field("endsAt", tr("Ends (Dhaka time)"), { type: "datetime-local" })}
          </div>
          <details>
            <summary>{tr("Bangla text (optional)")}</summary>
            {field("nameBn", "ক্যাম্পেইনের নাম", { maxLength: 80 })}
            {field("headlineBn", "ব্যানারের শিরোনাম", { maxLength: 120 })}
            <label>
              সংক্ষিপ্ত বিবরণ
              <textarea
                rows={2}
                maxLength={400}
                value={editing.draft.descriptionBn}
                disabled={busy}
                onChange={e => set({ descriptionBn: e.target.value })}
              />
            </label>
          </details>
          <PhotoPicker
            legend={tr("Banner image (wide photos work best)")}
            value={photo}
            hasCurrent={editing.hasImage}
            disabled={busy}
            onChange={setPhoto}
            onError={setNotice}
          />
          <StatusSelect
            value={editing.draft.status}
            disabled={busy}
            onChange={status => set({ status })}
          />
          <details>
            <summary>{tr("Advanced")}</summary>
            {field("slug", tr("Web address"), {
              required: true,
              maxLength: 60,
              pattern: "[a-z0-9]+(-[a-z0-9]+)*",
              onInput: () => setSlugTouched(true),
            })}
            {field("displayOrder", tr("Order when several run at once (lower first)"), {
              type: "number",
              min: -1000,
              max: 1000,
              step: 1,
            })}
          </details>
          <div className="product-form-actions">
            <button className="button brand-button" disabled={busy}>
              {busy ? tr("Saving…") : editing.id ? tr("Save campaign") : tr("Create campaign")}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              {tr("Cancel")}
            </button>
          </div>
        </form>
      )}
      {picking && (
        <div className="pulse-form product-form">
          <h3>Products in “{picking.name}”</h3>
          <small>
            {tr(
              tr(
                "Pinned products show first. Removing a product here only takes it out of this campaign.",
              ),
            )}
          </small>
          {picking.list.length === 0 && <p>{tr("No products attached yet.")}</p>}
          <ol className="campaign-pick-list">
            {picking.list.map((item, index) => {
              const p = productName(item.productId);
              return (
                <li key={item.productId} className="admin-section-row">
                  <div>
                    <strong>
                      {item.pinned ? "📌 " : ""}
                      {p?.name ?? tr("Unavailable product")}
                    </strong>
                    <small>{p ? `${p.section} · ${statusLabel[p.status]}` : ""}</small>
                  </div>
                  <div className="admin-product-actions">
                    <button
                      type="button"
                      title={item.pinned ? tr("Unpin") : tr("Pin to the front")}
                      aria-label={item.pinned ? tr("Unpin") : tr("Pin")}
                      onClick={() =>
                        setPicking(
                          x =>
                            x && {
                              ...x,
                              list: x.list.map((i, k) =>
                                k === index ? { ...i, pinned: !i.pinned } : i,
                              ),
                            },
                        )
                      }
                    >
                      {item.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Move up")}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Move down")}
                      disabled={index === picking.list.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={tr("Remove from campaign")}
                      onClick={() =>
                        setPicking(x => x && { ...x, list: x.list.filter((_, k) => k !== index) })
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          <label>
            {tr("Add a product")}
            <select
              value=""
              onChange={e => {
                const id = e.target.value;
                if (id)
                  setPicking(
                    x => x && { ...x, list: [...x.list, { productId: id, pinned: false }] },
                  );
              }}
            >
              <option value="">{tr("Choose a product…")}</option>
              {products
                .filter(p => !picking.list.some(i => i.productId === p.id))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.section}
                    {p.status !== "published" ? ` (${p.status})` : ""}
                  </option>
                ))}
            </select>
          </label>
          <div className="product-form-actions">
            <button
              type="button"
              className="button brand-button"
              disabled={busy}
              onClick={async () => {
                if (
                  await call(
                    "PATCH",
                    { id: picking.id, items: picking.list },
                    tr("Campaign products saved."),
                  )
                )
                  setPicking(null);
              }}
            >
              {tr("Save products")}
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={() => setPicking(null)}
            >
              {tr("Cancel")}
            </button>
          </div>
        </div>
      )}
      {items.length === 0 && !editing && <p>{tr("No campaigns yet.")}</p>}
      <ul className="admin-product-list">
        {items.map(c => {
          const [label, tone] = phaseLabel[c.phase];
          return (
            <li key={c.id} className="admin-section-row">
              <div>
                <strong>
                  {c.nameEn} <span className={`switch-badge small ${tone}`}>{label}</span>
                </strong>
                <small>
                  {c.startsAt ? `From ${formatDhaka(c.startsAt)}` : tr("No start limit")} ·{" "}
                  {c.endsAt ? `until ${formatDhaka(c.endsAt)}` : "no end"} · {c.items.length}{" "}
                  product{c.items.length === 1 ? "" : "s"}
                  {c.hasImage ? " · banner" : ""}
                </small>
              </div>
              <div className="admin-product-actions">
                <StatusSelect
                  label=""
                  value={c.status}
                  disabled={busy}
                  onChange={status =>
                    call(
                      "PATCH",
                      { id: c.id, status },
                      `${c.nameEn}: ${statusLabel[status].toLowerCase()}.`,
                    )
                  }
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setPicking({ id: c.id, name: c.nameEn, list: c.items });
                  }}
                >
                  {tr("Products")}
                </button>
                <button type="button" disabled={busy} onClick={() => open(c)}>
                  {tr("Edit")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Archive “${c.nameEn}”? Its products are not affected.`))
                      void call("DELETE", { id: c.id }, `${c.nameEn} archived.`);
                  }}
                >
                  {tr("Archive")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p role="status" aria-live="polite">
        {notice}
      </p>
    </section>
  );
}
