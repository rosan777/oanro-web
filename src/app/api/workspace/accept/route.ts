import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { acceptInvite } from "@/lib/workspace-store";
import { workspaceError, workspaceViewer } from "@/lib/workspace-api";
export const runtime = "nodejs";

/** Accept a project invite sent to the signed-in user's own (verified) email address. */
export async function POST(request: Request) {
  const v = await workspaceViewer(request, true);
  if ("response" in v) return v.response;
  try {
    const data = await readObject(request, 1000);
    const projectId = await acceptInvite(v.db, v.user, String(data.token ?? ""));
    return Response.json({ projectId }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
