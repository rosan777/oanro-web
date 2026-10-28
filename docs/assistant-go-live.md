# OANRO Assistant ("JUNO"): release notes and go-live guide

Written 2026-10-28 after the final check. Read this before pushing. It covers **everything** in the 9 commits that are ahead of GitHub `main`, not only the assistant.
Older working notes: `assistant-checkpoint.md` (dated log), `assistant-handover.md` (requirement table), `assistant-setup.md` (setup). The code review notes are in `docs/review/`.

## 1. What is in this push

9 commits, about 100 files. Compared with GitHub `main` (`5784f4e`):

| # | Commit | What it is |
|---|--------|------------|
| 1 | `fcece80` | Your earlier work: security headers, rate limits, DB connection fix, intro toggle, new cookie bar |
| 2 | `15568e2` | **The assistant** (chat, voice, admin, privacy notice, weather header, close rocket), switched OFF by default |
| 3 | `61191fd` | Auth forms: password Show/Hide, email typo hint, "resend verification" button |
| 4 | `b51499a` | Sign-up refuses email domains that cannot receive mail (DNS check) |
| 5 | `d4e6ad4` | Code-review security fixes: `nodemailer` 10.1.0 to 10.2.1, safe Origin check, view-count limit, shared secret helper |
| 6 | `94a5fd6`, `ef206dc` | Review documents in `docs/review/` |
| 7 | `1636ebd` | Unknown, draft, hidden and archived product pages return a real 404 |
| 8 | `902f803` | Home hero: headline animation no longer shifts the page |

Not yet committed (goes in as one more commit when you approve the push): the "Juno is thinking" loading state (`assistant-thinking.tsx`), the password eye inside the field (`password-field.tsx` + `globals.css`), the fix for the duplicate-message React key error on Retry (`src/lib/assistant/chat-state.ts` + widget + test), smaller product size chips (`globals.css`, `assistant.css`), the home-hero layout-shift fix at phone widths (`v2.css`), 24px minimum tap heights for footer, product-shelf, "Details" and checkbox controls (`globals.css`, `v2.css`), the back-to-top and assistant launcher resize plus the owner's back-to-top on/off switch (`website-sections.ts`, `layout.tsx`, `site-extras.tsx`, `admin/sections/page.tsx`, `permissions.ts`, `v2.css`, `assistant.css`; no database migration), the compact product grids and 4:5 photo cards (`v2.css`, `home-v2.tsx`, `assistant.css`), the cash-on-delivery success-screen fix (`checkout-form.tsx`), the admin read-only request fix (`admin-api.ts`), and these documents.

Commits 3 to 8 were made by a separate review session in the same folder. They are not assistant work. They were reviewed and tested here (section 6) but they change live behaviour (section 3).

## 2. What the assistant is

- JUNO answers shopping and support questions in Bangla, English and Banglish, shows product cards from your published products only, quotes delivery/payment/return rules from your settings, and hands over to a person through "Message our team" (one inquiry in your inbox, with consent).
- Free-only: Groq (primary, also speech-to-text) and Cloudflare Workers AI (optional backup). Weather in the header comes from MET Norway (free, credit "Data from MET Norway").
- It never sees order numbers or phone numbers: tracking is a separate form that goes straight to the server. Personal details in chats are redacted before storage; chats are deleted after 30 days.
- **It is OFF unless `ASSISTANT_ENABLED=true` is set.** Off means: no bot markup, CSS or JS reaches visitors, and every bot address answers 403.

## 3. What changes on the live site the moment this is deployed (bot still off)

From the assistant commit:
- Header `Permissions-Policy` now allows the microphone for your own site (`microphone=(self)`). Needed for voice; camera, location etc. stay blocked.
- Cache rule for `/assistant/*.svg` (7 days). Privacy page and privacy-center wording updated (EN + BN).
- Admin: new "Assistant" menu entry and two new permissions (`assistant.view`, `assistant.edit`). They are in no built-in role, so only the owner sees them until you grant them.
- Inquiry inbox shows a "Source" row for messages that came from the assistant.
- Back-to-top button is smaller (40px desktop, 36px phone, tap area kept).
- JetBrains Mono weight 700 added to the font loader (downloaded only where used).
- `vercel.json`: new daily job `/api/cron/assistant-cleanup`. **Run the migration before its first run**, or it logs an error each day (harmless, but noisy).
- Database migration `0018_assistant.sql`: creates 7 new `assistant_*` tables only. No existing table is altered, nothing is inserted, updated or deleted.
- `package.json`: adds `ai`, `@ai-sdk/groq`, `@ai-sdk/openai-compatible`, `zod` (pinned to the version you already had).

