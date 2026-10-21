import { eq } from "drizzle-orm";
import { adminHandler, noStore } from "@/lib/admin-api";
import { deleteCustomer } from "@/lib/customer-store";
import { catalogDb } from "@/lib/store-products";
import { user } from "@/lib/db/schema";
import { cleanMessage, emailCustomer, emailEveryone, MailInputError } from "@/lib/customer-mail";
export const runtime = "nodejs";
export const maxDuration = 60;
/** Delete a customer account (personal data erased, orders kept anonymized). Needs "Delete customer accounts". */
export const DELETE = adminHandler("customers.delete", async (actorId, data) => {
  const id = typeof data.id === "string" ? data.id : "";
  if (!id || id.length > 100 || data.confirm !== "DELETE") return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
  if (id === actorId) return Response.json({ error: "NOT_ALLOWED" }, { status: 403, headers: noStore });
  await deleteCustomer(catalogDb(), id, { actorId, self: false, reason: typeof data.reason === "string" ? data.reason : undefined });
  return Response.json({ ok: true }, { headers: noStore });
});
/** Owner only: email one customer ({ action: "email", id }) or everyone ({ action: "email-all", test }). */
export const POST = adminHandler("customers.read", async (actorId, data, access) => {
  if (!access.owner) return Response.json({ error: "OWNER_ONLY" }, { status: 403, headers: noStore });
  let msg: { subject: string; body: string };
  try { msg = cleanMessage(data); } catch (e) { if (e instanceof MailInputError) return Response.json({ error: "INVALID_INPUT", field: e.message }, { status: 400, headers: noStore }); throw e; }
  const db = catalogDb();
  if (data.action === "email") {
    const id = typeof data.id === "string" ? data.id.slice(0, 100) : "";
    if (!id) return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
    await emailCustomer(db, actorId, id, msg);
    return Response.json({ ok: true }, { headers: noStore });
  }
  if (data.action === "email-all") {
    const [me] = await db.select({ email: user.email, name: user.name }).from(user).where(eq(user.id, actorId)).limit(1);
    const result = await emailEveryone(db, { id: actorId, email: me?.email ?? "", name: me?.name ?? "" }, msg, data.test === true);
    return Response.json(result, { headers: noStore });
  }
  return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore });
});
