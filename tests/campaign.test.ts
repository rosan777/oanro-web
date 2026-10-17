import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/lib/db/schema";
import { fromDhakaInput, toDhakaInput, formatDhaka } from "../src/lib/dhaka-time";
import { parseCampaignInput, parseProductInput, ProductInputError } from "../src/lib/product-input";
import { createProduct, archiveProduct, ProductStoreError, type CatalogDb } from "../src/lib/product-store";
import { archiveCampaign, createCampaign, listActiveCampaigns, listOwnerCampaigns, setCampaignProducts, updateCampaign } from "../src/lib/campaign-store";

test("Dhaka time conversion is exact and deterministic", () => {
  assert.equal(fromDhakaInput("2026-12-01T09:00")?.toISOString(), "2026-12-01T03:00:00.000Z");
  assert.equal(toDhakaInput("2026-12-01T03:00:00.000Z"), "2026-12-01T09:00");
  assert.equal(fromDhakaInput(""), null);
  assert.throws(() => fromDhakaInput("01/12/2026"));
  assert.equal(formatDhaka("2026-12-25T17:59:00.000Z"), "25 Dec, 11:59 PM");
  assert.equal(formatDhaka("2026-12-25T17:59:00.000Z", "bn"), "২৫ ডিসে, ১১:৫৯ অপরাহ্ণ");
  assert.throws(() => parseCampaignInput({ slug: "x1", nameEn: "X", startsAt: "2026-12-02T00:00", endsAt: "2026-12-01T00:00" }), (e: unknown) => e instanceof ProductInputError && e.field === "endsAt");
});

test("campaign schedule window, attached products, pin order and remove-without-delete", async () => {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as CatalogDb;
  try {
    await migrate(drizzle(pg, { schema }), { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({ id: "owner", name: "Owner", email: "o@example.com", emailVerified: true });
    const base = { nameEn: "P", price: "100", sizes: "One size", status: "published" };
    const a = await createProduct(db, "owner", parseProductInput({ ...base, slug: "aa" }), null);
    const b = await createProduct(db, "owner", parseProductInput({ ...base, slug: "bb" }), null);
    const id = await createCampaign(db, "owner", parseCampaignInput({ slug: "winter-sale", nameEn: "Winter Sale", status: "published", startsAt: "2026-12-01T00:00", endsAt: "2026-12-31T23:59" }), null);
    await setCampaignProducts(db, "owner", id, [{ productId: a, pinned: false }, { productId: b, pinned: true }]);
    assert.equal((await listActiveCampaigns(db, new Date("2026-11-30T17:59:00Z"))).length, 0, "before start (Dhaka)");
    const running = await listActiveCampaigns(db, new Date("2026-11-30T18:00:00Z"));
    assert.equal(running.length, 1, "starts at Dhaka midnight");
    assert.deepEqual(running[0].productSlugs, ["bb", "aa"], "pinned first");
    assert.equal((await listActiveCampaigns(db, new Date("2026-12-31T18:00:00Z"))).length, 0, "after end");
    assert.equal((await listOwnerCampaigns(db, new Date("2026-12-31T18:00:00Z")))[0].phase, "ended");
    await assert.rejects(setCampaignProducts(db, "owner", id, [{ productId: a, pinned: false }, { productId: a, pinned: true }]), (e: unknown) => e instanceof ProductStoreError);
    await setCampaignProducts(db, "owner", id, [{ productId: b, pinned: false }]);
    assert.equal((await db.select().from(schema.product)).length, 2, "removing from a campaign never deletes products");
    await archiveProduct(db, "owner", b);
    assert.deepEqual((await listActiveCampaigns(db, new Date("2026-12-10T00:00:00Z")))[0].productSlugs, [], "archived products drop out");
    const c = (await listOwnerCampaigns(db))[0];
    assert.equal(await updateCampaign(db, "owner", id, parseCampaignInput({ ...c, startsAt: toDhakaInput(c.startsAt), endsAt: toDhakaInput(c.endsAt) }), undefined), false, "round-trip edit changes nothing");
    await archiveCampaign(db, "owner", id);
    assert.equal((await listActiveCampaigns(db, new Date("2026-12-10T00:00:00Z"))).length, 0);
    await assert.rejects(pg.query("UPDATE campaign SET ends_at = starts_at"), "DB rejects end <= start");
  } finally { await pg.close(); }
});
