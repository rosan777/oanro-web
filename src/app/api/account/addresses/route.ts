import { accountError, accountSession } from "@/lib/account-api";
import { noStore } from "@/lib/admin-api";
import { deleteAddress, listAddresses, parseAddress, saveAddress } from "@/lib/address-store";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

// Signed-in customers' saved addresses: GET lists, POST creates or (with id) updates, DELETE removes.
// Every query is limited to the signed-in user's own rows.

const idOk = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{1,64}$/.test(v);

export async function GET(request: Request) {
  const auth = await accountSession(request, { write: false });
  if ("response" in auth) return auth.response;
  try {
    return Response.json(
      { addresses: await listAddresses(catalogDb(), auth.session.user.id) },
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
    const id = data.id === undefined ? undefined : idOk(data.id) ? data.id : null;
    if (id === null)
      return Response.json(
        { error: "INVALID_INPUT", field: "id" },
        { status: 400, headers: noStore },
      );
    const addresses = await saveAddress(catalogDb(), auth.session.user.id, parseAddress(data), id);
    return Response.json({ addresses }, { headers: noStore });
  } catch (error) {
    return accountError(error);
  }
}

export async function DELETE(request: Request) {
  const auth = await accountSession(request, { write: true });
  if ("response" in auth) return auth.response;
  try {
    const data = await readObject(request, 2000);
    if (!idOk(data.id))
      return Response.json(
        { error: "INVALID_INPUT", field: "id" },
        { status: 400, headers: noStore },
      );
    return Response.json(
      { addresses: await deleteAddress(catalogDb(), auth.session.user.id, data.id) },
      { headers: noStore },
    );
  } catch (error) {
    return accountError(error);
  }
}
