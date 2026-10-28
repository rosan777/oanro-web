// Assistant persistence. Takes a Drizzle database so routes (node-postgres) and tests (PGlite) share the same code.
import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, exists, gt, ilike, isNull, lt, lte, sql, count, gte } from "drizzle-orm";
import { assistantFaq, assistantHandoff, assistantLog, assistantSession, assistantSetting, assistantUnanswered, assistantUsage, auditEvent, rateLimit } from "../db/schema";
import { createLead } from "../lead-store";
import type { LeadInput } from "../product-input";
import { ProductStoreError, type CatalogDb } from "../product-store";
import type { Lang, ProviderId } from "./types";
import { appSecret } from "../app-secret";

const DAY = 86_400_000;
export const RETENTION_DAYS = 30;
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
export const hash = (value: string, salt = "assistant") => createHash("sha256").update(`${appSecret("oanro")}:${salt}:${value}`).digest("hex");

// ---- Settings (owner-edited) -------------------------------------------------
export type AssistantSettings = { enabled: boolean; voice: boolean; tracking: boolean; tone: string; handoffNote: string };
export const defaultSettings: AssistantSettings = { enabled: false, voice: true, tracking: true, tone: "", handoffNote: "" };
export async function getSettings(db: CatalogDb): Promise<AssistantSettings> {
  const rows = await db.select().from(assistantSetting);
  const v = (k: string) => rows.find(r => r.key === k)?.value;
  const flag = (k: keyof AssistantSettings, d: boolean) => v(k) === undefined ? d : v(k) === "true";
  return { enabled: flag("enabled", defaultSettings.enabled), voice: flag("voice", true), tracking: flag("tracking", true), tone: (v("tone") ?? "").slice(0, 300), handoffNote: (v("handoffNote") ?? "").slice(0, 300) };
}
export async function saveSettings(db: CatalogDb, actorId: string, patch: Partial<AssistantSettings>) {
  const entries: [string, string][] = [];
  for (const k of ["enabled", "voice", "tracking"] as const) if (patch[k] !== undefined) { if (typeof patch[k] !== "boolean") throw new ProductStoreError("INVALID_SETTING"); entries.push([k, String(patch[k])]); }
  for (const k of ["tone", "handoffNote"] as const) if (patch[k] !== undefined) {
    if (typeof patch[k] !== "string" || patch[k]!.length > 300) throw new ProductStoreError("INVALID_SETTING");
    entries.push([k, patch[k]!.replace(/[\u0000-\u001f\u007f<>]/g, " ").trim()]);
  }
  if (!entries.length) return;
  await db.transaction(async tx => {
    for (const [key, value] of entries) await tx.insert(assistantSetting).values({ key, value, updatedBy: actorId }).onConflictDoUpdate({ target: assistantSetting.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
    // Audit entries record what changed; tone text is a setting, not personal data.
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "assistant.settings", targetId: "assistant_setting", reason: entries.map(([k, v]) => k === "tone" || k === "handoffNote" ? `${k} edited` : `${k}=${v}`).join(", ").slice(0, 300) });
  });
}

