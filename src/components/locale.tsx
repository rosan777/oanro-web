"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "bn";
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => {} });

function preferredLocale(): Locale {
  return navigator.languages.some(language => language.toLowerCase().startsWith("bn")) ? "bn" : "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("oanro-language");
    const next = saved === "bn" || saved === "en" ? saved : preferredLocale();
    document.documentElement.lang = next === "bn" ? "bn" : "en";
    const frame = window.requestAnimationFrame(() => updateLocale(next));
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const setLocale = (next: Locale) => { updateLocale(next); window.localStorage.setItem("oanro-language", next); document.documentElement.lang = next === "bn" ? "bn" : "en"; };
  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
export function Localized({ en, bn }: { en: ReactNode; bn: ReactNode }) { return <>{useLocale().locale === "bn" ? bn : en}</>; }
export function LanguageSwitch() { const { locale, setLocale } = useLocale(); return <div className="language-switch" aria-label="Language"><button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button><button type="button" aria-pressed={locale === "bn"} onClick={() => setLocale("bn")}>বাংলা</button></div>; }
