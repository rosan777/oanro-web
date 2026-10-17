// Role-based access control: permission lookup, invite claiming and staff/role management.
// Takes a Drizzle database so routes (node-postgres) and tests (PGlite) share the same code.
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, gt, inArray, isNull } from "drizzle-orm";
import { auditEvent, role, rolePermission, session, staffInvite, staffMember, systemOwner, user } from "./db/schema";
import { permissions, type Permission } from "./permissions";
import { ProductStoreError, type CatalogDb } from "./product-store";

export type Access = { owner: boolean; permissions: Set<Permission> };
const none: Access = { owner: false, permissions: new Set() };
const audit = (db: Pick<CatalogDb, "insert">, actorId: string, action: string, targetId: string, reason: string) =>
  db.insert(auditEvent).values({ id: randomUUID(), actorId, action, targetId, reason: reason.slice(0, 300) });

/** Deny by default: the owner gets everything, an active staff member gets their role's permissions, anyone else nothing. */
export async function getAccess(db: CatalogDb, userId: string): Promise<Access> {
  const [owner] = await db.select({ id: systemOwner.userId }).from(systemOwner).where(eq(systemOwner.userId, userId)).limit(1);
  if (owner) return { owner: true, permissions: new Set(permissions) };
  const rows = await db.select({ permission: rolePermission.permission }).from(staffMember)
    .innerJoin(rolePermission, eq(rolePermission.roleId, staffMember.roleId))
    .where(and(eq(staffMember.userId, userId), eq(staffMember.status, "active")));
  if (!rows.length) return none;
  return { owner: false, permissions: new Set(rows.map(r => r.permission).filter((p): p is Permission => (permissions as readonly string[]).includes(p))) };
}
/** When a verified user signs in with an invited email, they become staff with the invited role. */
export async function claimInvite(db: CatalogDb, u: { id: string; email: string; emailVerified: boolean }) {
  if (!u.emailVerified) return false;
  const email = u.email.trim().toLowerCase();
  return db.transaction(async tx => {
    const [existing] = await tx.select({ id: staffMember.userId }).from(staffMember).where(eq(staffMember.userId, u.id)).limit(1);
    const [owner] = await tx.select({ id: systemOwner.userId }).from(systemOwner).where(eq(systemOwner.userId, u.id)).limit(1);
    if (existing || owner) return false;
    const [invite] = await tx.select().from(staffInvite).where(and(eq(staffInvite.email, email), isNull(staffInvite.acceptedAt), isNull(staffInvite.revokedAt), gt(staffInvite.expiresAt, new Date()))).orderBy(asc(staffInvite.createdAt)).limit(1);
    if (!invite) return false;
    await tx.insert(staffMember).values({ userId: u.id, roleId: invite.roleId, invitedBy: invite.invitedBy });
    await tx.update(staffInvite).set({ acceptedAt: new Date(), acceptedBy: u.id }).where(eq(staffInvite.id, invite.id));
    await audit(tx, u.id, "staff.join", u.id, `accepted invite ${invite.id} as ${invite.roleId}`);
    return true;
  });
}