// ---- FAQ ---------------------------------------------------------------------
export type FaqInput = { questionEn: string; questionBn: string; answerEn: string; answerBn: string; keywords: string; enabled: boolean };
const clean = (v: unknown, max: number, required = false) => {
  if (typeof v !== "string") { if (required) throw new ProductStoreError("INVALID_FAQ"); return ""; }
  const s = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/g, " ").trim();
  if ((required && !s) || s.length > max) throw new ProductStoreError("INVALID_FAQ");
  return s;
};
export function parseFaq(data: Record<string, unknown>): FaqInput {
  return { questionEn: clean(data.questionEn, 200, true), questionBn: clean(data.questionBn, 200), answerEn: clean(data.answerEn, 800, true), answerBn: clean(data.answerBn, 800), keywords: clean(data.keywords, 300), enabled: data.enabled !== false };
}
export type Faq = typeof assistantFaq.$inferSelect;
export const listFaq = (db: CatalogDb) => db.select().from(assistantFaq).orderBy(asc(assistantFaq.createdAt));
export async function saveFaq(db: CatalogDb, actorId: string, input: FaqInput, id?: string) {
  const faqId = id ?? randomUUID();
  await db.transaction(async tx => {
    if (id) {
      const done = await tx.update(assistantFaq).set({ ...input, updatedBy: actorId, updatedAt: new Date() }).where(eq(assistantFaq.id, id)).returning({ id: assistantFaq.id });
      if (!done.length) throw new ProductStoreError("NOT_FOUND");
    } else await tx.insert(assistantFaq).values({ id: faqId, ...input, updatedBy: actorId });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: id ? "assistant.faq-edit" : "assistant.faq-add", targetId: faqId, reason: input.questionEn.slice(0, 120) });
  });
  return faqId;
}
export async function deleteFaq(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.delete(assistantFaq).where(eq(assistantFaq.id, id)).returning({ q: assistantFaq.questionEn });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "assistant.faq-delete", targetId: id, reason: done[0].q.slice(0, 120) });
  });
}

// ---- Rate limits (shared across server instances, atomic per key) --------------
/** Fixed window counter in the shared table. Throws when the database is unavailable so callers fail closed. */
export async function consume(db: CatalogDb, key: string, max: number, windowMs: number, now = Date.now()) {
  const windowStart = now - windowMs;
  const [row] = await db.insert(rateLimit).values({ id: randomUUID(), key: `oanro:${key}`, count: 1, lastRequest: now })
    .onConflictDoUpdate({ target: rateLimit.key, set: {
      count: sql`case when ${rateLimit.lastRequest} < ${windowStart} then 1 else ${rateLimit.count} + 1 end`,
      lastRequest: sql`case when ${rateLimit.lastRequest} < ${windowStart} then ${now} else ${rateLimit.lastRequest} end`,
    } }).returning({ count: rateLimit.count, last: rateLimit.lastRequest });
  const used = row?.count ?? 1, started = row?.last ?? now;
  return { ok: used <= max, used, retryAfter: used <= max ? 0 : Math.max(1, Math.ceil((started + windowMs - now) / 1000)) };
}

// ---- Usage counters ----------------------------------------------------------
/** Reserves one provider call if today's request and token caps allow it. Atomic: concurrent callers cannot overshoot the cap. */
export async function reserveCall(db: CatalogDb, provider: ProviderId, kind: "chat" | "transcribe", model: string, cap: { requests: number; tokens: number }, day = utcDay()) {
  if (cap.requests <= 0) return false;
  const [row] = await db.insert(assistantUsage).values({ day, provider, kind, requests: 1, model })
    .onConflictDoUpdate({ target: [assistantUsage.day, assistantUsage.provider, assistantUsage.kind], set: { requests: sql`${assistantUsage.requests} + 1`, model },
      setWhere: and(lt(assistantUsage.requests, cap.requests), cap.tokens > 0 ? lt(sql`${assistantUsage.inputTokens} + ${assistantUsage.outputTokens}`, cap.tokens) : undefined) })
    .returning({ requests: assistantUsage.requests });
  return Boolean(row);
}
export async function reserveAudio(db: CatalogDb, seconds: number, cap: { requests: number; seconds: number }, model: string, day = utcDay()) {
  if (cap.requests <= 0 || cap.seconds <= 0) return false;
  const secs = Math.max(1, Math.ceil(seconds));
  const [row] = await db.insert(assistantUsage).values({ day, provider: "groq", kind: "transcribe", requests: 1, audioSeconds: secs, model })
    .onConflictDoUpdate({ target: [assistantUsage.day, assistantUsage.provider, assistantUsage.kind], set: { requests: sql`${assistantUsage.requests} + 1`, audioSeconds: sql`${assistantUsage.audioSeconds} + ${secs}`, model },
      setWhere: and(lt(assistantUsage.requests, cap.requests), lte(sql`${assistantUsage.audioSeconds} + ${secs}`, cap.seconds)) }).returning({ requests: assistantUsage.requests });
  return Boolean(row);
}
export async function recordTokens(db: CatalogDb, provider: ProviderId, input: number, output: number, day = utcDay()) {
  await db.update(assistantUsage).set({ inputTokens: sql`${assistantUsage.inputTokens} + ${Math.max(0, Math.round(input))}`, outputTokens: sql`${assistantUsage.outputTokens} + ${Math.max(0, Math.round(output))}` })
    .where(and(eq(assistantUsage.day, day), eq(assistantUsage.provider, provider), eq(assistantUsage.kind, "chat")));
}
export async function recordFailure(db: CatalogDb, provider: ProviderId, kind: "chat" | "transcribe", day = utcDay()) {
  await db.update(assistantUsage).set({ failures: sql`${assistantUsage.failures} + 1` }).where(and(eq(assistantUsage.day, day), eq(assistantUsage.provider, provider), eq(assistantUsage.kind, kind)));
}
export async function usageSince(db: CatalogDb, days: number, now = new Date()) {
  return db.select().from(assistantUsage).where(gte(assistantUsage.day, utcDay(new Date(now.getTime() - (days - 1) * DAY)))).orderBy(desc(assistantUsage.day));
}

