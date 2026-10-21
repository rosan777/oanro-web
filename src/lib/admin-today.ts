// Numbers and to-do items for the admin side menu and the Today page. Server-only.
import "server-only";
import { and, asc, desc, eq, gte, isNull, isNotNull, lte, sql } from "drizzle-orm";
import { auditEvent, lead, product, shopOrder, user } from "./db/schema";
import { DEFAULT_LOW_STOCK } from "./report-store";
import type { CatalogDb } from "./product-store";
import type { Access } from "./rbac";
import type { AdminCounts } from "./admin-menu";

const canStock = (a: Access) => a.owner || ["products.manage", "reports.read"].some(p => a.permissions.has(p as never));
const lowStockWhere = and(isNull(product.archivedAt), eq(product.status, "published"), isNotNull(product.stock),
  lte(product.stock, sql`coalesce(${product.lowStockAt}, ${DEFAULT_LOW_STOCK})`));
/** Pending payments the person may see: COD orders only with cod.manage. */
const pendingWhere = (a: Access) => and(eq(shopOrder.status, "pending"), a.permissions.has("cod.manage") ? undefined : eq(shopOrder.paymentType, "prepaid"));

export async function adminCounts(db: CatalogDb, access: Access): Promise<AdminCounts> {
  const has = (p: Parameters<typeof access.permissions.has>[0]) => access.permissions.has(p);
  const [orders, leads, low] = await Promise.all([
    has("orders.read") ? db.select({ n: sql<number>`count(*)` }).from(shopOrder).where(pendingWhere(access)) : null,
    has("leads.read") ? db.select({ n: sql<number>`count(*)` }).from(lead).where(eq(lead.status, "new")) : null,
    canStock(access) ? db.select({ n: sql<number>`count(*)` }).from(product).where(lowStockWhere) : null,
  ]);
  return { orders: Number(orders?.[0]?.n ?? 0), leads: Number(leads?.[0]?.n ?? 0), lowStock: Number(low?.[0]?.n ?? 0) };
}

/** Start of today in Bangladesh time (UTC+6), as a Date. */
function dhakaDayStart() {
  const shift = 6 * 3_600_000, now = Date.now();
  return new Date(Math.floor((now + shift) / 86_400_000) * 86_400_000 - shift);
}

export async function todayData(db: CatalogDb, access: Access) {
  const has = (p: Parameters<typeof access.permissions.has>[0]) => access.permissions.has(p);
  const [payments, inquiries, lowStock, paid, activity] = await Promise.all([
    has("orders.read") ? db.select({ id: shopOrder.id, code: shopOrder.code, name: shopOrder.customerName, total: shopOrder.total, method: shopOrder.method, trxId: shopOrder.trxId, type: shopOrder.paymentType, at: shopOrder.createdAt })
      .from(shopOrder).where(pendingWhere(access)).orderBy(asc(shopOrder.createdAt)).limit(10) : [],
    has("leads.read") ? db.select({ id: lead.id, name: lead.name, subject: lead.subject, kind: lead.kind, at: lead.createdAt })
      .from(lead).where(eq(lead.status, "new")).orderBy(asc(lead.createdAt)).limit(6) : [],
    canStock(access) ? db.select({ id: product.id, name: product.nameEn, stock: product.stock }).from(product).where(lowStockWhere).orderBy(asc(product.stock)).limit(8) : [],
    has("reports.read") ? db.select({ sum: sql<number>`coalesce(sum(${shopOrder.total}), 0)`, n: sql<number>`count(*)` }).from(shopOrder)
      .where(and(eq(shopOrder.status, "paid"), gte(shopOrder.reviewedAt, dhakaDayStart()))) : null,
    has("audit.read") ? db.select({ id: auditEvent.id, action: auditEvent.action, reason: auditEvent.reason, at: auditEvent.createdAt, name: user.name })
      .from(auditEvent).leftJoin(user, eq(user.id, auditEvent.actorId)).orderBy(desc(auditEvent.createdAt)).limit(6) : [],
  ]);
  return { payments, inquiries, lowStock, paidToday: paid ? { total: Number(paid[0]?.sum ?? 0), count: Number(paid[0]?.n ?? 0) } : null, activity };
}
