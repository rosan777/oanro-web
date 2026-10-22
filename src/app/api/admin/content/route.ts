import { adminHandler, noStore } from "@/lib/admin-api";
import { saveSiteContent, type ContentPart } from "@/lib/site-content";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Save one part of the website content ({ part, value }) or put it back to the default ({ part, reset: true }). */
export const PATCH = adminHandler("content.manage", async (actor, data) => {
  const content = await saveSiteContent(catalogDb(), actor, String(data.part) as ContentPart, data.value, data.reset === true);
  return Response.json({ content }, { headers: noStore });
});