// ---- Sessions and logs (sanitised text only, 30-day expiry) --------------------
export const newSessionToken = () => randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
export const sessionIdFor = (token: string) => hash(token, "session").slice(0, 32);
export async function touchSession(db: CatalogDb, sessionId: string, language: Lang, now = new Date()) {
  const expiresAt = new Date(now.getTime() + RETENTION_DAYS * DAY);
  await db.insert(assistantSession).values({ id: sessionId, language, startedAt: now, lastAt: now, expiresAt })
    .onConflictDoUpdate({ target: assistantSession.id, set: { lastAt: now, expiresAt, language } });
}
export async function setOutcome(db: CatalogDb, sessionId: string, outcome: "answered" | "faq" | "unanswered" | "handoff" | "error") {
  // Hand-off and unanswered are not overwritten by a later plain answer: the team wants to see why the chat mattered.
  const rank = sql`case ${assistantSession.outcome} when 'handoff' then 3 when 'unanswered' then 2 else 1 end`;
  const newRank = outcome === "handoff" ? 3 : outcome === "unanswered" ? 2 : 1;
  await db.update(assistantSession).set({ outcome }).where(and(eq(assistantSession.id, sessionId), sql`${rank} <= ${newRank}`));
}
export type LogInput = { id: string; sessionId: string; role: "user" | "assistant"; content: string; language: Lang; source?: "ai" | "faq" | "system"; provider?: string | null; model?: string | null; inputTokens?: number; outputTokens?: number };
/** Returns false when this log id already exists (a retried request), so callers never duplicate a turn. */
export async function addLog(db: CatalogDb, log: LogInput, now = new Date()) {
  const done = await db.insert(assistantLog).values({ id: log.id, sessionId: log.sessionId, role: log.role, content: log.content, language: log.language, source: log.source ?? "ai",
    provider: log.provider ?? null, model: log.model ?? null, inputTokens: log.inputTokens ?? 0, outputTokens: log.outputTokens ?? 0, createdAt: now, expiresAt: new Date(now.getTime() + RETENTION_DAYS * DAY) })
    .onConflictDoNothing().returning({ id: assistantLog.id });
  if (done.length) await db.update(assistantSession).set({ messageCount: sql`${assistantSession.messageCount} + 1`, lastAt: now }).where(eq(assistantSession.id, log.sessionId));
  return done.length > 0;
}
export const findLog = async (db: CatalogDb, id: string, sessionId: string, now = new Date()) =>
  (await db.select().from(assistantLog).where(and(eq(assistantLog.id, id), eq(assistantLog.sessionId, sessionId), gt(assistantLog.expiresAt, now))).limit(1))[0] ?? null;
