import { noStore } from "@/lib/admin-api";
import { getProject } from "@/lib/workspace-store";
import { idOk, workspaceError, workspaceViewer } from "@/lib/workspace-api";
export const runtime = "nodejs";

/** One project as the viewer may see it (client member or project staff). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const v = await workspaceViewer(request, false);
  if ("response" in v) return v.response;
  if (!idOk(id)) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  try {
    return Response.json(await getProject(v.db, id, v.userId, v.access), { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
