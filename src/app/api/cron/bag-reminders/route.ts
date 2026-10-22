import { sendBagReminders } from "@/lib/marketing";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Called once a day by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const sent = await sendBagReminders(catalogDb());
  return Response.json({ sent }, { headers: { "Cache-Control": "no-store" } });
}