From the other commits (not the assistant):
- Sign-up checks the email's domain by DNS. It blocks only domains that definitively cannot receive mail (no mail record, no address record, or a "null MX"). If DNS is slow or fails, the sign-up goes through.
- Newsletter form: same-site requests only (new), and at most 5 sign-ups per visitor per hour (new). Inquiry form: its existing same-site check now uses a shared helper, so a malformed Origin is refused instead of causing an error.
- Product view counting: at most 60 counted views per visitor per 10 minutes.
- `nodemailer` upgraded to 10.2.1 (minor version).
- Real 404s: unknown pages and unknown, draft, hidden or archived products now answer 404 instead of 200 ("soft 404"). `/products` itself has never been a page and still is not.
- Auth forms and hero layout changes as listed above.
- Password fields (sign-in, sign-up, security panel): the text "Show/Hide" button is now an eye icon inside the field (same toggle, same accessibility labels).

## 4. Go-live steps, in order

1. **Push** the 9 commits to `main` (you decide when). If your host deploys on push, the site updates with the bot still off.
2. **Back up first**, then run the migration against the production database: `npm run db:migrate` (with the production `DATABASE_URL`). It is additive, so leaving the tables in place is always safe.
3. **Set environment variables** on the host (never commit them):
   - `ASSISTANT_ENABLED=true`
   - `GROQ_API_KEY` (**use a new key**; the first key was pasted in a chat). In the Groq console turn on Zero Data Retention.
   - `CRON_SECRET` (`openssl rand -base64 32`)
   - `BETTER_AUTH_SECRET` must already be set (the bot check and unsubscribe links rely on it; the app only warns if it is missing)
   - Optional: `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` (backup AI), `ASSISTANT_GROQ_DAILY_TOKENS` and the other caps in `.env.example`.
4. **Redeploy**, open `/admin/assistant` as the owner, check the switches (assistant, voice, tracking) and add FAQ answers.
5. **Test live** (checklist in section 7).

## 5. Rollback

- Fastest: set `ASSISTANT_ENABLED=false` and redeploy. Everything bot-related disappears for visitors.
- Full: revert commit `15568e2` (and any of the other commits you do not want). The 7 new tables can stay; they are unused when the code is gone.

## 6. What was checked, and how

Final check on the whole 9-commit state (this machine, local throwaway database, never your real database):

