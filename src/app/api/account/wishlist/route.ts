import { accountError, accountSession } from "@/lib/account-api";
import { noStore } from "@/lib/admin-api";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
import { addToWishlist, listWishlist, removeFromWishlist } from "@/lib/wishlist-store";
export const runtime = "nodejs";

// Signed-in shoppers' wishlist: GET lists it, POST adds one slug or merges a list (after sign-in),
// DELETE removes one slug. Every request works on the signed-in user's own rows only.

const slugOk = (s: unknown): s is string => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s);

export async function GET(request: Request) {
  const auth = await accountSession(request, { write: false });
  if ("response" in auth) return auth.response;
  try {
    return Response.json(
      { slugs: await listWishlist(catalogDb(), auth.session.user.id) },
      { headers: noStore },
    );
  } catch (error) {
    return accountError(error, "LOAD_FAILED");
  }
}

export async function POST(request: Request) {
  const auth = await accountSession(request, { write: true });
  if ("response" in auth) return auth.response;
  try {
    const data = await readObject(request, 8000);
    const slugs = Array.isArray(data.slugs)
      ? data.slugs.filter(slugOk).slice(0, 100)
      : slugOk(data.slug)
        ? [data.slug]
        : [];
    if (!slugs.length)
      return Response.json(
        { error: "INVALID_INPUT", field: "slug" },
        { status: 400, headers: noStore },
      );
    return Response.json(
      { slugs: await addToWishlist(catalogDb(), auth.session.user.id, slugs) },
      { headers: noStore },
    );
  } catch (error) {
    return accountError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await accountSession(request, { write: true });
  if ("response" in auth) return auth.response;
  try {
    const data = await readObject(request, 2000);
    if (!slugOk(data.slug))
      return Response.json(
        { error: "INVALID_INPUT", field: "slug" },
        { status: 400, headers: noStore },
      );
    return Response.json(
      { slugs: await removeFromWishlist(catalogDb(), auth.session.user.id, data.slug) },
      { headers: noStore },
    );
  } catch (error) {
    return accountError(error);
  }
}
