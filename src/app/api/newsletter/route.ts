import { subscribe } from "@/lib/marketing";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Footer sign-up: { email, locale, consent: true }. */
export async function POST(request: Request) {
  const data = await request.json().catch(() => ({})) as { email?: unknown; locale?: unknown; consent?: unknown; website?: unknown };
  // "website" is a hidden field only bots fill in.
  if (data.website) return Response.json({ ok: true }, { headers: noStore });
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (data.consent !== true || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "INVALID" }, { status: 400, headers: noStore });
  if (!process.env.DATABASE_URL) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  try { return Response.json({ result: await subscribe(catalogDb(), email, data.locale === "bn" ? "bn" : "en") }, { headers: noStore }); }
  catch { return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore }); }
}
