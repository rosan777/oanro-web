"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "@/components/locale-link";
import { ArrowUpRight, ChevronDown, Menu, Search, ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import type { SiteConfig } from "@/lib/site-config";
import { formatPrice, lineFits, optionLabel, variantSoldOut } from "@/lib/catalog";
import { usePopularProducts, useProductLines, useProducts, useServices } from "./products-context";
import { rank } from "@/lib/smart-search";
import { useCart, changeQuantity, removeItem } from "@/lib/cart";
import { MotionToggle } from "./experience";
import { LanguageSwitch, Localized, useLocale } from "./locale";

export function ProductPhoto({ position, label, className = "", image }: { position: string; label: string; className?: string; image?: string | null }) {
  // Owner photos are same-origin URLs built by the server (/api/products/<slug>/image); otherwise use the sample sprite.
  const style = image?.startsWith("/api/products/") ? { backgroundImage: `url("${image}")`, backgroundSize: "cover", backgroundPosition: "center" } : { backgroundPosition: position };
  return <div className={`product-photo ${className}`} role="img" aria-label={label} style={style} />;
}

/** Price, with the original price crossed out and the saving when the product is on sale. */
export function PriceTag({ price, compareAt, locale = "en", className = "" }: { price: number; compareAt?: number | null; locale?: "en" | "bn"; className?: string }) {
  const sale = compareAt && compareAt > price ? compareAt : null;
  return <span className={`price-tag ${className}`}><strong>{formatPrice(price, locale)}</strong>{sale && <><s aria-label={locale === "bn" ? `আগের দাম ${formatPrice(sale, locale)}` : `Was ${formatPrice(sale, locale)}`}>{formatPrice(sale, locale)}</s><span className="sale-badge">-{Math.round((sale - price) / sale * 100)}%</span></>}</span>;
}

export function Header({ config }: { config: SiteConfig }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const lines = useProductLines();
  const [mega, setMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const searchDialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const open = () => cartDialog.current?.showModal(); window.addEventListener("oanro-open-bag", open); return () => window.removeEventListener("oanro-open-bag", open); }, []);
  const cart = useCart();
  const products = useProducts(); const services = useServices();
  // Ignore saved bag items whose product or size is no longer offered.
  const bag = cart.flatMap(item => { const product = products.find(p => p.slug === item.slug && lineFits(p, item.size, item.color)); return product ? [{ item, product, gone: variantSoldOut(product, item.size, item.color) }] : []; });
  const count = bag.reduce((sum, { item }) => sum + item.quantity, 0);
  const total = bag.reduce((sum, { item, product, gone }) => sum + (gone ? 0 : product.price * item.quantity), 0);
  const popular = usePopularProducts(4);
  const sectionName = (id?: string) => { const c = lines.find(l => l.collection.id === (id ?? "seasonal"))?.collection; return c ? `${c.name} ${c.bn?.name ?? ""}` : ""; };
  const searching = query.trim().length > 0;
  // Smart search: every word is matched on its own (exact, start of word, small typos, English/Bangla synonyms).
  const matchedProducts = searching && config.products ? rank(query, products, p => [
    { text: `${p.name} ${p.bn?.name ?? ""}`, weight: 3 }, { text: `${p.category} ${p.bn?.category ?? ""} ${sectionName(p.collectionId)}`, weight: 2 },
    { text: `${p.tagline} ${p.bn?.tagline ?? ""}`, weight: 1 }]).slice(0, 12) : [];
  const matchedServices = searching && config.services ? rank(query, services, s => [
    { text: `${s.title} ${s.bn?.title ?? ""}`, weight: 3 }, { text: `${s.category ?? ""} ${s.word}`, weight: 2 }, { text: `${s.text} ${s.bn?.text ?? ""}`, weight: 1 }]).slice(0, 6) : [];
  const noMatch = searching && !matchedProducts.length && !matchedServices.length;
  // Before typing (or when nothing matches) show a few popular picks instead of an empty list.
  const filteredProducts = !config.products ? [] : searching && !noMatch ? matchedProducts : popular;
  const filteredServices = matchedServices;
  const closeMenu = () => { setMega(null); setMobile(false); };
  const groups = [...(config.products ? ["Products"] : []), ...(config.services ? ["Services"] : []), "About"];
  const label = (value: string) => locale === "bn" ? ({ Products: "পণ্য", Services: "সেবা", About: "আমাদের কথা" }[value] || value) : value;
  return <>
    <div className="message-header"><div className="container"><span><Localized en="COMMERCE & TECHNOLOGY" bn="কমার্স ও টেকনোলজি" /></span><p><Localized en="Better choices for what you buy and how you build." bn="আপনার কেনাকাটা ও কাজের জন্য আরও ভালো পছন্দ।" /></p><small>{t("OANRO DESIGN PREVIEW", "OANRO ডিজাইন প্রিভিউ")}</small></div></div>
    <header className="site-header" onMouseLeave={() => setMega(null)} onKeyDown={e => { if (e.key === "Escape") { closeMenu(); } }}>
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="OANRO home" onClick={closeMenu}><Image src="/logo.svg" alt="" width={39} height={39} /><span>OANRO</span></Link>
        <nav className={`main-nav ${mobile ? "mobile-open" : ""}`} aria-label="Main navigation">
          {groups.map(group => <div key={group} className="nav-group"><button type="button" aria-expanded={mega === group} aria-controls={`menu-${group}`} onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setMega(group); }} onClick={() => setMega(mega === group ? null : group)}>{label(group)}<ChevronDown size={13} /></button></div>)}
        </nav>
        <div className="header-actions"><LanguageSwitch /><button type="button" className="icon-button" title={t("Search", "খুঁজুন")} aria-label={t("Search OANRO", "OANRO-তে খুঁজুন")} onClick={() => { closeMenu(); searchDialog.current?.showModal(); }}><Search size={20} /></button>
          {config.products && <button type="button" className="icon-button cart-trigger" title={t("Open bag", "ব্যাগ খুলুন")} aria-label={t(`Open bag, ${count} items`, `ব্যাগ খুলুন, ${count}টি আইটেম`)} onClick={() => { closeMenu(); cartDialog.current?.showModal(); }}><ShoppingBag size={20} />{count > 0 && <span className="bag-count">{count}</span>}</button>}
          <button type="button" className="icon-button menu-trigger" title={t("Menu", "মেনু")} aria-label={t("Toggle navigation", "নেভিগেশন খুলুন/বন্ধ করুন")} aria-expanded={mobile} onClick={() => { setMobile(!mobile); setMega(null); }}>{mobile ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
      {groups.map(group => <div id={`menu-${group}`} key={group} className="mega-menu" hidden={mega !== group}>
        <div className="container mega-content"><div className="mega-intro"><span className="eyebrow">{t("Explore OANRO", "OANRO ঘুরে দেখুন")}</span><h2>{group === "Products" ? t("Find your next.", "আপনার পরেরটা খুঁজুন।") : group === "Services" ? t("Build what's next.", "আগামীকে গড়ুন।") : t("A considered approach.", "ভেবেচিন্তে এগোনো।")}</h2><p>{group === "Products" ? t("Browse by product line.", "পণ্যের লাইন অনুযায়ী দেখুন।") : group === "Services" ? t("Practical technology for people and businesses.", "মানুষ ও ব্যবসার জন্য কার্যকর প্রযুক্তি।") : t("Discover our story and get in touch.", "আমাদের গল্প জানুন ও যোগাযোগ করুন।")}</p></div>
          <div className="mega-links">
            {group === "About" && <Link href="/account" onClick={closeMenu}><Localized en="My account" bn="আমার অ্যাকাউন্ট" /><ArrowUpRight size={16} /></Link>}
            {group === "Products" && <>{lines.map(({ collection: c }) => <Link onClick={closeMenu} key={c.id} href={`/#${c.anchor}`}>{bn && c.bn ? c.bn.name : c.name}<ArrowUpRight size={16} /></Link>)}{config.partners && <Link href="/#partners" onClick={closeMenu}>{t("Partner Picks", "পার্টনার পছন্দ")}<ArrowUpRight size={16} /></Link>}</>}
            {group === "Services" && services.map(s => <Link key={s.slug} href={`/#service-${s.slug}`} onClick={closeMenu}>{bn && s.bn ? s.bn.title : s.title}<ArrowUpRight size={16} /></Link>)}
            {group === "About" && <><Link href="/#about" onClick={closeMenu}>{t("Our approach", "আমাদের পদ্ধতি")}<ArrowUpRight size={16} /></Link><Link href="/#contact" onClick={closeMenu}>{t("Contact OANRO", "OANRO-তে যোগাযোগ")}<ArrowUpRight size={16} /></Link></>}
          </div>
          <div className="mega-feature">{group === "Products" ? <ProductPhoto position="0% 0%" label="Sample green cable-knit sweater" /> : <Image src="/images/campaign.png" alt="OANRO sample winter campaign" fill sizes="300px" />}<span>{t("THE FIRST CHAPTER", "প্রথম অধ্যায়")}</span></div>
        </div>
      </div>)}
    </header>

    <dialog ref={searchDialog} className="search-dialog" aria-labelledby="search-title" onClick={e => { if (e.target === e.currentTarget) searchDialog.current?.close(); }}>
      <div className="dialog-content"><div className="dialog-heading"><h2 id="search-title"><Localized en="Find something good." bn="ভালো কিছু খুঁজুন।" /></h2><button type="button" className="icon-button" title="Close search" aria-label="Close search" onClick={() => searchDialog.current?.close()}><X /></button></div>
        <label className="search-field"><Search size={20} /><span className="sr-only"><Localized en="Search products and services" bn="পণ্য ও সেবা খুঁজুন" /></span><input type="search" placeholder={t("Search products or services", "পণ্য বা সেবা খুঁজুন")} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <p className="small-note" role="status">{!searching ? t("Popular right now", "এখন জনপ্রিয়") : noMatch ? t(`No exact match for “${query.trim()}”. You might like these:`, `“${query.trim()}” এর সাথে হুবহু কিছু মেলেনি। এগুলো দেখতে পারেন:`) : t(`${filteredProducts.length + filteredServices.length} results`, `${filteredProducts.length + filteredServices.length}টি ফলাফল`)}</p>
        <div className="search-results">{filteredProducts.map(p => <Link key={p.slug} href={`/products/${p.slug}`} onClick={() => searchDialog.current?.close()}><ProductPhoto position={p.position} image={p.image} label={p.name} /><span><strong>{bn && p.bn ? p.bn.name : p.name}</strong><small>{bn && p.bn ? p.bn.category : p.category}{p.inStock === false ? t(" / Out of stock", " / স্টক শেষ") : ""}</small></span><ArrowUpRight size={18} /></Link>)}
          {filteredServices.map(s => <Link key={s.slug} href={`/#service-${s.slug}`} onClick={() => searchDialog.current?.close()}><span className="service-search-mark">{s.word}</span><span><strong>{bn && s.bn ? s.bn.title : s.title}</strong><small><Localized en="Technology service" bn="প্রযুক্তি সেবা" /></small></span><ArrowUpRight size={18} /></Link>)}
          {!filteredProducts.length && !filteredServices.length && <p className="empty-state"><Localized en="Try “winter”, “web”, or “headphones”." bn="“ক্যাপ”, “ওয়েব” বা “হেডফোন” লিখে দেখুন।" /></p>}</div>
      </div>
    </dialog>
    <dialog ref={cartDialog} className="cart-dialog" aria-labelledby="bag-title" onClick={e => { if (e.target === e.currentTarget) cartDialog.current?.close(); }}>
      <div className="dialog-content"><div className="dialog-heading"><h2 id="bag-title"><Localized en="Your bag" bn="আপনার ব্যাগ" /></h2><button type="button" className="icon-button" title="Close bag" aria-label="Close bag" onClick={() => cartDialog.current?.close()}><X /></button></div><p className="demo-notice"><Localized en="Sign in at checkout to place your order." bn="অর্ডার দিতে চেকআউটে সাইন ইন করুন।" /></p>
        {!bag.length ? <div className="empty-state"><ShoppingBag size={32} /><h3><Localized en="A little room for discovery." bn="আবিষ্কারের জন্য একটু জায়গা।" /></h3><p><Localized en="Your bag is empty." bn="আপনার ব্যাগ খালি।" /></p><Link className="button brand-button" href="/#products" onClick={() => cartDialog.current?.close()}><Localized en="Explore products" bn="পণ্য দেখুন" /><ArrowUpRight size={16} /></Link></div> : <><div className="bag-items">{bag.map(({ item, product, gone }) => { return <article className="bag-item" key={`${item.slug}-${item.size}-${item.color}`}><ProductPhoto position={product.position} image={product.image} label={product.name} /><div><Link href={`/products/${product.slug}`} onClick={() => cartDialog.current?.close()}>{bn && product.bn ? product.bn.name : product.name}</Link><small>{optionLabel(product, item.size, item.color, bn)} / {gone ? <strong className="stock-badge"><Localized en="Out of stock" bn="স্টক শেষ" /></strong> : formatPrice(product.price)}</small><div className="quantity-controls"><button type="button" title="Decrease quantity" aria-label={`Decrease ${product.name}`} onClick={() => changeQuantity(item.slug, item.size, -1, item.color)}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" title="Increase quantity" disabled={item.quantity >= 10 || gone} aria-label={`Increase ${product.name}`} onClick={() => changeQuantity(item.slug, item.size, 1, item.color)}><Plus size={14} /></button><button type="button" title="Remove item" aria-label={`Remove ${product.name}`} onClick={() => removeItem(item.slug, item.size, item.color)}><Trash2 size={14} /></button></div></div></article>; })}</div><div className="bag-total"><span><Localized en="Subtotal" bn="সাবটোটাল" /></span><strong>{formatPrice(total, locale)}</strong></div><Link className="button brand-button bag-checkout" href="/checkout" onClick={() => cartDialog.current?.close()}><Localized en="Checkout" bn="চেকআউট" /><ArrowUpRight size={16} /></Link><p className="small-note"><Localized en="Pay with bKash or Nagad. Delivery charges are confirmed with your order." bn="bKash বা Nagad-এ পেমেন্ট করুন। ডেলিভারি চার্জ অর্ডারের সাথে নিশ্চিত করা হবে।" /></p></>}
      </div>
    </dialog>
  </>;
}

export function Footer({ config }: { config: SiteConfig }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const lines = useProductLines().filter(line => line.count > 0); const services = useServices();
  const t = (en: string, b: string) => bn ? b : en;
  // Organised columns (Shop, Services, Help) with real links to category and service pages: good for visitors and for Google.
  return <footer className="site-footer"><div className="container">
    <div className="footer-grid">
      <div className="footer-brand"><Link className="brand" href="/"><Image src="/logo.svg" alt="" width={42} height={42} />OANRO</Link>
        <p>{t("Find your next. Build what's next. E-commerce and IT services from Chatmohar, Pabna, for all of Bangladesh.", "আপনার পরেরটা খুঁজুন। আগামীকে গড়ুন। চাটমোহর, পাবনা থেকে সারা বাংলাদেশের জন্য ই-কমার্স ও আইটি সেবা।")}</p>
        <a href="#top" className="text-link">{t("Back to top", "উপরে ফিরে যান")}<ArrowUpRight size={16} /></a></div>
      {config.products && lines.length > 0 && <nav aria-label={t("Shop", "শপ")} className="footer-col"><strong>{t("Shop", "শপ")}</strong>{lines.map(({ collection }) => <Link key={collection.id} href={`/${collection.slug}`}>{bn && collection.bn ? collection.bn.name : collection.name}</Link>)}</nav>}
      {config.services && services.length > 0 && <nav aria-label={t("Services", "সেবা")} className="footer-col"><strong>{t("Services", "সেবা")}</strong>{services.map(s => <Link key={s.slug} href={`/services/${s.slug}`}>{bn && s.bn ? s.bn.title : s.title}</Link>)}</nav>}
      <nav aria-label={t("Help", "সহায়তা")} className="footer-col"><strong>{t("Help", "সহায়তা")}</strong>
        <Link href="/delivery-returns">{t("Delivery & returns", "ডেলিভারি ও রিটার্ন")}</Link><Link href="/contact">{t("Contact", "যোগাযোগ")}</Link><Link href="/privacy">{t("Privacy", "প্রাইভেসি")}</Link><Link href="/terms">{t("Terms", "শর্তাবলি")}</Link></nav>
    </div>
    <div className="footer-bottom"><span>{t("© 2026 OANRO · Trade License No. 002039", "© ২০২৬ OANRO · ট্রেড লাইসেন্স নং ০০২০৩৯")}</span>
      <span className="pay-chips" aria-label={t("Payment methods", "পেমেন্ট পদ্ধতি")}><span>bKash</span><span>Nagad</span></span>
      <MotionToggle /></div>
  </div></footer>;
}
