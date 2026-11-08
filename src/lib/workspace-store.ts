// Client Workspace: Studio projects with milestones, files, approvals and invoices.
//
// Who can do what (checked here, on the server, for every call):
//   - Staff with projects.read see every project; projects.manage changes projects, milestones, files,
//     approvals and members; projects.invoices creates, issues and voids invoices and confirms payments.
//     The owner has all three. No role template includes them (see permissions.ts).
//   - A client sees a project only through an accepted membership, sees only shared files and issued
//     invoices, and can upload files, answer approval requests and submit a payment reference.
// Every change writes an activity-log entry. Invoices are requests for payment, never tax invoices.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  auditEvent,
  clientInvoice,
  clientInvoiceLine,
  clientProject,
  clientProjectApproval,
  clientProjectFile,
  clientProjectMember,
  clientProjectMilestone,
  lead,
  milestoneStatuses,
  projectStatuses,
  user,
} from "./db/schema";
import { ProductInputError, projectTypes } from "./product-input";
import { ProductStoreError, type CatalogDb } from "./product-store";
import type { Access } from "./rbac";
import { MAX_FILE_BYTES, MAX_PROJECT_BYTES, detectKind, putFile, removeFile } from "./file-storage";

export type ProjectStatus = (typeof projectStatuses)[number];
export type MilestoneStatus = (typeof milestoneStatuses)[number];

/** How the viewer relates to a project. */
export type ProjectRole = {
  staff: boolean;
  manage: boolean;
  invoices: boolean;
  client: boolean;
};

const audit = (
  db: Pick<CatalogDb, "insert">,
  actorId: string,
  action: string,
  targetId: string,
  reason = "",
) =>
  db
    .insert(auditEvent)
    .values({ id: randomUUID(), actorId, action, targetId, reason: reason.slice(0, 300) });

const has = (access: Access, p: "projects.read" | "projects.manage" | "projects.invoices") =>
  access.owner || access.permissions.has(p);

// Input helpers ---------------------------------------------------------------------------------

function text(data: Record<string, unknown>, field: string, max: number, required = false) {
  const v = data[field];
  if (v === undefined || v === null) {
    if (required) throw new ProductInputError(field);
    return "";
  }
  if (typeof v !== "string") throw new ProductInputError(field);
  const t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim();
  if (t.length > max || (required && !t)) throw new ProductInputError(field);
  return t;
}
function date(data: Record<string, unknown>, field: string) {
  const v = data[field];
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v)))
    throw new ProductInputError(field);
  return v;
}
function choice<T extends string>(
  data: Record<string, unknown>,
  field: string,
  list: readonly T[],
  fallback?: T,
): T {
  const v = data[field];
  if ((v === undefined || v === "") && fallback) return fallback;
  if (typeof v !== "string" || !list.includes(v as T)) throw new ProductInputError(field);
  return v as T;
}
function money(value: unknown, field: string) {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 100_000_000)
    throw new ProductInputError(field);
  return n;
}

// Access ----------------------------------------------------------------------------------------

/** The viewer's role on a project, or null when they may not see it at all. */
export async function projectRole(
  db: CatalogDb,
  projectId: string,
  userId: string,
  access: Access,
): Promise<ProjectRole | null> {
  const [project] = await db
    .select({ id: clientProject.id })
    .from(clientProject)
    .where(eq(clientProject.id, projectId))
    .limit(1);
  if (!project) return null;
  const staff =
    has(access, "projects.read") ||
    has(access, "projects.manage") ||
    has(access, "projects.invoices");
  const [member] = await db
    .select({ id: clientProjectMember.id })
    .from(clientProjectMember)
    .where(
      and(
        eq(clientProjectMember.projectId, projectId),
        eq(clientProjectMember.userId, userId),
        isNotNull(clientProjectMember.acceptedAt),
      ),
    )
    .limit(1);
  if (!staff && !member) return null;
  return {
    staff,
    manage: has(access, "projects.manage"),
    invoices: has(access, "projects.invoices"),
    client: Boolean(member),
  };
}

