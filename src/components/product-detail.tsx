"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, ArrowUpRight, Check, ShoppingBag } from "lucide-react";
import { type Product, formatPrice } from "@/lib/catalog";
import { addToCart } from "@/lib/cart";
import { ProductPhoto } from "./shell";
const Scene = dynamic(() => import("./scene"), { ssr: false, loading: () => <div className="scene-loading">Loading 3D concept...</div> });

export default function ProductDetail({ product }: { product: Product }) {
  const knit = product.slug === "forest-knit"; const headphones = product.slug === "studio-headphones";
  const views = ["Product", ...(knit ? ["Texture", "On a model", "Film"] : ["Close-up"]), ...(headphones ? ["3D view"] : [])];
  const [view, setView] = useState("Product"); const [size, setSize] = useState(product.sizes[0]); const [added, setAdded] = useState(false);
  return <main id="main-content" className="product-page"><div className="container"><Link className="back-link" href="/#products"><ArrowLeft size={16} />Back to the collection</Link><div className="product-detail-grid"><div className="product-gallery"><div className={`gallery-stage ${view === "Close-up" ? "zoomed" : ""}`}>
    {view === "3D view" ? <Scene /> : view === "Film" ? <video key={view} controls playsInline preload="metadata" poster="/images/campaign.png" aria-label="Animated still-image study of the sample knitwear campaign"><source src="/media/knit-study.webm" type="video/webm" /><source src="/media/knit-study.mp4" type="video/mp4" />Your browser does not support this video.</video> : view === "Texture" || view === "On a model" ? <Image src={view === "Texture" ? "/images/fabric.png" : "/images/campaign.png"} alt={view === "Texture" ? "Generated sample knit texture close-up" : "Generated model wearing the sample green sweater"} fill sizes="(max-width: 767px) 100vw, 60vw" style={{ objectFit: "cover", objectPosition: view === "On a model" ? "75% center" : "center" }} /> : <ProductPhoto position={product.position} label={`Generated sample ${product.name}`} />}
    </div><div className="gallery-tabs" role="group" aria-label="Product media">{views.map(label => <button type="button" key={label} aria-pressed={view === label} onClick={() => setView(label)}>{label}</button>)}</div><p className="small-note">{view === "Film" ? "Motion study made from an AI-generated still image, not real product footage." : view === "3D view" ? "Illustrative 3D concept. It is not an exact model of a manufactured product." : "AI-generated sample imagery. Actual products may differ."}</p></div>
    <div className="product-information"><p className="eyebrow">{product.category}</p><h1>{product.name}</h1><p className="product-tagline">{product.tagline}</p><p>{product.description}</p><div className="demo-price"><strong>{formatPrice(product.price)}</strong><span>Sample price / design preview</span></div><fieldset className="size-selector"><legend>{product.sizes.length === 1 ? "Option" : "Choose a sample size"}</legend>{product.sizes.map(option => <button type="button" aria-pressed={size === option} key={option} onClick={() => { setSize(option); setAdded(false); }}>{option}</button>)}</fieldset><button type="button" className="button brand-button add-bag" onClick={() => { addToCart(product.slug, size); setAdded(true); }}>{added ? <Check size={18} /> : <ShoppingBag size={18} />}{added ? "Added to demo bag" : "Add to demo bag"}</button><p className="small-note" role="status">{added ? "Your selection is in the bag. Open the bag icon to review it." : "Preview only. No purchase or payment is made."}</p><dl className="specifications">{product.specs.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><Link className="text-link" href="/#contact">Ask OANRO a question<ArrowUpRight size={16} /></Link></div></div>
    <section className="detail-story section-space"><p className="eyebrow">A little more context</p><h2>{knit ? "Look closer. Feel the idea." : "More than a first impression."}</h2><p>This is an early collection concept. Verified materials, sizing, warranty information where applicable, delivery charges, and availability will be added before orders open.</p></section></div></main>;
}
