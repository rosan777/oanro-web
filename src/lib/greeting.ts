// Time-of-day welcome for the account overview page. Plain, friendly phrasing —
// no sales language, no urgency, no "you should/must" directives.
const OFFSET_MS = 6 * 60 * 60 * 1000;

type Period = "morning" | "afternoon" | "evening" | "night";

/** Dhaka-local hour (0-23) for the given instant, computed the same deterministic way as dhaka-time.ts. */
function dhakaHour(now: Date): number {
  return new Date(now.getTime() + OFFSET_MS).getUTCHours();
}

function periodFor(hour: number): Period {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

const lines: Record<Period, { en: string[]; bn: string[] }> = {
  morning: {
    en: ["Good morning", "Morning", "Hope your morning's off to a good start"],
    bn: ["শুভ সকাল", "সুপ্রভাত", "আশা করি সকালটা ভালো যাচ্ছে"],
  },
  afternoon: {
    en: ["Good afternoon", "Afternoon", "Hope your day's going well so far"],
    bn: ["শুভ অপরাহ্ন", "নমস্কার", "আশা করি দিনটা ভালো যাচ্ছে"],
  },
  evening: {
    en: ["Good evening", "Evening", "Hope you're winding down nicely"],
    bn: ["শুভ সন্ধ্যা", "সন্ধ্যার শুভেচ্ছা", "আশা করি সন্ধ্যাটা ভালো যাচ্ছে"],
  },
  night: {
    en: ["Welcome back", "Still up, we see", "Good to see you"],
    bn: ["আবার স্বাগতম", "এখনো জেগে আছেন দেখছি", "দেখে ভালো লাগলো"],
  },
};

/**
 * Time-aware welcome line for the signed-in customer, e.g. "Good evening, Rifat."
 * Picks one of a few plain variants for the current Dhaka time period, so it
 * isn't the exact same sentence on every visit, without resorting to pushy or
 * sales-style wording.
 */
export function welcomeLine(firstName: string, locale: "en" | "bn", now: Date = new Date()): string {
  const period = periodFor(dhakaHour(now));
  const options = lines[period][locale];
  const pick = options[Math.floor(Math.random() * options.length)];
  return locale === "bn" ? `${pick}, ${firstName}।` : `${pick}, ${firstName}.`;
}
