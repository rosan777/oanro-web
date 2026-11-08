# OANRO redesign integration — local verification report

Date: 2026-11-05 · Environment: localhost only, synthetic local test database (PGlite via
`scripts/dev-db/integration/`), local mail sink, local file storage, no AI / Google / Meta / GA keys.
Dev server: http://localhost:3400 · Production build served locally on :3401 for the lab measurements.

**Nothing was committed, pushed, merged, rebased, deployed or published. Production and its database
were not accessed.** Each check below is marked Passed, Failed, Blocked or Not executed.

## Automated checks

| Check                                           | Result                        | Evidence                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`)                     | Passed                        | 0 errors                                                                                                                                                                                                                                                                                                                |
| ESLint (whole project)                          | Passed                        | 0 errors, 1 warning (pre-existing `<img>` in `src/app/og/product/[slug]/route.tsx`, unchanged from HEAD)                                                                                                                                                                                                                |
| Prettier (`prettier --check .`)                 | Passed                        | All matched files use Prettier code style                                                                                                                                                                                                                                                                               |
| Test suite (`npm test`)                         | Passed except 1 known failure | 88 / 89. The one failure is the pre-existing `rbac.test.ts` drift (migration-seeded Manager role lacks banners, content, discounts, order-labels and customer-notes permissions that the code template lists); it failed before the redesign too and fixing it would widen a live role, so it is left for your decision |
| Production build (`next build`, local env only) | Passed                        | Exit 0, 125 routes, no errors                                                                                                                                                                                                                                                                                           |
| New tests                                       | Passed                        | `workspace.test.ts` 2/2, `search-insights.test.ts` 2/2, `proxy.test.ts` 2/2                                                                                                                                                                                                                                             |
| JUNO tests (`assistant.test.ts`)                | Passed                        | 44/44 after the approved trends tool was added                                                                                                                                                                                                                                                                          |

## Functional checks (real APIs, local database)

| Area                                                           | Result | Evidence                                                                                                                                                                                                                              |
| -------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shop search, filters, quick view, bag                          | Passed | Typo search "keybord" → keyboard; quick view added to the real bag                                                                                                                                                                    |
| Wishlist + compare                                             | Passed | Browser lists, header counts, server wishlist merged on sign-in                                                                                                                                                                       |
| Three-step checkout                                            | Passed | Per-step validation; order OA-3JE162C16B created through `/api/orders`                                                                                                                                                                |
| Account tabs, saved addresses, receipts, newsletter preference | Passed | Address validation 400/200, receipt "Order receipt" + "not a tax invoice"                                                                                                                                                             |
| Workspace end to end                                           | Passed | Project, milestones, approval, INV-2026-0001 (৳25,000 computed server-side); client 404 before invite; invite accepted from mail sink; upload, approve, payment reference; client refused staff confirm (403); owner confirmed → paid |
| Newsletter                                                     | Passed | No consent 400, bad email 400, subscribe, duplicate → "already" (case-insensitive), account toggle both ways, welcome emails only in local sink                                                                                       |
| Compact live search + search insights                          | Passed | Results with thumbnails/prices, keyboard Enter opens highlighted result; counting, redaction and retention covered by tests                                                                                                           |
| Yellow information strip + payment row                         | Passed | 10 approved items, • separator, loops (~84 px/s), pauses on hover/focus, static + wrapped with the Pause-motion switch; bKash/Nagad/COD in their own row with brand colours; EN + BN                                                  |

## Permissions (HTTP status matrix, synthetic users)

| User           | Result                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Anonymous      | Passed: every admin page 307 → sign-in; admin APIs 403; account APIs 401                                      |
| Customer       | Passed: every admin page 404; admin APIs 403                                                                  |
| Sales          | Passed: same access as before the redesign (Today, Orders, Inquiries, Sections); new admin pages/APIs 404/403 |
| Manager        | Passed: same access as before; Projects, Search insights, Newsletter, Case studies 404/403                    |
| Owner          | Passed: all pages 200; case-study POST reaches validation (400); cross-origin write 403                       |
| Role templates | Passed: `projects.*` in no template (test); the pre-existing Manager drift is unchanged                       |

## Responsive, accessibility, SEO, performance

| Check                                                         | Result               | Evidence                                                                                                                                                                                    |
| ------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizontal overflow at 320 / 390 / 768 / 1024 / 1440 px       | Passed (after fixes) | Public pages at all widths, account/checkout at 390/1280, admin at 320/390/768: 0 px overflow. Fixed along the way: footer region control, Software integrations grid, admin table wrappers |
| One h1, alt text, named controls, labelled fields, unique ids | Passed               | 22 pages, 0 issues                                                                                                                                                                          |
| Titles, descriptions, canonical, hreflang                     | Passed               | All checked pages; private pages noindex                                                                                                                                                    |
| Bangla server rendering (`/bn`)                               | Passed (after fix)   | Pre-existing bug fixed in `src/proxy.ts`: the proxy's second pass reset Bangla pages to English; now `lang="bn"` and Bangla canonical; spoofed headers ignored (test)                       |
| Lab performance (production build, local)                     | Passed (lab only)    | Phone: home LCP 424 ms, shop 308 ms, product 988 ms; CLS 0. Not real-user Core Web Vitals                                                                                                   |
| Keyboard: search combobox, quick view dialog, checkout steps  | Passed               | Arrow/Enter/Escape in search; dialog focus and close; step navigation                                                                                                                       |

## Admin in English and Bangla

| Part                                                                                                                                                                                           | Result                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell, menu, language switch, page titles and main intros, Today page, shared error and status messages, report range tabs and cards, all new admin pages, permission catalogue, inquiry board | Passed                                                                                                                                                                                                                                                           |
| Older dashboards (orders, products, sections, campaigns, discounts, services, banners, content and company-profile editors, reports, settings)                                                 | Partly done: about 800 interface strings translated (`src/lib/admin-bangla.ts`, draft for owner review); some messages built inside code expressions are still English. Owner data (names, products, activity entries, company-profile content) stays as written |

## Blocked or not executed

| Item                                               | Status       | Reason                                                                    |
| -------------------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| Real iOS Safari / Android / desktop Safari devices | Blocked      | Not available here; Chromium viewport emulation only                      |
| Google sign-in, real email delivery                | Blocked      | Needs a Google OAuth client and a verified sending domain                 |
| Production file storage for Workspace              | Blocked      | Needs object-storage credentials (local storage refuses to run on Vercel) |
| Real-user Core Web Vitals, live Google indexing    | Not executed | Requires the live site                                                    |
| Reserved-slug check against the live database      | Not executed | Production access not permitted; source and local data have no conflicts  |
| Full WCAG 2.2 AA audit with assistive technology   | Not executed | Automated and keyboard spot checks only                                   |

## Owner items

- Review the draft Bangla (customer side, admin dictionary, permission descriptions).
- Approve the privacy-notice additions for wishlist, search insights and Workspace data before release.
- Provide, when ready: object storage credentials, SMTP with a verified domain, optional Google OAuth client.
- Before any release: confirm no live collection uses `shop`, `software`, `workspace`, `wishlist`,
  `compare`, `services` (or another reserved page address); apply migrations 0020–0021 only with your
  explicit approval.

## Homepage visual system (palette and section restyle)

Local only; nothing committed or published. Copy, order, routes and functionality unchanged. The only
markup change is `className="o-home"` on the homepage `<main>`, which scopes the styles.

| Check                                | Result       | Evidence                                                                                                                                                                                                                                                                        |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Text contrast (AA: 4.5:1, large 3:1) | Passed       | Computed-style sweep at 320 / 375 / 768 / 1024 / 1280 / 1440 px and `/bn`, 118–141 text elements each, 0 failures. Excludes the Studio headline, hidden decoration, the hero product card and the Workspace preview. Fixed: "We are OANRO." and its body text were dark on dark |
| Horizontal overflow                  | Passed       | 0 px on the homepage at those widths and `/bn`; also `/shop`, `/contact`, `/services`, `/software` spot checks                                                                                                                                                                  |
| Keyboard focus                       | Passed       | Real Tab key: yellow ring on dark cards, ink on the yellow card, deep lavender on light sections (checked at 375 px)                                                                                                                                                            |
| Types, lint, formatting              | Passed       | `tsc` clean; ESLint clean on `page.tsx`; Prettier clean on changed files                                                                                                                                                                                                        |
| Full test suite and production build | Not executed | Not rerun for this change (CSS tokens plus one class name)                                                                                                                                                                                                                      |
