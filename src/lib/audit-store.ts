// Deleting activity-log entries. Owner only (the route checks it); every deletion leaves one new entry saying who did it.

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { auditEvent } from "./db/schema";
import { ProductStoreError, type CatalogDb } from "./product-store";

/**
 * Deletes one entry (`id`) or the whole log (`id` null), then records "audit.delete" or "audit.clear" with the owner's id.
 * The database only allows the delete while the transaction-local setting below is on; edits stay impossible.
 */
export async function deleteAuditEntries(
  db: CatalogDb,
  ownerId: string,
  id: string | null,
): Promise<number> {
  return db.transaction(async tx => {
    await tx.execute(sql`select set_config('oanro.audit_purge', 'on', true)`);
    const removed = await tx
      .delete(auditEvent)
      .where(id ? eq(auditEvent.id, id) : undefined)
      .returning({ id: auditEvent.id });
    if (id && !removed.length) throw new ProductStoreError("NOT_FOUND");
    await tx.execute(sql`select set_config('oanro.audit_purge', 'off', true)`);
    await tx.insert(auditEvent).values({
      id: randomUUID(),
      actorId: ownerId,
      action: id ? "audit.delete" : "audit.clear",
      targetId: id ?? "all",
      reason: id
        ? "Owner deleted one activity entry"
        : `Owner deleted ${removed.length} activity entries`,
    });
    return removed.length;
  });
}
