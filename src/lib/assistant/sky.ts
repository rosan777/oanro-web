/**
 * The assistant header shows a small city under a sky that follows the visitor's own local time (their browser time zone)
 * and, when available, the real current weather there (see weather.ts). Without weather data the sky is simply clear.
 */
export type SkyPhase = "dawn" | "day" | "dusk" | "night";
export type SkyScene = {
  phase: SkyPhase;
  /** The body in the sky: the sun from 06:00 to 18:00 local time, the moon otherwise. */
  body: "sun" | "moon";
  /** Position of that body inside the 400 x 58 scene: it rises on the left, peaks mid-way and sets on the right. */
  x: number;
  y: number;
};

/** Calendar parts of an instant in a time zone (falls back to Dhaka, UTC+6, if the zone is unknown to the browser). */
export function localParts(date: Date, timeZone = "Asia/Dhaka") {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(date);
    const n = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
    return { year: n("year"), month: n("month"), day: n("day"), hour: n("hour") % 24, minute: n("minute") };
  } catch {
    const d = new Date(date.getTime() + 6 * 3600_000);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes() };
  }
}
/** Small stable string hash (FNV-1a), so the scene never depends on Math.random. */
export function hashText(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function skyScene(date: Date, timeZone = "Asia/Dhaka"): SkyScene {
  const { hour, minute } = localParts(date, timeZone), f = hour + minute / 60;
  const phase: SkyPhase = f >= 5 && f < 7 ? "dawn" : f >= 7 && f < 17 ? "day" : f >= 17 && f < 19 ? "dusk" : "night";
  const sun = f >= 6 && f < 18;
  const progress = sun ? (f - 6) / 12 : ((f - 18 + 24) % 24) / 12; // 0 at rising, 1 at setting
  return { phase, body: sun ? "sun" : "moon", x: Math.round(40 + progress * 320), y: Math.round(46 - Math.sin(Math.PI * progress) * 36) };
}
