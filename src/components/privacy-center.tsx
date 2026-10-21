"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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
  const [open, setOpen] = useState<string | null>("essential");
  const validGa = /^G-[A-Z0-9]+$/.test(gaId);
  const pathname = usePathname();
  const onPolicy = /\/privacy$/.test(pathname ?? "");

  useEffect(() => {
    const current = readConsent();
    // The saved choice lives in the browser, so it can only be read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(current);
    const show = () => { const c = readConsent(); setDraft(c ? { functional: c.functional, analytics: c.analytics, personalisation: c.personalisation } : NONE); if (!dialog.current?.open) dialog.current?.showModal(); };
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

  const finish = (choice: ConsentChoice) => { saveConsent(choice); dialog.current?.close(); };
  const toggle = (p: Purpose) => setDraft(d => ({ ...d, [p]: !d[p] }));

  const rows: { id: string; purpose?: Purpose; title: string; text: string }[] = [
    { id: "essential", title: t("Essential", "প্রয়োজনীয়"), text: t("Needed for the website to work: keeping you signed in, your bag, security checks and your language. These can't be switched off.", "ওয়েবসাইট চালাতে দরকার: সাইন-ইন রাখা, আপনার ব্যাগ, নিরাপত্তা যাচাই ও ভাষা। এগুলো বন্ধ করা যায় না।") },
    { id: "functional", purpose: "functional", title: t("Functional", "সুবিধাজনক"), text: t("Remembers small preferences, like animation settings and what you last looked at, so the site feels familiar when you come back.", "ছোট পছন্দগুলো মনে রাখে, যেমন অ্যানিমেশন সেটিং ও শেষে কী দেখেছিলেন, যাতে ফিরে এলে সাইট পরিচিত লাগে।") },
    { id: "analytics", purpose: "analytics", title: t("Analytics", "বিশ্লেষণ"), text: t("Anonymous counts of which pages and products are viewed, and Google Analytics, so we can see what works and improve it. We never sell this data.", "কোন পেজ ও পণ্য দেখা হয় তার পরিচয়হীন হিসাব এবং Google Analytics, যাতে আমরা বুঝে উন্নত করতে পারি। এই তথ্য আমরা কখনো বিক্রি করি না।") },
    { id: "personalisation", purpose: "personalisation", title: t("Personalisation", "ব্যক্তিগত সাজেশন"), text: t("Uses the products you view on OANRO to recommend things you may like and to help our upcoming shopping assistant give better answers. Kept in your browser; you can turn it off any time.", "OANRO-তে আপনি যে পণ্য দেখেন তা দিয়ে আপনার পছন্দের জিনিস সাজেস্ট করা এবং আমাদের আসন্ন শপিং অ্যাসিস্ট্যান্টকে আরও ভালো উত্তর দিতে সাহায্য করা। আপনার ব্রাউজারেই থাকে; যেকোনো সময় বন্ধ করতে পারেন।") },
  ];

  return <>
    {validGa && saved?.analytics && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
    </>}
    <dialog ref={dialog} className="privacy-center" aria-labelledby="privacy-title" onCancel={e => { if (!readConsent()) e.preventDefault(); }}>
      <div className="pc-inner">
        <div className="pc-brand"><Image src="/logo.svg" alt="" width={34} height={34} /><span>OANRO</span></div>
        <h2 id="privacy-title" className="pc-title">{t("Privacy preferences", "প্রাইভেসি পছন্দ")}</h2>
        <p className="pc-text">{t("We use cookies and similar storage to run this website, understand how it's used, and — if you allow it — recommend products and power our shopping assistant. You choose what's on. ", "এই ওয়েবসাইট চালাতে, কীভাবে ব্যবহার হয় তা বুঝতে এবং — আপনি অনুমতি দিলে — পণ্য সাজেস্ট করতে ও শপিং অ্যাসিস্ট্যান্ট চালাতে আমরা কুকি ও এ ধরনের স্টোরেজ ব্যবহার করি। কী চালু থাকবে, আপনি ঠিক করুন। ")}<Link href="/privacy#cookies" onClick={() => dialog.current?.close()}>{t("Privacy & cookie policy", "প্রাইভেসি ও কুকি পলিসি")}</Link></p>
        <button type="button" className="pc-btn pc-primary" onClick={() => finish(ALL)}>{t("Accept all", "সব মেনে নিন")}</button>
        <h3 className="pc-sub">{t("Manage preferences", "পছন্দ ঠিক করুন")}</h3>
        <ul className="pc-list">
          {rows.map(r => <li key={r.id}>
            <div className="pc-row">
              <button type="button" className="pc-expand" aria-expanded={open === r.id} aria-controls={`pc-${r.id}`} onClick={() => setOpen(open === r.id ? null : r.id)}>{r.title}<ChevronDown size={18} aria-hidden="true" /></button>
              {r.purpose ? <button type="button" role="switch" aria-checked={draft[r.purpose]} aria-label={r.title} className="pc-switch" onClick={() => toggle(r.purpose!)}><span /></button> : <span className="pc-always">{t("Always on", "সবসময় চালু")}</span>}
            </div>
            <p id={`pc-${r.id}`} className="pc-desc" hidden={open !== r.id}>{r.text}</p>
          </li>)}
        </ul>
        <div className="pc-actions">
          <button type="button" className="pc-btn pc-primary" onClick={() => finish(draft)}>{t("Confirm my choices", "আমার পছন্দ সেভ করুন")}</button>
          <button type="button" className="pc-btn pc-ghost" onClick={() => finish(NONE)}>{t("Only essential", "শুধু প্রয়োজনীয়")}</button>
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
