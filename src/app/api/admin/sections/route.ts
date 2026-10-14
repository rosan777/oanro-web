import { randomUUID } from "node:crypto";
import { getAuth, authConfigured } from "@/lib/auth";
import { isOwner } from "@/lib/access";
import { getDb } from "@/lib/db";
import { auditEvent, websiteSection } from "@/lib/db/schema";
import { sectionCodes } from "@/lib/website-sections";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  if (!authConfigured()) return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return Response.json({ error: "ORIGIN_FORBIDDEN" }, { status: 403 });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified || !(await isOwner(session.user.id))) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
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
