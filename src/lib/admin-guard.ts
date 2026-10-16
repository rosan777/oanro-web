import "server-only";
import { notFound, redirect } from "next/navigation";
import { currentSession, isOwner } from "./access";
/** For owner pages: sign-in redirect when signed out; 404 for anyone who isn't the verified owner. */
export async function requireOwnerPage() {
  const session = await currentSession();
  if (!session) redirect("/sign-in");
  if (!session.user.emailVerified || !await isOwner(session.user.id)) notFound();
  return session;
}
