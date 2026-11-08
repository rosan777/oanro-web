// Homepage sections of the approved design: Store + Studio hero, brand strip, newest products,
// Studio teaser and the wishlist / workspace / account tiles. Every product shown is live catalog
// data; texts come from Admin → Website content ("Homepage — new design").

import { ArrowRight, ArrowUpRight, Check, Code2 } from "lucide-react";
import Link from "./locale-link";
import { ProductPhoto } from "./shell";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/catalog";

type T = (en: string, bn: string) => string;

export function DesignHero({
  text,
  t,
  featured,
  bn,
  showStore,
  showStudio,
}: {
  text: (key: "eyebrow" | "line1" | "line2" | "lede" | "ctaStore" | "ctaStudio") => string;
  t: T;
  featured: Product | null;
  bn: boolean;
  showStore: boolean;
  showStudio: boolean;
}) {
  const name = featured ? (bn && featured.bn ? featured.bn.name : featured.name) : "";
  return (
    <section className="o-hero" aria-labelledby="hero-title">
      <div className="o-hero-copy">
        <span className="o-eyebrow">{text("eyebrow")}</span>
        <h1 id="hero-title">
          {text("line1")}
          <br />
          <mark>{text("line2")}</mark>
        </h1>
        <p>{text("lede")}</p>
        <div className="o-actions">
          {showStore && (
            <Link className="o-button" href="/shop">
              {text("ctaStore")}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          )}
          {showStudio && (
            <Link className="o-button secondary" href="/services">
              {text("ctaStudio")}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          )}
        </div>
        <span className="o-hero-foot">
          {t("CONSIDERED ESSENTIALS / DIGITAL POSSIBILITIES", "বাছাই করা পণ্য / ডিজিটাল সম্ভাবনা")}
        </span>
      </div>
      <div className="o-hero-art">
        <span className="o-spark" aria-hidden="true">
          ✳
        </span>
        {featured && (
          <div className="o-hero-product">
            <ProductPhoto position={featured.position} image={featured.image} label={name} />
            <Link href={`/products/${featured.slug}`}>
              {name}
              <ArrowUpRight size={21} aria-hidden="true" />
            </Link>
          </div>
        )}
        {showStudio && (
          <div className="o-art-note">
            <Code2 size={25} aria-hidden="true" />
            <span>
              {t("Ideas into", "আইডিয়া থেকে")}
              <br />
              <b>{t("something real.", "বাস্তব কিছু।")}</b>
            </span>
            <Link href="/services" aria-label={t("Explore digital services", "ডিজিটাল সেবা দেখুন")}>
              <ArrowUpRight size={25} aria-hidden="true" />
            </Link>
          </div>
        )}
        <span className="o-orbit-note" aria-hidden="true">
          STORE + STUDIO / OANRO
        </span>
      </div>
    </section>
  );
}

export function BrandStrip({ phrases }: { phrases: string[] }) {
  if (!phrases.length) return null;
  return (
    <div className="o-brandstrip">
      {phrases.map(x => (
        <span key={x}>✳ {x}</span>
      ))}
    </div>
  );
}

