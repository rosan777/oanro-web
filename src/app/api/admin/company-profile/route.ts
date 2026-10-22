import { adminHandler, noStore } from "@/lib/admin-api";
import { saveCompanyProfile } from "@/lib/company-profile";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Save the company profile ({ value }) or put it back to the default ({ reset: true }). */
export const PATCH = adminHandler("content.manage", async (actor, data) => {
  const profile = await saveCompanyProfile(catalogDb(), actor, data.value, data.reset === true);
  return Response.json({ profile }, { headers: noStore });
});