async function requireRole(
  db: CatalogDb,
  projectId: string,
  userId: string,
  access: Access,
  need: "view" | "client" | "manage" | "invoices",
) {
  const role = await projectRole(db, projectId, userId, access);
  if (!role) throw new ProductStoreError("NOT_FOUND");
  const ok =
    need === "view" ||
    (need === "client" && (role.client || role.manage)) ||
    (need === "manage" && role.manage) ||
    (need === "invoices" && role.invoices);
  if (!ok) throw new ProductStoreError("NOT_ALLOWED");
  return role;
}

// Reading ---------------------------------------------------------------------------------------

/** Projects the signed-in client belongs to (accepted invites only). */
export async function listClientProjects(db: CatalogDb, userId: string) {
  return db
    .select({
      id: clientProject.id,
      title: clientProject.title,
      status: clientProject.status,
      projectType: clientProject.projectType,
      targetDate: clientProject.targetDate,
      updatedAt: clientProject.updatedAt,
    })
    .from(clientProjectMember)
    .innerJoin(clientProject, eq(clientProject.id, clientProjectMember.projectId))
    .where(and(eq(clientProjectMember.userId, userId), isNotNull(clientProjectMember.acceptedAt)))
    .orderBy(desc(clientProject.updatedAt));
}

/** Every project, for staff with any projects permission (caller checks the permission). */
export async function listAllProjects(db: CatalogDb) {
  const rows = await db
    .select({
      id: clientProject.id,
      title: clientProject.title,
      clientName: clientProject.clientName,
      status: clientProject.status,
      projectType: clientProject.projectType,
      targetDate: clientProject.targetDate,
      updatedAt: clientProject.updatedAt,
    })
    .from(clientProject)
    .orderBy(desc(clientProject.updatedAt));
  return rows;
}

/** Issued invoices across the client's projects (account → Invoices). Drafts are never shown to clients. */
export async function listClientInvoices(db: CatalogDb, userId: string) {
  const projects = await listClientProjects(db, userId);
  if (!projects.length) return [];
  return db
    .select({
      id: clientInvoice.id,
      projectId: clientInvoice.projectId,
      number: clientInvoice.number,
      status: clientInvoice.status,
      issueDate: clientInvoice.issueDate,
      dueDate: clientInvoice.dueDate,
      total: clientInvoice.total,
    })
    .from(clientInvoice)
    .where(
      and(
        inArray(
          clientInvoice.projectId,
          projects.map(p => p.id),
        ),
        sql`${clientInvoice.status} <> 'draft'`,
      ),
    )
    .orderBy(desc(clientInvoice.createdAt));
}

