// Sales, stock and profit reports. Server-only; costs leave this file only through profitReport/listProductCosts,
// which callers must guard with "profit.read" / "costs.manage".
import { randomUUID } from "node:crypto";
import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { auditEvent, lead, orderItem, product, productCollection, service, shopOrder, storeSetting } from "./db/schema";
import { ProductInputError } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export const reportRanges = ["today", "7d", "30d", "90d", "365d", "all"] as const;
export type ReportRange = typeof reportRanges[number];
export const DEFAULT_LOW_STOCK = 5;
const DAY = 86_400_000, DHAKA = 6 * 3_600_000;
const days: Record<Exclude<ReportRange, "all" | "today">, number> = { "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
export const parseRange = (value: unknown): ReportRange => reportRanges.includes(value as ReportRange) ? value as ReportRange : "30d";

/** Range start, plus the equal-length period before it for "vs previous" comparisons (none for "all"). */
export function rangeBounds(range: ReportRange, now = new Date()) {
  if (range === "all") return { from: null, prevFrom: null };
  const span = range === "today" ? DAY : days[range] * DAY;
  // Dhaka has no daylight saving, so local midnight is a fixed UTC offset.
  const from = range === "today" ? new Date(Math.floor((now.getTime() + DHAKA) / DAY) * DAY - DHAKA) : new Date(now.getTime() - span);
  return { from, prevFrom: new Date(from.getTime() - span) };
}
const dhakaKey = (d: Date, monthly: boolean) => new Date(d.getTime() + DHAKA).toISOString().slice(0, monthly ? 7 : 10);
function bucketKeys(from: Date | null, earliest: Date | null, now: Date, monthly: boolean) {
  const start = from ?? earliest ?? now, keys: string[] = [];
  for (let t = start.getTime(); ; t += monthly ? 28 * DAY : DAY) {
    const k = dhakaKey(new Date(t), monthly);
    if (keys.at(-1) !== k) keys.push(k);
    if (t > now.getTime()) break;
  }
  const last = dhakaKey(now, monthly);
  return keys.slice(0, keys.indexOf(last) + 1 || undefined);
}

type Line = { orderId: string; productId: string; quantity: number; unitPrice: number; unitCost: number | null };
/**
 * at = when the product money counts as revenue: approval for prepaid orders, the "cash received" moment for COD.
 * counted = product money actually received (prepaid and not returned, or COD with cash received).
 * approvedAt drives delivery-charge income and courier costs (money that moved when the order was approved).
 */
type Order = { id: string; method: "bkash" | "nagad"; at: Date; approvedAt: Date; returned: boolean; shipped: boolean; shippingCost: number | null;
  cod: boolean; collected: boolean; counted: boolean; total: number; deliveryCharge: number; codDue: number; refund: number };
async function load(db: CatalogDb, range: ReportRange) {
  const now = new Date(), { from, prevFrom } = rangeBounds(range, now);
  const approved = sql<Date>`coalesce(${shopOrder.reviewedAt}, ${shopOrder.createdAt})`;
  const [products, collections, orderRows, pending, feeBp] = await Promise.all([
    db.select({ id: product.id, name: product.nameEn, sectionId: product.collectionId, price: product.price, cost: product.costPrice, stock: product.stock, lowStockAt: product.lowStockAt, status: product.status, archived: product.archivedAt }).from(product),
    db.select({ id: productCollection.id, name: productCollection.nameEn, order: productCollection.displayOrder, archived: productCollection.archivedAt }).from(productCollection),
    db.select({ id: shopOrder.id, method: shopOrder.method, approved, delivery: shopOrder.deliveryStatus, shippingCost: shopOrder.shippingCost,
      type: shopOrder.paymentType, total: shopOrder.total, deliveryCharge: shopOrder.deliveryCharge, codDue: shopOrder.codDue, collectedAt: shopOrder.codCollectedAt, refund: shopOrder.refundAmount }).from(shopOrder)
      // Uncollected COD orders are always loaded, whatever their date: they make up "cash still with the courier".
      .where(and(eq(shopOrder.status, "paid"), prevFrom ? or(gte(approved, prevFrom), gte(shopOrder.codCollectedAt, prevFrom), and(eq(shopOrder.paymentType, "cod"), isNull(shopOrder.codCollectedAt))) : undefined)),
    // Units promised but not paid for yet: payment awaiting check, plus COD orders whose cash hasn't arrived (and weren't returned).
    db.select({ productId: orderItem.productId, quantity: orderItem.quantity }).from(orderItem).innerJoin(shopOrder, eq(shopOrder.id, orderItem.orderId))
      .where(or(eq(shopOrder.status, "pending"), and(eq(shopOrder.status, "paid"), eq(shopOrder.paymentType, "cod"), isNull(shopOrder.codCollectedAt), sql`${shopOrder.deliveryStatus} is distinct from 'returned'`))),
    getPaymentFee(db),
  ]);
  const orders: Order[] = orderRows.map(o => { const cod = o.type === "cod", collected = Boolean(o.collectedAt), returned = o.delivery === "returned", approvedAt = new Date(o.approved);
    return { id: o.id, method: o.method, approvedAt, at: cod && o.collectedAt ? new Date(o.collectedAt) : approvedAt, returned, shipped: o.delivery !== null && o.delivery !== "processing", shippingCost: o.shippingCost,
      cod, collected, counted: !returned && (!cod || collected), total: o.total, deliveryCharge: o.deliveryCharge, codDue: o.codDue, refund: o.refund }; });
  const lines: Line[] = orders.length ? await db.select({ orderId: orderItem.orderId, productId: orderItem.productId, quantity: orderItem.quantity, unitPrice: orderItem.unitPrice, unitCost: orderItem.unitCost })
    .from(orderItem).where(inArray(orderItem.orderId, orders.map(o => o.id))) : [];
  const inCurrent = (o: Order) => !from || o.at >= from;
  const current = orders.filter(inCurrent), previous = orders.filter(o => !inCurrent(o));
  const approvedIn = (o: Order) => !from || o.approvedAt >= from;
  const approvedCurrent = orders.filter(approvedIn), approvedPrevious = orders.filter(o => !approvedIn(o) && (!prevFrom || o.approvedAt >= prevFrom));
  const pendingCod = orders.filter(o => o.cod && !o.collected && !o.returned);
  const monthly = range === "365d" || range === "all";
  const earliest = current.reduce<Date | null>((min, o) => !min || o.at < min ? o.at : min, null);
  return { feeBp, now, from, range, products, collections, current, previous, approvedCurrent, approvedPrevious, pendingCod, lines, pending, monthly, buckets: range === "today" ? [] : bucketKeys(from, earliest, now, monthly) };
}
type Data = Awaited<ReturnType<typeof load>>;
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + f(r), 0);
const linesOf = (d: Data, orders: Order[]) => {
  const ids = new Set(orders.filter(o => o.counted).map(o => o.id));
  return d.lines.filter(l => ids.has(l.orderId));
};
const sectionName = (d: Data, id: string) => d.collections.find(c => c.id === id)?.name ?? id;
const sectionOrder = (d: Data, id: string) => d.collections.find(c => c.id === id)?.order ?? 999;

