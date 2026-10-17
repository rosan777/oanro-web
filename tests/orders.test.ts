import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { parseProductInput, ProductInputError } from "../src/lib/product-input";
import { createProduct, ProductStoreError, type CatalogDb } from "../src/lib/product-store";
import { parseOrderInput, normalizePhone } from "../src/lib/order-input";
import { createOrder, getPaymentNumbers, listMyOrders, listOrders, orderCounts, reviewOrder, setPaymentNumbers } from "../src/lib/order-store";

const code = (e: unknown, c: string) => e instanceof ProductStoreError && e.message === c;
const order = (patch: Record<string, unknown> = {}) => parseOrderInput({ items: [{ slug: "river-cap", size: "M", quantity: 2 }], method: "bkash",
  payerNumber: "01712345678", trxId: "8f7a3k9d2x", name: "Rahim Uddin", phone: "+8801712345678", address: "House 1, Road 2, Dhaka", expectedTotal: 2000, ...patch });

test("checkout input is validated and normalized", () => {
  const o = order();
  assert.equal(o.trxId, "8F7A3K9D2X"); assert.equal(o.phone, "01712345678");
  assert.equal(normalizePhone("017-1234 5678", "phone"), "01712345678");
  const bad = (patch: Record<string, unknown>, field: string) => assert.throws(() => order(patch), (e: unknown) => e instanceof ProductInputError && e.field === field, field);
  bad({ trxId: "" }, "trxId"); bad({ trxId: "abc" }, "trxId"); bad({ method: "card" }, "method");
  bad({ phone: "12345" }, "phone"); bad({ payerNumber: "01212345678" }, "payerNumber"); bad({ address: "short" }, "address");
  bad({ items: [] }, "items"); bad({ items: [{ slug: "x y", size: "M", quantity: 1 }] }, "items"); bad({ items: [{ slug: "ok", size: "M", quantity: 11 }] }, "items");
  assert.equal(order({ items: [{ slug: "a-b", size: "M", quantity: 6 }, { slug: "a-b", size: "M", quantity: 6 }] }).items[0].quantity, 10, "duplicates merge, capped at 10");
});

