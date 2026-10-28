# Auth and email: first findings (2026-10-28)

Files read: `src/lib/auth-factory.ts`, `auth.ts`, `auth-client.ts`, `mailer.ts`, `components/auth-panel.tsx`,
`app/sign-in/page.tsx`, `app/reset-password/page.tsx`, `proxy.ts`, parts of `components/security-panel.tsx` and `next.config.ts`.
Status in the inventory is still `pending` for everything else. This is a partial review, not a full one.

## How it works today
- Library: better-auth 1.7.7 (email + password, optional Google, authenticator-app 2FA).
- Email ownership is proven with a **verification link**, not a one-time code (`requireEmailVerification: true`, `sendOnSignIn: true`).
- Password reset sends a link; token comes in `?token=` and is passed to `AuthPanel` (`reset-password/page.tsx`).
- Password rule: 8 to 128 characters, at least one letter and one number (`passwordMixed`, checked by a server hook on sign-up, reset and change-password).
- Open-redirect guard exists: `safeNext` in `sign-in/page.tsx` only allows same-site paths.
- Messages for forgot/sign-up/sign-in failure are neutral (do not reveal whether an account exists).
- Reset-link lifetime in the library default: 1 hour (`resetPasswordTokenExpiresIn || 3600`).

## Findings

| # | Severity | Confidence | Where | Finding | Suggested fix |
|---|---|---|---|---|---|
| 1 | Medium (UX, fixed locally, see 03) | High | `auth-panel.tsx:78`, `security-panel.tsx:54` | No Show/Hide control on any password field. Reset and sign-up have no confirm-password field either. | Add a shared `PasswordField` component (type toggle, `aria-pressed`, `type="button"`). Intentional change, group B. |
| 2 | Medium (fixed locally, see 03) | High | `auth-factory.ts` (no email check), `auth-panel.tsx:77` | Email format is checked only by browser `type="email"` and the library default. No typo hint, no domain check. | Server hook using a maintained parser. Do not rewrite or block plus-addresses. Needs a decision on a new dependency. |
| 3 | Low-Medium (UX, fixed locally, see 03) | High | `auth-panel.tsx:47` | Unverified user who signs in gets a generic failure. There is no visible "resend verification email" action. | Show a neutral "check your email or resend" action. |
| 4 | Low | Medium | `auth.ts:20` | `sendMail` is awaited inside the library callbacks. Response time can differ between existing and unknown emails (account-existence timing signal). | Fire mail without awaiting, log failures safely. Needs a test. |
| 5 | Low | Medium | `auth-factory.ts:29` | `accountLinking` is disabled, so a user who registered with email and later uses Google with the same address is rejected. Safe, but may confuse users. | Keep; document. |
| 6 | Info | High | `auth-factory.ts:31` | Rate limit is database-backed, 30 requests per 60 s globally. Per-route stricter limits from the library were not confirmed. | Verify with a local test before claiming OTP/reset throttling. |
| 7 | Info | High | `auth-factory.ts` | No OTP flow exists, so OTP attempt limits and resend cooldown are not applicable today. Only TOTP (authenticator) codes exist. | None unless owner wants OTP login. |
| 9 | Low | Medium | tests (Better Auth log) | Better Auth warned it could not determine a client IP and would use one shared rate-limit bucket. Expected in a test; not yet confirmed for Vercel production. | Check that the production deployment forwards a trusted client IP header (e.g. `x-forwarded-for`) before relying on per-IP limits. |
| 8 | Info | High | `next.config.ts:35` | `Referrer-Policy: strict-origin-when-cross-origin` is set. Good for the reset token in the URL. | None. |

Not verified: real email delivery (no SMTP configured locally, no live email sent), the live Google sign-in, Google token checks inside the library (library-internal).

## Existing problems (not new regressions)
- `tests/rbac.test.ts` fails: stale expectation for the `manager` role (see `01-baseline-and-scope.md`).
- Local preview log showed a failed query on table `store_setting` against the throwaway dev database. Cause found later: the throwaway local database server (PGlite socket, port 54329) was simply not running (`ECONNREFUSED`), so every database query in the preview failed, including the sign-up rate-limit lookup (HTTP 500). Not a code bug and not a production observation. Start the dev database before browser tests that need it.

## Local smoke test (emulated only)
Browser pane at 1024 px width, `http://localhost:3100` with the throwaway database:
- `/` loads, title and headline present, no horizontal overflow.
- `/sign-in` loads, password field is `type="password"`, no horizontal overflow.
Other widths, Android/iOS, Firefox/Safari and real devices: **not tested**.
