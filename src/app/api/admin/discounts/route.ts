import { adminHandler, noStore } from "@/lib/admin-api";
import { listDiscounts, parseDiscountInput, saveDiscount, setDiscountActive } from "@/lib/discount-store";
import { parseDiscountCode } from "@/lib/order-input";
import { ProductInputError } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const respond = async () => Response.json({ discounts: await listDiscounts(catalogDb()) }, { headers: noStore });
/** Create or update a code (same code = update). Needs the discount codes permission. */
export const POST = adminHandler("discounts.manage", async (actor, data) => { await saveDiscount(catalogDb(), actor, parseDiscountInput(data)); return respond(); });
/** Turn a code on or off ({ code, active }). */
export const PATCH = adminHandler("discounts.manage", async (actor, data) => {
  const code = parseDiscountCode(data.code); if (!code || typeof data.active !== "boolean") throw new ProductInputError("active");
  await setDiscountActive(catalogDb(), actor, code, data.active); return respond();
});
