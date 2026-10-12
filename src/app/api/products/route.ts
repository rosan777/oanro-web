import { products } from "@/lib/catalog";
import { getSiteConfig } from "@/lib/site-config";
export function GET(request: Request) { const query = (new URL(request.url).searchParams.get("q") || "").slice(0, 120).toLowerCase().trim(); const items = getSiteConfig().products ? products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query)) : []; return Response.json({ demo: true, products: items }, { headers: { "Cache-Control": "no-store" } }); }
