"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
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
export function LanguageSwitch() { const { locale, setLocale } = useLocale(); return <div className="language-switch" aria-label="Language"><button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button><button type="button" aria-pressed={locale === "bn"} onClick={() => setLocale("bn")}>বাংলা</button></div>; }
