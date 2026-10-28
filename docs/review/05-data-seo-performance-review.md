# Data modules, consent, SEO and performance review (2026-10-28, second pass)

**Coverage after this pass:** of 337 readable first-party files, **54 read and judged, 38 partly, 245 still pending**
(mostly React components, pages and the remaining `src/lib` modules; see `00-file-inventory.md`). Not a claim about the whole project.
Secret files were not read. Rendered-page checks used a **local production build with a fake database address** (no live service), so product and image data were fallback content.

## New findings (numbering continues from `04-api-admin-assistant-review.md`)

| ID | Severity | Confidence | Where | Finding | Impact | Suggested fix |
|---|---|---|---|---|---|---|
| F15 | Low-Medium | High | `customer-store.ts` `deleteCustomer`; `team-notes.ts`; `marketing.ts` | Account deletion erases the profile, sign-in methods, orders' personal fields and the customer's inquiries, but **not** the private staff notes about that customer (`customer_note`, the code comment says they "may hold personal details"), not the saved bag, and not the newsletter row (kept by email). | Personal data can remain after "delete my account". Whether this matches the privacy notice wording needs checking. | Delete or anonymise `customer_note` and `saved_bag`; ask on deletion whether to unsubscribe the email too. Owner decision. |
| F16 | Low | High | `api/orders/route.ts:34`, `meta-capi.ts` | The Meta Conversions API call trusts a client-sent flag `adConsent === true`; the server does not read the consent cookie (the assistant does). The Meta token is sent in the URL query string. Email and phone are hashed (good). | A tampered client could trigger a purchase event without consent; token may show in logs. | Read `oanro_consent` on the server; pass the token in an `Authorization` header. Only matters when the Pixel is switched on. |
| F17 | Info | Medium | `marketing.ts` `sendBagReminders` (cron `bag-reminders`) | A cart-reminder email goes to every verified customer with a saved bag after 24 h, with an unsubscribe link. Its legal basis rests on the sign-up privacy checkbox. | Marketing-consent question (not legal advice). | Owner to confirm the basis, or add an explicit opt-in. |
| F18 | Info | High | `components/analytics.tsx` | Unused component that would load Google Analytics **without** consent if anyone ever rendered it. The live code (`privacy-center.tsx`) loads GA only after the visitor allows Analytics. | A trap for a future developer. | Delete the file (safe readability cleanup, Group A). |
| F19 (**fixed locally**) | Medium (SEO) | High | `src/app/products/[slug]/loading.tsx` | **Unknown or removed product URLs return HTTP 200** (with `noindex` and a self-canonical) instead of 404, in English and `/bn`. Cause: the loading skeleton starts streaming before `notFound()` runs; Next's docs say the status cannot change after streaming starts. Services, sections, guides and unknown paths correctly return 404 (tested). | Google sees soft-404 style pages; `noindex` limits harm, but crawl budget and Search Console reports suffer. | Remove the route's `loading.tsx` or restructure so the existence check runs before the first suspension. Trade-off: the skeleton loader. Owner decision. |
| F20 | Low (SEO) | High | `/sign-in`, `/account`, `/reset-password` | Kept out of search only by `robots.txt`; no `noindex` meta. `/sign-in` repeats the home page title and description. | Minor duplicate-metadata and indexing-of-URL risk. | Page-level `robots: noindex` and a real title for these pages (note: noindex needs the page to stay crawlable). |
| F21 | Info (performance) | High | every HTML page | All HTML is `Cache-Control: private, no-cache, no-store`: pages are rendered dynamically because the locale comes from a request header (`proxy.ts`). No CDN caching of pages. | Every visit costs a server render; TTFB depends on the region and the database. Not measured in the field. | Measure field TTFB first. A static per-language route (for example `/bn` as a real segment) would allow caching: an architecture proposal, not a quick fix. |
| F22 (**fixed locally**) | Medium (CWV, lab) | High | home hero `.v2-h1 .v2-track` and `.v2-help-row` | Lab CLS **0.114** at a 555 px wide viewport (target 0.1): one shift of 0.1 about 1.1 s after load, when the animated hero headline changes height (104 to 58 px) and pushes the rows below down. At 375 px CLS was 0.029. | Likely to hurt real-user CLS on widths where the headline wraps differently. | Reserve a fixed `min-height` for the hero headline block. Visible layout change: owner approval, then test at several widths. |
| F23 | Info | High | `two-factor-policy.ts` | If the database read for "staff must use 2FA" fails twice, it falls back to "not required". | Enforcement relaxes only while the database is failing (the admin would also fail then). | Acceptable; document. |
| F24 | Low | Medium | `discount-store.ts`, `api/discounts/check` | The public check answers with the exact reason (`INVALID`, `EXPIRED`, `USED_UP`, `NOT_STARTED`...). Limit: 20 checks per 10 minutes per IP, fail-open. | A guesser learns when a code exists but is expired. | Return one generic answer publicly; keep reasons for signed-in checkout if needed. |

## Measured (lab only)
Local production build, `localhost`, **no network or CPU throttling**, fake database (fallback content), browser pane emulation:

