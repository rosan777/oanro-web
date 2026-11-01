import { getSiteConfig } from "@/lib/site-config";
import { getStoreProducts } from "@/lib/store-products";
export const runtime = "nodejs";

/** Public product list, optionally filtered by ?q= (name, category or Bangla name contains the text). */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") || "")
    .slice(0, 120)
    .toLowerCase()
    .trim();
  const items = getSiteConfig().products
    ? (await getStoreProducts()).filter(p =>
        `${p.name} ${p.category} ${p.bn?.name ?? ""}`.toLowerCase().includes(query),
      )
    : [];
  return Response.json({ products: items }, { headers: { "Cache-Control": "no-store" } });
}
