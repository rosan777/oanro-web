"use client";

import { createContext, useContext, type ReactNode } from "react";
import { defaultContent, type FeatureKey, type SiteContent, type TextKey } from "@/lib/site-content-data";
import { useLocale } from "./locale";

const Ctx = createContext<SiteContent>(defaultContent());
/** Website content edited in the admin, available to every browser component. */
export function SiteContentProvider({ value, children }: { value: SiteContent; children: ReactNode }) { return <Ctx.Provider value={value}>{children}</Ctx.Provider>; }
export const useSiteContent = () => useContext(Ctx);
/** Owner-edited text in the current page language. */
export function useText(key: TextKey) { const { locale } = useLocale(); const t = useContext(Ctx).text[key]; return (locale === "bn" ? t.bn : t.en) || t.en; }
/** Is this section switched on in Admin → Website content? */
export const useFeature = (key: FeatureKey) => useContext(Ctx).features[key] !== false;
