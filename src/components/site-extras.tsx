"use client";

import { ArrowUp, MessageCircle } from "lucide-react";
import { useT } from "./locale";

/** Floating WhatsApp (only when a number is set) and back-to-top buttons. */
export function FloatingHelp({ whatsappUrl }: { whatsappUrl: string }) {
  const t = useT();
  return <div className="floating-help">
    <a href="#top" className="float-btn float-top" aria-label={t("Back to top", "উপরে যান")}><ArrowUp size={20} /></a>
    {whatsappUrl && <a href={whatsappUrl} className="float-btn float-wa" target="_blank" rel="noopener noreferrer" aria-label={t("Chat on WhatsApp", "WhatsApp-এ কথা বলুন")}><MessageCircle size={22} /></a>}
  </div>;
}
