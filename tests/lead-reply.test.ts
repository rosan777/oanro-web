// Email replies to customer inquiries: input limits, escaping, and what gets recorded (or not) after sending.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { parseLeadInput, ProductInputError } from "../src/lib/product-input";
import { createLead, listLeads } from "../src/lib/lead-store";
import {
  cleanReply,
  composeReply,
  DEFAULT_SIGNOFF,
  getReplySignoff,
  replyToLead,
  type SendMail,
} from "../src/lib/lead-reply";
import { ProductStoreError, type CatalogDb } from "../src/lib/product-store";

const reply = {
  subject: "Re: Your message to OANRO",
  greeting: "Dear Rahim,",
  body: "Thanks for writing. Yes, the sweater comes in size M.",
  signoff: "Best regards,\nRosan, OANRO",
};
const badField = (patch: Record<string, unknown>, field: string) =>
  assert.throws(
    () => cleanReply({ ...reply, ...patch }),
    (e: unknown) => e instanceof ProductInputError && e.field === field,
    field,
  );

test("reply input: bounded subject, greeting, message and sign-off", () => {
  assert.deepEqual(cleanReply({ ...reply, subject: "  Re:   hello  " }).subject, "Re: hello");
  badField({ subject: "Hi" }, "subject");
  badField({ subject: "x".repeat(151) }, "subject");
  badField({ greeting: "x".repeat(121) }, "greeting");
  badField({ body: "short" }, "body");
  badField({ body: "x".repeat(5001) }, "body");
  badField({ signoff: "x".repeat(301) }, "signoff");
  assert.throws(() => cleanReply(null), ProductInputError);
});

test("reply email: greeting, message and sign-off in order; HTML is escaped", () => {
  const m = composeReply({ ...reply, body: "Price is <b>৳599</b> & stock is fine." });
  assert.equal(
    m.text,
    "Dear Rahim,\n\nPrice is <b>৳599</b> & stock is fine.\n\nBest regards,\nRosan, OANRO",
  );
  assert.ok(m.html.includes("&lt;b&gt;৳599&lt;/b&gt; &amp; stock"));
  assert.ok(!m.html.includes("<b>"));
  assert.ok(!composeReply({ ...reply, greeting: "" }).text.startsWith("\n"));
});

test("reply to inquiry: sends to the customer, saves a note, marks contacted, remembers the sign-off", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db
      .insert(schema.user)
      .values({ id: "owner", name: "Owner", email: "o@x.com", emailVerified: true });
    await db.insert(schema.systemOwner).values({ userId: "owner" });
    const base = { kind: "general", name: "Rahim", message: "Hello", consent: true };
    const withEmail = await createLead(
      db,
      parseLeadInput({ ...base, phone: "", email: "rahim@example.com" }),
      null,
    );
    const phoneOnly = await createLead(db, parseLeadInput({ ...base, phone: "01712345678" }), null);

    assert.equal(await getReplySignoff(db), DEFAULT_SIGNOFF);

    // A failed send records nothing.
    const failing: SendMail = async () => false;
    await assert.rejects(
      replyToLead(db, "owner", withEmail, reply, failing),
      (e: unknown) => e instanceof ProductStoreError && e.message === "REPLY_NOT_SENT",
    );
    assert.equal((await listLeads(db)).find(l => l.id === withEmail)!.notes.length, 0);
    assert.equal(await getReplySignoff(db), DEFAULT_SIGNOFF);

    // No email address: refused before anything is sent.
    let calls = 0;
    const counting: SendMail = async () => (calls++, true);
    await assert.rejects(
      replyToLead(db, "owner", phoneOnly, reply, counting),
      (e: unknown) => e instanceof ProductStoreError && e.message === "NO_EMAIL",
    );
    await assert.rejects(
      replyToLead(db, "owner", "00000000-0000-4000-8000-000000000000", reply, counting),
      (e: unknown) => e instanceof ProductStoreError && e.message === "NOT_FOUND",
    );
    assert.equal(calls, 0);

    // Success.
    const sent: Parameters<SendMail>[] = [];
    const ok: SendMail = async (...args) => (sent.push(args), true);
    await replyToLead(db, "owner", withEmail, reply, ok);
    assert.equal(sent.length, 1);
    assert.equal(sent[0][0], "rahim@example.com");
    assert.equal(sent[0][1], reply.subject);
    const after = (await listLeads(db)).find(l => l.id === withEmail)!;
    assert.equal(after.status, "contacted");
    assert.equal(after.notes.length, 1);
    assert.ok(after.notes[0].body.startsWith("Email sent to rahim@example.com\nSubject: Re: Your"));
    assert.ok(after.notes[0].body.includes(reply.body));
    assert.equal(await getReplySignoff(db), reply.signoff);
    const [log] = await db
      .select()
      .from(schema.auditEvent)
      .where(eq(schema.auditEvent.action, "lead.reply"));
    assert.equal(
      log.reason,
      `subject: ${reply.subject}`,
      "the log keeps the subject, not the message",
    );

    // A later status (e.g. Interested) is not moved back to Contacted.
    await db.update(schema.lead).set({ status: "qualified" }).where(eq(schema.lead.id, withEmail));
    await replyToLead(db, "owner", withEmail, reply, ok);
    assert.equal((await listLeads(db)).find(l => l.id === withEmail)!.status, "qualified");
  } finally {
    await pg.close();
  }
});
