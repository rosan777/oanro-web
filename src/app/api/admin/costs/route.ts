import { eq } from "drizzle-orm";
import { adminHandler, noStore } from "@/lib/admin-api";
import { product } from "@/lib/db/schema";
import { ProductInputError, slugPattern } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { listProductCosts, parseMoney, setPaymentFee, setProductCost } from "@/lib/report-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Set one product's cost price ({ slug, costPrice }; blank clears it). Requires "Cost prices" access. */
export const PATCH = adminHandler("costs.manage", async (actor, data) => {
  if (typeof data.slug !== "string" || !slugPattern.test(data.slug)) throw new ProductInputError("slug");
  const db = catalogDb();
  const [row] = await db.select({ id: product.id }).from(product).where(eq(product.slug, data.slug)).limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  await setProductCost(db, actor, row.id, parseMoney(data.costPrice, "costPrice"));
  return Response.json({ costs: await listProductCosts(db) }, { headers: noStore });
});
/** bKash/Nagad fee percent used in the profit report ({ feePercent: "1.85" }). Requires "Cost prices" access. */
export const PUT = adminHandler("costs.manage", async (actor, data) => {
  await setPaymentFee(catalogDb(), actor, data.feePercent);
  return Response.json({ ok: true }, { headers: noStore });
});
