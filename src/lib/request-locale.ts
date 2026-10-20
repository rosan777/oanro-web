import "server-only";
import { headers } from "next/headers";
import { localePath, type Locale } from "@/lib/locale-path";

/** Language and English path of the current request, set by src/proxy.ts. */
export async function requestLocale(): Promise<{ locale: Locale; path: string }> {
  const h = await headers();
  return { locale: h.get("x-oanro-locale") === "bn" ? "bn" : "en", path: h.get("x-oanro-path") || "/" };
}

/** Canonical URL plus hreflang links for both languages (x-default points to English). */
export function alternatesFor(path: string, locale: Locale) {
  return { canonical: localePath(path, locale), languages: { en: path, bn: localePath(path, "bn"), "x-default": path } };
}
