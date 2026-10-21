"use client";

import { useEffect, useState } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { useT } from "./locale";

/** Floating WhatsApp (only when a number is set) and back-to-top buttons.
 * Back-to-top appears only after scrolling, so it never covers the first screen. */
export function FloatingHelp({ whatsappUrl }: { whatsappUrl: string }) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 600);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return <div className="floating-help">
    <a href="#top" className={`float-btn float-top${scrolled ? " is-shown" : ""}`} aria-label={t("Back to top", "উপরে যান")} tabIndex={scrolled ? undefined : -1}><ArrowUp size={20} /></a>
    {whatsappUrl && <a href={whatsappUrl} className="float-btn float-wa" target="_blank" rel="noopener noreferrer" aria-label={t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}><MessageCircle size={22} /></a>}
  </div>;
}
