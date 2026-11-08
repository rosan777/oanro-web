import type { Metadata } from "next";
import { ArrowUpRight, Check } from "lucide-react";
import Link from "@/components/locale-link";
import { getSiteContent } from "@/lib/site-content";
import { alternatesFor, requestLocale } from "@/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  return {
    title: bn
      ? "সফটওয়্যার – প্রজেক্ট, ফাইল ও অনুমোদন এক জায়গায়"
      : "Software – projects, files and approvals in one place",
    description: bn
      ? "আপনার ব্যবসার জন্য কাস্টম সফটওয়্যার ও ক্লায়েন্ট ওয়ার্কস্পেস। প্রতিটি প্ল্যান লিখিত কোটে; কোনো সাবস্ক্রিপশন নেই।"
      : "Custom business software and a client workspace for your projects. Every plan is quoted in writing; no subscriptions.",
    alternates: alternatesFor("/software", locale),
  };
}

/**
 * Software (approved design), quote-only by owner decision: the plans are editable content in
 * Admin → Website content → Software plans, show no prices, and every action opens the project brief.
 */
export default async function SoftwarePage() {
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const content = await getSiteContent();
  const brief = "/contact?type=software";
  const features: [string, string][] = [
    ["Projects", "প্রজেক্ট"],
    ["Files", "ফাইল"],
    ["Approvals", "অনুমোদন"],
    ["Invoices", "ইনভয়েস"],
    ["Progress", "অগ্রগতি"],
  ];
  const integrations: [string, string][] = [
    ["Payments", "পেমেন্ট"],
    ["Email", "ইমেইল"],
    ["Analytics", "অ্যানালিটিক্স"],
    ["Calendar", "ক্যালেন্ডার"],
    ["Commerce", "কমার্স"],
    ["API", "API"],
  ];
  return (
    <main id="main-content" className="o-tech-page">
      <section className="o-saas-hero">
        <span className="o-eyebrow">{t("OANRO / SOFTWARE", "OANRO / সফটওয়্যার")}</span>
        <h1>
          {t("Less busywork.", "কাজ সহজ হোক।")}
          <br />
          {t("More possibility.", "সম্ভাবনা বাড়ুক।")}
        </h1>
        <p>
          {t(
            "Business software shaped around how you work, and a client workspace where projects, files, approvals and invoices live together.",
            "আপনার কাজের ধারা অনুযায়ী বিজনেস সফটওয়্যার, আর একটি ক্লায়েন্ট ওয়ার্কস্পেস যেখানে প্রজেক্ট, ফাইল, অনুমোদন ও ইনভয়েস এক জায়গায়।",
          )}
        </p>
        <div className="o-actions">
          <Link className="o-button" href="/workspace">
            {t("See the workspace", "ওয়ার্কস্পেস দেখুন")}{" "}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <Link className="o-button secondary" href={brief}>
            {t("Talk about your needs", "আপনার প্রয়োজন জানান")}{" "}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="o-integration-row" aria-label={t("What it covers", "যা যা থাকে")}>
          {features.map(([en, b], i) => (
            <span key={en}>
              <b aria-hidden="true">{["◈", "▧", "✓", "↗", "✳"][i]}</b>
              {bn ? b : en}
            </span>
          ))}
        </div>
      </section>
      <section className="o-section" aria-labelledby="software-plans">
        <div className="o-section-line">
          <div>
            <span className="o-eyebrow">
              {t("A PLAN THAT GROWS WITH YOU", "আপনার সাথে বাড়ে এমন প্ল্যান")}
            </span>
            <h2 id="software-plans">
              {t("Start simple.", "সহজে শুরু করুন।")}
              <br />
              {t("Make room for more.", "আরও কিছুর জায়গা রাখুন।")}
            </h2>
          </div>
        </div>
        <div className="o-pricing-grid">
          {content.softwarePlans.map((p, i) => (
            <article key={p.name.en} className={i === 1 ? "featured" : ""}>
              {i === 1 && (
                <span className="o-plan-label">
                  {t("DESIGNED FOR GROWING TEAMS", "বড় হতে থাকা টিমের জন্য")}
                </span>
              )}
              <h3>{p.name[locale] || p.name.en}</h3>
              <p>{p.for[locale] || p.for.en}</p>
              <strong>{t("Quote on request", "অনুরোধে কোট")}</strong>
              <small>
                {t(
                  "A written quote after a short call · no subscription",
                  "ছোট আলোচনার পর লিখিত কোট · কোনো সাবস্ক্রিপশন নেই",
                )}
              </small>
              <ul>
                {p.includes.map(x => (
                  <li key={x.en}>
                    <Check size={16} aria-hidden="true" />
                    {x[locale] || x.en}
                  </li>
                ))}
              </ul>
              <Link className={`o-button${i === 1 ? "" : " secondary"}`} href={brief}>
                {t("Discuss this plan", "এই প্ল্যান নিয়ে কথা বলি")}{" "}
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <div className="o-integration-panel">
          <div>
            <span className="o-eyebrow">{t("YOUR TOOLS, CONNECTED", "আপনার টুল, এক সুতোয়")}</span>
            <h2>
              {t("A little less switching.", "একটু কম ঝামেলা।")}
              <br />
              {t("A lot more doing.", "অনেক বেশি কাজ।")}
            </h2>
            <p>
              {t(
                "We connect the services your business already uses as part of a custom project. Ask us about a specific tool.",
                "কাস্টম প্রজেক্টের অংশ হিসেবে আপনার ব্যবসার বর্তমান সেবাগুলো যুক্ত করি। নির্দিষ্ট টুল নিয়ে জিজ্ঞাসা করুন।",
              )}
            </p>
          </div>
          <div className="o-integration-grid">
            {integrations.map(([en, b], i) => (
              <Link key={en} href={brief}>
                <span aria-hidden="true">{["↗", "@", "▥", "▦", "◈", "{ }"][i]}</span>
                {bn ? b : en}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
