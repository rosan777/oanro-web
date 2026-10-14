# M2.2 storefront sections and Global Pulse editorial stage

Based on the GitHub source ZIP commit `be19fbd045266182d6abc526931fc1d4171890b6` plus the M2.1 patch delivered on 14 October 2026. The Owner requested a new Caps Collection, Tech Items section and Global Pulse now, and reported an animation regression. This patch is a reviewable change to that baseline. If the current GitHub or local files have diverged, reconcile conflicts before applying.

## What changes

- Restores media-only flipping to existing product and service conveyor cards. Titles/copy below remain upright. The underlying flip, two opposite-moving shelves, motion preference and pause code are retained. M2.1 had not changed the animation source files; a specific locally observed regression is not independently reproduced here.
- Adds Caps and Tech Items sections using the existing conveyor component. The headphone concept links to its original sample product. Caps styles and additional tech categories are labelled concepts: no invented availability, price, imagery, stock or purchase link.
- Adds a compact Global Pulse carousel directly above the footer on all pages. It pauses on hover/focus/interaction, respects global reduced motion and offers manual arrows/pause. It renders only when the Owner has enabled the section and manually reviewed story records exist.
- Adds PostgreSQL `website_section` and `pulse_story` tables through migration 0002. Owner-only admin controls toggle the three new sections and publish/hide manually verified source links. Actions write append-only audit events in the same transaction. Disabled sections retain their records. Source headlines and URLs are preserved; thumbnail falls back to OANRO because media rights are not yet managed.
- Sets an explicit `127.0.0.1` development origin. The Next.js warning occurred when the server and page used different hostname forms. Existing smooth-scroll CSS gets the framework's HTML annotation.

## Activation and scope

- With no DATABASE_URL, Caps and Tech Items appear as labelled previews, and Pulse remains hidden; admin requires configured authentication. After DATABASE_URL is configured, all three section settings default OFF until an authorized Owner switches them on. Do not run the migration against a real database without backup and review.
- Owner sign-in, verified email and existing single-Owner bootstrap are prerequisites to admin settings. This is not a delegated manager dashboard; scoped staff editorial permissions, generalized Hero/Products/Services/Partners settings, source/category management, scheduling, sanctioned feed ingestion and Hybrid auto-publish/review classification remain unfinished.
- To publish a manual story, the Owner must verify publisher identity, exact original HTTPS link and headline reuse rights. The form does not fetch feeds, scrape sites or display third-party thumbnails. A publisher name typed by the Owner is not independent source verification. No real content is pre-seeded or automatically published.
- Existing local demo cart and static sample catalog remain. Real product assignment, stock, pricing, checkout, delivery and PRA are not claimed.
- Live public use awaits current-source reconciliation, device/accessibility visual checks, database and mail/OAuth setup, editorial safeguards, content permission and security/dependency review. The requested reference image was not attached to this turn; the existing website carousel is the visual reference.

## Apply and verify

The accompanying ZIP contains only changes since M2.1 under `project/`. Extract separately, merge those contents into the existing project root, and keep other files and `.env.local` unchanged. Save/commit your current work before copying. Restart the dev server after applying; avoid open tabs with stale HMR state.

```bash
npm ci
npm run test:foundation
npm run lint
npm run typecheck
npm run build -- --webpack
```

If PostgreSQL has already been configured with the M2.1 migrations, back up and review `drizzle/0002_stale_molecule_man.sql`, then run `npm run db:migrate` against the intended development database. The first-run migrations include 0000–0002. Do not run migrations against the production database as a casual preview step.

Run `npm run dev` and open `http://localhost:3000` consistently. Check the two concept carousels, existing product/service flip, two opposite-moving shelves, hover/focus pause and global motion toggle. In DevTools mobile widths 320/390/768/1440, ensure no horizontal page overflow. If the animation you meant is different, provide its name and a short clip or screenshot of the current local behavior.
