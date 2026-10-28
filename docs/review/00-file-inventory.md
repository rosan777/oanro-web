# Review inventory (generated from `git ls-files`)

Source of truth: **tracked files only**. Ignored files (for example `.env*`) never appear here, so they cannot be read through this list.
Status values: `pending` = not reviewed yet, `partial` = only part read, or only checked by search/script (see review notes), `reviewed` = read and judged, `excluded-*` = deliberately not read.

## Summary

| Kind | Status | Files |
|---|---|---|
| asset | excluded-nonreadable-or-generated | 35 |
| config | pending | 9 |
| doc | pending | 12 |
| generated | excluded-nonreadable-or-generated | 21 |
| source | pending | 316 |

## Deliberately excluded (present on disk, never read)

| Path | Why excluded |
|---|---|
| `.env.local` | live secrets (ignored by Git) |
| `.env.local.live-backup` | backup of live secrets (ignored by Git) |
| `dev.log` | untracked server log; may contain sensitive request data |
| `OANRO-All-Code.md` | untracked full-code dump; may embed secrets; owner to decide keep/delete |
| `.claude/`, `scripts/dev-db/`, `scripts/dev-migrate.ts` | local-only tooling ignored by Git |
| `.next/`, `.next-local/`, `node_modules/`, `*.tsbuildinfo` | build output / vendor |

## Files

