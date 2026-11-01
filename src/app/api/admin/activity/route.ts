import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { deleteAuditEntries } from "@/lib/audit-store";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Owner only. Delete one entry ({ id }) or the whole log ({ all: true, confirm: "DELETE" }). The deletion itself is logged. */
export const DELETE = adminHandler("audit.read", async (actor, data, access) => {
  if (!access.owner) throw new ProductStoreError("OWNER_ONLY");
  if (data.all === true) {
    if (data.confirm !== "DELETE")
      return Response.json({ error: "CONFIRM_REQUIRED" }, { status: 400, headers: noStore });
    const removed = await deleteAuditEntries(catalogDb(), actor, null);
    return Response.json({ removed }, { headers: noStore });
  }
  const removed = await deleteAuditEntries(catalogDb(), actor, requireUuid(data.id));
  return Response.json({ removed }, { headers: noStore });
});
