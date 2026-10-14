import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuth } from "../src/lib/auth-factory";
import { bootstrapOwner } from "../src/lib/db/bootstrap-owner";
import * as schema from "../src/lib/db/schema";

test("migrations, verified signup, session, reset, owner and audit boundaries", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    await migrate(db, { migrationsFolder: "drizzle" }); // replay must be harmless
    const messages: string[] = [];
    const auth = createAuth(db, { baseURL: "http://localhost:3000", secret: "test-only-".repeat(8), sendMail: async (_to, _subject, body) => { messages.push(body); } });
    const request = (path: string, body?: object, cookie?: string) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined,
    }));
    const credentials = { email: "customer@example.test", password: "Test-password-123456" };
    let response = await request("sign-up/email", { ...credentials, name: "Customer", role: "owner", callbackURL: "/account" });
    assert.equal(response.status, 200);
    const customer = (await db.select().from(schema.user))[0];
    assert.equal(customer.emailVerified, false);
    assert.equal((await db.select().from(schema.systemOwner)).length, 0);
    const stored = (await db.select().from(schema.account))[0];
    assert.ok(stored.password && stored.password !== credentials.password);
    response = await request("sign-in/email", credentials);
    assert.equal(response.status, 403);
    const connection = { query: async (sql: string, values?: string[]) => pg.query(sql, values) };
    await assert.rejects(bootstrapOwner(connection, customer.id, "test"), /Verified/);
    const link = messages[0].match(/https?:\/\/\S+/)![0];
    response = await auth.handler(new Request(link));
    assert.ok(response.status < 400);
    response = await request("sign-in/email", credentials);
    assert.equal(response.status, 200);
    const cookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    assert.ok(cookie.includes("session_token"));
    assert.ok(response.headers.get("set-cookie")?.includes("HttpOnly"));
    assert.equal((await (await request("get-session", undefined, cookie)).json()).user.id, customer.id);
    assert.equal(await (await request("get-session", undefined, "better-auth.session_token=forged")).json(), null);
    await request("request-password-reset", { email: credentials.email, redirectTo: "/reset-password" });
    const resetURL = messages.at(-1)!.match(/https?:\/\/\S+/)![0];
    const token = new URL(resetURL).pathname.split("/").at(-1)!;
    response = await request("reset-password", { token, newPassword: "Changed-password-123456" });
    assert.equal(response.status, 200);
    assert.equal(await (await request("get-session", undefined, cookie)).json(), null);
    response = await request("sign-in/email", { ...credentials, password: "Changed-password-123456" });
    assert.equal(response.status, 200);
    const newCookie = response.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
    await request("sign-out", {}, newCookie);
    assert.equal(await (await request("get-session", undefined, newCookie)).json(), null);
    // A failed audit insert must also roll back the ownership grant.
    const failingAudit = { query: async (sql: string, values?: string[]) => {
      if (sql.startsWith("INSERT INTO audit_event")) throw new Error("simulated audit failure");
      return pg.query(sql, values);
    } };
    await assert.rejects(bootstrapOwner(failingAudit, customer.id, "test rollback"), /audit failure/);
    assert.equal((await db.select().from(schema.systemOwner)).length, 0);
    await bootstrapOwner(connection, customer.id, "Verified owner setup in test");
    assert.equal((await db.select().from(schema.auditEvent)).length, 1);
    await assert.rejects(bootstrapOwner(connection, customer.id, "again"), /already/);
    assert.equal((await db.select().from(schema.auditEvent)).length, 1);
    await assert.rejects(pg.query("UPDATE audit_event SET reason = 'tampered'"));
    assert.equal((await db.select().from(schema.auditEvent))[0].reason, "Verified owner setup in test");
    // Earlier login attempts have consumed the built-in sensitive-route limit.
    assert.equal((await request("sign-in/email", credentials)).status, 429);
    await pg.exec("DELETE FROM auth_rate_limit");
    const csrf = await auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.invalid" }, body: JSON.stringify(credentials) }));
    assert.equal(csrf.status, 403);
    // M2.2 migration: DB-controlled section visibility and approved news integrity.
    await pg.query("INSERT INTO website_section (code, enabled, display_order, updated_by) VALUES ($1, true, 1, $2)", ["caps", customer.id]);
    assert.equal((await db.select().from(schema.websiteSection))[0].enabled, true);
    await assert.rejects(pg.query("INSERT INTO website_section (code, enabled, display_order, updated_by) VALUES ('caps', false, 1, $1)", [customer.id]));
    await pg.query("INSERT INTO pulse_story (id, publisher, headline, url, approved_by, visible, rights_confirmed) VALUES ('story-1', 'Verified Example', 'Reviewed headline', 'https://example.com/story', $1, true, true)", [customer.id]);
    await assert.rejects(pg.query("INSERT INTO pulse_story (id, publisher, headline, url, approved_by, visible, rights_confirmed) VALUES ('story-2', 'Duplicate', 'Headline', 'https://example.com/story', $1, true, true)", [customer.id]));
    assert.equal((await db.select().from(schema.pulseStory))[0].rightsConfirmed, true);
    await pg.query("UPDATE pulse_story SET visible = false WHERE id = 'story-1'");
    assert.equal((await db.select().from(schema.pulseStory))[0].visible, false);
  } finally { await pg.close(); }
});
