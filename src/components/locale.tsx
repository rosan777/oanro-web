"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { isBnPath, localePath, type Locale } from "@/lib/locale-path";

export type { Locale } from "@/lib/locale-path";
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => {} });

function preferredLocale(): Locale {
  return navigator.languages.some(language => language.toLowerCase().startsWith("bn")) ? "bn" : "en";
}

/** The language comes from the URL (/bn/... is Bangla), so the server renders it and Google can index both versions. */
export function LocaleProvider({ initialLocale = "en", children }: { initialLocale?: Locale; children: ReactNode }) {
  const locale = initialLocale;
  useEffect(() => {
    // First visit to an English page: honour a saved Bangla choice or a Bangla browser, once per session.
    try {
      if (locale === "en" && !sessionStorage.getItem("oanro-language-checked")) {
        sessionStorage.setItem("oanro-language-checked", "1");
        const saved = localStorage.getItem("oanro-language");
        if (saved === "bn" || (!saved && preferredLocale() === "bn")) { const { pathname, search, hash } = window.location; window.location.replace(localePath(pathname, "bn") + search + hash); return; }
      }
    } catch {}
    // Back/forward between /x and /bn/x keeps this layout mounted; reload so the page matches the URL's language.
    const onPop = () => { if ((isBnPath(window.location.pathname) ? "bn" : "en") !== locale) window.location.reload(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [locale]);
  const setLocale = (next: Locale) => {
    if (next === locale) return;
    try { localStorage.setItem("oanro-language", next); } catch {}
    const { pathname, search, hash } = window.location;
    window.location.assign(localePath(pathname, next) + search + hash);
  };
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
/** Picks the English or Bangla string for the current language (for props and attributes). */
export function useT() { const { locale } = useLocale(); return (en: string, bn: string) => locale === "bn" ? bn : en; }
export function Localized({ en, bn }: { en: ReactNode; bn: ReactNode }) { return <>{useLocale().locale === "bn" ? bn : en}</>; }
const languages: { id: Locale; label: string; short: string }[] = [{ id: "en", label: "English", short: "EN" }, { id: "bn", label: "বাংলা", short: "বাং" }];
function Globe() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></svg>; }
/** Bangladesh flag drawn inline (emoji flags don't show on Windows). Marks the market, not the language. */
export function BdFlag() { return <svg width="20" height="12" viewBox="0 0 20 12" aria-hidden="true" className="bd-flag"><rect width="20" height="12" rx="2" fill="#006a4e" /><circle cx="9" cy="6" r="3.6" fill="#f42a41" /></svg>; }
/** Close a small pop-up menu on outside click or Escape. */
function usePopup() {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return { open, setOpen, box };
}
/** Header: globe button with the current language; opens a short list (each language in its own script). */
export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  const { open, setOpen, box } = usePopup();
  const current = languages.find(l => l.id === locale) ?? languages[0];
  return <div className="lang-menu" ref={box}>
    <button type="button" className="lang-trigger" aria-haspopup="true" aria-expanded={open} aria-label={locale === "bn" ? "ভাষা বদলান" : "Change language"} onClick={() => setOpen(v => !v)}><Globe /><span>{current.short}</span><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
    {open && <ul className="lang-list" role="menu">{languages.map(l => <li key={l.id} role="none"><button type="button" role="menuitemradio" aria-checked={l.id === locale} lang={l.id} onClick={() => { setOpen(false); if (l.id !== locale) setLocale(l.id); }}><span>{l.label}</span>{l.id === locale && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}</button></li>)}</ul>}
  </div>;
}
/** Footer: country + language, like large stores. Bangladesh is the store's market; each language is offered there. */
export function RegionPicker() {
  const { locale, setLocale } = useLocale();
  const { open, setOpen, box } = usePopup();
  const bn = locale === "bn";
  return <div className="region-picker" ref={box}>
    <button type="button" className="region-trigger" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(v => !v)}><BdFlag /><span>{bn ? "বাংলাদেশ" : "Bangladesh"} · {bn ? "বাংলা" : "English"}</span></button>
    {open && <div className="region-panel" role="dialog" aria-label={bn ? "দেশ ও ভাষা" : "Country and language"}>
      <p>{bn ? "দেশ ও ভাষা" : "Country and language"}</p>
      <div className="region-row"><BdFlag /><strong>{bn ? "বাংলাদেশ" : "Bangladesh"}</strong><small>{bn ? "৳ টাকায় দাম · সারা দেশে ডেলিভারি" : "Prices in ৳ BDT · delivery nationwide"}</small></div>
      <div className="region-langs">{languages.map(l => <button key={l.id} type="button" lang={l.id} aria-pressed={l.id === locale} onClick={() => { setOpen(false); if (l.id !== locale) setLocale(l.id); }}>{l.label}</button>)}</div>
    </div>}
  </div>;
}
