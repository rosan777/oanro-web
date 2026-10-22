import { normalizePhone } from "@/lib/order-input";
import { trackOrder } from "@/lib/order-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Public order tracking: { code, phone } → the order timeline, or NOT_FOUND (same answer for a wrong code or phone). */
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({})) as { code?: unknown; phone?: unknown };
  let phone = "";
  try { phone = normalizePhone(data.phone, "phone"); } catch { return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore }); }
  if (typeof data.code !== "string" || !process.env.DATABASE_URL) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  // A small fixed delay makes guessing many codes slow.
  await new Promise(r => setTimeout(r, 400));
  const order = await trackOrder(catalogDb(), data.code, phone).catch(() => null);
  return order ? Response.json({ order }, { headers: noStore }) : Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
}
