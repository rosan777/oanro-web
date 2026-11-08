import { isBot, parseSearchEvent, recordSearchEvent } from "@/lib/search-insights";
import { originMatchesHost } from "@/lib/same-host";
import { readObject } from "@/lib/pulse-thumbnail";
import { underLimit } from "@/lib/rate-limit";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };
/** Analytics consent as mirrored by the privacy center into the first-party cookie ("a1"). */
const analyticsAllowed = (request: Request) =>
  /(?:^|;\s*)oanro_consent=[^;]*a1/.test(request.headers.get("cookie") ?? "");

/**
 * Search insights collector. Always answers 204 so analytics can never break search; events are stored
 * only from this site, with Analytics consent, from non-bot browsers, within the rate limit, and only
 * when the query passes the redaction rules in search-insights.ts.
 */
export async function POST(request: Request) {
  try {
    if (
      process.env.DATABASE_URL &&
      originMatchesHost(request) &&
      analyticsAllowed(request) &&
      !isBot(request.headers.get("user-agent"))
    ) {
      const event = parseSearchEvent(await readObject(request, 2000));
      const db = catalogDb();
      if (event && (await underLimit(db, request, "search-track", 60, 60_000)))
        await recordSearchEvent(db, event);
    }
  } catch {}
  return new Response(null, { status: 204, headers: noStore });
}
