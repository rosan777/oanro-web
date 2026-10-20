// Orders and manual bKash/Nagad payments. Stock is reserved when an order is placed, kept when it is
// approved, and returned when it is rejected. Every step is audit-logged inside its own transaction.
import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, getTableColumns, gte, inArray, isNull, sql } from "drizzle-orm";
import { auditEvent, orderEvent, orderItem, product, productCollection, productVariant, shopOrder, storeSetting, user, type DeliveryStage, type OrderStatus, type PaymentMethod } from "./db/schema";
import { withImageFlag } from "./db/light";
import { nextStages } from "./order-flow";
import type { OrderInput } from "./order-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export const MAX_PENDING_ORDERS = 5;
const settingKey: Record<PaymentMethod, string> = { bkash: "payment.bkash", nagad: "payment.nagad" };
export type PaymentNumbers = Record<PaymentMethod, string>;

export async function getPaymentNumbers(db: CatalogDb): Promise<PaymentNumbers> {
  const rows = await db.select().from(storeSetting).where(inArray(storeSetting.key, Object.values(settingKey)));
  return { bkash: rows.find(r => r.key === settingKey.bkash)?.value ?? "", nagad: rows.find(r => r.key === settingKey.nagad)?.value ?? "" };
}
/** Owner-only (enforced by the API). An empty value turns that payment method off. */
export async function setPaymentNumbers(db: CatalogDb, actorId: string, numbers: PaymentNumbers) {
  await db.transaction(async tx => {
    for (const method of ["bkash", "nagad"] as const) {
      await tx.insert(storeSetting).values({ key: settingKey[method], value: numbers[method], updatedBy: actorId })
        .onConflictDoUpdate({ target: storeSetting.key, set: { value: numbers[method], updatedBy: actorId, updatedAt: new Date() } });
    }
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "payment.numbers", targetId: "store_setting", reason: `bkash=${numbers.bkash || "off"} nagad=${numbers.nagad || "off"}` });
  });
}
/**
 * Owner-controlled store rules, shown at checkout and on the Delivery & returns page.
 * deliveryCharge: every order, non-refundable · codLimit: largest product total allowed for cash on delivery (0 = COD off)
 * dhakaDays / outsideDays: delivery time as "1-3" style ranges · returnDays: days to report a problem after delivery (0 = no returns).
 */
