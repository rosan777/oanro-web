// Campaign schedules are entered and shown in Bangladesh time (Asia/Dhaka, UTC+6, no daylight saving).
const OFFSET_MS = 6 * 60 * 60 * 1000;
/** "2026-12-01T09:00" typed in Dhaka time -> exact instant. Empty -> null. */
export function fromDhakaInput(value: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("INVALID_DATE");
  const date = new Date(`${value}:00+06:00`);
  if (Number.isNaN(date.getTime())) throw new Error("INVALID_DATE");
  return date;
}
/** Instant -> "YYYY-MM-DDTHH:mm" in Dhaka time, for <input type="datetime-local">. */
export function toDhakaInput(value: Date | string | null): string {
  if (!value) return "";
  return new Date(new Date(value).getTime() + OFFSET_MS).toISOString().slice(0, 16);
}
const months = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], bn: ["জানু", "ফেব্রু", "মার্চ", "এপ্রি", "মে", "জুন", "জুলাই", "আগ", "সেপ্টে", "অক্টো", "নভে", "ডিসে"] };
const bnDigits = "০১২৩৪৫৬৭৮৯";
/** "25 Dec, 11:59 PM" in Dhaka time; deterministic on server and browser (no Intl). */
export function formatDhaka(value: Date | string, locale: "en" | "bn" = "en") {
  const d = new Date(new Date(value).getTime() + OFFSET_MS);
  const h = d.getUTCHours(), m = String(d.getUTCMinutes()).padStart(2, "0");
  const text = `${d.getUTCDate()} ${months[locale][d.getUTCMonth()]}, ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
  return locale === "bn" ? text.replace(/\d/g, x => bnDigits[Number(x)]).replace("AM", "পূর্বাহ্ণ").replace("PM", "অপরাহ্ণ") : text;
}
