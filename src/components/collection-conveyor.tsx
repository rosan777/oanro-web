"use client";
import Link from "next/link";
import { ArrowUpRight, AudioLines, CircleHelp, Headphones, Monitor, Package } from "lucide-react";
import { products } from "@/lib/catalog";
import { Conveyor } from "./home-experience";
import { ProductPhoto } from "./shell";

type Collection = "caps" | "tech";
const capIdeas = ["Baseball caps", "Snapback caps", "Sports caps", "Winter caps", "Custom caps"];
const techIdeas = ["Digital watches", "Speakers", "Computer mice", "Keyboards"];

export function CollectionConveyor({ collection }: { collection: Collection }) {
  const caps = collection === "caps";
  const ideas = caps ? capIdeas : techIdeas;
  const headphone = products.find(item => item.slug === "studio-headphones");
  return <Conveyor id={caps ? "caps" : "tech-items"} eyebrow={caps ? "Caps collection" : "Tech items"} title={caps ? "Find your fit." : "Everyday technology."} description={caps ? "Cap styles we're exploring. Product details and availability will appear when confirmed." : "A preview of technology categories. Products will appear as they are confirmed."}>
    {duplicate => <>
      {!caps && headphone && <Link className="conveyor-card product-card" key={headphone.slug} href={`/products/${headphone.slug}`} tabIndex={duplicate ? -1 : undefined}>
        <div className="product-card-media"><ProductPhoto position={headphone.position} label={headphone.name} /><span className="sample-badge">Sample concept</span><span className="card-arrow"><ArrowUpRight size={20} /></span></div>
        <div className="card-copy"><small>Existing sample catalog</small><h3>{headphone.name}</h3><p>{headphone.tagline}</p></div>
      </Link>}
      {ideas.map((idea, index) => {
        const Icon = caps ? Package : [Monitor, AudioLines, CircleHelp, Headphones][index];
        return <article key={idea} className="conveyor-card collection-idea"><div className="collection-idea-visual"><Icon size={58} strokeWidth={1.25} aria-hidden="true" /><span>Collection concept</span></div><div className="card-copy"><small>{caps ? "Cap style" : "Tech category"}</small><h3>{idea}</h3><p>Products and availability to be confirmed.</p></div></article>;
      })}
    </>}
  </Conveyor>;
}
