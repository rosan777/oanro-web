// Speech to text through Groq's multilingual Whisper (transcriptions endpoint only, never the English-only translations one).
import { whisper } from "./config";

export type Transcript = { text: string; language: string; seconds: number };
export class TranscribeError extends Error { constructor(public kind: "unconfigured" | "quota" | "auth" | "failed" | "empty", public retryAfter = 0) { super(kind); } }
const mimeOk = /^(audio\/(webm|ogg|mp4|mpeg|mp3|wav|x-wav|x-m4a|m4a|aac|flac)|video\/(webm|mp4))(;.*)?$/i;
export const allowedAudioType = (type: string) => mimeOk.test(type);
const ext = (type: string) => /webm/i.test(type) ? "webm" : /ogg/i.test(type) ? "ogg" : /mp4|m4a|aac/i.test(type) ? "m4a" : /wav/i.test(type) ? "wav" : /flac/i.test(type) ? "flac" : "mp3";

/** `hint` is only set when the visitor chose বাংলা or English; Auto leaves language detection to Whisper so mixed speech keeps both scripts. */
export async function transcribeAudio(bytes: ArrayBuffer, type: string, hint: "bn" | "en" | null, fetcher: typeof fetch = fetch): Promise<Transcript> {
  const { key, model } = whisper();
  if (!key) throw new TranscribeError("unconfigured");
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: type.split(";")[0] }), `speech.${ext(type)}`);
  form.set("model", model); form.set("response_format", "verbose_json"); form.set("temperature", "0");
  if (hint) form.set("language", hint);
  // Fixed destination: the request can never be pointed anywhere else by the caller.
  const res = await fetcher("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(25_000) });
  if (res.status === 429) throw new TranscribeError("quota", Math.min(Number(res.headers.get("retry-after")) || 60, 3600));
  if (res.status === 401 || res.status === 403) throw new TranscribeError("auth", 3600);
  if (!res.ok) throw new TranscribeError("failed", 20);
  const data = await res.json().catch(() => null) as { text?: unknown; language?: unknown; duration?: unknown } | null;
  const text = typeof data?.text === "string" ? data.text.replace(/\s+/g, " ").trim().slice(0, 600) : "";
  if (!/[\p{L}\p{N}]/u.test(text)) throw new TranscribeError("empty"); // only punctuation (noise or silence) counts as no speech
  return { text, language: typeof data?.language === "string" ? data.language.slice(0, 20) : "", seconds: typeof data?.duration === "number" ? data.duration : 0 };
}
