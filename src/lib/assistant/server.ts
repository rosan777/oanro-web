import "server-only";
// Server wiring for the assistant: real data sources, request guards, session cookies and public configuration.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { authConfigured } from "../auth";
import { getCheckoutRules, getPaymentNumbers, DEFAULT_RULES } from "../order-store";
import { publicRules } from "../public-rules";
import { clientIp } from "../rate-limit";
import { storeLive } from "../seo";
import { contactLinks, getSiteContent } from "../site-content";
import { getSiteConfig } from "../site-config";
import { getStoreProducts, catalogDb } from "../store-products";
import { storefrontCached } from "../storefront-cache";
import { assistantEnvEnabled, turnstile, whisper } from "./config";
import { providerConfigured } from "./providers";
import { safeContactUrl } from "./sanitize";
import { consume, defaultSettings, getSettings, hash, listFaq, newSessionToken, sessionIdFor, type AssistantSettings, type Faq } from "./store";
import type { HumanHelp, PublicAssistantConfig, StoreMode } from "./types";
import type { ToolContext } from "./tools";
import { appSecret } from "../app-secret";

export const noStore = { "Cache-Control": "no-store, private" };
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

// Cached with the storefront (60 s) and cleared at once when an admin saves anything, so FAQ and rules never go stale.
const cachedSettings = storefrontCached("assistant-settings", () => getSettings(catalogDb()));
const cachedFaq = storefrontCached("assistant-faq", () => listFaq(catalogDb()));
export const loadSettings = cache(async (): Promise<AssistantSettings> => hasDatabase() ? await cachedSettings().catch(() => defaultSettings) : defaultSettings);
export const loadFaq = async (): Promise<Faq[]> => hasDatabase() ? await cachedFaq().then(rows => rows.map(r => ({ ...r, createdAt: new Date(r.createdAt), updatedAt: new Date(r.updatedAt) }))).catch(() => []) : [];

const checkoutOpen = async () => {
  if (!storeLive() || !authConfigured() || !hasDatabase()) return false;
  const n = await getPaymentNumbers(catalogDb()).catch(() => ({ bkash: "", nagad: "" }));
  return Boolean(n.bkash || n.nagad);
};
export const storeMode = async (): Promise<StoreMode> => {
  const live = storeLive(), open = await checkoutOpen();
  return { live, checkoutOpen: open, notice: live && open ? null : { en: live ? "Checkout isn't open right now." : "The shop is in preview: items and prices are examples and checkout isn't open yet.", bn: live ? "এই মুহূর্তে চেকআউট খোলা নেই।" : "শপ এখন প্রিভিউ অবস্থায়: পণ্য ও দাম উদাহরণ মাত্র, চেকআউট এখনো খোলেনি।" } };
};
export const productionTools = (): ToolContext => ({
  products: async () => getSiteConfig().products ? await getStoreProducts() : [],
  rules: async () => hasDatabase() ? await getCheckoutRules(catalogDb()).catch(() => DEFAULT_RULES) : DEFAULT_RULES,
  mode: storeMode,
  faq: async () => (await loadFaq()).filter(f => f.enabled).map(f => ({ question: f.questionEn, answer: f.answerEn })),
  paymentMethods: async () => { if (!hasDatabase()) return []; const n = await getPaymentNumbers(catalogDb()).catch(() => ({ bkash: "", nagad: "" })); return [n.bkash && "bKash", n.nagad && "Nagad"].filter(Boolean) as string[]; },
});
export { publicRules };

/** Contact options for "Talk to a person": only the owner's configured destinations, on known hosts. */
export async function humanHelp(): Promise<HumanHelp> {
  const links = contactLinks(await getSiteContent());
  return { contactUrl: "/contact", whatsapp: safeContactUrl(links.whatsapp), messenger: safeContactUrl(links.messenger), email: links.email && /^[^\s@<>"]+@[^\s@<>"]+$/.test(links.email) ? `mailto:${links.email}` : "" };
}
export async function publicConfig(): Promise<PublicAssistantConfig> {
  const s = await loadSettings(), ts = turnstile();
  const enabled = assistantEnvEnabled() && s.enabled && hasDatabase();
  return { enabled, voice: enabled && s.voice, tracking: enabled && s.tracking, transcription: enabled && s.voice && Boolean(whisper().key), turnstileSiteKey: ts.secret && ts.siteKey ? ts.siteKey : "", human: await humanHelp() };
}
export const aiConfigured = () => providerConfigured("groq") || providerConfigured("cloudflare");