export type SalesRow = { id: string; name: string; sectionId: string; price: number; stock: number | null; lowStockAt: number; sold: number; returned: number; reserved: number; revenue: number; status: string; archived: boolean };
export type TrendPoint = { key: string; revenue: number; profit?: number; orders: number };
export type SalesReport = Awaited<ReturnType<typeof salesReport>>;
export async function salesReport(db: CatalogDb, range: ReportRange) {
  const d = await load(db, range);
  const sold = linesOf(d, d.current), returnedLines = d.lines.filter(l => d.current.some(o => o.returned && o.id === l.orderId));
  const rows: SalesRow[] = d.products.map(p => {
    const mine = sold.filter(l => l.productId === p.id);
    return { id: p.id, name: p.name, sectionId: p.sectionId, price: p.price, stock: p.stock, lowStockAt: p.lowStockAt ?? DEFAULT_LOW_STOCK,
      sold: sum(mine, l => l.quantity), returned: sum(returnedLines.filter(l => l.productId === p.id), l => l.quantity),
      reserved: sum(d.pending.filter(l => l.productId === p.id), l => l.quantity), revenue: sum(mine, l => l.quantity * l.unitPrice),
      status: p.status, archived: Boolean(p.archived) };
  }).filter(r => !r.archived || r.sold || r.reserved);
  const sections = [...new Set(rows.map(r => r.sectionId))].sort((a, b) => sectionOrder(d, a) - sectionOrder(d, b))
    .map(id => { const list = rows.filter(r => r.sectionId === id).sort((a, b) => b.sold - a.sold || a.name.localeCompare(b.name));
      return { id, name: sectionName(d, id), rows: list, sold: sum(list, r => r.sold), revenue: sum(list, r => r.revenue) }; });
  const prevLines = linesOf(d, d.previous);
  const kept = d.current.filter(o => o.counted);
  // Money actually received, by channel: bKash/Nagad (full prepaid amounts, or just the COD delivery charge) and COD cash.
  const methods = [...(["bkash", "nagad"] as const).map(m => { const os = d.approvedCurrent.filter(o => o.method === m);
    return { method: m as string, orders: os.length, amount: sum(os, o => o.cod || o.returned ? o.deliveryCharge : o.total) }; }),
    { method: "cod", orders: d.current.filter(o => o.cod && o.collected).length, amount: sum(d.current.filter(o => o.cod && o.collected), o => o.codDue) }];
  const trend: TrendPoint[] = d.buckets.map(key => { const os = kept.filter(o => dhakaKey(o.at, d.monthly) === key); const ids = new Set(os.map(o => o.id));
    return { key, orders: os.length, revenue: sum(sold.filter(l => ids.has(l.orderId)), l => l.quantity * l.unitPrice) }; });
  const restock = rows.filter(r => !r.archived && r.status !== "hidden" && r.stock !== null && r.stock <= r.lowStockAt).sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  // Service inquiries in the same period (services are quoted, not sold online).
  const leads = await db.select({ slug: lead.serviceSlug, status: lead.status }).from(lead).where(and(eq(lead.kind, "service"), d.from ? gte(lead.createdAt, d.from) : undefined));
  const titles = await db.select({ slug: service.slug, title: service.titleEn }).from(service);
  const services = [...new Set(leads.map(l => l.slug ?? "general"))].map(slug => ({ slug, title: titles.find(t => t.slug === slug)?.title ?? slug.replace(/-/g, " "),
    inquiries: leads.filter(l => (l.slug ?? "general") === slug).length, won: leads.filter(l => (l.slug ?? "general") === slug && l.status === "won").length })).sort((a, b) => b.inquiries - a.inquiries);
  return {
    range, monthly: d.monthly, sections, restock, methods, trend, services,
    totals: { orders: kept.length, units: sum(sold, l => l.quantity), revenue: sum(sold, l => l.quantity * l.unitPrice), returnedUnits: sum(returnedLines, l => l.quantity), reservedUnits: sum(d.pending, l => l.quantity),
      deliveryIncome: sum(d.approvedCurrent, o => o.deliveryCharge), refunds: sum(d.approvedCurrent, o => o.returned ? 0 : o.refund), refundedOrders: d.approvedCurrent.filter(o => !o.returned && o.refund > 0).length },
    pendingCod: { orders: d.pendingCod.length, amount: sum(d.pendingCod, o => o.codDue) },
    previous: d.range === "all" ? null : { orders: d.previous.filter(o => o.counted).length, units: sum(prevLines, l => l.quantity), revenue: sum(prevLines, l => l.quantity * l.unitPrice) },
  };
}

