import { adminHandler, noStore, requireUuid } from "@/lib/admin-api";
import { deleteBanner, listBanners, parseBanner, saveBanner } from "@/lib/banner-store";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

const respond = async () => Response.json({ banners: await listBanners(catalogDb()) }, { headers: noStore });
/** Create ({ ...fields }) or edit ({ id, ...fields }) a banner. */
export const POST = adminHandler("banners.manage", async (actor, data) => { await saveBanner(catalogDb(), actor, data.id ? requireUuid(data.id) : null, parseBanner(data)); return respond(); });
/** Delete ({ id }). */
export const DELETE = adminHandler("banners.manage", async (actor, data) => { await deleteBanner(catalogDb(), actor, requireUuid(data.id)); return respond(); });
