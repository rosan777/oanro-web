import { adminHandler, noStore } from "@/lib/admin-api";
import { deleteCustomer } from "@/lib/customer-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
/** Delete a customer account (personal data erased, orders kept anonymized). Needs "Delete customer accounts". */
export const DELETE = adminHandler("customers.delete", async (actorId, data) => {
  const id = typeof data.id === "string" ? data.id : "";
  if (!id || id.length > 100 || data.confirm !== "DELETE") return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
  if (id === actorId) return Response.json({ error: "NOT_ALLOWED" }, { status: 403, headers: noStore });
  await deleteCustomer(catalogDb(), id, { actorId, self: false, reason: typeof data.reason === "string" ? data.reason : undefined });
  return Response.json({ ok: true }, { headers: noStore });
});
