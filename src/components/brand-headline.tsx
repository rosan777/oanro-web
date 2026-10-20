"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useMotion } from "./experience";
import { useLocale } from "./locale";

// Home hero headline: OANRO with one letter highlighted at a time, and "Built on <word>" showing what that letter stands for.
// The H1 text is the real brand line for Google; the full meaning is also written once for screen readers and crawlers.
const meaning = {
  en: ["Originality", "Ambition", "Next-generation", "Reliability", "Opportunity"],
  bn: ["নিজস্বতা", "উচ্চাকাঙ্ক্ষা", "ভবিষ্যৎমুখী উদ্ভাবন", "নির্ভরযোগ্যতা", "নতুন সম্ভাবনা"],
};

export function BrandHeadline({ mark }: { mark?: ReactNode }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const { allowed } = useMotion();
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (!allowed) return;
    const timer = window.setInterval(() => setActive(i => (i + 1) % 5), 2400);
    return () => window.clearInterval(timer);
  }, [allowed]);
  const words = bn ? meaning.bn : meaning.en;
  return <>
    <h1 className="brand-headline">
      {/* Search keywords sit inside the H1 (Google weighs it most), styled as the small line beside the logo card. */}
      <span className="hero-eyebrow-row">{mark}<span className="eyebrow">{bn ? "শীতের পোশাক · টেক সলিউশন · আইটি সেবা · বিশ্বজুড়ে" : "Winter clothing · Tech solutions · IT services · Worldwide"}</span></span>
      <span className="brand-letters">{"OANRO".split("").map((ch, i) => <span key={i} className={i === active ? "is-active" : undefined}>{ch}</span>)}</span>
      <span className="brand-tagline">{bn ? <>ভবিষ্যতের জন্য গড়া <em>একটি ব্র্যান্ড।</em></> : <>A brand built for <em>what&apos;s next.</em></>}</span>
    </h1>
    <p className="brand-built" aria-hidden="true">{bn ? "যার ভিত্তি" : "Built on"} <span key={`${locale}-${active}`} className="brand-word">{words[active]}</span></p>
    <p className="sr-only">{bn ? `OANRO মানে: ${meaning.bn.join(", ")}।` : `OANRO stands for ${meaning.en.slice(0, 4).join(", ")} and ${meaning.en[4]}.`}</p>
  </>;
}
