import { adminHandler, noStore } from "@/lib/admin-api";
import { ProductInputError } from "@/lib/product-input";
import { createInvite, createRole, deleteRole, getStaffOverview, memberIsStaffAdmin, revokeInvite, roleGrantsStaffAdmin, setRolePermissions, setStaffActive, setStaffRole, type Access } from "@/lib/rbac";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const id = (value: unknown, field: string) => { if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new ProductInputError(field); return value; };
const text = (value: unknown, field: string) => { if (typeof value !== "string") throw new ProductInputError(field); return value; };
/**
 * Staff-admin power stays with the owner: only the owner edits role definitions, grants a role that
 * includes staff.manage, or changes someone who already holds it. Prevents self- or peer-escalation.
 */
function ownerOnly(access: Access) { if (!access.owner) throw new ProductStoreError("OWNER_ONLY"); }
async function guardRole(access: Access, roleId: string) { if (!access.owner && await roleGrantsStaffAdmin(catalogDb(), roleId)) throw new ProductStoreError("OWNER_ONLY"); }
async function guardMember(access: Access, userId: string) { if (!access.owner && await memberIsStaffAdmin(catalogDb(), userId)) throw new ProductStoreError("OWNER_ONLY"); }
const respond = async () => Response.json(await getStaffOverview(catalogDb()), { headers: noStore });
// Invite staff or create a role.
export const POST = adminHandler("staff.manage", async (actor, data, access) => {
  if (data.action === "invite") { await guardRole(access, id(data.roleId, "roleId")); }
  if (data.action === "role-create") ownerOnly(access);
  if (data.action === "invite") await createInvite(catalogDb(), actor, text(data.email, "email"), id(data.roleId, "roleId"));
  else if (data.action === "role-create") await createRole(catalogDb(), actor, text(data.name, "name"), typeof data.description === "string" ? data.description : "", data.permissions);
  else throw new ProductInputError("action");
  return respond();
});
// Change a member's role or active state, or a role's permissions.
export const PATCH = adminHandler("staff.manage", async (actor, data, access) => {
  if (data.action === "role-permissions") ownerOnly(access);
  if (data.action === "role" || data.action === "active") await guardMember(access, id(data.userId, "userId"));
  if (data.action === "role") await guardRole(access, id(data.roleId, "roleId"));
  if (data.action === "role") await setStaffRole(catalogDb(), actor, id(data.userId, "userId"), id(data.roleId, "roleId"));
  else if (data.action === "active") { if (typeof data.active !== "boolean") throw new ProductInputError("active"); await setStaffActive(catalogDb(), actor, id(data.userId, "userId"), data.active); }
  else if (data.action === "role-permissions") await setRolePermissions(catalogDb(), actor, id(data.roleId, "roleId"), data.permissions);
  else throw new ProductInputError("action");
  return respond();
});
// Revoke an invite or delete an unused custom role.
export const DELETE = adminHandler("staff.manage", async (actor, data, access) => {
  if (data.action === "role") ownerOnly(access);
  if (data.action === "invite") await revokeInvite(catalogDb(), actor, id(data.id, "id"));
  else if (data.action === "role") await deleteRole(catalogDb(), actor, id(data.roleId, "roleId"));
  else throw new ProductInputError("action");
  return respond();
});
