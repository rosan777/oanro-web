import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { catalogDb } from "@/lib/store-products";
import {
  deleteCaseStudy,
  listAllCaseStudies,
  parseCaseStudy,
  saveCaseStudy,
} from "@/lib/case-study-store";
export const runtime = "nodejs";

// Studio case studies (portfolio), managed with the existing "Website content" permission (content.manage).
// adminHandler refreshes the storefront cache after every successful change.

export const POST = adminHandler("content.manage", async (actor, data) => {
  const db = catalogDb();
  if (data.action === "delete") await deleteCaseStudy(db, actor, requireUuid(data.id));
  else
    await saveCaseStudy(
      db,
      actor,
      parseCaseStudy(data),
      data.image,
      data.id === undefined ? undefined : requireUuid(data.id),
    );
  return Response.json({ caseStudies: await listAllCaseStudies(db) }, { headers: noStore });
});
