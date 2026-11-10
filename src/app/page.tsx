import { Signature } from "@/components/signature";
import { InfoStrip, PaymentRow } from "@/components/info-strip";
import Image from "next/image";
import Link from "@/components/locale-link";
import { ArrowUpRight } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { Localized } from "@/components/locale";
import { getActiveCampaigns, getStoreProducts } from "@/lib/store-products";
import {
  BrandStrip,
  DesignHero,
  DiscoveryTiles,
  NewFavourites,
  StudioTeaser,
} from "@/components/home-design";
import { CampaignShowcase } from "@/components/campaign-showcase";
import { getSectionState } from "@/lib/website-sections";
import { HomeFaq, HowWeWork, TrustStrip } from "@/components/home-trust";
import { CategoryTiles } from "@/components/category-tiles";
import { DoubleConveyor } from "@/components/double-conveyor";
import { FeatureStory, ServiceConveyor, StandardPanel } from "@/components/home-experience";
import { ValueFan } from "@/components/value-fan";
import { requestLocale } from "@/lib/request-locale";
import { bnDigits, publicRules } from "@/lib/public-rules";
import { formatPrice } from "@/lib/catalog";
import { storeLive } from "@/lib/seo";
import { getSiteContent } from "@/lib/site-content";
import { pick, type TextKey } from "@/lib/site-content-data";
import {
  DeliveryChecker,
  HeroBrand,
  ProductStory,
  ShopTabs,
  StudioTerminal,
  ValueLetters,
  WhyBento,
} from "@/components/home-v2";

