# OANRO — Future upgrades (single roadmap)

This is the one authoritative list of planned and proposed work. It lives inside the project.
**Maintenance rule:** when a related feature changes, review this file and the current docs
(`DEVELOPER_HANDOFF.md`, `README.md`) and update both in the same change.

Rules for reading it:

- **[Planned]** = already written down in an existing doc (source given). Priority = none stated.
- **[Suggested]** = new suggestion or inferred priority by the cleanup pass, **not** an agreed plan.
- Current bugs and limitations are NOT listed here. They are in `DEVELOPER_HANDOFF.md` →
  "Known limitations and deferred findings" and in the review docs.
- Original planning sections in the source docs were left untouched. Nothing was deleted.

## 1. Planned (from existing docs)

| #   | Item                                                                                                         | Source                                                         | Prerequisites / risks                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| P1  | Approve frontend, replace placeholder content (AI images, sample prices, sizes), English/Bangla localization | README.md "Next milestones" 1                                  | Placeholder media are not real stock. Replace before accepting real orders.                 |
| P2  | Products/variants/stock/suppliers and staff authorization                                                    | README.md "Next milestones" 2                                  | Needs the database; partly built in M2.x (see `docs/M2-*.md`).                              |
| P3  | Secure admin: configurable sections, scoped roles, limited delegation, second approvals, audit history       | README.md 3; `docs/M2-FOUNDATION.md`                           | Do not enable staff operations until these checks exist. Audit covers Owner bootstrap only. |
| P4  | Server-priced carts/orders, delivery zones, combined charges, multi-shipment tracking, guest access          | README.md 4                                                    | Money logic must be deterministic and server-side.                                          |
| P5  | Approved payment gateway with verified, idempotent webhooks                                                  | README.md 5                                                    | Never trust browser payment messages. Needs gateway choice and keys.                        |
| P6  | Inquiries, support requests, refund/return workflows, email updates, verified delivered-and-paid reviews     | README.md 6                                                    | Needs working mail sender (sender must be verified; see section 3).                         |
| P7  | Reporting, backup/restore, monitoring, security tests, accessibility/device testing, launch checks           | README.md 7                                                    | Real Safari/iOS/Android/Windows testing is still required before launch.                    |
| P8  | AI forecasts, if ever added, labelled as estimates and never overriding financial records                    | README.md (after milestones)                                   | Financial figures must come from authoritative records.                                     |
| P9  | Staff roles beyond Owner: arbitrary role names, departments, seven permission dimensions, delegation         | `docs/M2-FOUNDATION.md`, `docs/M2-PRODUCT-MANAGEMENT.md`       | Partly superseded by RBAC code (`src/lib/permissions.ts`); re-check what is still open.     |
| P10 | Owner transfer / emergency recovery as an audited workflow                                                   | `docs/M2-FOUNDATION.md`                                        | Must be audited; never delete ownership to bypass checks.                                   |
| P11 | Audit for auth events and all business mutations                                                             | `docs/M2-FOUNDATION.md`                                        | Currently Owner bootstrap only (as of that doc).                                            |
| P12 | Retention/deletion policy for sessions, tokens, IP/user-agent, rate-limit rows, audit records                | `docs/M2-FOUNDATION.md`                                        | Do not enable exports/deletion workflows before it is decided.                              |
| P13 | Hosted media storage instead of photos in the database (about 190 KB each)                                   | `docs/M2-PRODUCT-MANAGEMENT.md` "Known limits"                 | New dependency/service; migration of existing photos.                                       |
| P14 | Live news ingestion for Global Pulse (now manual curation only)                                              | README.md (M2.2 note)                                          | Licensing and moderation.                                                                   |
| P15 | Assistant: try provider adapters and tool-calling with real keys; real-device voice tests                    | `docs/assistant-handover.md` "Not verified" 1–2                | Needs a Groq key (rotate the one pasted in chat). Turnstile code is untested.               |
| P16 | Assistant: confirm free-tier commercial use (Groq, Cloudflare); Cloudflare backup                            | `docs/assistant-handover.md` 3; `docs/assistant-go-live.md` §8 | Terms review; Vercel Hobby is non-commercial.                                               |
| P17 | Assistant: legal review of privacy notice (voice/weather send data to third parties)                         | `docs/assistant-go-live.md` §8                                 | —                                                                                           |
| P18 | Admin: horizontal-scroll wrapper for the four `disc-table` tables on `/admin/assistant` (phones)             | owner's deferral (project memory); also in handoff             | UI change, needs approval.                                                                  |

## 2. Deferred review findings (not yet fixed; from `docs/review/`)

These are open findings, kept here as a work list. Details and severity are in the source files.

- Auth (`02-auth-first-findings.md`): #4 mail send awaited in callbacks (timing); #5 account linking disabled; #6/#9 rate limit buckets and client-IP trust.
- API/admin/assistant (`04-…`): F2 newsletter has no double opt-in; F3 role drift between migrations and `permissions.ts` (also the cause of the failing RBAC test); F4 account delete flow; F5 hard-coded fallback secrets (confirm `BETTER_AUTH_SECRET` is set live); F8 rate limiter fails open without IP; F10 shared daily AI budget; F11 unsubscribe is a GET; F12 CSP allows inline scripts/styles; F13 admin Origin check; F14 dev-only drizzle-kit/esbuild advisories.
- Data/SEO/performance (`05-…`): F15 staff notes not erased on customer deletion; F16 Meta CAPI trusts client consent flag; F17 cart-reminder email legal basis; F20 no `noindex` meta on sign-in/account/reset pages; F21 all HTML uncached (locale from header); F23 2FA policy fails open on DB error; F24 discount check reveals exact reason.
- Unused code kept on purpose: `analytics.tsx` (would load GA without consent), `AdminBack` in `admin-nav.tsx`.

## 3. Pre-launch checklist items (from existing docs)

Verify on the real host before opening the shop: trusted client-IP forwarding, SMTP/Resend sender on own
domain, Google OAuth redirect URIs, password-reset expiry/single use, PostgreSQL TLS/pooling, backup
restore rehearsal, `CRON_SECRET`, `BETTER_AUTH_SECRET`, `GROQ_API_KEY`, production migration
`0018_assistant.sql`. Sources: `docs/M2-FOUNDATION.md`, `docs/assistant-go-live.md`, memory notes.

## 4. Suggested (new, not agreed — cleanup pass)

- [Suggested, high] Fix the stale `tests/rbac.test.ts` expectation (or `permissions.ts` template) so `npm test` is fully green. Needs a decision on which side is right.
- [Done 2026-11-01, release audit] All `.next-*` build folders are now in `.gitignore` and the ESLint ignores.
- [Suggested, medium] Remove or archive stale root files after owner approval: `dev.log`, `OANRO-All-Code.md` (both untracked, not git-ignored; old snapshot/log), `.env.local.live-backup` (secrets; keep out of git).
- [Suggested, low] Split the largest components (`orders-dashboard.tsx`, `home-v2.tsx`, `content-editor.tsx`, `product-dashboard.tsx`, `checkout-form.tsx`). Already noted as out of scope in the handoff.
- [Suggested, low] Make homepage extra-section texts editable in admin (currently written in component files).
- [Suggested, low] Replace manual `tests/smoke.cjs` (needs uninstalled Playwright) with a maintained smoke test.
