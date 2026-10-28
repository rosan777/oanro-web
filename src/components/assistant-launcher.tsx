"use client";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "../app/assistant.css";
import type { PublicAssistantConfig } from "@/lib/assistant/types";
import { AssistantMascot } from "./assistant-mascot";
import { useLocale } from "./locale";

// The panel (chat, cards, forms) loads only after the visitor asks for it, so it never delays the page.
const Panel = dynamic(() => import("./assistant-widget"), { ssr: false });
const WAVED = "oanro-asst-waved";

/** The floating mascot. The assistant never opens by itself. */
export function AssistantLauncher({ config }: { config: PublicAssistantConfig }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const path = (usePathname() ?? "/").replace(/^\/bn(?=\/|$)/, "") || "/";
  const [open, setOpen] = useState(false); const [wave, setWave] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // One greeting wave per browser session, after the page has settled.
  useEffect(() => {
    let timer = 0;
    try { if (!sessionStorage.getItem(WAVED)) { timer = window.setTimeout(() => { setWave(true); try { sessionStorage.setItem(WAVED, "1"); } catch {} window.setTimeout(() => setWave(false), 1600); }, 2500); } } catch {}
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { const openIt = () => setOpen(true); window.addEventListener("oanro-open-assistant", openIt); return () => window.removeEventListener("oanro-open-assistant", openIt); }, []);
  if (!config.enabled || /^\/(admin|checkout|sign-in|reset-password)/.test(path)) return null;
  const close = () => { setOpen(false); requestAnimationFrame(() => button.current?.focus()); };
  return <>
    {open && <Panel config={config} onClose={close} />}
    <div className="asst-launcher" hidden={open}>
      <button ref={button} type="button" className="asst-fab" aria-label={t("Open OANRO AI assistant", "OANRO AI সহকারী খুলুন")} aria-haspopup="dialog" aria-expanded={open}
        onClick={() => setOpen(true)} onPointerEnter={() => { void import("./assistant-widget"); }} onFocus={() => { void import("./assistant-widget"); }}>
        <AssistantMascot state={wave ? "wave" : "idle"} size={64} />
      </button>
    </div>
  </>;
}
