import { getSiteConfig } from "@/lib/site-config";
export const dynamic = "force-dynamic";

/** Public display settings (which parts of the site are on, contact links); never secrets. */
export function GET() {
  return Response.json(getSiteConfig(), { headers: { "Cache-Control": "no-store" } });
}
