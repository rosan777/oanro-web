import { getStoreProducts } from "@/lib/store-products";
import { getSiteConfig } from "@/lib/site-config";
import { getSiteContent } from "@/lib/site-content";
import { absoluteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[<>&'"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
/**
 * Google Merchant Center product feed (free listings in Google Shopping). Add this URL in Merchant Center as a scheduled feed.
 * Only real photos are listed (Google rejects products without one). Switch it off in Admin → Website content → Sections.
 */
export async function GET() {
  const content = await getSiteContent();
  if (!content.features.merchantFeed || !getSiteConfig().products) return new Response("Not found", { status: 404 });
  const products = (await getStoreProducts()).filter(p => p.image);
  const items = products.map(p => {
    const sale = p.compareAt && p.compareAt > p.price;
    return `<item>
<g:id>${esc(p.slug)}</g:id><g:title>${esc(p.name)}</g:title><g:description>${esc((p.description || p.tagline || p.name).slice(0, 4900))}</g:description>
<g:link>${esc(absoluteUrl(`/products/${p.slug}`))}</g:link><g:image_link>${esc(absoluteUrl(p.image!))}</g:image_link>
<g:availability>${p.inStock === false ? "out_of_stock" : "in_stock"}</g:availability>
<g:price>${(sale ? p.compareAt! : p.price).toFixed(2)} BDT</g:price>${sale ? `<g:sale_price>${p.price.toFixed(2)} BDT</g:sale_price>` : ""}
<g:brand>OANRO</g:brand><g:condition>new</g:condition><g:identifier_exists>no</g:identifier_exists>${p.category ? `<g:product_type>${esc(p.category)}</g:product_type>` : ""}
</item>`; }).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>OANRO</title><link>${esc(absoluteUrl("/"))}</link><description>OANRO products</description>\n${items}\n</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });
}
