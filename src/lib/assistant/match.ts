// Intent and FAQ matching that needs no AI. Pure so tests can pin the behaviour.
import { scoreFields, words } from "../smart-search";
import type { Faq } from "./store";

export type Intent = "human" | "tracking" | "delivery" | "payment" | "returns" | "cash_on_delivery" | "all" | null;
/** Edit distance with an early exit (typos: "delivary", "pyment", "kmn acho"). */
function lev(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; let best = i; for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); } if (best > max) return max + 1; prev = cur; }
  return prev[b.length];
}
/** Same word allowing a small typo (longer words allow more). Short words must match exactly. */
export const near = (word: string, key: string) => word === key || (key.length >= 4 && lev(word, key, key.length >= 8 ? 2 : 1) <= (key.length >= 8 ? 2 : 1));
const tokens = (text: string) => text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{M}\p{N}']+/u).filter(Boolean);
const anyNear = (ws: string[], keys: string[]) => ws.some(w => keys.some(k => near(w, k)));
/** Phrase or word found in the text, tolerating typos in single Latin words of 6+ letters. */
const has = (text: string, list: string[]) => {
  const t = text.toLowerCase(), ws = tokens(t);
  return list.some(w => t.includes(w) || (/^[a-z]{6,}$/.test(w) && ws.some(x => x.length >= 5 && near(x, w))));
};
const humanWords = ["talk to a person", "talk to someone", "human", "real person", "agent", "customer service", "customer care", "call me", "contact me", "speak to", "মানুষের সাথে", "মানুষ", "কাউকে দিন", "কথা বলতে চাই", "যোগাযোগ করতে চাই", "কল করুন", "manusher sathe", "kotha bolte chai", "kotha bolbo"];
const trackWords = ["track", "where is my order", "order status", "my order", "অর্ডার কোথায়", "অর্ডারের অবস্থা", "ট্র্যাক", "ট্রাক", "অর্ডার ট্র্যাক", "order kothay", "order track"];
/** Cheap, conservative intent detection for questions the shop's own rules answer. Product questions go to search/AI. */
export function detectIntent(text: string): Intent {
  const t = ` ${text.toLowerCase().trim()} `; if (t.trim() === "") return null;
  if (has(t, humanWords)) return "human";
  if (has(t, trackWords)) return "tracking";
  if (words(t).length > 14) return null; // long, specific questions are better answered by the model with tools
  const hits: Intent[] = [];
  if (has(t, ["cash on delivery", "cod", "ক্যাশ অন ডেলিভারি", "ক্যাশ অন"])) hits.push("cash_on_delivery");
  if (has(t, ["delivery", "shipping", "courier", "how long", "ডেলিভারি", "কতদিন", "কত দিন", "পৌঁছ", "koto din", "kotodin", "delivery charge", "ডেলিভারি চার্জ"])) hits.push("delivery");
  if (has(t, ["payment", "bkash", "nagad", "pay ", "পেমেন্ট", "বিকাশ", "নগদ", "কীভাবে টাকা", "taka pathabo"])) hits.push("payment");
  if (has(t, ["return", "refund", "exchange", "replace", "ফেরত", "রিটার্ন", "রিফান্ড", "বদল"])) hits.push("returns");
  // A named product word means a product question, not a rules question. Whole words only ("what" is not "hat", "charge" is not "charger").
  const productish = /\b(?:caps?|hats?|necklaces?|rings?|earrings?|jewel(?:ry|lery)?|shirts?|sweaters?|jackets?|knit|headphones?|speakers?|watch(?:es)?|mouse|keyboards?|chargers?|red|blue|black|tupi|show me|do you have|sizes?|colou?rs?|stock)\b|টুপি|ক্যাপ|নেকলেস|ঘড়ি|হেডফোন|আছে কি|চাই|লাগবে/i.test(t)
    || has(t, ["sweater", "necklace", "earring", "headphone", "keyboard", "speaker", "jacket"]);
  if (hits.length === 1 && !productish) return hits[0];
  if (hits.length > 1 && hits.includes("cash_on_delivery") && !productish) return "cash_on_delivery";
  if (hits.length > 1 && !productish) return "all"; // e.g. "delivery and payment"
  return null;
}