| Check | Result |
|-------|--------|
| Typecheck | clean |
| Lint | 0 errors (3 old warnings in files not written here) |
| Full test suite | 71 tests, **70 pass**. The 1 failure is the RBAC test, which fails identically on your original `fcece80` (proved by running it there) |
| Production build | passes |
| Bot OFF (default) | no bot CSS (0 rules), no bot JS, chat/weather/tracking/admin bot addresses all answer 403; pages load (200) |
| Bot ON | same pages plus the bot; home HTML grows by only 417 bytes; bot code loads after the page |
| Home page size | original `main` 108,155 bytes; new, bot off 105,290; bot on 105,707 (the push does not make the home page heavier) |
| Real 404s | `/products/<unknown>`, `/sign-up` (not a page on this site), and other unknown URLs answer 404; real pages answer 200 |
| Secret / fake-data scan | all added lines (about 9,800): no keys, no env files, no personal details, no database or host identifiers. Only fake strings inside tests |
| Live AI | real Groq replies in English, Bangla, Banglish; tools, injection and off-topic refusals, delivery quoted in ৳; empty shop answered honestly |
| Microphone | in a real headless Chrome: first click asks the browser for the microphone; Allow starts listening; a blocked site shows a short how-to. Also tested with a stand-in microphone |
| Loading state, password eye, Retry | real headless Chrome at phone and desktop sizes, with and without reduced motion: indicator shown only while a reply is generated, no Cancel button, eye inside the field and keyboard-operable; Retry no longer logs the duplicate-key error (reproduced on the old code first) |
| Product size chips | 54 combinations (9 size sets x 6 widths 320 to 1440): none overflow. Chips are 34 px (320 px), 36 px (up to 767 px), 40 px (desktop), and long labels wrap inside the row. Before: 44 px squares |
| Page audit | run twice (before and after the last fixes): 18 pages x 6 widths (108 loads) each. After: no horizontal scroll, no console errors, no failed requests, no broken images, one h1 per page, launcher never overlaps other controls, worst layout shift 0.056 (target 0.1) |
| Home hero at phone widths | "Built on <word>" line kept on its own row below 520px. Line height checked for all 5 words in English and Bangla at 8 widths (320 to 1440): always stable. Layout shift over 14 s: 0.023 at 320px, 0.011 at 375px (was 0.119 at 320px) |
| Tap targets | footer links, product-shelf names, "Details" link, footer email: at least 24px high; the two checkboxes are 18px and sit inside clickable labels. Remaining below 24px: the browser's own range slider (price filter) and a hidden anti-spam field |
| Admin mail | the site's own test email was accepted by the mail server (inbox delivery is for you to confirm; see the sender note in section 8) |
| Full functional check | 100+ customer, admin, mail and assistant checks on 2026-10-29 (list in `docs/assistant-checkpoint.md`); two real bugs fixed (cash-on-delivery amount shown as ৳0; admin CSV export and order labels refused in the browser) |
| Fake data | all test products, staff, orders and the fake-data scripts were removed. Nothing synthetic is in the repo outside test fixtures |

## 7. Live test checklist

Home loads; sign-in and sign-up work; `/privacy` shows the new assistant section. Then: open the assistant; "hi"; ask delivery charge; ask for a real product by name; try a typo ("delivary koto"); Bangla question; "Message our team" (one inquiry appears in the inbox with a "Shop assistant" source); the tracking form with a real order; the mic buttons in Chrome on desktop and on a phone (needs https); close with the rocket and with Esc; `/admin/assistant` as owner; wait one day and confirm the cleanup job ran.

## 8. Not verified, and decisions for you

Not verified (could not be, from here):
- The migration on your **real** database (tested only on empty local databases).
- Voice accuracy on real phones, and the browser's real permission pop-up on a phone (needs https).
- The Cloudflare backup (no key was available).
- The city-level weather location on Vercel (those headers exist only in production); without them the browser time zone picks the city.
- A real **published product** page after commit `1636ebd`: the local shop is empty, so only the 404 side was tested. Test one product page after deploy.

Decisions and risks:
- **Rotate the Groq key** (it was pasted in a chat). Confirm in Groq's terms that the free tier allows commercial use of a shop.
- **Token budget**: each chat uses about 2,100 tokens, so the default cap of 90,000 tokens a day allows about 43 chats a day. Read Groq's Limits page and set `ASSISTANT_GROQ_DAILY_TOKENS`. Memory is the last 5 turns.
- **Mail sender**: the local `.env.local` uses Resend's test sender (`…@resend.dev`). Resend only lets that sender mail the Resend account owner, so customers would not receive verification or reset emails. Check the sender on your live host and verify your own domain in Resend if needed. This is independent of the assistant.
- Hosting plan: Vercel Hobby is for non-commercial use; check you are on an appropriate plan for a shop.
- Voice and weather send small pieces of data to third parties (Groq; MET Norway gets rounded coordinates). Both are described in the privacy notice; consider a legal review.

## 9. Where things are

- Chat engine, tools, safety: `src/lib/assistant/`
- API: `src/app/api/assistant/`, `src/app/api/admin/assistant/`, `src/app/api/cron/assistant-cleanup/`
- UI: `src/components/assistant-*.tsx`, styles `src/app/assistant.css`, icons `public/assistant/`
- Admin page: `src/app/admin/assistant/`
- Tests: `tests/assistant.test.ts` (and the review session's tests)
- Local-only helpers (git-ignored, never pushed): `scripts/dev-db/`, `scripts/dev-migrate.ts`, `.claude/`
