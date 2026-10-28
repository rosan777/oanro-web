# OANRO Assistant: review handover

Local preview (running now): **http://localhost:3100** (own build folder `.next-local`, local throwaway database, `ASSISTANT_ENABLED=true`). Admin page: http://localhost:3100/admin/assistant (needs a staff login; the local test database starts empty (no fake staff or products)).
Nothing is committed, pushed, merged, deployed or migrated in production. Setup/operations: `docs/assistant-setup.md`. Progress log: `docs/assistant-checkpoint.md`.

Status legend: **T-auto** = automated test in `tests/assistant.test.ts` (PGlite + mock AI models, no network); **T-live-local** = exercised against the local running server/browser with synthetic data; **Impl** = implemented, not separately tested; **BLOCKED** = cannot be verified here (reason given).

## Requirement → location → status
| § | Requirement | Where | Status |
|---|---|---|---|
| 1 | Checklist, checkpoint doc, dev DB only, stop before push/deploy/prod-migrate | this file, `docs/assistant-checkpoint.md`, `scripts/dev-*` (refuse non-local DB) | Done; the only configured DB is Neon-hosted so it was never used |
| 2 | Model/effort policy | n/a | Ran as **Claude Sonnet 5.5**; effort level not observable in this session; no model/effort switch performed, no subagents, no Opus, no API billing |
| 3 | Groq primary, Cloudflare backup, allowlists, caps; Cerebras/Gemini/OpenRouter disabled | `src/lib/assistant/config.ts`, `providers.ts` | Impl + T-auto (fallback with mocks). **BLOCKED live:** no Groq/Cloudflare keys, so real requests/tool-calling with the real models were not exercised |
| 3 | Free-terms verification, hosting doc | `docs/assistant-setup.md` §2, §6 | Done from official pages; Groq/Cloudflare free-tier *commercial-use* wording not found → owner must confirm; Vercel Hobby is non-commercial (verified); free host path **unverified** |
| 4 | Typed modules, routes, components, admin, migrations | `src/lib/assistant/*`, `src/app/api/assistant/*`, `src/app/admin/assistant`, `drizzle/0018_assistant.sql` | Done |
| 5 | Mascot (blink/bob, one wave per session, thinking), reduced motion | `assistant-mascot.tsx`, `assistant.css`, `assistant-launcher.tsx` | T-live-local (desktop + 375px phone) |
| 5 | Panel/sheet, focus, SR roles, retry/cancel/clear, AI disclosure | `assistant-widget.tsx` | T-live-local; DOM audit: no text <12px, names on controls, tap targets ≥44px on phones after fixes. **Not run:** axe/Lighthouse, real screen readers |
| 5 | Bangla/English/Banglish replies | prompt + `language.ts` + canned `messages.ts` | Language detection T-auto; model reply quality **BLOCKED** (no live model) |
| 5 | Cards: photo, link, price, availability, size/colour, Add to bag, hidden products excluded, store mode | `assistant-cards.tsx`, `tools.ts` | T-auto (hidden/draft excluded, preview flag, sold-out) + T-live-local (Add to bag wrote the bag; checkout not open message) |
| 5 | Rules from admin settings; recently viewed only with consent | `tools.getPolicy`, `consent.ts#recentProducts`, `server.personalisationAllowed` | T-auto + T-live-local (consent on: slugs sent; withdrawn: chip gone, nothing sent). The privacy-settings dialog itself was not clicked; withdrawal was simulated with the same storage/event calls `saveConsent` makes |
| 6 | Dictation + Conversation, Auto/বাংলা/English, Whisper fallback, speechSynthesis, turn-taking | `assistant-voice.tsx`, `voice-core.ts`, `speech.ts`, `transcribe.ts` | Logic T-auto (voice choice, recogniser choice, silence detection, conversation state machine). UI T-live-local **with fake SpeechRecognition/speechSynthesis only**. **BLOCKED:** real microphone, real Whisper, real device voices, iOS/Android formats, mic-cleanup on a real device |
| 7 | searchProducts / getProduct / getPolicy; trackOrder via direct form | `tools.ts`, `api/assistant/track` | T-auto + T-live-local (synthetic order; wrong code/phone → same generic 404) |
| 8 | Isolation, injection, SSRF, XSS, CSRF, headers | `sanitize.ts`, `engine.ts`, `server.ts`, `next.config.ts` | T-auto (injection/forged tool call/secrets not in prompt/HTML+links stripped/price claims stripped) + (the removed local smoke test) (origin, admin, cron, tracking, limits) all PASS. Cookie, same-origin and fixed provider URLs by design; no external URL fetching except fixed Groq/Turnstile endpoints |
| 9 | Persistent atomic limits (20/10 min + burst/day), quotas, FAQ w/o AI, fail closed, Turnstile, hand-off + dedupe | `store.ts`, `tracking.ts`, `route.ts` | T-auto (atomic caps under concurrency, windows, fail-closed tracking, dedupe race) + T-live-local (429s). Turnstile: Impl, **not tested** (no keys) |
| 10 | Admin dashboard: switches, FAQ, conversations/filters, unanswered, usage, audit; 30-day cleanup | `admin/assistant/page.tsx`, `assistant-admin.tsx`, `api/cron/assistant-cleanup` | T-auto (expiry exclusion + real deletion, audit rows) + T-live-local (view-only vs edit-only roles see different sections; API 403/200 per role; disabled features rejected by the server). Cron endpoint auth checked (401); a successful authenticated cron call was not run (no CRON_SECRET locally; the same `purgeExpired` is T-auto) |
| 10 | Privacy notice | `app/privacy/page.tsx#assistant`, `privacy-center.tsx` | Done (EN+BN); recommend legal review |
| 11 | SEO/perf: lazy chunk, no CLS, canonical/JSON-LD/sitemap/robots unchanged | `assistant-launcher.tsx` | Measured prod build vs original commit: initial JS 188→190 KB (+1 request), CLS ≈0 both, TBT 0 both, panel chunks (+18 KB, 3 requests) load only on open; title/canonical/hreflang/JSON-LD/h1/sitemap/robots identical. Single-machine, 1–3 runs each, **not Lighthouse**; baseline run lacked `.env.local` contact settings |
| 12 | Existing tests, lint, typecheck, build | | `tsc` clean; `eslint` 0 errors (3 old warnings); `npm test` 53 pass / 1 fail = pre-existing `rbac.test.ts` (fails on untouched code too); `next build` OK |

