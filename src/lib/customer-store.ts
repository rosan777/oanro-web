import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, notExists, or, sql, type SQL } from "drizzle-orm";
import { account, auditEvent, customerProfile, lead, orderItem, session, shopOrder, staffMember, systemOwner, twoFactor, user } from "./db/schema";
import { ProductStoreError, type CatalogDb } from "./product-store";

/** Money actually received from a customer: approved orders, minus COD amounts not yet collected. */
const spentSql = sql<number>`coalesce(sum(case when ${shopOrder.status} = 'paid' then ${shopOrder.total} + case when ${shopOrder.codCollectedAt} is not null then ${shopOrder.codDue} else 0 end else 0 end), 0)`.mapWith(Number);
export const DELETED_DOMAIN = "deleted.invalid";
const notStaff = () => and(
  notExists(sql`(select 1 from ${staffMember} where ${staffMember.userId} = ${user.id})`),
  notExists(sql`(select 1 from ${systemOwner} where ${systemOwner.userId} = ${user.id})`));
const notDeleted = () => sql`${user.email} not like ${"%@" + DELETED_DOMAIN}`;

export type CustomerRow = { id: string; name: string; email: string; verified: boolean; joined: Date; orders: number; spent: number; lastOrder: Date | null; phone: string };
/** Customers (anyone signed up who is not staff/owner and not deleted), newest first, with order totals. */
export async function listCustomers(db: CatalogDb, opts: { q?: string; limit?: number; offset?: number } = {}) {
  const where: SQL[] = [notStaff()!, notDeleted()];
  const q = (opts.q ?? "").trim().slice(0, 60);
  if (q) { const like = `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`; where.push(or(ilike(user.name, like), ilike(user.email, like), ilike(customerProfile.phone, like))!); }
  const rows = await db.select({ id: user.id, name: user.name, email: user.email, verified: user.emailVerified, joined: user.createdAt, phone: customerProfile.phone,
    orders: count(shopOrder.id), spent: spentSql, lastOrder: sql<Date | null>`max(${shopOrder.createdAt})`.mapWith(v => v ? new Date(v) : null) })
    .from(user).leftJoin(customerProfile, eq(customerProfile.userId, user.id)).leftJoin(shopOrder, eq(shopOrder.userId, user.id))
    .where(and(...where)).groupBy(user.id, customerProfile.phone).orderBy(desc(user.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
  const [total] = await db.select({ n: count() }).from(user).leftJoin(customerProfile, eq(customerProfile.userId, user.id)).where(and(...where));
  return { rows: rows.map(r => ({ ...r, phone: r.phone ?? "" })) as CustomerRow[], total: Number(total?.n ?? 0) };
}

/** One customer's profile, orders and inquiries (by account email). Null if not a customer. */
export async function getCustomer(db: CatalogDb, id: string) {
  const [u] = await db.select().from(user).where(and(eq(user.id, id), notStaff())).limit(1);
  if (!u) return null;
  const [profile] = await db.select().from(customerProfile).where(eq(customerProfile.userId, id)).limit(1);
  const orders = await db.select({ id: shopOrder.id, code: shopOrder.code, status: shopOrder.status, delivery: shopOrder.deliveryStatus, method: shopOrder.method, paymentType: shopOrder.paymentType,
    total: shopOrder.total, codDue: shopOrder.codDue, collected: shopOrder.codCollectedAt, createdAt: shopOrder.createdAt,
    items: sql<number>`(select coalesce(sum(${orderItem.quantity}), 0) from ${orderItem} where ${orderItem.orderId} = ${shopOrder.id})`.mapWith(Number) })
    .from(shopOrder).where(eq(shopOrder.userId, id)).orderBy(desc(shopOrder.createdAt)).limit(100);
  const inquiries = u.email.endsWith("@" + DELETED_DOMAIN) ? [] : await db.select({ id: lead.id, kind: lead.kind, status: lead.status, subject: lead.subject, message: lead.message, createdAt: lead.createdAt })
    .from(lead).where(sql`lower(${lead.email}) = lower(${u.email})`).orderBy(desc(lead.createdAt)).limit(50);
  const spent = orders.reduce((s, o) => s + (o.status === "paid" ? o.total + (o.collected ? o.codDue : 0) : 0), 0);
  const blockers = orders.filter(isActive).map(o => o.code);
  return { user: u, profile: profile ?? null, orders, inquiries, spent, blockers, deleted: u.email.endsWith("@" + DELETED_DOMAIN) };
}
/** An order still in progress: waiting for payment review, or approved but not delivered/returned yet. */
const isActive = (o: { status: string; delivery: string | null }) => o.status === "pending" || (o.status === "paid" && o.delivery !== "delivered" && o.delivery !== "returned");

/**
 * Delete a customer account. Personal data is erased; the user row stays (as "Deleted customer") only so
 * past orders keep pointing at something for the accounts. Sign-in methods, sessions, 2FA, saved details
 * and inquiry contact details are removed. Refused for staff/owner and while an order is still in progress.
 * by: "self" when the customer deletes their own account, otherwise the admin's user id.
 */
export async function deleteCustomer(db: CatalogDb, id: string, by: { actorId: string; self: boolean; reason?: string }) {
  const c = await getCustomer(db, id);
  if (!c) throw new ProductStoreError("NOT_FOUND");
  if (c.deleted) throw new ProductStoreError("ALREADY_DELETED");
  if (c.blockers.length) throw new ProductStoreError(`ACTIVE_ORDERS:${c.blockers.join(",")}`);
  const oldEmail = c.user.email;
  await db.transaction(async tx => {
    await tx.update(user).set({ name: "Deleted customer", email: `deleted-${id}@${DELETED_DOMAIN}`, emailVerified: false, image: null, twoFactorEnabled: false, updatedAt: new Date() }).where(eq(user.id, id));
    await tx.delete(session).where(eq(session.userId, id));
    await tx.delete(account).where(eq(account.userId, id));
    await tx.delete(twoFactor).where(eq(twoFactor.userId, id));
    await tx.delete(customerProfile).where(eq(customerProfile.userId, id));
    // Orders stay for the accounts (code, items, amounts, dates, transaction id) but lose who/where.
    await tx.update(shopOrder).set({ customerName: "Deleted customer", phone: "", address: "", note: "", payerNumber: "", imageData: null, updatedAt: new Date() }).where(eq(shopOrder.userId, id));
    await tx.update(lead).set({ name: "Deleted customer", phone: "", email: "", message: "[removed at the customer's account deletion]", ipHash: null, updatedAt: new Date() })
      .where(sql`lower(${lead.email}) = lower(${oldEmail})`);
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId: by.self ? null : by.actorId, action: "customer.delete", targetId: id,
      reason: `${by.self ? "customer deleted their own account" : "deleted by admin"}; ${c.orders.length} order(s) kept anonymized${by.reason ? `; ${by.reason.slice(0, 150)}` : ""}` });
  });
}
/** For the admin list header: how many customers there are in total. */
export async function customerCount(db: CatalogDb) {
  const [r] = await db.select({ n: count() }).from(user).where(and(notStaff(), notDeleted())); return Number(r?.n ?? 0);
}
