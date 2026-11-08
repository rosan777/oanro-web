// Shared plumbing for Workspace APIs used by clients and staff: the signed-in viewer with their access,
// and one mapping of store errors to HTTP codes (unknown project or no access → 404, never a hint).

import "server-only";
import { accountSession } from "./account-api";
import { noStore } from "./admin-api";
import { ProductInputError } from "./product-input";
import { ProductStoreError } from "./product-store";
import { claimInvite, getAccess, type Access } from "./rbac";
import { catalogDb } from "./store-products";
import { needsTwoFactorSetup } from "./two-factor-policy";

export const idOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);

export async function workspaceViewer(request: Request, write: boolean) {
  const auth = await accountSession(request, { write });
  if ("response" in auth) return auth;
  const db = catalogDb();
  await claimInvite(db, auth.session.user).catch(() => false);
  let access: Access = await getAccess(db, auth.session.user.id);
  // Staff who still have to set up two-step verification act as plain clients until they do.
  if (
    (access.owner || access.permissions.size) &&
    (await needsTwoFactorSetup(db, auth.session.user.id, access.owner))
  )
    access = { owner: false, permissions: new Set() };
  return { userId: auth.session.user.id, user: auth.session.user, access, db };
}

export function workspaceError(error: unknown) {
  if (error instanceof ProductInputError)
    return Response.json(
      { error: "INVALID_INPUT", field: error.field },
      { status: 400, headers: noStore },
    );
  if (error instanceof ProductStoreError) {
    const status =
      error.message === "NOT_FOUND" ? 404 : error.message === "NOT_ALLOWED" ? 403 : 409;
    return Response.json({ error: error.message }, { status, headers: noStore });
  }
  if (error instanceof Error && error.message === "STORAGE_UNAVAILABLE")
    return Response.json({ error: "STORAGE_UNAVAILABLE" }, { status: 503, headers: noStore });
  return Response.json({ error: "UPDATE_FAILED" }, { status: 503, headers: noStore });
}