| File | Kind | Role | Lines | Status |
|---|---|---|---:|---|
| `.env.example` | config | project config | 65 | pending |
| `.gitignore` | config | project config | 20 | pending |
| `AGENTS.md` | doc | existing documentation | 13 | pending |
| `README.md` | doc | existing documentation | 153 | pending |
| `VERIFICATION.md` | doc | existing documentation | 34 | pending |
| `docs/M2-FOUNDATION.md` | doc | existing documentation | 86 | pending |
| `docs/M2-PRODUCT-MANAGEMENT.md` | doc | existing documentation | 46 | pending |
| `docs/M2-PULSE-THUMBNAILS.md` | doc | existing documentation | 38 | pending |
| `docs/M2-STORE-SECTIONS.md` | doc | existing documentation | 35 | pending |
| `docs/PULSE-CHECKPOINT.md` | doc | existing documentation | 9 | pending |
| `docs/PULSE-UPLOAD-CHECKPOINT.md` | doc | existing documentation | 5 | pending |
| `docs/assistant-checkpoint.md` | doc | existing documentation | 103 | pending |
| `docs/assistant-handover.md` | doc | existing documentation | 44 | pending |
| `docs/assistant-setup.md` | doc | existing documentation | 65 | pending |
| `drizzle.config.ts` | config | project config | 4 | pending |
| `drizzle/0000_calm_rachel_grey.sql` | source | SQL migration (schema history) | 81 | pending |
| `drizzle/0001_audit_append_only.sql` | source | SQL migration (schema history) | 11 | pending |
| `drizzle/0002_stale_molecule_man.sql` | source | SQL migration (schema history) | 26 | pending |
| `drizzle/0003_product_catalog.sql` | source | SQL migration (schema history) | 34 | pending |
| `drizzle/0004_collections_services.sql` | source | SQL migration (schema history) | 61 | pending |
| `drizzle/0005_staff_campaigns_leads.sql` | source | SQL migration (schema history) | 159 | pending |
| `drizzle/0006_orders.sql` | source | SQL migration (schema history) | 58 | pending |
| `drizzle/0007_delivery_tracking.sql` | source | SQL migration (schema history) | 37 | pending |
| `drizzle/0008_analytics.sql` | source | SQL migration (schema history) | 8 | pending |
| `drizzle/0009_cash_on_delivery.sql` | source | SQL migration (schema history) | 9 | pending |
| `drizzle/0010_jewelry_section_type.sql` | source | SQL migration (schema history) | 2 | pending |
| `drizzle/0011_two_factor.sql` | source | SQL migration (schema history) | 14 | pending |
| `drizzle/0012_product_views.sql` | source | SQL migration (schema history) | 9 | pending |
| `drizzle/0013_variants_refunds.sql` | source | SQL migration (schema history) | 30 | pending |
| `drizzle/0014_robust_skrulls.sql` | source | SQL migration (schema history) | 76 | pending |
| `drizzle/0015_hard_stephen_strange.sql` | source | SQL migration (schema history) | 1 | pending |
| `drizzle/0016_wide_randall.sql` | source | SQL migration (schema history) | 2 | pending |
| `drizzle/0017_cloudy_martin_li.sql` | source | SQL migration (schema history) | 5 | pending |
| `drizzle/0018_assistant.sql` | source | SQL migration (schema history) | 92 | pending |
| `drizzle/meta/0000_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0001_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0002_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0003_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0004_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0005_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0006_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0007_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0008_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0009_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0010_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0011_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0012_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0013_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0014_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0015_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0016_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0017_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/0018_snapshot.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `drizzle/meta/_journal.json` | generated | drizzle-kit snapshot (generated) |  | excluded-nonreadable-or-generated |
| `eslint.config.mjs` | config | project config | 4 | pending |
| `next.config.ts` | config | project config | 56 | reviewed |
| `package-lock.json` | generated | npm lockfile (generated) |  | excluded-nonreadable-or-generated |
| `package.json` | config | project config | 54 | pending |
| `postcss.config.mjs` | config | project config | 2 | pending |
| `public/assistant/rocket-mint-static.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/assistant/rocket-mint.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/file.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/globe.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/campaign.png` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/fabric.png` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/headphones.png` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/oanro-demo-products.png` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/products.png` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/images/products.webp` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/logo.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/media/knit-study.mp4` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/media/knit-study.webm` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/next.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/vercel.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `public/window.svg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/bootstrap-owner.ts` | source | maintenance script | 16 | pending |
| `scripts/sample-images/bass-mini-speaker.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/canvas-bucket-hat.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/classic-baseball-cap.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/compact-mechanical-keyboard.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/crystal-nose-pin.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/gold-jhumka-earrings.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/minimal-stone-ring.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/pearl-drop-necklace.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/power-bank-20000.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/pulse-smartwatch.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/silent-wireless-mouse.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/silver-charm-anklet.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/sports-dry-fit-cap.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/street-snapback.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/trucker-mesh-cap.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/true-wireless-earbuds.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/twisted-bangle-pair.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/sample-images/winter-knit-beanie.jpg` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `scripts/seed-jewelry-images.ts` | source | maintenance script | 25 | pending |
| `scripts/seed-preview-products.ts` | source | maintenance script | 62 | pending |
| `scripts/seed-samples.ts` | source | maintenance script | 29 | pending |
| `src/app/[collection]/page.tsx` | source | page / layout / CSS | 69 | pending |
| `src/app/about/page.tsx` | source | page / layout / CSS | 42 | pending |
| `src/app/account/page.tsx` | source | page / layout / CSS | 41 | pending |
| `src/app/admin/activity/page.tsx` | source | page / layout / CSS | 50 | pending |
| `src/app/admin/admin.css` | source | page / layout / CSS | 209 | pending |
| `src/app/admin/assistant/page.tsx` | source | page / layout / CSS | 80 | pending |
| `src/app/admin/banners/page.tsx` | source | page / layout / CSS | 14 | pending |
| `src/app/admin/campaigns/page.tsx` | source | page / layout / CSS | 14 | pending |
| `src/app/admin/company-profile/page.tsx` | source | page / layout / CSS | 14 | pending |
| `src/app/admin/content/page.tsx` | source | page / layout / CSS | 16 | pending |
| `src/app/admin/customers/[id]/page.tsx` | source | page / layout / CSS | 44 | pending |
| `src/app/admin/customers/page.tsx` | source | page / layout / CSS | 37 | pending |
| `src/app/admin/discounts/page.tsx` | source | page / layout / CSS | 19 | pending |
| `src/app/admin/layout.tsx` | source | page / layout / CSS | 25 | pending |
| `src/app/admin/leads/page.tsx` | source | page / layout / CSS | 15 | pending |
| `src/app/admin/orders/page.tsx` | source | page / layout / CSS | 17 | pending |
| `src/app/admin/page.tsx` | source | page / layout / CSS | 81 | pending |
| `src/app/admin/published/page.tsx` | source | page / layout / CSS | 22 | pending |
| `src/app/admin/pulse/page.tsx` | source | page / layout / CSS | 10 | pending |
| `src/app/admin/reports/profit/page.tsx` | source | page / layout / CSS | 82 | pending |
| `src/app/admin/reports/sales/page.tsx` | source | page / layout / CSS | 67 | pending |
| `src/app/admin/sections/[id]/page.tsx` | source | page / layout / CSS | 22 | pending |
| `src/app/admin/sections/page.tsx` | source | page / layout / CSS | 47 | pending |
| `src/app/admin/services/page.tsx` | source | page / layout / CSS | 9 | pending |
| `src/app/admin/settings/page.tsx` | source | page / layout / CSS | 17 | pending |
| `src/app/admin/staff/page.tsx` | source | page / layout / CSS | 10 | pending |
| `src/app/api/account/bag/route.ts` | source | API route | 19 | reviewed |
| `src/app/api/account/delete/route.ts` | source | API route | 26 | reviewed |
| `src/app/api/account/profile/route.ts` | source | API route | 22 | pending |
| `src/app/api/admin/assistant/faq/route.ts` | source | API route | 9 | partial |
| `src/app/api/admin/assistant/settings/route.ts` | source | API route | 11 | partial |
| `src/app/api/admin/assistant/unanswered/route.ts` | source | API route | 7 | partial |
| `src/app/api/admin/banners/route.ts` | source | API route | 10 | reviewed |
| `src/app/api/admin/campaigns/route.ts` | source | API route | 21 | partial |
| `src/app/api/admin/collections/route.ts` | source | API route | 23 | partial |
| `src/app/api/admin/company-profile/route.ts` | source | API route | 10 | partial |
| `src/app/api/admin/content/route.ts` | source | API route | 10 | partial |
| `src/app/api/admin/costs/route.ts` | source | API route | 23 | partial |
| `src/app/api/admin/customer-notes/route.ts` | source | API route | 13 | partial |
| `src/app/api/admin/customers/route.ts` | source | API route | 35 | reviewed |
| `src/app/api/admin/discounts/route.ts` | source | API route | 15 | partial |
| `src/app/api/admin/export/route.ts` | source | API route | 41 | partial |
| `src/app/api/admin/leads/route.ts` | source | API route | 19 | partial |
| `src/app/api/admin/order-extras/route.ts` | source | API route | 19 | partial |
| `src/app/api/admin/orders/[id]/screenshot/route.ts` | source | API route | 23 | reviewed |
| `src/app/api/admin/orders/route.ts` | source | API route | 83 | partial |
| `src/app/api/admin/products/route.ts` | source | API route | 66 | partial |
| `src/app/api/admin/pulse/route.ts` | source | API route | 107 | partial |
| `src/app/api/admin/sections/route.ts` | source | API route | 27 | partial |
| `src/app/api/admin/security/route.ts` | source | API route | 13 | partial |
| `src/app/api/admin/services/route.ts` | source | API route | 21 | partial |
| `src/app/api/admin/site-media/route.ts` | source | API route | 13 | partial |
| `src/app/api/admin/staff/route.ts` | source | API route | 53 | partial |
| `src/app/api/assistant/handoff/route.ts` | source | API route | 51 | reviewed |
| `src/app/api/assistant/route.ts` | source | API route | 57 | reviewed |
| `src/app/api/assistant/track/route.ts` | source | API route | 32 | reviewed |
| `src/app/api/assistant/transcribe/route.ts` | source | API route | 44 | reviewed |
| `src/app/api/assistant/weather/route.ts` | source | API route | 25 | reviewed |
| `src/app/api/auth/[...all]/route.ts` | source | API route | 8 | pending |
| `src/app/api/campaigns/[slug]/image/route.ts` | source | API route | 18 | pending |
| `src/app/api/cron/assistant-cleanup/route.ts` | source | API route | 13 | reviewed |
| `src/app/api/cron/bag-reminders/route.ts` | source | API route | 11 | partial |
| `src/app/api/discounts/check/route.ts` | source | API route | 22 | reviewed |
| `src/app/api/inquiries/route.ts` | source | API route | 27 | reviewed |
| `src/app/api/newsletter/route.ts` | source | API route | 20 | reviewed |
| `src/app/api/order-status/route.ts` | source | API route | 20 | reviewed |
| `src/app/api/orders/route.ts` | source | API route | 53 | reviewed |
| `src/app/api/products/[slug]/image/route.ts` | source | API route | 22 | pending |
| `src/app/api/products/route.ts` | source | API route | 8 | pending |
| `src/app/api/pulse/[id]/thumbnail/route.ts` | source | API route | 19 | pending |
| `src/app/api/services/[slug]/image/route.ts` | source | API route | 18 | pending |
| `src/app/api/site-config/route.ts` | source | API route | 3 | pending |
| `src/app/api/site-media/[key]/route.ts` | source | API route | 18 | pending |
| `src/app/api/track/view/route.ts` | source | API route | 16 | reviewed |
| `src/app/api/unsubscribe/route.ts` | source | API route | 16 | reviewed |
| `src/app/apple-icon.tsx` | source | page / layout / CSS | 5 | pending |
| `src/app/assistant.css` | source | page / layout / CSS | 311 | pending |
| `src/app/checkout/page.tsx` | source | page / layout / CSS | 18 | pending |
| `src/app/company-profile/company-profile.css` | source | page / layout / CSS | 208 | pending |
| `src/app/company-profile/page.tsx` | source | page / layout / CSS | 34 | pending |
| `src/app/contact/page.tsx` | source | page / layout / CSS | 27 | pending |
| `src/app/delivery-returns/page.tsx` | source | page / layout / CSS | 54 | pending |
| `src/app/error.tsx` | source | page / layout / CSS | 16 | pending |
| `src/app/favicon.ico` | asset | binary/media asset |  | excluded-nonreadable-or-generated |
| `src/app/feed/google.xml/route.ts` | source | page / layout / CSS | 27 | pending |
| `src/app/globals.css` | source | page / layout / CSS | 1075 | partial |
| `src/app/guides/[slug]/page.tsx` | source | page / layout / CSS | 28 | pending |
| `src/app/guides/page.tsx` | source | page / layout / CSS | 18 | pending |
| `src/app/icon.tsx` | source | page / layout / CSS | 10 | pending |
| `src/app/layout.tsx` | source | page / layout / CSS | 72 | partial |
| `src/app/manifest.ts` | source | page / layout / CSS | 10 | pending |
| `src/app/not-found.tsx` | source | page / layout / CSS | 16 | pending |
| `src/app/og/product/[slug]/route.tsx` | source | page / layout / CSS | 41 | pending |
| `src/app/page.tsx` | source | page / layout / CSS | 102 | pending |
| `src/app/privacy/page.tsx` | source | page / layout / CSS | 55 | pending |
| `src/app/products/[slug]/loading.tsx` | source | page / layout / CSS | 8 | partial |
| `src/app/products/[slug]/page.tsx` | source | page / layout / CSS | 54 | partial |
| `src/app/reset-password/page.tsx` | source | page / layout / CSS | 8 | reviewed |
| `src/app/robots.ts` | source | page / layout / CSS | 6 | reviewed |
| `src/app/services/[slug]/page.tsx` | source | page / layout / CSS | 75 | pending |
| `src/app/sign-in/page.tsx` | source | page / layout / CSS | 9 | reviewed |
| `src/app/sitemap.ts` | source | page / layout / CSS | 28 | reviewed |
| `src/app/terms/page.tsx` | source | page / layout / CSS | 19 | pending |
| `src/app/track/page.tsx` | source | page / layout / CSS | 7 | pending |
| `src/app/v2.css` | source | page / layout / CSS | 1253 | pending |
| `src/components/action-icon.tsx` | source | React component | 33 | pending |
| `src/components/admin-nav.tsx` | source | React component | 2 | pending |
| `src/components/admin-shell.tsx` | source | React component | 75 | pending |
| `src/components/admin-ui.tsx` | source | React component | 70 | pending |
| `src/components/analytics.tsx` | source | React component | 11 | reviewed |
| `src/components/announce-toast.tsx` | source | React component | 20 | pending |
| `src/components/assistant-admin.tsx` | source | React component | 70 | pending |
| `src/components/assistant-cards.tsx` | source | React component | 65 | pending |
| `src/components/assistant-clock.tsx` | source | React component | 20 | pending |
| `src/components/assistant-close.tsx` | source | React component | 23 | pending |
| `src/components/assistant-forms.tsx` | source | React component | 66 | pending |
| `src/components/assistant-launcher.tsx` | source | React component | 38 | pending |
| `src/components/assistant-loader.tsx` | source | React component | 7 | pending |
| `src/components/assistant-mascot.tsx` | source | React component | 15 | pending |
| `src/components/assistant-rich-text.tsx` | source | React component | 8 | pending |
| `src/components/assistant-sky.tsx` | source | React component | 108 | pending |
| `src/components/assistant-voice.tsx` | source | React component | 207 | pending |
| `src/components/assistant-weather.tsx` | source | React component | 29 | pending |
| `src/components/assistant-widget.tsx` | source | React component | 173 | pending |
| `src/components/auth-panel.tsx` | source | React component | 98 | reviewed |
| `src/components/banner-manager.tsx` | source | React component | 42 | pending |
| `src/components/bottom-bar.tsx` | source | React component | 24 | pending |
| `src/components/brand-headline.tsx` | source | React component | 33 | pending |
| `src/components/buy-box.tsx` | source | React component | 110 | pending |
| `src/components/campaign-dashboard.tsx` | source | React component | 76 | pending |
| `src/components/campaign-showcase.tsx` | source | React component | 24 | pending |
| `src/components/category-tiles.tsx` | source | React component | 21 | pending |
| `src/components/checkout-form.tsx` | source | React component | 192 | pending |
| `src/components/collection-admin.tsx` | source | React component | 66 | pending |
| `src/components/collection-browser.tsx` | source | React component | 44 | pending |
| `src/components/collection-conveyor.tsx` | source | React component | 39 | pending |
| `src/components/company-profile-editor.tsx` | source | React component | 123 | pending |
| `src/components/company-profile-view.tsx` | source | React component | 127 | pending |
| `src/components/contact-inquiry.tsx` | source | React component | 9 | pending |
| `src/components/content-editor.tsx` | source | React component | 206 | pending |
| `src/components/conveyor-effects.module.css` | source | React component | 38 | pending |
| `src/components/csv-button.tsx` | source | React component | 13 | pending |
| `src/components/customer-delete.tsx` | source | React component | 26 | pending |
| `src/components/customer-email.tsx` | source | React component | 35 | pending |
| `src/components/delete-account.tsx` | source | React component | 28 | pending |
| `src/components/discount-manager.tsx` | source | React component | 97 | pending |
| `src/components/double-conveyor.tsx` | source | React component | 71 | pending |
| `src/components/experience.tsx` | source | React component | 49 | pending |
| `src/components/fee-setting.tsx` | source | React component | 21 | pending |
| `src/components/flip-panel.tsx` | source | React component | 15 | pending |
| `src/components/form-popup.tsx` | source | React component | 33 | pending |
| `src/components/global-pulse.tsx` | source | React component | 52 | pending |
| `src/components/home-experience.tsx` | source | React component | 53 | pending |
| `src/components/home-trust.tsx` | source | React component | 49 | pending |
| `src/components/home-v2.tsx` | source | React component | 327 | pending |
| `src/components/inquiry-form.tsx` | source | React component | 59 | pending |
| `src/components/json-ld.tsx` | source | React component | 4 | pending |
| `src/components/lead-inbox.tsx` | source | React component | 51 | pending |
| `src/components/legal-page.tsx` | source | React component | 16 | pending |
| `src/components/locale-link.tsx` | source | React component | 12 | pending |
| `src/components/locale.tsx` | source | React component | 83 | pending |
| `src/components/message-reveal.tsx` | source | React component | 10 | pending |
| `src/components/meta-pixel.tsx` | source | React component | 29 | partial |
| `src/components/my-orders.tsx` | source | React component | 39 | pending |
| `src/components/order-tracker.tsx` | source | React component | 43 | pending |
| `src/components/orders-dashboard.tsx` | source | React component | 182 | pending |
| `src/components/privacy-center.tsx` | source | React component | 109 | partial |
| `src/components/product-dashboard.tsx` | source | React component | 187 | pending |
| `src/components/product-detail.tsx` | source | React component | 86 | pending |
| `src/components/products-context.tsx` | source | React component | 31 | pending |
| `src/components/profile-form.tsx` | source | React component | 55 | pending |
| `src/components/profile-icon.tsx` | source | React component | 19 | pending |
| `src/components/published-products.tsx` | source | React component | 55 | pending |
| `src/components/pulse-thumbnail.tsx` | source | React component | 14 | pending |
| `src/components/pulse-upload.tsx` | source | React component | 40 | pending |
| `src/components/related-products.tsx` | source | React component | 55 | pending |
| `src/components/report-charts.tsx` | source | React component | 86 | pending |
| `src/components/scene.tsx` | source | React component | 87 | pending |
| `src/components/section-dashboard.tsx` | source | React component | 141 | pending |
| `src/components/section-switch.tsx` | source | React component | 32 | pending |
| `src/components/security-panel.tsx` | source | React component | 82 | partial |
| `src/components/service-dashboard.tsx` | source | React component | 62 | pending |
| `src/components/shell.tsx` | source | React component | 154 | pending |
| `src/components/signature.tsx` | source | React component | 4 | pending |
| `src/components/site-content-context.tsx` | source | React component | 14 | pending |
| `src/components/site-extras.tsx` | source | React component | 60 | pending |
| `src/components/social-icon.tsx` | source | React component | 20 | pending |
| `src/components/staff-dashboard.tsx` | source | React component | 79 | pending |
| `src/components/team-extras.tsx` | source | React component | 50 | pending |
| `src/components/trust-bar.tsx` | source | React component | 30 | pending |
| `src/components/value-fan.module.css` | source | React component | 25 | pending |
| `src/components/value-fan.tsx` | source | React component | 60 | pending |
| `src/components/value-motion.ts` | source | React component | 16 | pending |
| `src/components/view-counter.tsx` | source | React component | 14 | pending |
| `src/lib/access.ts` | source | business logic / helper | 15 | reviewed |
| `src/lib/admin-api.ts` | source | business logic / helper | 54 | reviewed |
| `src/lib/admin-guard.ts` | source | business logic / helper | 24 | reviewed |
| `src/lib/admin-menu.ts` | source | business logic / helper | 46 | pending |
| `src/lib/admin-today.ts` | source | business logic / helper | 46 | pending |
| `src/lib/assistant/config.ts` | source | JUNO assistant logic | 59 | pending |
| `src/lib/assistant/engine.ts` | source | JUNO assistant logic | 170 | pending |
| `src/lib/assistant/language.ts` | source | JUNO assistant logic | 25 | pending |
| `src/lib/assistant/match.ts` | source | JUNO assistant logic | 99 | pending |
| `src/lib/assistant/messages.ts` | source | JUNO assistant logic | 45 | pending |
| `src/lib/assistant/prompt.ts` | source | JUNO assistant logic | 25 | reviewed |
| `src/lib/assistant/providers.ts` | source | JUNO assistant logic | 50 | pending |
| `src/lib/assistant/sanitize.ts` | source | JUNO assistant logic | 99 | pending |
| `src/lib/assistant/server.ts` | source | JUNO assistant logic | 122 | reviewed |
| `src/lib/assistant/sky.ts` | source | JUNO assistant logic | 38 | pending |
| `src/lib/assistant/speech.ts` | source | JUNO assistant logic | 39 | pending |
| `src/lib/assistant/store.ts` | source | JUNO assistant logic | 215 | pending |
| `src/lib/assistant/tools.ts` | source | JUNO assistant logic | 95 | reviewed |
| `src/lib/assistant/tracking.ts` | source | JUNO assistant logic | 18 | pending |
| `src/lib/assistant/transcribe.ts` | source | JUNO assistant logic | 27 | pending |
| `src/lib/assistant/types.ts` | source | JUNO assistant logic | 37 | pending |
| `src/lib/assistant/voice-core.ts` | source | JUNO assistant logic | 91 | pending |
| `src/lib/assistant/weather.ts` | source | JUNO assistant logic | 83 | partial |
| `src/lib/auth-client.ts` | source | business logic / helper | 5 | reviewed |
| `src/lib/auth-factory.ts` | source | business logic / helper | 44 | reviewed |
| `src/lib/auth.ts` | source | business logic / helper | 23 | reviewed |
| `src/lib/banner-store.ts` | source | business logic / helper | 39 | pending |
| `src/lib/campaign-store.ts` | source | business logic / helper | 109 | pending |
| `src/lib/cart.ts` | source | business logic / helper | 37 | pending |
| `src/lib/catalog.ts` | source | business logic / helper | 76 | pending |
| `src/lib/categories.ts` | source | business logic / helper | 45 | pending |
| `src/lib/company-profile-data.ts` | source | business logic / helper | 138 | pending |
| `src/lib/company-profile.ts` | source | business logic / helper | 42 | pending |
| `src/lib/consent.ts` | source | business logic / helper | 52 | reviewed |
| `src/lib/content.ts` | source | business logic / helper | 52 | pending |
| `src/lib/customer-mail.ts` | source | business logic / helper | 100 | partial |
| `src/lib/customer-store.ts` | source | business logic / helper | 76 | reviewed |
| `src/lib/db/bootstrap-owner.ts` | source | database schema/client | 16 | pending |
| `src/lib/db/index.ts` | source | database schema/client | 25 | reviewed |
| `src/lib/db/light.ts` | source | database schema/client | 11 | reviewed |
| `src/lib/db/schema.ts` | source | database schema/client | 408 | partial |
| `src/lib/delivery-fee.ts` | source | business logic / helper | 13 | pending |
| `src/lib/dhaka-time.ts` | source | business logic / helper | 29 | pending |
| `src/lib/discount-store.ts` | source | business logic / helper | 83 | reviewed |
| `src/lib/lead-store.ts` | source | business logic / helper | 85 | reviewed |
| `src/lib/locale-path.ts` | source | business logic / helper | 20 | pending |
| `src/lib/mailer.ts` | source | business logic / helper | 19 | reviewed |
| `src/lib/marketing.ts` | source | business logic / helper | 68 | reviewed |
| `src/lib/meta-capi.ts` | source | business logic / helper | 19 | reviewed |
| `src/lib/meta-pixel.ts` | source | business logic / helper | 9 | reviewed |
| `src/lib/order-flow.ts` | source | business logic / helper | 7 | pending |
| `src/lib/order-input.ts` | source | business logic / helper | 69 | partial |
| `src/lib/order-notify.ts` | source | business logic / helper | 130 | pending |
| `src/lib/order-stages.ts` | source | business logic / helper | 14 | pending |
| `src/lib/order-store.ts` | source | business logic / helper | 243 | partial |
| `src/lib/permissions.ts` | source | business logic / helper | 68 | reviewed |
| `src/lib/photo-resize.ts` | source | business logic / helper | 21 | pending |
| `src/lib/product-input.ts` | source | business logic / helper | 223 | pending |
| `src/lib/product-store.ts` | source | business logic / helper | 244 | pending |
| `src/lib/product-views.ts` | source | business logic / helper | 33 | pending |
| `src/lib/profile-store.ts` | source | business logic / helper | 41 | pending |
| `src/lib/public-rules.ts` | source | business logic / helper | 13 | pending |
| `src/lib/pulse-thumbnail.ts` | source | business logic / helper | 137 | partial |
| `src/lib/pulse-upload.ts` | source | business logic / helper | 10 | reviewed |
| `src/lib/qr.ts` | source | business logic / helper | 100 | pending |
| `src/lib/rate-limit.ts` | source | business logic / helper | 31 | reviewed |
| `src/lib/rbac.ts` | source | business logic / helper | 165 | reviewed |
| `src/lib/report-store.ts` | source | business logic / helper | 215 | pending |
| `src/lib/request-locale.ts` | source | business logic / helper | 14 | partial |
| `src/lib/sample-catalog.ts` | source | business logic / helper | 41 | pending |
| `src/lib/seo-copy.ts` | source | business logic / helper | 58 | pending |
| `src/lib/seo.ts` | source | business logic / helper | 36 | reviewed |
| `src/lib/service-store.ts` | source | business logic / helper | 82 | pending |
| `src/lib/site-config.ts` | source | business logic / helper | 19 | pending |
| `src/lib/site-content-data.ts` | source | business logic / helper | 132 | pending |
| `src/lib/site-content.ts` | source | business logic / helper | 52 | pending |
| `src/lib/site-media.ts` | source | business logic / helper | 33 | pending |
| `src/lib/site-url.ts` | source | business logic / helper | 6 | reviewed |
| `src/lib/smart-search.ts` | source | business logic / helper | 83 | pending |
| `src/lib/store-products.ts` | source | business logic / helper | 87 | pending |
| `src/lib/storefront-cache.ts` | source | business logic / helper | 13 | reviewed |
| `src/lib/team-notes.ts` | source | business logic / helper | 38 | reviewed |
| `src/lib/tech-logos.ts` | source | business logic / helper | 13 | pending |
| `src/lib/text-format.ts` | source | business logic / helper | 3 | pending |
| `src/lib/two-factor-policy.ts` | source | business logic / helper | 39 | reviewed |
| `src/lib/website-sections.ts` | source | business logic / helper | 47 | pending |
| `src/proxy.ts` | source | app entry (proxy) | 22 | reviewed |
| `tests/assistant.test.ts` | source | test | 501 | pending |
| `tests/campaign.test.ts` | source | test | 50 | pending |
| `tests/discount.test.ts` | source | test | 27 | pending |
| `tests/foundation.test.ts` | source | test | 82 | partial |
| `tests/leads.test.ts` | source | test | 55 | pending |
| `tests/motion.cjs` | source | test | 48 | pending |
| `tests/orders.test.ts` | source | test | 219 | pending |
| `tests/product-catalog.test.ts` | source | test | 170 | pending |
| `tests/pulse-thumbnail.test.ts` | source | test | 32 | pending |
| `tests/pulse-upload.test.ts` | source | test | 13 | pending |
| `tests/rbac.test.ts` | source | test | 86 | partial |
| `tests/search.test.ts` | source | test | 15 | pending |
| `tests/smoke.cjs` | source | test | 52 | pending |
| `tsconfig.json` | config | project config | 1 | pending |
| `vercel.json` | config | project config | 6 | pending |