/** The visitor's own recent turns (server-held, so the browser cannot forge earlier assistant messages). */
export async function recentHistory(db: CatalogDb, sessionId: string, limit: number, now = new Date()) {
  const rows = await db.select({ role: assistantLog.role, content: assistantLog.content }).from(assistantLog)
    .where(and(eq(assistantLog.sessionId, sessionId), gt(assistantLog.expiresAt, now))).orderBy(desc(assistantLog.createdAt), asc(assistantLog.role)).limit(limit); // a question and its answer share a timestamp: "assistant" sorts before "user" here, so after reversing the user message comes first
  return rows.reverse().map(r => ({ role: r.role as "user" | "assistant", content: r.content }));
}
export async function addUnanswered(db: CatalogDb, sessionId: string, excerpt: string, reason: string, language: Lang, now = new Date()) {
  await db.insert(assistantUnanswered).values({ id: randomUUID(), sessionId, excerpt: excerpt.slice(0, 300), reason: reason.slice(0, 80), language, createdAt: now, expiresAt: new Date(now.getTime() + RETENTION_DAYS * DAY) });
}
/** Clear chat: the visitor's own request removes the session, its logs and unanswered excerpts. */
export async function deleteSession(db: CatalogDb, sessionId: string) { await db.delete(assistantSession).where(eq(assistantSession.id, sessionId)); }

/** Real deletion of everything past its 30 days, plus stale rate-limit rows. Safe to run repeatedly. */
export async function purgeExpired(db: CatalogDb, now = new Date()) {
  return db.transaction(async tx => {
    const unanswered = await tx.delete(assistantUnanswered).where(lte(assistantUnanswered.expiresAt, now)).returning({ id: assistantUnanswered.id });
    const logs = await tx.delete(assistantLog).where(lte(assistantLog.expiresAt, now)).returning({ id: assistantLog.id });
    const sessions = await tx.delete(assistantSession).where(lte(assistantSession.expiresAt, now)).returning({ id: assistantSession.id });
    const handoffs = await tx.delete(assistantHandoff).where(lte(assistantHandoff.createdAt, new Date(now.getTime() - RETENTION_DAYS * DAY))).returning({ k: assistantHandoff.dedupeKey });
    const limits = await tx.delete(rateLimit).where(and(sql`${rateLimit.key} like 'oanro:%'`, lt(rateLimit.lastRequest, now.getTime() - 2 * DAY))).returning({ id: rateLimit.id });
    const usage = await tx.delete(assistantUsage).where(lt(assistantUsage.day, utcDay(new Date(now.getTime() - 90 * DAY)))).returning({ d: assistantUsage.day });
    return { unanswered: unanswered.length, logs: logs.length, sessions: sessions.length, handoffs: handoffs.length, rateLimits: limits.length, usage: usage.length };
  });
}

// ---- Hand-off: one deduplicated lead in the existing inbox ----------------------
class Duplicate extends Error { constructor(public leadId: string) { super("DUPLICATE"); } }
/** Contact details go to the lead only. The dedupe row stores a salted hash of the contact and the day, never the contact itself. */
export async function createHandoffLead(db: CatalogDb, input: LeadInput, contactKey: string, ipHash: string | null, now = new Date()) {
  const dedupeKey = hash(`${contactKey}:${Math.floor((now.getTime() + 6 * 3600e3) / DAY)}`, "handoff"); // one per contact per Dhaka day
  const [existing] = await db.select({ leadId: assistantHandoff.leadId }).from(assistantHandoff).where(eq(assistantHandoff.dedupeKey, dedupeKey)).limit(1);
  if (existing) return { leadId: existing.leadId, duplicate: true };
  try {
    return await db.transaction(async tx => {
      const leadId = await createLead(tx as unknown as CatalogDb, input, ipHash, now);
      const claimed = await tx.insert(assistantHandoff).values({ dedupeKey, leadId, createdAt: now }).onConflictDoNothing().returning({ k: assistantHandoff.dedupeKey });
      if (!claimed.length) { const [row] = await tx.select({ leadId: assistantHandoff.leadId }).from(assistantHandoff).where(eq(assistantHandoff.dedupeKey, dedupeKey)).limit(1); throw new Duplicate(row.leadId); }
      return { leadId, duplicate: false };
    });
  } catch (error) { if (error instanceof Duplicate) return { leadId: error.leadId, duplicate: true }; throw error; }
}

