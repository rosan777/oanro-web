// Small server-only helpers for pages: who is signed in, and whether that person is the site owner.
// API routes use authorize() in admin-api.ts instead, which also checks permissions and origin.

import "server-only";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { authConfigured, getAuth } from "./auth";
import { getDb } from "./db";
import { systemOwner } from "./db/schema";

/** The signed-in session for the current page request, or null when sign-in is switched off. */
export async function currentSession() {
  if (!authConfigured()) return null;
  return getAuth().api.getSession({ headers: await headers() });
}

/** True when this user holds the single system owner slot. */
export async function isOwner(userId: string) {
  const rows = await getDb()
    .select({ id: systemOwner.userId })
    .from(systemOwner)
    .where(eq(systemOwner.userId, userId));
  return rows.length === 1;
}
