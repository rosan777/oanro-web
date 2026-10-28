# Change log: Group B (intentional feature changes)

Group A (behaviour-preserving readability refactor) has **not started**. Reason: characterization tests are needed first.

## B1. Password Show/Hide (done locally, uncommitted)

| File | Change |
|---|---|
| `src/components/password-field.tsx` | New. Password input + Show/Hide button. Hidden by default, `type="button"`, value kept, nothing stored or logged. |
| `src/components/auth-panel.tsx` | Sign-in, sign-up and reset-password password input now uses `PasswordField`. Same props (autocomplete, min/max length, pattern, hint text). |
| `src/components/security-panel.tsx` | "Confirm your password" (2FA on/off) uses `PasswordField`. |
| `src/app/globals.css` | `.password-field`, `.password-input`, `.password-toggle` (next to the existing auth styles). |

Markup change worth knowing: the hint text moved from inside the `<label>` to a separate element linked with `aria-describedby`, so the label's accessible name stays "Password" and the button is not part of it.

### Tested (local dev server, throwaway database, browser emulation only)
- Hidden by default; Show makes text visible; Hide hides again; typed value kept (checked at 375 px).
- Button does not submit the form (no status message, URL unchanged, submit button not busy).
- Keyboard: Tab from the input reaches the button, Enter and Space both toggle, visible focus ring (3 px outline).
- Accessible name changes "Show password" / "Hide password"; label is linked to the input (`for` / `id`).
- Touch target: button 64 x 52 px at 375 px. `autocomplete` is `current-password` on sign-in and `new-password` on sign-up. Pattern and minLength unchanged on sign-up.
- 320 px: no horizontal overflow, row stays inside the card. Desktop pane (555 px): no overflow.
- `tsc`, `eslint`, unit tests: same as baseline (no new failure).

### Not tested
- Reset-password screen (needs a real token), 2FA confirm-password form in `security-panel` (needs a signed-in account), Bangla labels, screen reader (NVDA/VoiceOver/TalkBack), password-manager fill, 768/1024+ widths, landscape, mobile keyboard open, real Android/iOS devices, Firefox/Safari/Edge.
- No confirm-password field was added. That would be a new behaviour and needs the owner's decision.

## B2. Email validation and typo hint (done locally, uncommitted)

Decision: **no new dependency.** Better Auth already checks email format on the server with zod (`z.email()` in its sign-up route), and
zod is a maintained library we already ship. The only ready-made typo package (`@zootools/email-spell-checker`) was last published in
January 2023, so it was not added. The typo check is a small function in our own code with tests.

| File | Change |
|---|---|
| `src/lib/email-typo.ts` | New. `suggestEmailFix(email)`: suggests a popular domain one edit away (`gmaill.com` to `gmail.com`, `hotmial.com` to `hotmail.com`). Never rewrites, never rejects. Safe in browser code. |
| `src/lib/email-domain.ts` | New, server only. `checkMailDomain(domain)`: MX records, address-record fallback, Null MX, missing domain = `no-mail`; temporary DNS failures and 2.5 s timeout = `unknown` (never blocks). |
| `src/lib/auth-factory.ts` | Sign-up only: if the domain verdict is `no-mail`, answer 400 `EMAIL_DOMAIN_CANNOT_RECEIVE_MAIL`. Optional setting, so tests never touch the network. Sign-in and password reset are untouched. |
| `src/lib/auth.ts` | Turns the DNS check on in the real app. |
| `src/components/auth-panel.tsx` | Sign-up: "Did you mean ...?" with "Yes, use it" / "No, keep mine". Keep mine submits what was typed. Specific message when the server refuses the domain. |
| `src/app/globals.css` | `.email-hint` styles. |
| `tests/email-check.test.ts` | New, 3 tests. |

What it deliberately does not do: no silent rewrite, plus-addresses and custom domains accepted, no disposable-email blocking (business policy, owner decides),
no claim that a mailbox exists. A DNS check shows the domain can receive mail, not that the person owns the address. The verification link still proves that.

### Tested
- Unit: typo hint (accepts plus-address, custom domain, `mail.com`), DNS cases with a fake resolver (MX, A/AAAA fallback, Null MX, NXDOMAIN, empty, SERVFAIL, timeout), and the real sign-up hook through `createAuth` + in-memory database (refused domain creates no user, unknown/ok proceed, sign-in and reset never ask DNS). Full suite: 66 pass, 1 old fail (rbac).
- Real DNS probe: `gmail.com` ok, `oanro.com` ok, `gmaill.com` no-mail, a made-up domain no-mail, `example.com` no-mail (it publishes a Null MX).
- Browser (375 px, emulation): hint appears for `tester@gmaill.com` with no request sent; "Yes, use it" fills `x@gmail.com`, closes the hint, keeps the password and focuses the email; "No, keep mine" closes the hint and sends the request. No horizontal overflow.

### Not tested
- The server's 400 reaching the browser and the specific "domain can't receive mail" message: the local database server (port 54329) was not running, so the request failed with 500 earlier (rate-limit table). The hook itself is covered by the unit test.
- Bangla texts, screen reader, other widths, real devices, real email delivery.
- Non-awaited mail on sign-in/reset (finding 4) is still open.