/** Everything about one project that the viewer may see. */
export async function getProject(db: CatalogDb, projectId: string, userId: string, access: Access) {
  const role = await requireRole(db, projectId, userId, access, "view");
  const clientView = !role.staff;
  const [project] = await db
    .select()
    .from(clientProject)
    .where(eq(clientProject.id, projectId))
    .limit(1);
  const [milestones, files, approvals, invoices, members] = await Promise.all([
    db
      .select()
      .from(clientProjectMilestone)
      .where(eq(clientProjectMilestone.projectId, projectId))
      .orderBy(asc(clientProjectMilestone.displayOrder), asc(clientProjectMilestone.createdAt)),
    db
      .select({
        id: clientProjectFile.id,
        name: clientProjectFile.name,
        mime: clientProjectFile.mime,
        size: clientProjectFile.size,
        visibility: clientProjectFile.visibility,
        createdAt: clientProjectFile.createdAt,
        uploadedBy: user.name,
      })
      .from(clientProjectFile)
      .leftJoin(user, eq(user.id, clientProjectFile.uploadedBy))
      .where(
        clientView
          ? and(
              eq(clientProjectFile.projectId, projectId),
              eq(clientProjectFile.visibility, "shared"),
            )
          : eq(clientProjectFile.projectId, projectId),
      )
      .orderBy(desc(clientProjectFile.createdAt)),
    db
      .select()
      .from(clientProjectApproval)
      .where(eq(clientProjectApproval.projectId, projectId))
      .orderBy(desc(clientProjectApproval.createdAt)),
    db
      .select()
      .from(clientInvoice)
      .where(
        clientView
          ? and(eq(clientInvoice.projectId, projectId), sql`${clientInvoice.status} <> 'draft'`)
          : eq(clientInvoice.projectId, projectId),
      )
      .orderBy(desc(clientInvoice.createdAt)),
    role.staff
      ? db
          .select({
            id: clientProjectMember.id,
            email: clientProjectMember.email,
            acceptedAt: clientProjectMember.acceptedAt,
            expiresAt: clientProjectMember.expiresAt,
          })
          .from(clientProjectMember)
          .where(eq(clientProjectMember.projectId, projectId))
      : Promise.resolve([]),
  ]);
  const lines = invoices.length
    ? await db
        .select()
        .from(clientInvoiceLine)
        .where(
          inArray(
            clientInvoiceLine.invoiceId,
            invoices.map(i => i.id),
          ),
        )
        .orderBy(asc(clientInvoiceLine.displayOrder))
    : [];
  const activity = role.staff
    ? await db
        .select({
          action: auditEvent.action,
          reason: auditEvent.reason,
          createdAt: auditEvent.createdAt,
          actor: user.name,
        })
        .from(auditEvent)
        .leftJoin(user, eq(user.id, auditEvent.actorId))
        .where(
          and(
            sql`${auditEvent.action} like 'project.%'`,
            sql`${auditEvent.reason} like ${`${projectId}%`}`,
          ),
        )
        .orderBy(desc(auditEvent.createdAt))
        .limit(50)
    : [];
  return {
    role,
    project: {
      ...project,
      // Internal link to the inquiry is staff-only.
      leadId: role.staff ? project.leadId : null,
    },
    milestones,
    files,
    approvals,
    invoices: invoices.map(i => ({
      ...i,
      // Who confirmed a payment is internal.
      confirmedBy: role.staff ? i.confirmedBy : null,
      lines: lines.filter(l => l.invoiceId === i.id),
    })),
    members,
    activity,
  };
}

// Projects and members (projects.manage) ---------------------------------------------------------

export async function createProject(
  db: CatalogDb,
  actorId: string,
  access: Access,
  data: Record<string, unknown>,
) {
  if (!has(access, "projects.manage")) throw new ProductStoreError("NOT_ALLOWED");
  const leadId = typeof data.leadId === "string" && data.leadId ? data.leadId : null;
  let fromLead: { name: string; subject: string; projectType: string | null } | undefined;
  if (leadId) {
    // Turning an inquiry into a project also needs permission to see inquiries.
    if (!access.owner && !access.permissions.has("leads.read"))
      throw new ProductStoreError("NOT_ALLOWED");
    [fromLead] = await db
      .select({ name: lead.name, subject: lead.subject, projectType: lead.projectType })
      .from(lead)
      .where(eq(lead.id, leadId))
      .limit(1);
    if (!fromLead) throw new ProductStoreError("NOT_FOUND");
  }
  const id = randomUUID();
  const values = {
    id,
    title: text(data, "title", 120) || fromLead?.subject || "",
    clientName: text(data, "clientName", 120) || fromLead?.name || "",
    projectType: choice(
      data,
      "projectType",
      projectTypes,
      (fromLead?.projectType as (typeof projectTypes)[number]) || "website",
    ),
    status: choice(data, "status", projectStatuses, "planning"),
    summary: text(data, "summary", 2000),
    leadId,
    startDate: date(data, "startDate"),
    targetDate: date(data, "targetDate"),
    createdBy: actorId,
    updatedBy: actorId,
  };
  if (!values.title) throw new ProductInputError("title");
  await db.transaction(async tx => {
    await tx.insert(clientProject).values(values);
    await audit(tx, actorId, "project.create", id, `${id} ${values.title}`);
  });
  return id;
}

