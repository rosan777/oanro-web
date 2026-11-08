import { getFile } from "@/lib/file-storage";
import { fileForDownload } from "@/lib/workspace-store";
import { idOk, workspaceViewer } from "@/lib/workspace-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Download a project file. Only members (shared files) and project staff; always as an attachment. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  const { id } = await context.params;
  const v = await workspaceViewer(request, false);
  if ("response" in v || !idOk(id)) return new Response(null, { status: 404, headers });
  try {
    const row = await fileForDownload(v.db, v.userId, v.access, id);
    const bytes = await getFile(row.storageKey);
    const name = row.name.replace(/[^\w.\- ]/g, "_");
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": row.mime,
        "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      },
    });
  } catch {
    return new Response(null, { status: 404, headers });
  }
}
