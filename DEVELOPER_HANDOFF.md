# OANRO developer handoff

Written 2026-10-29 after a readability pass (comments only, plus four local renames). The README
covers history and milestones. This file explains where things are and how to work on them safely.

## Stack

- Next.js 16 (App Router) with React 19 and TypeScript. Read `node_modules/next/dist/docs/` before
  using Next APIs: this version differs from older guides (for example, `src/proxy.ts` replaces
  middleware).
- PostgreSQL through Drizzle ORM (`src/lib/db/schema.ts`; migrations in `drizzle/`).
- Better Auth for sign-in, email verification and two-step codes (`src/lib/auth*.ts`).
- Tailwind 4 plus hand-written CSS (`src/app/*.css`), Prettier (`.prettierrc.json`) and ESLint
  (`eslint.config.mjs`).
- Hosted on Vercel. Daily cron jobs are listed in `vercel.json`.

## Project structure

| Path                 | What it holds                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`           | Pages, layouts and route handlers. `layout.tsx` is the shell of every page; `page.tsx` is the homepage.                                       |
| `src/app/api/`       | JSON endpoints. Admin endpoints live under `api/admin/` and use `adminHandler` or `authorize` from `src/lib/admin-api.ts`.                    |
| `src/app/admin/`     | Admin pages. Each one calls `requireAdminPage` (`src/lib/admin-guard.ts`); `admin/layout.tsx` adds the side menu.                             |
| `src/lib/`           | Server and shared logic: `*-store.ts` read and write the database, `*-input.ts` validate forms, `*-data.ts` hold content shapes and defaults. |
| `src/lib/assistant/` | The JUNO shopping assistant. `engine.ts` handles one chat turn; `server.ts` wires up the real data sources.                                   |
| `src/components/`    | React components. Most files start with `"use client"`.                                                                                       |
| `tests/`             | `*.test.ts` run with `npm test` against an in-memory PGlite database. The `*.cjs` files are manual Playwright checks.                         |
| `scripts/`           | One-off scripts: owner bootstrap and sample-data seeds.                                                                                       |
| `docs/review/`       | Review notes. `07-readability-pass.md` is the per-file checklist for this pass.                                                               |

## Entry points

- `src/proxy.ts` serves Bangla pages under `/bn/...` by rewriting them to the same page and sending
  the language in a request header (read with `requestLocale()` in `src/lib/request-locale.ts`).
- `src/app/layout.tsx` loads site content, storefront data and section switches, then renders the
  header, footer, privacy center and assistant.
- `src/lib/store-products.ts` provides storefront data: database rows, cached across visitors
  (`src/lib/storefront-cache.ts`), with the demo catalog as a fallback when no database is set.

## Main workflows

**Shopper**

1. Browse: homepage (`src/app/page.tsx`, `src/components/home-v2.tsx`), category pages
   (`src/app/[collection]/page.tsx`), product pages (`src/app/products/[slug]/page.tsx`,
   `src/components/product-detail.tsx`) and search (in `src/components/shell.tsx`, using
   `src/lib/smart-search.ts`).
2. Bag: kept in localStorage (`src/lib/cart.ts`).
3. Checkout (signed in): `src/components/checkout-form.tsx` posts to `src/app/api/orders/route.ts`.
   That calls `createOrder` in `src/lib/order-store.ts`, which re-checks prices, reserves stock and
   records the order.
4. Follow the order: My account (`src/app/account/page.tsx`) or public tracking
   (`src/app/track/page.tsx` → `src/app/api/order-status/route.ts`).
5. Inquiries: `src/components/inquiry-form.tsx` → `src/app/api/inquiries/route.ts` →
   `src/lib/lead-store.ts`.

**Staff and owner**

1. Payment review and delivery: `src/app/admin/orders` and `src/components/orders-dashboard.tsx`
   → `src/app/api/admin/orders/route.ts`. Order emails are sent by `src/lib/order-notify.ts`.
2. Catalog: `src/app/admin/sections` and `src/components/product-dashboard.tsx` →
   `src/app/api/admin/products` and `src/app/api/admin/collections` → `src/lib/product-store.ts`.
3. Website content, company profile and banners: `src/components/content-editor.tsx`,
   `src/components/company-profile-editor.tsx` and `src/components/banner-manager.tsx`.
4. Staff and permissions: `src/lib/permissions.ts` (catalog) and `src/lib/rbac.ts` (checks,
   invites, roles). Access is denied by default; the owner bypasses role checks.
5. Reports: `src/lib/report-store.ts` and `src/app/admin/reports/*`.
6. Activity log: almost every admin write inserts an `audit_event` row; it is shown at
   `src/app/admin/activity`.

## Data flow and shared modules

- Validation (`src/lib/*-input.ts`) throws `ProductInputError`, and store functions throw
  `ProductStoreError`. `src/lib/admin-api.ts` turns both into HTTP status codes.
- Any admin write that changes what shoppers see calls `storefrontChanged()` to clear the cache.
- Owner-edited site content, the company profile and settings are stored as JSON values in the
  `store_setting` table (`src/lib/site-content.ts`, `src/lib/company-profile.ts`).
- Images are stored as validated base64 data URLs and served through `/api/.../image` routes.

## Responsive and platform-specific behavior

- Phones and touch screens:
  - The bottom tab bar (`src/components/bottom-bar.tsx`, shown on phones by CSS).
  - The announcement toast (`src/components/announce-toast.tsx`, for `max-width: 1024px`, `hover: none` or `pointer: coarse`).
  - The sticky buy bar (`StickyBuy` in `src/components/buy-box.tsx`).
  - The full-screen assistant sheet (`max-width: 640px` in `src/components/assistant-widget.tsx`).
  - Mega-menu hover only applies when `(hover: hover)` matches (`shell.tsx`).
- Desktop only: the cursor ring (`CustomCursor` in `src/components/site-extras.tsx`, needs
  `pointer: fine`) and the photo zoom in `product-detail.tsx`.
- Motion: `src/components/experience.tsx` combines the visitor's reduced-motion setting with the
  site's "Pause motion" switch (`useMotion().allowed`). Every animation checks it.
- Admin refinement: the end of `src/app/admin/admin.css` holds the admin-only polish (one menu accent,
  clear keyboard focus, bigger touch targets on phones, and a work area that never grows wider than
  the screen).
- Breakpoints and layout rules live in `globals.css`, `v2.css`, `assistant.css`, `admin/admin.css`
  and `company-profile/company-profile.css`. Section comments in each file mark the major groups.

## Development and validation commands (verified 2026-10-29)

```bash
npm run dev            # dev server (uses .next)
npm run typecheck      # tsc --noEmit
npx eslint src         # lint (bare `npx eslint` also scans untracked build folders such as .next-sink/)
npm test               # Node test runner with PGlite; about 1–2 minutes
npx prettier --check . # formatting
npm run format         # apply Prettier
npm run db:generate    # new migration after editing src/lib/db/schema.ts
```

`.env.local` points at a hosted database, which may be production. Do not run migrations or tests
against it. The tests create their own in-memory database.

## Known limitations and deferred findings

- Baseline test failure (present before this pass): "RBAC: deny by default…" in `tests/rbac.test.ts`.
  The expected permission list in the test no longer matches `src/lib/permissions.ts`.
- `npx eslint` (with no path) lints the untracked `.next-sink/` folder and reports thousands of
  warnings there. Lint `src` only, or add `.next-sink/**` to the ignores.
- Extra homepage sections: the components that were once unused (`CategoryTiles`, `TrustStrip`,
  `DoubleConveyor`, `ServiceConveyor`, `StandardPanel`, `ValueFan`, `FeatureStory`, `HowWeWork`) now
  have on/off switches in Admin → Website content → "Sections on/off" → "Extra homepage sections".
  They are all off by default (`offByDefault` in `src/lib/site-content-data.ts`), so the public
  homepage is unchanged until the owner turns one on. They are drawn in `src/app/page.tsx`. Their
  text is still written in the component files, not editable in admin.
- Google Analytics has a switch too (Marketing group). It controls the loader inside
  `privacy-center.tsx`, which runs only after the visitor allows analytics. The older `Analytics`
  component in `analytics.tsx` is still unused: it would load without asking for consent.
- Who can use the switches and edit texts: anyone with `content.manage` (the owner always can). The
  Payment & delivery page and role editing stay owner-only on purpose.

- `src/components/admin-nav.tsx` (`AdminBack`) renders nothing but is still imported by admin pages.
- `tests/smoke.cjs` is a manual browser check that needs Playwright, which is not installed. (The
  old `tests/motion.cjs` was removed because it looked for controls that no longer exist.)
- The biggest components (`orders-dashboard.tsx`, `home-v2.tsx`, `content-editor.tsx`,
  `product-dashboard.tsx`, `checkout-form.tsx`) are still single large functions. Splitting them
  was out of scope for this pass.
