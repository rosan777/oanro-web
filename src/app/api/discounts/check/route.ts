import { previewDiscount } from "@/lib/discount-store";
import { ProductInputError } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Checkout preview: is this code usable for this subtotal, and how much does it take off? The order itself re-checks. */
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({})) as { code?: unknown; subtotal?: unknown };
  if (!process.env.DATABASE_URL || !Number.isInteger(data.subtotal) || (data.subtotal as number) < 0) return Response.json({ error: "INVALID" }, { status: 400, headers: noStore });
  try {
    const r = await previewDiscount(catalogDb(), data.code, data.subtotal as number);
    return Response.json("error" in r ? { error: r.error, ...("min" in r ? { min: r.min } : {}) } : { code: r.code, amount: r.amount }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID" }, { headers: noStore });
    return Response.json({ error: "INVALID" }, { status: 503, headers: noStore });
  }
}
