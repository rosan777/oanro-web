import "server-only";
import { getAuth, authConfigured } from "./auth";
import { isOwner } from "./access";
import { readObject } from "./pulse-thumbnail";
import { validateUploadedImage } from "./pulse-upload";
import { ProductInputError } from "./product-input";
import { ProductStoreError } from "./product-store";

export const noStore = { "Cache-Control": "no-store" };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
async function owner(request: Request) {
  if (!authConfigured()) return null;
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user.emailVerified && await isOwner(session.user.id) ? session.user.id : null;
}
function fail(error: unknown) {
  if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
  if (error instanceof ProductStoreError) return Response.json({ error: error.message }, { status: error.message === "NOT_FOUND" ? 404 : 409, headers: noStore });
  if (error instanceof Error && error.message === "INVALID_IMAGE") return Response.json({ error: "INVALID_INPUT", field: "image" }, { status: 400, headers: noStore });
  return Response.json({ error: "UPDATE_FAILED" }, { status: 503, headers: noStore });
}
/** Owner session + same-origin check + bounded JSON body; maps validation/store errors to HTTP codes. */
export function ownerHandler(handler: (ownerId: string, data: Record<string, unknown>) => Promise<Response>) {
  return async (request: Request) => {
    const ownerId = await owner(request);
    if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
    let data: Record<string, unknown>;
    try { data = await readObject(request, 400000); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore }); }
    try { return await handler(ownerId, data); } catch (error) { return fail(error); }
  };
}
export function requireUuid(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new ProductInputError("id");
  return value;
}
/** undefined keeps the current photo, null removes it, a data URL is validated and replaces it. */
export const photoField = (value: unknown) => value === undefined ? undefined : value === null ? null : validateUploadedImage(value);
