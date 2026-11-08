import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/locale-link";
import { getSiteConfig } from "@/lib/site-config";
import { getSectionState } from "@/lib/website-sections";
import { catalogDb, getStoreServices } from "@/lib/store-products";
import { getSiteContent } from "@/lib/site-content";
import { getCompanyProfile } from "@/lib/company-profile";
import { listPublishedCaseStudies } from "@/lib/case-study-store";
import { alternatesFor, requestLocale } from "@/lib/request-locale";
import { absoluteUrl } from "@/lib/seo";
import { localePath } from "@/lib/locale-path";
import { siteUrl } from "@/lib/site-url";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  return {
    title: bn
      ? "OANRO স্টুডিও – ওয়েবসাইট, অ্যাপ ও সফটওয়্যার"
      : "OANRO Studio – websites, apps and software",
    description: bn
      ? "ওয়েবসাইট, অনলাইন স্টোর, মোবাইল অ্যাপ ও বিজনেস সফটওয়্যার। পরিকল্পনা থেকে লঞ্চ ও সাপোর্ট পর্যন্ত, লিখিত কোটসহ।"
      : "Websites, online stores, mobile apps and business software, from the first plan to launch and support, with a written quote.",
    alternates: alternatesFor("/services", locale),
  };
}

/** The Studio (approved design): services from the admin, how we work, packages, case studies, FAQ and the brief. */
export default async function StudioPage() {
  const config = getSiteConfig();
  const servicesOn = config.services && (await getSectionState()).services;
  if (!servicesOn) notFound();
  const { locale } = await requestLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const [services, content, profile, caseStudies] = await Promise.all([
    getStoreServices(),
    getSiteContent(),
    getCompanyProfile().catch(() => null),
    process.env.DATABASE_URL ? listPublishedCaseStudies(catalogDb()).catch(() => []) : [],
  ]);
  const pick = (v: { en: string; bn: string }) => (bn ? v.bn || v.en : v.en);
  const portfolio = profile?.sections.find(s => s.id === "portfolio" && s.enabled);
  const showPkgs = content.features.studioPackages && content.packages.length > 0;
  const showFaq = content.features.serviceFaq && content.faq.length > 0;
  const steps: [string, string, string, string][] = [
    [
      "Discover",
      "পরিকল্পনা",
      "We align on the problem, people, scope and priorities before choosing a solution.",
      "সমাধান বেছে নেওয়ার আগে সমস্যা, ব্যবহারকারী, পরিসর ও অগ্রাধিকার নিয়ে একমত হই।",
    ],
    [
      "Design",
      "ডিজাইন",
      "You review the visual direction and a clickable prototype before we build.",
      "তৈরির আগে আপনি ভিজ্যুয়াল দিক ও ক্লিকযোগ্য প্রোটোটাইপ দেখে নেন।",
    ],
    [
      "Build",
      "তৈরি",
      "We build in phases, with visible progress in your workspace and agreed acceptance criteria.",
      "ধাপে ধাপে তৈরি করি; অগ্রগতি আপনার ওয়ার্কস্পেসে দেখা যায়, আর গ্রহণের মানদণ্ড আগে থেকেই ঠিক থাকে।",
    ],
    [
      "Launch & support",
      "লঞ্চ ও সাপোর্ট",
      "Testing, handover and ongoing support are agreed before launch.",
      "লঞ্চের আগে টেস্টিং, হস্তান্তর ও পরবর্তী সাপোর্ট ঠিক করা হয়।",
    ],
  ];
  const list = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "OANRO Studio services",
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(localePath(`/services/${s.slug}`, locale)),
      name: bn && s.bn ? s.bn.title : s.title,
    })),
  };
  return (
    <main id="main-content" className="o-tech-page">
      <JsonLd data={list} />
      <section className="o-studio-hero">
        <div>
          <span className="o-eyebrow">
            {t("OANRO STUDIO / DIGITAL BY DESIGN", "OANRO স্টুডিও / ডিজিটাল ডিজাইন")}
          </span>
          <h1>
            {t("Your next idea.", "আপনার নতুন আইডিয়া।")}
            <br />
            <em>{t("Built together.", "তৈরি করি একসাথে।")}</em>
          </h1>
          <p>
            {t(
              "A digital partner for your next chapter. Websites, apps and software that bring the whole picture together.",
              "আপনার নতুন অধ্যায়ের ডিজিটাল সঙ্গী। ওয়েবসাইট, অ্যাপ ও সফটওয়্যার, সব এক সুতোয় গাঁথা।",
            )}
          </p>
          <div className="o-actions">
            <Link className="o-button" href="/contact">
              {t("Tell us your idea", "আইডিয়া জানান")}{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link className="o-button secondary" href="/software">
              {t("Explore software", "সফটওয়্যার দেখুন")}{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="o-section" aria-labelledby="studio-services">
        <span className="o-eyebrow">{t("WHAT WE DO", "আমরা যা করি")}</span>
        <h2 id="studio-services">{t("Services, made useful.", "কাজের সেবা।")}</h2>
        <div className="o-service-grid o-service-list">
          {services.map((s, i) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className={`o-service-card ${["lilac", "ink", "peach", "sage"][i % 4]}`}
            >
              <span>
                {String(i + 1).padStart(2, "0")} /{" "}
                {(bn && s.bn ? s.bn.title : s.title).toUpperCase()}
              </span>
              <h3>{bn && s.bn ? s.bn.title : s.title}</h3>
              <p>{bn && s.bn ? s.bn.text : s.text}</p>
              <b aria-hidden="true">{s.word}</b>
            </Link>
          ))}
        </div>
        {!services.length && (
          <p className="o-muted">
            {t("Services will be listed here soon.", "সেবাগুলো শিগগিরই এখানে থাকবে।")}
          </p>
        )}
      </section>

      <section className="o-section" aria-labelledby="studio-process">
        <span className="o-eyebrow">{t("THE WAY WE WORK", "আমাদের কাজের ধারা")}</span>
        <h2 id="studio-process">
          {t("Clear steps. Room for good ideas.", "পরিষ্কার ধাপ। ভালো আইডিয়ার জায়গা।")}
        </h2>
        <ol className="o-process">
          {steps.map(([en, b, ten, tbn], i) => (
            <li key={en}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <h3>{bn ? b : en}</h3>
              <p>{bn ? tbn : ten}</p>
            </li>
          ))}
        </ol>
      </section>

      {caseStudies.length > 0 ? (
        <section className="o-section" aria-labelledby="studio-work">
          <span className="o-eyebrow">{t("SELECTED WORK", "নির্বাচিত কাজ")}</span>
          <h2 id="studio-work">
            {t("A story behind every project.", "প্রতিটি প্রজেক্টের পেছনে একটি গল্প।")}
          </h2>
          {caseStudies.map((c, i) => (
            <article key={c.slug} className="o-case-study" id={`work-${c.slug}`}>
              <div className="o-case-art">
                <span>
                  {t("CASE STUDY", "কেস স্টাডি")} / {String(i + 1).padStart(2, "0")}
                </span>
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.image}
                    alt={c.imageAlt || (bn && c.titleBn ? c.titleBn : c.titleEn)}
                    loading="lazy"
                  />
                )}
              </div>
              <div>
                {c.clientName && <span className="o-eyebrow">{c.clientName}</span>}
                <h3>{bn && c.titleBn ? c.titleBn : c.titleEn}</h3>
                <p>{bn && c.summaryBn ? c.summaryBn : c.summaryEn}</p>
                <dl className="o-case-facts">
                  {(["problem", "approach", "outcome"] as const).map(k => {
                    const text = bn ? c[`${k}Bn`] || c[`${k}En`] : c[`${k}En`];
                    return text ? (
                      <div key={k}>
                        <dt>
                          {k === "problem"
                            ? t("The problem", "সমস্যা")
                            : k === "approach"
                              ? t("Our approach", "আমাদের পদ্ধতি")
                              : t("Outcome", "ফলাফল")}
                        </dt>
                        <dd>{text}</dd>
                      </div>
                    ) : null;
                  })}
                </dl>
                {(c.tags.length > 0 || c.technologies.length > 0) && (
                  <div className="o-tags">
                    {[...c.tags, ...c.technologies].map(x => (
                      <span key={x}>{x}</span>
                    ))}
                  </div>
                )}
                {c.externalUrl && (
                  <a
                    className="o-underlined"
                    href={c.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("Visit the live project", "লাইভ প্রজেক্ট দেখুন")}{" "}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        portfolio && (
          <section className="o-section o-portfolio-note" aria-labelledby="studio-portfolio">
            <span className="o-eyebrow">{pick(portfolio.eyebrow)}</span>
            <h2 id="studio-portfolio">{pick(portfolio.title)}</h2>
            <p>{pick(portfolio.body)}</p>
            {portfolio.groups.map(g => (
              <div key={g.title.en}>
                <h3>{pick(g.title)}</h3>
                <ol className="o-process">
                  {g.items.map((it, i) => (
                    <li key={it.title.en}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <h4>{pick(it.title)}</h4>
                      <p>{pick(it.text)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
            <Link className="o-button" href="/contact">
              {t("Ask for a private walkthrough", "ব্যক্তিগত ওয়াকথ্রু চান")}{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </section>
        )
      )}

      {showPkgs && (
        <section className="o-section" aria-labelledby="studio-packages">
          <span className="o-eyebrow">{t("WAYS TO WORK WITH US", "যেভাবে কাজ করি")}</span>
          <h2 id="studio-packages">{t("Start where it fits.", "যেখান থেকে মানায়, শুরু করুন।")}</h2>
          <div className="o-pricing-grid">
            {content.packages.map(p => (
              <article key={p.name.en}>
                <h3>{p.name[locale] || p.name.en}</h3>
                <p>{p.for[locale] || p.for.en}</p>
                <strong>{t("Written quote", "লিখিত কোট")}</strong>
                <ul>
                  {p.includes.map(i => (
                    <li key={i.en}>{i[locale] || i.en}</li>
                  ))}
                </ul>
                <Link className="o-button secondary" href="/contact">
                  {t("Discuss this", "এ নিয়ে কথা বলি")}{" "}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {showFaq && (
        <section className="o-help-band" aria-labelledby="studio-faq">
          <div>
            <span className="o-eyebrow">
              {t("A GOOD QUESTION IS A GOOD START.", "ভালো প্রশ্নে ভালো শুরু।")}
            </span>
            <h2 id="studio-faq">{t("Let’s make it clearer.", "চলুন, আরও পরিষ্কার করি।")}</h2>
          </div>
          <div>
            {content.faq.map(f => (
              <details key={f.q.en} className="o-faq">
                <summary>{f.q[locale] || f.q.en}</summary>
                <p>{f.a[locale] || f.a.en}</p>
              </details>
            ))}
          </div>
        </section>
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: bn ? "হোম" : "Home",
              item: absoluteUrl(localePath("/", locale)),
            },
            {
              "@type": "ListItem",
              position: 2,
              name: bn ? "স্টুডিও" : "Studio",
              item: `${siteUrl()}${localePath("/services", locale)}`,
            },
          ],
        }}
      />
    </main>
  );
}
