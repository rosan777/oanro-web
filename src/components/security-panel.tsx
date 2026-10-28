"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ActionIcon } from "./action-icon";
import { useLocale } from "./locale";
import { PasswordField } from "./password-field";
import { qrSvg } from "@/lib/qr";

/** "Security" card on My account: two-step verification (authenticator app) and signing out other devices. */
export function SecurityPanel({ hasPassword, twoFactorOn, isStaff, mustSetup = false, enforced = false, owner = null }: { hasPassword: boolean; twoFactorOn: boolean; isStaff: boolean; mustSetup?: boolean; enforced?: boolean; owner?: { requireStaff2fa: boolean } | null }) {
  const [required, setRequired] = useState(owner?.requireStaff2fa ?? false);
  const { locale } = useLocale(); const bn = locale === "bn";
  const router = useRouter();
  const [on, setOn] = useState(twoFactorOn);
  const [step, setStep] = useState<"idle" | "password" | "setup" | "disable">("idle");
  const [setup, setSetup] = useState<{ key: string; uri: string; codes: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const L = (en: string, b: string) => bn ? b : en;
  async function run(fn: () => Promise<{ error?: unknown } | void>, fail: string) {
    setBusy(true); setMsg("");
    try { const r = await fn(); if (r && r.error) setMsg(fail); } catch { setMsg(L("Connection failed. Please try again.", "সংযোগে সমস্যা। আবার চেষ্টা করুন।")); } finally { setBusy(false); }
  }
  const field = (e: FormEvent<HTMLFormElement>, name: string) => { e.preventDefault(); return String(new FormData(e.currentTarget).get(name) ?? ""); };
  return <section className="profile-card security-card" aria-labelledby="security-h">
    <h2 id="security-h"><ActionIcon name="alert" size={18} />{L("Security", "নিরাপত্তা")}</h2>
    {mustSetup && !on && <p className="security-required" role="alert">{L("The owner requires two-step verification for staff. Turn it on below to open the staff workspace.", "Owner স্টাফদের জন্য দুই ধাপের যাচাই বাধ্যতামূলক করেছেন। স্টাফ workspace খুলতে নিচে এটি চালু করুন।")}</p>}
    {owner && <div className="security-row"><div><strong>{L("Require for all staff", "সব স্টাফের জন্য বাধ্যতামূলক")}</strong>
      <small>{L("Staff who sign in with a password must set up their own authenticator app before they can use the admin. Staff using Google sign-in are protected by Google. Customers are never affected.", "পাসওয়ার্ডে লগইন করা প্রত্যেক স্টাফকে অ্যাডমিন ব্যবহারের আগে নিজের ফোনে authenticator অ্যাপ সেট করতে হবে। Google দিয়ে লগইন করা স্টাফ Google-এর সুরক্ষায় থাকে। কাস্টমারদের ওপর কোনো প্রভাব নেই।")}</small></div>
      <button type="button" role="switch" aria-checked={required} className={`btn btn-sm ${required ? "btn-primary" : "btn-neutral"}`} disabled={busy} onClick={() => void run(async () => {
        const res = await fetch("/api/admin/security", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requireStaff2fa: !required }) });
        if (!res.ok) return { error: true };
        setRequired(!required); setMsg(!required ? L("Two-step verification is now required for staff.", "স্টাফদের জন্য দুই ধাপের যাচাই এখন বাধ্যতামূলক।") : L("Two-step verification is now optional for staff.", "স্টাফদের জন্য দুই ধাপের যাচাই এখন ঐচ্ছিক।"));
      }, L("Couldn't change the setting.", "সেটিং বদলানো যায়নি।"))}>{required ? L("Required: ON", "বাধ্যতামূলক: চালু") : L("Required: OFF", "বাধ্যতামূলক: বন্ধ")}</button></div>}
    {!hasPassword ? <p>{L("You sign in with Google, so your account is protected by Google. Turn on 2-Step Verification in your Google account for extra safety.", "আপনি Google দিয়ে লগইন করেন, তাই অ্যাকাউন্ট Google-এর নিরাপত্তায় সুরক্ষিত। বাড়তি সুরক্ষার জন্য Google অ্যাকাউন্টে 2-Step Verification চালু করুন।")}</p> : <>
      <div className="security-row"><div><strong>{L("Two-step verification", "দুই ধাপের যাচাই")}</strong>
        <small>{on ? L("On. Sign-in asks for a code from your authenticator app.", "চালু। লগইনের সময় authenticator অ্যাপের কোড লাগবে।") : L("Off. Add a code from your phone at sign-in, so a stolen password isn't enough.", "বন্ধ। লগইনে ফোনের কোড যোগ করুন, যাতে পাসওয়ার্ড চুরি হলেও কেউ ঢুকতে না পারে।")}{isStaff && !on ? L(" Strongly recommended for staff and the owner.", " স্টাফ ও owner-এর জন্য অবশ্যই চালু রাখুন।") : ""}</small></div>
        <span className={`stock-pill ${on ? "is-good" : "is-warn"}`}>{on ? L("On", "চালু") : L("Off", "বন্ধ")}</span></div>
      {step === "idle" && (on
        ? !enforced && <button type="button" className="btn btn-danger btn-sm" onClick={() => setStep("disable")}>{L("Turn off", "বন্ধ করুন")}</button>
        : <button type="button" className="btn btn-primary btn-sm" onClick={() => setStep("password")}><ActionIcon name="approve" size={14} />{L("Turn on two-step verification", "দুই ধাপের যাচাই চালু করুন")}</button>)}
      {(step === "password" || step === "disable") && <form className="security-form" onSubmit={e => { const password = field(e, "password");
        void run(async () => {
          if (step === "disable") { const r = await authClient.twoFactor.disable({ password }); if (!r.error) { setOn(false); setStep("idle"); setMsg(L("Two-step verification is off.", "দুই ধাপের যাচাই বন্ধ হয়েছে।")); router.refresh(); } return r; }
          const r = await authClient.twoFactor.enable({ password });
          if (!r.error && r.data && "totpURI" in r.data) { const uri = r.data.totpURI; setSetup({ uri, key: new URL(uri).searchParams.get("secret") ?? "", codes: r.data.backupCodes }); setStep("setup"); }
          return r;
        }, L("Wrong password. Try again.", "পাসওয়ার্ড ভুল। আবার চেষ্টা করুন।")); }}>
        {step === "password" && <ol className="security-steps" aria-label={L("How it works", "কীভাবে কাজ করে")}>
          <li className="is-current"><strong>{L("Step 1: Confirm your password", "ধাপ ১: পাসওয়ার্ড দিন")}</strong><small>{L("Only to prove it's you. No code needed yet.", "শুধু আপনিই কিনা নিশ্চিত করতে। এখনো কোনো কোড লাগবে না।")}</small></li>
          <li><strong>{L("Step 2: Add OANRO to your authenticator app", "ধাপ ২: authenticator অ্যাপে OANRO যোগ করুন")}</strong><small>{L("Next screen shows a setup key. Type it into Google Authenticator; the app then starts showing 6-digit codes.", "পরের স্ক্রিনে একটি setup key দেখাবে। সেটি Google Authenticator-এ লিখলে অ্যাপে ৬ সংখ্যার কোড আসা শুরু হবে।")}</small></li>
          <li><strong>{L("Step 3: Enter the code from the app", "ধাপ ৩: অ্যাপের কোড লিখুন")}</strong><small>{L("That turns it on.", "এতেই চালু হয়ে যাবে।")}</small></li>
        </ol>}
        <PasswordField label={L("Confirm your password", "পাসওয়ার্ড দিয়ে নিশ্চিত করুন")} name="password" autoComplete="current-password" required autoFocus />
        <div className="admin-product-actions"><button className={`btn btn-sm ${step === "disable" ? "btn-danger-solid" : "btn-primary"}`} disabled={busy}>{step === "disable" ? L("Turn off", "বন্ধ করুন") : L("Continue", "এগিয়ে যান")}</button><button type="button" className="btn btn-neutral btn-sm" onClick={() => { setStep("idle"); setMsg(""); }}>{L("Cancel", "বাতিল")}</button></div>
      </form>}
      {step === "setup" && setup && <div className="security-setup">
        <ol>
          <li>{L("Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or Authy).", "ফোনে একটি authenticator অ্যাপ ইনস্টল করুন (Google Authenticator, Microsoft Authenticator বা Authy)।")}</li>
          {(() => { const qr = qrSvg(setup.uri); return qr && <li>{L("Scan this QR code with the app (tap + then “Scan a QR code”). It sets up OANRO as time-based automatically.", "অ্যাপে + চেপে “Scan a QR code” দিয়ে এই QR কোড স্ক্যান করুন। এতে OANRO নিজে থেকেই time-based হিসেবে যোগ হবে।")}
            <svg className="setup-qr" viewBox={`0 0 ${qr.size} ${qr.size}`} role="img" aria-label={L("QR code for your authenticator app", "authenticator অ্যাপের QR কোড")} shapeRendering="crispEdges"><rect width={qr.size} height={qr.size} fill="#fff" /><path d={qr.path} fill="#000" /></svg>
            <small>{L("Can't scan? Use the setup key in the next step instead.", "স্ক্যান করতে না পারলে পরের ধাপের setup key ব্যবহার করুন।")}</small></li>; })()}
          <li>{L("Or, in the app choose “Enter a setup key”, name it OANRO, choose “Time-based” (not counter-based), and type this key:", "অথবা অ্যাপে “Enter a setup key” বেছে নিন, নাম দিন OANRO, “Time-based” বেছে নিন (counter-based নয়), তারপর এই key লিখুন:")}
            <code className="setup-key">{setup.key.replace(/(.{4})/g, "$1 ").trim()}</code>
            <a className="text-link" href={setup.uri}>{L("On this phone? Tap to add it to your authenticator app", "এই ফোনেই আছেন? ট্যাপ করে অ্যাপে যোগ করুন")}</a></li>
          <li>{L("Save these backup codes somewhere safe. Each works once if you lose your phone:", "এই backup code-গুলো নিরাপদ জায়গায় লিখে রাখুন। ফোন হারালে প্রতিটি একবার কাজ করবে:")}
            <ul className="backup-codes">{setup.codes.map(c => <li key={c}><code>{c}</code></li>)}</ul>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => { void navigator.clipboard?.writeText(setup.codes.join("\n")).then(() => setMsg(L("Backup codes copied.", "Backup code কপি হয়েছে।")), () => {}); }}><ActionIcon name="copy" size={14} />{L("Copy codes", "কোড কপি করুন")}</button></li>
          <li>{L("Enter the 6-digit code the app shows to finish:", "শেষ করতে অ্যাপে দেখানো ৬ সংখ্যার কোড লিখুন:")}
            <form className="security-form" onSubmit={e => { const code = field(e, "code").replace(/\s/g, "");
              void run(async () => { const r = await authClient.twoFactor.verifyTotp({ code }); if (!r.error) { setOn(true); setStep("idle"); setSetup(null); setMsg(L("Two-step verification is on.", "দুই ধাপের যাচাই চালু হয়েছে।")); router.refresh(); } return r; }, L("That code didn't work. Check the time on your phone and try again.", "কোডটি কাজ করেনি। ফোনের সময় ঠিক আছে কিনা দেখে আবার চেষ্টা করুন।")); }}>
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required placeholder="123456" aria-label={L("6-digit code", "৬ সংখ্যার কোড")} />
              <button className="btn btn-primary btn-sm" disabled={busy}><ActionIcon name="approve" size={14} />{L("Turn on", "চালু করুন")}</button>
            </form></li>
        </ol>
      </div>}
    </>}
    <div className="security-row"><div><strong>{L("Other devices", "অন্য ডিভাইস")}</strong><small>{L("Signed in on a shared or lost device? Sign out everywhere except here.", "অন্যের বা হারানো ডিভাইসে লগইন করা আছে? এটি ছাড়া সব জায়গা থেকে সাইন আউট করুন।")}</small></div>
      <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => void run(async () => { const r = await authClient.revokeOtherSessions(); if (!r.error) setMsg(L("Signed out of all other devices.", "অন্য সব ডিভাইস থেকে সাইন আউট হয়েছে।")); return r; }, L("Couldn't sign out other devices.", "অন্য ডিভাইস থেকে সাইন আউট করা যায়নি।"))}><ActionIcon name="signout" size={14} />{L("Sign out other devices", "অন্য ডিভাইস থেকে সাইন আউট")}</button></div>
    <p role="status" aria-live="polite" className={`security-msg${/didn|Wrong|ভুল|কাজ করেনি|failed|Couldn|যায়নি|সমস্যা/.test(msg) ? " is-error" : ""}`}>{msg}</p>
  </section>;
}
