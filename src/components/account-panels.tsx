"use client";

// Interactive parts of My account: the address book, the newsletter switch and the saved-items count.
// Everything is saved through the signed-in customer APIs, which only ever touch the customer's own rows.

import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale } from "./locale";
import { useWishlist } from "@/lib/saved-lists";

type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  city: string;
  postcode: string;
  insideDhaka: boolean;
  isDefault: boolean;
};

const json = (method: string, body: unknown) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export function SavedCount() {
  return <>{useWishlist().length}</>;
}

export function AddressBook({ initial }: { initial: Address[] }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const [list, setList] = useState(initial);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fieldText: Record<string, string> = {
    phone: t("Enter a valid mobile number (01XXXXXXXXX).", "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।"),
    address: t(
      "Enter the full address (at least 10 characters).",
      "পূর্ণ ঠিকানা দিন (কমপক্ষে ১০ অক্ষর)।",
    ),
  };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const res = await fetch(
      "/api/account/addresses",
      json("POST", {
        ...(editing && editing !== "new" ? { id: editing.id } : {}),
        label: f.get("label"),
        name: f.get("name"),
        phone: f.get("phone"),
        address: f.get("address"),
        area: f.get("area"),
        city: f.get("city"),
        postcode: f.get("postcode"),
        insideDhaka: f.get("insideDhaka") === "on",
        isDefault: f.get("isDefault") === "on",
      }),
    ).catch(() => null);
    setBusy(false);
    const data = (await res?.json().catch(() => ({}))) as {
      addresses?: Address[];
      error?: string;
      field?: string;
    };
    if (res?.ok && data.addresses) {
      setList(data.addresses);
      setEditing(null);
      return;
    }
    setError(
      data.field && fieldText[data.field]
        ? fieldText[data.field]
        : data.error === "LIMIT_REACHED"
          ? t("You can save up to 10 addresses.", "সর্বোচ্চ ১০টি ঠিকানা রাখা যায়।")
          : t("Couldn't save. Please try again.", "সংরক্ষণ হয়নি। আবার চেষ্টা করুন।"),
    );
  }

  async function remove(a: Address) {
    if (
      !window.confirm(
        t(
          `Delete the address “${a.label || a.address.slice(0, 30)}”?`,
          `“${a.label || a.address.slice(0, 30)}” ঠিকানাটি মুছবেন?`,
        ),
      )
    )
      return;
    const res = await fetch("/api/account/addresses", json("DELETE", { id: a.id })).catch(
      () => null,
    );
    const data = (await res?.json().catch(() => ({}))) as { addresses?: Address[] };
    if (res?.ok && data.addresses) setList(data.addresses);
    else setError(t("Couldn't delete. Please try again.", "মোছা যায়নি। আবার চেষ্টা করুন।"));
  }

  const current = editing && editing !== "new" ? editing : null;
  return (
    <div className="o-panel o-address-book">
      <div className="o-section-line">
        <h2>{t("Addresses", "ঠিকানা")}</h2>
        {!editing && list.length < 10 && (
          <button type="button" className="o-button secondary" onClick={() => setEditing("new")}>
            {t("Add an address", "ঠিকানা যোগ করুন")} <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="o-muted">
        {t(
          "Pick a saved address at checkout to fill in your delivery details.",
          "চেকআউটে সংরক্ষিত ঠিকানা বেছে নিলে ডেলিভারি তথ্য নিজে থেকে পূরণ হবে।",
        )}
      </p>
      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
      {editing ? (
        <form className="o-form o-form-grid" onSubmit={save} key={current?.id ?? "new"}>
          <label>
            {t("Label (e.g. Home, Office)", "নাম (যেমন বাসা, অফিস)")}
            <input name="label" maxLength={40} defaultValue={current?.label} />
          </label>
          <label>
            {t("Recipient name", "প্রাপকের নাম")}
            <input name="name" maxLength={80} defaultValue={current?.name} autoComplete="name" />
          </label>
          <label>
            {t("Mobile number", "মোবাইল নম্বর")}
            <input
              name="phone"
              inputMode="tel"
              maxLength={20}
              placeholder="01XXXXXXXXX"
              defaultValue={current?.phone}
              autoComplete="tel"
            />
          </label>
          <label className="wide">
            {t("Address *", "ঠিকানা *")}
            <textarea
              name="address"
              required
              minLength={10}
              maxLength={300}
              rows={2}
              defaultValue={current?.address}
              autoComplete="street-address"
            />
          </label>
          <label>
            {t("Area", "এলাকা")}
            <input name="area" maxLength={80} defaultValue={current?.area} />
          </label>
          <label>
            {t("City", "শহর")}
            <input
              name="city"
              maxLength={80}
              defaultValue={current?.city}
              autoComplete="address-level2"
            />
          </label>
          <label>
            {t("Postcode", "পোস্টকোড")}
            <input
              name="postcode"
              maxLength={12}
              defaultValue={current?.postcode}
              autoComplete="postal-code"
            />
          </label>
          <label className="o-check">
            <input
              type="checkbox"
              name="insideDhaka"
              defaultChecked={current?.insideDhaka ?? true}
            />
            {t("Inside Dhaka", "ঢাকার ভেতরে")}
          </label>
          <label className="o-check">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={current?.isDefault ?? list.length === 0}
            />
            {t("Use as my default address", "ডিফল্ট ঠিকানা হিসেবে রাখুন")}
          </label>
          <div className="o-step-actions wide">
            <button type="button" className="o-button secondary" onClick={() => setEditing(null)}>
              {t("Cancel", "বাতিল")}
            </button>
            <button className="o-button" disabled={busy}>
              {busy ? t("Saving…", "সংরক্ষণ হচ্ছে…") : t("Save address", "ঠিকানা সংরক্ষণ")}
            </button>
          </div>
        </form>
      ) : list.length ? (
        <ul className="o-address-list">
          {list.map(a => (
            <li key={a.id}>
              <MapPin size={18} aria-hidden="true" />
              <div>
                <b>
                  {a.label || t("Address", "ঠিকানা")}
                  {a.isDefault && <span className="o-status">{t("Default", "ডিফল্ট")}</span>}
                </b>
                <small>{[a.name, a.phone].filter(Boolean).join(" · ")}</small>
                <small>{[a.address, a.area, a.city, a.postcode].filter(Boolean).join(", ")}</small>
                <small>
                  {a.insideDhaka
                    ? t("Inside Dhaka", "ঢাকার ভেতরে")
                    : t("Outside Dhaka", "ঢাকার বাইরে")}
                </small>
              </div>
              <button
                type="button"
                onClick={() => setEditing(a)}
                aria-label={t(`Edit ${a.label || "address"}`, `${a.label || "ঠিকানা"} সম্পাদনা`)}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => remove(a)}
                aria-label={t(`Delete ${a.label || "address"}`, `${a.label || "ঠিকানা"} মুছুন`)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="o-empty o-empty-small">
          <MapPin size={30} aria-hidden="true" />
          <h3>{t("No saved addresses yet.", "এখনো কোনো ঠিকানা সংরক্ষিত নেই।")}</h3>
        </div>
      )}
    </div>
  );
}

export function NewsletterToggle() {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/account/newsletter")
      .then(r => (r.ok ? r.json() : null))
      .then(d => setOn(Boolean(d?.subscribed)))
      .catch(() => setOn(false));
  }, []);
  return (
    <label className="o-check o-switch">
      <input
        type="checkbox"
        checked={Boolean(on)}
        disabled={on === null || busy}
        onChange={async e => {
          const next = e.target.checked;
          setBusy(true);
          const res = await fetch(
            "/api/account/newsletter",
            json("POST", { subscribe: next, locale }),
          ).catch(() => null);
          setBusy(false);
          if (res?.ok) setOn(next);
        }}
      />
      {t(
        "Send me OANRO news and offers by email (a few a month at most).",
        "ইমেইলে OANRO-র খবর ও অফার পাঠান (মাসে কয়েকবারের বেশি নয়)।",
      )}
    </label>
  );
}
