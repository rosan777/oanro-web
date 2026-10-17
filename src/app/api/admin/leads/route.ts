import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { ProductInputError } from "@/lib/product-input";
import { addLeadNote, assignLead, listLeads, setLeadStatus, type LeadStatus } from "@/lib/lead-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const respond = async () => Response.json({ leads: await listLeads(catalogDb()) }, { headers: noStore });
// Status ({ id, status }), assignment ({ id, assignedTo }) or a note ({ id, note }). Requires leads.manage.
export const PATCH = adminHandler("leads.manage", async (actor, data) => {
  const id = requireUuid(data.id);
  if ("status" in data) { if (typeof data.status !== "string") throw new ProductInputError("status"); await setLeadStatus(catalogDb(), actor, id, data.status as LeadStatus); }
  else if ("assignedTo" in data) { if (data.assignedTo !== null && (typeof data.assignedTo !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(data.assignedTo))) throw new ProductInputError("assignedTo"); await assignLead(catalogDb(), actor, id, data.assignedTo); }
  else if ("note" in data) { if (typeof data.note !== "string") throw new ProductInputError("note"); await addLeadNote(catalogDb(), actor, id, data.note); }
  else throw new ProductInputError("action");
  return respond();
});
