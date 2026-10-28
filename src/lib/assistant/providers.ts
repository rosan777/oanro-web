// Chat providers behind one small interface. The engine asks for a model by provider id and never sees keys or SDK details.
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, type LanguageModel } from "ai";
import { modelFor, providerSpecs } from "./config";
import type { ProviderId } from "./types";

const env = process.env;
export type Resolved = { model: LanguageModel; modelId: string };

/** Alternatives stay off until the owner verifies their terms and sets ASSISTANT_APPROVE_<ID>=true. Gemini is never available for visitor chat. */
const approved = (id: ProviderId) => env[`ASSISTANT_APPROVE_${id.toUpperCase()}`] === "true";
export function providerConfigured(id: ProviderId): boolean {
  if (!providerSpecs[id].customerContent && !(approved(id) && (id === "cerebras" || id === "openrouter"))) return false;
  if (id === "groq") return Boolean(env.GROQ_API_KEY);
  if (id === "cloudflare") return Boolean(env.CLOUDFLARE_API_TOKEN && /^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID ?? ""));
  if (id === "cerebras") return Boolean(env.CEREBRAS_API_KEY);
  if (id === "openrouter") return Boolean(env.OPENROUTER_API_KEY);
  return false;
}
/** Builds the model for a provider. Base URLs are fixed constants (the Cloudflare account id is validated), so no visitor input can steer a request. */
export function resolveModel(id: ProviderId): Resolved | null {
  if (!providerConfigured(id)) return null;
  const modelId = modelFor(id);
  if (!providerSpecs[id].models.includes(modelId)) return null;
  if (id === "groq") return { model: createGroq({ apiKey: env.GROQ_API_KEY })(modelId), modelId };
  if (id === "cloudflare") return { model: createOpenAICompatible({ name: "cloudflare", apiKey: env.CLOUDFLARE_API_TOKEN, baseURL: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/v1` })(modelId), modelId };
  if (id === "cerebras") return { model: createOpenAICompatible({ name: "cerebras", apiKey: env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })(modelId), modelId };
  if (id === "openrouter") return { model: createOpenAICompatible({ name: "openrouter", apiKey: env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })(modelId), modelId };
  return null;
}

// ---- Failure classification and a per-instance cooldown so an unhealthy provider is skipped quickly ----
export type Failure = { kind: "quota" | "auth" | "outage" | "bad"; retryAfter: number };
export function classify(error: unknown): Failure {
  if (APICallError.isInstance(error)) {
    const status = error.statusCode ?? 0;
    const ra = Number(error.responseHeaders?.["retry-after"]);
    if (status === 429) return { kind: "quota", retryAfter: Number.isFinite(ra) && ra > 0 ? Math.min(ra, 3600) : 60 };
    if (status === 401 || status === 403) return { kind: "auth", retryAfter: 3600 };
    if (status === 400 || status === 404 || status === 422) return { kind: "bad", retryAfter: 0 };
    return { kind: "outage", retryAfter: 30 };
  }
  return { kind: "outage", retryAfter: 20 }; // timeouts, aborts, network errors, malformed responses
}
const cooldown = new Map<ProviderId, number>();
export const isHealthy = (id: ProviderId, now = Date.now()) => (cooldown.get(id) ?? 0) <= now;
export function markFailure(id: ProviderId, f: Failure, now = Date.now()) { if (f.retryAfter > 0) cooldown.set(id, now + f.retryAfter * 1000); }
export const resetHealth = () => cooldown.clear();
export const cooldownUntil = (id: ProviderId) => cooldown.get(id) ?? 0;
