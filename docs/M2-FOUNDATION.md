# M2.1 — identity foundation

Authority: Project-1-Dark-Box-Launch-Plan.md and the Owner's subsequent explicit decisions. On 14 October 2026 the Owner approved Drizzle + Better Auth. PRA account is processing; no live payment functionality is introduced here.

Baseline: user-supplied GitHub ZIP, archive commit be19fbd045266182d6abc526931fc1d4171890b6. This is an implementation patch against that snapshot, not proof that remote main is still at that commit. Review and merge through GitHub. No remote push or Vercel deployment was performed.

## Scope and behaviour

- Adds PostgreSQL schema and reviewed SQL migrations for authentication, one system Owner, initial audit events and database-backed authentication rate limiting.
- Adds verified email/password registration, sign-in, password reset, sign-out and optional configured Google sign-in. Google + password remain the approved launch requirement; hiding an unconfigured Google button is not completion of that requirement.
- Adds /sign-in, /reset-password, /account and /admin. About menu includes My account. Existing demo cart and catalog stay functional; no checkout is claimed.
- Auth is disabled by default. Disabled /api/auth/* returns 503, and protected pages redirect to sign-in. No database or auth secrets are required just to build/render the original storefront.
- Ordinary registration cannot set roles or ownership. Only an operator with database access can bootstrap an already verified user as the first Owner, once. Owner creation and audit insertion are atomic.
- The Owner entry is an initial protected workspace, not a staff management dashboard. Future arbitrary role names, departments, seven permission dimensions, delegation and second approvals remain mandatory M2 work. Do not enable staff operations until those checks exist.
- Audit currently covers Owner bootstrap only. Auth events and future business mutations need their own audited integrations; this patch does not claim the full audit module is complete.
- Initial implementation defaults: password minimum 12/max 128 characters; sessions expire in seven days; reset revokes sessions; cookie cache disabled so server checks session records. No implicit account linking. Review these defaults before activation; do not silently weaken them.

## Apply safely on Ubuntu

Start in the existing project directory containing package.json. Save/commit your current work first. Create a working branch:

```bash
git switch -c m2/identity-foundation
```

The supplied patch ZIP contains only new/changed project files and an APPLY-M2.md manifest. Extract it separately; merge its project/ folder contents (including .env.example) into this project. Do not replace/delete the entire src folder. If your branch has moved beyond the archive commit, review overlapping file changes before merging.

```bash
npm ci
npm run test:foundation
npm run lint
npm run typecheck
npm run build -- --webpack
```

The archive does not include node_modules, build output, real secrets, or a replacement .git folder. Preserve your actual GitHub repository history. Review git diff and commit/push your branch when satisfied. Main/production is not automatically updated by downloading this patch.

## Configure a development database and mail

Choose a PostgreSQL service or local instance. No hosting provider or paid plan has been selected/purchased. Use a development database first. Copy missing entries from .env.example into your existing .env.local; do not overwrite existing settings. Keep secrets out of Git/chat.

- DATABASE_URL: development PostgreSQL connection; use verified TLS per provider instructions for remote databases. Never disable certificate verification to work around errors.
- BETTER_AUTH_URL: exact origin such as http://localhost:3000, HTTPS in production. No wildcard trusted origins.
- BETTER_AUTH_SECRET: generate locally with `openssl rand -base64 48`.
- SMTP_URL and AUTH_EMAIL_FROM: your chosen transactional SMTP service, or a local mail-capture server for testing. Reset/verification emails must be deliverable before customer signup is enabled. No mail provider is selected by this patch.
- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: server-side Google OAuth credentials; register the exact callback `<BETTER_AUTH_URL>/api/auth/callback/google` in Google. Local and production callbacks must match their environments. Test the real consent flow before launch.

Review drizzle/*.sql, back up any nonempty database, then run:

```bash
npm run db:migrate
```

Do not run db:generate to apply existing migrations and do not use schema-push shortcuts in production. Drizzle's migration journal prevents reapplying completed migrations. If the database is already populated with other auth tables, stop and plan a reconciliation/backfill rather than importing duplicate identities.

Set OANRO_AUTH_ENABLED=true only after configuration and migrations are ready, then restart the server. This flag is auth rollout configuration, not the future DB-backed website section management system.

## Bootstrap the Owner

Register the intended Owner and verify their email. An authorized database operator should obtain that exact user's ID from auth_user and verify the identity. Never promote the first signup automatically or infer ownership from an email supplied by a browser.

```bash
npm run owner:bootstrap -- VERIFIED_USER_ID "Initial Owner setup approved by Rosan"
```

The command refuses unverified/unknown users and any already initialized Owner. It is not an Owner transfer/recovery tool. Owner transfer, emergency recovery and staff assignment require a later explicitly audited workflow. Never delete ownership to bypass this check.

## Operational boundaries before activation

- Use separate migration/operator and application database credentials. The runtime role needs appropriate auth-table operations, SELECT on system_owner, and no ownership/schema/trigger control. Keep Owner bootstrap credentials outside the runtime. Audit triggers reject updates/deletes/truncation, but a database administrator can alter/drop triggers; these are not tamper-proof against the DBA.
- Verify trusted client-IP forwarding for the selected host before public activation. Better Auth falls back to shared per-path rate limits when no trusted IP is resolved. Do not blindly trust a caller-supplied X-Forwarded-For header; proxy configuration and multi-instance abuse/concurrency tests remain release gates.
- Verify SMTP delivery, Google OAuth, password-reset single-use/expiry, real PostgreSQL TLS/pooling/concurrent writes, restore procedures and session behaviour on the production hostname.
- Database or mail outages must be monitored; config presence is not a live health check. Public errors must not expose credentials.
- Retention/deletion policy for sessions, provider tokens, IP/user-agent metadata, rate-limit rows and audit records remains to be finalized. Do not enable exports/deletion workflows prematurely.
- Rollback: turn auth off and redeploy compatible code while preserving tables/data; no destructive down migration is supplied. Rehearse restoration on staging.

## Verification in this environment

- npm ci installed the original locked baseline; original lint and typecheck passed before edits.
- Updated lint and typecheck passed. Next.js 16.4.0 local authentication/route documentation was read per AGENTS.md.
- Production webpack build passed with auth disabled and without application secrets.
- Embedded PostgreSQL (PGlite) applied/replayed actual migrations. Tests exercised signup, verification email callback, rejected unverified login, hashed password storage, real session cookies, forged-session rejection, password reset/session revocation, sign-out, duplicate Owner bootstrap rejection, audit-write rollback, audit update rejection, rate limiting and foreign-origin rejection.
- Production HTTP smoke: /, /sign-in, /api/products returned 200; /account and /admin redirected to sign-in; disabled auth endpoint returned 503.
- Tests use captured emails and a local embedded database, not real SMTP or Google. No live PostgreSQL, real payment, production deployment, browser/device visual regression or concurrent database load test is claimed.

Run the same checks after merging. M2.1 is a tested foundation patch; M2 as a whole is not complete.
