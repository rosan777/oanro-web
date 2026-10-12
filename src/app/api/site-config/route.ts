import { getSiteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export function GET() { return Response.json(getSiteConfig(), { headers: { "Cache-Control": "no-store" } }); }
