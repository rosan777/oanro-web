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
    return Response.json(order, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
    if (error instanceof ProductStoreError) {
      const [kind, slug, available] = error.message.split(":");
      return Response.json({ error: kind, slug, ...(available !== undefined && /^\d+$/.test(available) ? { available: Number(available) } : {}) }, { status: 409, headers: noStore });
    }
    if (error instanceof Error && error.message === "INVALID_IMAGE") return Response.json({ error: "INVALID_INPUT", field: "screenshot" }, { status: 400, headers: noStore });
    return Response.json({ error: "ORDER_FAILED" }, { status: 503, headers: noStore });
  }
}
