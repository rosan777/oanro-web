// Visitor privacy choices (browser only). Stored in localStorage and mirrored in a small first-party cookie
// ("oanro_consent") so server code can respect the same choice later (e.g. the shopping assistant).
// Essential storage (sign-in, bag, security, language) is always on and is not part of this object.
export type Consent = { v: 1; functional: boolean; analytics: boolean; personalisation: boolean; at: string };
export type ConsentChoice = Pick<Consent, "functional" | "analytics" | "personalisation">;

const KEY = "oanro-consent";
const COOKIE = "oanro_consent";
const MAX_AGE_DAYS = 180; // ask again after about six months
const RECENT_KEY = "oanro-recent-products";
export const CONSENT_EVENT = "oanro-consent-change";
export const OPEN_PRIVACY_EVENT = "oanro-open-privacy";

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    if (c.v !== 1 || !c.at || Date.now() - Date.parse(c.at) > MAX_AGE_DAYS * 864e5) return null;
    return c;
  } catch { return null; }
}

export function saveConsent(choice: ConsentChoice): Consent {
  const c: Consent = { v: 1, ...choice, at: new Date().toISOString() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  const flags = `f${+c.functional}a${+c.analytics}p${+c.personalisation}`;
  document.cookie = `${COOKIE}=${flags}; Max-Age=${MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  // Withdrawing personalisation also removes what it collected.
  if (!c.personalisation) { try { localStorage.removeItem(RECENT_KEY); } catch {} }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
  return c;
}

/** True only when the visitor has said yes to this purpose. */
export function allows(purpose: keyof ConsentChoice): boolean { return readConsent()?.[purpose] === true; }

// Personalisation data: product pages this visitor opened, kept in their own browser (newest first, max 20).
// Groundwork for recommendations and the shopping assistant; nothing leaves the browser yet.
export function rememberProduct(slug: string) {
  if (!allows("personalisation")) return;
  try {
    const list = (JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]).filter(s => s !== slug);
    localStorage.setItem(RECENT_KEY, JSON.stringify([slug, ...list].slice(0, 20)));
  } catch {}
}

/** Product pages this visitor opened, only while they allow Personalisation (checked here, on every read, and again by the server). */
export function recentProducts(): string[] {
  if (!allows("personalisation")) return [];
  try { const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(list) ? list.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s)).slice(0, 5) : []; } catch { return []; }
}
