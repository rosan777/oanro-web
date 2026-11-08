// Client Workspace: who may see and change projects, invite acceptance, file rules, approvals and the
// invoice state machine. Also checks that the new project permissions joined no existing role template.

import { test } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/lib/db/schema";
import { ProductStoreError, type CatalogDb } from "../src/lib/product-store";
import { ProductInputError } from "../src/lib/product-input";
import { roleTemplates, type Permission } from "../src/lib/permissions";
import type { Access } from "../src/lib/rbac";
import {
  acceptInvite,
  createInvoice,
  createProject,
  decideApproval,
  fileForDownload,
  getProject,
  invoiceAction,
  inviteMember,
  listClientInvoices,
  listClientProjects,
  requestApproval,
  saveMilestone,
  submitPayment,
  uploadFile,
} from "../src/lib/workspace-store";

const access = (...p: Permission[]): Access => ({ owner: false, permissions: new Set(p) });
const owner: Access = { owner: true, permissions: new Set() };
const none = access();
const storeError = (code: string) => (e: unknown) =>
  e instanceof ProductStoreError && e.message === code;
const inputError = (field: string) => (e: unknown) =>
  e instanceof ProductInputError && e.field === field;
const PDF = Buffer.from("%PDF-1.4\n% test\n");
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);

test("project permissions are not part of any existing role template", () => {
  for (const t of roleTemplates)
    for (const p of ["projects.read", "projects.manage", "projects.invoices"])
      assert.ok(!t.permissions.includes(p as Permission), `${t.id} must not include ${p}`);
});

