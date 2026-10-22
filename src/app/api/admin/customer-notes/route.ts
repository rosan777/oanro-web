import { adminHandler, noStore } from "@/lib/admin-api";
import { addCustomerNote, listCustomerNotes } from "@/lib/team-notes";
import { ProductInputError } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Add a private team note to a customer: { userId, body }. */
export const POST = adminHandler("customers.notes", async (actor, data) => {
  if (typeof data.userId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(data.userId)) throw new ProductInputError("userId");
  await addCustomerNote(catalogDb(), actor, data.userId, data.body);
  const notes = await listCustomerNotes(catalogDb(), data.userId);
  return Response.json({ notes: notes.map(n => ({ ...n, createdAt: n.createdAt.toISOString() })) }, { headers: noStore });
});