// ---- Admin readers (expired rows are never returned, even before cleanup runs) ---
export type SessionFilter = { q?: string; from?: Date; to?: Date; language?: string; outcome?: string; provider?: string; page?: number };
const escapeLike = (s: string) => s.replace(/[\\%_]/g, m => `\\${m}`);
export async function listSessions(db: CatalogDb, f: SessionFilter, now = new Date()) {
  const where = [gt(assistantSession.expiresAt, now)];
  if (f.from) where.push(gte(assistantSession.lastAt, f.from));
  if (f.to) where.push(lt(assistantSession.lastAt, f.to));
  if (f.language) where.push(eq(assistantSession.language, f.language));
  if (f.outcome) where.push(eq(assistantSession.outcome, f.outcome));
  if (f.provider) where.push(exists(db.select({ x: sql`1` }).from(assistantLog).where(and(eq(assistantLog.sessionId, assistantSession.id), eq(assistantLog.provider, f.provider), gt(assistantLog.expiresAt, now)))));
  if (f.q?.trim()) where.push(exists(db.select({ x: sql`1` }).from(assistantLog).where(and(eq(assistantLog.sessionId, assistantSession.id), gt(assistantLog.expiresAt, now), ilike(assistantLog.content, `%${escapeLike(f.q.trim().slice(0, 80))}%`)))));
  const page = Math.max(0, Math.floor(f.page ?? 0)), size = 25;
  const rows = await db.select().from(assistantSession).where(and(...where)).orderBy(desc(assistantSession.lastAt)).limit(size + 1).offset(page * size);
  return { sessions: rows.slice(0, size), more: rows.length > size };
}
export async function getSessionLogs(db: CatalogDb, sessionId: string, now = new Date()) {
  const [session] = await db.select().from(assistantSession).where(and(eq(assistantSession.id, sessionId), gt(assistantSession.expiresAt, now))).limit(1);
  if (!session) return null;
  const logs = await db.select().from(assistantLog).where(and(eq(assistantLog.sessionId, sessionId), gt(assistantLog.expiresAt, now))).orderBy(asc(assistantLog.createdAt), desc(assistantLog.role)); // same tie-break: question before answer
  return { session, logs };
}
export async function listUnanswered(db: CatalogDb, includeResolved: boolean, now = new Date()) {
  return db.select().from(assistantUnanswered).where(and(gt(assistantUnanswered.expiresAt, now), includeResolved ? undefined : isNull(assistantUnanswered.resolvedAt))).orderBy(desc(assistantUnanswered.createdAt)).limit(100);
}
export async function resolveUnanswered(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(assistantUnanswered).set({ resolvedAt: new Date(), resolvedBy: actorId }).where(and(eq(assistantUnanswered.id, id), isNull(assistantUnanswered.resolvedAt))).returning({ id: assistantUnanswered.id });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "assistant.unanswered-resolve", targetId: id, reason: "resolved" });
  });
}
export async function assistantCounts(db: CatalogDb, now = new Date()) {
  const [s] = await db.select({ n: count() }).from(assistantSession).where(gt(assistantSession.expiresAt, now));
  const [u] = await db.select({ n: count() }).from(assistantUnanswered).where(and(gt(assistantUnanswered.expiresAt, now), isNull(assistantUnanswered.resolvedAt)));
  return { sessions: Number(s?.n ?? 0), unanswered: Number(u?.n ?? 0) };
}
