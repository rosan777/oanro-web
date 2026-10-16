# M2.3 Product management — 16 October 2026

Owner-managed catalog in PostgreSQL, replacing the hardcoded product list.

## What changed
- **Database:** migration `0003_product_catalog` adds the `product` table: bilingual text, price (BDT, integer), optional stock, sizes, specifications, optional photo, `draft` / `published` / `hidden` status, display order, and `archived_at` for soft delete. Database checks reject negative prices/stock and unknown statuses. Additive only: no existing table is changed.
- **Admin (`/admin`):** add, edit, publish/hide, archive products; upload a photo (resized in the browser to 800px JPEG, metadata stripped, re-validated on the server); import the four demo products to edit them.
- **Audit:** every create, update (with the list of changed fields), status change, archive and demo import writes an `audit_event` row in the same transaction.
- **Storefront:** all product listings, search, the bag and product pages read from one shared catalog. Photos are served by `/api/products/<slug>/image` for published products only.
- **Fallback:** the demo list is shown only when no database is configured, the migration has not run, or the owner has never added a product. Other database errors show no products rather than resurrecting hidden ones.
- **Security:** same pattern as existing admin APIs — verified owner session, same-origin check, 400 KB body limit, strict input validation (`src/lib/product-input.ts`).

## Verification
| Check | Result |
| --- | --- |
| TypeScript | Passed |
| ESLint | Passed, 0 warnings |
| Tests | 9/9 passed (`npm test`): 7 existing + 2 new in `tests/product-catalog.test.ts` |
| Migration | Applied twice on in-memory PostgreSQL (PGlite) with no errors; DB-level checks verified |
| Production build | **Not yet run** — needs `npm run build` on the Mac |
| Browser test | **Not yet run** — admin flow and storefront need checking on localhost |
| Drizzle snapshot | Hand-written; confirm with `npm run db:generate` (expected: no schema changes) |

## Known limits
- Archived slugs stay reserved (the slug stays unique so old links never point to a different product).
- Home page feature stories still link to `/products/forest-knit` and `/products/studio-headphones`; archiving those products makes those links show "not found".
- Conveyor cards show English names; Bangla product text is used on the product page.
- Photos are stored in the database (up to ~190 KB each). Hosted media storage is deferred.
- No staff roles yet: only the system owner can manage products.

# M2.4 Sections, services, stock — 16 October 2026

- **Admin hub (`/admin`):** one card per section. Product sections → `/admin/sections/<id>`, Services → `/admin/services`, Global Pulse → `/admin/pulse`.
- **Sections (`product_collection`, migration `0004`):** Seasonal collection, Caps collection and Tech items are built in; the owner can create more (e.g. a second tech section). Each has names/texts (EN/BN), type (sets the category list), Draft/Published/Hidden, and display order. Built-in sections can be hidden, not archived; custom sections can be archived when empty. Caps/Tech visibility moved here from the old site switches (migration copies their current state).
- **Categories:** fixed lists per section type with Bangla labels (`src/lib/categories.ts`), plus “Other…” for custom labels.
- **Services (`service` table):** add, edit, hide, archive, optional thumbnail; import the 4 built-in services to edit them.
- **Out of stock:** admin sets In stock / Out of stock (one click). Customers see an “Out of stock” badge on cards, the product page and the bag; the stock count is never sent to the browser. Out-of-stock bag items are excluded from the subtotal.
- **Products are public only when both the product and its section are published.**
- **Price display:** `formatPrice` no longer uses Intl currency data, fixing the hydration error (server “BDT 4,990” vs browser “4,990৳”). Now `৳4,990`, lakh grouping, Bangla digits in Bangla mode.

| Check | Result |
| --- | --- |
| TypeScript / ESLint | Passed, 0 warnings |
| Tests | 11/11 (`npm test`) |
| Migration 0004 | PGlite (twice) + rehearsed on a Neon branch copy of production data: sections and product placement as expected |
| Build / browser | Pending on the Mac |