export async function updateProject(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  data: Record<string, unknown>,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const set = {
    title: text(data, "title", 120, true),
    clientName: text(data, "clientName", 120),
    projectType: choice(data, "projectType", projectTypes, "website"),
    status: choice(data, "status", projectStatuses),
    summary: text(data, "summary", 2000),
    startDate: date(data, "startDate"),
    targetDate: date(data, "targetDate"),
    updatedBy: actorId,
    updatedAt: new Date(),
  };
  await db.transaction(async tx => {
    await tx.update(clientProject).set(set).where(eq(clientProject.id, projectId));
    await audit(tx, actorId, "project.update", projectId, `${projectId} ${set.status}`);
  });
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Invites a client by email. Returns the one-time accept link token (sent by email, never stored in plain text). */
export async function inviteMember(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  email: unknown,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  if (
    typeof email !== "string" ||
    email.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )
    throw new ProductInputError("email");
  const address = email.trim().toLowerCase();
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 14 * 86_400_000);
  await db.transaction(async tx => {
    await tx
      .insert(clientProjectMember)
      .values({
        id: randomUUID(),
        projectId,
        email: address,
        tokenHash: tokenHash(token),
        expiresAt,
        invitedBy: actorId,
      })
      .onConflictDoUpdate({
        target: [clientProjectMember.projectId, clientProjectMember.email],
        set: { tokenHash: tokenHash(token), expiresAt, invitedBy: actorId },
      });
    await audit(tx, actorId, "project.member.invite", projectId, `${projectId} ${address}`);
  });
  return { token, email: address };
}

export async function removeMember(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  memberId: string,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const gone = await db
    .delete(clientProjectMember)
    .where(and(eq(clientProjectMember.id, memberId), eq(clientProjectMember.projectId, projectId)))
    .returning({ email: clientProjectMember.email });
  if (!gone.length) throw new ProductStoreError("NOT_FOUND");
  await audit(db, actorId, "project.member.remove", projectId, `${projectId} ${gone[0].email}`);
}

/** A signed-in, verified user accepts an invite sent to their own email address. */
export async function acceptInvite(
  db: CatalogDb,
  me: { id: string; email: string; emailVerified: boolean },
  token: string,
) {
  if (!me.emailVerified) throw new ProductStoreError("EMAIL_NOT_VERIFIED");
  if (typeof token !== "string" || token.length < 20 || token.length > 100)
    throw new ProductStoreError("NOT_FOUND");
  const [row] = await db
    .select()
    .from(clientProjectMember)
    .where(eq(clientProjectMember.tokenHash, tokenHash(token)))
    .limit(1);
  if (!row || !row.expiresAt || row.expiresAt < new Date())
    throw new ProductStoreError("NOT_FOUND");
  if (row.email !== me.email.trim().toLowerCase()) throw new ProductStoreError("WRONG_ACCOUNT");
  await db.transaction(async tx => {
    await tx
      .update(clientProjectMember)
      .set({ userId: me.id, acceptedAt: new Date(), tokenHash: null, expiresAt: null })
      .where(eq(clientProjectMember.id, row.id));
    await audit(tx, me.id, "project.member.accept", row.projectId, `${row.projectId} ${row.email}`);
  });
  return row.projectId;
}

/** Client emails of a project (accepted members), for notifications. */
export async function memberEmails(db: CatalogDb, projectId: string) {
  const rows = await db
    .select({ email: clientProjectMember.email })
    .from(clientProjectMember)
    .where(
      and(eq(clientProjectMember.projectId, projectId), isNotNull(clientProjectMember.acceptedAt)),
    );
  return rows.map(r => r.email);
}

// Milestones (projects.manage) -------------------------------------------------------------------

