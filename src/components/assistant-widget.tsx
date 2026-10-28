"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUp, MessageSquareX, UserRound } from "lucide-react";
import { recentProducts } from "@/lib/consent";
import { detectLanguage } from "@/lib/assistant/language";
import { messages } from "@/lib/assistant/messages";
import type { ChatReply, PublicAssistantConfig } from "@/lib/assistant/types";
import { JunoThinking } from "./assistant-thinking";
import { withUserMessage } from "@/lib/assistant/chat-state";
import { AssistantSky } from "./assistant-sky";
import { CloseRocket } from "./assistant-close";
import { AssistantClock } from "./assistant-clock";
import { WeatherBadge } from "./assistant-weather";
import type { Weather } from "@/lib/assistant/weather";
import { AssistantProductCard } from "./assistant-cards";
import { HandoffForm, TrackingForm } from "./assistant-forms";
import { RichText } from "./assistant-rich-text";
import { useLocale } from "./locale";
import Link from "./locale-link";

// Voice code is heavier and only needed when the visitor taps a voice control, so it loads separately.
const VoiceBar = dynamic(() => import("./assistant-voice"), { ssr: false });

type Msg = { id: string; role: "user" | "bot"; text: string; reply?: ChatReply; error?: "network" | "rate" | "off" | "server" | "challenge"; requestId?: string; retryText?: string; hadCards?: boolean };
const STORE = "oanro-asst-chat";
const newId = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/[x]/g, () => ((Math.random() * 16) | 0).toString(16));

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; execute: (id: string) => void; remove: (id: string) => void } } }
/** Optional free Cloudflare Turnstile: loaded only when the site key is configured, and only on the first message. */
async function turnstileToken(siteKey: string): Promise<string> {
  if (!window.turnstile) await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script"); s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error("turnstile")); document.head.appendChild(s);
  });
  return new Promise<string>((resolve, reject) => {
    const box = document.createElement("div"); document.body.appendChild(box);
    const id = window.turnstile!.render(box, { sitekey: siteKey, execution: "execute", appearance: "interaction-only", callback: (token: string) => { resolve(token); setTimeout(() => { window.turnstile?.remove(id); box.remove(); }, 0); }, "error-callback": () => { box.remove(); reject(new Error("turnstile")); } });
    window.turnstile!.execute(id);
  });
}

