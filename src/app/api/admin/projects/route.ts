import { authorize, noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
import {
  createInvoice,
  createProject,
  deleteFile,
  deleteMilestone,
  getProject,
  invoiceAction,
  inviteMember,
  listAllProjects,
  removeMember,
  requestApproval,
  saveMilestone,
  updateProject,
} from "@/lib/workspace-store";
import { notifyApprovalRequested, notifyInvite, notifyInvoice } from "@/lib/workspace-notify";
import { idOk, workspaceError } from "@/lib/workspace-api";
import { ProductInputError } from "@/lib/product-input";
export const runtime = "nodejs";

// Staff API for client projects. Any of the three project permissions opens it; every action is then
// checked against the exact permission in workspace-store.ts (manage / invoices). Unlike most admin
// routes this does not refresh the storefront cache: projects are never shown to shoppers.

const anyProject = ["projects.read", "projects.manage", "projects.invoices"] as const;

export async function GET(request: Request) {
  const actor = await authorize(request, [...anyProject]);
  if (!actor) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const id = new URL(request.url).searchParams.get("id");
  try {
    const db = catalogDb();
    if (id) {
      if (!idOk(id))
        return Response.json({ error: "NOT_FOUND" }, { status: 404, headers: noStore });
      return Response.json(await getProject(db, id, actor.userId, actor.access), {
        headers: noStore,
      });
    }
    return Response.json({ projects: await listAllProjects(db) }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}

export async function POST(request: Request) {
  const actor = await authorize(request, [...anyProject]);
  if (!actor) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const { userId, access } = actor;
  const db = catalogDb();
  try {
    const data = await readObject(request, 40000);
    const projectId = data.projectId;
    const needProject = () => {
      if (!idOk(projectId)) throw new ProductInputError("projectId");
      return projectId;
    };
    const needId = (field = "id") => {
      const v = data[field];
      if (!idOk(v)) throw new ProductInputError(field);
      return v;
    };
    switch (data.action) {
      case "create":
        return Response.json(
          { id: await createProject(db, userId, access, data) },
          { headers: noStore },
        );
      case "update":
        await updateProject(db, userId, access, needProject(), data);
        break;
      case "milestone":
        await saveMilestone(db, userId, access, needProject(), data);
        break;
      case "milestone-delete":
        await deleteMilestone(db, userId, access, needProject(), needId());
        break;
      case "invite": {
        const p = needProject();
        const invite = await inviteMember(db, userId, access, p, data.email);
        await notifyInvite(db, p, invite.email, invite.token);
        break;
      }
      case "member-remove":
        await removeMember(db, userId, access, needProject(), needId());
        break;
      case "approval": {
        const p = needProject();
        await requestApproval(db, userId, access, p, data);
        await notifyApprovalRequested(db, p, String(data.title ?? ""));
        break;
      }
      case "file-delete":
        await deleteFile(db, userId, access, needProject(), needId());
        break;
      case "invoice":
        await createInvoice(db, userId, access, needProject(), data);
        break;
      case "invoice-action": {
        // "action" routes this request; the invoice step itself travels as "step".
        const done = await invoiceAction(db, userId, access, needId(), {
          ...data,
          action: data.step,
        });
        await notifyInvoice(db, done.projectId, done.number, done.total, done.action);
        break;
      }
      default:
        throw new ProductInputError("action");
    }
    return Response.json({ ok: true }, { headers: noStore });
  } catch (error) {
    return workspaceError(error);
  }
}
