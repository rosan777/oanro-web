import { adminHandler, authorize, noStore, requireUuid } from "@/lib/admin-api";
import { cleanLabel, orderExtras, setOrderLabel } from "@/lib/team-notes";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Labels and discount for one order (?id=). */
export async function GET(request: Request) {
  const who = await authorize(request, ["orders.read", "cod.manage"]);
  if (!who) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  try { return Response.json({ ...await orderExtras(catalogDb(), requireUuid(id)), canLabel: who.access.permissions.has("orders.labels") }, { headers: noStore }); }
  catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore }); }
}
/** Add or remove a label: { id, label, add }. */
export const POST = adminHandler("orders.labels", async (actor, data) => {
  const id = requireUuid(data.id);
  await setOrderLabel(catalogDb(), actor, id, cleanLabel(data.label), data.add !== false);
  return Response.json({ ...await orderExtras(catalogDb(), id), canLabel: true }, { headers: noStore });
});
