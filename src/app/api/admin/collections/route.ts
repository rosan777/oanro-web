import { idPattern, parseCollectionInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveCollection, createCollection, listOwnerCollections, ProductStoreError, setCollectionStatus, updateCollection } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { noStore, adminHandler } from "@/lib/admin-api";
export const runtime = "nodejs";

const respond = async () => Response.json({ collections: await listOwnerCollections(catalogDb()) }, { headers: noStore });
const sectionId = (value: unknown) => { if (typeof value !== "string" || !idPattern.test(value)) throw new ProductInputError("id"); return value; };
export const POST = adminHandler("products.manage", async (ownerId, data) => { await createCollection(catalogDb(), ownerId, parseCollectionInput(data)); return respond(); });
// Full edit, or the ON/OFF switch ({ id, status } only).
// The ON/OFF switch alone is allowed with "sections.toggle"; editing a section needs full product rights.
export const PATCH = adminHandler(["products.manage", "sections.toggle"], async (ownerId, data, access) => {
  const id = sectionId(data.id);
  if (Object.keys(data).length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    if (!access.permissions.has("sections.toggle")) throw new ProductStoreError("NOT_ALLOWED");
    await setCollectionStatus(catalogDb(), ownerId, id, data.status as ProductStatus);
  } else {
    if (!access.permissions.has("products.manage")) throw new ProductStoreError("NOT_ALLOWED");
    await updateCollection(catalogDb(), ownerId, id, parseCollectionInput(data)); }
  return respond();
});
export const DELETE = adminHandler("products.manage", async (ownerId, data) => { await archiveCollection(catalogDb(), ownerId, sectionId(data.id)); return respond(); });