test("orders reserve stock, approval keeps it, rejection returns it; duplicates and abuse are refused", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([{ id: "owner-1", name: "Owner", email: "o@example.com", emailVerified: true }, { id: "cust-1", name: "Rahim", email: "r@example.com", emailVerified: true }]);
    const pid = await createProduct(db, "owner-1", parseProductInput({ slug: "river-cap", nameEn: "River Cap", price: "1000", stock: "3", sizes: "M, L", status: "published" }), null);
    await createProduct(db, "owner-1", parseProductInput({ slug: "free-cap", nameEn: "Untracked", price: "500", sizes: "M", status: "published" }), null);
    const stock = async () => (await db.select({ s: schema.product.stock }).from(schema.product).where(eq(schema.product.id, pid)))[0].s;

    await assert.rejects(createOrder(db, { id: "cust-1" }, order(), null), (e: unknown) => code(e, "METHOD_UNAVAILABLE"), "no number configured yet");
    await setPaymentNumbers(db, "owner-1", { bkash: "01811111111", nagad: "" });
    assert.deepEqual(await getPaymentNumbers(db), { bkash: "01811111111", nagad: "" });
    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ method: "nagad" }), null), (e: unknown) => code(e, "METHOD_UNAVAILABLE"));

    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ expectedTotal: 1 }), null), (e: unknown) => code(e, "PRICE_CHANGED"), "browser price must match");
    const a = await createOrder(db, { id: "cust-1" }, order(), "data:image/png;base64,iVBORw0KGgo=");
    assert.equal(await stock(), 1, "2 of 3 reserved");
    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ trxId: "8F7A3K9D2X" }), null), (e: unknown) => code(e, "TRX_USED"), "same transaction ID twice");
    assert.equal(await stock(), 1, "failed order rolled back its reservation");
    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ trxId: "OTHER12345" }), null), (e: unknown) => code(e, "OUT_OF_STOCK:river-cap:1"), "only 1 left, asked for 2; the error says how many are left");
    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ trxId: "SIZE123456", items: [{ slug: "river-cap", size: "XXL", quantity: 1 }], expectedTotal: 1000 }), null), (e: unknown) => code(e, "UNAVAILABLE:river-cap"));

    const b = await createOrder(db, { id: "cust-1" }, order({ trxId: "SECOND1234", items: [{ slug: "river-cap", size: "L", quantity: 1 }, { slug: "free-cap", size: "M", quantity: 4 }], expectedTotal: 3000 }), null);
    assert.equal(await stock(), 0);
    assert.equal((await orderCounts(db)).pending, 2);

    await reviewOrder(db, "owner-1", a.id, "approve");
    await assert.rejects(reviewOrder(db, "owner-1", a.id, "reject", "late"), (e: unknown) => code(e, "NOT_PENDING"), "can't reject a paid order");
    await assert.rejects(reviewOrder(db, "owner-1", b.id, "reject", ""), (e: unknown) => code(e, "REASON_REQUIRED"));
    await reviewOrder(db, "owner-1", b.id, "reject", "Transaction ID not found");
    assert.equal(await stock(), 1, "rejection returns only the reserved unit; untracked items untouched");

    const mine = await listMyOrders(db, "cust-1");
    assert.deepEqual(mine.map(o => o.status).sort(), ["paid", "rejected"]);
    assert.equal(mine.find(o => o.id === b.id)?.rejectReason, "Transaction ID not found");
    assert.equal(mine.find(o => o.id === a.id)?.hasScreenshot, true);
    assert.ok(!("imageData" in mine[0]), "screenshots are never sent in lists");
    const admin = await listOrders(db, { includeCod: true });
    assert.equal(admin[0].accountName, "Rahim"); assert.equal(admin.find(o => o.id === a.id)?.total, 2120); // 2000 + default ৳120 delivery charge
    assert.deepEqual((await listMyOrders(db, "owner-1")), [], "customers only see their own orders");

    for (let i = 0; i < 5; i++) await createOrder(db, { id: "cust-1" }, order({ trxId: `SPAM00000${i}`, items: [{ slug: "free-cap", size: "M", quantity: 1 }], expectedTotal: 500 }), null);
    await assert.rejects(createOrder(db, { id: "cust-1" }, order({ trxId: "SPAM000009", items: [{ slug: "free-cap", size: "M", quantity: 1 }], expectedTotal: 500 }), null), (e: unknown) => code(e, "TOO_MANY_PENDING"));

    const trail = (await db.select().from(schema.auditEvent)).map(e => e.action);
    for (const a of ["payment.numbers", "order.create", "order.approve", "order.reject"]) assert.ok(trail.includes(a), a);
    const managerPerms = (await db.select().from(schema.rolePermission).where(eq(schema.rolePermission.roleId, "manager"))).map(r => r.permission);
    assert.ok(managerPerms.includes("orders.manage") && managerPerms.includes("orders.read"), "migration grants Manager order access");
    const salesPerms = (await db.select().from(schema.rolePermission).where(eq(schema.rolePermission.roleId, "sales"))).map(r => r.permission);
    assert.ok(salesPerms.includes("orders.read") && !salesPerms.includes("orders.manage"), "Sales can view, not approve");
  } finally { await pg.close(); }
});

