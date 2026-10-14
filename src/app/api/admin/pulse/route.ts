import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getAuth, authConfigured } from "@/lib/auth";
import { isOwner } from "@/lib/access";
import { getDb } from "@/lib/db";
import { auditEvent, pulseStory } from "@/lib/db/schema";
export const runtime = "nodejs";
function validPublicUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1600) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && /^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(url.hostname) && !url.hostname.endsWith(".local");
  } catch { return false; }
}
async function owner(request: Request) {
  if (!authConfigured()) return null;
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user.emailVerified && await isOwner(session.user.id) ? session.user.id : null;
}
export async function POST(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 8192) return Response.json({ error: "INVALID_INPUT" }, { status: 413 });
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400 }); }
  if (typeof data.publisher !== "string" || !data.publisher.trim() || data.publisher.length > 80 || typeof data.headline !== "string" || !data.headline.trim() || data.headline.length > 220 || !validPublicUrl(data.url) || data.rightsConfirmed !== true || data.visible !== true || data.thumbnailUrl != null) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  const id = randomUUID();
  try {
    await getDb().transaction(async tx => {
      await tx.insert(pulseStory).values({ id, publisher: (data.publisher as string).trim(), headline: (data.headline as string).trim(), url: data.url as string, approvedBy: ownerId, visible: true, rightsConfirmed: true });
      await tx.insert(auditEvent).values({ id: randomUUID(), actorId: ownerId, action: "pulse.publish", targetId: id, reason: "Manual source and rights reviewed" });
    });
    return Response.json({ id }, { status: 201 });
  } catch { return Response.json({ error: "DUPLICATE_OR_UNAVAILABLE" }, { status: 409 }); }
}
export async function PATCH(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400 }); }
  if (typeof data.id !== "string" || !/^[0-9a-f-]{36}$/.test(data.id) || typeof data.visible !== "boolean") return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    await getDb().transaction(async tx => {
      const changed = await tx.update(pulseStory).set({ visible: data.visible as boolean }).where(eq(pulseStory.id, data.id as string)).returning({ id: pulseStory.id });
      if (!changed.length) throw new Error("NOT_FOUND");
      await tx.insert(auditEvent).values({ id: randomUUID(), actorId: ownerId, action: data.visible ? "pulse.show" : "pulse.hide", targetId: data.id as string, reason: "Owner editorial decision" });
    });
    return Response.json({ id: data.id, visible: data.visible });
  } catch { return Response.json({ error: "NOT_FOUND_OR_UNAVAILABLE" }, { status: 404 }); }
}
