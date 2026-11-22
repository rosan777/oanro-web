// Homepage sections of the approved design: Store + Studio hero, brand strip, newest products,
// Studio teaser and the wishlist / workspace / account tiles. Every product shown is live catalog
// data; texts come from Admin → Website content ("Homepage — new design").

import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "./locale-link";
import { PrintHeadline, StoreShelf } from "./home-print-motion";
import { PreviewReview } from "./preview-review";
import BookingInstrument from "./booking-instrument";
import { ProductCard } from "./product-card";
import type { Product } from "@/lib/catalog";

type T = (en: string, bn: string) => string;

export function DesignHero({
  text,
  featured,
  catalog,
  bn,
  showStore,
  showStudio,
}: {
  text: (key: "eyebrow" | "line1" | "line2" | "lede" | "ctaStore" | "ctaStudio") => string;
  t: T;
  featured: Product | null;
  catalog: Product[];
  bn: boolean;
  showStore: boolean;
  showStudio: boolean;
}) {
  const shelf = featured ? [featured, ...catalog.filter(p => p.slug !== featured.slug)].slice(0, 5) : [];
  const headline = `${text("line1")} ${text("line2")}`;
  const rotate = showStudio && (headline === "Software that gets work done." || headline === "কাজ সহজ করে এমন সফটওয়্যার।");
  return (
    <section className="print-intro" aria-labelledby="hero-title">
      <div className="print-opening">
        <div className="print-copy">
          <span className="o-eyebrow">{text("eyebrow")}</span>
          <PrintHeadline first={headline} bn={bn} rotate={rotate} />
          <p>{text("lede")}</p>
          <div className="o-actions">
            {showStudio && <Link className="o-button" href="/services">{text("ctaStudio")} <ArrowUpRight size={17} /></Link>}
            {showStore && <Link className="o-button secondary" href="/shop">{text("ctaStore")}</Link>}
          </div>
        </div>
        {showStudio && <BookingInstrument bn={bn} interactive={process.env.NODE_ENV === "development"} />}
      </div>
      {showStore && shelf.length > 0 && <StoreShelf
        bn={bn} shopText={text("ctaStore")}
        items={shelf.map(p => ({slug:p.slug, position:p.position, image:p.image, name:bn && p.bn ? p.bn.name : p.name}))}
      />}
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

/** Studio teaser. The adjacent review uses an example booking project. */
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
      <PreviewReview />
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
