import { parseProductInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveProduct, createProduct, importDemoCatalog, listOwnerCollections, listOwnerProducts, setProductStatus, setProductStock, updateProduct } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { noStore, ownerHandler, photoField, requireUuid } from "@/lib/admin-api";
export const runtime = "nodejs";

const respond = async () => {
  const db = catalogDb();
  const [products, collections] = await Promise.all([listOwnerProducts(db), listOwnerCollections(db)]);
  return Response.json({ products, collections }, { headers: noStore });
};
// Create a product, or import the demo catalog into an empty table.
export const POST = ownerHandler(async (ownerId, data) => {
  if (data.action === "import-demo") { await importDemoCatalog(catalogDb(), ownerId); return respond(); }
  await createProduct(catalogDb(), ownerId, parseProductInput(data), photoField(data.image) ?? null);
  return respond();
});
// Full edit ({ id, ...fields, image? }), quick status ({ id, status }) or quick stock ({ id, stock: 0 | null }).
export const PATCH = ownerHandler(async (ownerId, data) => {
  const id = requireUuid(data.id); const keys = Object.keys(data);
  if (keys.length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    await setProductStatus(catalogDb(), ownerId, id, data.status as ProductStatus);
  } else if (keys.length === 2 && "stock" in data) {
    if (data.stock !== 0 && data.stock !== null) throw new ProductInputError("stock");
    await setProductStock(catalogDb(), ownerId, id, data.stock);
  } else await updateProduct(catalogDb(), ownerId, id, parseProductInput(data), photoField(data.image));
  return respond();
});
// Archive (soft delete). The row and its audit history are kept.
export const DELETE = ownerHandler(async (ownerId, data) => { await archiveProduct(catalogDb(), ownerId, requireUuid(data.id)); return respond(); });
