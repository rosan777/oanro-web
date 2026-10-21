import { eq } from "drizzle-orm";
import { parseProductInput, productStatuses, ProductInputError, type ProductStatus } from "@/lib/product-input";
import { archiveProduct, createProduct, setColorImage, importDemoCatalog, listOwnerCollections, listOwnerProducts, ProductStoreError, setProductStatus, setProductStock, updateProduct } from "@/lib/product-store";
import { catalogDb } from "@/lib/store-products";
import { noStore, adminHandler, photoField, requireUuid } from "@/lib/admin-api";
import { product } from "@/lib/db/schema";
import { canProduct, type Permission } from "@/lib/permissions";
import type { Access } from "@/lib/rbac";
export const runtime = "nodejs";

const respond = async () => {
  const db = catalogDb();
  const [products, collections] = await Promise.all([listOwnerProducts(db), listOwnerCollections(db)]);
  return Response.json({ products, collections }, { headers: noStore });
};
// Anyone with full product rights or one of the narrow ones may call; each action is then checked exactly.
const anyProduct: Permission[] = ["products.manage", "products.draft", "products.publish", "products.hide"];
const can = (access: Access, what: Parameters<typeof canProduct>[1]) => canProduct(p => access.permissions.has(p), what);
function deny(ok: boolean, code = "NOT_ALLOWED") { if (!ok) throw new ProductStoreError(code); }
/** Moving to a status: live needs "publish", hidden needs "hide", draft needs "draft" (or "hide" when it takes a live product down). */
function statusAllowed(access: Access, target: ProductStatus, current?: ProductStatus) {
  if (target === current) return true;
  if (target === "published") return can(access, "publish");
  if (target === "hidden") return can(access, "hide");
  return current === "published" ? can(access, "hide") : can(access, "draft");
}
async function currentStatus(id: string) {
  const [row] = await catalogDb().select({ status: product.status }).from(product).where(eq(product.id, id)).limit(1);
  if (!row) throw new ProductStoreError("NOT_FOUND");
  return row.status;
}
// Create a product (needs "draft"; publishing it straight away also needs "publish"), or import the demo catalog (full rights).
export const POST = adminHandler(anyProduct, async (actor, data, access) => {
  if (data.action === "import-demo") { deny(can(access, "manage")); await importDemoCatalog(catalogDb(), actor); return respond(); }
  const input = parseProductInput(data);
  deny(can(access, "draft")); deny(statusAllowed(access, input.status, "draft"));
  await createProduct(catalogDb(), actor, input, photoField(data.image) ?? null);
  return respond();
});
// Full edit ({ id, ...fields, image? }), quick status ({ id, status }) or quick stock ({ id, stock: number | null }).
export const PATCH = adminHandler(anyProduct, async (actor, data, access) => {
  const id = requireUuid(data.id); const keys = Object.keys(data);
  if (data.action === "color-image") {
    // Same rule as editing the product: full rights, or draft writers on drafts only.
    if (!can(access, "manage")) { deny(can(access, "draft")); deny(await currentStatus(id) === "draft", "NOT_DRAFT"); }
    if (typeof data.color !== "string" || !/^[a-z0-9-]{1,30}$/.test(data.color)) throw new ProductInputError("color");
    await setColorImage(catalogDb(), actor, id, data.color, photoField(data.image) ?? null);
  } else if (keys.length === 2 && "status" in data) {
    if (typeof data.status !== "string" || !productStatuses.includes(data.status as ProductStatus)) throw new ProductInputError("status");
    deny(statusAllowed(access, data.status as ProductStatus, await currentStatus(id)));
    await setProductStatus(catalogDb(), actor, id, data.status as ProductStatus);
  } else if (keys.length === 2 && "stock" in data) {
    deny(can(access, "manage"));
    // 0 = out of stock, null = unlimited, or an exact count.
    if (data.stock !== null && !(Number.isInteger(data.stock) && (data.stock as number) >= 0 && (data.stock as number) <= 1_000_000)) throw new ProductInputError("stock");
    await setProductStock(catalogDb(), actor, id, data.stock as number | null);
  } else {
    const input = parseProductInput(data), current = await currentStatus(id);
    // Draft writers may only touch drafts; live and hidden products need full product rights.
    if (!can(access, "manage")) { deny(can(access, "draft")); deny(current === "draft", "NOT_DRAFT"); deny(statusAllowed(access, input.status, current)); }
    await updateProduct(catalogDb(), actor, id, input, photoField(data.image));
  }
  return respond();
});
// Archive (soft delete). Full product rights only. The row and its audit history are kept.
export const DELETE = adminHandler("products.manage", async (actor, data) => { await archiveProduct(catalogDb(), actor, requireUuid(data.id)); return respond(); });
