"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AudioLines, Mic, Pause, Play, Square } from "lucide-react";
import type { ChatReply, PublicAssistantConfig, VoiceLang } from "@/lib/assistant/types";
import { speak, stopSpeaking } from "@/lib/assistant/speech";
import { chooseEngine, conversationStep, convInitial, createVad, pickRecordingType, type ConvEffect, type ConvEvent, type ConvState } from "@/lib/assistant/voice-core";

export type VoiceBarProps = { config: PublicAssistantConfig; locale: "en" | "bn"; busy: boolean; onDictation: (text: string) => void; onSend: (text: string) => Promise<ChatReply | null>; onNotice: (message: string | null) => void; host: HTMLElement | null };
type Phase = "idle" | "listening" | "transcribing" | "thinking" | "speaking" | "paused";
type Outcome = { kind: "heard"; text: string } | { kind: "silence" } | { kind: "failed" } | { kind: "denied" } | { kind: "unsupported" } | { kind: "cancelled" } | { kind: "quota" };

// Minimal typing for the browser's recognition API (not in every TypeScript DOM lib).
type SRResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SR = { lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; abort(): void; onresult: ((e: SRResultEvent) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };
const recognitionCtor = (): (new () => SR) | null => { const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR }; return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null; };
const ACK = "oanro-asst-voice-ack", LANG = "oanro-asst-voice-lang";