export async function saveMilestone(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  data: Record<string, unknown>,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const values = {
    title: text(data, "title", 160, true),
    description: text(data, "description", 2000),
    dueDate: date(data, "dueDate"),
    status: choice(data, "status", milestoneStatuses, "todo"),
    displayOrder: Number.isInteger(data.displayOrder)
      ? Math.max(0, Math.min(10_000, data.displayOrder as number))
      : 0,
  };
  const id = typeof data.id === "string" && data.id ? data.id : null;
  await db.transaction(async tx => {
    if (id) {
      const done = await tx
        .update(clientProjectMilestone)
        .set({ ...values, updatedAt: new Date() })
        .where(
          and(eq(clientProjectMilestone.id, id), eq(clientProjectMilestone.projectId, projectId)),
        )
        .returning({ id: clientProjectMilestone.id });
      if (!done.length) throw new ProductStoreError("NOT_FOUND");
    } else
      await tx.insert(clientProjectMilestone).values({ id: randomUUID(), projectId, ...values });
    await tx
      .update(clientProject)
      .set({ updatedAt: new Date(), updatedBy: actorId })
      .where(eq(clientProject.id, projectId));
    await audit(
      tx,
      actorId,
      id ? "project.milestone.update" : "project.milestone.create",
      projectId,
      `${projectId} ${values.title} (${values.status})`,
    );
  });
}

export async function deleteMilestone(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  id: string,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const gone = await db
    .delete(clientProjectMilestone)
    .where(and(eq(clientProjectMilestone.id, id), eq(clientProjectMilestone.projectId, projectId)))
    .returning({ title: clientProjectMilestone.title });
  if (!gone.length) throw new ProductStoreError("NOT_FOUND");
  await audit(db, actorId, "project.milestone.delete", projectId, `${projectId} ${gone[0].title}`);
}

// Files (clients and projects.manage) ------------------------------------------------------------