export type ProfitRow = { id: string; name: string; section: string; price: number; costPrice: number | null; sold: number; revenue: number; cost: number; profit: number; margin: number | null; missingCost: boolean; loss: boolean };
export type ProfitReport = Awaited<ReturnType<typeof profitReport>>;
function money(d: Data, orders: Order[], approved: Order[]) {
  const lines = linesOf(d, orders);
  const costOf = (l: Line) => l.unitCost ?? d.products.find(p => p.id === l.productId)?.cost ?? null;
  const revenue = sum(lines, l => l.quantity * l.unitPrice), productCost = sum(lines, l => l.quantity * (costOf(l) ?? 0));
  // Courier charges count even for returned orders (the courier was still paid); delivery charges are never refunded.
  // Until the real courier bill is entered, assume it equals the delivery charge collected, so the
  // pass-through charge never shows up as fake profit.
  const shipping = sum(approved, o => o.shippingCost ?? o.deliveryCharge), delivery = sum(approved, o => o.deliveryCharge);
  // bKash/Nagad fee on the money that came in through them; refunds given back on orders that still count
  // (a returned order's product money is already left out, so its refund isn't subtracted twice).
  const fees = sum(approved, o => Math.round(o.total * d.feeBp / 10_000)), refunds = sum(approved, o => o.returned ? 0 : o.refund);
  return { lines, costOf, revenue, productCost, shipping, delivery, fees, refunds, gross: revenue - productCost, net: revenue - productCost - shipping + delivery - fees - refunds };
}
export async function profitReport(db: CatalogDb, range: ReportRange) {
  const d = await load(db, range);
  const cur = money(d, d.current, d.approvedCurrent), prev = money(d, d.previous, d.approvedPrevious);
  const rows: ProfitRow[] = d.products.map(p => {
    const mine = cur.lines.filter(l => l.productId === p.id);
    const revenue = sum(mine, l => l.quantity * l.unitPrice), cost = sum(mine, l => l.quantity * (cur.costOf(l) ?? 0));
    return { id: p.id, name: p.name, section: sectionName(d, p.sectionId), price: p.price, costPrice: p.cost, sold: sum(mine, l => l.quantity), revenue, cost,
      profit: revenue - cost, margin: revenue ? Math.round((revenue - cost) / revenue * 1000) / 10 : null,
      missingCost: mine.some(l => cur.costOf(l) === null) || (p.cost === null && !p.archived), loss: p.cost !== null && p.cost > p.price, archived: Boolean(p.archived) };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- dropping archived flag after using it to filter
  }).filter(r => !r.archived || r.sold).map(({ archived: _, ...r }) => r);
  const bySection = [...new Set(rows.map(r => r.section))].map(name => { const list = rows.filter(r => r.section === name); return { name, revenue: sum(list, r => r.revenue), profit: sum(list, r => r.profit) }; });
  const trend: TrendPoint[] = d.buckets.map(key => { const m = money(d, d.current.filter(o => dhakaKey(o.at, d.monthly) === key), d.approvedCurrent.filter(o => dhakaKey(o.approvedAt, d.monthly) === key)); return { key, revenue: m.revenue, profit: m.net, orders: 0 }; });
  return {
    range, monthly: d.monthly, rows, bySection, trend,
    feePercent: d.feeBp / 100,
    totals: { revenue: cur.revenue, productCost: cur.productCost, shipping: cur.shipping, delivery: cur.delivery, fees: cur.fees, refunds: cur.refunds, gross: cur.gross, net: cur.net, margin: cur.revenue ? Math.round(cur.net / cur.revenue * 1000) / 10 : null },
    previous: d.range === "all" ? null : { revenue: prev.revenue, net: prev.net },
    missingShipping: d.approvedCurrent.filter(o => o.shippingCost === null && o.deliveryCharge > 0).length,
    pendingCod: { orders: d.pendingCod.length, amount: sum(d.pendingCod, o => o.codDue) },
    missingCost: rows.filter(r => r.missingCost).length,
  };
}

