import { authConfigured, getAuth } from "@/lib/auth";
import { claimInvite, getAccess } from "@/lib/rbac";
import { orderScreenshot } from "@/lib/order-store";
import { imageData } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Payment screenshot for staff with orders.read. GET (used by <img>), so no Origin check; the session cookie is SameSite. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" };
  const { id } = await context.params;
  if (!authConfigured() || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404, headers });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return new Response(null, { status: 404, headers });
  const db = catalogDb();
  await claimInvite(db, session.user);
  const access = await getAccess(db, session.user.id);
  if (!access.permissions.has("orders.read")) return new Response(null, { status: 404, headers });
  const match = (await orderScreenshot(db, id, access.permissions.has("cod.manage")))?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/);
  if (!match) return new Response(null, { status: 404, headers });
  const bytes = Buffer.from(match[2], "base64"); imageData(bytes, match[1]);
  return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": match[1], "Content-Length": String(bytes.length) } });
}
