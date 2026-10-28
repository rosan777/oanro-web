import type { ProviderId } from "./types";
// Runtime configuration for the assistant. Secrets stay in server environment variables; nothing here is sent to the browser.
const env = process.env;
const bool = (v: string | undefined, d: boolean) => v === undefined || v === "" ? d : v === "true" || v === "1";
const int = (v: string | undefined, d: number, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : d; };

/** Master switch (environment). Off unless ASSISTANT_ENABLED=true, so nothing goes live by accident before the migration is applied and the owner opts in. Admin switches can only turn things off further. */
export const assistantEnvEnabled = () => bool(env.ASSISTANT_ENABLED, false);
export const turnstile = () => ({ secret: env.TURNSTILE_SECRET_KEY ?? "", siteKey: env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "" });

export type ProviderSpec = {
  id: ProviderId; label: string;
  /** Models the assistant may call on this provider (explicit allowlist; anything else is refused). */
  models: string[]; defaultModel: string;
  /** Free-tier daily request cap we enforce ourselves (below the provider's published limit). */
  dailyRequests: number; dailyTokens: number;
  /** May receive visitor chat text. Gemini never does (see providers.ts); unverified providers need explicit approval. */
  customerContent: boolean;
  /** Reset window of the provider's free quota, shown honestly in admin. */
  resetNote: string;
};
export const providerSpecs: Record<ProviderId, ProviderSpec> = {
  groq: { id: "groq", label: "Groq", models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"], defaultModel: "openai/gpt-oss-120b",
    dailyRequests: 800, dailyTokens: 90_000, customerContent: true, resetNote: "Groq does not document its daily reset time; we count per UTC day." },
  cloudflare: { id: "cloudflare", label: "Cloudflare Workers AI", models: ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"], defaultModel: "@cf/meta/llama-3.1-8b-instruct",
    dailyRequests: 150, dailyTokens: 60_000, customerContent: true, resetNote: "Cloudflare's free allowance (10,000 neurons/day) resets at 00:00 UTC. Remaining neurons are not reported by the API." },
  // Alternatives kept as adapters but disabled until verified and approved (see docs/assistant-setup.md).
  cerebras: { id: "cerebras", label: "Cerebras", models: ["llama-3.3-70b"], defaultModel: "llama-3.3-70b", dailyRequests: 0, dailyTokens: 0, customerContent: false, resetNote: "Not verified." },
  openrouter: { id: "openrouter", label: "OpenRouter (experiments)", models: ["meta-llama/llama-3.3-70b-instruct:free"], defaultModel: "meta-llama/llama-3.3-70b-instruct:free", dailyRequests: 0, dailyTokens: 0, customerContent: false, resetNote: "Not verified." },
  // Gemini free-tier content may be used to improve Google products, so it never receives visitor chat text, under any setting.
  gemini: { id: "gemini", label: "Gemini (public-only)", models: ["gemini-2.0-flash"], defaultModel: "gemini-2.0-flash", dailyRequests: 0, dailyTokens: 0, customerContent: false, resetNote: "Never used for visitor chat." },
};
export const knownProviders = Object.keys(providerSpecs) as ProviderId[];

/** The model for a provider: ASSISTANT_<ID>_MODEL when it is on the allowlist, else the default. */
export function modelFor(id: ProviderId): string {
  const spec = providerSpecs[id]; const wanted = env[`ASSISTANT_${id.toUpperCase()}_MODEL`];
  return wanted && spec.models.includes(wanted) ? wanted : spec.defaultModel;
}
export const dailyCaps = (id: ProviderId) => ({
  requests: int(env[`ASSISTANT_${id.toUpperCase()}_DAILY_REQUESTS`], providerSpecs[id].dailyRequests, 0, 1_000_000),
  tokens: int(env[`ASSISTANT_${id.toUpperCase()}_DAILY_TOKENS`], providerSpecs[id].dailyTokens, 0, 100_000_000),
});
/** Provider order for chat. Unknown ids are ignored; providers that may not see visitor text are removed here as well. */
export function providerOrder(): ProviderId[] {
  const raw = (env.ASSISTANT_PROVIDER_ORDER ?? "groq,cloudflare").split(",").map(s => s.trim()) as ProviderId[];
  return [...new Set(raw)].filter(id => knownProviders.includes(id) && id !== "gemini");
}
export const limits = {
  chatPerWindow: int(env.ASSISTANT_CHAT_PER_WINDOW, 20, 1, 500), windowMinutes: int(env.ASSISTANT_CHAT_WINDOW_MINUTES, 10, 1, 1440),
  chatPerDay: int(env.ASSISTANT_CHAT_PER_DAY, 120, 1, 5000), burstPer10s: 4,
  transcribePerWindow: int(env.ASSISTANT_TRANSCRIBE_PER_WINDOW, 12, 1, 200), transcribeDay: int(env.ASSISTANT_TRANSCRIBE_PER_DAY, 80, 1, 2000),
  maxOutputTokens: int(env.ASSISTANT_MAX_OUTPUT_TOKENS, 450, 100, 2000), maxToolSteps: 3, providerTimeoutMs: int(env.ASSISTANT_TIMEOUT_MS, 20_000, 3000, 60_000),
  maxConcurrent: int(env.ASSISTANT_MAX_CONCURRENT, 6, 1, 50), historyMessages: 10, maxMessageChars: 600, maxBodyBytes: 4000,
  audioMaxBytes: 1_500_000, audioMaxSeconds: 30, audioDailySeconds: int(env.ASSISTANT_AUDIO_DAILY_SECONDS, 20_000, 0, 28_800),
  logRetentionDays: 30,
};
/** Groq Whisper (speech to text). Multilingual, so Bangla and English are both recognised. The transcriptions endpoint only; never translations. */
export const whisper = () => ({ key: env.GROQ_API_KEY ?? "", model: env.ASSISTANT_WHISPER_MODEL === "whisper-large-v3" ? "whisper-large-v3" : "whisper-large-v3-turbo" });