export type CheckoutRules = { deliveryCharge: number; codLimit: number; dhakaDays: string; outsideDays: string; returnDays: number };
const ruleKey = { deliveryCharge: "delivery.charge", codLimit: "cod.limit", dhakaDays: "delivery.dhaka_days", outsideDays: "delivery.outside_days", returnDays: "returns.days" } as const;
export const DEFAULT_RULES: CheckoutRules = { deliveryCharge: 120, codLimit: 5000, dhakaDays: "1-3", outsideDays: "3-5", returnDays: 3 };
export const dayRange = /^\d{1,2}(-\d{1,2})?$/;
export async function getCheckoutRules(db: CatalogDb): Promise<CheckoutRules> {
  const rows = await db.select().from(storeSetting).where(inArray(storeSetting.key, Object.values(ruleKey)));
  const raw = (key: string) => rows.find(r => r.key === key)?.value;
  const num = (key: string, fallback: number) => { const v = Number(raw(key)); return raw(key) !== undefined && Number.isInteger(v) && v >= 0 ? v : fallback; };
  const days = (key: string, fallback: string) => { const v = raw(key); return v && dayRange.test(v) ? v : fallback; };
  return { deliveryCharge: num(ruleKey.deliveryCharge, DEFAULT_RULES.deliveryCharge), codLimit: num(ruleKey.codLimit, DEFAULT_RULES.codLimit),
    dhakaDays: days(ruleKey.dhakaDays, DEFAULT_RULES.dhakaDays), outsideDays: days(ruleKey.outsideDays, DEFAULT_RULES.outsideDays), returnDays: num(ruleKey.returnDays, DEFAULT_RULES.returnDays) };
}
export async function setCheckoutRules(db: CatalogDb, actorId: string, rules: CheckoutRules) {
  await db.transaction(async tx => {
    for (const k of Object.keys(ruleKey) as (keyof CheckoutRules)[]) {
      await tx.insert(storeSetting).values({ key: ruleKey[k], value: String(rules[k]), updatedBy: actorId })
        .onConflictDoUpdate({ target: storeSetting.key, set: { value: String(rules[k]), updatedBy: actorId, updatedAt: new Date() } });
    }
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "checkout.rules", targetId: "store_setting",
      reason: `delivery=৳${rules.deliveryCharge} codLimit=৳${rules.codLimit} dhaka=${rules.dhakaDays}d outside=${rules.outsideDays}d returns=${rules.returnDays}d` });
  });
}
const orderCode = () => `OA-${Date.now().toString(36).toUpperCase().slice(-6)}${randomBytes(2).toString("hex").toUpperCase()}`;
function uniqueViolation(error: unknown) {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
/** Places an order for a verified, signed-in customer. Prices come from the database, never the browser. */
export async function createOrder(db: CatalogDb, customer: { id: string }, input: OrderInput, screenshot: string | null) {
  const numbers = await getPaymentNumbers(db);
  const payTo = numbers[input.method], rules = await getCheckoutRules(db);
  if (!payTo) throw new ProductStoreError("METHOD_UNAVAILABLE");
  const id = randomUUID(), code = orderCode();
  try {
    await db.transaction(async tx => {
      const [pending] = await tx.select({ n: count() }).from(shopOrder).where(and(eq(shopOrder.userId, customer.id), eq(shopOrder.status, "pending")));
      if (Number(pending?.n ?? 0) >= MAX_PENDING_ORDERS) throw new ProductStoreError("TOO_MANY_PENDING");
      // Checked first so the customer gets the clearest message; the unique index is the real guarantee.
      const [used] = await tx.select({ id: shopOrder.id }).from(shopOrder).where(and(eq(shopOrder.method, input.method), eq(shopOrder.trxId, input.trxId))).limit(1);
      if (used) throw new ProductStoreError("TRX_USED");
      const rows = await tx.select({ id: product.id, slug: product.slug, name: product.nameEn, price: product.price, cost: product.costPrice, sizes: product.sizes, colors: product.colors, stock: product.stock })
        .from(product).innerJoin(productCollection, eq(productCollection.id, product.collectionId))
        .where(and(inArray(product.slug, input.items.map(i => i.slug)), eq(product.status, "published"), isNull(product.archivedAt), eq(productCollection.status, "published"), isNull(productCollection.archivedAt)));
      const lines = input.items.map(item => {
        const p = rows.find(r => r.slug === item.slug);
        if (!p || !p.sizes.includes(item.size)) throw new ProductStoreError(`UNAVAILABLE:${item.slug}`);
        // Products with colours need one of them; products without take none.
        const color = p.colors.find(c => c.id === item.color);
        if (p.colors.length ? !color : item.color !== "") throw new ProductStoreError(`UNAVAILABLE:${item.slug}`);
        return { ...item, product: p, label: color ? `${p.name} / ${color.en}` : p.name };
      });
      const variantRows = await tx.select().from(productVariant).where(inArray(productVariant.productId, rows.map(r => r.id)));
      // expectedTotal is the product subtotal the customer saw; the server adds the delivery charge itself.
      const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
      if (subtotal !== input.expectedTotal) throw new ProductStoreError("PRICE_CHANGED");
      const cod = input.paymentType === "cod";
      if (cod && subtotal > rules.codLimit) throw new ProductStoreError("COD_LIMIT");
      // "total" is the money received now by bKash/Nagad: everything for prepaid, only the delivery charge for COD.
      const total = cod ? rules.deliveryCharge : subtotal + rules.deliveryCharge;
      const reserved: boolean[] = [];
      // Per-variant shortage names the colour and size (the count is for that option only).
      const oos = (line: typeof lines[number], left: number | null) => new ProductStoreError(`OUT_OF_STOCK:${line.slug}:${left ?? 0}:${line.color}:${encodeURIComponent(line.size)}`);
      for (const line of lines) {
        // Stock per colour/size: take from that exact variant (atomic), then keep the product total in step.
        if (variantRows.some(v => v.productId === line.product.id)) {
          const v = variantRows.find(x => x.productId === line.product.id && x.color === line.color && x.size === line.size);
          if (!v) throw new ProductStoreError(`UNAVAILABLE:${line.slug}`);
          const done = await tx.update(productVariant).set({ stock: sql`${productVariant.stock} - ${line.quantity}` })
            .where(and(eq(productVariant.productId, v.productId), eq(productVariant.color, v.color), eq(productVariant.size, v.size), gte(productVariant.stock, line.quantity))).returning({ stock: productVariant.stock });
          if (!done.length) throw oos(line, v.stock);
          await tx.update(product).set({ stock: sql`greatest(coalesce(${product.stock}, 0) - ${line.quantity}, 0)` }).where(eq(product.id, line.product.id));
          reserved.push(true); continue;
        }
        if (line.product.stock === null) { reserved.push(false); continue; }
        // Atomic: only succeeds when enough units are left, so two customers can't buy the last one.
        const done = await tx.update(product).set({ stock: sql`${product.stock} - ${line.quantity}` })
          .where(and(eq(product.id, line.product.id), gte(product.stock, line.quantity))).returning({ id: product.id });
        // Tell the customer exactly how many are left (stock before this order, all sizes together).
        if (!done.length) throw new ProductStoreError(`OUT_OF_STOCK:${line.slug}:${line.product.stock}`);
        reserved.push(true);
      }
      await tx.insert(shopOrder).values({ id, code, userId: customer.id, method: input.method, payTo, payerNumber: input.payerNumber, trxId: input.trxId,
        imageData: screenshot, total, paymentType: input.paymentType, deliveryCharge: rules.deliveryCharge, codDue: cod ? subtotal : 0, customerName: input.name, phone: input.phone, address: input.address, note: input.note });
      await tx.insert(orderItem).values(lines.map((l, i) => ({ orderId: id, productId: l.product.id, slug: l.slug, name: l.label, size: l.size, color: l.color, quantity: l.quantity, unitPrice: l.product.price, unitCost: l.product.cost, stockReserved: reserved[i] })));
      await tx.insert(orderEvent).values({ id: randomUUID(), orderId: id, stage: "placed", actorId: customer.id });
      await tx.insert(auditEvent).values({ id: randomUUID(), actorId: customer.id, action: "order.create", targetId: id, reason: `${code} ${cod ? "COD " : ""}${input.method} ${input.trxId} ৳${total}${cod ? ` + ৳${subtotal} cash` : ""}` });
    });
  } catch (error) {
    if (uniqueViolation(error)) throw new ProductStoreError("TRX_USED");
    throw error;
  }
  return { id, code };
}
const orderColumns = () => withImageFlag(getTableColumns(shopOrder));
async function detailsFor(db: CatalogDb, ids: string[]) {
  if (!ids.length) return { items: [], events: [] };
  const [items, events] = await Promise.all([
    db.select().from(orderItem).where(inArray(orderItem.orderId, ids)),
    db.select({ orderId: orderEvent.orderId, stage: orderEvent.stage, note: orderEvent.note, createdAt: orderEvent.createdAt }).from(orderEvent).where(inArray(orderEvent.orderId, ids)).orderBy(asc(orderEvent.createdAt)),
  ]);
  return { items, events };
}
function shape<T extends { id: string; imageData: string | null; createdAt: Date; updatedAt: Date; reviewedAt: Date | null; codCollectedAt: Date | null }>(rows: T[], d: Awaited<ReturnType<typeof detailsFor>>) {
  return rows.map(({ imageData, createdAt, updatedAt, reviewedAt, codCollectedAt, ...r }) => ({ ...r, hasScreenshot: Boolean(imageData),
    createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(), reviewedAt: reviewedAt?.toISOString() ?? null, codCollectedAt: codCollectedAt?.toISOString() ?? null,
    items: d.items.filter(i => i.orderId === r.id).map(i => ({ slug: i.slug, name: i.name, size: i.size, color: i.color, quantity: i.quantity, unitPrice: i.unitPrice })),
    events: d.events.filter(e => e.orderId === r.id).map(e => ({ stage: e.stage, note: e.note, at: e.createdAt.toISOString() })) }));
}
export async function listMyOrders(db: CatalogDb, userId: string) {
  const rows = await db.select(orderColumns()).from(shopOrder).where(eq(shopOrder.userId, userId)).orderBy(desc(shopOrder.createdAt)).limit(50);
  // Courier charge is an internal business cost; customers never receive it.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping shippingCost on purpose: customers never see courier cost
  return shape(rows, await detailsFor(db, rows.map(r => r.id))).map(({ shippingCost: _, codCollectedBy: __, ...o }) => o);
}
export type AdminOrder = Awaited<ReturnType<typeof listOrders>>[number];
/** COD orders are visible only to staff with "cod.manage" (pass includeCod accordingly). */
export async function listOrders(db: CatalogDb, opts: { includeCod: boolean; status?: OrderStatus } = { includeCod: false }) {
  const rows = await db.select({ ...orderColumns(), accountName: user.name, accountEmail: user.email }).from(shopOrder).innerJoin(user, eq(user.id, shopOrder.userId))
    .where(and(opts.status ? eq(shopOrder.status, opts.status) : undefined, opts.includeCod ? undefined : eq(shopOrder.paymentType, "prepaid"))).orderBy(desc(shopOrder.createdAt)).limit(200);
  return shape(rows, await detailsFor(db, rows.map(r => r.id)));
}
export async function orderCounts(db: CatalogDb, includeCod = false) {
  const rows = await db.select({ status: shopOrder.status, n: count() }).from(shopOrder).where(includeCod ? undefined : eq(shopOrder.paymentType, "prepaid")).groupBy(shopOrder.status);
  return { pending: 0, paid: 0, rejected: 0, ...Object.fromEntries(rows.map(r => [r.status, Number(r.n)])) } as Record<OrderStatus, number>;
}
/** Throws NOT_FOUND for a COD order when the caller may not see COD orders (same answer as a missing order). */
export async function assertOrderVisible(db: CatalogDb, id: string, includeCod: boolean) {
  const [row] = await db.select({ type: shopOrder.paymentType }).from(shopOrder).where(eq(shopOrder.id, id)).limit(1);
  if (!row || (row.type === "cod" && !includeCod)) throw new ProductStoreError("NOT_FOUND");
}
export async function orderScreenshot(db: CatalogDb, id: string, includeCod = false) {
  const [row] = await db.select({ image: shopOrder.imageData, type: shopOrder.paymentType }).from(shopOrder).where(eq(shopOrder.id, id)).limit(1);
  if (row?.type === "cod" && !includeCod) return null;
  return row?.image ?? null;
}
/** Approve (money received) or reject (with a reason; reserved stock is returned). Only pending orders can be reviewed. */
export async function reviewOrder(db: CatalogDb, actorId: string, id: string, decision: "approve" | "reject", reason = "") {
  const why = reason.trim().slice(0, 300);
  if (decision === "reject" && why.length < 3) throw new ProductStoreError("REASON_REQUIRED");
  await db.transaction(async tx => {
    const done = await tx.update(shopOrder).set({ status: decision === "approve" ? "paid" : "rejected", deliveryStatus: decision === "approve" ? "processing" : null, rejectReason: decision === "reject" ? why : null, reviewedBy: actorId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shopOrder.id, id), eq(shopOrder.status, "pending"))).returning({ code: shopOrder.code });
    if (!done.length) throw new ProductStoreError("NOT_PENDING");
    await tx.insert(orderEvent).values({ id: randomUUID(), orderId: id, stage: decision === "approve" ? "paid" : "rejected", note: decision === "reject" ? why : "", actorId });
    if (decision === "reject") await restock(tx as unknown as CatalogDb, id);
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: decision === "approve" ? "order.approve" : "order.reject", targetId: id, reason: decision === "approve" ? done[0].code : `${done[0].code}: ${why}` });
  });
}

