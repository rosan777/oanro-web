import type { Lang } from "./types";
// Language detection for chat text: Bangla script, English, or Banglish (Bangla typed in English letters).
// Heuristic by design: it only chooses the reply style; the model also sees the visitor's own words.
const banglishWords = new Set(["ami", "amar", "amake", "apni", "apnar", "tumi", "tomar", "ki", "kemon", "kmn", "acho", "achen", "aso", "korro", "koro", "korun", "bujhte", "bujhi", "bujhlam", "hoe", "kothay", "kobe", "koto", "kon", "keno", "kivabe", "kibhabe", "dam", "daam", "dami", "lagbe", "lagche", "ache", "achhe", "nai", "nei", "chai", "chaichi", "pabo", "pabe", "dibo", "dite", "den", "dao", "hobe", "hoy", "hoi", "hoyeche", "korte", "korbo", "kore", "korchi", "jonno", "jonne", "taka", "poisa", "pathan", "pathabo", "pathaben", "bhai", "vai", "apu", "bolen", "bolun", "bolo", "ekta", "ekti", "gulo", "gula", "tupi", "jama", "ghori", "dokan", "kinbo", "kinte", "kena", "bikri", "na", "ji", "jee", "hya", "haa", "thik", "thikache", "shundor", "sundor", "valo", "bhalo", "kharap", "dorkar", "shuru", "sathe", "theke", "porjonto", "maane", "mane", "ekhon", "ekhane", "ekhono", "pore", "abar", "shob", "sob", "kichu", "kono", "jani", "janbo", "janan", "jante", "bujhlam", "bujhi", "dekhao", "dekhan", "dekhte", "dekhbo", "kora", "korun", "parbo", "parben", "parbe", "pari", "paren", "pai", "ashbe", "ashe", "esheche", "gese", "gelo", "geche", "hoyni", "holo", "nibo", "nite", "niben", "newa", "neya", "rakhbo"]);
const englishWords = new Set(["the", "is", "are", "what", "how", "do", "does", "can", "you", "your", "i", "my", "me", "want", "need", "price", "cost", "show", "have", "any", "with", "for", "and", "to", "of", "in", "it", "this", "that", "please", "hello", "hi", "thanks", "thank", "where", "when", "which", "there", "available", "stock", "size", "colour", "color", "return", "deliver", "track", "order"]);
/** Share of letters that are Bengali script. */
export function bengaliShare(text: string) {
  let bn = 0, other = 0;
  for (const ch of text) { if (/[ঀ-৿]/.test(ch)) bn++; else if (/\p{L}/u.test(ch)) other++; }
  return bn + other ? bn / (bn + other) : 0;
}
export function detectLanguage(text: string, fallback: Lang = "en"): Lang {
  const share = bengaliShare(text);
  if (share >= 0.3) return "bn"; // mixed Bangla/English speech counts as Bangla: replies keep Bangla script and keep product names
  const words = text.toLowerCase().split(/[^a-z?']+/).filter(Boolean);
  if (!words.length) return text.trim() ? fallback : fallback;
  let b = 0, e = 0; for (const w of words) { const w2 = w.replace(/\?$/, ""); if (banglishWords.has(w2) && !englishWords.has(w2)) b++; else if (englishWords.has(w2)) e++; }
  return b >= 2 || (b >= 1 && b >= e) ? "banglish" : "en";
}
/** Script used to decide which speech voice reads a reply. Banglish (Latin letters) has no matching voice: callers show text only. */
export function speechLang(text: string): "bn" | "en" | null {
  const share = bengaliShare(text);
  if (share >= 0.3) return "bn";
  return detectLanguage(text) === "banglish" ? null : "en";
}
