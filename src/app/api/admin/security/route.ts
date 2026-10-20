import { adminHandler, noStore } from "@/lib/admin-api";
import { ProductInputError } from "@/lib/product-input";
import { ProductStoreError } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { setStaffTwoFactorRequired } from "@/lib/two-factor-policy";
export const runtime = "nodejs";
/** Owner only: require two-step verification for every staff member who signs in with a password. */
export const PUT = adminHandler("staff.manage", async (actor, data, access) => {
  if (!access.owner) throw new ProductStoreError("OWNER_ONLY");
  if (typeof data.requireStaff2fa !== "boolean") throw new ProductInputError("requireStaff2fa");
  await setStaffTwoFactorRequired(catalogDb(), actor, data.requireStaff2fa);
  return Response.json({ requireStaff2fa: data.requireStaff2fa }, { headers: noStore });
});
