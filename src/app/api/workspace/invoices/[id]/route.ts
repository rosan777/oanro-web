import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { submitPayment } from "@/lib/workspace-store";
import { notifyPaymentSubmitted } from "@/lib/workspace-notify";
import { idOk, workspaceError, workspaceViewer } from "@/lib/workspace-api";
export const runtime = "nodejs";

/** A client reports a manual payment for an issued invoice; staff confirm it later. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const v = await workspaceViewer(request, true);
  if ("response" in v) return v.response;
  if (!idOk(id)) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  try {
    const done = await submitPayment(v.db, v.userId, v.access, id, await readObject(request, 2000));
    await notifyPaymentSubmitted(v.db, done.projectId, done.number);
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
