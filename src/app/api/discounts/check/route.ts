import { previewDiscount } from "@/lib/discount-store";
import { ProductInputError } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Checkout preview: is this code usable for this subtotal, and how much does it take off? The order itself re-checks. */
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({})) as { code?: unknown; items?: unknown };
  const items = Array.isArray(data.items) ? data.items.slice(0, 50).flatMap((i: { slug?: unknown; quantity?: unknown }) => typeof i?.slug === "string" && Number.isInteger(i.quantity) && (i.quantity as number) > 0 && (i.quantity as number) <= 99 ? [{ slug: i.slug, quantity: i.quantity as number }] : []) : [];
  if (!process.env.DATABASE_URL || !items.length) return Response.json({ error: "INVALID" }, { status: 400, headers: noStore });
  try {
    const r = await previewDiscount(catalogDb(), data.code, items);
    return Response.json("error" in r ? { error: r.error, ...("min" in r ? { min: r.min } : {}) } : { code: r.code, amount: r.amount }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID" }, { headers: noStore });
    return Response.json({ error: "INVALID" }, { status: 503, headers: noStore });
  }
}
