import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { permissions, roleTemplates } from "../src/lib/permissions";
import { claimInvite, createInvite, createRole, deleteRole, getAccess, getStaffOverview, revokeInvite, setRolePermissions, setStaffActive, setStaffRole } from "../src/lib/rbac";
import { ProductStoreError, type CatalogDb } from "../src/lib/product-store";

const rejects = (p: Promise<unknown>, code: string) => assert.rejects(p, (e: unknown) => e instanceof ProductStoreError && e.message === code, code);
test("RBAC: deny by default, owner bypass, invites, roles, deactivation", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    const mk = (id: string, email: string, emailVerified = true) => db.insert(schema.user).values({ id, name: id, email, emailVerified });
    await mk("owner", "owner@example.com"); await mk("ana", "ana@example.com"); await mk("bob", "bob@example.com", false); await mk("eve", "eve@example.com");
    await db.insert(schema.systemOwner).values({ userId: "owner" });

    // Seeded templates match the code.
    const seeded = await getStaffOverview(db);
    for (const t of roleTemplates) assert.deepEqual(seeded.roles.find(r => r.id === t.id)?.permissions.sort(), [...t.permissions].sort(), t.id);

    assert.equal((await getAccess(db, "owner")).permissions.size, permissions.length, "owner has everything");
    assert.equal((await getAccess(db, "eve")).permissions.size, 0, "a random signed-in user has nothing");

    await createInvite(db, "owner", " Ana@Example.com ", "sales");
    await rejects(createInvite(db, "owner", "owner@example.com", "sales"), "ALREADY_STAFF");
    await rejects(createInvite(db, "owner", "not-an-email", "sales"), "INVALID_EMAIL");
    await rejects(createInvite(db, "owner", "x@example.com", "nope"), "ROLE_NOT_FOUND");
    assert.equal(await claimInvite(db, { id: "ana", email: "ana@example.com", emailVerified: true }), true);
    assert.equal(await claimInvite(db, { id: "ana", email: "ana@example.com", emailVerified: true }), false, "claim once");
    assert.deepEqual([...(await getAccess(db, "ana")).permissions].sort(), ["leads.manage", "leads.read", "orders.read"]); // Sales: inquiries + view orders (cannot approve payments)

    // Unverified emails can't claim; revoked invites can't be claimed.
    const bobInvite = await createInvite(db, "owner", "bob@example.com", "manager");
    assert.equal(await claimInvite(db, { id: "bob", email: "bob@example.com", emailVerified: false }), false);
    await revokeInvite(db, "owner", bobInvite);
    assert.equal(await claimInvite(db, { id: "bob", email: "bob@example.com", emailVerified: true }), false);

    await setStaffRole(db, "owner", "ana", "catalog-editor");
    assert.ok((await getAccess(db, "ana")).permissions.has("products.manage"));
    await rejects(setStaffRole(db, "ana", "ana", "manager"), "SELF_CHANGE");
    await rejects(setStaffActive(db, "ana", "owner", false), "NOT_FOUND"); // the owner is never a staff row

    await db.insert(schema.session).values({ id: "s1", token: "t1", userId: "ana", expiresAt: new Date(Date.now() + 864e5) });
    await setStaffActive(db, "owner", "ana", false);
    assert.equal((await getAccess(db, "ana")).permissions.size, 0, "deactivated = no access");
    assert.equal((await db.select().from(schema.session).where(eq(schema.session.userId, "ana"))).length, 0, "signed out everywhere");
    await setStaffActive(db, "owner", "ana", true);
    assert.ok((await getAccess(db, "ana")).permissions.has("products.manage"));

    const custom = await createRole(db, "owner", "Packer", "Ships orders", ["leads.read"]);
    await rejects(createRole(db, "owner", "Bad", "", ["root.everything"]), "INVALID_PERMISSIONS");
    await setRolePermissions(db, "owner", custom, ["leads.read", "audit.read"]);
    await setStaffRole(db, "owner", "ana", custom);
    assert.deepEqual([...(await getAccess(db, "ana")).permissions].sort(), ["audit.read", "leads.read"]);
    await rejects(deleteRole(db, "owner", custom), "ROLE_IN_USE");
    await rejects(deleteRole(db, "owner", "manager"), "BUILT_IN");
    await setStaffRole(db, "owner", "ana", "viewer"); await deleteRole(db, "owner", custom);

    const actions = (await db.select().from(schema.auditEvent)).map(e => e.action);
    for (const a of ["staff.invite", "staff.join", "staff.invite-revoke", "staff.role", "staff.deactivate", "staff.reactivate", "role.create", "role.permissions", "role.delete"]) assert.ok(actions.includes(a), a);
  } finally { await pg.close(); }
});

test("staff-admin power is detectable so only the owner can grant or change it", async () => {
  const { roleGrantsStaffAdmin, memberIsStaffAdmin, createRole, createInvite, claimInvite, getAccess } = await import("../src/lib/rbac");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values([{ id: "owner-1", name: "Owner", email: "owner@example.com", emailVerified: true }, { id: "u-2", name: "Admin", email: "admin@example.com", emailVerified: true }]);
    await db.insert(schema.systemOwner).values({ userId: "owner-1" });
    assert.equal(await roleGrantsStaffAdmin(db, "manager"), false, "Manager template excludes staff.manage");
    const rid = await createRole(db, "owner-1", "Staff admin", "", ["staff.manage", "leads.read"]);
    assert.equal(await roleGrantsStaffAdmin(db, rid), true);
    await createInvite(db, "owner-1", "admin@example.com", rid);
    await claimInvite(db, { id: "u-2", email: "admin@example.com", emailVerified: true });
    assert.equal(await memberIsStaffAdmin(db, "u-2"), true);
    assert.equal((await getAccess(db, "u-2")).owner, false, "a staff admin is never the owner");
    assert.equal(await memberIsStaffAdmin(db, "owner-1"), false, "the owner is not a staff row");
  } finally { await pg.close(); }
});
