import { ProductInputError } from "@/lib/product-input";
import { normalizePhone } from "@/lib/order-input";
import { trackOrder } from "@/lib/order-store";
import { hasDatabase, json, publicConfig, sameOrigin, visitorKey } from "@/lib/assistant/server";
import { trackGate } from "@/lib/assistant/tracking";
import { trackedView } from "@/lib/assistant/tools";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/**
 * Secure tracking form. The order code and phone go straight from the form to this endpoint: they are not model arguments,
 * not chat history and not logged. Same proof as the Track page (code + phone), generic failure, minimal status back.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  const config = await publicConfig();
  if (!config.enabled || !config.tracking || !hasDatabase()) return json({ error: "TRACKING_OFF" }, 403);
  let data: Record<string, unknown>;
  try { data = await readObject(request, 1000); } catch { return json({ error: "INVALID_INPUT" }, 400); }
  const notFound = () => json({ error: "NOT_FOUND" }, 404);
  if (typeof data.code !== "string" || data.code.length > 30) return notFound();
  let phone: string; try { phone = normalizePhone(data.phone, "phone"); } catch (e) { if (e instanceof ProductInputError) return notFound(); throw e; }
  const db = catalogDb();
  try {
    const gate = await trackGate(db, visitorKey(request), data.code);
    if (!gate.ok) return json({ error: "RATE_LIMITED", retryAfter: gate.retryAfter }, 429, { "Retry-After": String(gate.retryAfter) });
  } catch { return json({ error: "UNAVAILABLE" }, 503); }
  await new Promise(r => setTimeout(r, 400)); // same small delay as the Track page
  const order = await trackOrder(db, data.code, phone).catch(() => null);
  return order ? json({ order: trackedView(order) }) : notFound();
}
