// One chat turn, end to end. Dependencies are injected so the route and the tests run exactly the same logic.
import { generateText, stepCountIs, tool } from "ai";
import { limits } from "./config";
import { content, detectIntent, detectSmallTalk, matchFaq, vagueProductRequest, wantsBrowse } from "./match";
import { say } from "./messages";
import { quickReplies } from "./messages";
import { buildSystemPrompt } from "./prompt";
import { classify, isHealthy, markFailure, type Failure, type Resolved } from "./providers";
import { amountsIn, cleanReply, redactPii, sanitizeForModel, stripUnverifiedAmounts } from "./sanitize";
import { addLog, addUnanswered, findLog, reserveCall, recentHistory, recordFailure, recordTokens, setOutcome, touchSession, type AssistantSettings, type Faq } from "./store";
import { allowedAmounts, getPolicy, getProduct, policyInput, productInput, searchInput, searchProducts, type ToolContext } from "./tools";
import { detectLanguage } from "./language";
import type { ChatReply, HumanHelp, Lang, PolicyFacts, ProductCard, ProviderId, StoreMode } from "./types";
import type { CatalogDb } from "../product-store";

export type EngineDeps = {
  db: CatalogDb; tools: ToolContext; faq: Faq[]; settings: AssistantSettings; human: HumanHelp;
  providers: ProviderId[]; model: (id: ProviderId) => Resolved | null; caps: (id: ProviderId) => { requests: number; tokens: number };
  /** True only when the visitor allowed Personalisation (checked on the server from the consent cookie). */
  personalisation: boolean; now?: () => Date;
};
export type ChatInput = { sessionId: string; requestId: string; message: string; locale: "en" | "bn"; recent: string[] };

const smallTalkKey = { greeting: "hello", thanks: "thanks", bye: "bye", howareyou: "howAreYou", about: "about", day: "day", robot: "robot", ack: "ack" } as const;
let inflight = 0; // simultaneous AI turns in this server instance
const dhakaDate = (d: Date) => new Date(d.getTime() + 6 * 3600e3).toISOString().slice(0, 10);

function base(id: string, lang: Lang, mode: StoreMode, over: Partial<ChatReply>): ChatReply {
  return { id, text: "", language: lang, source: "system", cards: [], policy: null, mode, humanHelp: false, trackingForm: false, quick: [], limit: "none", ...over };
}
const quick = (locale: "en" | "bn", lang: Lang) => lang === "bn" || locale === "bn" ? quickReplies.bn : quickReplies.en;

