"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon } from "./action-icon";
import type { Profile } from "@/lib/profile-store";
import { useLocale } from "./locale";

const fieldError: Record<string, [string, string]> = {
  name: ["Enter your name (2–80 characters).", "আপনার নাম দিন (২–৮০ অক্ষর)।"], phone: ["Enter a valid mobile number (01XXXXXXXXX).", "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)।"],
  altPhone: ["Enter a valid alternate number or leave it empty.", "সঠিক বিকল্প নম্বর দিন বা খালি রাখুন।"], postcode: ["Postcode must be 4 digits.", "পোস্টকোড ৪ অঙ্কের হতে হবে।"],
};
export function ProfileForm({ initial, email }: { initial: Profile; email: string }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const router = useRouter();
  const [profile, setProfile] = useState(initial);
  const [editing, setEditing] = useState(!initial.phone && !initial.address);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      const response = await fetch("/api/account/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { profile?: Profile; field?: string };
      if (!response.ok || !result.profile) { setNotice(result.field && fieldError[result.field] ? fieldError[result.field][bn ? 1 : 0] : t("Couldn't save. Check the fields and try again.", "সেভ হয়নি। তথ্য দেখে আবার চেষ্টা করুন।")); return; }
      setProfile(result.profile); setEditing(false); setNotice(t("Profile saved.", "প্রোফাইল সেভ হয়েছে।")); router.refresh();
    } catch { setNotice(t("Couldn't reach the server.", "সার্ভারে পৌঁছানো যায়নি।")); }
    finally { setBusy(false); }
  }
  const rows: [string, string, string][] = [
    [t("Mobile", "মোবাইল"), profile.phone, ""], [t("Alternate mobile", "বিকল্প মোবাইল"), profile.altPhone, ""],
    [t("Delivery address", "ডেলিভারি ঠিকানা"), [profile.address, profile.area, [profile.city, profile.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", "), ""],
    [t("Permanent address", "স্থায়ী ঠিকানা"), profile.permanentAddress, ""], [t("Company / organisation", "প্রতিষ্ঠান"), profile.company, ""],
  ];
  const input = (name: keyof Profile, label: string, props: Record<string, unknown> = {}) =>
    <label>{label}<input name={name} defaultValue={profile[name]} disabled={busy} {...props} /></label>;
  return <section className="profile-card" aria-labelledby="profile-title">
    <div className="profile-head"><div><h2 id="profile-title">{profile.name}</h2><p>{email}</p></div>
      {!editing && <button type="button" className="btn btn-neutral" onClick={() => { setEditing(true); setNotice(""); }}><ActionIcon name="edit" />{t("Edit profile", "প্রোফাইল এডিট")}</button>}</div>
    {!editing ? <dl className="profile-facts">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || <span className="muted">{t("Not added", "যোগ করা হয়নি")}</span>}</dd></div>)}</dl>
    : <form className="profile-form" onSubmit={save}>
      {input("name", t("Full name *", "পূর্ণ নাম *"), { required: true, minLength: 2, maxLength: 80, autoComplete: "name" })}
      <div className="profile-row">{input("phone", t("Mobile", "মোবাইল"), { inputMode: "tel", autoComplete: "tel", placeholder: "01XXXXXXXXX" })}{input("altPhone", t("Alternate mobile (optional)", "বিকল্প মোবাইল (ঐচ্ছিক)"), { inputMode: "tel", placeholder: "01XXXXXXXXX" })}</div>
      <fieldset><legend>{t("Delivery address", "ডেলিভারি ঠিকানা")}</legend>
        {input("address", t("House, road", "বাসা, রোড"), { maxLength: 200, autoComplete: "address-line1" })}
        <div className="profile-row">{input("area", t("Area / thana", "এলাকা / থানা"), { maxLength: 80, autoComplete: "address-level3" })}{input("city", t("City / district", "শহর / জেলা"), { maxLength: 60, autoComplete: "address-level2" })}{input("postcode", t("Postcode", "পোস্টকোড"), { inputMode: "numeric", maxLength: 4, autoComplete: "postal-code" })}</div>
      </fieldset>
      <label>{t("Permanent address (optional)", "স্থায়ী ঠিকানা (ঐচ্ছিক)")}<textarea name="permanentAddress" rows={2} maxLength={300} defaultValue={profile.permanentAddress} disabled={busy} /></label>
      {input("company", t("Company / organisation (optional)", "প্রতিষ্ঠান (ঐচ্ছিক)"), { maxLength: 100, autoComplete: "organization" })}
      <small>{t("Used to fill in checkout faster. Only you and OANRO staff handling your orders can see it.", "চেকআউট দ্রুত পূরণ করতে ব্যবহার হয়। শুধু আপনি ও আপনার অর্ডার সামলানো OANRO স্টাফ দেখতে পারবেন।")}</small>
      <div className="product-form-actions"><button className="btn btn-primary" disabled={busy}><ActionIcon name="save" />{busy ? t("Saving…", "সেভ হচ্ছে…") : t("Save profile", "প্রোফাইল সেভ করুন")}</button>{(initial.phone || initial.address) && <button type="button" className="btn btn-neutral" disabled={busy} onClick={() => setEditing(false)}><ActionIcon name="cancel" />{t("Cancel", "বাতিল")}</button>}</div>
    </form>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
