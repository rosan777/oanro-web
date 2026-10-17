import { randomUUID } from "node:crypto";
import { authorize } from "@/lib/admin-api";
import { getDb } from "@/lib/db";
import { auditEvent, websiteSection } from "@/lib/db/schema";
import { sectionCodes } from "@/lib/website-sections";
import { storefrontChanged } from "@/lib/storefront-cache";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  const actor = await authorize(request, "site.manage");
  if (!actor) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  storefrontChanged();
  const session = { user: { id: actor.userId } };
  if (Number(request.headers.get("content-length") || 0) > 4096) return Response.json({ error: "INVALID_INPUT" }, { status: 413 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const data = body as Record<string, unknown>;
  if (typeof data.code !== "string" || !sectionCodes.includes(data.code as typeof sectionCodes[number]) || typeof data.enabled !== "boolean") return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    const db = getDb();
    await db.transaction(async tx => {
      await tx.insert(websiteSection).values({ code: data.code as typeof sectionCodes[number], enabled: data.enabled as boolean, updatedBy: session.user.id }).onConflictDoUpdate({ target: websiteSection.code, set: { enabled: data.enabled as boolean, updatedBy: session.user.id, updatedAt: new Date() } });
      await tx.insert(auditEvent).values({ id: randomUUID(), actorId: session.user.id, action: "section.visibility", targetId: data.code as string, reason: data.enabled ? "enabled" : "disabled" });
    });
    return Response.json({ code: data.code, enabled: data.enabled }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "UPDATE_FAILED" }, { status: 503 }); }
}
