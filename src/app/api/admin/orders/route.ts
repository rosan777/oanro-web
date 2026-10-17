import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { normalizePhone } from "@/lib/order-input";
import { assertOrderVisible, getCheckoutRules, getPaymentNumbers, listOrders, markCodCollected, reviewOrder, setCheckoutRules, setPaymentNumbers, updateDelivery } from "@/lib/order-store";
import type { Access } from "@/lib/rbac";
import { deliveryStages, type DeliveryStage } from "@/lib/db/schema";
import { ProductInputError } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { parseMoney, setShippingCost } from "@/lib/report-store";
export const runtime = "nodejs";

const respond = async (access: Access) => {
  const db = catalogDb();
  const [orders, numbers, rules] = await Promise.all([listOrders(db, { includeCod: access.permissions.has("cod.manage") }), getPaymentNumbers(db), getCheckoutRules(db)]);
  return Response.json({ orders, numbers, rules }, { headers: noStore });
};
/** Approve (money received) or reject (reason required; reserved stock is returned). */
export const PATCH = adminHandler("orders.manage", async (actor, data, access) => {
  // Every action names one order; COD orders need "cod.manage" too (others get NOT_FOUND, as if it didn't exist).
  const cod = access.permissions.has("cod.manage");
  await assertOrderVisible(catalogDb(), requireUuid(data.id), cod);
  if (data.action === "cod-collected") {
    if (!cod) throw new ProductStoreError("NOT_FOUND");
    await markCodCollected(catalogDb(), actor, requireUuid(data.id));
    return respond(access);
  }
  if (data.action === "delivery") {
    if (typeof data.stage !== "string" || !deliveryStages.includes(data.stage as DeliveryStage)) throw new ProductInputError("stage");
    const str = (v: unknown) => typeof v === "string" ? v : "";
    await updateDelivery(catalogDb(), actor, requireUuid(data.id), data.stage as DeliveryStage, { courier: str(data.courier), trackingCode: str(data.trackingCode), note: str(data.note) });
    return respond(access);
  }
  if (data.action === "shipping-cost") {
    await setShippingCost(catalogDb(), actor, requireUuid(data.id), parseMoney(data.shippingCost, "shippingCost"));
    return respond(access);
  }
  if (data.decision !== "approve" && data.decision !== "reject") throw new ProductInputError("decision");
  await reviewOrder(catalogDb(), actor, requireUuid(data.id), data.decision, typeof data.reason === "string" ? data.reason : "");
  return respond(access);
});
/** Set the personal bKash/Nagad numbers customers pay to. Owner only: changing it redirects all money. */
export const PUT = adminHandler("orders.manage", async (actor, data, access) => {
  if (!access.owner) throw new ProductStoreError("OWNER_ONLY");
  const number = (value: unknown, field: string) => value === "" || value == null ? "" : normalizePhone(value, field);
  const money = (v: unknown, field: string) => { const n = parseMoney(v, field); if (n === null) throw new ProductInputError(field); return n; };
  const db = catalogDb();
  await setPaymentNumbers(db, actor, { bkash: number(data.bkash, "bkash"), nagad: number(data.nagad, "nagad") });
  if (data.deliveryCharge !== undefined || data.codLimit !== undefined) await setCheckoutRules(db, actor, { deliveryCharge: money(data.deliveryCharge, "deliveryCharge"), codLimit: money(data.codLimit, "codLimit") });
  return respond(access);
});
