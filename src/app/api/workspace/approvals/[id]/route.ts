import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { decideApproval } from "@/lib/workspace-store";
import { notifyApprovalDecided } from "@/lib/workspace-notify";
import { idOk, workspaceError, workspaceViewer } from "@/lib/workspace-api";
import { clientProjectApproval } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const runtime = "nodejs";

/** A client approves a request or asks for changes (comment required for changes). */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const v = await workspaceViewer(request, true);
  if ("response" in v) return v.response;
  if (!idOk(id)) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  try {
    const data = await readObject(request, 6000);
    const projectId = await decideApproval(v.db, v.userId, v.access, id, data);
    const [row] = await v.db
      .select({ title: clientProjectApproval.title, status: clientProjectApproval.status })
      .from(clientProjectApproval)
      .where(eq(clientProjectApproval.id, id));
    if (row) await notifyApprovalDecided(v.db, projectId, row.title, row.status === "approved");
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
