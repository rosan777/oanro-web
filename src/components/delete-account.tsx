"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./locale";
/** "Delete my account" on My account. The customer must type DELETE; orders in progress block it. */
export function DeleteAccount() {
  const router = useRouter(); const { locale } = useLocale(); const t = (en: string, bn: string) => locale === "bn" ? bn : en;
  const [open, setOpen] = useState(false); const [typed, setTyped] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function remove() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: typed.trim() }) }).catch(() => null);
    const body = await res?.json().catch(() => ({})) as { error?: string; orders?: string[] } | undefined;
    if (res?.ok) { router.replace("/"); router.refresh(); return; }
    setBusy(false);
    setMsg(body?.error === "ACTIVE_ORDERS" ? t(`You have orders still in progress (${body.orders?.join(", ")}). You can delete your account after they are delivered or closed.`, `আপনার কিছু অর্ডার এখনো চলমান (${body.orders?.join(", ")})। ডেলিভারি বা বন্ধ হওয়ার পর অ্যাকাউন্ট মুছতে পারবেন।`)
      : body?.error === "STAFF_ACCOUNT" ? t("Staff accounts can't be deleted here. Ask the owner.", "স্টাফ অ্যাকাউন্ট এখান থেকে মোছা যায় না। মালিকের সাথে কথা বলুন।")
      : t("Couldn't delete your account. Please try again.", "অ্যাকাউন্ট মোছা যায়নি। আবার চেষ্টা করুন।"));
  }
  return <section className="profile-card delete-account">
    <h2>{t("Delete account", "অ্যাকাউন্ট মুছে ফেলুন")}</h2>
    <p>{t("This permanently erases your name, email, phone, addresses and sign-in. Past orders stay in our accounts without your personal details. This can't be undone.", "এতে আপনার নাম, ইমেইল, ফোন, ঠিকানা ও সাইন-ইন স্থায়ীভাবে মুছে যাবে। আগের অর্ডারগুলো আপনার ব্যক্তিগত তথ্য ছাড়া আমাদের হিসাবে থাকবে। এটা আর ফেরানো যাবে না।")}</p>
    {!open ? <div><button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>{t("Delete my account", "আমার অ্যাকাউন্ট মুছুন")}</button></div> : <div className="delete-confirm">
      <label>{t("Type DELETE to confirm", "নিশ্চিত করতে DELETE লিখুন")}<input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} /></label>
      <div className="delete-actions"><button type="button" className="btn btn-danger-solid" disabled={busy || typed.trim() !== "DELETE"} onClick={remove}>{busy ? t("Deleting…", "মোছা হচ্ছে…") : t("Delete forever", "চিরতরে মুছুন")}</button><button type="button" className="btn btn-neutral" disabled={busy} onClick={() => { setOpen(false); setTyped(""); setMsg(""); }}>{t("Cancel", "বাতিল")}</button></div>
    </div>}
    {msg && <p role="alert" className="security-msg is-error">{msg}</p>}
  </section>;
}
