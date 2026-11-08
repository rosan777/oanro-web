# OANRO redesign integration — plan for approval (revision 3, decisions finalized)

Date: 2026-11-05. Status: **APPROVED by the owner for local implementation and testing (with admin
Bangla and quick view added). The three project permissions are approved and assigned to no role.**
Approval authorizes **local code changes and local testing only**. It does not authorize any Git
commit, push, merge, rebase or reset, any deployment, hosted preview or publishing action, or any
change to production or its database. Each of those needs the owner's separate, explicit permission.

### What changed from revision 1

Revision 1 proposed porting only the small homepage changes and keeping the Products / Services /
About header. You rejected that. In this revision **the `/design-preview` design is the target for the
whole site**: its Store / Studio / Software / Workspace navigation, its homepage layout, its screens
and its visual system become the real customer interface at `/` and every other route. Every
existing destination and workflow is placed inside that design, connected to the real backend. The
prototype's new features (wishlist, compare, saved addresses, invoices, project brief, Software page,
client Workspace, redesigned admin) are specified as real, database-backed features below.

---

## 1. Target and what is excluded

**Becomes the real site:** the design-preview header, footer, homepage, Shop, Product, Wishlist,
Compare, Bag, Checkout, Confirmation, Studio, Project brief, Software, Workspace, Sign in, My account
(8 tabs) and Administration (10 views), plus its tokens, cards, forms, tables, dialogs, empty states
and motion.

**Review tools, not ported to the customer interface:**

- the "Design concept · local demo" toolbar, the screen selector and "Brand direction" button;
- the "Sample screen… Open the working page" / "Concept only" banner;
- every "demo", "sample", "concept", "no real record" label and toast;
- the Design system and Brand directions screens;
- the footer FAQ about the prototype ("Is this a live store?" …);
- the JUNO "visual preview" button inside the concept. **The real JUNO stays exactly as it is.**

The prototype folder keeps `/design-preview` unchanged for reference; it is not copied into this
repository.

---

## 2. Verified baseline (summary of revision 1 findings, still true)

- `oanro-redesign-v3` = this repository at `5fa15c0` + a small delta (homepage hero, product card
  fix, footer region button, logo, `redesign-v3.css`) + the `/design-preview` concept. **No server
  code differs**: `src/lib`, all 51 APIs, schema, migrations, tests are identical.
- The concept runs entirely on local React state and the static sample list in `lib/catalog.ts`.
  Nothing in it reads the database, signs in, places an order or saves anything.
- `oanro-full-local-prototype` (a git worktree of this repo) and `oanro-local-prototype` (static HTML)
  are earlier stages with no unique work.
- This repo: branch `chore/prettier-format` = `main` = `5fa15c0`, clean apart from untracked
  `OANRO-All-Code.md`, `dev.log` and this `docs/integration/` folder.
- Baseline `npm test` today: **82 / 83 pass**; the known `rbac.test.ts` failure (Manager role in the
  migration has 5 fewer permissions than the code template).
- Portfolio: the original has **no list of projects or case studies** anywhere (code, DB, assets,
  history, any branch). The only portfolio content is the editable "Portfolio" section of the company
  profile (confidential work shared privately). It is preserved verbatim.

---

## 3. How the concept becomes a real application

The concept is one 2,739-line client component with a 90 KB stylesheet scoped under `.dp`. It is
rebuilt, not mounted:

1. **Design system.** `prototype.css` tokens (ivory, white, charcoal, violet, lilac, gold, sage,
   peach, semantic colours, radii, shadows, spacing, type scale) move to `globals.css :root` and become
   the only token set. Component rules are ported into one site stylesheet (`src/app/oanro.css`) with
   real class names (`.o-header`, `.o-card`, `.o-button`, …). Old `v2.css` / page CSS rules are retired
   page by page as each page moves to the new components; nothing is deleted while still used.
   Existing variable names (`--brand`, `--accent`, `--surface`, …) keep working so admin and
   untouched CSS inherit the new values.