test("delivery tracking moves forward only, records a customer timeline, and a return restocks", async () => {
  const { updateDelivery } = await import("../src/lib/order-store");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([{ id: "owner-1", name: "Owner", email: "o@example.com", emailVerified: true }, { id: "cust-1", name: "Rahim", email: "r@example.com", emailVerified: true }]);
    const pid = await createProduct(db, "owner-1", parseProductInput({ slug: "river-cap", nameEn: "River Cap", price: "1000", stock: "5", sizes: "M", status: "published" }), null);
    await setPaymentNumbers(db, "owner-1", { bkash: "01811111111", nagad: "" });
    const stock = async () => (await db.select({ s: schema.product.stock }).from(schema.product).where(eq(schema.product.id, pid)))[0].s;
    const place = (trx: string) => createOrder(db, { id: "cust-1" }, order({ trxId: trx, items: [{ slug: "river-cap", size: "M", quantity: 1 }], expectedTotal: 1000 }), null);
    const a = await place("DELIVER001"), b = await place("RETURN0002");
    await assert.rejects(updateDelivery(db, "owner-1", a.id, "shipped", { courier: "Pathao" }), (e: unknown) => code(e, "INVALID_STEP"), "can't ship an unpaid order");
    await reviewOrder(db, "owner-1", a.id, "approve"); await reviewOrder(db, "owner-1", b.id, "approve");
    await assert.rejects(updateDelivery(db, "owner-1", a.id, "shipped"), (e: unknown) => code(e, "COURIER_REQUIRED"));
    await assert.rejects(updateDelivery(db, "owner-1", a.id, "out_for_delivery"), (e: unknown) => code(e, "INVALID_STEP"), "can't skip handing to courier");
    await updateDelivery(db, "owner-1", a.id, "shipped", { courier: "Pathao Courier", trackingCode: "PX-123" });
    await updateDelivery(db, "owner-1", a.id, "out_for_delivery");
    await updateDelivery(db, "owner-1", a.id, "delivered", { note: "Received by customer" });
    await assert.rejects(updateDelivery(db, "owner-1", a.id, "returned", { note: "late" }), (e: unknown) => code(e, "INVALID_STEP"), "delivered is final");
    const mine = (await listMyOrders(db, "cust-1")).find(o => o.id === a.id)!;
    assert.equal(mine.deliveryStatus, "delivered"); assert.equal(mine.courier, "Pathao Courier"); assert.equal(mine.trackingCode, "PX-123");
    assert.deepEqual(mine.events.map(e => e.stage), ["placed", "paid", "shipped", "out_for_delivery", "delivered"]);
    assert.equal(mine.events[2].note, "Pathao Courier · #PX-123");
    assert.equal(await stock(), 3);
    await updateDelivery(db, "owner-1", b.id, "shipped", { courier: "RedX" });
    await assert.rejects(updateDelivery(db, "owner-1", b.id, "returned", { note: "" }), (e: unknown) => code(e, "REASON_REQUIRED"));
    await updateDelivery(db, "owner-1", b.id, "returned", { note: "Customer not reachable" });
    assert.equal(await stock(), 4, "returned parcel goes back into stock");
    assert.ok((await db.select().from(schema.auditEvent)).some(e => e.action === "order.delivery"));
  } finally { await pg.close(); }
});

test("customer profile is validated, saved per user and prefills checkout", async () => {
  const { parseProfile, saveProfile, getProfile, fullAddress } = await import("../src/lib/profile-store");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({ id: "cust-1", name: "Rahim", email: "r@example.com", emailVerified: true });
    assert.equal((await getProfile(db, "cust-1")).phone, "", "empty before first save");
    const bad = (patch: Record<string, unknown>, field: string) => assert.throws(() => parseProfile({ name: "Rahim Uddin", ...patch }), (e: unknown) => e instanceof ProductInputError && e.field === field, field);
    bad({ name: "R" }, "name"); bad({ phone: "123" }, "phone"); bad({ postcode: "12a4" }, "postcode"); bad({ company: "x".repeat(101) }, "company");
    await saveProfile(db, "cust-1", parseProfile({ name: "Rahim Uddin", phone: "+8801712345678", address: "House 5, Road 3", area: "Dhanmondi", city: "Dhaka", postcode: "1209", permanentAddress: "Village X, Cumilla" }));
    const p = await getProfile(db, "cust-1");
    assert.equal(p.name, "Rahim Uddin"); assert.equal(p.phone, "01712345678"); assert.equal(p.permanentAddress, "Village X, Cumilla");
    assert.equal(fullAddress(p), "House 5, Road 3, Dhanmondi, Dhaka 1209");
    await saveProfile(db, "cust-1", parseProfile({ name: "Rahim U.", phone: "", city: "Sylhet" }));
    assert.equal((await getProfile(db, "cust-1")).city, "Sylhet"); assert.equal((await getProfile(db, "cust-1")).address, "", "fields can be cleared");
  } finally { await pg.close(); }
});

