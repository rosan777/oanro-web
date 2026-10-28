# OANRO Assistant: setup, operations, hosting and rollback

Status: implemented locally and **not deployed**. Nothing here has been pushed, merged or migrated in production.

## 1. What it is
A closed-by-default chat assistant (mascot button → panel; full-screen sheet on phones) with typed chat, dictation and a hands-free conversation mode in Bangla, English and Banglish. It searches the published catalog, explains the owner's delivery / payment / return rules, shows a tracking form, and hands over to a person. Everything factual (prices, stock, rules, order status) comes from server code reading the database, never from model prose.

## 2. Free accounts you need (all optional; without keys it still does FAQ, rules, product search and human hand-off)
| Service | What for | Key / env | Notes verified 2026-10-27 from official pages |
|---|---|---|---|
| Groq | primary chat + Whisper speech-to-text | `GROQ_API_KEY` | Free tier, no card. Whisper limits listed by Groq: 20 req/min, 2,000 req/day, 7,200 audio-s/hour, 28,800 audio-s/day. Chat-model free limits are only visible in your console (https://console.groq.com/settings/limits); sources disagree, so our default caps are conservative. Services Agreement §4.2: Groq may not train on your inputs/outputs. Inputs/outputs may be logged up to 30 days unless you enable **Zero Data Retention** (Console → Data Controls): **please enable it**. Free-of-charge services carry no indemnity and a $5,000 liability cap. The agreement does not explicitly address commercial use of the free tier: confirm in the console/terms before launch. |
| Cloudflare Workers AI | backup chat | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | 10,000 neurons/day free, resets 00:00 UTC, then calls fail (never auto-paid on the Free plan). Cloudflare states it does not train on Workers AI customer content and does not keep inputs/outputs for plain inference. Commercial-use wording for the free plan was not found on the pages read: confirm in Cloudflare's terms. |
| Cloudflare Turnstile (optional) | bot check on first message | `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Free. CSP allows Turnstile only when the site key is set. |
Quotas and terms change: re-check before launch. Nothing is promised as unlimited or permanent.

Disabled on purpose: Cerebras and OpenRouter adapters exist but need both a key and `ASSISTANT_APPROVE_<ID>=true`; Gemini is never used for visitor chat (free-tier content may be used to improve Google products). See §9.

## 3. Local development (no production data)
```bash
npm install
npm install --prefix scripts/dev-db            # throwaway local Postgres (PGlite over a socket)
node scripts/dev-db/server.mjs &                # 127.0.0.1:54329, data in scripts/dev-db/data (git-ignored)
export DATABASE_URL=postgresql://postgres@127.0.0.1:54329/postgres
node --import tsx scripts/dev-migrate.ts        # refuses non-local URLs
# (no sample data is added: the local shop starts empty; use the existing scripts/seed-samples.ts only if you want demo products)
ASSISTANT_ENABLED=true npm run dev
```
`.claude/launch.json` has the same thing as the `oanro-dev-local-db` preview (own build folder `.next-local`). Put real keys only in your untracked `.env.local`.
The local-only helper scripts (`scripts/dev-db`, `scripts/dev-migrate.ts`, `.claude/`) are git-ignored and are not part of what gets pushed. The earlier fake-data scripts (products, staff logins, a fake order, a smoke test) were deleted.

## 4. Turning it on in production (needs your explicit approval first)
1. Review and approve migration `drizzle/0018_assistant.sql` (additive: 7 new tables, no existing table changed). Run `npm run db:migrate` against the production database yourself or approve me doing it.
2. Set the env vars in §2 plus `CRON_SECRET` and `ASSISTANT_ENABLED=true` on the host, redeploy.
3. Admin → Assistant: check the switches, add FAQ answers. Grant `assistant.view` / `assistant.edit` to specific staff in Staff & roles (both are in no built-in role).
4. Enable Groq Zero Data Retention.

## 5. Cleanup (30-day deletion) scheduling
`GET /api/cron/assistant-cleanup` with header `Authorization: Bearer $CRON_SECRET` deletes chats, unanswered excerpts, hand-off dedupe rows, stale rate-limit rows and usage rows older than 90 days; it is idempotent. It is already listed in `vercel.json` (daily 03:30 UTC) which only takes effect on Vercel. On any other host schedule the same request once a day, e.g. a free GitHub Actions cron:
```yaml
on: { schedule: [{ cron: "30 3 * * *" }] }
jobs: { purge: { runs-on: ubuntu-latest, steps: [{ run: 'curl -fsS -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" https://YOUR-DOMAIN/api/cron/assistant-cleanup' }] } }
```
Reads already ignore expired rows even if the job is late. Check it ran: the response is `{"deleted":{...}}`; a 401 means the secret is missing or wrong.

## 6. Hosting (do not deploy the commercial store on Vercel Hobby)
Vercel's Hobby plan "restricts users to non-commercial, personal use only" (https://vercel.com/docs/plans/hobby, fair-use guidelines). OANRO sells goods, so the store should move off Hobby before launch; the assistant itself has not been deployed anywhere. The current deployment was not touched.
Candidate free commercial paths, **none verified end-to-end here**:
- **Cloudflare Workers + OpenNext** (`@opennextjs/cloudflare`, supports Next 16): Workers Free allows 100,000 requests/day, but only 10 ms CPU per request and 50 subrequests; OpenNext's docs say a 3 MiB compressed Free-plan bundle limit while Cloudflare's limits page says 64 MiB uncompressed: these conflict, so build once (`wrangler deploy --dry-run`) before committing. Cloudflare's free-plan commercial wording was not found. Rate-limit tables, `pg` over TCP and Next's Node features must be tested on Workers.
- **A free always-on VM running `next start`** behind Caddy/Cloudflare: full Node compatibility, you manage the server. Check the provider's free-tier terms for commercial use.
Migration outline (when you approve): provision host → copy env vars → point `DATABASE_URL` (Neon free works from any host) → run `npm run build` there → test checkout, assistant, cron → switch DNS → keep the old deployment for rollback. Limitations: cron scheduling differs per host (see §5), image/ISR caching differs, free tiers cap requests.

## 7. Rollback
- Fast, no deploy: Admin → Assistant → switch **Assistant on** off (server refuses all chat within about a minute), or set `ASSISTANT_ENABLED=false`.
- Code: revert the feature commit(s); `vercel.json` cron entry goes with it. The new tables can stay (unused) or be dropped: `DROP TABLE assistant_handoff, assistant_unanswered, assistant_log, assistant_session, assistant_usage, assistant_faq, assistant_setting;` (this permanently deletes chats and FAQ; take a backup first).
- The two permissions `assistant.view/edit` may remain on custom roles harmlessly.

## 8. Security model in one page
Model sees: its server-built prompt, the visitor's redacted message, up to 6 recent redacted turns from the server's own log, and results of 3 read-only tools (searchProducts, getProduct, getPolicy) that select explicit public fields from published products and the owner's public rules. It never sees secrets, env vars, cookies, orders, customers, costs, drafts or other chats. Tracking and contact forms post directly to their own endpoints. Chat/transcribe/track/hand-off POSTs require same-origin; chat history is server-held under an httpOnly random session cookie; limits live in the shared DB table and fail closed for AI; model prose cannot state unverified prices; only internal link paths render; output is React elements (no innerHTML). Limits of this design: redaction cannot catch names/addresses; Groq may retain logs up to 30 days unless ZDR is on; per-instance provider cool-downs are not shared between serverless instances (the DB counters are).

## 9. Extension points (priority order; each needs its own approval/budget where noted)
1. **Better free models**: add ids to `providerSpecs[...].models` in `src/lib/assistant/config.ts`; switch with `ASSISTANT_<ID>_MODEL`. Re-run `tests/assistant.test.ts` (tool-calling mocks) and test Bangla quality.
2. **Better bilingual voice**: swap `transcribe.ts` (one function) for another free multilingual STT; TTS lives in `speech.ts` (browser voices). Premium TTS is paid: separate budget approval.
3. **Semantic search**: Postgres `pgvector` (Neon supports it) behind `searchProducts` in `tools.ts`; keep the same card output.
4. **WhatsApp/Messenger automation**: new channel adapters calling `chat()` in `engine.ts` with their own session ids; needs the platforms' business APIs and review.
5. **Higher capacity**: raise caps in env, add a paid provider as another entry in `providers.ts`: requires explicit budget approval. Cerebras/OpenRouter adapters are already present but disabled; enabling needs terms verification.
