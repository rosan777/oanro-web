import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { formatPrice } from "../src/lib/catalog";
import { archiveService, createService, hasManagedServices, importDemoServices, listOwnerServices, listStorefrontServices, publishedServiceImage, setServiceStatus } from "../src/lib/service-store";
import { parseCollectionInput, parseProductInput, parseServiceInput, ProductInputError, slugify } from "../src/lib/product-input";
import { archiveCollection, createCollection, listOwnerCollections, listStorefrontCollections, setProductStock, updateCollection, archiveProduct, createProduct, hasManagedCatalog, importDemoCatalog, listOwnerProducts, listStorefrontProducts, publishedProductImage, setProductStatus, updateProduct, ProductStoreError, type CatalogDb } from "../src/lib/product-store";

const base = { slug: "river-cap", nameEn: "River Cap", nameBn: "রিভার ক্যাপ", categoryEn: "Caps", price: "1290", stock: "8", sizes: "S, M, M, L", specsEn: "Color: Navy\nFabric: Cotton twill", status: "published" };
const rejects = (patch: Record<string, unknown>, field: string) =>
  assert.throws(() => parseProductInput({ ...base, ...patch }), (e: unknown) => e instanceof ProductInputError && e.field === field, field);

test("product input is normalized and bounded", () => {
  const input = parseProductInput(base);
  assert.equal(input.price, 1290); assert.equal(input.stock, 8);
  assert.deepEqual(input.sizes, ["S", "M", "L"]);
  assert.deepEqual(input.specsEn, [["Color", "Navy"], ["Fabric", "Cotton twill"]]);
  assert.equal(parseProductInput({ ...base, stock: "" }).stock, null);
  rejects({ slug: "Bad Slug!" }, "slug"); rejects({ slug: "-x" }, "slug");
  rejects({ nameEn: "   " }, "nameEn"); rejects({ nameEn: "x".repeat(81) }, "nameEn");
  rejects({ price: "-1" }, "price"); rejects({ price: "12.5" }, "price"); rejects({ price: 10_000_001 }, "price");
  rejects({ stock: "-3" }, "stock"); rejects({ sizes: "" }, "sizes"); rejects({ sizes: [1] }, "sizes");
  rejects({ status: "deleted" }, "status"); rejects({ specsEn: "no separator" }, "specsEn");
  rejects({ specsEn: Array.from({ length: 13 }, (_, i) => [`k${i}`, "v"]) }, "specsEn");
  rejects({ descriptionEn: 42 }, "descriptionEn");
  assert.equal(slugify("The Forest Knit — 2026!"), "the-forest-knit-2026");
});

