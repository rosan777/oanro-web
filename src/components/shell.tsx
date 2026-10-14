"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Menu, Search, ShoppingBag, X, Plus, Minus, Trash2 } from "lucide-react";
import type { SiteConfig } from "@/lib/site-config";
import { products, services, formatPrice } from "@/lib/catalog";
import { useCart, changeQuantity, removeItem } from "@/lib/cart";
import { MotionToggle } from "./experience";
import { LanguageSwitch, Localized, useLocale } from "./locale";

export function ProductPhoto({ position, label, className = "" }: { position: string; label: string; className?: string }) {
  return <div className={`product-photo ${className}`} role="img" aria-label={label} style={{ backgroundPosition: position }} />;
}

export function Header({ config }: { config: SiteConfig }) {
  const { locale } = useLocale();
  const [mega, setMega] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const searchDialog = useRef<HTMLDialogElement>(null);
  const cartDialog = useRef<HTMLDialogElement>(null);
  const cart = useCart();
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + (products.find(p => p.slug === item.slug)?.price || 0) * item.quantity, 0);
  const filteredProducts = config.products ? products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase().trim())) : [];
  const filteredServices = config.services ? services.filter(s => `${s.title} ${s.text}`.toLowerCase().includes(query.toLowerCase().trim())) : [];
  const closeMenu = () => { setMega(null); setMobile(false); };
  const groups = [...(config.products ? ["Products"] : []), ...(config.services ? ["Services"] : []), "About"];
  const label = (value: string) => locale === "bn" ? ({ Products: "পণ্য", Services: "সেবা", About: "আমাদের কথা" }[value] || value) : value;
  return <>
    <div className="message-header"><div className="container"><span><Localized en="COMMERCE & TECHNOLOGY" bn="কমার্স ও টেকনোলজি" /></span><p><Localized en="Better choices for what you buy and how you build." bn="আপনার কেনাকাটা ও কাজের জন্য আরও ভালো পছন্দ।" /></p><small>OANRO DESIGN PREVIEW</small></div></div>
    <header className="site-header" onMouseLeave={() => setMega(null)} onKeyDown={e => { if (e.key === "Escape") { closeMenu(); } }}>
      <div className="container header-row">
        <Link href="/" className="brand" aria-label="OANRO home" onClick={closeMenu}><Image src="/logo.svg" alt="" width={39} height={39} /><span>OANRO</span></Link>
        <nav className={`main-nav ${mobile ? "mobile-open" : ""}`} aria-label="Main navigation">
          {groups.map(group => <div key={group} className="nav-group"><button type="button" aria-expanded={mega === group} aria-controls={`menu-${group}`} onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) setMega(group); }} onClick={() => setMega(mega === group ? null : group)}>{label(group)}<ChevronDown size={13} /></button></div>)}
        </nav>
        <div className="header-actions"><LanguageSwitch /><button type="button" className="icon-button" title="Search" aria-label="Search OANRO" onClick={() => { closeMenu(); searchDialog.current?.showModal(); }}><Search size={20} /></button>
          {config.products && <button type="button" className="icon-button cart-trigger" title="Open demo bag" aria-label={`Open demo bag, ${count} items`} onClick={() => { closeMenu(); cartDialog.current?.showModal(); }}><ShoppingBag size={20} />{count > 0 && <span className="bag-count">{count}</span>}</button>}
          <button type="button" className="icon-button menu-trigger" title="Menu" aria-label="Toggle navigation" aria-expanded={mobile} onClick={() => { setMobile(!mobile); setMega(null); }}>{mobile ? <X size={21} /> : <Menu size={21} />}</button></div>
      </div>
      {groups.map(group => <div id={`menu-${group}`} key={group} className="mega-menu" hidden={mega !== group}>
        <div className="container mega-content"><div className="mega-intro"><span className="eyebrow">Explore OANRO</span><h2>{group === "Products" ? "Find your next." : group === "Services" ? "Build what's next." : "A considered approach."}</h2><p>{group === "Products" ? "Winter layers, small essentials, and everyday technology." : group === "Services" ? "Practical technology for people and businesses." : "Discover our story and get in touch."}</p></div>
          <div className="mega-links">
            {group === "About" && <Link href="/account" onClick={closeMenu}><Localized en="My account" bn="আমার অ্যাকাউন্ট" /><ArrowUpRight size={16} /></Link>}
            {group === "Products" && <>{products.map(p => <Link onClick={closeMenu} key={p.slug} href={`/products/${p.slug}`}>{p.name}<ArrowUpRight size={16} /></Link>)}<Link href="/#products" onClick={closeMenu}>All products<ArrowUpRight size={16} /></Link>{config.partners && <Link href="/#partners" onClick={closeMenu}>Partner Picks<ArrowUpRight size={16} /></Link>}</>}
            {group === "Services" && services.map(s => <Link key={s.slug} href={`/#service-${s.slug}`} onClick={closeMenu}>{s.title}<ArrowUpRight size={16} /></Link>)}
            {group === "About" && <><Link href="/#about" onClick={closeMenu}>Our approach<ArrowUpRight size={16} /></Link><Link href="/#contact" onClick={closeMenu}>Contact OANRO<ArrowUpRight size={16} /></Link></>}
          </div>
          <div className="mega-feature">{group === "Products" ? <ProductPhoto position="0% 0%" label="Sample green cable-knit sweater" /> : <Image src="/images/campaign.png" alt="OANRO sample winter campaign" fill sizes="300px" />}<span>THE FIRST CHAPTER</span></div>
        </div>
      </div>)}
    </header>

    <dialog ref={searchDialog} className="search-dialog" aria-labelledby="search-title" onClick={e => { if (e.target === e.currentTarget) searchDialog.current?.close(); }}>
      <div className="dialog-content"><div className="dialog-heading"><h2 id="search-title">Find something good.</h2><button type="button" className="icon-button" title="Close search" aria-label="Close search" onClick={() => searchDialog.current?.close()}><X /></button></div>
        <label className="search-field"><Search size={20} /><span className="sr-only">Search products and services</span><input type="search" placeholder="Search products or services" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <p className="small-note" role="status">{filteredProducts.length + filteredServices.length} results</p>
        <div className="search-results">{filteredProducts.map(p => <Link key={p.slug} href={`/products/${p.slug}`} onClick={() => searchDialog.current?.close()}><ProductPhoto position={p.position} label={p.name} /><span><strong>{p.name}</strong><small>{p.category} / sample product</small></span><ArrowUpRight size={18} /></Link>)}
          {filteredServices.map(s => <Link key={s.slug} href={`/#service-${s.slug}`} onClick={() => searchDialog.current?.close()}><span className="service-search-mark">{s.word}</span><span><strong>{s.title}</strong><small>Technology service</small></span><ArrowUpRight size={18} /></Link>)}
          {!filteredProducts.length && !filteredServices.length && <p className="empty-state">No matches yet. Try “winter”, “web”, or “headphones”.</p>}</div>
      </div>
    </dialog>
    <dialog ref={cartDialog} className="cart-dialog" aria-labelledby="bag-title" onClick={e => { if (e.target === e.currentTarget) cartDialog.current?.close(); }}>
      <div className="dialog-content"><div className="dialog-heading"><h2 id="bag-title">Your bag</h2><button type="button" className="icon-button" title="Close bag" aria-label="Close bag" onClick={() => cartDialog.current?.close()}><X /></button></div><p className="demo-notice">Demonstration bag. Sample prices only; no orders or payments are submitted.</p>
        {!cart.length ? <div className="empty-state"><ShoppingBag size={32} /><h3>A little room for discovery.</h3><p>Your demo bag is empty.</p><Link className="button brand-button" href="/#products" onClick={() => cartDialog.current?.close()}>Explore products<ArrowUpRight size={16} /></Link></div> : <><div className="bag-items">{cart.map(item => { const product = products.find(p => p.slug === item.slug)!; return <article className="bag-item" key={`${item.slug}-${item.size}`}><ProductPhoto position={product.position} label={product.name} /><div><Link href={`/products/${product.slug}`} onClick={() => cartDialog.current?.close()}>{product.name}</Link><small>{item.size} / {formatPrice(product.price)}</small><div className="quantity-controls"><button type="button" title="Decrease quantity" aria-label={`Decrease ${product.name}`} onClick={() => changeQuantity(item.slug, item.size, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button type="button" title="Increase quantity" disabled={item.quantity >= 10} aria-label={`Increase ${product.name}`} onClick={() => changeQuantity(item.slug, item.size, 1)}><Plus size={14} /></button><button type="button" title="Remove item" aria-label={`Remove ${product.name}`} onClick={() => removeItem(item.slug, item.size)}><Trash2 size={14} /></button></div></div></article>; })}</div><div className="bag-total"><span>Sample subtotal</span><strong>{formatPrice(total)}</strong></div><p className="small-note">Delivery and checkout will be available when OANRO launches.</p></>}
      </div>
    </dialog>
  </>;
}

export function Footer({ config }: { config: SiteConfig }) {
  return <footer className="site-footer"><div className="container"><div className="footer-main"><Link className="brand" href="/"><Image src="/logo.svg" alt="" width={42} height={42} />OANRO</Link><p>Find your next. Build what&apos;s next.</p><a href="#top" className="text-link">Back to top<ArrowUpRight size={16} /></a></div><div className="footer-bottom"><span>Bangladesh first. Possibilities beyond.</span><nav aria-label="Footer">{config.products && <Link href="/#products">Products</Link>}{config.services && <Link href="/#services">Services</Link>}<Link href="/#contact">Contact</Link></nav><MotionToggle /></div></div></footer>;
}
