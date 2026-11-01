// Replying to a customer inquiry by email from the admin inbox (sent as AUTH_EMAIL_FROM, support@oanro.com).
// The full reply is kept as an inquiry note so the team can see what was sent; the activity log gets the subject only.
// The mail sender is passed in, so tests can run without sending anything.

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { auditEvent, lead, leadNote, storeSetting } from "./db/schema";
import { ProductInputError } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

const SIGNOFF_KEY = "mail.reply-signoff";
export const DEFAULT_SIGNOFF = "Sincerely,\nOANRO Support Team";

export type LeadReply = { subject: string; greeting: string; body: string; signoff: string };
export type SendMail = (
  to: string,
  subject: string,
  text: string,
  html: string,
) => Promise<boolean>;

/** Subject 3–150, greeting up to 120, message 10–5000 and sign-off up to 300 characters, trimmed. */
export function cleanReply(data: unknown): LeadReply {
  const o = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "");
  const reply = {
    subject: str(o.subject).replace(/\s+/g, " "),
    greeting: str(o.greeting),
    body: str(o.body),
    signoff: str(o.signoff),
  };
  if (reply.subject.length < 3 || reply.subject.length > 150)
    throw new ProductInputError("subject");
  if (reply.greeting.length > 120) throw new ProductInputError("greeting");
  if (reply.body.length < 10 || reply.body.length > 5000) throw new ProductInputError("body");
  if (reply.signoff.length > 300) throw new ProductInputError("signoff");
  return reply;
}

/** Plain-text and HTML versions of the email: greeting, message, sign-off. All customer-facing text is escaped. */
export function composeReply(reply: LeadReply) {
  const text = [reply.greeting, reply.body, reply.signoff].filter(Boolean).join("\n\n");
  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );
  const para = (s: string) => `<p style="white-space:pre-line;margin:0 0 1em">${esc(s)}</p>`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#151515;max-width:560px">${[
    reply.greeting,
    reply.body,
    reply.signoff,
  ]
    .filter(Boolean)
    .map(para)
    .join("")}</div>`;
  return { text, html };
}

/** The saved sign-off (shared by the team), or the default one. */
export async function getReplySignoff(db: CatalogDb) {
  const [row] = await db
    .select({ value: storeSetting.value })
    .from(storeSetting)
    .where(eq(storeSetting.key, SIGNOFF_KEY))
    .limit(1);
  return row?.value ?? DEFAULT_SIGNOFF;
}

/**
 * Emails the customer who sent the inquiry, then records it: a note with the full reply, "New" becomes
 * "Contacted", the sign-off is remembered for next time, and the activity log gets the subject.
 * Nothing is recorded when the email could not be sent.
 */
export async function replyToLead(
  db: CatalogDb,
  actorId: string,
  id: string,
  reply: LeadReply,
  send: SendMail,
) {
  const [row] = await db
    .select({ email: lead.email, status: lead.status })
    .from(lead)
    .where(eq(lead.id, id))
    .limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  if (!row.email) throw new ProductStoreError("NO_EMAIL");
  const mail = composeReply(reply);
  if (!(await send(row.email, reply.subject, mail.text, mail.html)))
    throw new ProductStoreError("REPLY_NOT_SENT");
  await db.transaction(async tx => {
    await tx.insert(leadNote).values({
      id: randomUUID(),
      leadId: id,
      authorId: actorId,
      body: `Email sent to ${row.email}\nSubject: ${reply.subject}\n\n${mail.text}`,
    });
    await tx
      .update(lead)
      .set({ status: row.status === "new" ? "contacted" : row.status, updatedAt: new Date() })
      .where(eq(lead.id, id));
    await tx
      .insert(storeSetting)
      .values({ key: SIGNOFF_KEY, value: reply.signoff, updatedBy: actorId })
      .onConflictDoUpdate({
        target: storeSetting.key,
        set: { value: reply.signoff, updatedBy: actorId, updatedAt: new Date() },
      });
    await tx.insert(auditEvent).values({
      id: randomUUID(),
      actorId,
      action: "lead.reply",
      targetId: id,
      reason: `subject: ${reply.subject}`.slice(0, 300),
    });
  });
}
