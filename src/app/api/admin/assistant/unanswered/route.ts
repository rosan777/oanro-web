import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { resolveUnanswered } from "@/lib/assistant/store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Mark an unanswered question as handled. */
export const POST = adminHandler("assistant.edit", async (actor, data) => { await resolveUnanswered(catalogDb(), actor, requireUuid(data.id)); return Response.json({ ok: true }, { headers: noStore }); });
