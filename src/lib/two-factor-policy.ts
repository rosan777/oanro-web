import "server-only";
import { and, eq } from "drizzle-orm";
import { account, auditEvent, storeSetting, user } from "./db/schema";
import type { CatalogDb } from "./product-store";
import { randomUUID } from "node:crypto";

// Owner switch: "every staff member who signs in with a password must use two-step verification".
// Each person still sets up their own authenticator app (every phone gets its own secret key);
// until they do, admin pages and admin actions are blocked for them. Google sign-ins are protected by Google.
const KEY = "security.require_staff_2fa";
export async function staffTwoFactorRequired(db: CatalogDb) {
  // Retries once on a dropped connection so a brief network blip doesn't crash the page; falls back to "not required" if it still fails.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const [row] = await db.select({ value: storeSetting.value }).from(storeSetting).where(eq(storeSetting.key, KEY)).limit(1);
      return row?.value === "true";
    } catch (error) {
      if (attempt === 1) { console.error("staffTwoFactorRequired: giving up after retry", error); return false; }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return false;
}
export async function setStaffTwoFactorRequired(db: CatalogDb, actorId: string, on: boolean) {
  await db.transaction(async tx => {
    await tx.insert(storeSetting).values({ key: KEY, value: String(on), updatedBy: actorId })
      .onConflictDoUpdate({ target: storeSetting.key, set: { value: String(on), updatedBy: actorId, updatedAt: new Date() } });
    await tx.insert(auditEvent).values({ id: randomUUID(), actorId, action: "security.staff-2fa", targetId: "store_setting", reason: on ? "two-step verification required for staff" : "two-step verification optional for staff" });
  });
}
/** True when this signed-in staff member must finish two-step setup before using the admin. */
export async function needsTwoFactorSetup(db: CatalogDb, userId: string, isOwner: boolean) {
  if (isOwner || !(await staffTwoFactorRequired(db))) return false;
  const [[cred], [me]] = await Promise.all([
    db.select({ id: account.id }).from(account).where(and(eq(account.userId, userId), eq(account.providerId, "credential"))).limit(1),
    db.select({ on: user.twoFactorEnabled }).from(user).where(eq(user.id, userId)).limit(1),
  ]);
  return Boolean(cred) && !me?.on;
}
