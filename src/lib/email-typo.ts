/**
 * Typo hint for the domain part of an email address ("name@gmaill.com" -> "name@gmail.com").
 *
 * This is only a *suggestion* for the person filling the form. It never changes or rejects an address:
 * the user can always keep exactly what they typed. It is safe to import in browser code (no Node APIs).
 */

/** Popular mailbox providers. A domain one small edit away from one of these is probably a typo. */
const POPULAR_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "live.com", "protonmail.com"];

/** Real providers that are close to a popular one ("mail.com" is one letter from "gmail.com"). Never suggest a change for these. */
const KNOWN_OTHER_DOMAINS = new Set(["mail.com", "email.com", "gmx.com", "aol.com", "me.com", "msn.com", "ymail.com", "hey.com", "zoho.com", "pm.me", "proton.me"]);

/** Edit distance where swapping two neighbouring letters ("hotmial") counts as one edit. */
function editDistance(a: string, b: string) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

/** Returns the same address with a corrected domain, or null when nothing looks wrong. */
export function suggestEmailFix(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 1) return null;
  const localPart = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (!domain.includes(".") || POPULAR_DOMAINS.includes(domain) || KNOWN_OTHER_DOMAINS.has(domain)) return null;
  const closest = POPULAR_DOMAINS.find(popular => editDistance(domain, popular) === 1);
  return closest ? `${localPart}@${closest}` : null;
}
