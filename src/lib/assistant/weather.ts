/**
 * Local weather for the assistant header. Data from MET Norway (api.met.no, free, NLOD 2.0 / CC BY 4.0, commercial use allowed with credit).
 * Privacy: the visitor's place comes from their browser's time zone (no location permission), or, when hosted on Vercel, the city-level
 * location Vercel derives from the IP. Only rounded coordinates (about 11 km) go to MET Norway; nothing is stored.
 */
export type Condition = "clear" | "partly" | "cloudy" | "fog" | "rain" | "thunder" | "snow";
export type Weather = { place: string; temp: number; unit: "C" | "F"; condition: Condition; night: boolean; rainChance: number | null };
export type Place = { name: string; lat: number; lon: number; fahrenheit: boolean };

// Time zone -> a representative city. Unknown zones get no weather (we never guess a far-away place).
const zones: Record<string, [string, number, number]> = {
  "Asia/Dhaka": ["Dhaka", 23.81, 90.41], "Asia/Kolkata": ["Kolkata", 22.57, 88.36], "Asia/Calcutta": ["Kolkata", 22.57, 88.36], "Asia/Karachi": ["Karachi", 24.86, 67.01],
  "Asia/Kathmandu": ["Kathmandu", 27.72, 85.32], "Asia/Colombo": ["Colombo", 6.93, 79.86], "Asia/Yangon": ["Yangon", 16.84, 96.17], "Asia/Thimphu": ["Thimphu", 27.47, 89.64],
  "Asia/Dubai": ["Dubai", 25.2, 55.27], "Asia/Riyadh": ["Riyadh", 24.71, 46.68], "Asia/Qatar": ["Doha", 25.29, 51.53], "Asia/Kuwait": ["Kuwait City", 29.38, 47.99],
  "Asia/Bahrain": ["Manama", 26.23, 50.59], "Asia/Muscat": ["Muscat", 23.59, 58.41], "Asia/Singapore": ["Singapore", 1.35, 103.82], "Asia/Kuala_Lumpur": ["Kuala Lumpur", 3.14, 101.69],
  "Asia/Bangkok": ["Bangkok", 13.76, 100.5], "Asia/Jakarta": ["Jakarta", -6.21, 106.85], "Asia/Manila": ["Manila", 14.6, 120.98], "Asia/Ho_Chi_Minh": ["Ho Chi Minh City", 10.82, 106.63],
  "Asia/Tokyo": ["Tokyo", 35.68, 139.69], "Asia/Seoul": ["Seoul", 37.57, 126.98], "Asia/Shanghai": ["Shanghai", 31.23, 121.47], "Asia/Hong_Kong": ["Hong Kong", 22.32, 114.17],
  "Asia/Taipei": ["Taipei", 25.03, 121.57], "Australia/Sydney": ["Sydney", -33.87, 151.21], "Australia/Melbourne": ["Melbourne", -37.81, 144.96], "Pacific/Auckland": ["Auckland", -36.85, 174.76],
  "Europe/London": ["London", 51.51, -0.13], "Europe/Dublin": ["Dublin", 53.35, -6.26], "Europe/Paris": ["Paris", 48.86, 2.35], "Europe/Berlin": ["Berlin", 52.52, 13.4],
  "Europe/Rome": ["Rome", 41.9, 12.5], "Europe/Madrid": ["Madrid", 40.42, -3.7], "Europe/Amsterdam": ["Amsterdam", 52.37, 4.9], "Europe/Stockholm": ["Stockholm", 59.33, 18.07],
  "Europe/Oslo": ["Oslo", 59.91, 10.75], "Europe/Istanbul": ["Istanbul", 41.01, 28.98], "Europe/Moscow": ["Moscow", 55.76, 37.62], "Africa/Cairo": ["Cairo", 30.04, 31.24],
  "Africa/Lagos": ["Lagos", 6.52, 3.38], "Africa/Nairobi": ["Nairobi", -1.29, 36.82], "Africa/Johannesburg": ["Johannesburg", -26.2, 28.05], "America/New_York": ["New York", 40.71, -74.01],
  "America/Chicago": ["Chicago", 41.88, -87.63], "America/Denver": ["Denver", 39.74, -104.99], "America/Los_Angeles": ["Los Angeles", 34.05, -118.24], "America/Toronto": ["Toronto", 43.65, -79.38],
  "America/Sao_Paulo": ["São Paulo", -23.55, -46.63], "America/Mexico_City": ["Mexico City", 19.43, -99.13],
};
const usZones = new Set(["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Where to show weather for. Host geo headers are trusted only on Vercel (it sets and overwrites them); otherwise the time zone table. */
export function resolvePlace(timeZone: string, headers: Headers, onVercel: boolean): Place | null {
  if (onVercel) {
    const lat = Number(headers.get("x-vercel-ip-latitude")), lon = Number(headers.get("x-vercel-ip-longitude"));
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && (lat !== 0 || lon !== 0)) {
      let city = ""; try { city = decodeURIComponent(headers.get("x-vercel-ip-city") ?? ""); } catch { /* keep empty */ }
      const name = city.replace(/[^\p{L}\p{M} .'-]/gu, "").slice(0, 40) || zones[timeZone]?.[0] || "";
      return { name, lat: round1(lat), lon: round1(lon), fahrenheit: headers.get("x-vercel-ip-country") === "US" };
    }
  }
  const z = zones[timeZone];
  return z ? { name: z[0], lat: round1(z[1]), lon: round1(z[2]), fahrenheit: usZones.has(timeZone) } : null;
}

/** MET Norway symbol codes (e.g. "lightrainshowers_day") -> our few scene conditions. */
export function conditionFrom(symbol: string): { condition: Condition; night: boolean } {
  const s = symbol.toLowerCase(), night = s.endsWith("_night");
  const condition: Condition = s.includes("thunder") ? "thunder" : s.includes("snow") || s.includes("sleet") ? "snow" : s.includes("rain") ? "rain"
    : s.startsWith("fog") ? "fog" : s.startsWith("cloudy") ? "cloudy" : s.startsWith("partlycloudy") || s.startsWith("fair") ? "partly" : "clear";
  return { condition, night };
}

type MetPoint = { data?: { instant?: { details?: { air_temperature?: number } }; next_1_hours?: { summary?: { symbol_code?: string }; details?: { probability_of_precipitation?: number } } } };
/** The current hour from a MET Locationforecast "complete" response; null when the shape is not what we expect. */
export function readMet(body: unknown, place: Place): Weather | null {
  const series = (body as { properties?: { timeseries?: MetPoint[] } })?.properties?.timeseries;
  const now = Array.isArray(series) ? series[0]?.data : undefined;
  const t = now?.instant?.details?.air_temperature, symbol = now?.next_1_hours?.summary?.symbol_code;
  if (typeof t !== "number" || !Number.isFinite(t) || typeof symbol !== "string") return null;
  const chance = now?.next_1_hours?.details?.probability_of_precipitation;
  const { condition, night } = conditionFrom(symbol);
  return { place: place.name, temp: Math.round(place.fahrenheit ? t * 9 / 5 + 32 : t), unit: place.fahrenheit ? "F" : "C", condition, night,
    rainChance: typeof chance === "number" && Number.isFinite(chance) ? Math.round(Math.min(100, Math.max(0, chance))) : null };
}

// Small in-memory cache per rounded location, so many visitors in one city share one upstream request (MET asks for caching).
const cache = new Map<string, { at: number; until: number; body: unknown; lastModified: string | null }>();
const MIN_MS = 15 * 60_000, MAX_MS = 60 * 60_000;
export async function weatherFor(place: Place, contact: string, fetcher: typeof fetch = fetch, now = Date.now()): Promise<Weather | null> {
  const key = `${place.lat},${place.lon}`, hit = cache.get(key);
  if (hit && hit.until > now) return readMet(hit.body, place);
  const headers: Record<string, string> = { "User-Agent": `OANRO-web/1.0 ${contact}`, Accept: "application/json" };
  if (hit?.lastModified) headers["If-Modified-Since"] = hit.lastModified;
  // Fixed host and path; only the rounded numbers vary, so this can never be pointed elsewhere.
  const res = await fetcher(`https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${place.lat}&lon=${place.lon}`, { headers, signal: AbortSignal.timeout(5000), cache: "no-store" });
  const expires = Date.parse(res.headers.get("expires") ?? ""), until = now + Math.min(MAX_MS, Math.max(MIN_MS, Number.isFinite(expires) ? expires - now : 0));
  if (res.status === 304 && hit) { cache.set(key, { ...hit, at: now, until }); return readMet(hit.body, place); }
  if (!res.ok) return hit ? readMet(hit.body, place) : null;
  const body: unknown = await res.json();
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: now, until, body, lastModified: res.headers.get("last-modified") });
  return readMet(body, place);
}
/** Valid IANA-style zone name, so the query value can only ever be used as a table key. */
export const validZone = (tz: string) => /^[A-Za-z]+(?:\/[A-Za-z_+-]+){0,2}$/.test(tz) && tz.length <= 40;
