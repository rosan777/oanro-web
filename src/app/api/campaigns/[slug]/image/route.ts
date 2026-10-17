import { activeCampaignImage } from "@/lib/campaign-store";
import { catalogDb } from "@/lib/store-products";
import { imageData } from "@/lib/pulse-thumbnail";
import { slugPattern } from "@/lib/product-input";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Serves owner-uploaded photos for running campaigns only. URLs carry ?v=<updatedAt> so caching is safe.
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const headers = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  if (!slugPattern.test(slug) || slug.length > 60 || !process.env.DATABASE_URL) return new Response(null, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } });
  try {
    const match = (await activeCampaignImage(catalogDb(), slug))?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
    if (!match) return new Response(null, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } });
    const bytes = Buffer.from(match[2], "base64"); imageData(bytes, match[1]);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": match[1], "Content-Length": String(bytes.length), "Cache-Control": "public, max-age=300" } });
  } catch { return new Response(null, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } }); }
}
