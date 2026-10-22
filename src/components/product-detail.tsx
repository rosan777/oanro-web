"use client";

import { useEffect, useState, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from "react";
import type { CheckoutRules } from "@/lib/order-store";
import { BuyBox, CompleteLook, SizeGuide, StickyBuy } from "./buy-box";
import Image from "next/image";
import Link from "@/components/locale-link";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, Check, MessageCircle, ShoppingBag } from "lucide-react";
import { track } from "@/lib/meta-pixel";
import { useFeature, useSiteContent } from "./site-content-context";
import { addToCart } from "@/lib/cart";
import { type Product, variantSoldOut } from "@/lib/catalog";
import type { SiteConfig } from "@/lib/site-config";
import { PriceTag, ProductPhoto } from "./shell";
import { Localized, useLocale } from "./locale";
import { FormPopup } from "./form-popup";
import { InquiryForm } from "./inquiry-form";
import { RelatedProducts } from "./related-products";
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="scene-loading"><Localized en="Loading 3D concept..." bn="3D কনসেপ্ট লোড হচ্ছে..." /></div> });

export default function ProductDetail({ product, rules, related }: { product: Product; rules: CheckoutRules; contact: SiteConfig; related?: Parameters<typeof RelatedProducts>[0] }) {
  const { locale } = useLocale(); const bn = locale === "bn";
  const copy = bn && product.bn ? [product.bn.name, product.bn.category, product.bn.tagline, product.bn.description, product.bn.specs] : [product.name, product.category, product.tagline, product.description, product.specs];
  const [name, category, tagline, description, specs] = copy as [string, string, string, string, [string, string][]];
  const knit = product.slug === "forest-knit"; const headphones = product.slug === "studio-headphones";
  const views = ["Product", ...(knit ? ["Texture", "On a model", "Film"] : ["Close-up"]), ...(headphones ? ["3D view"] : [])];
  const [view, setView] = useState("Product");
  const [added, setAdded] = useState(false);
  // Photo zoom follows the mouse on the main product view; on phones, swipe left/right to change the view.
  const [zoom, setZoom] = useState(false);
  const zoomMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || view !== "Product") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--zx", `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty("--zy", `${((e.clientY - r.top) / r.height) * 100}%`);
    setZoom(true);
  };
  const [touchX, setTouchX] = useState<number | null>(null);
  const swipeStart = (e: ReactTouchEvent) => setTouchX(e.touches[0]?.clientX ?? null);
  const swipeEnd = (e: ReactTouchEvent) => {
    if (touchX === null || view === "3D view") return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX; setTouchX(null);
    if (Math.abs(dx) < 45) return;
    const i = views.indexOf(view); setView(views[(i + (dx < 0 ? 1 : views.length - 1)) % views.length]);
  };
  // Colour × size: start on the first combination that is still available.
  const colors = product.colors ?? [];
  const firstOpen = (colors.length ? colors.map(c => c.id) : [""]).flatMap(c => product.sizes.map(s => ({ c, s }))).find(o => !variantSoldOut(product, o.s, o.c));
  const [color, setColor] = useState(firstOpen?.c ?? colors[0]?.id ?? ""); const [size, setSize] = useState(firstOpen?.s ?? product.sizes[0]);
  useEffect(() => { track("ViewContent", { content_ids: [product.slug], content_type: "product", content_name: product.name, value: product.price }); }, [product.slug, product.name, product.price]);
  // "Order on WhatsApp": opens a chat with the product, chosen options and link already written (owner switches it in Admin).
  const { contact } = useSiteContent(); const waOrder = useFeature("whatsappOrder") && contact.whatsapp;
  const waText = () => { const c = colors.find(x => x.id === color); const link = typeof window === "undefined" ? "" : window.location.href.split("#")[0];
    return encodeURIComponent(bn ? `হ্যালো OANRO, আমি অর্ডার করতে চাই:\n${product.bn?.name || product.name}\nসাইজ: ${size}${c ? `\nরং: ${c.bn || c.name}` : ""}\nপরিমাণ: ১\n${link}` : `Hi OANRO, I'd like to order:\n${product.name}\nSize: ${size}${c ? `\nColour: ${c.name}` : ""}\nQuantity: 1\n${link}`); };
  const picked = colors.find(c => c.id === color);
  const soldOut = variantSoldOut(product, size, color);
  const pickColor = (id: string) => { setColor(id); setView("Product"); if (variantSoldOut(product, size, id)) { const open = product.sizes.find(s => !variantSoldOut(product, s, id)); if (open) setSize(open); } };
  return <main id="main-content" className="product-page"><div className="container"><Link className="back-link" href="/#products"><ArrowLeft size={16} />{bn ? "কালেকশনে ফিরে যান" : "Back to the collection"}</Link><div className="product-detail-grid"><div className="product-gallery"><div className={`gallery-stage ${view === "Close-up" ? "zoomed" : ""}${zoom ? " is-zooming" : ""}`} onPointerMove={zoomMove} onPointerLeave={() => setZoom(false)} onTouchStart={swipeStart} onTouchEnd={swipeEnd}>
    {view === "3D view" ? <Scene /> : view === "Film" ? <video key={view} controls playsInline preload="metadata" poster="/images/campaign.png" aria-label="Animated still-image study of the sample knitwear campaign"><source src="/media/knit-study.webm" type="video/webm" /><source src="/media/knit-study.mp4" type="video/mp4" />Your browser does not support this video.</video> : view === "Texture" || view === "On a model" ? <Image src={view === "Texture" ? "/images/fabric.png" : "/images/campaign.png"} alt={view === "Texture" ? "Generated sample knit texture close-up" : "Generated model wearing the sample green sweater"} fill sizes="(max-width: 767px) 100vw, 60vw" style={{ objectFit: "cover", objectPosition: view === "On a model" ? "75% center" : "center" }} /> : <ProductPhoto position={product.position} image={picked?.image ?? product.image} label={picked ? `${product.name}, ${picked.name}` : product.image ? product.name : `Generated sample ${product.name}`} />}
    </div><div className="gallery-tabs" role="group" aria-label={bn ? "পণ্যের মিডিয়া" : "Product media"}>{views.map(label => <button type="button" key={label} aria-pressed={view === label} onClick={() => setView(label)}>{bn ? ({ Product: "পণ্য", Texture: "টেক্সচার", "On a model": "মডেলের গায়ে", Film: "ভিডিও", "Close-up": "কাছ থেকে", "3D view": "3D ভিউ" } as Record<string, string>)[label] ?? label : label}</button>)}</div><p className="small-note">{view === "Film" ? (bn ? "AI-জেনারেটেড স্থিরচিত্র থেকে তৈরি মোশন স্টাডি, আসল পণ্যের ভিডিও নয়।" : "Motion study made from an AI-generated still image, not real product footage.") : view === "3D view" ? (bn ? "দৃষ্টান্তমূলক 3D কনসেপ্ট, তৈরি পণ্যের হুবহু মডেল নয়।" : "Illustrative 3D concept. It is not an exact model of a manufactured product.") : product.image && view === "Product" ? "" : bn ? "AI-জেনারেটেড নমুনা ছবি। আসল পণ্য ভিন্ন হতে পারে।" : "AI-generated sample imagery. Actual products may differ."}</p></div>
    <div className="product-information"><p className="eyebrow">{category}</p><h1>{name}</h1><p className="product-tagline">{tagline}</p><p>{description}</p><div className="demo-price"><PriceTag price={product.price} compareAt={product.compareAt} locale={locale} />{product.inStock === false ? <span className="stock-badge" role="status">{bn ? "স্টক শেষ" : "Out of stock"}</span> : <span>{bn ? "নমুনা মূল্য / ডিজাইন প্রিভিউ" : "Sample price / design preview"}</span>}</div>{colors.length > 0 && <fieldset className="color-selector"><legend>{bn ? "রং" : "Colour"}: <strong>{picked ? (bn ? picked.bn : picked.name) : ""}</strong></legend>{colors.map(c => { const none = product.sizes.every(s => variantSoldOut(product, s, c.id));
      return <button type="button" key={c.id} className={`color-swatch${none ? " is-soldout" : ""}`} aria-pressed={color === c.id} aria-label={`${bn ? c.bn : c.name}${none ? (bn ? " (স্টক শেষ)" : " (sold out)") : ""}`} title={bn ? c.bn : c.name} onClick={() => pickColor(c.id)}><span style={{ background: c.hex }} /></button>; })}</fieldset>}
    <fieldset className="size-selector"><legend>{product.sizes.length === 1 ? (bn ? "অপশন" : "Option") : (bn ? "নমুনা সাইজ বেছে নিন" : "Choose a sample size")}</legend>{product.sizes.map(option => { const out = variantSoldOut(product, option, color); return <button type="button" aria-pressed={size === option} key={option} className={out ? "is-soldout" : ""} aria-label={out ? `${option} ${bn ? "(স্টক শেষ)" : "(sold out)"}` : undefined} onClick={() => setSize(option)}>{option}</button>; })}</fieldset>{soldOut && product.inStock !== false && <p className="variant-soldout" role="status">{bn ? "এই রং/সাইজটি এখন স্টকে নেই। অন্যটি বেছে নিন বা আবার কবে আসবে জানতে চান।" : "This colour/size is sold out. Pick another, or ask when it’s back."}</p>}<div className="contact-actions"><button type="button" className={`button brand-button add-to-bag${added ? " is-added" : ""}`} disabled={soldOut} onClick={() => { addToCart(product.slug, size, color); track("AddToCart", { content_ids: [product.slug], content_type: "product", value: product.price }); setAdded(true); window.setTimeout(() => setAdded(false), 1800); window.dispatchEvent(new Event("oanro-open-bag")); }}>{added ? <Check size={18} className="added-tick" /> : <ShoppingBag size={18} />}{soldOut ? (bn ? "স্টক শেষ" : "Out of stock") : added ? (bn ? "যোগ হয়েছে" : "Added") : bn ? "ব্যাগে যোগ করুন" : "Add to bag"}</button>{waOrder && !soldOut && <a className="button light-button wa-order" href={`https://wa.me/${contact.whatsapp}?text=${waText()}`} target="_blank" rel="noopener noreferrer" onClick={() => track("Lead", { content_ids: [product.slug], value: product.price })}><MessageCircle size={18} aria-hidden="true" />{bn ? "WhatsApp-এ অর্ডার" : "Order on WhatsApp"}</a>}<FormPopup label={soldOut ? (bn ? "আবার কবে আসবে জানতে চান" : "Ask when it's back") : bn ? "জিজ্ঞাসা করুন" : "Ask about this product"} dialogLabel={bn ? "ইনকোয়ারি পাঠান" : "Send an inquiry"}><InquiryForm kind={soldOut ? "restock" : "product"} productSlug={product.slug} productName={name} size={product.sizes.length > 1 || picked ? [picked?.name, size].filter(Boolean).join(" / ").slice(0, 20) : undefined} /></FormPopup></div><BuyBox product={product} rules={rules} soldOut={soldOut} /><SizeGuide product={product} /><p className="small-note">{bn ? "এটি একটি পাবলিক প্রিভিউ। সিদ্ধান্ত নেওয়ার আগে পণ্যের প্রাপ্যতা, চূড়ান্ত মূল্য ও ডেলিভারি সম্পর্কে জেনে নিন।" : "This is a public preview. Ask us about availability, final price and delivery before making a decision."}</p><dl className="specifications">{specs.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Link className="text-link" href="/#contact">{bn ? "সব যোগাযোগের অপশন দেখুন" : "See all contact options"}<ArrowUpRight size={16} /></Link></div></div>
    <CompleteLook product={product} others={related?.others ?? []} onAdd={items => { items.forEach(p => addToCart(p.slug, p.sizes[0], p.colors?.[0]?.id ?? "")); window.dispatchEvent(new Event("oanro-open-bag")); }} />
    <section className="detail-story section-space"><p className="eyebrow">{bn ? "আরও একটু জানুন" : "A little more context"}</p><h2>{knit ? (bn ? "কাছ থেকে দেখুন, ভাবনাটা অনুভব করুন।" : "Look closer. Feel the idea.") : bn ? "প্রথম দেখার চেয়েও বেশি।" : "More than a first impression."}</h2><p>{bn ? "এটি একটি প্রাথমিক কালেকশন কনসেপ্ট। অর্ডার চালুর আগে যাচাই করা উপাদান, সাইজ, প্রযোজ্য ক্ষেত্রে ওয়ারেন্টি, ডেলিভারি চার্জ ও প্রাপ্যতার তথ্য যোগ করা হবে।" : "This is an early collection concept. Verified materials, sizing, warranty information where applicable, delivery charges, and availability will be added before orders open."}</p></section>{related && <RelatedProducts {...related} />}</div><StickyBuy product={product} soldOut={soldOut} /></main>;
}
