import "server-only";
import { getAuth, authConfigured } from "./auth";
import { readObject } from "./pulse-thumbnail";
import { validateUploadedImage } from "./pulse-upload";
import { ProductInputError } from "./product-input";
import { ProductStoreError } from "./product-store";
import { claimInvite, getAccess, type Access } from "./rbac";
import { catalogDb } from "./store-products";
import type { Permission } from "./permissions";
import { storefrontChanged } from "./storefront-cache";

export const noStore = { "Cache-Control": "no-store" };
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Same-origin, signed-in, verified user with the required permission; otherwise null (deny by default). */
export async function authorize(request: Request, permission: Permission | Permission[]): Promise<{ userId: string; access: Access } | null> {
  if (!authConfigured()) return null;
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session?.user.emailVerified) return null;
  const db = catalogDb();
  await claimInvite(db, session.user);
  const access = await getAccess(db, session.user.id);
  const needed = Array.isArray(permission) ? permission : [permission];
  return needed.some(p => access.permissions.has(p)) ? { userId: session.user.id, access } : null;
}
function fail(error: unknown) {
  if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
  if (error instanceof ProductStoreError) return Response.json({ error: error.message }, { status: error.message === "NOT_FOUND" ? 404 : error.message === "OWNER_ONLY" || error.message === "NOT_ALLOWED" ? 403 : 409, headers: noStore });
  if (error instanceof Error && error.message === "INVALID_IMAGE") return Response.json({ error: "INVALID_INPUT", field: "image" }, { status: 400, headers: noStore });
  return Response.json({ error: "UPDATE_FAILED" }, { status: 503, headers: noStore });
}
/** Permission check + bounded JSON body; maps validation/store errors to HTTP codes. */
/** permission: one, or a list where any one is enough (the handler then checks the exact action). */
export function adminHandler(permission: Permission | Permission[], handler: (userId: string, data: Record<string, unknown>, access: Access) => Promise<Response>) {
  return async (request: Request) => {
    const actor = await authorize(request, permission);
    if (!actor) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
    let data: Record<string, unknown>;
    try { data = await readObject(request, 400000); } catch { return Response.json({ error: "INVALID_INPUT" }, { status: 400, headers: noStore }); }
    try {
      const response = await handler(actor.userId, data, actor.access);
      if (response.ok) storefrontChanged(); // admin writes can change what shoppers see (products, stock, sections…)
      return response;
    } catch (error) { return fail(error); }
  };
}
export function requireUuid(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new ProductInputError("id");
  return value;
}
/** undefined keeps the current photo, null removes it, a data URL is validated and replaces it. */
export const photoField = (value: unknown) => value === undefined ? undefined : value === null ? null : validateUploadedImage(value);