export type SmallTalk = "greeting" | "thanks" | "bye" | "howareyou" | "about" | "day" | "robot" | "ack" | null;
const filler = "(?:\\s+(?:there|oanro|bhai|vai|apu|sir|madam|friend|everyone|team|আপু|ভাই|ভাইয়া))*";
const greet = new RegExp(`^(?:hi+|hello+|hey+|helo|hlw|hii+|salam|assalamu\\s?alaikum|assalamualaikum|as-?salamu\\s?alaikum|good\\s(?:morning|afternoon|evening)|হ্যালো|হাই|হেই|সালাম|আসসালামু\\s?আলাইকুম|আসসালামুআলাইকুম|নমস্কার)${filler}(?:\\s+(?:kemon\\s+(?:acho|achen)|how\\s+are\\s+you|কেমন\\s+আছেন|কেমন\\s+আছো))?$`, "i");
const thanks = new RegExp(`^(?:thanks?|thank\\s+you|thanks\\s+a\\s+lot|thx|dhonnobad|dhonyobad|ধন্যবাদ|শুক্রিয়া|ok(?:ay)?\\s+thanks?)${filler}$`, "i");
const ack = /^(?:ok(?:ay)?|fine|good|nice|great|cool|alright|got it|accha|achha|thik ache|thik achi|bhalo|ami (?:bhalo|thik) achi|i'?m fine|i am fine|im fine|ঠিক আছে|আচ্ছা|ভালো|ঠিক আছি|ami bhalo)$/i;
const bye = new RegExp(`^(?:bye+|goodbye|see\\s+you|allah\\s+hafez|আল্লাহ\\s+হাফেজ|বিদায়)${filler}$`, "i");
/** Greetings, thanks and goodbyes: answered at once with no AI call and no product cards. */
export function detectSmallTalk(text: string): SmallTalk {
  const t = text.toLowerCase().replace(/[.!?,।~]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.length > 60) return null;
  if (greet.test(t)) return "greeting";
  const ws = tokens(t); if (ws.length > 10) return null;
  const you = anyNear(ws, ["tumi", "apni", "tui", "you", "তুমি", "আপনি"]) || ws.includes("u");
  // "how are you", "tumi kemon acho?", "kmn acho", "কেমন আছেন"
  if ((anyNear(ws, ["kemon", "kmn", "kemn", "কেমন"]) && anyNear(ws, ["acho", "achen", "aso", "asen", "achis", "আছো", "আছেন", "আছ"])) || (ws.includes("how") && (ws.includes("are") || ws.includes("r")) && you) || /\bhow'?s it going\b|\bwhat'?s up\b/.test(t)) return "howareyou";
  // "who are you", "what can you do", "tumi ki koro", "tumi ki korro bujhte hobe", "আপনি কে"
  const doing = anyNear(ws, ["koro", "korro", "korte", "korben", "korbe", "paro", "paren", "pare", "করো", "করতে", "পারো", "পারেন"]);
  const fillerWords = ["ki", "bujhte", "bujhi", "bujhlam", "hobe", "hoe", "ami", "jante", "chai", "bolo", "bolun", "tomar", "apnar", "shob", "sob", "ektu"];
  const rest = ws.filter(w => !anyNear([w], ["tumi", "apni", "tui", "you", "তুমি", "আপনি"]) && !fillerWords.includes(w) && !anyNear([w], ["koro", "korro", "korte", "korben", "korbe", "paro", "paren", "pare", "করো", "করতে", "পারো", "পারেন"]));
  if (/\bhow\s+(?:was|is)\s+(?:your|ur)\s+day\b|\bhow\s+(?:has|have)\s+your\s+day\b|(?:ajker|ajke)\s+(?:din|dinta)\s+kemon|din\s+kemon\s+(?:gelo|kaatlo|katlo)|আজকের\s+দিন\s+কেমন/.test(t)) return "day";
  if (/\bare\s+you\s+(?:a\s+)?(?:robot|bot|human|real|person|ai)\b|tumi\s+(?:ki\s+)?(?:robot|manush|bot|ai)\b|তুমি\s+(?:কি|কী)?\s*(?:রোবট|মানুষ|এআই)/.test(t)) return "robot";
  if ((you && ws.includes("ki") && doing && rest.length === 0) || (you && anyNear(ws, ["ke", "কে"]) && ws.length <= 4) || (ws.includes("who") && you) || /\bwhat\s+(?:can|do|does|could)\s+(?:you|u)\s+(?:do|help|offer)\b/.test(t) || /(?:তুমি|আপনি)\s*(?:কী|কি)\s*(?:কর|পার)|(?:তুমি|আপনি)\s*কে/.test(t)) return "about";
  if (thanks.test(t)) return "thanks";
  if (bye.test(t)) return "bye";
  return ack.test(t) ? "ack" : null;
}
/** The visitor is asking to see what the shop has (not a specific item). */
export const wantsBrowse = (text: string) => /\b(browse|catalog(?:ue)?|collections?|all (?:the |your )?(?:products|items)|(?:show|see|list|view) (?:me )?(?:all |the |your |some )?(?:products|items|collection)|what (?:products|items|do you (?:sell|have))|which products|do you (?:have|sell) (?:any )?(?:products|items))\b|সব পণ্য|কী কী (?:পণ্য|আছে)|কি কি (?:পণ্য|আছে)|ki ki (?:product|ache)|product dekhao|^\s*products?\s*[?.!]*\s*$/i.test(text);

const stop = new Set(["what", "is", "the", "are", "do", "does", "you", "your", "how", "can", "i", "a", "an", "to", "of", "my", "me", "have", "has", "any", "some", "please", "show", "want", "need", "looking", "for", "with", "and", "or", "products", "product", "items", "item", "there", "got", "ache", "ami", "chai", "dekhao", "ekta", "ki", "koto", "ki", "কি", "কী", "আমি", "আমার", "এটা", "ও"]);
export const content = (s: string) => words(s).filter(w => !stop.has(w));
/** Best enabled FAQ entry when the match is confident: most question words matched and a clear lead over the runner-up. */
export function matchFaq(query: string, faqs: Faq[], locale: "en" | "bn"): { faq: Faq; confidence: number } | null {
  const qs = content(query); if (qs.length < 1) return null;
  const q = qs.join(" ");
  const scored = faqs.filter(f => f.enabled).map(f => {
    const fields = [{ text: f.questionEn, weight: 3 }, { text: f.questionBn, weight: 3 }, { text: f.keywords.replace(/,/g, " "), weight: 2 }];
    const self = Math.max(scoreFields(content(f.questionEn).join(" "), [{ text: f.questionEn, weight: 3 }]), 1);
    // Score both directions: the visitor's words found in the FAQ, scaled by how much of the FAQ question they cover.
    const forward = scoreFields(q, fields);
    const covered = content(f.questionEn + " " + f.questionBn + " " + f.keywords).filter(w => qs.includes(w)).length;
    const cover = Math.min(1, covered / Math.max(2, Math.min(content(f.questionEn).length, 4)));
    return { faq: f, confidence: Math.min(1, (forward / (self * 1.4)) * 0.6 + cover * 0.4) };
  }).sort((a, b) => b.confidence - a.confidence);
  const [best, second] = scored; if (!best || best.confidence < 0.72) return null;
  if (second && best.confidence - second.confidence < 0.1) return null;
  void locale; return best;
}

/** "I want to find a product", "looking for something": the visitor has not said what, so the right reply is a question, not a list. */
export function vagueProductRequest(text: string) {
  const t = text.toLowerCase();
  if (!/\b(find|finding|looking|look|want|need|buy|buying|get|search|shopping|shop)\b|খুঁজ|কিনতে|কিনব|দরকার|লাগবে|khujchi|kinbo|kinte|lagbe|chai/.test(t)) return false;
  const generic = new Set(["find", "finding", "looking", "look", "want", "need", "buy", "buying", "get", "search", "shopping", "shop", "product", "products", "item", "items", "something", "anything", "a", "an", "to", "for", "i", "me", "some", "thing", "stuff", "khujchi", "kinbo", "kinte", "lagbe", "chai", "ekta", "kichu", "kono", "ami", "amake", "amar", "আমি", "আমাকে", "জিনিস", "পণ্য", "কিছু", "একটা", "খুঁজছি", "কিনতে", "চাই"]);
  return words(t).filter(w => !generic.has(w)).length === 0;
}
