import { limits, whisper } from "@/lib/assistant/config";
import { detectLanguage } from "@/lib/assistant/language";
import { hasDatabase, json, limit, publicConfig, readBytes, sameOrigin } from "@/lib/assistant/server";
import { recordFailure, reserveAudio } from "@/lib/assistant/store";
import { allowedAudioType, transcribeAudio, TranscribeError } from "@/lib/assistant/transcribe";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Speech to text. The audio lives only in memory for this request: it is forwarded to Groq Whisper and never saved or logged. */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "ORIGIN_FORBIDDEN" }, 403);
  const config = await publicConfig();
  if (!config.enabled || !config.voice || !hasDatabase()) return json({ error: "VOICE_OFF" }, 403);
  if (!config.transcription) return json({ error: "TRANSCRIBE_UNAVAILABLE" }, 503);
  if (!(request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) return json({ error: "INVALID_INPUT" }, 415);
  const body = await readBytes(request, limits.audioMaxBytes + 4096);
  if (!body) return json({ error: "TOO_LARGE" }, 413);
  let form: FormData;
  try { form = await new Response(body as BodyInit, { headers: { "content-type": request.headers.get("content-type")! } }).formData(); } catch { return json({ error: "INVALID_INPUT" }, 400); }
  const file = form.get("audio"), lang = form.get("lang"), seconds = Number(form.get("seconds"));
  if (!(file instanceof File) || file.size < 800 || file.size > limits.audioMaxBytes || !allowedAudioType(file.type)) return json({ error: "INVALID_AUDIO" }, 400);
  if (!Number.isFinite(seconds) || seconds < 0.3 || seconds > limits.audioMaxSeconds) return json({ error: "INVALID_AUDIO" }, 400);
  if (file.size > seconds * 40_000 + 20_000) return json({ error: "INVALID_AUDIO" }, 400); // bytes must be plausible for the declared length
  if (lang !== "auto" && lang !== "bn" && lang !== "en") return json({ error: "INVALID_INPUT" }, 400);
  const db = catalogDb();
  try {
    const [win, day] = [await limit(request, "stt", limits.transcribePerWindow, limits.windowMinutes * 60_000), await limit(request, "stt-day", limits.transcribeDay, 86_400_000)];
    const blocked = [win, day].find(r => !r.ok);
    if (blocked) return json({ error: "RATE_LIMITED", retryAfter: blocked.retryAfter }, 429, { "Retry-After": String(blocked.retryAfter) });
    if (!(await reserveAudio(db, seconds, { requests: Number(process.env.ASSISTANT_TRANSCRIBE_DAILY_REQUESTS) || 1500, seconds: limits.audioDailySeconds }, whisper().model))) return json({ error: "QUOTA" }, 429);
  } catch { return json({ error: "UNAVAILABLE" }, 503); } // fail closed when quota enforcement is unavailable
  try {
    const t = await transcribeAudio(await file.arrayBuffer(), file.type, lang === "auto" ? null : lang);
    return json({ text: t.text, language: detectLanguage(t.text), detected: t.language });
  } catch (error) {
    await recordFailure(db, "groq", "transcribe").catch(() => {});
    if (error instanceof TranscribeError) {
      if (error.kind === "quota") return json({ error: "QUOTA", retryAfter: error.retryAfter }, 429, error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {});
      if (error.kind === "empty") return json({ error: "NO_SPEECH" }, 422);
      if (error.kind === "unconfigured") return json({ error: "TRANSCRIBE_UNAVAILABLE" }, 503);
    }
    return json({ error: "TRANSCRIBE_FAILED" }, 502);
  }
}
