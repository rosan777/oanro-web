import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { createAuth } from "../src/lib/auth-factory";
import * as schema from "../src/lib/db/schema";

test("resend verification: neutral answer for everyone, mail only for an unverified account, rate limited", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const sent: { to: string; subject: string }[] = [];
    const auth = createAuth(db, { baseURL: "http://localhost:3000", secret: "test-only-".repeat(8), sendMail: async (to, subject) => { sent.push({ to, subject }); } });
    const post = (path: string, body: object) => auth.handler(new Request(`http://localhost:3000/api/auth/${path}`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify(body),
    }));
    const password = "Test-password-123456";

    // Two accounts: one stays unverified, one is verified.
    await post("sign-up/email", { email: "unverified@example.test", password, name: "Unverified" });
    await post("sign-up/email", { email: "verified@example.test", password, name: "Verified" });
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.email, "verified@example.test"));
    sent.length = 0;

    // Sign-in with the right password but no verification: 403 with a code the form can recognise.
    const blocked = await post("sign-in/email", { email: "unverified@example.test", password });
    assert.equal(blocked.status, 403);
    assert.equal((await blocked.json() as { code?: string }).code, "EMAIL_NOT_VERIFIED");
    assert.equal(sent.length, 1); // sendOnSignIn: a fresh link goes out on that attempt
    sent.length = 0;

    // Resend: the answer is identical for unverified, verified and unknown addresses.
    const answers: string[] = [];
    for (const email of ["unverified@example.test", "verified@example.test", "nobody@example.test"]) {
      const response = await post("send-verification-email", { email, callbackURL: "/account" });
      assert.equal(response.status, 200);
      answers.push(await response.text());
    }
    assert.equal(new Set(answers).size, 1);
    // ...but only the unverified account actually receives mail.
    assert.deepEqual(sent.map(m => m.to), ["unverified@example.test"]);

    // 3 requests per 60 s is the server limit; the 4th is refused.
    const fourth = await post("send-verification-email", { email: "unverified@example.test" });
    assert.equal(fourth.status, 429);
  } finally { await pg.close(); }
});
