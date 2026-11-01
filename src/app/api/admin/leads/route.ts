import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { ProductInputError } from "@/lib/product-input";
import {
  addLeadNote,
  assignLead,
  listLeads,
  setLeadStatus,
  type LeadStatus,
} from "@/lib/lead-store";
import { catalogDb } from "@/lib/store-products";
import { notifyLeadAssigned } from "@/lib/order-notify";
import { cleanReply, replyToLead } from "@/lib/lead-reply";
import { sendMail } from "@/lib/mailer";
export const runtime = "nodejs";

const respond = async () =>
  Response.json({ leads: await listLeads(catalogDb()) }, { headers: noStore });
// Status ({ id, status }), assignment ({ id, assignedTo }), a note ({ id, note }) or an email reply
// ({ id, reply: { subject, greeting, body, signoff } }). Requires leads.manage.
export const PATCH = adminHandler("leads.manage", async (actor, data) => {
  const id = requireUuid(data.id);
  if ("status" in data) {
    if (typeof data.status !== "string") throw new ProductInputError("status");
    await setLeadStatus(catalogDb(), actor, id, data.status as LeadStatus);
  } else if ("assignedTo" in data) {
    if (
      data.assignedTo !== null &&
      (typeof data.assignedTo !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(data.assignedTo))
    )
      throw new ProductInputError("assignedTo");
    const assignee = data.assignedTo;
    const changed = await assignLead(catalogDb(), actor, id, assignee);
    // The email never blocks or undoes the assignment.
    if (changed && assignee)
      await notifyLeadAssigned(catalogDb(), id, assignee, actor).catch(() =>
        console.error("Lead assignment email failed"),
      );
  } else if ("note" in data) {
    if (typeof data.note !== "string") throw new ProductInputError("note");
    await addLeadNote(catalogDb(), actor, id, data.note);
  } else if ("reply" in data) {
    await replyToLead(catalogDb(), actor, id, cleanReply(data.reply), (to, subject, text, html) =>
      sendMail(to, subject, text, html),
    );
  } else throw new ProductInputError("action");
  return respond();
});
