import { parseCampaignInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveCampaign, createCampaign, listOwnerCampaigns, setCampaignProducts, setCampaignStatus, updateCampaign } from "@/lib/campaign-store";
import { catalogDb } from "@/lib/store-products";
import { adminHandler, noStore, photoField, requireUuid } from "@/lib/admin-api";
export const runtime = "nodejs";

const respond = async () => Response.json({ campaigns: await listOwnerCampaigns(catalogDb()) }, { headers: noStore });
export const POST = adminHandler("campaigns.manage", async (actor, data) => {
  await createCampaign(catalogDb(), actor, parseCampaignInput(data), photoField(data.image) ?? null); return respond();
});
// Full edit, quick status ({ id, status }), or product list ({ id, items: [{ productId, pinned }] }).
export const PATCH = adminHandler("campaigns.manage", async (actor, data) => {
  const id = requireUuid(data.id); const keys = Object.keys(data);
  if (keys.length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    await setCampaignStatus(catalogDb(), actor, id, data.status as ProductStatus);
  } else if (keys.length === 2 && "items" in data) await setCampaignProducts(catalogDb(), actor, id, data.items);
  else await updateCampaign(catalogDb(), actor, id, parseCampaignInput(data), photoField(data.image));
  return respond();
});
export const DELETE = adminHandler("campaigns.manage", async (actor, data) => { await archiveCampaign(catalogDb(), actor, requireUuid(data.id)); return respond(); });
