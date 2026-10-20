"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { ArrowUp, MessageCircle } from "lucide-react";
import Link from "@/components/locale-link";
import { useT } from "./locale";

const KEY = "oanro-cookie-consent";

/** Cookie notice. Google Analytics loads only after the visitor accepts (and only when NEXT_PUBLIC_GA_ID is set). */
export function CookieNotice({ gaId }: { gaId: string }) {
  const t = useT();
  const validId = /^G-[A-Z0-9]+$/.test(gaId);
  const [choice, setChoice] = useState<"unknown" | "accepted" | "declined" | "loading">("loading");
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    // Reading the browser's saved choice can only happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(saved === "accepted" || saved === "declined" ? saved : "unknown");
  }, []);
  const decide = (value: "accepted" | "declined") => { try { localStorage.setItem(KEY, value); } catch {} setChoice(value); };
  return <>
    {validId && choice === "accepted" && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
    </>}
    {choice === "unknown" && <div className="cookie-notice" role="dialog" aria-label={t("Cookie notice", "কুকি নোটিশ")}>
      <p>{t("We use cookies to understand how the site is used and improve it.", "সাইট কীভাবে ব্যবহার হয় তা বুঝতে ও উন্নত করতে আমরা কুকি ব্যবহার করি।")} <Link href="/privacy">{t("Privacy policy", "প্রাইভেসি পলিসি")}</Link></p>
      <div><button type="button" className="v2-btn v2-btn-ghost" onClick={() => decide("declined")}>{t("Decline", "না")}</button><button type="button" className="v2-btn v2-btn-light" onClick={() => decide("accepted")}>{t("Accept", "সম্মত")}</button></div>
    </div>}
  </>;
}

/** Floating WhatsApp (only when a number is set) and back-to-top buttons. */
export function FloatingHelp({ whatsappUrl }: { whatsappUrl: string }) {
  const t = useT();
  return <div className="floating-help">
    <a href="#top" className="float-btn float-top" aria-label={t("Back to top", "উপরে যান")}><ArrowUp size={20} /></a>
    {whatsappUrl && <a href={whatsappUrl} className="float-btn float-wa" target="_blank" rel="noopener noreferrer" aria-label={t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}><MessageCircle size={22} /></a>}
  </div>;
}
