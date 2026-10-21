"use client";
import type { ReactNode } from "react";
import { useLocale } from "./locale";
export type LegalSection = { id?: string; en: [string, string[]]; bn: [string, string[]] };
/** Bilingual long-form page (privacy, terms). */
export function LegalPage({ title, updated, intro, sections, children }: { title: [string, string]; updated: string; intro: [string, string]; sections: LegalSection[]; children?: ReactNode }) {
  const bn = useLocale().locale === "bn";
  return <main id="main-content" className="container legal-page">
    <p className="eyebrow">OANRO</p><h1>{bn ? title[1] : title[0]}</h1>
    <p className="legal-updated">{bn ? `সর্বশেষ হালনাগাদ: ${updated}` : `Last updated: ${updated}`}</p>
    <p className="legal-intro">{bn ? intro[1] : intro[0]}</p>
    {sections.map((s, i) => { const [h, ps] = bn ? s.bn : s.en; return <section key={i} id={s.id}><h2>{h}</h2>{ps.map((p, k) => <p key={k}>{p}</p>)}</section>; })}
    {children}
  </main>;
}
