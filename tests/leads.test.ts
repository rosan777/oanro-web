import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/lib/db/schema";
import { parseLeadInput, ProductInputError } from "../src/lib/product-input";
import { addLeadNote, assignLead, createLead, hashIp, leadCounts, listLeads, setLeadStatus, LEADS_PER_HOUR } from "../src/lib/lead-store";
import { ProductStoreError, type CatalogDb } from "../src/lib/product-store";

const ok = { kind: "general", name: "Rahim", phone: "01712345678", message: "Hello", consent: true };
const bad = (patch: Record<string, unknown>, field: string) => assert.throws(() => parseLeadInput({ ...ok, ...patch }), (e: unknown) => e instanceof ProductInputError && e.field === field, field);
test("inquiry input: consent, a way to reply, bounded fields", () => {
  assert.equal(parseLeadInput(ok).preferredContact, "phone");
  bad({ consent: false }, "consent"); bad({ phone: "", email: "" }, "phone"); bad({ phone: "call me" }, "phone");
  bad({ email: "nope" }, "email"); bad({ name: "" }, "name"); bad({ message: "" }, "message"); bad({ kind: "admin" }, "kind");
  bad({ kind: "product", productSlug: "" }, "productSlug"); bad({ kind: "product", productSlug: "x1", quantity: 0 }, "quantity");
  bad({ kind: "privacy", requestType: "hack" }, "requestType");
  assert.equal(parseLeadInput({ ...ok, kind: "privacy", requestType: "delete" }).subject, "privacy:delete");
  assert.equal(parseLeadInput({ ...ok, phone: "", email: "A@B.com" }).email, "a@b.com");
});

test("leads: snapshot subject, rate limit, no IP stored, inbox actions with audit", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([{ id: "owner", name: "Owner", email: "o@x.com", emailVerified: true }, { id: "rando", name: "R", email: "r@x.com", emailVerified: true }]);
    await db.insert(schema.systemOwner).values({ userId: "owner" });
    const ip = hashIp("203.0.113.9", "secret");
    assert.notEqual(ip, hashIp("203.0.113.9", "other"), "salted"); assert.ok(!ip.includes("203"));
    const id = await createLead(db, parseLeadInput({ ...ok, kind: "restock", productSlug: "forest-knit", size: "M", message: "" }), ip);
    await assert.rejects(createLead(db, parseLeadInput({ ...ok, kind: "product", productSlug: "no-such" }), ip), (e: unknown) => e instanceof ProductStoreError && e.message === "PRODUCT_NOT_FOUND");
    for (let i = 1; i < LEADS_PER_HOUR; i++) await createLead(db, parseLeadInput(ok), ip);
    await assert.rejects(createLead(db, parseLeadInput(ok), ip), (e: unknown) => e instanceof ProductStoreError && e.message === "RATE_LIMITED");
    await createLead(db, parseLeadInput(ok), hashIp("198.51.100.1", "secret")); // a different visitor is fine
    await createLead(db, parseLeadInput(ok), ip, new Date(Date.now() + 3601e3)); // an hour later is fine
    const inbox = await listLeads(db);
    const first = inbox.find(l => l.id === id)!;
    assert.equal(first.subject, "The Forest Knit", "name snapshot from the catalog"); assert.equal(first.size, "M");
    assert.ok(!("ipHash" in first), "inbox never exposes the IP hash");
    await setLeadStatus(db, "owner", id, "contacted");
    await assignLead(db, "owner", id, "owner");
    await assert.rejects(assignLead(db, "owner", id, "rando"), (e: unknown) => e instanceof ProductStoreError && e.message === "INVALID_ASSIGNEE");
    await addLeadNote(db, "owner", id, "Called, will visit Friday");
    await assert.rejects(addLeadNote(db, "owner", id, "   "), (e: unknown) => e instanceof ProductStoreError);
    const after = (await listLeads(db)).find(l => l.id === id)!;
    assert.equal(after.notes[0].author, "Owner"); assert.equal(after.assignedTo, "owner");
    assert.equal((await leadCounts(db)).contacted, 1);
    const audit = await db.select().from(schema.auditEvent);
    assert.deepEqual(audit.map(a => a.action).sort(), ["lead.assign", "lead.note", "lead.status"]);
    assert.ok(audit.every(a => !a.reason.includes("0171")), "audit never stores customer phone numbers");
  } finally { await pg.close(); }
});
