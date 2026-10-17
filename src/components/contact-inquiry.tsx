"use client";
import { InquiryForm } from "./inquiry-form";
import { useServices } from "./products-context";
import { useLocale } from "./locale";
/** General contact form with an optional "about which service" choice. */
export function ContactInquiry() {
  const services = useServices(); const bn = useLocale().locale === "bn";
  return <InquiryForm kind="general" services={services.map(s => ({ slug: s.slug, title: bn && s.bn ? s.bn.title : s.title }))} />;
}