/** Stores an uploaded file. Clients' files are always shared; staff choose shared or staff-only. */
export async function uploadFile(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  file: { name: string; bytes: Buffer },
  visibility: unknown,
) {
  const role = await requireRole(db, projectId, actorId, access, "client");
  if (!file.bytes.length || file.bytes.length > MAX_FILE_BYTES) throw new ProductInputError("file");
  const kind = detectKind(file.bytes);
  if (!kind) throw new ProductInputError("file");
  const [used] = await db
    .select({ n: sql<number>`coalesce(sum(${clientProjectFile.size}), 0)::int` })
    .from(clientProjectFile)
    .where(eq(clientProjectFile.projectId, projectId));
  if (Number(used?.n ?? 0) + file.bytes.length > MAX_PROJECT_BYTES)
    throw new ProductStoreError("PROJECT_FULL");
  const name =
    file.name
      .replace(/[\\/\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 120) || `file.${kind.ext}`;
  const key = await putFile(projectId, file.bytes, kind.ext);
  const id = randomUUID();
  try {
    await db.transaction(async tx => {
      await tx.insert(clientProjectFile).values({
        id,
        projectId,
        name,
        mime: kind.mime,
        size: file.bytes.length,
        storageKey: key,
        visibility: role.manage && visibility === "staff" ? "staff" : "shared",
        uploadedBy: actorId,
      });
      await audit(tx, actorId, "project.file.upload", projectId, `${projectId} ${name}`);
    });
  } catch (error) {
    await removeFile(key);
    throw error;
  }
  return id;
}

/** A file the viewer may download, with its storage key. */
export async function fileForDownload(
  db: CatalogDb,
  userId: string,
  access: Access,
  fileId: string,
) {
  const [row] = await db
    .select()
    .from(clientProjectFile)
    .where(eq(clientProjectFile.id, fileId))
    .limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  const role = await projectRole(db, row.projectId, userId, access);
  if (!role || (!role.staff && row.visibility !== "shared"))
    throw new ProductStoreError("NOT_FOUND");
  return row;
}

export async function deleteFile(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  fileId: string,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const gone = await db
    .delete(clientProjectFile)
    .where(and(eq(clientProjectFile.id, fileId), eq(clientProjectFile.projectId, projectId)))
    .returning({ key: clientProjectFile.storageKey, name: clientProjectFile.name });
  if (!gone.length) throw new ProductStoreError("NOT_FOUND");
  await removeFile(gone[0].key);
  await audit(db, actorId, "project.file.delete", projectId, `${projectId} ${gone[0].name}`);
}

// Approvals ---------------------------------------------------------------------------------------

export async function requestApproval(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  data: Record<string, unknown>,
) {
  await requireRole(db, projectId, actorId, access, "manage");
  const id = randomUUID();
  const milestoneId =
    typeof data.milestoneId === "string" && data.milestoneId ? data.milestoneId : null;
  const fileId = typeof data.fileId === "string" && data.fileId ? data.fileId : null;
  if (milestoneId) {
    const [m] = await db
      .select({ id: clientProjectMilestone.id })
      .from(clientProjectMilestone)
      .where(
        and(
          eq(clientProjectMilestone.id, milestoneId),
          eq(clientProjectMilestone.projectId, projectId),
        ),
      );
    if (!m) throw new ProductInputError("milestoneId");
  }
  if (fileId) {
    const [f] = await db
      .select({ id: clientProjectFile.id })
      .from(clientProjectFile)
      .where(
        and(
          eq(clientProjectFile.id, fileId),
          eq(clientProjectFile.projectId, projectId),
          eq(clientProjectFile.visibility, "shared"),
        ),
      );
    if (!f) throw new ProductInputError("fileId");
  }
  const title = text(data, "title", 160, true);
  await db.transaction(async tx => {
    await tx.insert(clientProjectApproval).values({
      id,
      projectId,
      milestoneId,
      fileId,
      title,
      description: text(data, "description", 2000),
      requestedBy: actorId,
    });
    await audit(tx, actorId, "project.approval.request", projectId, `${projectId} ${title}`);
  });
  return id;
}

/** A client approves or asks for changes. Only open requests can be answered, once. */
export async function decideApproval(
  db: CatalogDb,
  actorId: string,
  access: Access,
  approvalId: string,
  data: Record<string, unknown>,
) {
  const [row] = await db
    .select()
    .from(clientProjectApproval)
    .where(eq(clientProjectApproval.id, approvalId))
    .limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  const role = await requireRole(db, row.projectId, actorId, access, "view");
  if (!role.client) throw new ProductStoreError("NOT_ALLOWED");
  if (row.status !== "requested") throw new ProductStoreError("ALREADY_DECIDED");
  const decision = choice(data, "decision", ["approved", "changes_requested"] as const);
  const comment = text(data, "comment", 2000, decision === "changes_requested");
  await db.transaction(async tx => {
    await tx
      .update(clientProjectApproval)
      .set({ status: decision, clientComment: comment, decidedBy: actorId, decidedAt: new Date() })
      .where(
        and(
          eq(clientProjectApproval.id, approvalId),
          eq(clientProjectApproval.status, "requested"),
        ),
      );
    await audit(
      tx,
      actorId,
      `project.approval.${decision === "approved" ? "approve" : "changes"}`,
      row.projectId,
      `${row.projectId} ${row.title}`,
    );
  });
  return row.projectId;
}

// Invoices (projects.invoices; clients submit payment references) ---------------------------------

const methods = ["bkash", "nagad", "bank"] as const;

function parseLines(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 30)
    throw new ProductInputError("lines");
  return value.map((raw, i) => {
    const l = (raw ?? {}) as Record<string, unknown>;
    const quantity = Number(l.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10_000)
      throw new ProductInputError("lines");
    return {
      description: text(l, "description", 300, true),
      quantity,
      unitPrice: money(l.unitPrice, "lines"),
      displayOrder: i,
    };
  });
}

