import { recordView } from "@/lib/product-views";
import { slugPattern } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
import { underLimit } from "@/lib/rate-limit";
export const runtime = "nodejs";
// Counts a product page view. Same-site only, tiny body, no cookies or personal data read or stored.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!process.env.DATABASE_URL || (origin && process.env.BETTER_AUTH_URL && origin !== new URL(process.env.BETTER_AUTH_URL).origin)) return new Response(null, { status: 204 });
  if (/bot|crawl|spider|preview|facebookexternalhit/i.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  try {
    const text = await request.text(); if (text.length > 200) return new Response(null, { status: 204 });
    const { slug } = JSON.parse(text) as { slug?: unknown };
    // At most 60 counted views per visitor per 10 minutes, so one script cannot push a product up the "popular" list.
    // Over the limit we simply stop counting; the answer stays the same 204.
    if (typeof slug === "string" && slug.length <= 60 && slugPattern.test(slug) && await underLimit(catalogDb(), request, "view", 60, 10 * 60_000)) await recordView(catalogDb(), slug);
  } catch { /* counting must never break a page */ }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