export default function AssistantPanel({ config, onClose }: { config: PublicAssistantConfig; onClose: () => void }) {
  const { locale } = useLocale(); const bn = locale === "bn"; const t = (en: string, b: string) => bn ? b : en;
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(STORE) ?? "[]") as Msg[]; if (Array.isArray(saved) && saved.length) return saved.filter(m => m && typeof m.text === "string" && (m.role === "user" || m.role === "bot")).slice(-30).map(m => ({ id: m.id, role: m.role, text: m.text, hadCards: m.hadCards === true })); } catch {}
    return [];
  });
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"chat" | "track" | "handoff">("chat");
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(id); }, [notice]); // short notices fade away by themselves
  const panel = useRef<HTMLDivElement>(null), log = useRef<HTMLDivElement>(null), field = useRef<HTMLTextAreaElement>(null);
  const abort = useRef<AbortController | null>(null), verified = useRef(false);
  const [host, setHost] = useState<HTMLElement | null>(null); // where the voice buttons are placed inside the message bar
  const [sheet, setSheet] = useState(() => window.matchMedia("(max-width: 640px)").matches); // phones: full-screen sheet, so it is announced as modal
  useEffect(() => { const q = window.matchMedia("(max-width: 640px)"); const upd = () => setSheet(q.matches); q.addEventListener("change", upd); return () => q.removeEventListener("change", upd); }, []);

  // Persist plain text only (cards are re-fetched, never replayed from storage, so prices cannot go stale).
  useEffect(() => { try { sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-30).map(m => ({ id: m.id, role: m.role, text: m.text, hadCards: Boolean(m.reply?.cards.length) || m.hadCards === true })))); } catch {} }, [msgs]);
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy, view]);
  useEffect(() => { field.current?.focus(); }, []);
  // Visitor's own time zone (no permission needed) drives the clock and sky; the server adds real weather for that place (MET Norway).
  const [zone] = useState(() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Dhaka"; } catch { return "Asia/Dhaka"; } });
  const [weather, setWeather] = useState<Weather | null>(null);
  useEffect(() => {
    let stop = false;
    const load = () => fetch(`/api/assistant/weather?tz=${encodeURIComponent(zone)}`, { credentials: "same-origin" }).then(r => r.ok ? r.json() : null)
      .then((d: { weather?: Weather | null } | null) => { if (!stop && d && "weather" in d) setWeather(d.weather ?? null); }).catch(() => {});
    void load(); const timer = setInterval(load, 30 * 60_000);
    return () => { stop = true; clearInterval(timer); };
  }, [zone]);
  useEffect(() => { const el = field.current; if (!el) return; el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }, [input, view]); // grows with the text, like a chat app
  // Personalisation: read on every open and on every consent change, so withdrawing removes the context at once.
  useEffect(() => () => { abort.current?.abort(); if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  // Closing fades the panel out first (skipped for visitors who prefer reduced motion), then the launcher takes over.
  const [closing, setClosing] = useState(false);
  const requestClose = () => {
    if (closing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { onClose(); return; }
    setClosing(true); window.setTimeout(onClose, 260);
  };
  // Esc closes; on phones the sheet is full screen, so Tab stays inside it.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") { e.stopPropagation(); requestClose(); return; }
    if (e.key !== "Tab" || !window.matchMedia("(max-width: 640px)").matches) return;
    const items = [...(panel.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea, input:not([type=hidden]), select") ?? [])].filter(el => el.offsetParent !== null);
    if (!items.length) return; const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };


  async function send(text: string, requestId = newId()): Promise<ChatReply | null> {
    const message = text.trim(); if (!message || busy) return null;
    setNotice(null); setView("chat"); setBusy(true); setInput("");
    setMsgs(m => withUserMessage(m, requestId, { id: `u-${requestId}`, role: "user", text: message }));
    const controller = new AbortController(); abort.current = controller;
    const fail = (error: Msg["error"], textOut: string) => { setMsgs(m => [...m, { id: `e-${newId()}`, role: "bot", text: textOut, error, requestId, retryText: message }]); return null; };
    try {
      let turnstile: string | undefined;
      if (config.turnstileSiteKey && !verified.current) { try { turnstile = await turnstileToken(config.turnstileSiteKey); } catch { return fail("challenge", t("I couldn't complete the security check. Please try again.", "নিরাপত্তা যাচাই সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।")); } }
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", signal: controller.signal,
        body: JSON.stringify({ requestId, message, locale, recent: recentProducts(), turnstile }) });
      if (res.status === 429) { const d = await res.json().catch(() => ({})) as { retryAfter?: number }; const m = d.retryAfter ? Math.ceil(d.retryAfter / 60) : 0; return fail("rate", messages.rate[bn ? "bn" : "en"] + (m ? ` (${bn ? `${m} মিনিট` : `${m} min`})` : "")); }
      if (res.status === 403) { const d = await res.json().catch(() => ({})) as { error?: string }; return fail(d.error === "ASSISTANT_OFF" ? "off" : "challenge", d.error === "ASSISTANT_OFF" ? messages.off[bn ? "bn" : "en"] : t("Security check failed. Please reload the page and try again.", "নিরাপত্তা যাচাই ব্যর্থ। পেজ রিলোড করে আবার চেষ্টা করুন।")); }
      if (!res.ok) return fail("server", t("Something went wrong on our side. Nothing was lost; you can retry.", "আমাদের দিকে সমস্যা হয়েছে। কিছু হারায়নি; আবার চেষ্টা করুন।"));
      const data = await res.json() as { reply: ChatReply }; verified.current = true;
      setMsgs(m => [...m, { id: data.reply.id + newId(), role: "bot", text: data.reply.text, reply: data.reply }]);
      return data.reply;
    } catch (error) {
      if ((error as Error).name === "AbortError") { setMsgs(m => [...m, { id: `c-${newId()}`, role: "bot", text: t("Cancelled.", "বাতিল করা হয়েছে।") }]); return null; }
      return fail("network", t("I couldn't reach the server. Check your connection and retry; your message won't be sent twice.", "সার্ভারে সংযোগ হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন; বার্তা দুইবার যাবে না।"));
    } finally { setBusy(false); abort.current = null; }
  }

  async function clearChat() {
    abort.current?.abort(); setMsgs([]); setView("chat"); setNotice(t("Chat cleared. Your saved messages were deleted.", "চ্যাট মুছে ফেলা হয়েছে। সংরক্ষিত বার্তাও মুছে গেছে।"));
    try { sessionStorage.removeItem(STORE); } catch {}
    await fetch("/api/assistant", { method: "DELETE", credentials: "same-origin" }).catch(() => {});
  }
  const onCompose = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(input); } };
  const human = config.human;
  const humanBlock = <div className="asst-human">
    <Link href="/contact">{t("Contact page", "যোগাযোগ পেজ")}</Link>
    {human.whatsapp && <a href={human.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
    {human.messenger && <a href={human.messenger} target="_blank" rel="noopener noreferrer">Messenger</a>}
    {human.email && <a href={human.email}>{t("Email", "ইমেইল")}</a>}
    <button type="button" onClick={() => setView("handoff")}><UserRound size={14} aria-hidden="true" />&nbsp;{t("Message our team", "আমাদের টিমকে বার্তা পাঠান")}</button>
  </div>;

  return <div className={`asst-panel${closing ? " is-closing" : ""}`} role="dialog" aria-label={t("OANRO AI assistant", "OANRO AI সহকারী")} aria-modal={sheet} ref={panel} onKeyDown={onKeyDown}>
    <div className="asst-head">
      <AssistantSky timeZone={zone} condition={weather?.condition} />
      {/* Left: weather where the visitor is (icon above the temperature), then their local time and date. */}
      <div className="asst-info">
        {weather && <WeatherBadge weather={weather} bn={bn} />}
        <AssistantClock bn={bn} timeZone={zone} />
      </div>
      <h2>{t("Hi, I'm JUNO", "হাই, আমি JUNO")}<small>{t("Your AI assistant", "আপনার AI সহকারী")}</small></h2>
      {/* The rocket is also the way out: tapping it lands the rocket and closes the panel (Esc works too). */}
      <button type="button" className={`asst-home${busy ? " is-busy" : ""}`} aria-label={t("Close assistant", "সহকারী বন্ধ করুন")} title={t("Close", "বন্ধ করুন")} onClick={requestClose}><CloseRocket /></button>
    </div>
    {view === "track" ? <TrackingForm onBack={() => setView("chat")} />
      : view === "handoff" ? <HandoffForm human={config.human} onBack={() => setView("chat")} onDone={text => { setMsgs(m => [...m, { id: `h-${newId()}`, role: "bot", text }]); setView("chat"); }} />
      : <>
      <div className="asst-log" ref={log} role="log" aria-live="polite" aria-relevant="additions" aria-label={t("Conversation", "কথোপকথন")} tabIndex={0}>
        <div className="asst-msg is-bot"><RichText text={messages.greeting[bn ? "bn" : "en"]} /></div>
        {msgs.map(m => <div key={m.id} className={`asst-msg is-${m.role}${m.error ? " is-error" : ""}`}>
          {m.role === "bot" ? <RichText text={m.text} /> : <p>{m.text}</p>}
          {m.reply?.policy && <p className="asst-notice" style={{ marginTop: "0.4rem" }}>{t("Current rules from OANRO: ", "OANRO-র বর্তমান নিয়ম: ")}<Link href="/delivery-returns">{t("Delivery, payment and returns", "ডেলিভারি, পেমেন্ট ও রিটার্ন")}</Link></p>}
          {!m.reply && m.hadCards && <p className="asst-notice" style={{ marginTop: "0.4rem" }}>{t("Product cards aren't kept after a reload so prices stay current. Ask again to see them.", "রিলোডের পর পণ্যের কার্ড থাকে না, যাতে দাম সবসময় সঠিক থাকে। আবার জিজ্ঞেস করলে দেখতে পাবেন।")}</p>}
          {m.reply && m.reply.cards.length > 0 && <div className="asst-cards">{m.reply.cards.map(c => <AssistantProductCard key={c.slug} card={c} />)}</div>}
          {m.reply?.mode.notice && m.reply.cards.length > 0 && <p className="asst-notice" style={{ marginTop: "0.5rem" }}>{bn ? m.reply.mode.notice.bn : m.reply.mode.notice.en}</p>}
          {m.reply?.trackingForm && <div className="asst-human"><button type="button" onClick={() => setView("track")}>{t("Open tracking form", "ট্র্যাকিং ফর্ম খুলুন")}</button></div>}
          {m.reply?.humanHelp && humanBlock}
          {m.error && m.retryText && <div className="asst-msg-tools"><button type="button" className="asst-chip" disabled={busy} onClick={() => void send(m.retryText!, m.requestId)}>{t("Retry", "আবার চেষ্টা")}</button></div>}
        </div>)}
        {msgs.length > 0 && !busy && <button type="button" className="asst-link-btn asst-clear" onClick={clearChat}><MessageSquareX size={13} aria-hidden="true" /> {t("Clear chat", "চ্যাট মুছুন")}</button>}
        {busy && <JunoThinking bn={bn} />}
      </div>
      {notice && <p className="asst-toast" role="status">{notice}</p>}
      {config.voice && <VoiceBar config={config} locale={locale} busy={busy} onDictation={(text: string) => { setInput(text); field.current?.focus(); }} onSend={(text: string) => send(text)} onNotice={setNotice} host={host} />}
      <form className="asst-composer" onSubmit={e => { e.preventDefault(); void send(input); }}>
        <label className="asst-sr" htmlFor="asst-input">{t("Your message", "আপনার বার্তা")}</label>
        <textarea id="asst-input" ref={field} rows={1} value={input} maxLength={600} onChange={e => setInput(e.target.value)} onKeyDown={onCompose}
          placeholder={t("Message OANRO assistant", "OANRO সহকারীকে লিখুন")} lang={detectLanguage(input, bn ? "bn" : "en") === "bn" ? "bn" : undefined} />
        <div className="asst-composer-bar">
          <div className="asst-voice-slot" ref={setHost} />
          <button className="asst-send" type="submit" disabled={busy || !input.trim()} aria-label={t("Send message", "বার্তা পাঠান")} title={t("Send", "পাঠান")}><ArrowUp size={20} aria-hidden="true" /></button>
        </div>
      </form>
    </>}
  </div>;
}