export async function chat(deps: EngineDeps, input: ChatInput): Promise<ChatReply> {
  const now = deps.now?.() ?? new Date();
  const replyId = `${input.requestId}:a`;
  const mode = await deps.tools.mode();
  const asked = input.message.normalize("NFC");
  const lang = detectLanguage(asked, input.locale === "bn" ? "bn" : "en");
  const make = (over: Partial<ChatReply>) => base(replyId, lang, mode, { quick: quick(input.locale, lang), ...over });
  if (!deps.settings.enabled) return make({ text: say("off", lang), humanHelp: true, limit: "off" });

  // Never keep secrets or IDs: drop the message and teach the visitor (nothing about it is stored).
  const clean = sanitizeForModel(asked, limits.maxMessageChars);
  await touchSession(deps.db, input.sessionId, lang, now);
  if (clean.startsWith("[message removed")) {
    await addLog(deps.db, { id: input.requestId, sessionId: input.sessionId, role: "user", content: clean, language: lang, source: "system" }, now);
    return make({ text: say("secret", lang) });
  }
  // A retried request (network drop, double tap) returns the stored reply and never calls a provider or logs twice.
  const fresh = await addLog(deps.db, { id: input.requestId, sessionId: input.sessionId, role: "user", content: clean, language: lang, source: "system" }, now);
  if (!fresh) {
    const stored = await findLog(deps.db, replyId, input.sessionId, now);
    return stored ? make({ text: stored.content, source: stored.source as "ai" | "faq" | "system" }) : make({ text: say("duplicateBusy", lang), limit: "rate" });
  }
  const finish = async (reply: ChatReply, meta: { provider?: string; model?: string; input?: number; output?: number; outcome: "answered" | "faq" | "unanswered" | "handoff" | "error"; reason?: string }) => {
    await addLog(deps.db, { id: replyId, sessionId: input.sessionId, role: "assistant", content: redactPii(reply.text), language: reply.language, source: reply.source, provider: meta.provider, model: meta.model, inputTokens: meta.input, outputTokens: meta.output }, now);
    await setOutcome(deps.db, input.sessionId, meta.outcome);
    if (meta.outcome === "unanswered" || meta.outcome === "error") await addUnanswered(deps.db, input.sessionId, clean, meta.reason ?? "unanswered", lang, now);
    return reply;
  };

  // ---- 1. Answers that need no AI -------------------------------------------------
  // When an AI provider is available, greetings and rule questions go to it so the chat feels natural (it still uses the same read-only tools).
  // The fixed answers below are the fallback when no provider is configured, healthy or within its daily cap.
  const aiReady = deps.providers.some(id => deps.model(id) && isHealthy(id));
  const talk = detectSmallTalk(clean);
  if (talk && !aiReady) return finish(make({ text: say(smallTalkKey[talk], lang) }), { outcome: "answered" });
  const intent = detectIntent(clean);
  if (intent === "human") return finish(make({ text: say("human", lang), humanHelp: true }), { outcome: "handoff" });
  if (intent === "tracking") return finish(make({ text: deps.settings.tracking ? say("tracking", lang) : say("trackingOff", lang), trackingForm: deps.settings.tracking, humanHelp: !deps.settings.tracking }), { outcome: "answered" });
  const faq = matchFaq(clean, deps.faq, input.locale);
  if (faq) {
    const text = (lang === "bn" || input.locale === "bn") && faq.faq.answerBn ? faq.faq.answerBn : faq.faq.answerEn;
    return finish(make({ text, source: "faq" }), { outcome: "faq" });
  }
  if (intent && !aiReady) {
    const { faq: _faq, ...policy } = await getPolicy({ topic: intent }, deps.tools); void _faq;
    return finish(make({ text: lang === "bn" || input.locale === "bn" ? policy.text.bn : policy.text.en, policy, source: "system" }), { outcome: "answered" });
  }

  // ---- 2. AI path (read-only tools, bounded, with provider fallback) ---------------
  const history = await recentHistory(deps.db, input.sessionId, limits.historyMessages + 1, now);
  const prior = history.filter(m => m.content && !m.content.startsWith("[message removed")).slice(0, -1).slice(-limits.historyMessages); // drop the message just stored
  const recentNames = deps.personalisation ? (await deps.tools.products()).filter(p => input.recent.includes(p.slug)).slice(0, 5) : [];
  let failure: Failure | null = null, tried = false;
  const turnTools = (sink: { cards: Map<string, ProductCard>; policy: PolicyFacts | null }) => ({
    searchProducts: tool({ description: "Search the shop's published products by what the shopper wants. Returns up to 5 items with current price, availability, sizes and colours.", inputSchema: searchInput,
      execute: async args => { const r = await searchProducts(args, deps.tools); r.cards.forEach(c => sink.cards.set(c.slug, c)); return { total: r.total, note: r.note, items: r.cards.map(modelView) }; } }),
    getProduct: tool({ description: "Get current details of one product by its slug.", inputSchema: productInput,
      execute: async args => { const r = await getProduct(args, deps.tools); if (r.card) sink.cards.set(r.card.slug, r.card); return r.card ? { ...modelView(r.card), description: r.description, specs: r.specs } : { found: false }; } }),
    getPolicy: tool({ description: "Get the shop's current delivery, payment, returns, cash-on-delivery or tracking rules.", inputSchema: policyInput,
      execute: async args => { const r = await getPolicy(args, deps.tools); const { faq, ...facts } = r; sink.policy = facts; return { topic: r.topic, faq, text: r.text.en, deliveryInside: r.deliveryInside, deliveryOutside: r.deliveryOutside, dhakaDays: r.dhakaDays, outsideDays: r.outsideDays, codLimit: r.codLimit, returnDays: r.returnDays }; } }),
  });

  if (inflight >= limits.maxConcurrent) return finish(make({ text: say("rate", lang), limit: "rate", ...(await fallbackFind(deps, clean, lang, mode)) }), { outcome: "error", reason: "busy" });
  inflight++;
  try {
    for (const id of deps.providers) {
      const resolved = deps.model(id);
      if (!resolved || !isHealthy(id)) continue;
      const cap = deps.caps(id);
      if (!(await reserveCall(deps.db, id, "chat", resolved.modelId, cap, now.toISOString().slice(0, 10)))) { failure = { kind: "quota", retryAfter: 0 }; continue; }
      tried = true;
      const sink = { cards: new Map<string, ProductCard>(), policy: null as PolicyFacts | null }; // reset per provider: nothing from a failed attempt leaks into the reply
      try {
        const result = await generateText({
          model: resolved.model, system: buildSystemPrompt({ lang, locale: input.locale, mode, tone: deps.settings.tone, recent: recentNames, today: dhakaDate(now) }),
          messages: [...prior.map(m => ({ role: m.role, content: m.content })), { role: "user" as const, content: clean }],
          tools: turnTools(sink), stopWhen: stepCountIs(limits.maxToolSteps), maxOutputTokens: limits.maxOutputTokens, temperature: 0.3, maxRetries: 0,
          timeout: { totalMs: limits.providerTimeoutMs },
        });
        const usage = result.totalUsage; const tin = usage?.inputTokens ?? 0, tout = usage?.outputTokens ?? 0;
        await recordTokens(deps.db, id, tin, tout, now.toISOString().slice(0, 10));
        let text = cleanReply(result.text ?? ""); const wantsHuman = /\[\[HUMAN\]\]/.test(text); text = text.replace(/\[\[HUMAN\]\]/g, "").trim();
        let cards = [...sink.cards.values()].slice(0, 5);
        const rules = await deps.tools.rules();
        const said = new Set([clean, ...prior.filter(m => m.role === "user").map(m => m.content)].flatMap(amountsIn)); // numbers the visitor wrote (a budget) may be repeated back
        let checked = stripUnverifiedAmounts(text, allowedAmounts(cards, sink.policy, rules), said);
        // The model quoted a price without looking it up this turn: look the item up ourselves so a correct price can stay and the card is shown.
        if (checked.removed && !cards.length) {
          const found = await fallbackFind(deps, clean, lang, mode);
          if (found.cards.length) { cards = found.cards.slice(0, 5); checked = stripUnverifiedAmounts(text, allowedAmounts(cards, sink.policy, rules), said); }
        }
        text = checked.text;
        if (!text) {
          if (cards.length) text = say("found", lang); else if (sink.policy) text = lang === "bn" || input.locale === "bn" ? sink.policy.text.bn : sink.policy.text.en; else if (!wantsHuman) { text = say("cannot", lang); }
        }
        if (!text) text = say("cannot", lang);
        const unanswered = (wantsHuman && !cards.length && !sink.policy) || (!cards.length && !sink.policy && text === say("cannot", lang));
        const reply = make({ text, source: "ai", cards, policy: sink.policy, humanHelp: unanswered });
        return await finish(reply, { provider: id, model: resolved.modelId, input: tin, output: tout, outcome: unanswered ? "unanswered" : "answered", reason: wantsHuman ? "model-handoff" : "cannot-answer" });
      } catch (error) {
        failure = classify(error); markFailure(id, failure);
        await recordFailure(deps.db, id, "chat", now.toISOString().slice(0, 10)).catch(() => {});
      }
    }
  } finally { inflight--; }

  // ---- 3. Every provider unavailable: stay useful without inventing anything ---
  // The AI could not answer: greetings and rule questions still get their fixed, accurate answer instead of an error.
  if (talk) return finish(make({ text: say(smallTalkKey[talk], lang) }), { outcome: "answered" });
  if (intent) {
    const { faq: _faq, ...policy } = await getPolicy({ topic: intent }, deps.tools); void _faq;
    return finish(make({ text: lang === "bn" || input.locale === "bn" ? policy.text.bn : policy.text.en, policy, source: "system" }), { outcome: "answered" });
  }
  const why: ChatReply["limit"] = !tried && !failure ? "unavailable" : failure?.kind === "quota" ? "quota" : "unavailable";
  const note = !deps.providers.some(p => deps.model(p)) ? say("noAi", lang) : why === "quota" ? say("quota", lang) : say("unavailable", lang);
  if (vagueProductRequest(clean)) return finish(make({ text: say("askProduct", lang) }), { outcome: "answered" }); // ask what they want first
  // Show products only when something really matches or the visitor asked to browse; never as filler for a greeting or an unrelated question.
  let found = await fallbackFind(deps, clean, lang, mode);
  if (!found.cards.length && wantsBrowse(clean)) {
    try { found = { cards: (await searchProducts({ query: "" }, deps.tools)).cards.slice(0, 3), browse: true }; } catch { /* leave empty */ }
  }
  const hasCards = found.cards.length > 0;
  const noKeys = !deps.providers.some(p => deps.model(p));
  // Without any AI, an unclear message gets a short, natural "didn't get that" (a second one explains the limit and offers a person); no menu of options unless asked.
  // Count the unclear replies already given in a row, so the wording changes and never repeats the same long explanation.
  const misses = (() => { let n = 0; for (const m of [...prior].reverse()) { if (m.role !== "assistant") continue; if ([say("sorry1", lang), say("sorry2", lang), say("sorry3", lang)].includes(m.content)) n++; else break; } return n; })();
  const sorry = say(misses === 0 ? "sorry1" : misses === 1 ? "sorry2" : "sorry3", lang);
  const text = hasCards ? `${noKeys ? "" : `${note}\n\n`}${say(found.browse ? "browse" : "found", lang)}` : noKeys ? sorry : note;
  return finish(make({ text, cards: found.cards, humanHelp: !noKeys || (!hasCards && misses > 0), limit: why }), { outcome: "unanswered", reason: why === "quota" ? "ai-quota" : "ai-unavailable" });
}

/** What the model sees about a product: plain facts only, no images or internal fields. */
const modelView = (c: ProductCard) => ({ slug: c.slug, name: c.name, nameBn: c.nameBn, category: c.category, price: c.price, compareAt: c.compareAt, available: c.inStock, onlyLeft: c.left, sizes: c.sizes, colors: c.colors.map(x => x.name), previewOnly: c.preview });

async function fallbackFind(deps: EngineDeps, text: string, lang: Lang, _mode: StoreMode): Promise<{ cards: ProductCard[]; browse: boolean }> {
  void lang; void _mode;
  try { const r = await searchProducts({ query: content(text).join(" ").slice(0, 80) }, deps.tools); return { cards: r.cards, browse: false }; } catch { return { cards: [], browse: false }; }
}