async function restock(db: CatalogDb, orderId: string) {
  const lines = await db.select().from(orderItem).where(and(eq(orderItem.orderId, orderId), eq(orderItem.stockReserved, true)));
  for (const l of lines) {
    // Units go back to the exact colour/size when the product tracks stock that way.
    await db.update(productVariant).set({ stock: sql`${productVariant.stock} + ${l.quantity}` })
      .where(and(eq(productVariant.productId, l.productId), eq(productVariant.color, l.color), eq(productVariant.size, l.size)));
    await db.update(product).set({ stock: sql`coalesce(${product.stock}, 0) + ${l.quantity}` }).where(eq(product.id, l.productId));
  }
}
export async function updateDelivery(db: CatalogDb, actorId: string, id: string, stage: DeliveryStage, info: { courier?: string; trackingCode?: string; note?: string } = {}) {
  const courier = (info.courier ?? "").trim().slice(0, 40), trackingCode = (info.trackingCode ?? "").trim().slice(0, 60), note = (info.note ?? "").trim().slice(0, 300);
  if (stage === "shipped" && !courier) throw new ProductStoreError("COURIER_REQUIRED");
  if (stage === "returned" && note.length < 3) throw new ProductStoreError("REASON_REQUIRED");
  await db.transaction(async tx => {
    const [current] = await tx.select({ status: shopOrder.status, delivery: shopOrder.deliveryStatus, code: shopOrder.code }).from(shopOrder).where(eq(shopOrder.id, id)).limit(1);
    if (!current) throw new ProductStoreError("NOT_FOUND");
    if (current.status !== "paid" || !current.delivery || !nextStages[current.delivery].includes(stage)) throw new ProductStoreError("INVALID_STEP");
    // Guarded on the current step so two staff clicking at once can't skip or repeat a step.
    const done = await tx.update(shopOrder).set({ deliveryStatus: stage, ...(stage === "shipped" ? { courier, trackingCode: trackingCode || null } : {}), updatedAt: new Date() })
      .where(and(eq(shopOrder.id, id), eq(shopOrder.deliveryStatus, current.delivery))).returning({ id: shopOrder.id });
    if (!done.length) throw new ProductStoreError("INVALID_STEP");
    const eventNote = stage === "shipped" ? [courier, trackingCode && `#${trackingCode}`, note].filter(Boolean).join(" · ") : note;
    await tx.insert(orderEvent).values({ id: randomUUID(), orderId: id, stage, note: eventNote, actorId });
    if (stage === "returned") await restock(tx as unknown as CatalogDb, id);
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "order.delivery", targetId: id, reason: `${current.code}: ${current.delivery} -> ${stage}${eventNote ? ` (${eventNote})` : ""}`.slice(0, 300) });
  });
}

/** COD: the courier handed over the cash. Only after delivery, once. From here it counts as revenue. */
export async function markCodCollected(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(shopOrder).set({ codCollectedAt: new Date(), codCollectedBy: actorId, updatedAt: new Date() })
      .where(and(eq(shopOrder.id, id), eq(shopOrder.paymentType, "cod"), eq(shopOrder.status, "paid"), eq(shopOrder.deliveryStatus, "delivered"), isNull(shopOrder.codCollectedAt)))
      .returning({ code: shopOrder.code, due: shopOrder.codDue });
    if (!done.length) throw new ProductStoreError("INVALID_STEP");
    await tx.insert(orderEvent).values({ id: randomUUID(), orderId: id, stage: "cash_collected", note: "", actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "order.cod-collected", targetId: id, reason: `${done[0].code}: ৳${done[0].due} cash received` });
  });
}