// ---- Management (requires staff.manage, enforced by the API layer) ----
/** True when the role grants staff.manage. Used to keep staff-admin power owner-controlled. */
export async function roleGrantsStaffAdmin(db: CatalogDb, roleId: string) {
  const [row] = await db.select({ roleId: rolePermission.roleId }).from(rolePermission).where(and(eq(rolePermission.roleId, roleId), eq(rolePermission.permission, "staff.manage"))).limit(1);
  return Boolean(row);
}
/** True when this staff member currently holds staff.manage through their role. */
export async function memberIsStaffAdmin(db: CatalogDb, userId: string) {
  const [row] = await db.select({ roleId: staffMember.roleId }).from(staffMember).where(eq(staffMember.userId, userId)).limit(1);
  return row ? roleGrantsStaffAdmin(db, row.roleId) : false;
}
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
async function roleExists(db: CatalogDb, roleId: string) {
  const [r] = await db.select({ id: role.id }).from(role).where(eq(role.id, roleId)).limit(1);
  if (!r) throw new ProductStoreError("ROLE_NOT_FOUND");
}
export async function createInvite(db: CatalogDb, actorId: string, rawEmail: string, roleId: string) {
  const email = rawEmail.trim().toLowerCase();
  if (!emailPattern.test(email) || email.length > 200) throw new ProductStoreError("INVALID_EMAIL");
  await roleExists(db, roleId);
  const [member] = await db.select({ id: user.id }).from(user).innerJoin(staffMember, eq(staffMember.userId, user.id)).where(eq(user.email, email)).limit(1);
  const [owner] = await db.select({ id: user.id }).from(user).innerJoin(systemOwner, eq(systemOwner.userId, user.id)).where(eq(user.email, email)).limit(1);
  if (member || owner) throw new ProductStoreError("ALREADY_STAFF");
  const id = randomUUID();
  await db.transaction(async tx => {
    // One pending invite per email: a new invite replaces the old one.
    await tx.update(staffInvite).set({ revokedAt: new Date() }).where(and(eq(staffInvite.email, email), isNull(staffInvite.acceptedAt), isNull(staffInvite.revokedAt)));
    await tx.insert(staffInvite).values({ id, email, roleId, invitedBy: actorId, expiresAt: new Date(Date.now() + 14 * 864e5) });
    await audit(tx, actorId, "staff.invite", id, `${email} as ${roleId}`);
  });
  return id;
}
export async function revokeInvite(db: CatalogDb, actorId: string, id: string) {
  await db.transaction(async tx => {
    const done = await tx.update(staffInvite).set({ revokedAt: new Date() }).where(and(eq(staffInvite.id, id), isNull(staffInvite.acceptedAt), isNull(staffInvite.revokedAt))).returning({ email: staffInvite.email });
    if (!done.length) throw new ProductStoreError("NOT_FOUND");
    await audit(tx, actorId, "staff.invite-revoke", id, done[0].email);
  });
}
async function requireStaff(db: CatalogDb, actorId: string, userId: string) {
  if (userId === actorId) throw new ProductStoreError("SELF_CHANGE"); // nobody can change their own access
  const [m] = await db.select().from(staffMember).where(eq(staffMember.userId, userId)).limit(1);
  if (!m) throw new ProductStoreError("NOT_FOUND"); // the owner is never a staff row, so the owner can't be targeted
  return m;
}
export async function setStaffRole(db: CatalogDb, actorId: string, userId: string, roleId: string) {
  const m = await requireStaff(db, actorId, userId); await roleExists(db, roleId);
  if (m.roleId === roleId) return;
  await db.transaction(async tx => {
    await tx.update(staffMember).set({ roleId, updatedAt: new Date() }).where(eq(staffMember.userId, userId));
    await audit(tx, actorId, "staff.role", userId, `${m.roleId} -> ${roleId}`);
  });
}
/** Deactivating signs the person out everywhere immediately (their sessions are deleted). */
export async function setStaffActive(db: CatalogDb, actorId: string, userId: string, active: boolean) {
  const m = await requireStaff(db, actorId, userId);
  if ((m.status === "active") === active) return;
  await db.transaction(async tx => {
    await tx.update(staffMember).set({ status: active ? "active" : "deactivated", deactivatedAt: active ? null : new Date(), updatedAt: new Date() }).where(eq(staffMember.userId, userId));
    if (!active) await tx.delete(session).where(eq(session.userId, userId));
    await audit(tx, actorId, active ? "staff.reactivate" : "staff.deactivate", userId, active ? "reactivated" : "deactivated; sessions revoked");
  });
}
function cleanPermissions(list: unknown): Permission[] {
  if (!Array.isArray(list) || list.some(p => !(permissions as readonly unknown[]).includes(p))) throw new ProductStoreError("INVALID_PERMISSIONS");
  return [...new Set(list as Permission[])];
}
export async function createRole(db: CatalogDb, actorId: string, name: string, description: string, perms: unknown) {
  const clean = name.trim(); if (!clean || clean.length > 40 || description.length > 200) throw new ProductStoreError("INVALID_ROLE");
  const list = cleanPermissions(perms);
  const id = `role-${randomUUID().slice(0, 8)}`;
  await db.transaction(async tx => {
    await tx.insert(role).values({ id, name: clean, description: description.trim() });
    if (list.length) await tx.insert(rolePermission).values(list.map(permission => ({ roleId: id, permission })));
    await audit(tx, actorId, "role.create", id, `${clean}: ${list.join(",")}`);
  });
  return id;
}
export async function setRolePermissions(db: CatalogDb, actorId: string, roleId: string, perms: unknown) {
  await roleExists(db, roleId); const list = cleanPermissions(perms);
  await db.transaction(async tx => {
    await tx.delete(rolePermission).where(eq(rolePermission.roleId, roleId));
    if (list.length) await tx.insert(rolePermission).values(list.map(permission => ({ roleId, permission })));
    await tx.update(role).set({ updatedAt: new Date() }).where(eq(role.id, roleId));
    await audit(tx, actorId, "role.permissions", roleId, list.join(",") || "(none)");
  });
}
export async function deleteRole(db: CatalogDb, actorId: string, roleId: string) {
  const [r] = await db.select().from(role).where(eq(role.id, roleId)).limit(1);
  if (!r) throw new ProductStoreError("NOT_FOUND");
  if (r.builtIn) throw new ProductStoreError("BUILT_IN");
  const [used] = await db.select({ n: count() }).from(staffMember).where(eq(staffMember.roleId, roleId));
  const [invited] = await db.select({ n: count() }).from(staffInvite).where(and(eq(staffInvite.roleId, roleId), isNull(staffInvite.acceptedAt), isNull(staffInvite.revokedAt)));
  if (Number(used.n) + Number(invited.n) > 0) throw new ProductStoreError("ROLE_IN_USE");
  await db.transaction(async tx => { await tx.delete(role).where(eq(role.id, roleId)); await audit(tx, actorId, "role.delete", roleId, r.name); });
}
export type StaffOverview = Awaited<ReturnType<typeof getStaffOverview>>;
export async function getStaffOverview(db: CatalogDb) {
  const roles = await db.select().from(role).orderBy(asc(role.builtIn), asc(role.name));
  const perms = roles.length ? await db.select().from(rolePermission).where(inArray(rolePermission.roleId, roles.map(r => r.id))) : [];
  const staff = await db.select({ userId: staffMember.userId, name: user.name, email: user.email, roleId: staffMember.roleId, status: staffMember.status, since: staffMember.createdAt })
    .from(staffMember).innerJoin(user, eq(user.id, staffMember.userId)).orderBy(asc(user.name));
  const invites = await db.select({ id: staffInvite.id, email: staffInvite.email, roleId: staffInvite.roleId, expiresAt: staffInvite.expiresAt }).from(staffInvite)
    .where(and(isNull(staffInvite.acceptedAt), isNull(staffInvite.revokedAt), gt(staffInvite.expiresAt, new Date()))).orderBy(asc(staffInvite.createdAt));
  const [owner] = await db.select({ name: user.name, email: user.email }).from(systemOwner).innerJoin(user, eq(user.id, systemOwner.userId)).limit(1);
  return {
    owner: owner ?? null,
    roles: roles.map(r => ({ id: r.id, name: r.name, description: r.description, builtIn: r.builtIn, permissions: perms.filter(p => p.roleId === r.id).map(p => p.permission), members: staff.filter(s => s.roleId === r.id).length })),
    staff: staff.map(s => ({ ...s, since: s.since.toISOString() })),
    invites: invites.map(i => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
  };
}
