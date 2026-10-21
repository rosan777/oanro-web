// Customer inquiries ("leads"): public capture with rate limiting, then an internal inbox (status, assignee, notes).
import { createHash, randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { auditEvent, lead, leadNote, leadStatuses, product, service, staffMember, systemOwner, user } from "./db/schema";
import { products as demoProducts, services as demoServices } from "./catalog";
import type { LeadInput } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";

export type LeadStatus = typeof leadStatuses[number];
export const LEADS_PER_HOUR = 5;
/** One-way, salted hash of the client IP: lets us rate-limit without ever storing the address. */
export function hashIp(ip: string, secret: string) { return createHash("sha256").update(`${secret}:oanro-lead:${ip}`).digest("hex").slice(0, 32); }

export async function createLead(db: CatalogDb, input: LeadInput, ipHash: string | null, now = new Date()) {
  if (ipHash) {
    const [recent] = await db.select({ n: count() }).from(lead).where(and(eq(lead.ipHash, ipHash), gt(lead.createdAt, new Date(now.getTime() - 3600e3))));
    if (Number(recent?.n ?? 0) >= LEADS_PER_HOUR) throw new ProductStoreError("RATE_LIMITED");
  }
  // Snapshot the product/service name so the inquiry still makes sense if the item is renamed or archived later.
  let subject = input.subject;
  if (input.productSlug) {
    const [p] = await db.select({ name: product.nameEn }).from(product).where(eq(product.slug, input.productSlug)).limit(1);
    const name = p?.name ?? demoProducts.find(d => d.slug === input.productSlug)?.name;
    if (!name) throw new ProductStoreError("PRODUCT_NOT_FOUND");
    subject = name;
  } else if (input.serviceSlug) {
    const [s] = await db.select({ name: service.titleEn }).from(service).where(eq(service.slug, input.serviceSlug)).limit(1);
    subject = s?.name ?? demoServices.find(d => d.slug === input.serviceSlug)?.title ?? input.serviceSlug;
  }
  const id = randomUUID();
  await db.insert(lead).values({ id, ...input, subject, consentAt: now, ipHash, createdAt: now, updatedAt: now });
  return id;
}
export type InboxLead = Awaited<ReturnType<typeof listLeads>>[number];
export async function listLeads(db: CatalogDb, status?: LeadStatus) {
  const rows = await db.select().from(lead).where(status ? eq(lead.status, status) : undefined).orderBy(desc(lead.createdAt)).limit(200);
  const notes = rows.length ? await db.select({ id: leadNote.id, leadId: leadNote.leadId, body: leadNote.body, createdAt: leadNote.createdAt, author: user.name })
    .from(leadNote).innerJoin(user, eq(user.id, leadNote.authorId)).where(inArray(leadNote.leadId, rows.map(r => r.id))).orderBy(leadNote.createdAt) : [];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ipHash is deliberately stripped before data reaches the inbox UI
  return rows.map(({ ipHash: _ip, consentAt, createdAt, updatedAt, ...r }) => ({ ...r, consentAt: consentAt.toISOString(), createdAt: createdAt.toISOString(), updatedAt: updatedAt.toISOString(),
    notes: notes.filter(n => n.leadId === r.id).map(n => ({ id: n.id, body: n.body, author: n.author, createdAt: n.createdAt.toISOString() })) }));
}
export async function leadCounts(db: CatalogDb) {
  const rows = await db.select({ status: lead.status, n: count() }).from(lead).groupBy(lead.status);
  return Object.fromEntries(leadStatuses.map(s => [s, Number(rows.find(r => r.status === s)?.n ?? 0)])) as Record<LeadStatus, number>;
}
/** People an inquiry can be assigned to: the owner and active staff. */
export async function assignableUsers(db: CatalogDb) {
  const owner = await db.select({ id: user.id, name: user.name }).from(systemOwner).innerJoin(user, eq(user.id, systemOwner.userId));
  const staff = await db.select({ id: user.id, name: user.name }).from(staffMember).innerJoin(user, eq(user.id, staffMember.userId)).where(eq(staffMember.status, "active"));
  return [...owner, ...staff];
}
// Audit entries record what changed, never the customer's personal details.
export async function setLeadStatus(db: CatalogDb, actorId: string, id: string, status: LeadStatus) {
  if (!leadStatuses.includes(status)) throw new ProductStoreError("INVALID_STATUS");
  await db.transaction(async tx => {
    const done = await tx.update(lead).set({ status, updatedAt: new Date() }).where(eq(lead.id, id)).returning({ id: lead.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "lead.status", targetId: id, reason: status });
  });
}
/** Returns true when the assignee actually changed (used to send the "assigned to you" email only once). */
export async function assignLead(db: CatalogDb, actorId: string, id: string, assigneeId: string | null) {
  if (assigneeId && !(await assignableUsers(db)).some(u => u.id === assigneeId)) throw new ProductStoreError("INVALID_ASSIGNEE");
  return db.transaction(async tx => {
    const [before] = await tx.select({ assignedTo: lead.assignedTo }).from(lead).where(eq(lead.id, id)).limit(1);
    if (!before) throw new ProductStoreError("NOT_FOUND");
    if (before.assignedTo === assigneeId) return false;
    const done = await tx.update(lead).set({ assignedTo: assigneeId, updatedAt: new Date() }).where(eq(lead.id, id)).returning({ id: lead.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "lead.assign", targetId: id, reason: assigneeId ? `assigned to ${assigneeId}` : "unassigned" });
    return true;
  });
}
export async function addLeadNote(db: CatalogDb, actorId: string, id: string, body: string) {
  const clean = body.trim();
  if (!clean || clean.length > 2000) throw new ProductStoreError("INVALID_NOTE");
  await db.transaction(async tx => {
    const [exists] = await tx.select({ id: lead.id }).from(lead).where(eq(lead.id, id)).limit(1);
    if (!exists) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(leadNote).values({ id: randomUUID(), leadId: id, authorId: actorId, body: clean });
    await tx.update(lead).set({ updatedAt: new Date() }).where(eq(lead.id, id));
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "lead.note", targetId: id, reason: "note added" });
  });
}
