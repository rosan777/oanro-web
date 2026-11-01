# Release readiness — 2026-11-01

**Recommendation: GO** (was CONDITIONAL GO) — the owner approved the go-live steps on 2026-11-01 and
the production conditions C1–C4 below are done. Nothing here claims "zero bugs" or full coverage;
unverified items are listed.

## Go-live actions on production (2026-11-01, owner-approved)

- Backup of the changed rows (activity log, demo products, site content) saved outside the repo:
  `~/oanro-golive-backup-2026-11-01.json` (owner-only file permissions).
- Migration `0019_audit_owner_purge` applied with `npm run db:migrate` (20/20 migrations).
- 3 hidden demo products (`demo-classic-cap`, `demo-pearl-necklace`, `demo-winter-knit-beanie`) archived
  with the app's `archiveProduct`; the homepage "featured product" setting that pointed at one was reset.
  The live catalog now has one published product: `ribbed-high-neck-sweater`.
- Activity log cleared with the app's `deleteAuditEntries` (92 entries removed; one "audit.clear" entry remains).
- Vercel production: `OANRO_STORE_LIVE=true` set; `CRON_SECRET` newly generated and set through the Vercel CLI
  (value never printed). `GROQ_API_KEY` is **not** set: `.env.local` has no Groq key to copy. Production
  already has the Cloudflare Workers AI keys, so JUNO uses Cloudflare; add a fresh Groq key later if wanted.
- Owner to-do: the live "Seasonal" section description still says "Sample products, made for exploration."
  Change it in Admin → Products & sections now that the shop is selling.

## Scope

| Item              | Value                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live (production) | `main` @ `a04c55a`, Vercel deployment `dpl_4mA8XibeWn8APsa699UJNdEn6GH1` (READY)                                                                                                                              |
| Audited code      | branch `chore/prettier-format` @ `090e3ae` (Prettier commit) + uncommitted work: readability comments, JUNO site-knowledge, owner "delete activity" feature (migration 0019), admin redesign CSS, audit fixes |
| Stack             | Next.js 16.4 (App Router, Turbopack), React 19, Drizzle + PostgreSQL (Neon), Better Auth, Vercel, Groq/Cloudflare AI (optional)                                                                               |
| Test environment  | Local only: throwaway PGlite DB, local SMTP sink, generated test accounts. Production DB, payments and real users were not touched.                                                                           |

## Results

| Check                                          | Result                     | Evidence                                                                                                        |
| ---------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Clean install from lockfile (`npm ci`)         | PASS                       | fresh copy of final code                                                                                        |
| Production build (`next build`)                | PASS                       | 48 static pages, all routes compile                                                                             |
| Typecheck (`tsc --noEmit`)                     | PASS                       |                                                                                                                 |
| Lint (`eslint`)                                | PASS (0 errors, 1 warning) | was 1,718 errors, all from `.next-*` build folders (fixed config)                                               |
| Prettier                                       | PASS                       |                                                                                                                 |
| Unit/integration tests (`npm test`)            | 79/80                      | only `tests/rbac.test.ts` fails — pre-existing, fails on live code too (role template vs migrations, review F3) |
| Sign-in / wrong password / sign-out            | PASS                       | 200 / 401 / 200                                                                                                 |
| Role permissions (owner, customer, signed-out) | PASS                       | admin pages 200 / 404 / redirect to sign-in; admin APIs 403 for non-owners                                      |
| Cross-site requests (CSRF/Origin)              | PASS                       | admin DELETE and order POST from another origin → 403                                                           |
| Activity-log delete (new)                      | PASS                       | owner only, confirm required, bad/unknown id 400/404; raw SQL DELETE/UPDATE still blocked by trigger            |
| Checkout: server pricing, stock, size, method  | PASS                       | tampered price 409, out of stock 409, bad size 409, disabled method 409                                         |
| Duplicate submission                           | PASS                       | parallel identical orders → 1 created + `TRX_USED`; UI double-click → 1 order                                   |
| Full UI checkout → admin approve → emails      | PASS                       | order placed in browser, approved in admin, owner + customer mails sent to sink                                 |
| XSS in order fields                            | PASS                       | `<script>`/`<img onerror>` shown as text in admin; only raw-HTML sink is escaped JSON-LD                        |
| Exports (CSV)                                  | PASS                       | owner 200, customer/anon/cross-site 403                                                                         |
| Phone width 375px (18 public + 19 admin pages) | PASS                       | no horizontal overflow                                                                                          |
| SEO: titles, descriptions, canonical, hreflang | PASS                       | en + `/bn` pages, `noindex` on 404/account/checkout/admin                                                       |
| robots.txt / sitemap.xml / product feed        | PASS                       | admin/account/api disallowed; feed empty until products are live                                                |
| Structured data / social previews              | PASS                       | Organization + WebSite JSON-LD, OG + Twitter tags                                                               |
| Security headers (local + live)                | PASS                       | CSP, HSTS preload, X-Frame-Options, nosniff, Referrer/Permissions-Policy                                        |
| Cron endpoints                                 | PASS (fail closed)         | live `/api/cron/bag-reminders` → 401                                                                            |
| Secrets in tracked files                       | PASS                       | none found; `.env*` ignored                                                                                     |
| Dependency audit                               | PASS for runtime           | moderate advisories only in dev tool `drizzle-kit` → esbuild (review F14)                                       |
| Lighthouse (lab, local prod build, 4 pages)    | see below                  |                                                                                                                 |