// ---- Costs (guard with "costs.manage") ----
export async function listProductCosts(db: CatalogDb): Promise<Record<string, number | null>> {
  const rows = await db.select({ id: product.id, cost: product.costPrice }).from(product).where(isNull(product.archivedAt));
  return Object.fromEntries(rows.map(r => [r.id, r.cost]));
}
export function parseMoney(value: unknown, field: string): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 10_000_000) throw new ProductInputError(field);
  return n;
}
/** Audit records only that the cost changed, never the amount: the activity log is readable by more staff. */
export async function setProductCost(db: CatalogDb, actorId: string, id: string, cost: number | null) {
  await db.transaction(async tx => {
    const done = await tx.update(product).set({ costPrice: cost, updatedAt: new Date() }).where(and(eq(product.id, id), isNull(product.archivedAt))).returning({ slug: product.slug });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "product.cost", targetId: id, reason: `${done[0].slug}: cost price ${cost === null ? "cleared" : "updated"}` });
  });
}
export async function setShippingCost(db: CatalogDb, actorId: string, orderId: string, cost: number | null) {
  await db.transaction(async tx => {
    const done = await tx.update(shopOrder).set({ shippingCost: cost, updatedAt: new Date() }).where(and(eq(shopOrder.id, orderId), eq(shopOrder.status, "paid"))).returning({ code: shopOrder.code });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "order.shipping-cost", targetId: orderId, reason: `${done[0].code}: courier charge ${cost === null ? "cleared" : `৳${cost}`}` });
  });
}

