import { hasDatabase, json, limit, publicConfig } from "@/lib/assistant/server";
import { resolvePlace, validZone, weatherFor } from "@/lib/assistant/weather";
import { siteUrl } from "@/lib/site-url";
export const runtime = "nodejs";

/** Local weather for the assistant header (decoration and a friendly touch; never used for anything else). */
export async function GET(request: Request) {
  // A plain same-origin GET carries no Origin header, so cross-site callers are refused by Fetch Metadata instead.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  const config = await publicConfig();
  if (!config.enabled || !hasDatabase()) return json({ error: "ASSISTANT_OFF" }, 403);
  const tz = new URL(request.url).searchParams.get("tz") ?? "";
  if (!validZone(tz)) return json({ error: "INVALID_INPUT" }, 400);
  try {
    const r = await limit(request, "weather", 30, 10 * 60_000);
    if (!r.ok) return json({ error: "RATE_LIMITED", retryAfter: r.retryAfter }, 429, { "Retry-After": String(r.retryAfter) });
  } catch { return json({ weather: null }); } // limiter unavailable: no weather rather than an unguarded proxy
  const place = resolvePlace(tz, request.headers, process.env.VERCEL === "1");
  if (!place) return json({ weather: null });
  try {
    const weather = await weatherFor(place, `(+${siteUrl()})`);
    return json({ weather, credit: "Data from MET Norway" }, 200, { "Cache-Control": "private, max-age=900" });
  } catch { return json({ weather: null }); }
}