Lighthouse lab results (simulated, not real-user Core Web Vitals):

| Page            | Mobile perf / a11y / BP / SEO | Mobile LCP | Desktop perf / a11y |
| --------------- | ----------------------------- | ---------- | ------------------- |
| `/`             | 84 / 100 / 100 / 100          | 4.4 s      | 98 / 97 → fixed     |
| product page    | 83 / 100 / 100 / 100          | 4.8 s      | 98 / 100            |
| company profile | 83 / 100 / 100 / 100          | 4.4 s      | 99 / 100            |
| `/caps`         | 84 / 95 → fixed / 100 / 100   | 4.6 s      | 99 / 95 → fixed     |

## Fixes made

1. **Checkout asked for privacy consent twice** (two identical required checkboxes; also on the live
   site). Removed the duplicate — `src/components/checkout-form.tsx`.
2. **Admin sidebar said "checkout is off" in preview mode, but checkout works** once a payment number
   is saved (`OANRO_STORE_LIVE` only hides prices from Google). Text corrected — `src/components/admin-shell.tsx`.
3. **Accessibility:** language button name now includes the visible code ("EN – Change language")
   — `src/components/locale.tsx`; two small labels raised to WCAG AA contrast — `src/app/v2.css`
   (studio terminal title 4.0 → 5.3:1), `src/components/conveyor-effects.module.css` (card back label 3.5 → 4.7:1).
4. **Lint/git hygiene:** all `.next-*` build folders ignored by ESLint and git — `eslint.config.mjs`, `.gitignore`.
5. **Regression tests:** `tests/release-audit.test.ts` (one consent box, label-in-name, no "checkout is off").

**Removals:** only the duplicate consent block above. Nothing else was deleted. Audit tooling, test
database, test accounts and mail log live outside the project (scratchpad) and are not part of the change.
Kept on purpose (not part of the release commit): untracked `dev.log` and `OANRO-All-Code.md` (owner's files).

## Conditions and remaining blockers

| #   | Item                                                                                                                                                                                                                                                                                                                                                                      | Severity                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| C1  | ✅ Done 2026-11-01. **Apply `drizzle/0019_audit_owner_purge.sql` to production** (owner approval needed; it only replaces the `reject_audit_mutation` trigger function). Without it the new "delete activity" button fails with an error; everything else works. It is safe to run before deploying (old code never deletes).                                             | Required for the new feature |
| C2  | ✅ Done 2026-11-01. **`CRON_SECRET` was not set on Vercel**, so the daily jobs never run: abandoned-bag reminders and the assistant's 30-day chat cleanup. Set it before switching JUNO on (the privacy notice promises 30-day deletion).                                                                                                                                 | High (before JUNO goes on)   |
| C3  | ✅ Done 2026-11-01 (`OANRO_STORE_LIVE=true`). **Storefront banner said "Design preview: ordering opens soon"** while `OANRO_STORE_LIVE` is unset, yet orders are accepted as soon as a bKash/Nagad number is saved in admin. Owner decision: set `OANRO_STORE_LIVE=true` when selling, or keep payment numbers empty until then. Sample products/prices must not be sold. | Medium (truthful claims)     |
| C4  | Still open: `GROQ_API_KEY` not set (no key available; Cloudflare AI keys are set). Previously (JUNO answers from site knowledge only; voice auto-detect off). Google OAuth keys not set (email sign-in only).                                                                                                                                                             | Info                         |
| C5  | `tests/rbac.test.ts` still fails (pre-existing): decide whether the Manager role template or the test is right.                                                                                                                                                                                                                                                           | Medium                       |
| C6  | `/caps` and `/tech`: product cards are `h3` directly under the page `h1` (heading-order hint).                                                                                                                                                                                                                                                                            | Low                          |

## Not verified (no access or out of scope)

- Real iOS/Android/Safari/Firefox devices (only Chromium desktop + 375px emulation).
- Neon backup restore rehearsal (the production migration and clean-up were run and checked read-only afterwards).
- Real email delivery via the live SMTP/Resend sender; Google OAuth; 2FA enrolment flow.
- Search Console, Google Ads, Merchant Center, GA4, Meta Pixel — **not installed live** (no GA ID, Pixel ID empty), so tracking/consent-to-tag checks are not applicable. No indexing or ranking is claimed.
- Real-user Core Web Vitals (only lab Lighthouse); load/capacity testing.
- Real bKash/Nagad payments (manual verification flow; no payment gateway or webhooks exist).
- JUNO with live AI keys and voice.

## Deploy, smoke test and rollback

Deploy = merge to `main` and push; Vercel builds production from `main`.

1. Migration 0019 on production — done 2026-11-01.
2. Push; wait for the Vercel deployment to be READY.
3. Smoke test on https://oanro.com: home, `/bn`, a product page, `/caps`, `/sitemap.xml`, `/robots.txt` → 200;
   `/admin` signed out → redirect to sign-in; owner sign-in → `/admin/orders` loads; checkout shows **one** consent box;
   Admin → Activity log → delete one entry works (after C1); `/api/cron/bag-reminders` → 401.
4. Check Vercel runtime errors for the first hour.

**Rollback:** Vercel → Deployments → promote `dpl_4mA8XibeWn8APsa699UJNdEn6GH1` (commit `a04c55a`), or
`git revert` the release commits on `main` and push. Migration 0019 does not need reverting (old code is unaffected).
