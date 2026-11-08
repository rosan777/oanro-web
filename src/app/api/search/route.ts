import { siteSearch } from "@/lib/site-search";
import { underLimit } from "@/lib/rate-limit";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Live search for the header tray: published content only, at most 5 hits (or `limit` up to 50). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 5));
  if (process.env.DATABASE_URL && !(await underLimit(catalogDb(), request, "search", 240, 60_000)))
    return Response.json(
      { error: "RATE_LIMITED" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  try {
    const result = await siteSearch(
      q,
      url.searchParams.get("locale") === "bn" ? "bn" : "en",
      limit,
    );
    return Response.json(result, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch {
    return Response.json(
      { error: "UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
