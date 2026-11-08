import { noStore } from "@/lib/admin-api";
import { MAX_FILE_BYTES } from "@/lib/file-storage";
import { uploadFile } from "@/lib/workspace-store";
import { idOk, workspaceError, workspaceViewer } from "@/lib/workspace-api";
export const runtime = "nodejs";

/** Upload one file (multipart field "file"; staff may add visibility=staff). Members and project managers only. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const v = await workspaceViewer(request, true);
  if ("response" in v) return v.response;
  if (!idOk(id)) return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 64 * 1024)
    return Response.json(
      { error: "INVALID_INPUT", field: "file" },
      { status: 413, headers: noStore },
    );
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json(
        { error: "INVALID_INPUT", field: "file" },
        { status: 400, headers: noStore },
      );
    if (file.size > MAX_FILE_BYTES)
      return Response.json(
        { error: "INVALID_INPUT", field: "file" },
        { status: 413, headers: noStore },
      );
    const fileId = await uploadFile(
      v.db,
      v.userId,
      v.access,
      id,
      { name: file.name, bytes: Buffer.from(await file.arrayBuffer()) },
      form.get("visibility"),
    );
    return Response.json({ id: fileId }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
