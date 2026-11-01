// Activity log: still append-only for everyone, but the owner's purge can delete entries and always leaves a record.

import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { deleteAuditEntries } from "../src/lib/audit-store";
import * as schema from "../src/lib/db/schema";

test("audit log: edits and plain deletes stay blocked; owner purge deletes and records itself", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const ownerId = "owner-1";
    await db.insert(schema.user).values({
      id: ownerId,
      name: "Owner",
      email: "owner@example.test",
      emailVerified: true,
    });
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of ids)
      await db
        .insert(schema.auditEvent)
        .values({ id, actorId: ownerId, action: "banner.save", targetId: id, reason: "x" });

    await assert.rejects(pg.query("UPDATE audit_event SET reason = 'tampered'"));
    await assert.rejects(pg.query("DELETE FROM audit_event"));
    await assert.rejects(pg.query("TRUNCATE audit_event"));
    assert.equal((await db.select().from(schema.auditEvent)).length, 3);

    assert.equal(await deleteAuditEntries(db as never, ownerId, ids[0]), 1);
    await assert.rejects(deleteAuditEntries(db as never, ownerId, ids[0]), /NOT_FOUND/);
    let rows = await db.select().from(schema.auditEvent);
    assert.equal(rows.length, 3, "2 left + 1 record of the deletion(s)");
    assert.ok(rows.some(r => r.action === "audit.delete" && r.actorId === ownerId));

    assert.equal(await deleteAuditEntries(db as never, ownerId, null), 3);
    rows = await db.select().from(schema.auditEvent);
    assert.deepEqual(
      rows.map(r => [r.action, r.actorId, r.reason]),
      [["audit.clear", ownerId, "Owner deleted 3 activity entries"]],
    );
    await assert.rejects(pg.query("DELETE FROM audit_event"), "the switch turns off again");
  } finally {
    await pg.close();
  }
});
