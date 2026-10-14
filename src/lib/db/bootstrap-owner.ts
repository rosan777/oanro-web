import { randomUUID } from "node:crypto";
type Connection = { query: (sql: string, values?: string[]) => Promise<{ rows: unknown[] }> };
// Caller supplies one dedicated connection; every change is one transaction.
export async function bootstrapOwner(client: Connection, userId: string, reason: string) {
  if (!userId || !reason.trim()) throw new Error("User and reason required");
  await client.query("BEGIN");
  try {
    await client.query("LOCK TABLE system_owner IN EXCLUSIVE MODE");
    if ((await client.query("SELECT 1 FROM system_owner")).rows.length) throw new Error("Owner already initialized");
    const user = await client.query("SELECT id FROM auth_user WHERE id = $1 AND email_verified = true FOR UPDATE", [userId]);
    if (!user.rows.length) throw new Error("Verified user not found");
    await client.query("INSERT INTO system_owner (slot, user_id) VALUES (1, $1)", [userId]);
    await client.query("INSERT INTO audit_event (id, actor_id, action, target_id, reason) VALUES ($1, $2, 'owner.bootstrap', $2, $3)", [randomUUID(), userId, reason]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
