"use client";

import { useLocale } from "./locale";
import { adminBangla } from "@/lib/admin-bangla";

/** Text helper for the older admin dashboards: Bangla from admin-bangla.ts in /bn/admin, else English. */
export function useAdminText() {
  const bn = useLocale().locale === "bn";
  return (en: string) => (bn ? (adminBangla[en] ?? en) : en);
}
