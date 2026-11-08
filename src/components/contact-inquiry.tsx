"use client";
import { InquiryForm } from "./inquiry-form";
import { useServices } from "./products-context";
import { useLocale } from "./locale";
/** General contact form with an optional "about which service" choice. */
export function ContactInquiry({
  brief = false,
  defaultType,
  prefill,
}: {
  /** Show the project brief questions (the Contact page). */
  brief?: boolean;
  defaultType?: string;
  prefill?: { name?: string; email?: string };
} = {}) {
  const services = useServices();
  const bn = useLocale().locale === "bn";
  return (
    <InquiryForm
      kind="general"
      services={services.map(s => ({ slug: s.slug, title: bn && s.bn ? s.bn.title : s.title }))}
      brief={brief}
      defaultType={defaultType}
      prefill={prefill}
    />
  );
}