/** Creates a draft invoice with its lines; the total is computed here, never taken from the browser. */
export async function createInvoice(
  db: CatalogDb,
  actorId: string,
  access: Access,
  projectId: string,
  data: Record<string, unknown>,
) {
  await requireRole(db, projectId, actorId, access, "invoices");
  const lines = parseLines(data.lines);
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  if (total > 100_000_000) throw new ProductInputError("lines");
  const id = randomUUID();
  await db.transaction(async tx => {
    const year = new Date().getFullYear();
    const [row] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(clientInvoice)
      .where(sql`${clientInvoice.number} like ${`INV-${year}-%`}`);
    const number = `INV-${year}-${String(Number(row?.n ?? 0) + 1).padStart(4, "0")}`;
    await tx.insert(clientInvoice).values({
      id,
      projectId,
      number,
      total,
      dueDate: date(data, "dueDate"),
      note: text(data, "note", 1000),
      createdBy: actorId,
    });
    await tx
      .insert(clientInvoiceLine)
      .values(lines.map(l => ({ id: randomUUID(), invoiceId: id, ...l })));
    await audit(
      tx,
      actorId,
      "project.invoice.create",
      projectId,
      `${projectId} ${number} ${total}`,
    );
  });
  return id;
}

async function invoiceRow(db: CatalogDb, invoiceId: string) {
  const [row] = await db
    .select()
    .from(clientInvoice)
    .where(eq(clientInvoice.id, invoiceId))
    .limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  return row;
}

/** Staff actions on an invoice: issue (draft → issued), confirm (payment_submitted → paid),
 * reject (payment_submitted → issued, the reference is cleared) and void (any unpaid → void). */
export async function invoiceAction(
  db: CatalogDb,
  actorId: string,
  access: Access,
  invoiceId: string,
  data: Record<string, unknown>,
) {
  const row = await invoiceRow(db, invoiceId);
  await requireRole(db, row.projectId, actorId, access, "invoices");
  const action = choice(data, "action", ["issue", "confirm", "reject", "void"] as const);
  const from: Record<typeof action, string[]> = {
    issue: ["draft"],
    confirm: ["payment_submitted"],
    reject: ["payment_submitted"],
    void: ["draft", "issued", "payment_submitted"],
  };
  if (!from[action].includes(row.status)) throw new ProductStoreError("INVALID_STATE");
  const now = new Date();
  const set =
    action === "issue"
      ? { status: "issued" as const, issueDate: now.toISOString().slice(0, 10) }
      : action === "confirm"
        ? { status: "paid" as const, confirmedBy: actorId, confirmedAt: now }
        : action === "reject"
          ? {
              status: "issued" as const,
              paymentMethod: null,
              paymentReference: null,
              paymentSubmittedAt: null,
              paymentSubmittedBy: null,
            }
          : { status: "void" as const, voidReason: text(data, "reason", 300, true) };
  await db.transaction(async tx => {
    await tx
      .update(clientInvoice)
      .set({ ...set, updatedAt: now })
      .where(and(eq(clientInvoice.id, invoiceId), eq(clientInvoice.status, row.status)));
    await audit(
      tx,
      actorId,
      `project.invoice.${action}`,
      row.projectId,
      `${row.projectId} ${row.number}`,
    );
  });
  return { projectId: row.projectId, number: row.number, total: row.total, action };
}

/** A client reports a manual payment (bKash, Nagad or bank) with its reference; staff confirm it. */
export async function submitPayment(
  db: CatalogDb,
  actorId: string,
  access: Access,
  invoiceId: string,
  data: Record<string, unknown>,
) {
  const row = await invoiceRow(db, invoiceId);
  const role = await requireRole(db, row.projectId, actorId, access, "view");
  if (!role.client) throw new ProductStoreError("NOT_ALLOWED");
  if (row.status !== "issued") throw new ProductStoreError("INVALID_STATE");
  const method = choice(data, "method", methods);
  const reference = text(data, "reference", 40, true);
  if (!/^[A-Za-z0-9-]{4,40}$/.test(reference)) throw new ProductInputError("reference");
  await db.transaction(async tx => {
    await tx
      .update(clientInvoice)
      .set({
        status: "payment_submitted",
        paymentMethod: method,
        paymentReference: reference,
        paymentSubmittedBy: actorId,
        paymentSubmittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(clientInvoice.id, invoiceId), eq(clientInvoice.status, "issued")));
    await audit(
      tx,
      actorId,
      "project.invoice.payment",
      row.projectId,
      `${row.projectId} ${row.number} ${method}`,
    );
  });
  return { projectId: row.projectId, number: row.number };
}
