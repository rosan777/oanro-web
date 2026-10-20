import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "./access";
import { claimInvite, getAccess } from "./rbac";
import { catalogDb } from "./store-products";
import type { Permission } from "./permissions";
import { needsTwoFactorSetup } from "./two-factor-policy";
/**
 * For admin pages: sign-in redirect when signed out; 404 for anyone without the needed permission
 * (or with no admin access at all). Claims a pending staff invite on first visit.
 */
export async function requireAdminPage(permission?: Permission | Permission[]) {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) notFound();
  const db = catalogDb();
  await claimInvite(db, session.user);
  const access = await getAccess(db, session.user.id);
  const needed = permission === undefined ? null : Array.isArray(permission) ? permission : [permission];
  if (needed ? !needed.some(p => access.permissions.has(p)) : access.permissions.size === 0) notFound();
  // Owner requires two-step verification for staff: send them to set it up first.
  if (await needsTwoFactorSetup(db, session.user.id, access.owner)) redirect("/account?security=required");
  return { session, access };
}