## Not verified / genuine blockers
1. No live AI or speech calls: needs your free Groq key (+ optional Cloudflare). Provider adapters and tool-calling against real models must be tried once with real keys. Streaming to the browser is intentionally not used (one JSON reply per turn, so fallback can never double-reply); tool-calling is validated with AI SDK mock models only.
2. Real-device voice testing (Chrome Android, iOS Safari, desktop) is still to do.
3. Free-tier commercial-use confirmation for Groq and Cloudflare, and a verified free commercial host, are open (see setup doc §2, §6).
4. Production migration `0018_assistant.sql`, env vars, cron and enabling `ASSISTANT_ENABLED` all wait for your approval.
5. Pre-existing: `tests/rbac.test.ts` fails on untouched code.

## Behaviour notes you should know
- **Off by default** (`ASSISTANT_ENABLED` must be `true`). Your server on port 3000 hot-reloads this code and uses the Neon DB; with the default it shows no assistant and writes nothing there.
- Preview mode is explicit: with `OANRO_STORE_LIVE` not `true` or no payment number set, cards are labelled Preview and the assistant says checkout isn't open.
- `getPolicy` also passes the owner's enabled FAQ to the model; FAQ matches with high confidence are answered with no AI call.
- Clear chat deletes that session's saved messages (visitor control); opening a conversation in admin writes an activity-log entry.
- Admin permissions `assistant.view` (read chats, unanswered, usage) and `assistant.edit` (switches, FAQ, resolve) are separate and in no built-in role. Unanswered excerpts and usage are visible to either permission.
- Repo changes outside the feature: `eslint.config.mjs` ignores generated build folders; `next.config.ts` (microphone=(self), optional Turnstile CSP, `NEXT_DIST_DIR`); `tsconfig.json` excludes `.next-local`; `vercel.json` gains the cleanup cron (inactive until deployed); `/api/order-status` is UNCHANGED (reverted to the original) — only the assistant's own tracking form uses the new limiter.
- My temporary stash round-trip during one lint comparison briefly removed and restored the working tree files; your dev server on :3000 may have hot-reloaded during that moment. Nothing was lost (verified).
