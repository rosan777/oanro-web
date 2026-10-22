import { isMediaKey, readMedia } from "@/lib/site-media";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: an owner-uploaded menu or share image. URLs carry ?v=<version>, so they can be cached for a long time. */
export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const headers = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  const none = () => new Response(null, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } });
  if (!isMediaKey(key) || !process.env.DATABASE_URL) return none();
  try {
    const match = (await readMedia(catalogDb(), key))?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
    if (!match) return none();
    const bytes = Buffer.from(match[2], "base64");
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": match[1], "Content-Length": String(bytes.length), "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return none(); }
}