test("catalog lifecycle: import, create, update, hide, archive, with audit and storefront filtering", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" }); // replay harmless
    await db.insert(schema.user).values({ id: "owner-1", name: "Owner", email: "owner@example.com", emailVerified: true });

    // Migration seeds the three built-in sections; Caps/Tech follow the (empty) old switches, so start hidden.
    assert.deepEqual((await listOwnerCollections(db)).map(c => [c.id, c.status]), [["seasonal", "published"], ["caps", "hidden"], ["tech", "hidden"]]);
    assert.equal(await hasManagedCatalog(db), false);
    await importDemoCatalog(db, "owner-1");
    assert.equal(await hasManagedCatalog(db), true);
    assert.equal((await listStorefrontProducts(db)).length, 3, "headphones sit in the hidden Tech section");
    const tech = (await listOwnerCollections(db)).find(c => c.id === "tech")!;
    await updateCollection(db, "owner-1", "tech", parseCollectionInput({ ...tech, status: "published" }));
    const demo = await listStorefrontProducts(db);
    assert.equal(demo.length, 4);
    assert.equal(demo.find(p => p.slug === "studio-headphones")?.collectionId, "tech");
    assert.equal(demo[0].inStock, true);
    assert.ok(!("stock" in demo[0]), "stock counts are never exposed to the storefront");
    assert.equal(demo[0].bn?.name, "দ্য ফরেস্ট নিট");
    await assert.rejects(importDemoCatalog(db, "owner-1"), (e: unknown) => e instanceof ProductStoreError && e.message === "CATALOG_NOT_EMPTY");

    const image = "data:image/png;base64,iVBORw0KGgo=";
    const id = await createProduct(db, "owner-1", parseProductInput({ ...base, status: "draft" }), image);
    assert.ok(!(await listStorefrontProducts(db)).some(p => p.slug === "river-cap"), "drafts stay off the storefront");
    assert.equal(await publishedProductImage(db, "river-cap"), null, "draft image is not public");
    await assert.rejects(createProduct(db, "owner-1", parseProductInput(base), null), (e: unknown) => e instanceof ProductStoreError && e.message === "SLUG_TAKEN");

    assert.equal(await updateProduct(db, "owner-1", id, parseProductInput({ ...base, status: "draft" }), undefined), false, "no-op update writes nothing");
    assert.equal(await updateProduct(db, "owner-1", id, parseProductInput({ ...base, price: "1490" }), undefined), true);
    const live = (await listStorefrontProducts(db)).find(p => p.slug === "river-cap");
    assert.equal(live?.price, 1490);
    assert.match(live?.image ?? "", /^\/api\/products\/river-cap\/image\?v=\d+$/);
    assert.equal(await publishedProductImage(db, "river-cap"), image);
    await assert.rejects(updateProduct(db, "owner-1", id, parseProductInput({ ...base, slug: "forest-knit" }), undefined), (e: unknown) => e instanceof ProductStoreError && e.message === "SLUG_TAKEN");

    await setProductStock(db, "owner-1", id, 0);
    assert.equal((await listStorefrontProducts(db)).find(p => p.slug === "river-cap")?.inStock, false, "out of stock is shown, not hidden");
    await setProductStock(db, "owner-1", id, null);
    assert.equal((await listStorefrontProducts(db)).find(p => p.slug === "river-cap")?.inStock, true);
    await setProductStatus(db, "owner-1", id, "hidden");
    assert.ok(!(await listStorefrontProducts(db)).some(p => p.slug === "river-cap"));
    assert.equal(await publishedProductImage(db, "river-cap"), null);
    assert.equal((await listOwnerProducts(db)).find(p => p.id === id)?.hasImage, true, "owner still sees hidden products");

    await archiveProduct(db, "owner-1", id);
    assert.ok(!(await listOwnerProducts(db)).some(p => p.id === id), "archived products leave the owner list");
    await assert.rejects(archiveProduct(db, "owner-1", id), (e: unknown) => e instanceof ProductStoreError && e.message === "NOT_FOUND");
    await assert.rejects(setProductStatus(db, "owner-1", id, "published"), (e: unknown) => e instanceof ProductStoreError);

    const trail = await db.select().from(schema.auditEvent).where(eq(schema.auditEvent.targetId, id));
    assert.deepEqual(trail.map(e => e.action).sort(), ["product.archive", "product.create", "product.status", "product.stock", "product.stock", "product.update"]);
    assert.equal(trail.find(e => e.action === "product.update")?.reason, "status,price");

    await assert.rejects(createProduct(db, "owner-1", parseProductInput({ ...base, slug: "ghost", collectionId: "nope" }), null), (e: unknown) => e instanceof ProductStoreError && e.message === "COLLECTION_NOT_FOUND");
    await assert.rejects(pg.query("UPDATE product SET price = -5 WHERE slug = 'forest-knit'"), "database rejects negative prices");
    await assert.rejects(pg.query("UPDATE product SET status = 'gone' WHERE slug = 'forest-knit'"), "database rejects unknown statuses");
  } finally { await pg.close(); }
});

test("prices format identically on server and browser (no Intl currency data)", () => {
  assert.equal(formatPrice(4990), "৳4,990"); assert.equal(formatPrice(125000), "৳1,25,000");
  assert.equal(formatPrice(10000000), "৳1,00,00,000"); assert.equal(formatPrice(4990, "bn"), "৳৪,৯৯০");
});

