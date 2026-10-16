import { idPattern, parseCollectionInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveCollection, createCollection, listOwnerCollections, setCollectionStatus, updateCollection } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { noStore, ownerHandler } from "@/lib/admin-api";
export const runtime = "nodejs";

const respond = async () => Response.json({ collections: await listOwnerCollections(catalogDb()) }, { headers: noStore });
const sectionId = (value: unknown) => { if (typeof value !== "string" || !idPattern.test(value)) throw new ProductInputError("id"); return value; };
export const POST = ownerHandler(async (ownerId, data) => { await createCollection(catalogDb(), ownerId, parseCollectionInput(data)); return respond(); });
// Full edit, or the ON/OFF switch ({ id, status } only).
export const PATCH = ownerHandler(async (ownerId, data) => {
  const id = sectionId(data.id);
  if (Object.keys(data).length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    await setCollectionStatus(catalogDb(), ownerId, id, data.status as ProductStatus);
  } else await updateCollection(catalogDb(), ownerId, id, parseCollectionInput(data));
  return respond();
});
export const DELETE = ownerHandler(async (ownerId, data) => { await archiveCollection(catalogDb(), ownerId, sectionId(data.id)); return respond(); });