2. **Components.** Each concept screen becomes a server-rendered route that loads real data through
   the existing stores (`store-products.ts`, `service-store.ts`, `order-store.ts`, `lead-store.ts`,
   `profile-store.ts`, …) and uses small client islands only for interaction (search, filters,
   bag, wishlist, compare, forms). Shared pieces: `SiteHeader`, `SiteFooter`, `ProductCard`,
   `EmptyState`, `Dialog` (with the concept's focus trap), `Tabs`, `StepIndicator`, `StatusPill`,
   `MetricCard`, `DataTable`, `Kanban`.
3. **Existing logic is reused as-is.** Business rules stay in `src/lib`; the new UI calls the same
   APIs and server functions. The browser is never authoritative for price, stock, permission,
   payment or order state.
4. **Layout.** `layout.tsx` swaps `Header`/`Footer` for `SiteHeader`/`SiteFooter`. Everything else in
   the layout stays: locale provider, site content and storefront config, announcement bar
   (`TrustBar`), privacy center/consent, analytics/Meta pixel (only when switched on), floating
   WhatsApp/back-to-top, custom cursor, intro, mobile bottom bar (restyled), **JUNO loader untouched**.

---

## 4. Navigation: where every existing destination goes

Header (desktop): **OANRO® · The store ▾ · The studio ▾ · Software · Workspace** — then language
(EN/বাং), search, wishlist (count), bag (count), account. Mobile: the same items in the drawer, plus
the existing bottom bar.

| Existing destination                                                       | New place                                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Collections mega-menu (all DB collections, with images)                    | "The store ▾" panel; "Shop everything" → new `/shop`                              |
| `/[collection]` pages                                                      | unchanged URLs, new Shop layout                                                   |
| Header search dialog (smart EN/BN search)                                  | header search icon → same search, new dialog; also the search field on `/shop`    |
| Services mega-menu (DB services)                                           | "The studio ▾" panel; "All services" → new `/services`                            |
| `/services/[slug]`                                                         | unchanged URL, new Studio detail layout                                           |
| `/contact`                                                                 | "Tell us your idea" buttons, studio panel, footer; becomes the Project brief form |
| `/about`, `/company-profile`                                               | footer "Good to know" + studio panel                                              |
| `/guides` (Global Pulse / guides)                                          | footer "Explore"; studio panel "Guides & Global Pulse"                            |
| `/track`                                                                   | account menu + footer "Your OANRO" + order confirmation                           |
| `/delivery-returns`, `/privacy`, `/terms`                                  | footer "Good to know"                                                             |
| `/account`, `/sign-in`, `/reset-password`                                  | account icon / "Your OANRO" footer column                                         |
| `/checkout`                                                                | bag icon → bag → checkout                                                         |
| Home anchors (`#products`, `#studio`, `#about`, `#contact`, `#partners`)   | kept as section IDs on the new homepage                                           |
| Newsletter, social links, region/language, privacy settings, payment logos | new footer                                                                        |
| `/admin`                                                                   | not in customer navigation (as today); account menu shows "Admin" only to staff   |

Every link in the header and footer points to a real route; none points to a concept.

---

## 5. Screen-by-screen mapping

"Existing" = the backend already exists and is reused. "New" = specified in §6.

| Concept screen                                             | Real route                                                 | Data and actions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Backend                            |
| ---------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Header / footer                                            | every page                                                 | DB collections and services in menus; newsletter → `/api/newsletter`; language → `/bn` routing; region shows Bangladesh · BDT                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Existing                           |
| Overview (home)                                            | `/`                                                        | Hero "Good things. Bigger ideas." with the featured product (existing featured-product setting); brand strip; "New favourites" = 3 live products; Studio teaser; "One OANRO. Your way." tiles → Wishlist / Workspace / Account; shop banner. **All original home sections stay** below, rendered in the new design and still switched on/off from Admin → Website content (promise strip, delivery checker, category tiles, trust strip, conveyors, product story, campaigns, why-OANRO, about + signature, values, value fan, studio terminal, how we work, contact, FAQ, Global Pulse) | Existing                           |
| Shop                                                       | `/shop` (new route, all live products) and `/[collection]` | Search (smart search), collection list with real counts, budget range (existing max-price filter), sort, **plus the existing in-stock, size and colour filters**; result count; reset; empty state; wishlist heart; compare toggle                                                                                                                                                                                                                                                                                                                                                       | Existing + wishlist/compare        |
| Product detail                                             | `/products/[slug]`                                         | Real photos/colour photos, sizes, stock, price/compare-at, buy box, sticky buy bar, size guide, details/delivery/care accordions filled from product fields and delivery rules, related products, restock request, view counter, JSON-LD                                                                                                                                                                                                                                                                                                                                                 | Existing + wishlist/compare        |
| Wishlist                                                   | `/wishlist` + account tab                                  | Saved products with live price/stock; move to bag; remove; empty state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | **New**                            |
| Compare                                                    | `/compare`                                                 | Up to 3 products side by side from live data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **New (no DB)**                    |
| Shopping bag                                               | bag drawer + `/checkout` step 0                            | Existing `cart.ts`; quantities limited by live stock; discount code → `/api/discounts/check`; server-computed totals                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Existing                           |
| Checkout (Delivery → Payment → Review)                     | `/checkout`                                                | Existing form split into three steps: name/phone/alt phone/address/area/city/inside-outside Dhaka (+ saved address picker); bKash / Nagad / cash on delivery with TrxID rules and "coming soon" when no payment number is set; review with server totals and consent → `/api/orders`                                                                                                                                                                                                                                                                                                     | Existing (+ saved addresses)       |
| Confirmation                                               | `/checkout` success state                                  | Real order number, payment state, links to `/track` and account orders                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Existing                           |
| Studio                                                     | `/services` (new index)                                    | DB services as cards, process (Discover / Design / Build / Launch & support, editable), Studio packages (existing editable content), service FAQ, portfolio notice from the company profile, CTA to brief                                                                                                                                                                                                                                                                                                                                                                                | Existing content + new index route |
| Project brief                                              | `/contact` (and `/services/[slug]` inquiry)                | Existing inquiry API extended with project type, budget range, timeline; consent; rate limit; mail to owner                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Existing + **New fields**          |
| Software                                                   | `/software` (new)                                          | Hero, plan cards (Essential / Business / Custom) and integration list as **admin-editable content**; every CTA opens the brief with type "Software". Quote-only: no prices, no subscription billing (§9 D2)                                                                                                                                                                                                                                                                                                                                                                              | **New (content)**                  |
| Workspace                                                  | `/workspace` (new)                                         | Signed out: what the workspace is + sign in + start a brief. Signed in client: their projects with Overview, Milestones, Files, Approvals, Invoices. No projects: empty state                                                                                                                                                                                                                                                                                                                                                                                                            | **New**                            |
| Sign in / Create account / Reset                           | `/sign-in`, `/reset-password`                              | Existing Better Auth: email verification, resend, show/hide password, email-typo hint, DNS domain check, Google (if configured), staff two-step verification, reset by email                                                                                                                                                                                                                                                                                                                                                                                                             | Existing                           |
| My account                                                 | `/account` with tabs                                       | Overview (real counts), Orders (`my-orders`, timeline wording per §9 default B), Projects (workspace), Wishlist, Addresses, Invoices (order receipts + workspace invoices), Preferences (language, newsletter, existing profile form, security for staff, delete account), Support (sends an inquiry tied to the account)                                                                                                                                                                                                                                                                | Existing + **New**                 |
| Administration                                             | `/admin/**`                                                | See §7                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Existing + **New**                 |
| About, Company profile, Privacy, Terms, Delivery & returns | same URLs                                                  | Full existing text and the editable company profile with all 11 sections and the closing animation, in the new design                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Existing                           |
| Global Pulse / Guides                                      | `/guides`, `/guides/[slug]`, placed Pulse                  | Existing content in the new card style                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Existing                           |
| Error / not-found / loading                                | same                                                       | New design with real recovery links                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Existing                           |

---

## 6. New features — full specification

All money in BDT integers as today. All new tables get Drizzle schema + a generated forward migration
(`0020` onward), Zod validation, store module, API route with rate limit and same-host check on
writes, audit events on staff writes, cache invalidation where storefront content changes, EN/BN UI,
loading/empty/error/success/disabled states, and tests on PGlite. Each migration also gets a written
reverse script in `docs/integration/rollback/` for local recovery (Drizzle has no down migrations).

### 6.1 Wishlist

- Table `wishlist_item (user_id → auth_user cascade, product_id → product cascade, created_at)`,
  primary key (user, product).
- Guests: browser storage only (functional category in the privacy center); merged into the account
  on sign-in.
- API `GET/POST/DELETE /api/account/wishlist` (signed-in only, own rows only). Hidden, archived or
  draft products are never returned.
- UI: heart on every product card and product page, header count, `/wishlist`, account tab, "move to
  bag" (bag rules unchanged).
- Admin: none required. Optional "times saved" column on Published products (read-only).

### 6.2 Compare

- Browser state only (max 3), no table. `/compare` loads live data for the chosen slugs via the
  existing products API: photo, price, compare-at price, sizes, colours, stock, collection, tagline,
  delivery estimate. Not authoritative for anything.

### 6.3 Saved addresses

- Table `customer_address (id, user_id, label, name, phone, address, area, city, postcode,
inside_dhaka, is_default, timestamps)`; max 10 per user.
- Backfill: the existing single address in `customer_profile` becomes the default saved address
  (profile columns stay; nothing removed).
- API `/api/account/addresses` (own rows only). Checkout offers a picker; the order still stores its
  own copy of the address and is validated server-side.

### 6.4 Invoices and receipts

- **Shop orders:** a printable receipt page per order (`/account/orders/[id]/receipt`, owner of the
  order or staff with `orders.read`), generated from the order — no new table. Titled **"Order
  receipt"**. It is never labelled a tax invoice and carries no tax, VAT, BIN or trade-licence fields.
- **Workspace invoices:** see 6.6.

### 6.5 Project brief fields

- Three nullable columns on `lead`: `project_type`, `budget_range`, `timeline` (fixed option lists,
  bilingual labels). Old leads unaffected. Shown and filterable in `/admin/leads`; included in CSV
  export.

### 6.6 Client Workspace (largest item)

Purpose: a signed-in place where a Studio client follows their project. Staff create and run
projects; clients view, upload, approve and pay.

| Entity           | Table                                    | Key fields                                                                                                                                                                                                |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project          | `client_project`                         | id, title, client name, type, status (`planning`, `in_progress`, `in_review`, `completed`, `on_hold`, `cancelled`), lead_id (optional, from a won inquiry), start/target dates, summary EN/BN, created_by |
| Client access    | `client_project_member`                  | project_id, user_id, invited_email, invite token/expiry, role `client`                                                                                                                                    |
| Milestone / task | `client_project_milestone`               | project_id, title, description, due date, status (`todo`, `in_progress`, `in_review`, `done`), order                                                                                                      |
| File             | `client_project_file`                    | project_id, uploaded_by, name, type, size, storage reference, visibility (staff-only / shared), created_at                                                                                                |
| Approval         | `client_project_approval`                | project_id, milestone/file reference, title, status (`requested`, `approved`, `changes_requested`), client comment, decided_by/at                                                                         |
| Invoice          | `client_invoice` + `client_invoice_line` | number, project_id, issue/due date, lines, total, status (`draft`, `issued`, `payment_submitted`, `paid`, `void`), payment method + reference submitted by the client, confirmed_by/at                    |
| Activity         | existing `audit_event`                   | every staff and client action                                                                                                                                                                             |

- **Access rules:** a client sees only projects where they are a member (checked on every query, not
  just in the UI). Staff need the new permissions below. Customers cannot create projects; they
  start a brief, and staff convert a won inquiry into a project and invite the client by email.
- **Payments:** manual, matching the shop — the client pays by bKash / Nagad / bank transfer outside
  the site and submits the transaction reference; staff with `projects.invoices` confirm. No gateway.
- **Invoice wording:** titled "Invoice" (a request for payment), never "Tax invoice". The issuer block
  shows only details OANRO already publishes (name, website, support email from site content). No
  legal, tax, VAT, BIN or licence fields are invented; they can be added later if you supply them.
- **Files:** behind a small storage interface. On localhost the driver is **local test storage**: a
  git-ignored folder (`.local-storage/workspace/`). The local driver refuses to run in production
  (`NODE_ENV=production` or on Vercel). Without a configured driver, uploads are disabled with a clear
  message instead of failing. Limits: PDF, PNG, JPG, WEBP, ZIP; 4 MB per file; 100 MB per project;
  file type checked by content, not just the name. Downloads go through an access-checked API
  (members and permitted staff only); no public file URLs.
- **Notifications:** email on invite, approval requested, invoice issued, payment confirmed — through
  the existing mailer. On localhost every message goes to the **local email sink**; nothing is sent.
- **Admin:** `/admin/projects` (list, kanban by status), `/admin/projects/[id]` (milestones, files,
  approvals, invoices, members, activity), "Convert to project" button on a won inquiry.

### 6.7 Software page content

- New editable list in Admin → Website content ("Software plans" + "Integrations"), same shape and
  editor as the existing Studio packages (name, for whom, included items, EN/BN), under the existing
  `content.manage` permission. Default content = the concept's wording, marked for your review.

### 6.8 Account Preferences and Support

- Language: links to the same page in English/Bangla (the site's language is the URL, as today);
  optional remembered choice in a cookie.
- Newsletter: subscribe/unsubscribe using the existing newsletter table and token flow.
- Support: the existing inquiry API with kind `general`, prefilled from the account; new nullable
  `lead.user_id` so the customer's own requests can be listed in the tab.

### 6.9 Quick view

Included by owner decision. A "Quick view" button on every product card opens an accessible dialog
(focus trap, Escape, focus return) with the real photos and colour photos, price and compare-at price,
size and colour choice, live stock, wishlist and compare toggles, the real add-to-bag logic, and a link
to the full product page. No new data or API; the server still re-checks price and stock at checkout.

---

## 7. Administration in the new design

The concept's admin (top bar, metric cards, date range, tables, kanban, list rows) becomes the admin
shell and page style. **All 21 existing admin pages keep their behaviour, URLs and permission
checks**; the side menu (`admin-menu.ts`) keeps its groups and permission filtering. Concept views map
to real pages:

| Concept view     | Real page(s)                                                                                                                            | Notes                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview         | `/admin` (Today)                                                                                                                        | Metric cards from `adminCounts`/`todayData` and the sales report; chart from real 7-day sales; "Your next actions" from real counts; date range uses the existing report ranges |
| Orders           | `/admin/orders`                                                                                                                         | Existing search, status filter, labels, notes, COD, approve/reject, screenshot, export; order detail dialog with focus trap                                                     |
| Products         | `/admin/sections`, `/admin/sections/[id]`, `/admin/published`                                                                           | Existing catalog, stock, drafts/publish/hide, campaigns link                                                                                                                    |
| Customers        | `/admin/customers`, `/admin/customers/[id]`                                                                                             | Existing notes, email, delete                                                                                                                                                   |
| Leads            | `/admin/leads`                                                                                                                          | New kanban view over the real statuses (new / contacted / qualified / won / lost / closed) plus the existing list, reply-by-email and notes                                     |
| Projects         | `/admin/projects`                                                                                                                       | New (6.6)                                                                                                                                                                       |
| Content          | `/admin/content`, `/admin/company-profile`, `/admin/banners`, `/admin/campaigns`, `/admin/discounts`, `/admin/services`, `/admin/pulse` | A content hub page links to each real editor                                                                                                                                    |
| Reports          | `/admin/reports/sales`, `/admin/reports/profit`                                                                                         | Existing ranges, charts and CSV export                                                                                                                                          |
| Staff            | `/admin/staff`                                                                                                                          | Existing roles, invites, deactivation, permission list                                                                                                                          |
| Settings         | `/admin/settings`                                                                                                                       | Existing payment & delivery (owner-only). The concept's business-name/currency/notification fields are **not** added (§9 default G)                                             |
| (not in concept) | `/admin/activity`, `/admin/assistant`                                                                                                   | Kept. `/admin/assistant` is JUNO's page: **left exactly as it is** (it would only get the shared admin shell/token change; nothing inside it is edited)                         |

**Existing roles are preserved exactly.** No role is added, removed or changed; no "Studio member"
template is created. The minimum new permissions proposed for your approval are listed in §9.
Until you approve assigning them, only the system owner (who already bypasses permission checks) can
use the new staff screens. The existing RBAC test drift is not changed.

---

## 8. Database and migrations

| Migration | Content                                                                   | Backfill                                                  |
| --------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| 0020      | `wishlist_item`                                                           | —                                                         |
| 0021      | `customer_address`                                                        | copy each non-empty `customer_profile` address as default |
| 0022      | `lead.project_type`, `budget_range`, `timeline`, `user_id` (all nullable) | —                                                         |
| 0023      | workspace tables (6.6)                                                    | —                                                         |
| 0024      | Software content keys                                                     | defaults in code, as for Studio packages                  |

Applied only to the local PGlite test database. Existing migrations 0000–0019 are not edited. No
production migration is run or prepared for running.

---

## 9. Finalized decisions and external dependencies

**Decided by the owner (2026-11-05):**

| #   | Decision           | Final                                                                                                                                                                                                                |
| --- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Design direction   | The `/design-preview` design is the whole site (header Store / Studio / Software / Workspace, homepage, visual system), with every existing function inside it. Review tools are not part of the customer interface. |
| D2  | Software           | **Quote-only.** Plans are editable content without prices; every action opens the project brief with type "Software". **No subscription billing**, no payment gateway.                                               |
| D3  | Workspace scope    | **Projects, milestones, files, approvals and invoices are all in scope** (§6.6).                                                                                                                                     |
| D4  | Roles              | **Existing roles preserved exactly.** No role created, removed or changed. New access is assigned only after you approve the permissions below.                                                                      |
| D5  | Legal details      | **None invented.** Shop documents are "Order receipt"; project documents are "Invoice". Neither is called a tax invoice, and neither has tax, VAT, BIN or licence fields.                                            |
| D6  | Local services     | Files use **local test storage** (git-ignored folder, refuses to run in production). Email goes to a **local email sink**. External credentials are listed below for later.                                          |
| D7  | Reserved routes    | Checked against source and local test data only (no production access). Result below.                                                                                                                                |
| D8  | Git and publishing | Local code changes and local testing only. No commit, push, merge, rebase, reset, deployment, hosted preview or production change without your separate, explicit permission.                                        |

**Proposed minimum permissions — for your approval; assigned to no role until you approve:**

| Permission          | Allows                                                                                                                                                                                           | Why it is separate                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `projects.read`     | View all client projects, milestones, files, approvals, invoices and project activity                                                                                                            | Read-only oversight, like `orders.read` / `leads.read`    |
| `projects.manage`   | Create and edit projects and milestones; upload and share files; request approvals; invite or remove client members; convert a won inquiry into a project (also needs the existing `leads.read`) | Day-to-day project work, like `leads.manage`              |
| `projects.invoices` | Create, issue and void invoices; confirm or reject a client's payment reference                                                                                                                  | Money, kept apart like `orders.manage` (approve payments) |

- Clients do not get a staff permission. A client sees a project only because they are a member of it
  (checked on every request).
- `permissions.ts` builds the Manager template as "every permission except the sensitive and narrow
  ones", so a newly added permission would **automatically join the Manager template**. To keep every
  existing role exactly as it is, all three are added to `sensitivePermissions`, and no migration
  grants them to any role. The RBAC test will cover this.
- After you approve them, you can give them to staff through the existing Staff & roles page (a new
  custom role or an existing one). I will not do that assignment myself.

**Reserved-route check (D7), read-only:**

New top-level pages: `/shop`, `/software`, `/workspace`, `/wishlist`, `/compare`, `/services`.
Collections live at `/[collection]`, so a collection with one of these slugs would be hidden.

| Source checked                                                              | Collection slugs                     | Service slugs               | Conflict |
| --------------------------------------------------------------------------- | ------------------------------------ | --------------------------- | -------- |
| Migration seed `drizzle/0004_collections_services.sql` and `lib/catalog.ts` | seasonal, caps, tech                 | web, app, systems, strategy | None     |
| `lib/sample-catalog.ts` (QA seed)                                           | uses the same collections            | —                           | None     |
| Local dev DB `scripts/dev-db/data` (read from a copy)                       | caps, seasonal, tech                 | app, strategy, systems, web | None     |
| Prototype QA DB `qa-local/.db` (read from a copy)                           | caps, seasonal, tech                 | (none)                      | None     |
| Production database                                                         | **not checked, by your instruction** |                             | Unknown  |

Collection slugs are validated only by format today (`slugPattern` in `product-input.ts`); there is
no reserved list. The implementation adds one, covering every existing and new top-level route
(`about`, `account`, `admin`, `api`, `checkout`, `company-profile`, `compare`, `contact`,
`delivery-returns`, `feed`, `guides`, `og`, `privacy`, `products`, `reset-password`, `services`,
`shop`, `sign-in`, `software`, `terms`, `track`, `wishlist`, `workspace`, `bn`). New or renamed
collections cannot use them. Existing rows are not changed. Before any release, someone with
production access (you) should confirm that no live collection uses these slugs.

**Defaults I will use unless you say otherwise:**

| #   | Item                   | Default                                                                                                                                                                                                                                                        |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Brand colour           | Violet brand + gold commerce accent site-wide, including favicon, Apple icon, OG images, manifest and admin (logos 02/03 already approved)                                                                                                                     |
| B   | Order timeline wording | Friendly labels (Confirmed / Preparing / On the way / Delivered) mapped onto the existing stages; stored statuses unchanged                                                                                                                                    |
| C   | Home "New favourites"  | 3 newest live products                                                                                                                                                                                                                                         |
| D   | Admin language         | **English and Bangla across the admin interface** as well as the customer side (owner decision 2026-11-05)                                                                                                                                                     |
| E   | Bangla copy            | I draft Bangla for every new string and list it for your review; not called final until you approve                                                                                                                                                            |
| F   | Privacy notice         | Draft additions for wishlist and Workspace data, marked for your approval before release                                                                                                                                                                       |
| G   | Admin Settings         | Existing payment & delivery settings only; no new business-details card                                                                                                                                                                                        |
| H   | JUNO                   | Functionality, backend, APIs, voice, settings and behaviour unchanged. **Owner exception (2026-11-05):** the prototype's approved launcher colour is carried over exactly (`assistant.css`, filter on `.asst-fab .asst-mascot img` only). No other JUNO change |
| I   | Quick view             | **Included** (owner decision 2026-11-05). No prototype copy contains a quick-view screen, so it is built in the unified design: a dialog over real product data with the real buy box                                                                          |
| J   | Git                    | Work directly in this checkout (branch `chore/prettier-format`, same commit as `main`) and leave every change uncommitted. A separate local branch is created only if you ask for it                                                                           |

**External credentials needed later (not used or requested now; related checks reported as
Blocked):**

1. **Production file storage** for Workspace files: an object store (for example Vercel Blob or
   Cloudflare R2) and its access token or keys. Until configured, production uploads stay disabled.
2. **Email:** an `SMTP_URL` / provider with a verified sending domain and the `AUTH_EMAIL_FROM` address,
   for invites, approvals, invoices, order mail and sign-up verification.
3. **Google sign-in (optional, existing feature):** a Google OAuth client ID and secret with the
   OANRO redirect URLs.
4. **Legal details (optional):** only if you later want them on invoices or receipts.
5. Not needed: payment gateway (payments stay manual), subscription billing (excluded by D2).

---

## 10. Bilingual, responsive, accessibility, SEO

- Every customer **and admin** string in English and Bangla through the existing `Localized` / `t()`
  pattern (admin follows the same `/bn` routing and adds a language switch in the admin top bar);
  `/bn` versions of all new routes; Hind Siliguri for Bangla; long-word wrapping checked.
- Widths 320, 360, 390, 768, 1024, 1280, 1440 and intermediate drags; 200 % zoom; no page-level
  horizontal scroll; tables scroll inside their own wrapper; touch targets ≥ 24 px (aim 44 px).
- WCAG 2.2 AA: contrast of every token pair, visible focus, dialog focus trap and return, labelled
  controls, error messages tied to fields, logical headings (one H1 per page), reduced motion and the
  site's Pause-motion switch respected.
- SEO: titles, descriptions, canonical and hreflang for new public routes; `/shop`, `/services`,
  `/software` in the sitemap; `/workspace`, `/wishlist`, `/compare`, `/account` noindex; product
  JSON-LD and Google feed unchanged; truthful stock/price shown; LCP image for the new hero
  prioritised.

---

## 11. Implementation phases (local only)

1. **Environment:** work in this checkout without committing (§9 default J); local PGlite + relay + SMTP sink + synthetic seed (reusing v3
   `qa-local` tooling under git-ignored `scripts/qa-local/`); dev server on its own port and build
   folder; local test file storage in git-ignored `.local-storage/`; baseline screenshots of every route EN/BN at 390 and 1440.
2. **Design system and shell:** tokens, brand (§9 default A), `SiteHeader`, `SiteFooter`, search dialog, bag
   drawer, bottom bar, empty/error/loading components.
3. **Homepage:** concept layout + every original section in the new style, switches intact.
4. **Commerce:** `/shop`, collections, product page, bag, 3-step checkout, confirmation, tracking.
5. **Identity and account:** sign-in/up/reset, account tabs on existing data.
6. **Studio and content:** `/services`, service detail, brief form (+6.5), about, company profile,
   guides/Pulse, legal, errors.
7. **New features:** wishlist → compare → addresses → receipts → Software content → Workspace.
8. **Admin:** shell and page style, overview, leads kanban, projects, content hub.
9. **Verification and report** (§12).

---

## 12. Test and acceptance plan

Each check is reported as Passed / Failed / Blocked / Not executed, with evidence.

| Area                              | Check                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static                            | `npm run typecheck`, `npm run lint`, `npm run format:check`                                                                                                                                          |
| Automated                         | `npm test` (existing 83 + new tests per store/API: wishlist, addresses, workspace access, invoice status rules, lead fields)                                                                         |
| Build                             | `next build` into a separate folder with no hosted environment                                                                                                                                       |
| Routes                            | Script requests every page and API (EN and `/bn`), compares status codes with the baseline                                                                                                           |
| Shopper journey                   | Browse → search/filter → wishlist → compare → product → bag → checkout (TrxID + COD) → order in DB → admin approval → customer timeline and receipt; mail in sink                                    |
| Studio journey                    | Brief with new fields → admin kanban → won → convert to project → invite client → client uploads file, approves milestone, submits invoice payment → staff confirms                                  |
| RBAC                              | Owner / manager / sales / content editor / staff with only the new project permissions / customer / client / anonymous × every admin page, admin API, workspace API and record owned by someone else |
| Auth                              | Sign-up + verification, resend, sign-in, reset, sign-out, deleted account, staff two-step                                                                                                            |
| Content                           | Company profile 11/11 sections and portfolio notice text; home section switches; Studio packages; Software content editor round-trip                                                                 |
| Links and media                   | Crawl for broken internal links and missing assets                                                                                                                                                   |
| Responsive / bilingual / keyboard | Browser pane at the widths in §10, EN and BN, keyboard-only pass                                                                                                                                     |
| Accessibility                     | Contrast table, focus, dialogs, names, target size                                                                                                                                                   |
| SEO / performance                 | Metadata and sitemap check; local Lighthouse on the production build (lab only)                                                                                                                      |
| JUNO                              | `git diff` shows no change to any `assistant*` file, `lib/assistant/**`, `/api/assistant/**`, `/admin/assistant`; launcher renders                                                                   |
| Blocked by dependencies           | Google sign-in, real email delivery, payment gateway, real devices                                                                                                                                   |

---

## 13. Files

**Modified (styling/markup and wiring, business logic untouched):** `src/app/layout.tsx`,
`globals.css`, `v2.css` (rules retired gradually), `page.tsx`, `admin/admin.css`, `admin/layout.tsx`,
`company-profile/company-profile.css`, `icon.tsx`, `apple-icon.tsx`, `manifest.ts`,
`og/product/[slug]/route.tsx`, `sitemap.ts`, all customer pages under `src/app` (account, checkout,
sign-in, reset-password, track, contact, about, company-profile, guides, services/[slug],
products/[slug], [collection], legal pages, error, not-found), customer components (`shell`,
`home-v2`, `home-experience`, `home-trust`, `locale`, `legal-page`, `collection-browser`,
`collection-conveyor`, `product-detail`, `buy-box`, `checkout-form`, `order-tracker`, `my-orders`,
`auth-panel`, `profile-form`, `inquiry-form`, `contact-inquiry`, `global-pulse`,
`company-profile-view`, `bottom-bar`, `related-products`, `campaign-showcase`), admin components
(`admin-shell`, `admin-nav`, `admin-ui`, `orders-dashboard`, `lead-inbox`, `content-editor`),
`public/logo.svg`.

**Extended (new functions, existing ones unchanged):** `src/lib/db/schema.ts`, `permissions.ts`,
`admin-menu.ts`, `lead-store.ts`, `profile-store.ts`, `site-content-data.ts`, `order-input.ts`
(address id only), `product-input.ts` (reserved slugs), `api/inquiries/route.ts` (new optional fields).

**New:** `src/app/oanro.css`, `src/components/site-header.tsx`, `site-footer.tsx`, `ui/*` (dialog,
tabs, empty state, step indicator, data table, kanban, metric card), routes `shop`, `services`
(index), `software`, `workspace/**`, `wishlist`, `compare`, `account/orders/[id]/receipt`,
`admin/projects/**`; APIs `account/wishlist`, `account/addresses`, `workspace/**`,
`admin/projects/**`; stores `wishlist-store.ts`, `address-store.ts`, `workspace-store.ts`,
`invoice-store.ts`; migrations `0020`–`0024`; tests for each; `public/logo-on-dark.svg`.

**Not touched:** every JUNO file (`assistant*.tsx`, `assistant.css`, `lib/assistant/**`,
`api/assistant/**`, `api/cron/assistant-cleanup`, contents of `/admin/assistant`), existing
migrations, `.env*`, `AGENTS.md`, the prototype folders, the `work/global-pulse-thumbnail` branch.

---

## 16. Addendum (owner, 2026-11-05): footer, compact live search, search insights, JUNO trends, newsletter

Approved for local implementation. Decisions taken under the owner's rules (no new staff access):

- **Footer** rebuilt to the referenced multi-column structure (brand + description + verified contact; Store,
  Studio, Your OANRO, Help & Company; divider, copyright, locale/privacy/motion controls, social links).
  No arrows on internal links; collapsible groups on phones; compact newsletter inline below.
- **Compact live search** replaces the search modal: header icon expands to a ~320px input (row below the
  header on narrow screens), 300 ms debounce, `/api/search` (published products, collections and services
  only), up to five results, “View all results” → `/search?q=`, combobox keyboard support.
- **Search insights** stored only with Analytics consent. Counting rules, redaction and retention are in
  `src/lib/search-insights.ts`. Admin page `/admin/search` reuses the existing **`reports.read`** permission
  (no new permission, no role change).
- **JUNO** gains one read-only server tool for aggregate search trends (minimum threshold, no individual
  data, query text treated as data). No other JUNO change.
- **Newsletter**: compact input + “Join” with explicit unchecked consent; existing endpoint/table/unsubscribe
  reused; a `source` column records where consent was given. Admin subscriber list reuses the existing
  **`newsletter.read`** permission.