// ---- Request guards ----------------------------------------------------------------
/** Cookie-authenticated or session-bearing POSTs must come from this site. CORS is not authentication; this is a real check. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  if (!origin || !host) return false;
  try { if (new URL(origin).host !== host) return false; } catch { return false; }
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin";
}
export const json = (body: unknown, status = 200, extra: HeadersInit = {}) => Response.json(body, { status, headers: { ...noStore, ...extra } });
export async function readBytes(request: Request, max: number): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > max) return null;
  const reader = request.body?.getReader(); if (!reader) return null;
  const chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) return null; chunks.push(value); } } finally { await reader.cancel().catch(() => {}); }
  return Buffer.concat(chunks);
}

/** Visitor key for rate limits: a salted hash of the IP (never stored raw). Without an IP (local development) one shared bucket is used. */
export const visitorKey = (request: Request) => hash(clientIp(request) || "no-ip", "visitor").slice(0, 32);
/** Shared by chat, transcription and both tracking entry points. Throws if the shared counter is unavailable so callers fail closed. */
export async function limit(request: Request, name: string, max: number, windowMs: number) {
  return consume(catalogDb(), `asst:${name}:${visitorKey(request)}`, max, windowMs);
}

// ---- Session cookie: a random bearer value; the database only keeps its hash, and the browser script cannot read it ----
const COOKIE = "oanro_asst", OK = "oanro_asst_ok";
const secret = () => appSecret("oanro-local");
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
export function readCookie(request: Request, name: string) {
  const m = (request.headers.get("cookie") ?? "").split(/;\s*/).find(c => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : "";
}
const secure = (request: Request) => request.headers.get("x-forwarded-proto") === "https" || new URL(request.url).protocol === "https:";
const cookieHeader = (request: Request, name: string, value: string, maxAge?: number) =>
  `${name}=${encodeURIComponent(value)}; Path=/api/assistant; HttpOnly; SameSite=Lax${secure(request) ? "; Secure" : ""}${maxAge !== undefined ? `; Max-Age=${maxAge}` : ""}`;
export function sessionFrom(request: Request): { sessionId: string; token: string; isNew: boolean; cookies: string[] } {
  const existing = readCookie(request, COOKIE);
  if (/^[a-f0-9]{64}$/.test(existing)) return { sessionId: sessionIdFor(existing), token: existing, isNew: false, cookies: [] };
  const token = newSessionToken();
  return { sessionId: sessionIdFor(token), token, isNew: true, cookies: [cookieHeader(request, COOKIE, token)] };
}
export const clearCookies = (request: Request) => [cookieHeader(request, COOKIE, "", 0), cookieHeader(request, OK, "", 0)];
export const verifiedMark = (request: Request, token: string) => cookieHeader(request, OK, `${sign(token)}`);
export function isVerified(request: Request, token: string) {
  const got = Buffer.from(readCookie(request, OK)), want = Buffer.from(sign(token));
  return got.length === want.length && timingSafeEqual(got, want);
}
export const withCookies = (res: Response, cookies: string[]) => { for (const c of cookies) res.headers.append("Set-Cookie", c); return res; };

/** Cloudflare Turnstile (free). Only enforced when both keys are configured. Fixed verification URL. */
export async function verifyTurnstile(token: string, request: Request): Promise<boolean> {
  const { secret: s } = turnstile(); if (!s) return true;
  if (!token || token.length > 2100) return false;
  const body = new URLSearchParams({ secret: s, response: token, remoteip: clientIp(request) });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, signal: AbortSignal.timeout(8000) }).catch(() => null);
  const data = await res?.json().catch(() => null) as { success?: boolean } | null;
  return data?.success === true;
}
/** Personalisation consent as the browser mirrored it into the first-party cookie (f1a1p1). The server never trusts the page alone. */
export const personalisationAllowed = (request: Request) => /(?:^|;\s*)oanro_consent=[^;]*p1/.test(request.headers.get("cookie") ?? "");
export const randomId = () => randomBytes(12).toString("hex");
