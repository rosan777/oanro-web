import { timingSafeEqual } from "node:crypto";
import { purgeExpired } from "@/lib/assistant/store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Daily job (see vercel.json): really deletes assistant chats, unanswered excerpts and stale counters older than 30 days. Needs "Authorization: Bearer <CRON_SECRET>". */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const got = Buffer.from(request.headers.get("authorization") ?? ""), want = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || got.length !== want.length || !timingSafeEqual(got, want)) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  try { return Response.json({ deleted: await purgeExpired(catalogDb()) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "CLEANUP_FAILED" }, { status: 500, headers: { "Cache-Control": "no-store" } }); }
}