// Homepage, design "I1 · Final homepage" (canvas). Every number shown comes from the admin rules or the live catalog:
// no placeholder prices, no invented reviews. Sections without real data (reviews, free-delivery bar) are left out until they exist.
export default async function Home() {
  const env = getSiteConfig();
  const config = { ...env, services: env.services && (await getSectionState()).services };
  const campaigns = config.products ? await getActiveCampaigns() : [];
  const [{ locale }, rules] = await Promise.all([requestLocale(), publicRules()]);
  const bn = locale === "bn";
  const cod = rules.codLimit > 0;
  const live = storeLive();
  // Texts and section switches from Admin → Website content.
  const content = await getSiteContent();
  const f = content.features;
  const tx = (k: TextKey) => pick(content, k, locale);
  const t = (en: string, b: string) => (bn ? b : en);
  // Live products in the owner's display order; the featured product is the owner's choice when it is live.
  const catalog = config.products ? await getStoreProducts() : [];
  const featured =
    catalog.find(p => p.slug === f.featuredProductSlug) ??
    catalog.find(p => p.inStock !== false) ??
    null;
  return (
    <main id="main-content" className="o-home">
      {/* Hero of the approved design: store + studio, with the featured product. */}
      {f.designHero && (
        <DesignHero
          text={k => tx(`home.${k}` as TextKey)}
          t={t}
          featured={featured}
          bn={bn}
          showStore={config.products}
          showStudio={config.services}
        />
      )}
      {f.designHero && (
        <BrandStrip
          phrases={tx("home.strip")
            .split("|")
            .map(x => x.trim())
            .filter(Boolean)}
        />
      )}

      {/* Previous animated brand hero; off unless the owner switches it on in Admin → Website content. */}
      {f.brandHero && (
        <section className="v2-hero" aria-labelledby="hero-title">
          <div className="v2-hero-copy">
            <HeroBrand />
            <p className="v2-lede v2-fade" style={{ animationDelay: "1.2s" }}>
              {tx("hero.lede")}
            </p>
            <div className="v2-actions v2-fade" style={{ animationDelay: "1.5s" }}>
              {config.products && (
                <Link className="v2-btn v2-btn-light" href="#products">
                  {tx("hero.ctaShop")}
                  <ArrowUpRight size={17} />
                </Link>
              )}
              {config.services && (
                <Link className="v2-btn v2-btn-ghost v2-btn-quote" href="#studio">
                  <span className="v2-long">{tx("hero.ctaQuote")}</span>
                  <span className="v2-short">
                    <Localized en="Free quote" bn="ফ্রি কোট" />
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              )}
            </div>
          </div>
          <div className="v2-planet" aria-hidden="true" />
        </section>
      )}

      {f.homeFavourites && config.products && (
        <NewFavourites title={tx("home.favourites")} products={catalog.slice(0, 3)} t={t} />
      )}
      {f.studioTeaser && config.services && (
        <StudioTeaser
          title={tx("home.studioTitle")}
          accent={tx("home.studioAccent")}
          lede={tx("home.studioLede")}
          t={t}
        />
      )}
      {f.discoveryTiles && (
        <DiscoveryTiles title={tx("home.tiles")} t={t} store={config.products} />
      )}

      {/* Shop tabs (products / services) with the scrolling strip of promises. */}
      {f.shopTabs && (config.products || config.services) && (
        <ShopTabs
          showServices={config.services}
          chips={
            (f.promiseStrip || (f.paymentRow && config.products)) && (
              <>
                {f.promiseStrip && (
                  <InfoStrip bn={bn} products={config.products} services={config.services} />
                )}
                {f.paymentRow && config.products && <PaymentRow bn={bn} cod={cod} />}
              </>
            )
          }
        />
      )}

      {/* Delivery checker and payment options, using the owner's rules. */}
      {/* Extra sections: all off until the owner switches them on in Admin → Website content. */}
      {f.categoryTiles && config.products && <CategoryTiles />}
      {f.trustStrip && config.products && <TrustStrip rules={rules} locale={locale} />}
      {f.doubleConveyor && (config.products || config.services) && (
        <DoubleConveyor showProducts={config.products} showServices={config.services} />
      )}

      {f.deliveryPanel && config.products && (
        <div className="container v2-help-row">
          <DeliveryChecker rules={rules} />
          <div className="v2-panel">
            <h2 className="v2-h3">{bn ? "যেভাবে খুশি পেমেন্ট করুন" : "Pay the way you like"}</h2>
            <ul className="v2-panel-list">
              <li>{bn ? "বিকাশ বা নগদে পেমেন্ট" : "Pay with bKash or Nagad"}</li>
              {cod && (
                <li>
                  {bn
                    ? `${formatPrice(rules.codLimit, locale)} পর্যন্ত ক্যাশ অন ডেলিভারি`
                    : `Cash on delivery up to ${formatPrice(rules.codLimit, locale)}`}
                </li>
              )}
              {rules.returnDays > 0 && (
                <li>
                  {bn
                    ? `ভুল বা ক্ষতিগ্রস্ত পণ্য? ${bnDigits(String(rules.returnDays))} দিনের মধ্যে জানান`
                    : `Wrong or damaged item? Tell us within ${rules.returnDays} days`}
                </li>
              )}
            </ul>
            <Link
              className="v2-link"
              href="/delivery-returns"
              style={{ display: "inline-block", marginTop: "1rem" }}
            >
              {bn ? "ডেলিভারি ও রিটার্নের সব তথ্য →" : "Delivery & returns details →"}
            </Link>
          </div>
        </div>
      )}

      {/* Featured product, running campaigns and the "why OANRO" grid. */}
      {f.productStory && config.products && <ProductStory featuredSlug={f.featuredProductSlug} />}

      {f.campaigns && campaigns.map(c => <CampaignShowcase key={c.id} campaign={c} />)}
      {f.featureStory && <FeatureStory />}

      {f.bento && config.products && <WhyBento rules={rules} services={config.services} />}

      {/* About, the five values, the studio and the contact block. */}
      {f.about && (
        <section id="about" className="container v2-brand" aria-labelledby="about-title">
          <div className="v2-orbit-wrap" aria-hidden="true">
            <div className="v2-orbit">
              <div className="ring1" />
              <div className="ring2" />
              <div className="core">
                <Image src="/logo-on-dark.svg" alt="" width={56} height={56} />
              </div>
            </div>
          </div>
          <div className="v2-brand-copy">
            <p className="v2-eyebrow">{tx("about.eyebrow")}</p>
            <h2 id="about-title" className="v2-h2" style={{ marginTop: "0.6rem" }}>
              {tx("about.title")}
            </h2>
            <p className="v2-body">{tx("about.body")}</p>
            <Signature />
          </div>
        </section>
      )}

      {f.standardPanel && <StandardPanel />}
      {f.values && <ValueLetters />}
      {f.valueFan && <ValueFan showProducts={config.products} />}

      {f.serviceConveyor && config.services && <ServiceConveyor />}
      {f.studio && config.services && <StudioTerminal />}
      {f.howWeWork && config.services && <HowWeWork locale={locale} />}

      {f.contact && (
        <section id="contact" className="container" aria-labelledby="contact-title">
          <div className="v2-contact">
            <div>
              <h2 id="contact-title" className="v2-h2">
                {tx("contact.title")}
              </h2>
              <p>{tx("contact.body")}</p>
              {!live && (
                <p style={{ fontSize: "0.85rem" }}>
                  <Localized
                    en="Design preview: sample products and images. Ordering opens soon."
                    bn="ডিজাইন প্রিভিউ: নমুনা পণ্য ও ছবি। অর্ডার শিগগিরই চালু হবে।"
                  />
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Frequently asked questions. */}
      {f.faq && config.products && (
        <HomeFaq rules={rules} locale={locale} services={config.services} />
      )}
    </main>
  );
}