## B3. Resend verification email button (done locally, uncommitted)

| File | Change |
|---|---|
| `src/components/auth-panel.tsx` | After sign-up, and after a sign-in that fails with `EMAIL_NOT_VERIFIED`, a "Resend verification email" button appears. 60 s countdown (matches the server limit of 3 requests per 60 s). Neutral wording: "If this address still needs verifying, a new link is on its way." |
| `src/app/globals.css` | `.resend-box` styles. |
| `tests/resend-verification.test.ts` | New. |

Why this is safe: the library's `/send-verification-email` answers `{status:true}` for unverified, verified and unknown addresses alike and holds every answer for at least 500 ms.
The `EMAIL_NOT_VERIFIED` answer on sign-in only appears after the correct password was typed, so it does not reveal which emails have accounts.
Note: a failed sign-in of an unverified account already sent a fresh link before this change (`sendOnSignIn: true`); the message now says so.

### Tested
- Unit/integration (in-memory database): unverified sign-in gives 403 `EMAIL_NOT_VERIFIED` and one mail; resend answers are byte-identical for unverified, verified and unknown emails; only the unverified account receives mail; the 4th request within 60 s gets 429.
- Browser, real local server (port 3101, local throwaway database, **mail sent only to a local test inbox**, nothing delivered): sign-up shows the button disabled with a countdown ("Resend available in 58s"); after the countdown it enables; clicking sends mail, shows the neutral message and restarts the countdown; sign-in with the unverified account shows the "isn't verified yet" message and restarts the countdown. The sign-up request also passed through the new DNS check for `gmail.com`. The button has `type="button"`. No horizontal overflow at 375 px. Mail log: 3 messages (sign-up, resend, unverified sign-in).
- Full suite: 67 pass, 1 old fail (rbac). `tsc` passes. `eslint`: 0 errors, same 3 warnings.

### Not tested
- Clicking the verification link in the mail, Bangla texts, screen reader, other widths, real devices, a real SMTP provider.
- The 429 path in the browser (shown only in the unit test); the form shows the generic "couldn't send, try in a minute" text in that case.

### Local test setup left on this machine
- `.claude/launch.json` (ignored by Git) now has a second entry `oanro-dev-local-sink` (port 3101, mail goes to `smtp://127.0.0.1:2525`). The test inbox script lives in the session scratchpad, not in the repo.
- The throwaway database (`scripts/dev-db/data`) now contains a test user `oanro-resend-test@gmail.com`. It is local only and can be deleted with that folder.

# Group C: safe security fixes from the review (done locally, uncommitted)

Findings are in `04-api-admin-assistant-review.md`. These four change no business rule or visible design.

| Finding | Change | Files |
|---|---|---|
| F1 | `nodemailer` 10.1.0 to **10.2.1** (patch bump, same major, exact pin kept). Lockfile diff contains only nodemailer. `npm audit --omit=dev`: 5 moderate down to 4; the 4 left are the dev-only `drizzle-kit`/`esbuild` chain. | `package.json`, `package-lock.json` |
| F6 | `Origin: null` (or any malformed Origin) on the contact and newsletter forms now answers **403** instead of throwing. Shared helper `originMatchesHost`. | `src/lib/same-host.ts`, `api/inquiries/route.ts`, `api/newsletter/route.ts` |
| F7 | Product view counter: at most 60 counted views per visitor per 10 minutes. Over the limit it stops counting and still answers 204. | `api/track/view/route.ts` |
| F5 (partly) | Six places that fell back to a built-in constant when `BETTER_AUTH_SECRET` is unset now go through `appSecret(fallback)`. Same values as before; in production it logs one warning. **It does not throw**, because the contact and newsletter forms work without sign-in being on. | `src/lib/app-secret.ts`, `rate-limit.ts`, `customer-mail.ts`, `assistant/server.ts`, `assistant/store.ts`, `api/inquiries`, `api/assistant/handoff` |

F5 stays open as a deployment check: confirm `BETTER_AUTH_SECRET` is set (32+ characters) in the live environment. Then the fallback can be made to throw in production.

## Tested
- Unit: `tests/safe-fixes.test.ts` (origin cases including `null`; `appSecret` value, fallback, one warning, no secret printed in the message).
- Local server (port 3101, throwaway database): contact and newsletter with `Origin: null` and with another site return 403; same-site with an empty body returns 400 (normal validation). 65+1 view requests from one fake visitor: the product count stopped at 60 and the last answer stayed 204; a second visitor was still counted (61 total).
- Full suite: 69 pass, 1 old fail (rbac, finding F3). `tsc` pass, `eslint` 0 errors (same 3 warnings), production `next build` pass.

## Not tested / limits
- The old behaviour of F6 was reasoned and checked in Node (`new URL("null")` throws), not re-run against the old code.
- F7 adds one small database write per counted view (the same limiter table other forms use). Not measured for load or Core Web Vitals.
- The nodemailer 10.2.1 release is only days old; its real mail sending was not exercised (no SMTP provider used). Sign-up mail still reached my local test inbox earlier with 10.1.0, not re-run with 10.2.1.
- Local throwaway database now also holds 12 sample products and a fake owner (`local-owner@example.test`). Local only.
