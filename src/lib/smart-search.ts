// Forgiving storefront search. Pure (no server or React imports) so the browser and tests share it.
// Splits the query into words, matches each word against a product's name, category, section and taglines
// (English and Bangla), accepts word beginnings ("neck" → necklace), small typos ("nekless") and synonyms
// ("jewellery", "গহনা", "hat" → cap). Products matching more words, and in more important fields, rank higher.
const groups: string[][] = [
  ["jewelry", "jewellery", "jewel", "jewels", "gohona", "gahana", "ornament", "গহনা", "অলংকার", "জুয়েলারি"],
  ["cap", "caps", "hat", "hats", "tupi", "টুপি", "ক্যাপ"], ["beanie", "বিনি"],
  ["necklace", "necklaces", "pendant", "chain", "locket", "har", "নেকলেস", "লকেট", "হার", "চেইন"],
  ["earring", "earrings", "jhumka", "jhumki", "dul", "দুল", "ঝুমকা", "কানের"],
  ["ring", "rings", "angti", "আংটি"], ["bangle", "bangles", "bracelet", "bracelets", "churi", "চুড়ি", "ব্রেসলেট"],
  ["anklet", "anklets", "payel", "nupur", "নূপুর", "পায়েল"], ["nosepin", "nose", "nakful", "নাকফুল"],
  ["watch", "watches", "smartwatch", "ghori", "ঘড়ি", "ওয়াচ"], ["headphone", "headphones", "headset", "earbuds", "earphone", "earphones", "headfone", "headfones", "hedphone", "হেডফোন", "ইয়ারবাডস"],
  ["speaker", "speakers", "স্পিকার"], ["keyboard", "keyboards", "কিবোর্ড"], ["mouse", "mice", "মাউস"],
  ["powerbank", "power", "charger", "battery", "পাওয়ার", "চার্জার"], ["sweater", "knit", "knitwear", "jumper", "সোয়েটার"],
  ["jacket", "jackets", "layer", "outerwear", "coat", "জ্যাকেট"], ["winter", "শীত", "শীতের"], ["tech", "gadget", "gadgets", "electronics", "টেক"],
  ["web", "website", "ওয়েব", "ওয়েবসাইট"], ["app", "apps", "mobile", "অ্যাপ"],
];
const synonyms = new Map<string, string[]>();
for (const g of groups) for (const w of g) synonyms.set(w, g);
export const words = (s: string) => s.toLowerCase().normalize("NFC").split(/[^\p{L}\p{M}\p{N}]+/u).filter(w => w.length > 0);
function distance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
/** How well one query word matches one text word: 1 exact, 0.85 synonym, 0.75 word start, 0.55 small typo, 0.5 typo in a word start, 0 none. */
function wordScore(q: string, w: string) {
  if (q === w) return 1;
  if (synonyms.get(q)?.includes(w)) return 0.85;
  if (q.length >= 2 && w.startsWith(q)) return 0.75;
  for (const s of synonyms.get(q) ?? []) if (s.length >= 3 && w.startsWith(s)) return 0.7;
  const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  if (allowed && distance(q, w, allowed) <= allowed) return 0.55;
  // Typo while still typing a longer word ("necklac" for "necklaces"): compare with the word's start.
  if (allowed && w.length > q.length && distance(q, w.slice(0, q.length), allowed) <= allowed) return 0.5;
  return 0;
}
export type Field = { text: string; weight: number };
/** Score a document (weighted fields) against a query; 0 means no match at all. */
export function scoreFields(query: string, fields: Field[]) {
  const qs = [...new Set(words(query))]; if (!qs.length) return 0;
  const fw = fields.map(f => ({ weight: f.weight, ws: words(f.text) }));
  let total = 0, matched = 0;
  for (const q of qs) {
    let best = 0;
    for (const f of fw) for (const w of f.ws) { const s = wordScore(q, w) * f.weight; if (s > best) best = s; }
    if (best > 0) { matched++; total += best; }
  }
  // Every matched word counts; matching all words of the query gets a clear bonus.
  return matched ? total + (matched === qs.length ? 2 : 0) + matched : 0;
}
export function rank<T>(query: string, items: T[], fields: (item: T) => Field[]) {
  return items.map(item => ({ item, score: scoreFields(query, fields(item)) })).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.item);
}

// "Did you mean something like this?" When nothing matches directly, guess what the shopper is after
// (clothing, jewelry, tech or services) from their words, even with typos, and suggest items of that kind.
const families: Record<string, string[]> = {
  wear: ["wear", "clothing", "clothes", "cloth", "dress", "shirt", "tshirt", "hoodie", "sweater", "knit", "jumper", "jacket", "coat", "layer", "winter", "warm", "scarf", "shawl", "gloves", "socks", "cap", "hat", "beanie", "pant", "trouser", "fashion", "style", "jama", "kapor", "জামা", "কাপড়", "পোশাক", "শীত", "শীতের", "সোয়েটার", "জ্যাকেট", "টুপি", "ক্যাপ", "শাল", "চাদর", "seasonal"],
  jewelry: ["jewelry", "jewellery", "jewel", "ornament", "necklace", "pendant", "chain", "locket", "earring", "jhumka", "ring", "bangle", "bracelet", "anklet", "nosepin", "gold", "silver", "pearl", "stone", "gift", "গহনা", "অলংকার", "নেকলেস", "দুল", "আংটি", "চুড়ি", "উপহার"],
  tech: ["tech", "gadget", "electronics", "headphone", "headphones", "earbuds", "earphone", "speaker", "keyboard", "mouse", "powerbank", "charger", "cable", "watch", "smartwatch", "phone", "mobile", "laptop", "computer", "accessory", "accessories", "টেক", "গ্যাজেট", "হেডফোন", "চার্জার", "ঘড়ি"],
  services: ["web", "website", "app", "software", "it", "design", "developer", "development", "seo", "business", "ecommerce", "system", "ওয়েব", "ওয়েবসাইট", "অ্যাপ", "সফটওয়্যার"],
};
/** Which kinds of thing the query is about (best guess; empty when unclear). */
export function intents(query: string) {
  const found = new Set<string>();
  for (const q of words(query)) for (const [name, list] of Object.entries(families)) if (list.some(w => wordScore(q, w) >= 0.5)) found.add(name);
  return [...found];
}
/** Items of the same kind as the query, for when there is no direct match. */
export function related<T>(query: string, items: T[], fields: (item: T) => Field[]) {
  const kinds = intents(query); if (!kinds.length) return [];
  // Strict here (exact word or word start, no typo guessing): the vocabulary is broad, so loose matching would drift.
  const vocab = kinds.flatMap(k => families[k]).filter(w => w.length >= 3);
  const score = (item: T) => fields(item).reduce((sum, f) => sum + words(f.text).filter(w => vocab.some(v => w === v || w.startsWith(v))).length * f.weight, 0);
  return items.map(item => ({ item, s: score(item) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s).map(x => x.item);
}
