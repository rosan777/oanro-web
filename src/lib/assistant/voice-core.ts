// Voice logic with no browser objects, so it can be tested: voice choice, recogniser choice, silence detection and the conversation state machine.
import type { VoiceLang } from "./types";

export type VoiceInfo = { name: string; lang: string; localService?: boolean; default?: boolean };
/** Best installed voice for a language ("bn" or "en"), or null. Never falls back to another language. */
export function pickVoice<T extends VoiceInfo>(voices: T[], want: "bn" | "en"): T | null {
  const norm = (l: string) => l.toLowerCase().replace("_", "-");
  const matches = voices.filter(v => norm(v.lang) === want || norm(v.lang).startsWith(`${want}-`));
  if (!matches.length) return null;
  const score = (v: T) => (want === "bn" ? (norm(v.lang) === "bn-bd" ? 3 : norm(v.lang) === "bn-in" ? 2 : 1) : (norm(v.lang) === "en-us" || norm(v.lang) === "en-gb" ? 3 : norm(v.lang) === "en-in" ? 2 : 1)) * 10 + (v.localService ? 2 : 0) + (v.default ? 1 : 0);
  return [...matches].sort((a, b) => score(b) - score(a))[0];
}
/** Text for speech: no Markdown marks, link syntax or emoji-only noise; bounded and split into sentence-sized pieces (long utterances stall in some browsers). */
export function speechChunks(text: string, max = 180): string[] {
  const plain = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`#>]/g, "").replace(/^[-•]\s+/gm, "").replace(/\s+/g, " ").trim().slice(0, 900);
  const sentences = plain.split(/(?<=[.!?।])\s+/).filter(Boolean); const out: string[] = []; let cur = "";
  for (const s of sentences) { if ((cur + " " + s).trim().length > max && cur) { out.push(cur); cur = s; } else cur = (cur + " " + s).trim(); }
  if (cur) out.push(cur);
  return out.flatMap(c => c.length <= max * 1.6 ? [c] : c.match(new RegExp(`.{1,${max}}(\\s|$)`, "g")) ?? [c]).map(c => c.trim()).filter(Boolean);
}

export type Engine = { kind: "browser"; lang: "bn-BD" | "en-US"; note: "" | "auto-limited" } | { kind: "whisper"; hint: "bn" | "en" | null } | { kind: "none" };
/**
 * Which recogniser to use. Browser recognition handles one language at a time, so Auto (Bangla, English and mixed speech) uses
 * Groq Whisper when the server can transcribe; otherwise Auto is limited to the page language and the visitor is told.
 */
export function chooseEngine(o: { choice: VoiceLang; locale: "en" | "bn"; browserSR: boolean; whisper: boolean }): Engine {
  const pageLang: "bn-BD" | "en-US" = o.locale === "bn" ? "bn-BD" : "en-US";
  if (o.choice === "auto") return o.whisper ? { kind: "whisper", hint: null } : o.browserSR ? { kind: "browser", lang: pageLang, note: "auto-limited" } : { kind: "none" };
  if (o.browserSR) return { kind: "browser", lang: o.choice === "bn" ? "bn-BD" : "en-US", note: "" };
  return o.whisper ? { kind: "whisper", hint: o.choice } : { kind: "none" };
}
/** First recording format this browser can produce (Chrome/Firefox: webm or ogg, Safari/iOS: mp4). */
export function pickRecordingType(isSupported: (type: string) => boolean): string {
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", "audio/ogg"].find(t => isSupported(t)) ?? "";
}

// ---- Silence detection on microphone loudness (RMS 0..1), driven by timestamps so it is deterministic ----
export type VadResult = "waiting" | "speaking" | "end" | "no-speech" | "too-long";
export type VadOptions = { startedAt: number; threshold?: number; endSilenceMs?: number; noSpeechMs?: number; maxMs?: number; minSpeechMs?: number };
export function createVad(o: VadOptions) {
  const threshold = o.threshold ?? 0.03, endSilence = o.endSilenceMs ?? 1300, noSpeech = o.noSpeechMs ?? 8000, max = o.maxMs ?? 25_000, minSpeech = o.minSpeechMs ?? 350;
  let speechMs = 0, lastLoud = 0, lastT = o.startedAt, heard = false;
  return {
    push(rms: number, now: number): VadResult {
      const dt = Math.max(0, now - lastT); lastT = now;
      if (now - o.startedAt >= max) return "too-long";
      if (rms >= threshold) { speechMs += dt; lastLoud = now; if (speechMs >= minSpeech) heard = true; }
      if (heard) return now - lastLoud >= endSilence ? "end" : "speaking";
      return now - o.startedAt >= noSpeech ? "no-speech" : "waiting";
    },
  };
}

// ---- Conversation mode ----
export type ConvState = { phase: "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "paused"; silences: number; failures: number; stopReason: "" | "silence" | "errors" | "user" };
export type ConvEvent = { type: "start" } | { type: "heard"; text: string } | { type: "silence" } | { type: "transcribe-failed" } | { type: "audio-captured" } | { type: "reply"; speakable: boolean } | { type: "reply-failed" } | { type: "spoke" } | { type: "pause" } | { type: "resume" } | { type: "stop" };
export type ConvEffect = "listen" | "submit" | "speak" | "halt" | "none";
export const MAX_SILENCES = 2, MAX_FAILURES = 2;
export const convInitial: ConvState = { phase: "idle", silences: 0, failures: 0, stopReason: "" };
/** Pure transition: every state change and what to do next. Ignores events that would overlap recording, playback or submissions. */
export function conversationStep(s: ConvState, e: ConvEvent): { state: ConvState; effect: ConvEffect } {
  const stop = (reason: ConvState["stopReason"]) => ({ state: { ...convInitial, stopReason: reason }, effect: "halt" as ConvEffect });
  if (e.type === "stop") return stop("user");
  switch (s.phase) {
    case "idle": return e.type === "start" ? { state: { ...convInitial, phase: "listening" }, effect: "listen" } : { state: s, effect: "none" };
    case "listening":
      if (e.type === "audio-captured") return { state: { ...s, phase: "transcribing" }, effect: "none" };
      if (e.type === "heard") return e.text.trim() ? { state: { ...s, phase: "thinking", silences: 0, failures: 0 }, effect: "submit" } : conversationStep(s, { type: "silence" });
      if (e.type === "silence") return s.silences + 1 >= MAX_SILENCES ? stop("silence") : { state: { ...s, silences: s.silences + 1 }, effect: "listen" };
      if (e.type === "transcribe-failed") return s.failures + 1 >= MAX_FAILURES ? stop("errors") : { state: { ...s, failures: s.failures + 1 }, effect: "listen" };
      if (e.type === "pause") return { state: { ...s, phase: "paused" }, effect: "halt" };
      return { state: s, effect: "none" };
    case "transcribing":
      if (e.type === "heard") return e.text.trim() ? { state: { ...s, phase: "thinking", silences: 0, failures: 0 }, effect: "submit" } : conversationStep({ ...s, phase: "listening" }, { type: "silence" });
      if (e.type === "silence") return conversationStep({ ...s, phase: "listening" }, e);
      if (e.type === "transcribe-failed") return conversationStep({ ...s, phase: "listening" }, e);
      if (e.type === "pause") return { state: { ...s, phase: "paused" }, effect: "halt" };
      return { state: s, effect: "none" };
    case "thinking":
      if (e.type === "reply") return e.speakable ? { state: { ...s, phase: "speaking" }, effect: "speak" } : { state: { ...s, phase: "listening" }, effect: "listen" };
      if (e.type === "reply-failed") return s.failures + 1 >= MAX_FAILURES ? stop("errors") : { state: { ...s, phase: "listening", failures: s.failures + 1 }, effect: "listen" };
      if (e.type === "pause") return { state: { ...s, phase: "paused" }, effect: "halt" };
      return { state: s, effect: "none" }; // a second submission while thinking is ignored
    case "speaking":
      if (e.type === "spoke") return { state: { ...s, phase: "listening" }, effect: "listen" };
      if (e.type === "pause") return { state: { ...s, phase: "paused" }, effect: "halt" };
      return { state: s, effect: "none" };
    case "paused": return e.type === "resume" ? { state: { ...s, phase: "listening" }, effect: "listen" } : { state: s, effect: "none" };
  }
}
