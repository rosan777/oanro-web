"use client";
import type { StoreCampaign } from "@/lib/catalog";
import { formatDhaka } from "@/lib/dhaka-time";
import { Conveyor } from "./home-experience";
import { ProductCard } from "./collection-conveyor";
import { useProducts } from "./products-context";
import { useLocale } from "./locale";

/** A running seasonal campaign: banner plus its attached products (only those currently visible in the store). */
export function CampaignShowcase({ campaign }: { campaign: StoreCampaign }) {
  const { locale } = useLocale(); const bn = locale === "bn" && campaign.bn;
  const all = useProducts();
  const items = campaign.productSlugs.flatMap(slug => all.filter(p => p.slug === slug));
  const name = bn ? campaign.bn!.name : campaign.name, headline = bn ? campaign.bn!.headline : campaign.headline, description = bn ? campaign.bn!.description : campaign.description;
  const ends = campaign.endsAt ? (locale === "bn" ? `শেষ হবে ${formatDhaka(campaign.endsAt, "bn")}` : `Ends ${formatDhaka(campaign.endsAt)}`) : null;
  return <section className="campaign-showcase" aria-label={name}>
    <div className={`campaign-banner${campaign.image ? " has-photo" : ""}`} style={campaign.image?.startsWith("/api/campaigns/") ? { backgroundImage: `linear-gradient(90deg, #000c 0%, #0006 55%, #0000 100%), url("${campaign.image}")` } : undefined}>
      <div className="container campaign-banner-copy"><p className="eyebrow">{name}</p><h2>{headline || name}</h2>{description && <p>{description}</p>}{ends && <span className="campaign-ends">{ends}</span>}</div>
    </div>
    {items.length > 0 && <Conveyor id={`campaign-${campaign.slug}`} eyebrow={name} title={locale === "bn" ? "এই ক্যাম্পেইনের পণ্য" : "In this campaign"} description="">
      {duplicate => items.map((product, index) => <ProductCard key={product.slug} product={product} index={index} duplicate={duplicate} />)}
    </Conveyor>}
  </section>;
}
