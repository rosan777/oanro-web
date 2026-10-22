// Team-only extras: free-text labels on orders and private notes on customers. Never shown to customers.
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { auditEvent, customerNote, orderDiscount, orderLabel, shopOrder, user } from "./db/schema";
import { ProductInputError } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export const cleanLabel = (v: unknown) => { if (typeof v !== "string") throw new ProductInputError("label"); const s = v.trim().replace(/\s+/g, " "); if (s.length < 2 || s.length > 24) throw new ProductInputError("label"); return s; };
export async function orderExtras(db: CatalogDb, orderId: string) {
  const [labels, [discount]] = await Promise.all([
    db.select({ label: orderLabel.label }).from(orderLabel).where(eq(orderLabel.orderId, orderId)).orderBy(asc(orderLabel.label)),
    db.select({ code: orderDiscount.code, amount: orderDiscount.amount }).from(orderDiscount).where(eq(orderDiscount.orderId, orderId)).limit(1),
  ]);
  return { labels: labels.map(l => l.label), discount: discount ?? null };
}
export async function setOrderLabel(db: CatalogDb, actorId: string, orderId: string, label: string, add: boolean) {
  await db.transaction(async tx => {
    const [o] = await tx.select({ code: shopOrder.code }).from(shopOrder).where(eq(shopOrder.id, orderId)).limit(1);
    if (!o) throw new ProductStoreError("NOT_FOUND");
    if (add) await tx.insert(orderLabel).values({ orderId, label }).onConflictDoNothing();
    else await tx.delete(orderLabel).where(and(eq(orderLabel.orderId, orderId), eq(orderLabel.label, label)));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "order.label", targetId: orderId, reason: `${o.code}: ${add ? "+" : "−"}${label}` });
  });
}
export async function listCustomerNotes(db: CatalogDb, userId: string) {
  return db.select({ id: customerNote.id, body: customerNote.body, createdAt: customerNote.createdAt, author: user.name }).from(customerNote)
    .innerJoin(user, eq(user.id, customerNote.authorId)).where(eq(customerNote.userId, userId)).orderBy(desc(customerNote.createdAt));
}
export async function addCustomerNote(db: CatalogDb, actorId: string, userId: string, raw: unknown) {
  if (typeof raw !== "string" || raw.trim().length < 2 || raw.trim().length > 1000) throw new ProductInputError("body");
  await db.transaction(async tx => {
    const [u] = await tx.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
    if (!u) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(customerNote).values({ id: randomUUID(), userId, authorId: actorId, body: (raw as string).trim() });
    // The note text stays out of the activity log (it may hold personal details).
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "customer.note", targetId: userId, reason: "note added" });
  });
}