test("owner-created sections and services", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({ id: "owner-1", name: "Owner", email: "owner@example.com", emailVerified: true });
    // A second tech section, created as a draft: its products stay off the storefront until it is published.
    const gid = await createCollection(db, "owner-1", parseCollectionInput({ slug: "gaming-gear", nameEn: "Gaming gear", preset: "tech", status: "draft" }));
    await assert.rejects(createCollection(db, "owner-1", parseCollectionInput({ slug: "gaming-gear", nameEn: "Dup" })), (e: unknown) => e instanceof ProductStoreError && e.message === "SLUG_TAKEN");
    const pid = await createProduct(db, "owner-1", parseProductInput({ ...base, slug: "pro-mouse", collectionId: gid }), null);
    assert.equal((await listStorefrontProducts(db)).length, 0);
    const g = (await listOwnerCollections(db)).find(c => c.id === gid)!;
    assert.equal(g.productCount, 1); assert.equal(g.publishedCount, 1);
    await updateCollection(db, "owner-1", gid, parseCollectionInput({ ...g, status: "published" }));
    assert.equal((await listStorefrontProducts(db))[0]?.slug, "pro-mouse");
    assert.equal((await listStorefrontCollections(db)).find(c => c.id === gid)?.anchor, "collection-gaming-gear");
    await assert.rejects(archiveCollection(db, "owner-1", gid), (e: unknown) => e instanceof ProductStoreError && e.message === "COLLECTION_NOT_EMPTY");
    await assert.rejects(archiveCollection(db, "owner-1", "seasonal"), (e: unknown) => e instanceof ProductStoreError && e.message === "BUILT_IN");
    const seasonal = (await listOwnerCollections(db)).find(c => c.id === "seasonal")!;
    await assert.rejects(updateCollection(db, "owner-1", "seasonal", parseCollectionInput({ ...seasonal, slug: "renamed" })), (e: unknown) => e instanceof ProductStoreError && e.message === "BUILT_IN");
    await archiveProduct(db, "owner-1", pid);
    await archiveCollection(db, "owner-1", gid);
    assert.ok(!(await listOwnerCollections(db)).some(c => c.id === gid));

    // Services: demo import, create with thumbnail, hide, archive.
    assert.equal(await hasManagedServices(db), false);
    await importDemoServices(db, "owner-1");
    assert.equal((await listStorefrontServices(db)).length, 4);
    assert.equal((await listOwnerServices(db))[0].categoryBn, "ওয়েব ডেভেলপমেন্ট");
    const image = "data:image/png;base64,iVBORw0KGgo=";
    const sid = await createService(db, "owner-1", parseServiceInput({ slug: "automation", titleEn: "Automation", word: "auto", summaryEn: "Less busywork.", status: "published" }), image);
    const live = (await listStorefrontServices(db)).find(s => s.slug === "automation");
    assert.equal(live?.word, "AUTO"); assert.match(live?.image ?? "", /^\/api\/services\/automation\/image\?v=\d+$/);
    assert.equal(await publishedServiceImage(db, "automation"), image);
    await setServiceStatus(db, "owner-1", sid, "hidden");
    assert.equal(await publishedServiceImage(db, "automation"), null);
    await archiveService(db, "owner-1", sid);
    assert.ok(!(await listOwnerServices(db)).some(s => s.id === sid));
    assert.throws(() => parseServiceInput({ slug: "x1", titleEn: "" }), (e: unknown) => e instanceof ProductInputError && e.field === "titleEn");
    assert.throws(() => parseCollectionInput({ slug: "ok-slug", nameEn: "A", preset: "weird" }), (e: unknown) => e instanceof ProductInputError && e.field === "preset");
  } finally { await pg.close(); }
});

test("sample seed fills Caps and Tech once; section switch toggles visibility", async () => {
  const { seedSampleCatalog, sampleProducts } = await import("../src/lib/sample-catalog");
  const { setCollectionStatus } = await import("../src/lib/product-store");
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({ id: "owner-1", name: "Owner", email: "owner@example.com", emailVerified: true });
    const images = Object.fromEntries(sampleProducts.map(s => [s.slug, "data:image/png;base64,iVBORw0KGgo="]));
    assert.equal((await seedSampleCatalog(db, "owner-1", images)).length, 12);
    assert.equal((await seedSampleCatalog(db, "owner-1", images)).length, 0, "re-running adds nothing");
    let live = await listStorefrontProducts(db);
    assert.equal(live.filter(p => p.collectionId === "caps").length, 6);
    assert.equal(live.filter(p => p.collectionId === "tech").length, 6);
    assert.equal(live.find(p => p.slug === "power-bank-20000")?.inStock, false);
    assert.ok(live.every(p => p.image), "every sample has a photo");
    await setCollectionStatus(db, "owner-1", "caps", "hidden");
    live = await listStorefrontProducts(db);
    assert.equal(live.filter(p => p.collectionId === "caps").length, 0, "OFF hides the whole section");
    assert.ok(!(await listStorefrontCollections(db)).some(c => c.id === "caps"));
  } finally { await pg.close(); }
});
