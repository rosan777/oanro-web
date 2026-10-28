"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import Link from "@/components/locale-link";
import { useT } from "./locale";
import { CONSENT_EVENT, OPEN_PRIVACY_EVENT, readConsent, saveConsent, type Consent, type ConsentChoice } from "@/lib/consent";

type Purpose = keyof ConsentChoice;
const NONE: ConsentChoice = { functional: false, analytics: false, personalisation: false };
const ALL: ConsentChoice = { functional: true, analytics: true, personalisation: true };

/**
 * Privacy preference center. Opens on a visitor's first arrival (after the short intro), and again from
 * "Privacy settings" in the footer. Google Analytics loads only after "Analytics" is allowed.
 */
export function PrivacyCenter({ gaId }: { gaId: string }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [saved, setSaved] = useState<Consent | null>(null);
  const [draft, setDraft] = useState<ConsentChoice>(NONE);
  const [open, setOpen] = useState<string | null>(null);
  const [manage, setManage] = useState(false);
  const validGa = /^G-[A-Z0-9]+$/.test(gaId);
  const pathname = usePathname();
  const onPolicy = /\/privacy$/.test(pathname ?? "");

  useEffect(() => {
    const current = readConsent();
    // The saved choice lives in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(current);
    const show = () => { const c = readConsent(); setDraft(c ? { functional: c.functional, analytics: c.analytics, personalisation: c.personalisation } : NONE); setManage(Boolean(c)); if (!dialog.current?.open) dialog.current?.show(); };
    window.addEventListener(OPEN_PRIVACY_EVENT, show);
    const sync = (e: Event) => setSaved((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, sync);
    return () => { window.removeEventListener(OPEN_PRIVACY_EVENT, show); window.removeEventListener(CONSENT_EVENT, sync); };
  }, []);

  // No choice saved yet: ask on every page except the policy itself, so people can read it first.
  // The first ask waits for the 1-second intro screen to finish.
  useEffect(() => {
    if (onPolicy || readConsent()) return;
    const timer = window.setTimeout(() => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT)), 1400);
    return () => clearTimeout(timer);
  }, [onPolicy]);

  // Same exit as the "message us" pop-up: fade and blur out, then close.
  const finish = (choice: ConsentChoice) => {
    saveConsent(choice);
    const d = dialog.current; if (!d) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { d.close(); return; }
    d.classList.add("is-closing");
    window.setTimeout(() => { d.classList.remove("is-closing"); d.close(); }, 420);
  };
  const toggle = (p: Purpose) => setDraft(d => ({ ...d, [p]: !d[p] }));

  const rows: { id: string; purpose?: Purpose; title: string; text: string }[] = [
    { id: "essential", title: t("Essential", "প্রয়োজনীয়"), text: t("Needed for the website to work: keeping you signed in, your bag, security checks and your language. These can't be switched off.", "ওয়েবসাইট চালাতে দরকার: সাইন-ইন রাখা, আপনার ব্যাগ, নিরাপত্তা যাচাই ও ভাষা। এগুলো বন্ধ করা যায় না।") },
    { id: "functional", purpose: "functional", title: t("Functional", "সুবিধাজনক"), text: t("Remembers small preferences, like animation settings and what you last looked at, so the site feels familiar when you come back.", "ছোট পছন্দগুলো মনে রাখে, যেমন অ্যানিমেশন সেটিং ও শেষে কী দেখেছিলেন, যাতে ফিরে এলে সাইট পরিচিত লাগে।") },
    { id: "analytics", purpose: "analytics", title: t("Analytics", "বিশ্লেষণ"), text: t("Anonymous counts of which pages and products are viewed, and Google Analytics, so we can see what works and improve it. We never sell this data.", "কোন পেজ ও পণ্য দেখা হয় তার পরিচয়হীন হিসাব এবং Google Analytics, যাতে আমরা বুঝে উন্নত করতে পারি। এই তথ্য আমরা কখনো বিক্রি করি না।") },
    { id: "personalisation", purpose: "personalisation", title: t("Personalisation", "ব্যক্তিগত সাজেশন"), text: t("Uses the products you view on OANRO to recommend things you may like. When you chat with the OANRO assistant, the names of up to 5 recently viewed products are sent with your message so it can suggest things. Kept in your browser; turning it off removes it at once.", "OANRO-তে আপনি যে পণ্য দেখেন তা দিয়ে আপনার পছন্দের জিনিস সাজেস্ট করা। OANRO সহকারীর সাথে চ্যাট করলে সাম্প্রতিক দেখা সর্বোচ্চ ৫টি পণ্যের নাম বার্তার সাথে পাঠানো হয়, যাতে সে কিছু সাজেস্ট করতে পারে। আপনার ব্রাউজারেই থাকে; বন্ধ করলে তখনই মুছে যায়।") },
  ];

  return <>
    {validGa && saved?.analytics && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
    </>}
    {/* A horizontal bar fixed to the bottom of the screen (not blocking the page). "Manage preferences" opens the details above it. */}
    <dialog ref={dialog} className={`privacy-center${manage ? " is-managing" : ""}`} aria-labelledby="privacy-title">
      <div className="pc-inner">
        {manage && <div className="pc-manage">
        <ul className="pc-list">
          {rows.map(r => <li key={r.id}>
            <div className="pc-row">
              <button type="button" className="pc-expand" aria-expanded={open === r.id} aria-controls={`pc-${r.id}`} onClick={() => setOpen(open === r.id ? null : r.id)}>{r.title}<ChevronDown size={18} aria-hidden="true" /></button>
              {r.purpose ? <button type="button" role="switch" aria-checked={draft[r.purpose]} aria-label={r.title} className="pc-switch" onClick={() => toggle(r.purpose!)}><span /></button> : <span className="pc-always">{t("Always on", "সবসময় চালু")}</span>}
            </div>
            <p id={`pc-${r.id}`} className="pc-desc" hidden={open !== r.id}>{r.text}</p>
          </li>)}
        </ul>
          <div className="pc-manage-actions">
            <button type="button" className="pc-btn pc-ghost pc-confirm" onClick={() => finish(NONE)}>{t("Reject all", "সব প্রত্যাখ্যান করুন")}</button>
            <button type="button" className="pc-btn pc-primary pc-confirm" onClick={() => finish(draft)}>{t("Confirm my choices", "আমার পছন্দ সেভ করুন")}</button>
          </div>
        </div>}
        <div className="pc-bar">
          <div className="pc-copy">
            <h2 id="privacy-title" className="sr-only">{t("Privacy preferences", "প্রাইভেসি পছন্দ")}</h2>
            <p className="pc-text"><span className="pc-long">{t("We use cookies to run this site and, if you allow, to personalise it. ", "সাইট চালাতে ও আপনি চাইলে আপনার মতো করে সাজাতে আমরা কুকি ব্যবহার করি। ")}</span><span className="pc-short">{t("We use cookies. ", "আমরা কুকি ব্যবহার করি। ")}</span><Link href="/privacy#cookies" onClick={() => dialog.current?.close()}>{t("Policy", "পলিসি")}</Link></p>
          </div>
          <div className="pc-bar-actions">
            <button type="button" className="pc-btn pc-ghost" aria-expanded={manage} onClick={() => setManage(m => !m)}><span className="pc-long">{t("Reject / Manage", "প্রত্যাখ্যান / পরিচালনা")}</span><span className="pc-short">{t("Manage", "পরিচালনা")}</span></button>
            <button type="button" className="pc-btn pc-primary" onClick={() => finish(ALL)}><span className="pc-long">{t("Accept all", "সব মেনে নিন")}</span><span className="pc-short">{t("Accept", "মেনে নিন")}</span></button>
          </div>
        </div>
      </div>
    </dialog>
  </>;
}

/** Footer link that reopens the preference center. */
export function PrivacySettingsLink() {
  const t = useT();
  return <button type="button" className="quiet-button" onClick={() => window.dispatchEvent(new Event(OPEN_PRIVACY_EVENT))}>{t("Privacy settings", "প্রাইভেসি সেটিংস")}</button>;
}
