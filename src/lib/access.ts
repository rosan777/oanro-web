import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { authConfigured, getAuth } from "./auth";
import { getDb } from "./db";
import { systemOwner } from "./db/schema";

export async function currentSession() {
  if (!authConfigured()) return null;
  return getAuth().api.getSession({ headers: await headers() });
}
export async function isOwner(userId: string) {
  const rows = await getDb().select({ id: systemOwner.userId }).from(systemOwner).where(eq(systemOwner.userId, userId));
  return rows.length === 1;
}