test("cash on delivery: only the delivery charge is prepaid, limit applies, hidden without cod.manage, revenue counts after cash is received", async () => {
  const { getCheckoutRules, markCodCollected, updateDelivery } = await import("../src/lib/order-store");
  const { profitReport, salesReport } = await import("../src/lib/report-store");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([{ id: "owner-1", name: "Owner", email: "o@example.com", emailVerified: true }, { id: "cust-1", name: "Rahim", email: "r@example.com", emailVerified: true }]);
    await createProduct(db, "owner-1", parseProductInput({ slug: "river-cap", nameEn: "River Cap", price: "1000", stock: "10", sizes: "M", status: "published" }), null);
    await setPaymentNumbers(db, "owner-1", { bkash: "01811111111", nagad: "" });
    assert.deepEqual(await getCheckoutRules(db), { deliveryCharge: 120, codLimit: 5000 }, "migration seeds ৳120 delivery and ৳5,000 COD limit");
    const cod = (patch: Record<string, unknown> = {}) => order({ paymentType: "cod", items: [{ slug: "river-cap", size: "M", quantity: 2 }], ...patch });

    await assert.rejects(createOrder(db, { id: "cust-1" }, cod({ items: [{ slug: "river-cap", size: "M", quantity: 6 }], expectedTotal: 6000 }), null), (e: unknown) => code(e, "COD_LIMIT"), "above ৳5,000");
    const c = await createOrder(db, { id: "cust-1" }, cod(), null);
    const [row] = await db.select().from(schema.shopOrder).where(eq(schema.shopOrder.id, c.id));
    assert.equal(row.total, 120, "only the delivery charge is paid now"); assert.equal(row.codDue, 2000); assert.equal(row.paymentType, "cod");

    assert.equal((await listOrders(db, { includeCod: false })).length, 0, "COD hidden without cod.manage");
    assert.equal((await listOrders(db, { includeCod: true })).length, 1);
    const mine = (await listMyOrders(db, "cust-1"))[0] as Record<string, unknown>;
    assert.ok(!("shippingCost" in mine) && !("codCollectedBy" in mine), "internal fields stay private");

    await reviewOrder(db, "owner-1", c.id, "approve");
    await assert.rejects(markCodCollected(db, "owner-1", c.id), (e: unknown) => code(e, "INVALID_STEP"), "not delivered yet");
    let sales = await salesReport(db, "30d");
    assert.equal(sales.totals.revenue, 0, "COD is not revenue before the cash arrives");
    assert.equal(sales.pendingCod.amount, 2000); assert.equal(sales.totals.deliveryIncome, 120);

    await updateDelivery(db, "owner-1", c.id, "shipped", { courier: "Pathao Courier" });
    await updateDelivery(db, "owner-1", c.id, "out_for_delivery");
    await updateDelivery(db, "owner-1", c.id, "delivered");
    await markCodCollected(db, "owner-1", c.id);
    await assert.rejects(markCodCollected(db, "owner-1", c.id), (e: unknown) => code(e, "INVALID_STEP"), "only once");
    sales = await salesReport(db, "30d");
    assert.equal(sales.totals.revenue, 2000); assert.equal(sales.pendingCod.amount, 0);
    assert.equal(sales.methods.find(m => m.method === "cod")?.amount, 2000);
    assert.equal(sales.methods.find(m => m.method === "bkash")?.amount, 120, "bKash received only the delivery charge");
    const profit = await profitReport(db, "30d");
    assert.equal(profit.totals.delivery, 120); assert.equal(profit.totals.net, 2000, "no cost price; courier bill not entered, so it is assumed equal to the ৳120 delivery charge");
  } finally { await pg.close(); }
});