| Page / viewport | LCP | CLS | TTFB | Other |
|---|---|---|---|---|
| `/` at 555 px | 672 ms (element: hero headline text) | **0.114** | 57 ms | 32 requests, about 479 KB, 1 long task |
| `/` at 375 px | 556 ms | 0.029 | 28 ms | no horizontal overflow |

These are **not** field data and say nothing about real phones, networks or the live database. INP was not measured. Targets: LCP 2.5 s, INP 200 ms, CLS 0.1 (75th percentile in the field).

## Rendered-page checks that passed
Home, `/bn`, `/track`: one `h1`, titles and descriptions per language, canonical, `hreflang` with `x-default`, Open Graph with `en_BD`/`bn_BD`, JSON-LD `Organization` and `WebSite`, no images without `alt`, security headers (CSP, HSTS, `nosniff`, frame and referrer policy). `/account` redirects to sign-in (307). `robots.txt` and `sitemap.xml` answer 200. Product price data in JSON-LD is only emitted when `OANRO_STORE_LIVE=true`, so sample prices are not published as offers (code, `seo.ts`).
Not checked: product-page structured data (needs real data), the sitemap against real products, Bangla content quality, Google Search Console data.

## Also done well (code)
- Database TLS: the connection string is forced to `verify-full`.
- Leads: IP kept only as a salted hash and stripped before the admin inbox; audit log entries never contain personal details.
- Account deletion refuses while an order is in progress, keeps orders anonymised for the accounts, ends sessions.
- Consent: Google Analytics and the Meta Pixel load only after Analytics is allowed; withdrawing personalisation deletes the stored recent products; the server re-checks the consent cookie for the assistant.
- Discount redemption is atomic (two shoppers cannot take the last use).

## Still unreviewed (no claim)
Most React components and pages, `product-store.ts`, `product-input.ts`, `report-store.ts`, `order-notify.ts` internals, `qr.ts`, `campaign-store.ts`, `service-store.ts`, admin pages' queries, the content/data files, and `og` image routes. No responsive sweep across devices and no accessibility audit (WCAG 2.2 AA) has been done yet.


## Fix results: F19 and F22 (done locally, committed separately, not pushed)

### F19: product 404s
`src/app/products/[slug]/loading.tsx` was removed (Option A). Local production build, local throwaway database with sample products plus one draft, one hidden and one archived product:

| URL | Before | After |
|---|---|---|
| published product (`/products/classic-baseball-cap`, `/bn/...`) | 200 | 200 |
| unknown slug (`/products/does-not-exist`, `/bn/...`) | 200 + noindex | **404** |
| draft product | 200 + noindex | **404** |
| hidden product | 200 + noindex | **404** |
| archived product | 200 + noindex | **404** |
| unknown service / section (unchanged) | 404 | 404 |

The published product page head is unchanged (title, canonical, 3 hreflang links, JSON-LD `BreadcrumbList`, no robots meta); the sitemap lists only the 9 published products. Server response time for the product page was about the same before and after (about 0.28 s on the first cold request, about 15 ms afterwards, localhost). The visible cost: no skeleton while the product page loads. The skeleton CSS (`.skeleton-page`, `.sk-product` in `v2.css`) is now unused and can be removed in a later cleanup.

### F22: hero headline layout shift
Cause confirmed: the headline animates `letter-spacing` (0.45em to 0.005em), which re-wraps the text and changed the headline height, pushing the content below it down.
Change: the headline box is now sized by an invisible copy of the text at its final spacing (`.v2-track-box::before { content: attr(data-text); visibility: hidden }`), and the animated text sits on top of it (`src/app/v2.css`, `src/components/home-v2.tsx`).

Method (deterministic, because the hidden browser pane freezes animations and makes timing-based CLS runs unreliable): the home page was loaded in same-origin iframes of each width, the headline animation was stepped through its timeline, and the position of the line below the headline was recorded.

| Width | Content below the headline moved (before) | After |
|---|---|---|
| EN 320 / 360 / 375 / 390 px | 91 px | **0 px** |
| EN 430 px | 46 px | **0 px** |
| EN 555 / 600 / 768 px | 45-46 px | **0 px** |
| EN 1024 / 1280 / 1440 / 1920 px | 60 / 75 / 84 / 84 px | **0 px** |
| BN 320 px (375 and 768 were already 0) | 46 px | **0 px** |
| BN 1440 px | 84 px | **0 px** |

Look unchanged, proven numerically: across 47 animation steps and 12 width/language combinations, the bounding rectangle of the animated text is identical to the old markup (0.00 px difference). The final state is identical too (position of the next line, hero height and total page height equal old vs new; heading text and `innerText` identical). No console errors and no hydration problems on a fresh load.
The lab CLS numbers quoted earlier in this file (0.114 at 555 px) came from a run where the pane was visible; later runs with a hidden pane froze the animation and showed misleadingly low values. Treat all timing-based lab numbers in this project with that caveat. Real CLS still needs field data (CrUX/Search Console) after deployment.

### Seen but not fixed
- At 320 px, an earlier visible run showed a second small shift (0.045 at about 5 s) when the rotating word in "Built on ..." changes length and the line re-wraps. Single observation; not yet confirmed or fixed.
- Not tested: real phones, real browsers other than the built-in one, INP, behaviour with a very long editable headline (CMS text) beyond the sizes above.
