import { authConfigured, getAuth } from "@/lib/auth";
import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { ProductInputError } from "@/lib/product-input";
import { parseProfile, saveProfile } from "@/lib/profile-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";
/** Signed-in customers update only their own profile. */
export async function PUT(request: Request) {
  if (!authConfigured()) return Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore });
  if (request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore });
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "SIGN_IN_REQUIRED" }, { status: 401, headers: noStore });
  try {
    const profile = parseProfile(await readObject(request, 8000));
    await saveProfile(catalogDb(), session.user.id, profile);
    return Response.json({ profile }, { headers: noStore });
  } catch (error) {
    if (error instanceof ProductInputError) return Response.json({ error: "INVALID_INPUT", field: error.field }, { status: 400, headers: noStore });
    return Response.json({ error: "SAVE_FAILED" }, { status: 503, headers: noStore });
  }
}
