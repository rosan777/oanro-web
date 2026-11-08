// Workspace emails. Clients hear about invites, approval requests, issued invoices and confirmed
// payments; the owner and project staff hear when a client answers an approval or reports a payment.
// Like order emails, failures never break the action (sendMail swallows and logs them).

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { clientProject, rolePermission, staffMember, systemOwner, user } from "./db/schema";
import { sendMail } from "./mailer";
import { layout } from "./order-notify";
import { siteUrl } from "./site-url";
import type { CatalogDb } from "./product-store";
import { memberEmails } from "./workspace-store";

const tk = (n: number) => `৳${n.toLocaleString("en-US")}`;

async function projectTitle(db: CatalogDb, projectId: string) {
  const [p] = await db
    .select({ title: clientProject.title })
    .from(clientProject)
    .where(eq(clientProject.id, projectId))
    .limit(1);
  return p?.title ?? "your project";
}

/** The owner plus active staff with the given project permission. */
async function projectStaffEmails(
  db: CatalogDb,
  permission: "projects.manage" | "projects.invoices",
) {
  const [owner] = await db
    .select({ email: user.email })
    .from(systemOwner)
    .innerJoin(user, eq(user.id, systemOwner.userId))
    .limit(1);
  const rows = await db
    .select({ email: user.email })
    .from(staffMember)
    .innerJoin(user, eq(user.id, staffMember.userId))
    .innerJoin(rolePermission, eq(rolePermission.roleId, staffMember.roleId))
    .where(and(eq(staffMember.status, "active"), inArray(rolePermission.permission, [permission])));
  return [...(owner ? [owner.email] : []), ...rows.map(r => r.email)];
}

export async function notifyInvite(db: CatalogDb, projectId: string, email: string, token: string) {
  const title = await projectTitle(db, projectId);
  const link = `${siteUrl()}/workspace/accept?token=${encodeURIComponent(token)}`;
  const text = [
    `You have been invited to follow "${title}" in your OANRO workspace.`,
    "Sign in (or create an account) with this email address, then open the link below. The link works for 14 days.",
  ];
  await sendMail(
    email,
    `OANRO workspace: ${title}`,
    `${text.join("\n\n")}\n\n${link}`,
    layout("Your project workspace", text, { label: "Open the workspace", href: link }),
  );
}

async function toClients(db: CatalogDb, projectId: string, subject: string, paragraphs: string[]) {
  const to = await memberEmails(db, projectId);
  if (!to.length) return;
  const link = `${siteUrl()}/workspace/${projectId}`;
  await sendMail(
    to,
    subject,
    `${paragraphs.join("\n\n")}\n\n${link}`,
    layout(subject, paragraphs, { label: "Open the workspace", href: link }),
  );
}

async function toStaff(
  db: CatalogDb,
  projectId: string,
  permission: "projects.manage" | "projects.invoices",
  subject: string,
  paragraphs: string[],
) {
  const to = await projectStaffEmails(db, permission);
  const link = `${siteUrl()}/admin/projects/${projectId}`;
  await sendMail(
    to,
    subject,
    `${paragraphs.join("\n\n")}\n\n${link}`,
    layout(subject, paragraphs, { label: "Open the project", href: link }),
  );
}

export async function notifyApprovalRequested(
  db: CatalogDb,
  projectId: string,
  approvalTitle: string,
) {
  const title = await projectTitle(db, projectId);
  await toClients(db, projectId, `Approval requested: ${approvalTitle}`, [
    `OANRO asks for your approval on "${approvalTitle}" in "${title}".`,
    "Open the workspace to approve it or ask for changes.",
  ]);
}

export async function notifyApprovalDecided(
  db: CatalogDb,
  projectId: string,
  approvalTitle: string,
  approved: boolean,
) {
  const title = await projectTitle(db, projectId);
  await toStaff(
    db,
    projectId,
    "projects.manage",
    `${approved ? "Approved" : "Changes requested"}: ${approvalTitle}`,
    [
      `The client ${approved ? "approved" : "asked for changes to"} "${approvalTitle}" in "${title}".`,
    ],
  );
}

export async function notifyInvoice(
  db: CatalogDb,
  projectId: string,
  number: string,
  total: number,
  action: string,
) {
  const title = await projectTitle(db, projectId);
  if (action === "issue")
    await toClients(db, projectId, `Invoice ${number} for ${title}`, [
      `Invoice ${number} (${tk(total)}) for "${title}" is ready in your workspace.`,
      "Pay by bKash, Nagad or bank transfer as agreed, then enter the transaction reference on the invoice so we can confirm it.",
    ]);
  if (action === "confirm")
    await toClients(db, projectId, `Payment confirmed: ${number}`, [
      `We have confirmed your payment for invoice ${number} (${tk(total)}). Thank you.`,
    ]);
  if (action === "reject")
    await toClients(db, projectId, `Payment not confirmed: ${number}`, [
      `We could not confirm the payment reference for invoice ${number}. Please check it and submit it again, or contact us.`,
    ]);
}

export async function notifyPaymentSubmitted(db: CatalogDb, projectId: string, number: string) {
  const title = await projectTitle(db, projectId);
  await toStaff(db, projectId, "projects.invoices", `Payment reported: ${number}`, [
    `The client reported a payment for invoice ${number} in "${title}". Check the reference before confirming it.`,
  ]);
}