export default function VoiceBar({ config, locale, busy, onDictation, onSend, onNotice, host }: VoiceBarProps) {
  const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [choice, setChoice] = useState<VoiceLang>(() => { try { const l = sessionStorage.getItem(LANG); return l === "bn" || l === "en" || l === "auto" ? l : "auto"; } catch { return "auto"; } });
  const [mode, setMode] = useState<"off" | "dictation" | "conversation">("off");
  const [phase, setPhase] = useState<Phase>("idle");
  const [acked, setAcked] = useState(() => { try { return sessionStorage.getItem(ACK) === "1"; } catch { return false; } }); const [hint, setHint] = useState(false);
  const [whisperBlockedUntil, setBlocked] = useState(0);
  const run = useRef(0), conv = useRef<ConvState>(convInitial), choiceRef = useRef<VoiceLang>(choice);
  const cleanup = useRef<(() => void) | null>(null), finishNow = useRef<(() => void) | null>(null), abort = useRef<AbortController | null>(null);
  const live = useRef({ onSend, onDictation, onNotice, busy });
  useEffect(() => { live.current = { onSend, onDictation, onNotice, busy }; }); // always the latest callbacks, without re-creating the listening functions
  // The browser shows its own "Allow microphone?" prompt when listening starts. We only get here when it was refused or dismissed, so say what to do next.
  const deniedNotice = async () => {
    let state = ""; try { state = (await navigator.permissions.query({ name: "microphone" as PermissionName })).state; } catch { /* not supported: use the general wording */ }
    live.current.onNotice(state === "denied"
      ? t("Mic blocked. Allow it from the lock icon.", "মাইক বন্ধ। লক আইকন থেকে চালু করুন।")
      : t("Allow the mic to use voice.", "ভয়েসের জন্য মাইক Allow করুন।"));
  };

  const pickLang = (l: VoiceLang) => { setChoice(l); choiceRef.current = l; try { sessionStorage.setItem(LANG, l); } catch {} };

  /** Stops every microphone track, recognition session, audio context, upload and playback. Safe to call any time. */
  const halt = useCallback(() => { run.current++; stopSpeaking(); abort.current?.abort(); abort.current = null; cleanup.current?.(); cleanup.current = null; finishNow.current = null; }, []);
  useEffect(() => {
    const away = () => { if (document.visibilityState === "hidden") { halt(); conv.current = convInitial; setMode("off"); setPhase("idle"); } };
    document.addEventListener("visibilitychange", away); window.addEventListener("pagehide", halt);
    return () => { document.removeEventListener("visibilitychange", away); window.removeEventListener("pagehide", halt); halt(); };
  }, [halt]);

  /** One listening turn with whichever recogniser suits the chosen language. Always releases the microphone before it returns. */
  const listenOnce = useCallback(async (id: number, onCaptured: () => void): Promise<Outcome> => {
    const SRc = recognitionCtor();
    const media = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
    const whisperOk = config.transcription && media && Date.now() >= whisperBlockedUntil;
    const engine = chooseEngine({ choice: choiceRef.current, locale, browserSR: Boolean(SRc), whisper: whisperOk });
    if (engine.kind === "none") { live.current.onNotice(t("Voice input isn't available in this browser right now. You can still type.", "এই ব্রাউজারে এখন ভয়েস ইনপুট পাওয়া যাচ্ছে না। আপনি লিখতে পারেন।")); return { kind: "unsupported" }; }
    if (engine.kind === "browser" && engine.note === "auto-limited") live.current.onNotice(t(`Auto-detect needs the server speech service, which isn't available now. Listening in ${engine.lang === "bn-BD" ? "Bangla" : "English"} only; choose a language above to change it.`, `অটো-ডিটেক্টের জন্য সার্ভারের স্পিচ সেবা লাগে, যা এখন নেই। শুধু ${engine.lang === "bn-BD" ? "বাংলা" : "ইংরেজি"} শোনা হচ্ছে; ওপরে ভাষা বেছে নিন।`));

    if (engine.kind === "browser" && SRc) {
      return new Promise<Outcome>(resolve => {
        const r = new SRc(); r.lang = engine.lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = 1;
        let text = "", error = "", done = false;
        const finish = () => { if (done) return; done = true; clearTimeout(timer); finishNow.current = null; cleanup.current = null; try { r.abort(); } catch {}
          if (run.current !== id) return resolve({ kind: "cancelled" });
          resolve(text ? { kind: "heard", text } : error === "not-allowed" || error === "service-not-allowed" ? { kind: "denied" } : error === "no-speech" || !error ? { kind: "silence" } : { kind: "failed" }); };
        const timer = setTimeout(() => { try { r.stop(); } catch {} setTimeout(finish, 1500); }, 12_000);
        r.onresult = e => { text = (e.results[0]?.[0]?.transcript ?? "").trim(); onCaptured(); };
        r.onerror = e => { error = e.error; }; r.onend = finish;
        cleanup.current = () => { done = true; clearTimeout(timer); try { r.abort(); } catch {} }; finishNow.current = () => { try { r.stop(); } catch {} };
        try { r.start(); } catch { error = "failed"; finish(); }
      });
    }

    // Groq Whisper path: record with MediaRecorder, watch loudness to find the end of speech, upload once.
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { return { kind: (e as DOMException).name === "NotAllowedError" || (e as DOMException).name === "SecurityError" ? "denied" : "failed" } as Outcome; }
    if (run.current !== id) { stream.getTracks().forEach(tr => tr.stop()); return { kind: "cancelled" }; }
    const type = pickRecordingType(ty => MediaRecorder.isTypeSupported(ty));
    const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24_000 });
    const chunks: Blob[] = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const ctx = new AudioContext(); const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; ctx.createMediaStreamSource(stream).connect(analyser); // not connected to the speakers, so no echo
    const buf = new Float32Array(analyser.fftSize); const started = performance.now(); const vad = createVad({ startedAt: started });
    type Why = "end" | "no-speech" | "too-long" | "manual" | "cancelled";
    const state = { reason: "end" as Why, stopped: false };
    const release = () => { stream.getTracks().forEach(tr => tr.stop()); void ctx.close().catch(() => {}); };
    let resolveStop: () => void = () => {};
    const stoppedP = new Promise<void>(resolve => { resolveStop = resolve; }); rec.onstop = () => resolveStop();
    const stop = (why: Why) => { if (state.stopped) return; state.stopped = true; state.reason = why; clearInterval(tick); try { if (rec.state !== "inactive") rec.stop(); else resolveStop(); } catch { resolveStop(); } };
    const tick = setInterval(() => { analyser.getFloatTimeDomainData(buf); let sum = 0; for (const v of buf) sum += v * v; const r = vad.push(Math.sqrt(sum / buf.length), performance.now());
      if (r === "end" || r === "no-speech" || r === "too-long") stop(r); }, 100);
    cleanup.current = () => { stop("cancelled"); release(); }; finishNow.current = () => stop("manual");
    rec.start(250);
    await stoppedP; release(); cleanup.current = null; finishNow.current = null;
    if (run.current !== id || state.reason === "cancelled") return { kind: "cancelled" };
    if (state.reason === "no-speech") return { kind: "silence" };
    const seconds = Math.min(30, Math.max(0.5, (performance.now() - started) / 1000));
    const blob = new Blob(chunks, { type: rec.mimeType || type || "audio/webm" });
    if (blob.size < 800) return { kind: "silence" };
    if (blob.size > 1_500_000) { live.current.onNotice(t("That recording was too long. Please speak in shorter turns.", "রেকর্ডিং অনেক লম্বা হয়ে গেছে। ছোট ছোট করে বলুন।")); return { kind: "failed" }; }
    onCaptured();
    const form = new FormData(); form.set("audio", blob, `speech.${blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm"}`); form.set("lang", choiceRef.current); form.set("seconds", seconds.toFixed(2));
    const controller = new AbortController(); abort.current = controller;
    try {
      const res = await fetch("/api/assistant/transcribe", { method: "POST", body: form, credentials: "same-origin", signal: controller.signal });
      if (run.current !== id) return { kind: "cancelled" };
      if (res.status === 429) { const d = await res.json().catch(() => ({})) as { retryAfter?: number }; setBlocked(Date.now() + (d.retryAfter ?? 300) * 1000);
        live.current.onNotice(t("Voice transcription has reached its free limit for now. You can type, or use your browser's own dictation if it has one.", "ভয়েস ট্রান্সক্রিপশনের বিনামূল্যের সীমা আপাতত শেষ। আপনি লিখতে পারেন, বা ব্রাউজারের নিজস্ব ডিক্টেশন ব্যবহার করুন।")); return { kind: "quota" }; }
      if (res.status === 422) return { kind: "silence" };
      if (!res.ok) { live.current.onNotice(t("I couldn't turn that into text. Please try again or type.", "এটা লেখায় রূপান্তর করা যায়নি। আবার চেষ্টা করুন বা লিখুন।")); return { kind: "failed" }; }
      const d = await res.json() as { text: string }; return d.text ? { kind: "heard", text: d.text } : { kind: "silence" };
    } catch { return run.current !== id ? { kind: "cancelled" } : { kind: "failed" }; }
    finally { abort.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.transcription, locale, whisperBlockedUntil]);

  async function dictate() {
    if (mode === "dictation") { finishNow.current?.(); return; }
    halt(); const id = ++run.current; setMode("dictation"); setPhase("listening"); live.current.onNotice(null);
    const out = await listenOnce(id, () => setPhase("transcribing"));
    if (run.current !== id) return;
    setMode("off"); setPhase("idle");
    if (out.kind === "heard") { live.current.onDictation(out.text); live.current.onNotice(t("Check the text, fix anything, then press Send.", "লেখাটি দেখে নিন, দরকার হলে ঠিক করুন, তারপর পাঠান চাপুন।")); }
    else if (out.kind === "silence") live.current.onNotice(t("I didn't hear anything. Tap Dictate and try again.", "কিছু শুনতে পাইনি। ডিক্টেট চেপে আবার বলুন।"));
    else if (out.kind === "denied") void deniedNotice();
    else if (out.kind === "failed") live.current.onNotice(t("Speech recognition didn't work this time. Please try again or type.", "এবার স্পিচ রিকগনিশন কাজ করেনি। আবার চেষ্টা করুন বা লিখুন।"));
  }

  /** Conversation: listen → transcribe → send → show and speak the reply → listen again, until paused, stopped or the silence/error limits are hit. */
  async function converse(first: ConvEffect, id: number) {
    let effect: ConvEffect = first; let pending = ""; let spoken = "";
    const apply = (ev: ConvEvent) => { const r = conversationStep(conv.current, ev); conv.current = r.state; setPhase(r.state.phase); return r.effect; };
    while (run.current === id) {
      if (effect === "listen") {
        const out = await listenOnce(id, () => { apply({ type: "audio-captured" }); });
        if (run.current !== id) return;
        if (out.kind === "heard") { pending = out.text; effect = apply({ type: "heard", text: out.text }); }
        else if (out.kind === "silence") effect = apply({ type: "silence" });
        else if (out.kind === "failed" || out.kind === "quota") effect = apply({ type: "transcribe-failed" });
        else if (out.kind === "denied") { void deniedNotice(); effect = "halt"; conv.current = convInitial; }
        else return;
      } else if (effect === "submit") {
        const reply = await live.current.onSend(pending);
        if (run.current !== id) return;
        if (reply) { spoken = reply.text; effect = apply({ type: "reply", speakable: true }); } else effect = apply({ type: "reply-failed" });
      } else if (effect === "speak") {
        try { await speak(spoken, m => live.current.onNotice(m), bn ? "bn" : "en"); } catch { /* speech problems never stop the conversation */ }
        if (run.current !== id) return;
        effect = apply({ type: "spoke" });
      } else break;
    }
    if (run.current !== id) return;
    const reason = conv.current.stopReason;
    halt(); setMode("off"); setPhase("idle");
    if (reason === "silence") live.current.onNotice(t("I didn't hear anything, so I stopped listening. Tap Conversation to start again.", "কিছু শুনতে না পেয়ে শোনা বন্ধ করেছি। আবার শুরু করতে কনভারসেশন চাপুন।"));
    if (reason === "errors") live.current.onNotice(t("Voice conversation stopped after repeated problems. You can still type.", "বারবার সমস্যা হওয়ায় ভয়েস কনভারসেশন বন্ধ হয়েছে। আপনি লিখতে পারেন।"));
  }
  function startConversation() { halt(); conv.current = convInitial; const id = ++run.current; setMode("conversation"); live.current.onNotice(null); const e = conversationStep(conv.current, { type: "start" }); conv.current = e.state; setPhase(e.state.phase); void converse(e.effect, id); }
  function pause() { const r = conversationStep(conv.current, { type: "pause" }); conv.current = r.state; setPhase(r.state.phase); halt(); }
  function resume() { const r = conversationStep(conv.current, { type: "resume" }); conv.current = r.state; setPhase(r.state.phase); const id = ++run.current; void converse(r.effect, id); }
  function stopAll() { conv.current = convInitial; halt(); setMode("off"); setPhase("idle"); live.current.onNotice(null); }
  // First use in a session: show the short notice (no confirmation step) while listening starts; it fades after a few seconds.
  // Step 1 of every voice start: ask the browser for the microphone. This is what makes the browser show its own
  // "this site wants to use your microphone" pop-up (Allow / Block). Once allowed, listening starts by itself and the browser
  // remembers the choice. If the site was blocked earlier, browsers never ask again, so we say how to turn it back on.
  const [asking, setAsking] = useState(false);
  const ensureMic = async (): Promise<boolean> => {
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) return true; // no direct microphone API: the browser's own recogniser asks when it starts
    try { const state = (await navigator.permissions.query({ name: "microphone" as PermissionName })).state; if (state === "granted") return true; if (state === "denied") { void deniedNotice(); return false; } } catch { /* not supported (e.g. Firefox): just ask */ }
    setAsking(true);
    try { const stream = await media.getUserMedia({ audio: true }); stream.getTracks().forEach(track => track.stop()); return true; }
    catch (e) {
      const name = (e as DOMException).name;
      if (name === "NotAllowedError" || name === "SecurityError") void deniedNotice();
      else live.current.onNotice(t("No microphone found. Plug one in or type instead.", "কোনো মাইক্রোফোন পাওয়া যায়নি। মাইক লাগান বা লিখুন।"));
      return false;
    } finally { setAsking(false); }
  };
  const begin = async (which: "dictation" | "conversation") => {
    if (asking) return;
    if (!(await ensureMic())) return;
    if (!acked) { try { sessionStorage.setItem(ACK, "1"); } catch {} setAcked(true); setHint(true); }
    if (which === "dictation") void dictate(); else startConversation();
  };
  useEffect(() => { if (!hint) return; const id = setTimeout(() => setHint(false), 9000); return () => clearTimeout(id); }, [hint]);

  const phaseText: Record<Phase, string> = { idle: "", listening: t("Listening… speak now", "শুনছি… বলুন"), transcribing: t("Turning your speech into text…", "কথা লেখায় রূপান্তর হচ্ছে…"), thinking: t("Thinking…", "ভাবছি…"), speaking: t("Speaking…", "বলছি…"), paused: t("Paused", "বিরতি") };
  const active = mode !== "off";
  return <>
    {asking && <p className="asst-toast is-ask" role="status">{t("Allow the microphone in the browser pop-up", "ব্রাউজারের পপ-আপে মাইক্রোফোন Allow করুন")}</p>}
    {hint && <p className="asst-toast" role="status">{t("Speech service (Groq / browser) converts your voice. No phone, PIN or order numbers. Audio isn't saved.", "স্পিচ সেবা (Groq / ব্রাউজার) আপনার কণ্ঠ লেখায় রূপান্তর করে। ফোন, PIN বা অর্ডার নম্বর বলবেন না। অডিও সংরক্ষিত হয় না।")}</p>}
    {host && createPortal(<>
      <select className="asst-lang" aria-label={t("Speech language", "কথার ভাষা")} title={t("Language you speak", "যে ভাষায় বলবেন")} value={choice} disabled={active} onChange={e => pickLang(e.target.value as VoiceLang)}>
        <option value="auto">{t("Auto", "অটো")}</option><option value="bn">বাংলা</option><option value="en">English</option>
      </select>
      <button type="button" className={`asst-round${mode === "dictation" ? " is-on" : ""}`} aria-pressed={mode === "dictation"} disabled={mode === "conversation" || (busy && mode === "off")}
        aria-label={mode === "dictation" ? t("Finish dictation", "ডিক্টেশন শেষ করুন") : t("Dictate: speak, then review and send", "ডিক্টেট: বলুন, দেখে নিয়ে পাঠান")} title={mode === "dictation" ? t("Finish", "শেষ") : t("Dictate", "ডিক্টেট")}
        onClick={() => mode === "dictation" ? finishNow.current?.() : void begin("dictation")}>{mode === "dictation" ? <Square size={16} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}</button>
      <button type="button" className={`asst-round asst-round-dark${mode === "conversation" ? " is-on" : ""}`} aria-pressed={mode === "conversation"} disabled={mode === "dictation" || (busy && mode === "off")}
        aria-label={mode === "conversation" ? t("Stop voice conversation", "ভয়েস কনভারসেশন থামান") : t("Start voice conversation: hands-free", "ভয়েস কনভারসেশন শুরু করুন: হাত না লাগিয়ে")} title={mode === "conversation" ? t("Stop", "থামান") : t("Conversation", "কনভারসেশন")}
        onClick={() => mode === "conversation" ? stopAll() : void begin("conversation")}>{mode === "conversation" ? <Square size={16} aria-hidden="true" /> : <AudioLines size={20} aria-hidden="true" />}</button>
    </>, host)}
    {active && <div className={`asst-status${phase === "listening" || phase === "speaking" ? " is-live" : ""}`} role="status" aria-live="polite"><i aria-hidden="true" /><span>{phaseText[phase]}</span>
      {mode === "conversation" && (phase === "paused" ? <button type="button" className="asst-link-btn" onClick={resume}><Play size={12} aria-hidden="true" /> {t("Resume", "চালু")}</button> : <button type="button" className="asst-link-btn" onClick={pause}><Pause size={12} aria-hidden="true" /> {t("Pause", "বিরতি")}</button>)}
      {mode === "dictation" && <button type="button" className="asst-link-btn" onClick={stopAll}>{t("Cancel", "বাতিল")}</button>}
    </div>}
  </>;
}
