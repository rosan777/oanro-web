import { adminHandler, noStore } from "@/lib/admin-api";
import { isMediaKey, mediaVersions, saveMedia } from "@/lib/site-media";
import { ProductInputError } from "@/lib/product-input";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

/** Upload ({ key, image: dataURL }) or remove ({ key, image: null }) a menu or share image. */
export const PUT = adminHandler("content.manage", async (actor, data) => {
  if (!isMediaKey(data.key)) throw new ProductInputError("key");
  try { await saveMedia(catalogDb(), actor, data.key, data.image ?? null); }
  catch (e) { if (e instanceof Error && e.message === "INVALID_IMAGE") throw new ProductInputError("image"); throw e; }
  return Response.json({ media: await mediaVersions(catalogDb()) }, { headers: noStore });
});
