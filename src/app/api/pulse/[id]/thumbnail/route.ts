import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pulseStory } from "@/lib/db/schema";
import { imageData } from "@/lib/pulse-thumbnail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  if (!/^[0-9a-f-]{36}$/.test(id) || !process.env.DATABASE_URL) return new Response(null, { status: 404, headers });
  try {
    const [story] = await getDb().select({ image: pulseStory.thumbnailUrl }).from(pulseStory)
      .where(and(eq(pulseStory.id, id), eq(pulseStory.visible, true), eq(pulseStory.rightsConfirmed, true))).limit(1);
    const match = story?.image?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
    if (!match) return new Response(null, { status: 404, headers });
    const bytes = Buffer.from(match[2], "base64"); imageData(bytes, match[1]);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": match[1], "Content-Length": String(bytes.length) } });
  } catch { return new Response(null, { status: 404, headers }); }
}
