import { Signature } from "@/components/signature";
import Image from "next/image";
import Link from "@/components/locale-link";
import { ArrowUpRight, Mail } from "lucide-react";
import { getSiteConfig } from "@/lib/site-config";
import { Localized } from "@/components/locale";
import { getActiveCampaigns } from "@/lib/store-products";
import { CampaignShowcase } from "@/components/campaign-showcase";
import { MessageReveal } from "@/components/message-reveal";
import { getSectionState } from "@/lib/website-sections";
import { HomeFaq } from "@/components/home-trust";
import { requestLocale } from "@/lib/request-locale";
import { bnDigits, publicRules } from "@/lib/public-rules";
import { formatPrice } from "@/lib/catalog";
import { storeLive } from "@/lib/seo";
import { getSiteContent } from "@/lib/site-content";
import { pick, type TextKey } from "@/lib/site-content-data";
import { DeliveryChecker, HeroBrand, ProductStory, ShopTabs, StudioTerminal, ValueLetters, WhyBento } from "@/components/home-v2";

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
  const content = await getSiteContent(); const f = content.features; const tx = (k: TextKey) => pick(content, k, locale);
  return <main id="main-content">
    <section className="v2-hero" aria-labelledby="hero-title">
      <div className="v2-hero-copy">
        <HeroBrand />
        <p className="v2-lede v2-fade" style={{ animationDelay: "1.2s" }}>{tx("hero.lede")}</p>
        <div className="v2-actions v2-fade" style={{ animationDelay: "1.5s" }}>
          {config.products && <Link className="v2-btn v2-btn-light" href="#products">{tx("hero.ctaShop")}<ArrowUpRight size={17} /></Link>}
          {config.services && <Link className="v2-btn v2-btn-ghost v2-btn-quote" href="#studio"><span className="v2-long">{tx("hero.ctaQuote")}</span><span className="v2-short"><Localized en="Free quote" bn="ফ্রি কোট" /></span><ArrowUpRight size={17} /></Link>}
        </div>
      </div>
      <div className="v2-planet" aria-hidden="true" />
    </section>

    {f.shopTabs && (config.products || config.services) && <ShopTabs showServices={config.services} chips={f.promiseStrip && <>
      <span><Localized en="Delivery across Bangladesh" bn="সারা বাংলাদেশে ডেলিভারি" /></span>
      {cod && <span><Localized en="Cash on delivery" bn="ক্যাশ অন ডেলিভারি" /></span>}
      <span className="is-bkash"><Localized en="bKash" bn="বিকাশ" /></span>
      <span className="is-nagad"><Localized en="Nagad" bn="নগদ" /></span>
      {rules.returnDays > 0 && <span>{bn ? `${bnDigits(String(rules.returnDays))} দিনের মধ্যে সমাধান` : `Problem? Fixed within ${rules.returnDays} days`}</span>}
      <span><Localized en="Hand-picked products" bn="বাছাই করা পণ্য" /></span>
      {config.services && <span><Localized en="Software, website & app development" bn="সফটওয়্যার, ওয়েবসাইট ও অ্যাপ ডেভেলপমেন্ট" /></span>}
      {config.services && <span><Localized en="Working with clients worldwide" bn="বিশ্বজুড়ে ক্লায়েন্টদের সাথে কাজ" /></span>}
      <span><Localized en="A real person replies" bn="উত্তর দেন একজন মানুষ" /></span>
      <span><Localized en="Shop in Bangla or English" bn="বাংলা বা ইংরেজিতে কেনাকাটা" /></span>
    </>} />}

    {f.deliveryPanel && config.products && <div className="container v2-help-row">
      <DeliveryChecker rules={rules} />
      <div className="v2-panel">
        <h2 className="v2-h3">{bn ? "যেভাবে খুশি পেমেন্ট করুন" : "Pay the way you like"}</h2>
        <ul className="v2-panel-list">
          <li>{bn ? "বিকাশ বা নগদে পেমেন্ট" : "Pay with bKash or Nagad"}</li>
          {cod && <li>{bn ? `${formatPrice(rules.codLimit, locale)} পর্যন্ত ক্যাশ অন ডেলিভারি` : `Cash on delivery up to ${formatPrice(rules.codLimit, locale)}`}</li>}
          {rules.returnDays > 0 && <li>{bn ? `ভুল বা ক্ষতিগ্রস্ত পণ্য? ${bnDigits(String(rules.returnDays))} দিনের মধ্যে জানান` : `Wrong or damaged item? Tell us within ${rules.returnDays} days`}</li>}
        </ul>
        <Link className="v2-link" href="/delivery-returns" style={{ display: "inline-block", marginTop: "1rem" }}>{bn ? "ডেলিভারি ও রিটার্নের সব তথ্য →" : "Delivery & returns details →"}</Link>
      </div>
    </div>}

    {f.productStory && config.products && <ProductStory />}

    {f.campaigns && campaigns.map(c => <CampaignShowcase key={c.id} campaign={c} />)}

    {f.bento && config.products && <WhyBento rules={rules} services={config.services} />}

    {f.about && <section id="about" className="container v2-brand" aria-labelledby="about-title">
      <div className="v2-orbit-wrap" aria-hidden="true"><div className="v2-orbit"><div className="ring1" /><div className="ring2" /><div className="core"><Image src="/logo.svg" alt="" width={56} height={56} /></div></div></div>
      <div className="v2-brand-copy">
        <p className="v2-eyebrow">{tx("about.eyebrow")}</p>
        <h2 id="about-title" className="v2-h2" style={{ marginTop: "0.6rem" }}>{tx("about.title")}</h2>
        <p className="v2-body">{tx("about.body")}</p>
        <Signature />
      </div>
    </section>}

    {f.values && <ValueLetters />}

    {f.studio && config.services && <StudioTerminal />}

    {f.contact && <section id="contact" className="container" aria-labelledby="contact-title"><div className="v2-contact">
      <div>
        <h2 id="contact-title" className="v2-h2">{tx("contact.title")}</h2>
        <p>{tx("contact.body")}</p>
        {!live && <p style={{ fontSize: "0.85rem" }}><Localized en="Design preview: sample products and images. Ordering opens soon." bn="ডিজাইন প্রিভিউ: নমুনা পণ্য ও ছবি। অর্ডার শিগগিরই চালু হবে।" /></p>}
      </div>
      <div className="contact-actions"><MessageReveal />{content.contact.email && <a className="button light-button" href={`mailto:${content.contact.email}`}><Mail size={17} />{content.contact.email}</a>}</div>
    </div></section>}

    {f.faq && config.products && <HomeFaq rules={rules} locale={locale} services={config.services} />}
  </main>;
}
