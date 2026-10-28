// Browser speech synthesis (free, on the visitor's device). It speaks only in a language the device has a voice for,
// and says so otherwise: it never reads Bangla with an English voice or the other way round.
import { speechLang } from "./language";
import { pickVoice, speechChunks } from "./voice-core";

export const synthSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
export type SpeakResult = "spoken" | "no-voice" | "unsupported" | "cancelled" | "skipped";

async function voices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis; const now = synth.getVoices(); if (now.length) return now;
  return new Promise(resolve => { const done = () => { synth.removeEventListener("voiceschanged", done); resolve(synth.getVoices()); }; synth.addEventListener("voiceschanged", done); setTimeout(done, 1500); });
}
export function stopSpeaking() { if (synthSupported()) window.speechSynthesis.cancel(); current = null; }
let current: { cancelled: boolean } | null = null;

/** Speaks `text` and resolves when it ends. `notify` gets a short explanation when speech is not possible (shown to the visitor, text stays on screen). */
export async function speak(text: string, notify: (message: string) => void, ui: "en" | "bn" = "en"): Promise<SpeakResult> {
  if (!synthSupported()) { notify(ui === "bn" ? "এই ব্রাউজারে কথা বলে শোনানোর সুবিধা নেই; উত্তর লেখাই থাকছে।" : "This browser can't read replies aloud; the text stays on screen."); return "unsupported"; }
  const lang = speechLang(text);
  if (!lang) { notify(ui === "bn" ? "এই উত্তর ইংরেজি অক্ষরে লেখা বাংলা, তাই কোনো কণ্ঠস্বর মেলেনি; শুধু লেখা দেখানো হচ্ছে।" : "This reply is Bangla in English letters, which no voice reads well, so I'm showing text only."); return "skipped"; }
  const voice = pickVoice(await voices(), lang);
  if (!voice) { notify(lang === "bn" ? (ui === "bn" ? "এই ডিভাইসে বাংলা কণ্ঠস্বর ইনস্টল করা নেই, তাই শুধু লেখা দেখানো হচ্ছে।" : "No Bangla voice is installed on this device, so I'm showing the reply as text only.") : (ui === "bn" ? "এই ডিভাইসে ইংরেজি কণ্ঠস্বর নেই, তাই শুধু লেখা দেখানো হচ্ছে।" : "No English voice is installed on this device, so I'm showing text only.")); return "no-voice"; }
  const synth = window.speechSynthesis; synth.cancel();
  const token = { cancelled: false }; current = token;
  for (const piece of speechChunks(text)) {
    if (token.cancelled) return "cancelled";
    const ok = await new Promise<boolean>(resolve => {
      try {
        const u = new SpeechSynthesisUtterance(piece); u.voice = voice; u.lang = voice.lang; u.rate = 1; u.pitch = 1;
        const timer = setTimeout(() => resolve(false), 4000 + piece.length * 120); // never wait forever on a stalled engine
        u.onend = () => { clearTimeout(timer); resolve(true); }; u.onerror = () => { clearTimeout(timer); resolve(false); };
        synth.speak(u);
      } catch { resolve(false); } // a browser that refuses the utterance must not break the conversation loop
    });
    if (!ok) return token.cancelled ? "cancelled" : "spoken";
  }
  if (current === token) current = null;
  return "spoken";
}
