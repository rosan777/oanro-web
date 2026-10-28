# Baseline and scope (2026-10-28)

## Which versions exist (verified with Git, nothing assumed)

| Name | Commit | Meaning |
|---|---|---|
| `main` (local) | `15568e2` | Current work. Two commits ahead of `origin/main`, **not pushed**. Adds JUNO assistant and security/rate-limit work. |
| `origin/main` | `5784f4e` | Last pushed version (candidate "old" version; owner must confirm). |
| `backup/pre-review-2026-10-28` | `15568e2` | Local safety tag created before the review. Not pushed. |
| `work/global-pulse-thumbnail` | `836097e` | Side branch, diverged from `origin/*` (ahead 1, behind 19). |
| `origin/admin-side-menu-today`, `feat/product-management`, `language-switch-demo`, `password-8-customer-email` | older | Old feature branches, already part of main's history by date. Not verified as merged. |

No Git tags existed. Working tree was clean except two untracked, excluded files.

## Stack (from `package.json`, `vercel.json`, `next.config.ts`)

Next.js 16 (App Router) + React 19, TypeScript, Tailwind 4, Drizzle ORM on PostgreSQL (Neon, via `pg`),
better-auth 1.7.7 (Google OAuth optional), nodemailer (SMTP), Vercel AI SDK with Groq / Cloudflare (JUNO assistant),
Vercel cron jobs: `/api/cron/bag-reminders`, `/api/cron/assistant-cleanup`.

## Secret exclusions

Never read: `.env.local`, `.env.local.live-backup`, `dev.log`, `OANRO-All-Code.md`, `.claude/`, `scripts/dev-db/`.
The inventory (`00-file-inventory.md`) is built only from `git ls-files`.
History check: the only secret-like file ever tracked is `.env.example` (placeholders only).
Pattern scan of tracked files: only `tests/assistant.test.ts` matched; values are short fake fixtures (checked by length only).
**Not verified:** that the owner's real Groq key (pasted in chat earlier) is absent from Git, because that check needs reading `.env.local`.
Recommendation: rotate that key anyway.

## Baseline results (before any change)

| Check | Result |
|---|---|
| `tsc --noEmit` | pass |
| `eslint` | pass, 3 warnings (`<img>` in `og/product/[slug]/route.tsx`, `content-editor.tsx`; one unused disable directive) |
| `npm test` (64 tests, in-memory PGlite) | 63 pass, **1 fail**: `tests/rbac.test.ts` manager permissions |
| `next build` | pass (separate dist dir, fake local `DATABASE_URL`, no live services) |

### Existing failure: RBAC test
The test compares the roles seeded by the migrations with the role templates in `src/lib/permissions.ts`.
The code template for `manager` includes `banners.manage`, `content.manage`, `customers.notes`, `discounts.manage`, `orders.labels`;
the migrated database role does not (`actual` in the test output is the database, `expected` is the template).
Permissions were added on 2026-10-22 ("granular role permissions") without a migration granting them to Manager.
See `04-api-admin-assistant-review.md`, F3. This is a business rule, so the owner must decide before any change.
