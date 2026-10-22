import { randomUUID } from "node:crypto";
import { desc, eq, isNull } from "drizzle-orm";
import { authorize, noStore } from "@/lib/admin-api";
import { auditEvent, newsletterSubscriber, orderDiscount, shopOrder } from "@/lib/db/schema";
import { listCustomers } from "@/lib/customer-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

// Excel-friendly CSV: UTF-8 BOM (Bangla shows correctly), quoted cells, and a leading ' on cells that
// start with = + - @ so a spreadsheet never runs them as formulas.
const cell = (v: unknown) => { let s = v instanceof Date ? v.toISOString() : String(v ?? ""); if (/^[=+\-@]/.test(s)) s = `'${s}`; return `"${s.replace(/"/g, '""')}"`; };
const csv = (rows: unknown[][]) => "﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n");

/** /api/admin/export?type=orders|customers|newsletter — each needs its own permission; every export is logged. */
export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "orders" && type !== "customers" && type !== "newsletter") return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
  // Orders/customers: the export permission AND access to that data. Newsletter: the newsletter permission.
  const who = await authorize(request, type === "newsletter" ? "newsletter.read" : "data.export");
  const allowed = who && (type === "newsletter" || (type === "orders" ? who.access.permissions.has("orders.read") || who.access.permissions.has("cod.manage") : who.access.permissions.has("customers.read")));
  if (!who || !allowed) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const db = catalogDb();
  let rows: unknown[][];
  if (type === "orders") {
    const cod = who.access.permissions.has("cod.manage"), prepaid = who.access.permissions.has("orders.read");
    const list = await db.select({ code: shopOrder.code, createdAt: shopOrder.createdAt, status: shopOrder.status, delivery: shopOrder.deliveryStatus, paymentType: shopOrder.paymentType, method: shopOrder.method,
      total: shopOrder.total, codDue: shopOrder.codDue, deliveryCharge: shopOrder.deliveryCharge, area: shopOrder.deliveryArea, discountCode: orderDiscount.code, discount: orderDiscount.amount, name: shopOrder.customerName, phone: shopOrder.phone,
      address: shopOrder.address, courier: shopOrder.courier, trackingCode: shopOrder.trackingCode, refund: shopOrder.refundAmount })
      .from(shopOrder).leftJoin(orderDiscount, eq(orderDiscount.orderId, shopOrder.id)).orderBy(desc(shopOrder.createdAt)).limit(5000);
    rows = [["Order", "Placed", "Payment status", "Delivery", "Type", "Method", "Paid online (৳)", "Cash on delivery (৳)", "Delivery area", "Delivery charge (৳)", "Discount code", "Discount (৳)", "Customer", "Phone", "Address", "Courier", "Tracking", "Refund (৳)"],
      ...list.filter(o => o.paymentType === "cod" ? cod : prepaid).map(o => [o.code, o.createdAt, o.status, o.delivery ?? "", o.paymentType, o.method, o.total, o.codDue, o.area === "outside" ? "Outside Dhaka" : "Inside Dhaka", o.deliveryCharge, o.discountCode ?? "", o.discount ?? 0, o.name, o.phone, o.address, o.courier ?? "", o.trackingCode ?? "", o.refund])];
  } else if (type === "customers") {
    const { rows: list } = await listCustomers(db, { limit: 5000 });
    rows = [["Name", "Email", "Verified", "Phone", "Joined", "Orders", "Total spent (৳)", "Last order"], ...list.map(c => [c.name, c.email, c.verified ? "yes" : "no", c.phone, c.joined, c.orders, c.spent, c.lastOrder ?? ""])];
  } else {
    const list = await db.select().from(newsletterSubscriber).where(isNull(newsletterSubscriber.unsubscribedAt)).orderBy(desc(newsletterSubscriber.consentAt));
    rows = [["Email", "Language", "Signed up"], ...list.map(s => [s.email, s.locale, s.consentAt])];
  }
  await db.insert(auditEvent).values({ id: randomUUID(), actorId: who.userId, action: "export", targetId: type ?? "", reason: `${rows.length - 1} rows` });
  return new Response(csv(rows), { headers: { ...noStore, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="oanro-${type}-${new Date().toISOString().slice(0, 10)}.csv"` } });
}
