import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { normalizePhone } from "@/lib/order-input";
import { dayRange, assertOrderVisible, getCheckoutRules, getPaymentNumbers, listOrders, markCodCollected, reviewOrder, setCheckoutRules, setPaymentNumbers, updateDelivery } from "@/lib/order-store";
import type { Access } from "@/lib/rbac";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { user } from "@/lib/db/schema";
import { notifyCustomer, sendTestEmail } from "@/lib/order-notify";
import { deliveryStages, type DeliveryStage } from "@/lib/db/schema";
import { ProductInputError } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { sendReviewRequest } from "@/lib/marketing";
import { catalogDb } from "@/lib/store-products";
import { storefrontChanged } from "@/lib/storefront-cache";
import { parseMoney, setRefund, setShippingCost } from "@/lib/report-store";
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
    const stage = data.stage as DeliveryStage, orderId = requireUuid(data.id);
    if (stage !== "processing") after(() => notifyCustomer(catalogDb(), orderId, stage).catch(() => {}));
    // A day after delivery is better for feedback, but sending right away keeps this simple and reliable (no scheduler needed).
    if (stage === "delivered") after(() => sendReviewRequest(catalogDb(), orderId).catch(() => {}));
    return respond(access);
  }
  if (data.action === "shipping-cost") {
    await setShippingCost(catalogDb(), actor, requireUuid(data.id), parseMoney(data.shippingCost, "shippingCost"));
    return respond(access);
  }
  if (data.action === "refund") {
    const amount = parseMoney(data.amount, "amount") ?? 0;
    await setRefund(catalogDb(), actor, requireUuid(data.id), amount, typeof data.note === "string" ? data.note : "");
    return respond(access);
  }
  if (data.decision !== "approve" && data.decision !== "reject") throw new ProductInputError("decision");
  await reviewOrder(catalogDb(), actor, requireUuid(data.id), data.decision, typeof data.reason === "string" ? data.reason : "");
  const reviewed = requireUuid(data.id), event = data.decision === "approve" ? "paid" : "rejected";
  after(() => notifyCustomer(catalogDb(), reviewed, event).catch(() => {}));
  return respond(access);
});
/** Set the personal bKash/Nagad numbers customers pay to. Owner only: changing it redirects all money. */
export const PUT = adminHandler("orders.manage", async (actor, data, access) => {
  if (!access.owner) throw new ProductStoreError("OWNER_ONLY");
  const number = (value: unknown, field: string) => value === "" || value == null ? "" : normalizePhone(value, field);
  const money = (v: unknown, field: string) => { const n = parseMoney(v, field); if (n === null) throw new ProductInputError(field); return n; };
  const db = catalogDb();
  // Two forms share this endpoint: { action: "rules", … } saves delivery & payment rules; otherwise the payment numbers.
  if (data.action === "rules") {
    const days = (v: unknown, field: string) => { const s = typeof v === "string" ? v.trim().replace(/[–—]/g, "-") : ""; if (!dayRange.test(s)) throw new ProductInputError(field); return s; };
    const returnDays = money(data.returnDays, "returnDays"); if (returnDays > 30) throw new ProductInputError("returnDays");
    await setCheckoutRules(db, actor, { deliveryCharge: money(data.deliveryCharge, "deliveryCharge"), outsideCharge: money(data.outsideCharge, "outsideCharge"), codLimit: money(data.codLimit, "codLimit"), dhakaDays: days(data.dhakaDays, "dhakaDays"), outsideDays: days(data.outsideDays, "outsideDays"), returnDays });
    storefrontChanged();
    return respond(access);
  }
  await setPaymentNumbers(db, actor, { bkash: number(data.bkash, "bkash"), nagad: number(data.nagad, "nagad") });
  return respond(access);
});

/** Owner: send a test email to yourself to check that order notifications can be delivered. */
export const POST = adminHandler("orders.manage", async (actor, data, access) => {
  if (data.action !== "test-email") throw new ProductInputError("action");
  if (!access.owner) throw new ProductStoreError("OWNER_ONLY");
  const [me] = await catalogDb().select({ email: user.email }).from(user).where(eq(user.id, actor)).limit(1);
  if (!me || !(await sendTestEmail(me.email))) throw new ProductStoreError("EMAIL_FAILED");
  return Response.json({ sentTo: me.email }, { headers: noStore });
});
