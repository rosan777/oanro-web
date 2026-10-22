import { authConfigured, getAuth } from "@/lib/auth";
import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { validateUploadedImage } from "@/lib/pulse-upload";
import { parseOrderInput } from "@/lib/order-input";
import { createOrder } from "@/lib/order-store";
import { ProductInputError } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { storefrontChanged } from "@/lib/storefront-cache";
import { after } from "next/server";
import { notifyNewOrder } from "@/lib/order-notify";
import { sendPurchase } from "@/lib/meta-capi";
import { getSiteContent } from "@/lib/site-content";
import { eq } from "drizzle-orm";
import { shopOrder } from "@/lib/db/schema";
export const runtime = "nodejs";

/** Place an order. Requires a signed-in customer with a verified email, from this site only. */
export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "SIGN_IN_REQUIRED" }, { status: 401, headers: noStore });
  if (!session.user.emailVerified) return Response.json({ error: "EMAIL_NOT_VERIFIED" }, { status: 403, headers: noStore });
  try {
    const data = await readObject(request, 400000);
    const input = parseOrderInput(data);
    const screenshot = data.screenshot == null || data.screenshot === "" ? null : validateUploadedImage(data.screenshot);
    const order = await createOrder(catalogDb(), { id: session.user.id }, input, screenshot);
    storefrontChanged(); // stock went down; refresh "out of stock" badges for shoppers
    // Email the owner and payment approvers after the response is sent (never delays or breaks the order).
    after(() => notifyNewOrder(catalogDb(), order.id).catch(() => {}));
    // Meta Conversions API, only with the shopper's Analytics permission and when the owner switched the Pixel on.
    if (data.adConsent === true && process.env.META_CAPI_TOKEN) {
      const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim(), userAgent = request.headers.get("user-agent") ?? "", url = request.headers.get("referer") ?? "";
      after(async () => {
        const content = await getSiteContent(); if (!content.features.metaPixel || !content.contact.pixelId) return;
        const [row] = await catalogDb().select({ total: shopOrder.total, codDue: shopOrder.codDue }).from(shopOrder).where(eq(shopOrder.id, order.id)).limit(1);
        await sendPurchase({ pixelId: content.contact.pixelId, eventId: order.code, value: (row?.total ?? 0) + (row?.codDue ?? 0), email: session.user.email, phone: input.phone, ip, userAgent, url, slugs: input.items.map(i => i.slug) });
      });
    }
    return Response.json(order, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
    if (error instanceof ProductStoreError) {
      const [kind, slug, available, color, size] = error.message.split(":");
      return Response.json({ error: kind, slug, ...(available !== undefined && /^\d+$/.test(available) ? { available: Number(available) } : {}), ...(size !== undefined ? { color, size: decodeURIComponent(size) } : {}) }, { status: 409, headers: noStore });
    }
    if (error instanceof Error && error.message === "INVALID_IMAGE") return Response.json({ error: "INVALID_INPUT", field: "screenshot" }, { status: 400, headers: noStore });
    return Response.json({ error: "ORDER_FAILED" }, { status: 503, headers: noStore });
  }
}
