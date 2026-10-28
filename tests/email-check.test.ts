import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuth } from "../src/lib/auth-factory";
import { suggestEmailFix } from "../src/lib/email-typo";
import { checkMailDomain, type DnsLookup } from "../src/lib/email-domain";
import * as schema from "../src/lib/db/schema";

test("typo hint: suggests a popular domain, never rewrites valid or unusual addresses", () => {
  assert.equal(suggestEmailFix("owner@gmaill.com"), "owner@gmail.com");
  assert.equal(suggestEmailFix("a@gmail.con"), "a@gmail.com");
  assert.equal(suggestEmailFix("a@hotmial.com"), "a@hotmail.com"); // swapped letters
  assert.equal(suggestEmailFix("  Mixed.Case@GMAILL.com "), "Mixed.Case@gmail.com"); // local part keeps its case
  // nothing to suggest
  assert.equal(suggestEmailFix("a@gmail.com"), null);
  assert.equal(suggestEmailFix("a+shop@gmail.com"), null); // plus-addressing is valid
  assert.equal(suggestEmailFix("owner@my-company.com.bd"), null); // custom domain
  assert.equal(suggestEmailFix("a@mail.com"), null); // real provider, one letter from gmail.com
  assert.equal(suggestEmailFix("not-an-email"), null);
  assert.equal(suggestEmailFix("@gmail.com"), null);
});

/** A fake DNS: every call answers from the table, or throws the given error code. */
const fakeDns = (table: { mx?: { exchange: string; priority: number }[] | string; a?: string[] | string; aaaa?: string[] | string }): DnsLookup => {
  const answer = <T,>(value: T[] | string | undefined) => async () => { if (typeof value === "string") throw Object.assign(new Error(value), { code: value }); if (!value) throw Object.assign(new Error("ENODATA"), { code: "ENODATA" }); return value; };
  return { resolveMx: answer(table.mx), resolve4: answer(table.a), resolve6: answer(table.aaaa) } as unknown as DnsLookup;
};

test("mail domain: MX, address-record fallback, Null MX, missing domain, temporary failures", async () => {
  assert.equal(await checkMailDomain("example.test", fakeDns({ mx: [{ exchange: "mx.example.test", priority: 10 }] })), "ok");
  assert.equal(await checkMailDomain("example.test", fakeDns({ a: ["192.0.2.1"] })), "ok"); // no MX, A record fallback
  assert.equal(await checkMailDomain("example.test", fakeDns({ aaaa: ["2001:db8::1"] })), "ok");
  assert.equal(await checkMailDomain("example.test", fakeDns({ mx: [{ exchange: "", priority: 0 }] })), "no-mail"); // Null MX as Node reports it
  assert.equal(await checkMailDomain("example.test", fakeDns({ mx: [{ exchange: ".", priority: 0 }] })), "no-mail");
  assert.equal(await checkMailDomain("gone.test", fakeDns({ mx: "ENOTFOUND", a: "ENOTFOUND", aaaa: "ENOTFOUND" })), "no-mail");
  assert.equal(await checkMailDomain("empty.test", fakeDns({})), "no-mail"); // exists but nothing to deliver to
  assert.equal(await checkMailDomain("x.test", fakeDns({ mx: "ESERVFAIL" })), "unknown"); // temporary: never blocks
  assert.equal(await checkMailDomain("x.test", fakeDns({ mx: "ETIMEOUT" })), "unknown");
  assert.equal(await checkMailDomain("localhost", fakeDns({})), "no-mail"); // no dot
  const slow = { resolveMx: () => new Promise(() => {}), resolve4: async () => [], resolve6: async () => [] } as unknown as DnsLookup;
  assert.equal(await checkMailDomain("slow.test", slow, 30), "unknown"); // timeout
});

test("sign-up hook: refuses a domain that cannot receive mail, accepts the rest, leaves sign-in alone", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const asked: string[] = [];
    const auth = createAuth(db, {
      baseURL: "http://localhost:3000", secret: "test-only-".repeat(8), sendMail: async () => {},
      checkEmailDomain: async domain => { asked.push(domain); return domain === "gmaill.test" ? "no-mail" : domain === "flaky.test" ? "unknown" : "ok"; },
    });
    const post = (path: string, body: object) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify(body),
    }));
    const base = { password: "Test-password-123456", name: "Customer", callbackURL: "/account" };

    let response = await post("sign-up/email", { ...base, email: "typo@gmaill.test" });
    assert.equal(response.status, 400);
    assert.match(await response.text(), /EMAIL_DOMAIN_CANNOT_RECEIVE_MAIL/);
    assert.equal((await db.select().from(schema.user)).length, 0); // nothing was created

    response = await post("sign-up/email", { ...base, email: "plus+tag@Example.test" }); // plus-address and mixed case are fine
    assert.equal(response.status, 200);
    response = await post("sign-up/email", { ...base, email: "temp@flaky.test" }); // temporary DNS trouble never blocks
    assert.equal(response.status, 200);

    asked.length = 0;
    await post("sign-in/email", { email: "typo@gmaill.test", password: base.password });
    await post("request-password-reset", { email: "typo@gmaill.test", redirectTo: "/reset-password" });
    assert.deepEqual(asked, []); // DNS is only consulted on sign-up
  } finally { await pg.close(); }
});
