// Redaction, reply cleaning and link safety. Pure: used before text reaches a model or a log, and again on model output.
// Automatic detection can never be perfect (names and addresses are not caught); the UI says so and tracking/contact details
// are collected only in dedicated forms, never in chat.
const bnDigit = (s: string) => s.replace(/[০-৯]/g, d => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
const sensitiveWord = /(pass\s*word|passcode|\bpin\b|\botp\b|\bcvv\b|\bcvc\b|card\s*(no|number)|account\s*(no|number)|secret|পাসওয়ার্ড|পিন\b|ওটিপি|কার্ড\s*নম্বর|একাউন্ট\s*নম্বর|অ্যাকাউন্ট\s*নম্বর|nid\b|passport|পাসপোর্ট)/i;

/** Replace phone numbers, emails, order codes, links and long numbers. Bangla digits are recognised too. */
export function redactPii(input: string): string {
  let s = input.normalize("NFC");
  s = s.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, "[email]");
  s = s.replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "[link]");
  s = s.replace(/\bOA-[A-Z0-9]{4,16}\b/gi, "[order code]");
  // Digit runs of 7+ digits (spaces, dashes, dots and a leading + allowed between digits), including Bangla digits.
  s = s.replace(/(?:\+|০০|00)?[0-9০-৯](?:[\s().-]?[0-9০-৯]){6,}/g, m => bnDigit(m).replace(/\D/g, "").length >= 7 ? "[number]" : m);
  s = s.replace(/\b(trx|txn|transaction)\s*(id)?\s*[:#-]?\s*[A-Z0-9]{6,}\b/gi, "$1 [id]");
  return s;
}
/** True when the text looks like it contains a secret or ID the assistant must never keep. */
export function looksSensitive(input: string): boolean { return sensitiveWord.test(input) && /[0-9০-৯]{3,}/.test(input); }
/** Text that is safe to send to a model or store: redacted, control characters removed, length bounded. Sensitive messages are dropped entirely. */
export function sanitizeForModel(input: string, max = 600): string {
  const clean = input.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f​-‏‪-‮⁦-⁩]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return looksSensitive(clean) ? "[message removed: it looked like it contained a secret or ID]" : redactPii(clean);
}

// ---- Links: only internal storefront paths are ever clickable in assistant text. External destinations are server-configured.
const internalPath = /^\/(bn\/)?(products\/[a-z0-9-]{1,60}|delivery-returns|contact|track|privacy|terms|about|guides|company-profile|services(\/[a-z0-9-]{1,60})?)?(#[a-z0-9-]{1,40})?$/;
export function safeInternalPath(href: string): string | null {
  const h = href.trim();
  if (!h.startsWith("/") || h.startsWith("//") || h.includes("\\") || /[\u0000-\u001f<>"']/.test(h)) return null;
  return internalPath.test(h) ? h : null;
}
const trustedHosts = new Set(["wa.me", "www.facebook.com", "facebook.com", "m.me", "www.messenger.com", "messenger.com"]);
/** Only the owner's configured contact destinations on known hosts (or mailto:) may open outside the site. */
export function safeContactUrl(raw: string): string {
  if (!raw) return "";
  if (/^mailto:[^\s@<>"]+@[^\s@<>"]+$/i.test(raw)) return raw;
  try { const u = new URL(raw); return u.protocol === "https:" && trustedHosts.has(u.hostname) && !u.username && !u.password ? u.toString() : ""; } catch { return ""; }
}

/** Prices in text: "৳1,250", "Tk 1250", "1250 taka", "১২৫০ টাকা". Returns whole-taka amounts. */
export function amountsIn(text: string): number[] {
  const t = bnDigit(text); const out: number[] = [];
  const re = /(?:৳|\bBDT\b|\bTk\.?\b|\bRs\.?\b)\s*([0-9][0-9,]*(?:\.\d+)?)|([0-9][0-9,]*(?:\.\d+)?)\s*(?:৳|\bBDT\b|\bTk\b|taka\b|টাকা)/gi;
  for (const m of t.matchAll(re)) { const n = Number((m[1] ?? m[2]).replace(/,/g, "")); if (Number.isFinite(n)) out.push(Math.round(n)); }
  return out;
}
/**
 * Model prose may not state prices the server did not verify. Sentences containing an unverified amount are removed;
 * the cards and policy panel carry the authoritative numbers instead.
 */
// A number the visitor wrote themselves may be repeated back only as their own budget or request, never as a claim about our prices.
const budgetTalk = /\b(?:budget|within|under|below|up to|upto|around|about|range|asked|said|mentioned|wanted|looking)\b|বাজেট|মধ্যে|moddhe/i;
export function stripUnverifiedAmounts(text: string, allowed: Set<number>, visitorSaid: Set<number> = new Set()): { text: string; removed: boolean } {
  const parts = text.split(/(?<=[.!?।\n])\s+/); let removed = false;
  const kept = parts.filter(p => { const bad = amountsIn(p).some(a => !allowed.has(a) && !(visitorSaid.has(a) && budgetTalk.test(p))); if (bad) removed = true; return !bad; });
  return { text: kept.join(" ").trim(), removed };
}

/** Model output → plain text with a small safe Markdown subset (**bold**, "- " lists, [label](/internal-path)). No HTML survives. */
/** Prices are always Bangladeshi Taka. If a model writes another currency sign before a number ("₦120", "$5"), show ৳ instead. */
export function fixCurrency(text: string): string {
  return text.replace(/(?:\b(?:USD|NGN|INR|BDT|Rs)\b\.?|[$€£¥₹₦₩₽₺])\s?(?=\d)/gi, "৳");
}
export function cleanReply(raw: string, max = 1200): string {
  let s = raw.replace(/<[^>]*>/g, "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g, "");
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  s = s.replace(/\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g, (_m, label: string, href: string) => safeInternalPath(href) ? `[${label}](${href})` : label);
  // Bare URLs from the model are never kept.
  s = s.replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  // Some models leak markup markers or say the same line twice; drop the markers and keep one copy of an exactly repeated line.
  s = s.replace(/<!\[CDATA\[|\]\]>/g, "");
  const seen = new Set<string>();
  s = s.split("\n").filter(line => { const k = line.trim(); if (k.length < 12) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join("\n");
  return fixCurrency(s).trim().slice(0, max);
}
export type Piece = { type: "text"; text: string } | { type: "bold"; text: string } | { type: "link"; text: string; href: string };
export type Block = { type: "p"; pieces: Piece[] } | { type: "ul"; items: Piece[][] };
function pieces(line: string): Piece[] {
  const out: Piece[] = []; const re = /\*\*([^*]{1,200})\*\*|\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g; let last = 0;
  for (const m of line.matchAll(re)) {
    if (m.index > last) out.push({ type: "text", text: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "bold", text: m[1] });
    else { const href = safeInternalPath(m[3]); out.push(href ? { type: "link", text: m[2], href } : { type: "text", text: m[2] }); }
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ type: "text", text: line.slice(last) });
  return out;
}
/** Parses cleaned reply text into blocks the UI renders with React elements (never innerHTML). */
export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n{2,}/)) {
    const lines = chunk.split("\n").map(l => l.trim()).filter(Boolean); if (!lines.length) continue;
    if (lines.every(l => /^[-*•]\s+/.test(l))) blocks.push({ type: "ul", items: lines.map(l => pieces(l.replace(/^[-*•]\s+/, ""))) });
    else blocks.push({ type: "p", pieces: pieces(lines.join(" ")) });
  }
  return blocks;
}