// ---- Payment fee (bKash/Nagad charge), stored as basis points: 185 = 1.85% ----
const FEE_KEY = "payment.fee_bp";
export async function getPaymentFee(db: CatalogDb) {
  const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, FEE_KEY)).limit(1);
  const n = Number(row?.value); return Number.isInteger(n) && n >= 0 && n <= 1000 ? n : 0;
}
/** percent like "1.85"; 0–10%. Guard with "costs.manage". */
export async function setPaymentFee(db: CatalogDb, actorId: string, percent: unknown) {
  const n = typeof percent === "string" ? Number(percent.trim()) : percent;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10) throw new ProductInputError("feePercent");
  const bp = Math.round(n * 100);
  await db.transaction(async tx => {
    await tx.insert(storeSetting).values({ key: FEE_KEY, value: String(bp), updatedBy: actorId }).onConflictDoUpdate({ target: storeSetting.key, set: { value: String(bp), updatedBy: actorId, updatedAt: new Date() } });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "costs.payment-fee", targetId: "store_setting", reason: "bKash/Nagad fee updated" });
  });
}
/** Record (or correct) money sent back to a customer for an approved order. 0 clears it. */
export async function setRefund(db: CatalogDb, actorId: string, orderId: string, amount: number, note: string) {
  const why = note.trim().slice(0, 200);
  if (amount > 0 && why.length < 3) throw new ProductStoreError("REASON_REQUIRED");
  await db.transaction(async tx => {
    const [o] = await tx.select({ code: shopOrder.code, total: shopOrder.total, codDue: shopOrder.codDue, collected: shopOrder.codCollectedAt, status: shopOrder.status }).from(shopOrder).where(eq(shopOrder.id, orderId)).limit(1);
    if (!o || o.status !== "paid") throw new ProductStoreError("NOT_FOUND");
    // Can't refund more than was actually received.
    if (amount > o.total + (o.collected ? o.codDue : 0)) throw new ProductStoreError("REFUND_TOO_HIGH");
    await tx.update(shopOrder).set({ refundAmount: amount, refundNote: amount ? why : null, refundedAt: amount ? new Date() : null, updatedAt: new Date() }).where(eq(shopOrder.id, orderId));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "order.refund", targetId: orderId, reason: amount ? `${o.code}: ৳${amount} refunded (${why})` : `${o.code}: refund cleared` });
  });
}
