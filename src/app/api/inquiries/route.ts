import { readObject } from "@/lib/pulse-thumbnail";
import { parseLeadInput, ProductInputError } from "@/lib/product-input";
import { createLead, hashIp } from "@/lib/lead-store";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { originMatchesHost } from "@/lib/same-host";
import { appSecret } from "@/lib/app-secret";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };
// Public inquiry endpoint: same-origin only, small body, hidden honeypot field, per-visitor hourly limit.
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  if (!originMatchesHost(request)) return Response.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403, headers: noStore });
  let data: Record<string, unknown>;
  try { data = await readObject(request, 8000); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore }); }
  if (typeof data.website === "string" && data.website) return Response.json({ ok: true }, { headers: noStore }); // bot filled the honeypot
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  try {
    await createLead(catalogDb(), parseLeadInput(data), ip ? hashIp(ip, appSecret("oanro")) : null);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
    if (error instanceof ProductStoreError && error.message === "RATE_LIMITED") return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: noStore });
    if (error instanceof ProductStoreError) return Response.json({ error: error.message }, { status: 400, headers: noStore });
    return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  }
}
