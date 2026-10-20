import { authConfigured, getAuth } from "@/lib/auth";
import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { deleteCustomer } from "@/lib/customer-store";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
/** A signed-in customer deletes their own account (must type DELETE). Staff and the owner can't delete here. */
export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "SIGN_IN_REQUIRED" }, { status: 401, headers: noStore });
  try {
    const data = await readObject(request, 2000);
    if (data.confirm !== "DELETE") return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
    await deleteCustomer(catalogDb(), session.user.id, { actorId: session.user.id, self: true });
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProductStoreError) {
      if (error.message === "NOT_FOUND") return Response.json({ error: "STAFF_ACCOUNT" }, { status: 403, headers: noStore });
      if (error.message.startsWith("ACTIVE_ORDERS:")) return Response.json({ error: "ACTIVE_ORDERS", orders: error.message.slice(14).split(",") }, { status: 409, headers: noStore });
    }
    return Response.json({ error: "DELETE_FAILED" }, { status: 503, headers: noStore });
  }
}
