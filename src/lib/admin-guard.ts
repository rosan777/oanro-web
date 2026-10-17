import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentSession } from "./access";
import { claimInvite, getAccess } from "./rbac";
import { catalogDb } from "./store-products";
import type { Permission } from "./permissions";
/**
 * For admin pages: sign-in redirect when signed out; 404 for anyone without the needed permission
 * (or with no admin access at all). Claims a pending staff invite on first visit.
 */
export async function requireAdminPage(permission?: Permission) {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified) notFound();
  const db = catalogDb();
  await claimInvite(db, session.user);
  const access = await getAccess(db, session.user.id);
  if (permission ? !access.permissions.has(permission) : access.permissions.size === 0) notFound();
  return { session, access };
}