export function NewFavourites({
  title,
  products,
  t,
}: {
  title: string;
  products: Product[];
  t: T;
}) {
  if (!products.length) return null;
  return (
    <section className="o-section" id="favourites" aria-labelledby="favourites-title">
      <div className="o-section-line">
        <div>
          <span className="o-eyebrow">{t("THE EVERYDAY EDIT", "প্রতিদিনের বাছাই")}</span>
          <h2 id="favourites-title">
            {title}
            <span className="o-underline" aria-hidden="true" />
          </h2>
        </div>
        <Link className="o-section-link" href="/shop">
          {t("Shop the collection", "কালেকশন দেখুন")} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="o-product-grid three">
        {products.map(p => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </section>
  );
}

/** Studio teaser. The workspace window is an illustration of the client workspace, labelled as an example. */
export function StudioTeaser({
  title,
  accent,
  lede,
  t,
}: {
  title: string;
  accent: string;
  lede: string;
  t: T;
}) {
  return (
    <section className="o-studio-teaser" id="studio-teaser" aria-labelledby="studio-teaser-title">
      <div>
        <span className="o-eyebrow">
          {t("OANRO STUDIO / DIGITAL BY DESIGN", "OANRO স্টুডিও / ডিজিটাল ডিজাইন")}
        </span>
        <h2 id="studio-teaser-title">
          {title}
          <br />
          <em>{accent}</em>
        </h2>
        <p>{lede}</p>
        <Link className="o-button" href="/services">
          {t("Explore the studio", "স্টুডিও ঘুরে দেখুন")}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <figure
        className="o-workspace-preview"
        aria-label={t("Example of a client workspace", "ক্লায়েন্ট ওয়ার্কস্পেসের উদাহরণ")}
      >
        <div className="o-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>OANRO / {t("your workspace", "আপনার ওয়ার্কস্পেস")}</span>
        </div>
        <div className="o-mini-body">
          <aside aria-hidden="true">
            <b>O.</b>
            <span>{t("Overview", "সারসংক্ষেপ")}</span>
            <span>{t("Milestones", "মাইলস্টোন")}</span>
            <span>{t("Files", "ফাইল")}</span>
            <span>{t("Approvals", "অনুমোদন")}</span>
          </aside>
          <div>
            <small>{t("EXAMPLE PROJECT", "উদাহরণ প্রজেক্ট")}</small>
            <h3>{t("Your next launch.", "আপনার পরের লঞ্চ।")}</h3>
            <div className="o-preview-tasks">
              <span>
                <Check size={15} aria-hidden="true" />{" "}
                {t("Discovery & direction", "পরিকল্পনা ও দিকনির্দেশনা")}
                <small>{t("Done", "সম্পন্ন")}</small>
              </span>
              <span>
                <span className="o-task-dot" aria-hidden="true" />{" "}
                {t("Design review", "ডিজাইন রিভিউ")}
                <small>{t("In review", "রিভিউতে")}</small>
              </span>
              <span>
                <span className="o-task-dot" aria-hidden="true" />{" "}
                {t("Build & launch", "তৈরি ও লঞ্চ")}
                <small>{t("Up next", "পরবর্তী")}</small>
              </span>
            </div>
          </div>
        </div>
        <figcaption className="o-floating-tag">
          {t(
            "A clear view of what comes next — in your workspace.",
            "পরের ধাপ পরিষ্কারভাবে দেখুন — আপনার ওয়ার্কস্পেসে।",
          )}
        </figcaption>
      </figure>
    </section>
  );
}

export function DiscoveryTiles({ title, t, store }: { title: string; t: T; store: boolean }) {
  const tiles = [
    ...(store
      ? [
          [
            "/wishlist",
            t("01 / SAVE IT", "০১ / রেখে দিন"),
            t("A little wish list.", "ছোট্ট পছন্দের তালিকা।"),
            "peach",
          ],
        ]
      : []),
    [
      "/workspace",
      t("02 / BUILD IT", "০২ / তৈরি করুন"),
      t("Your project, connected.", "আপনার প্রজেক্ট, এক জায়গায়।"),
      "lilac",
    ],
    [
      "/account",
      t("03 / KEEP IT SIMPLE", "০৩ / সহজ রাখুন"),
      t("Everything in one place.", "সব এক জায়গায়।"),
      "sage",
    ],
  ];
  return (
    <section className="o-section" aria-labelledby="tiles-title">
      <div className="o-section-line">
        <div>
          <span className="o-eyebrow">{t("MORE WAYS TO MAKE IT YOURS", "আপনার মতো করে নিন")}</span>
          <h2 id="tiles-title">{title}</h2>
        </div>
      </div>
      <div className="o-discovery-tiles">
        {tiles.map(([href, small, heading, tone]) => (
          <Link className={tone} key={href} href={href}>
            <small>{small}</small>
            <h3>{heading}</h3>
            <ArrowUpRight size={27} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
