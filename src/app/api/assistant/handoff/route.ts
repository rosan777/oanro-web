import { redactPii } from "@/lib/assistant/sanitize";
import { hasDatabase, json, limit, publicConfig, sameOrigin, sessionFrom } from "@/lib/assistant/server";
import { createHandoffLead, getSessionLogs, setOutcome } from "@/lib/assistant/store";
import { createHash } from "node:crypto";
import { hashIp } from "@/lib/lead-store";
import { clientIp } from "@/lib/rate-limit";
import { parseLeadInput, ProductInputError } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
import { appSecret } from "@/lib/app-secret";
export const runtime = "nodejs";

/** "Message our team": creates ONE lead in the existing inbox after explicit consent. The success answer is sent only after the lead is saved. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  const config = await publicConfig();
  if (!config.enabled || !hasDatabase()) return json({ error: "ASSISTANT_OFF" }, 403);
  let data: Record<string, unknown>;
  try { data = await readObject(request, 3000); } catch { return json({ error: "INVALID_INPUT" }, 400); }
  if (typeof data.website === "string" && data.website) return json({ ok: true }); // honeypot
  const db = catalogDb();
  try { const r = await limit(request, "handoff", 5, 3_600_000); if (!r.ok) return json({ error: "RATE_LIMITED" }, 429, { "Retry-After": String(r.retryAfter) }); } catch { return json({ error: "UNAVAILABLE" }, 503); }
  const session = sessionFrom(request);
  // The message is what the visitor typed for our team (like the contact form): kept as written, minus control characters. Only the optional chat summary is redacted.
  const typed = typeof data.message === "string" ? data.message.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim().slice(0, 600) : "";
  if (typed.length < 3) return json({ error: "INVALID_INPUT", field: "message" }, 400);
  if (typeof data.phone !== "string" || !data.phone.trim()) return json({ error: "INVALID_INPUT", field: "phone" }, 400); // a mobile number is required here
  // Where it came from: an internal page path only (never a full URL or query), so the team sees the page the visitor was on.
  const page = typeof data.page === "string" && /^\/[A-Za-z0-9\-_/.%]{0,120}$/.test(data.page.split("?")[0].split("#")[0]) ? data.page.split("?")[0].split("#")[0] : "";
  const lang = data.locale === "bn" ? "Bangla" : "English";
  let message = typed;
  if (data.includeSummary === true && !session.isNew) {
    const logs = await getSessionLogs(db, session.sessionId).catch(() => null);
    const lines = logs?.logs.filter(l => l.role === "user" && !l.content.startsWith("[message removed")).slice(-3).map(l => redactPii(l.content).slice(0, 120)) ?? [];
    if (lines.length) message += `\n\nEarlier in the chat (personal details removed): ${lines.join(" | ")}`;
  }
  message = `${message}\n\n— Sent from the shop assistant chat · ${page ? `page ${page} · ` : ""}${lang}`.slice(0, 1000);
  try {
    const input = parseLeadInput({ kind: "general", name: data.name, phone: data.phone, email: data.email, preferredContact: data.preferredContact, consent: data.consent, locale: data.locale, message });
    // The same person sending the same message twice in a day is one lead; a different message is a new one.
    const contact = `${input.phone.replace(/\D/g, "")}|${input.email}|${createHash("sha256").update(typed).digest("hex").slice(0, 16)}`;
    const ip = clientIp(request);
    const result = await createHandoffLead(db, { ...input, subject: `Shop assistant message${page ? ` · ${page}` : ""}` }, contact, ip ? hashIp(ip, appSecret("oanro")) : null);
    if (!session.isNew) await setOutcome(db, session.sessionId, "handoff").catch(() => {});
    return json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof ProductInputError) return json({ error: "INVALID_INPUT", field: error.field }, 400);
    if (error instanceof ProductStoreError && error.message === "RATE_LIMITED") return json({ error: "RATE_LIMITED" }, 429);
    return json({ error: "UNAVAILABLE" }, 503);
  }
}
