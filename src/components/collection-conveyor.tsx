"use client";
import Link from "@/components/locale-link";
import { ArrowUpRight, AudioLines, CircleHelp, Headphones, Monitor, Package } from "lucide-react";
import type { Product, StoreCollection } from "@/lib/catalog";
import { Conveyor } from "./home-experience";
import { FlipPanel } from "./flip-panel";
import { ProductPhoto } from "./shell";
import { useProducts } from "./products-context";
import { useLocale } from "./locale";

const capIdeas = [["Baseball caps", "বেসবল ক্যাপ"], ["Snapback caps", "স্ন্যাপব্যাক ক্যাপ"], ["Sports caps", "স্পোর্টস ক্যাপ"], ["Winter caps", "শীতের ক্যাপ"], ["Custom caps", "কাস্টম ক্যাপ"]];
const techIdeas = [["Digital watches", "ডিজিটাল ঘড়ি"], ["Speakers", "স্পিকার"], ["Computer mice", "কম্পিউটার মাউস"], ["Keyboards", "কিবোর্ড"]];

export function ProductCard({ product, index, duplicate }: { product: Product; index: number; duplicate: boolean }) {
  const { locale } = useLocale(); const bn = locale === "bn" && product.bn;
  const name = bn ? product.bn!.name : product.name, tagline = bn ? product.bn!.tagline : product.tagline, category = bn ? product.bn!.category : product.category;
  const out = product.inStock === false;
  return <Link className={`conveyor-card product-card${out ? " is-out-of-stock" : ""}`} tabIndex={duplicate ? -1 : undefined} href={`/products/${product.slug}`}>
    <div className="product-card-media"><FlipPanel title={name} detail={tagline} index={index}><ProductPhoto position={product.position} image={product.image} label={name} />
      {out ? <span className="sample-badge stock-badge">{locale === "bn" ? "স্টক শেষ" : "Out of stock"}</span> : !product.image && <span className="sample-badge">{locale === "bn" ? "নমুনা কালেকশন" : "Sample collection"}</span>}
      <span className="card-arrow"><ArrowUpRight size={21} /></span></FlipPanel></div>
    <div className="card-copy"><small>{category}</small><h3>{name}</h3><p>{tagline}</p></div>
  </Link>;
}
/** One storefront section: its published products, or placeholder ideas for an empty Caps/Tech section. */
export function CollectionConveyor({ collection }: { collection: StoreCollection }) {
  const { locale } = useLocale(); const bn = locale === "bn" && collection.bn;
  const items = useProducts().filter(p => (p.collectionId ?? "seasonal") === collection.id);
  const ideas = collection.preset === "caps" ? capIdeas : collection.preset === "tech" ? techIdeas : [];
  if (!items.length && !ideas.length) return null;
  return <Conveyor id={collection.anchor} eyebrow={bn ? collection.bn!.name : collection.name} title={<Link href={`/${collection.slug}`} className="conveyor-title-link">{bn ? collection.bn!.headline : collection.headline}</Link>} description={bn ? collection.bn!.description : collection.description}>
    {duplicate => items.length ? items.map((product, index) => <ProductCard key={product.slug} product={product} index={index} duplicate={duplicate} />)
      : ideas.map(([ideaEn, ideaBn], index) => {
        const Icon = collection.preset === "caps" ? Package : [Monitor, AudioLines, CircleHelp, Headphones][index];
        const t = (en: string, b: string) => locale === "bn" ? b : en;
        return <article key={ideaEn} className="conveyor-card collection-idea"><div className="collection-idea-visual"><Icon size={58} strokeWidth={1.25} aria-hidden="true" /><span>{t("Collection concept", "কালেকশন কনসেপ্ট")}</span></div><div className="card-copy"><small>{collection.preset === "caps" ? t("Cap style", "ক্যাপ স্টাইল") : t("Tech category", "টেক ক্যাটাগরি")}</small><h3>{t(ideaEn, ideaBn)}</h3><p>{t("Products and availability to be confirmed.", "পণ্য ও প্রাপ্যতা শীঘ্রই নিশ্চিত করা হবে।")}</p></div></article>;
      })}
  </Conveyor>;
}
