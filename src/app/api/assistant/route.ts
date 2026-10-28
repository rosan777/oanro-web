import { chat } from "@/lib/assistant/engine";
import { dailyCaps, limits, providerOrder } from "@/lib/assistant/config";
import { resolveModel } from "@/lib/assistant/providers";
import { deleteSession } from "@/lib/assistant/store";
import { clearCookies, humanHelp, isVerified, json, loadFaq, loadSettings, personalisationAllowed, productionTools, publicConfig, hasDatabase, sameOrigin, sessionFrom, limit, verifiedMark, verifyTurnstile, withCookies } from "@/lib/assistant/server";
import { messages } from "@/lib/assistant/messages";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** One chat message. The server builds every instruction, loads the visitor's own recent turns itself, and only returns validated facts. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return json({ error: "INVALID_INPUT" }, 415);
  const config = await publicConfig();
  if (!config.enabled) return json({ error: "ASSISTANT_OFF" }, 403); // enforced here, not only by hiding the button
  let data: Record<string, unknown>;
  try { data = await readObject(request, limits.maxBodyBytes); } catch { return json({ error: "INVALID_INPUT" }, 400); }
  const { requestId, message, locale, recent, turnstile } = data;
  if (typeof requestId !== "string" || !uuid.test(requestId) || typeof message !== "string" || !message.trim() || (locale !== "en" && locale !== "bn")) return json({ error: "INVALID_INPUT" }, 400);
  if (message.length > 2000) return json({ error: "TOO_LONG", message: messages.tooLong }, 413);
  const slugs = Array.isArray(recent) ? recent.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 5) : [];

  const session = sessionFrom(request);
  const cookies = [...session.cookies];
  // Limits live in the shared database table so every server instance counts together. If it can't be reached, AI is switched off for this request (fail closed).
  let aiAllowed = true;
  try {
    const burst = await limit(request, "chat-burst", limits.burstPer10s, 10_000);
    const win = await limit(request, "chat", limits.chatPerWindow, limits.windowMinutes * 60_000);
    const day = await limit(request, "chat-day", limits.chatPerDay, 86_400_000);
    const blocked = [burst, win, day].find(r => !r.ok);
    if (blocked) return json({ error: "RATE_LIMITED", retryAfter: blocked.retryAfter }, 429, { "Retry-After": String(blocked.retryAfter) });
  } catch { aiAllowed = false; }
  // Optional Turnstile on the first message of a session.
  if (!isVerified(request, session.token)) {
    if (!(await verifyTurnstile(typeof turnstile === "string" ? turnstile : "", request))) return json({ error: "CHALLENGE_FAILED" }, 403);
    cookies.push(verifiedMark(request, session.token));
  }
  try {
    const reply = await chat({
      db: catalogDb(), tools: productionTools(), faq: await loadFaq(), settings: await loadSettings(), human: await humanHelp(),
      providers: aiAllowed ? providerOrder() : [], model: resolveModel, caps: dailyCaps,
      personalisation: personalisationAllowed(request) && slugs.length > 0,
    }, { sessionId: session.sessionId, requestId, message, locale, recent: personalisationAllowed(request) ? slugs : [] });
    return withCookies(json({ reply, human: config.human }), cookies);
  } catch { return withCookies(json({ error: "UNAVAILABLE" }, 503), cookies); }
}

/** Clear chat: deletes this session's saved messages and starts fresh next time. */
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  const session = sessionFrom(request);
  if (!session.isNew && hasDatabase()) await deleteSession(catalogDb(), session.sessionId).catch(() => {});
  return withCookies(json({ ok: true }), clearCookies(request));
}
