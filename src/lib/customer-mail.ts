// Owner emails to customers: one customer, or everyone at once. Server-only.
// Every email carries an unsubscribe link; people who unsubscribe are skipped by "email everyone".
import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq, notExists, sql } from "drizzle-orm";
import { auditEvent, staffMember, storeSetting, systemOwner, user } from "./db/schema";
import { DELETED_DOMAIN } from "./customer-store";
import { mailConfigured, sendMail } from "./mailer";
import { siteUrl } from "./site-url";
import { ProductStoreError, type CatalogDb } from "./product-store";

const OPT_OUT_KEY = "mail.unsubscribed";
/** Most emails sent in one go (keeps within the request time limit and the mail provider's sending limits). */
export const BROADCAST_LIMIT = 200;

export class MailInputError extends Error {}
export function cleanMessage(data: Record<string, unknown>) {
  const subject = typeof data.subject === "string" ? data.subject.trim() : "";
  const body = typeof data.body === "string" ? data.body.trim() : "";
  if (subject.length < 3 || subject.length > 150) throw new MailInputError("subject");
  if (body.length < 10 || body.length > 5000) throw new MailInputError("body");
  return { subject, body };
}

const sign = (email: string) => createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "oanro-dev").update(`unsubscribe:${email}`).digest("base64url").slice(0, 32);
export function unsubscribeUrl(raw: string) {
  const email = raw.toLowerCase();
  return `${siteUrl()}/api/unsubscribe?${new URLSearchParams({ e: email, t: sign(email) })}`;
}
export function validUnsubscribe(email: string, token: string) {
  const a = Buffer.from(sign(email)), b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function optedOut(db: CatalogDb): Promise<string[]> {
  const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, OPT_OUT_KEY)).limit(1);
  try { const list = JSON.parse(row?.value ?? "[]"); return Array.isArray(list) ? list.filter(x => typeof x === "string") : []; } catch { return []; }
}
export async function unsubscribe(db: CatalogDb, email: string) {
  const list = new Set(await optedOut(db));
  list.add(email.toLowerCase());
  const value = JSON.stringify([...list]);
  await db.insert(storeSetting).values({ key: OPT_OUT_KEY, value }).onConflictDoUpdate({ target: storeSetting.key, set: { value, updatedAt: new Date() } });
}

/** Customers who can get "email everyone": verified, not staff/owner, not deleted, not unsubscribed. */
async function audience(db: CatalogDb) {
  const rows = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(and(
    eq(user.emailVerified, true),
    sql`${user.email} not like ${"%@" + DELETED_DOMAIN}`,
    notExists(sql`(select 1 from ${staffMember} where ${staffMember.userId} = ${user.id})`),
    notExists(sql`(select 1 from ${systemOwner} where ${systemOwner.userId} = ${user.id})`)));
  const out = new Set(await optedOut(db));
  return rows.filter(r => !out.has(r.email.toLowerCase()));
}
export async function audienceCount(db: CatalogDb) {
  return (await audience(db)).length;
}

function compose(name: string, email: string, subject: string, body: string, bulk: boolean) {
  const hello = name ? `Hi ${name},` : "Hi,";
  const foot = bulk
    ? `You're getting this because you have an OANRO account. Don't want these emails? Unsubscribe: ${unsubscribeUrl(email)}`
    : "Reply to this email if you have any questions.";
  const text = `${hello}\n\n${body}\n\n— Team OANRO\n\n${foot}`;
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#151515;max-width:560px">
<p>${esc(hello)}</p><p style="white-space:pre-line">${esc(body)}</p><p>— Team OANRO</p>
<p style="font-size:12px;color:#686862;border-top:1px solid #deded8;padding-top:12px">${bulk ? `You're getting this because you have an OANRO account. <a href="${esc(unsubscribeUrl(email))}">Unsubscribe</a>` : esc(foot)}</p></div>`;
  return { subject, text, html };
}

/** One customer. The subject (not the message) is saved in the activity log. */
export async function emailCustomer(db: CatalogDb, actorId: string, customerId: string, msg: { subject: string; body: string }) {
  if (!mailConfigured()) throw new ProductStoreError("EMAIL_FAILED");
  const [c] = await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, customerId)).limit(1);
  if (!c || c.email.endsWith(`@${DELETED_DOMAIN}`)) throw new ProductStoreError("NOT_FOUND");
  const m = compose(c.name, c.email, msg.subject, msg.body, false);
  if (!await sendMail(c.email, m.subject, m.text, m.html)) throw new ProductStoreError("EMAIL_FAILED");
  await db.insert(auditEvent).values({ id: randomUUID(), actorId, action: "customer.email", targetId: customerId, reason: `subject: ${msg.subject}`.slice(0, 300) });
}

/** Test copy to the sender only, then (when not a test) every customer, one email each. */
export async function emailEveryone(db: CatalogDb, actor: { id: string; email: string; name: string }, msg: { subject: string; body: string }, test: boolean) {
  if (!mailConfigured()) throw new ProductStoreError("EMAIL_FAILED");
  if (test) {
    const m = compose(actor.name, actor.email, `[TEST] ${msg.subject}`, msg.body, true);
    if (!await sendMail(actor.email, m.subject, m.text, m.html)) throw new ProductStoreError("EMAIL_FAILED");
    return { sent: 1, failed: 0, left: 0 };
  }
  const people = await audience(db);
  const batch = people.slice(0, BROADCAST_LIMIT);
  let sent = 0, failed = 0;
  for (const p of batch) {
    const m = compose(p.name, p.email, msg.subject, msg.body, true);
    if (await sendMail(p.email, m.subject, m.text, m.html)) sent++; else failed++;
  }
  await db.insert(auditEvent).values({ id: randomUUID(), actorId: actor.id, action: "customer.email-all", targetId: "customers", reason: `subject: ${msg.subject} · ${sent} sent, ${failed} failed`.slice(0, 300) });
  return { sent, failed, left: Math.max(0, people.length - batch.length) };
}
