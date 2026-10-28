import { subscribe } from "@/lib/marketing";
import { catalogDb } from "@/lib/store-products";
import { underLimit } from "@/lib/rate-limit";
import { originMatchesHost } from "@/lib/same-host";
export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

/** Footer sign-up: { email, locale, consent: true }. Same-site only, at most 5 sign-ups per visitor per hour. */
export async function POST(request: Request) {
  if (!originMatchesHost(request)) return Response.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403, headers: noStore });
  const data = await request.json().catch(() => ({})) as { email?: unknown; locale?: unknown; consent?: unknown; website?: unknown };
  // "website" is a hidden field only bots fill in.
  if (data.website) return Response.json({ ok: true }, { headers: noStore });
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  if (data.consent !== true || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "INVALID" }, { status: 400, headers: noStore });
  if (!process.env.DATABASE_URL) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  if (!(await underLimit(catalogDb(), request, "newsletter", 5, 60 * 60_000))) return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: noStore });
  try { return Response.json({ result: await subscribe(catalogDb(), email, data.locale === "bn" ? "bn" : "en") }, { headers: noStore }); }
  catch { return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore }); }
}