test("workspace: access by permission and membership, approvals, files and invoices", async () => {
  process.env.OANRO_FILE_STORAGE = "local";
  delete process.env.VERCEL;
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  const created: string[] = [];
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([
      { id: "boss", name: "Owner", email: "boss@x.test", emailVerified: true },
      { id: "pm", name: "PM", email: "pm@x.test", emailVerified: true },
      { id: "acct", name: "Accounts", email: "acct@x.test", emailVerified: true },
      { id: "viewer", name: "Viewer", email: "viewer@x.test", emailVerified: true },
      { id: "client", name: "Client", email: "client@x.test", emailVerified: true },
      { id: "other", name: "Other", email: "other@x.test", emailVerified: true },
    ]);
    const pm = access("projects.manage", "leads.read");
    const acct = access("projects.invoices");
    const viewer = access("projects.read");

    // Only projects.manage creates; converting an inquiry also needs leads.read.
    await assert.rejects(
      createProject(db, "acct", acct, { title: "X" }),
      storeError("NOT_ALLOWED"),
    );
    await assert.rejects(
      createProject(db, "other", none, { title: "X" }),
      storeError("NOT_ALLOWED"),
    );
    await assert.rejects(createProject(db, "pm", pm, { title: "" }), inputError("title"));
    const id = await createProject(db, "pm", pm, {
      title: "Shop redesign",
      clientName: "Acme",
      projectType: "ecommerce",
    });
    created.push(id);

    // Nobody outside sees it; staff with any project permission do.
    await assert.rejects(getProject(db, id, "other", none), storeError("NOT_FOUND"));
    assert.equal((await getProject(db, id, "viewer", viewer)).project.title, "Shop redesign");
    await assert.rejects(
      saveMilestone(db, "viewer", viewer, id, { title: "M1" }),
      storeError("NOT_ALLOWED"),
    );
    await saveMilestone(db, "pm", pm, id, { title: "Discovery", status: "done" });

    // Invite: only the invited, verified address can accept, once.
    const invite = await inviteMember(db, "pm", pm, id, "Client@X.test");
    await assert.rejects(
      acceptInvite(db, { id: "other", email: "other@x.test", emailVerified: true }, invite.token),
      storeError("WRONG_ACCOUNT"),
    );
    await assert.rejects(
      acceptInvite(
        db,
        { id: "client", email: "client@x.test", emailVerified: false },
        invite.token,
      ),
      storeError("EMAIL_NOT_VERIFIED"),
    );
    assert.equal(
      await acceptInvite(
        db,
        { id: "client", email: "client@x.test", emailVerified: true },
        invite.token,
      ),
      id,
    );
    await assert.rejects(
      acceptInvite(db, { id: "client", email: "client@x.test", emailVerified: true }, invite.token),
      storeError("NOT_FOUND"),
    );
    assert.deepEqual(
      (await listClientProjects(db, "client")).map(p => p.id),
      [id],
    );
    assert.equal((await listClientProjects(db, "other")).length, 0);

    // Client view hides staff-only data.
    const clientView = await getProject(db, id, "client", none);
    assert.equal(clientView.role.client, true);
    assert.equal(clientView.members.length, 0);
    assert.equal(clientView.activity.length, 0);

    // Files: allowed kinds only; clients' files are always shared; staff-only files stay hidden from clients.
    await assert.rejects(
      uploadFile(db, "client", none, id, { name: "a.exe", bytes: Buffer.from("MZ....") }, "shared"),
      inputError("file"),
    );
    const shared = await uploadFile(
      db,
      "client",
      none,
      id,
      { name: "brief.pdf", bytes: PDF },
      "staff",
    );
    const secret = await uploadFile(
      db,
      "pm",
      pm,
      id,
      { name: "internal.png", bytes: PNG },
      "staff",
    );
    assert.equal((await fileForDownload(db, "client", none, shared)).visibility, "shared");
    await assert.rejects(fileForDownload(db, "client", none, secret), storeError("NOT_FOUND"));
    await assert.rejects(fileForDownload(db, "other", none, shared), storeError("NOT_FOUND"));
    assert.equal((await fileForDownload(db, "viewer", viewer, secret)).visibility, "staff");
    for (const f of await db.select().from(schema.clientProjectFile)) created.push(f.storageKey);

    // Approvals: staff request, only a client answers, once; changes need a comment.
    await requestApproval(db, "pm", pm, id, { title: "Homepage design" });
    const [approval] = await db.select().from(schema.clientProjectApproval);
    await assert.rejects(
      decideApproval(db, "pm", pm, approval.id, { decision: "approved" }),
      storeError("NOT_ALLOWED"),
    );
    await assert.rejects(
      decideApproval(db, "client", none, approval.id, { decision: "changes_requested" }),
      inputError("comment"),
    );
    await decideApproval(db, "client", none, approval.id, { decision: "approved" });
    await assert.rejects(
      decideApproval(db, "client", none, approval.id, { decision: "approved" }),
      storeError("ALREADY_DECIDED"),
    );

    // Invoices: total computed on the server; drafts hidden from clients; strict state machine.
    await assert.rejects(
      createInvoice(db, "pm", pm, id, {
        lines: [{ description: "Design", quantity: 1, unitPrice: 1000 }],
      }),
      storeError("NOT_ALLOWED"),
    );
    const inv = await createInvoice(db, "acct", acct, id, {
      lines: [
        { description: "Design", quantity: 2, unitPrice: 15000 },
        { description: "Build", quantity: 1, unitPrice: 40000 },
      ],
      total: 1,
    });
    const [row] = await db.select().from(schema.clientInvoice);
    assert.equal(row.total, 70000);
    assert.match(row.number, /^INV-\d{4}-0001$/);
    assert.equal((await listClientInvoices(db, "client")).length, 0, "draft hidden");
    await assert.rejects(
      submitPayment(db, "client", none, inv, { method: "bkash", reference: "ABC123" }),
      storeError("INVALID_STATE"),
    );
    await invoiceAction(db, "acct", acct, inv, { action: "issue" });
    assert.equal((await listClientInvoices(db, "client")).length, 1);
    await assert.rejects(
      submitPayment(db, "client", none, inv, { method: "card", reference: "ABC123" }),
      inputError("method"),
    );
    await submitPayment(db, "client", none, inv, { method: "bkash", reference: "TRX12345" });
    await assert.rejects(
      invoiceAction(db, "acct", acct, inv, { action: "issue" }),
      storeError("INVALID_STATE"),
    );
    await assert.rejects(
      invoiceAction(db, "pm", pm, inv, { action: "confirm" }),
      storeError("NOT_ALLOWED"),
    );
    await invoiceAction(db, "acct", acct, inv, { action: "confirm" });
    const [paid] = await db.select().from(schema.clientInvoice);
    assert.equal(paid.status, "paid");
    assert.equal(paid.confirmedBy, "acct");
    await assert.rejects(
      invoiceAction(db, "acct", acct, inv, { action: "void", reason: "x" }),
      storeError("INVALID_STATE"),
    );

    // The owner can do everything; every change left an activity-log entry.
    assert.equal((await getProject(db, id, "boss", owner)).role.invoices, true);
    const log = await db.select({ action: schema.auditEvent.action }).from(schema.auditEvent);
    for (const a of [
      "project.create",
      "project.member.accept",
      "project.file.upload",
      "project.approval.approve",
      "project.invoice.confirm",
    ])
      assert.ok(
        log.some(l => l.action === a),
        a,
      );
  } finally {
    await pg.close();
    for (const key of created.filter(k => k.includes("/")))
      await rm(path.join(process.cwd(), ".local-storage", "workspace", key), { force: true });
  }
});
