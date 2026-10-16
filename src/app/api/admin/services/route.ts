import { parseServiceInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveService, createService, importDemoServices, listOwnerServices, setServiceStatus, updateService } from "@/lib/service-store";
import { catalogDb } from "@/lib/store-products";
import { noStore, ownerHandler, photoField, requireUuid } from "@/lib/admin-api";
export const runtime = "nodejs";

const respond = async () => Response.json({ services: await listOwnerServices(catalogDb()) }, { headers: noStore });
export const POST = ownerHandler(async (ownerId, data) => {
  if (data.action === "import-demo") { await importDemoServices(catalogDb(), ownerId); return respond(); }
  await createService(catalogDb(), ownerId, parseServiceInput(data), photoField(data.image) ?? null);
  return respond();
});
export const PATCH = ownerHandler(async (ownerId, data) => {
  const id = requireUuid(data.id);
  if (Object.keys(data).length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    await setServiceStatus(catalogDb(), ownerId, id, data.status as ProductStatus);
  } else await updateService(catalogDb(), ownerId, id, parseServiceInput(data), photoField(data.image));
  return respond();
});
export const DELETE = ownerHandler(async (ownerId, data) => { await archiveService(catalogDb(), ownerId, requireUuid(data.id)); return respond(); });
