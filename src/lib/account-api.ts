// Shared checks for signed-in customer APIs (wishlist, addresses, workspace): sign-in configured,
// same-origin writes (like /api/account/profile) and a session. Returns the session or a ready response.

import "server-only";
import { authConfigured, getAuth } from "./auth";
import { noStore } from "./admin-api";
import { ProductInputError } from "./product-input";

export type AccountSession = {
  user: { id: string; email: string; name: string; emailVerified: boolean };
};

export async function accountSession(
  request: Request,
  { write }: { write: boolean },
): Promise<{ session: AccountSession } | { response: Response }> {
  if (!authConfigured() || !process.env.DATABASE_URL)
    return { response: Response.json({ error: "UNAVAILABLE" }, { status: 503, headers: noStore }) };
  if (write && request.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin)
    return { response: Response.json({ error: "FORBIDDEN" }, { status: 403, headers: noStore }) };
  const session = await getAuth()
    .api.getSession({ headers: request.headers })
    .catch(() => null);
  if (!session)
    return {
      response: Response.json({ error: "SIGN_IN_REQUIRED" }, { status: 401, headers: noStore }),
    };
  return { session: session as AccountSession };
}

/** The usual error response for a refused write: 400 for bad input, otherwise the given code. */
export function accountError(error: unknown, fallback = "SAVE_FAILED") {
  if (error instanceof ProductInputError)
    return Response.json(
      { error: "INVALID_INPUT", field: error.field },
      { status: 400, headers: noStore },
    );
  const code = error instanceof Error && /^[A-Z_]+$/.test(error.message) ? error.message : fallback;
  const status =
    code === "NOT_FOUND"
      ? 404
      : code === "LIMIT_REACHED" || code === "CONFLICT"
        ? 409
        : code === fallback
          ? 503
          : 400;
  return Response.json({ error: code }, { status, headers: noStore });
}
