# Business Buy & Sale — Commercial Parity Design

**Date:** 2026-09-21
**Status:** Approved in brainstorming, pending spec review
**Scope:** Business **Sale** and Business **Buy** only. Business Rent and Business Registration are out of scope and must keep working unchanged.

## 1. Goal

Business Buy and Business Sale must be identical to Commercial Buy and Commercial Sale: the same sidebar items, screens, UI, property and client dashboards, property creation (including photos and videos), settlements, invoicing, financial workflows and reports. Business adds the modules its SOPs require on top of that, and its listings are published to the public website as confidential teasers behind an NDA.

Sources: `SOP – Business Property - Sale - V0.1` (27 steps), `SOP – Business - Purchase - V0.1` (23 steps), `Business_Sale_Workflow_and_Checklists - V0.1.xlsx`.

## 2. Key decisions

| Decision | Choice |
|---|---|
| Architecture | Business Sale/Buy become `category='business'` on the **shared sales engine** that Commercial already uses (Commercial is itself Residential rendered with `category="commercial"`). No parallel business stack. |
| Where business extras live | Built into the shared screens, shown only when `category='business'` (Approach 1). |
| Existing separate Business Sale/Buy module | Retired, no data migration (only test data exists). Tables stay because Business Rent still uses them. |
| Isolation | Inside the Business consoles, every shared screen shows **only** business records. Residential and Commercial behave exactly as today. |
| Confidentiality | Every business listing is shown on the website as a **teaser**; full details are released only after the buyer e-signs an NDA. No per-listing toggle. |
| Sample data | Three realistic sample business listings, one buyer mandate and one NDA are created through the admin panel during verification and **stay live as demo listings**. |

Existing hooks that make this work: `screens/sales/paths.js` already maps `business: '/business'`; `properties.category` is an enum that already includes `business`; the website already queries `/public-website/properties?category=business&listing_type=sale`; `SalesReports` already lists `business` in its category filter; `PropertyWizard` already has a Photos & videos step (uploads, cover photo, YouTube and drone video) and a publish-to-website toggle.

## 3. Consoles, routes and sidebar

Two consoles mirroring Commercial's two, item for item, rebased onto `/business/*`. Each renders the **same component** Commercial uses, with `category="business"` wherever Commercial passes `"commercial"`.

**Business Sale console** (violet), mirroring `COMMERCIAL_NAV`:

| Group | Item | Route | Component |
|---|---|---|---|
| Home | Sale Dashboard | `/business/sell` | `PropertySellDashboard category="business"` |
| | My Work Queue | `/business/work-queue` | `SalesWorkQueue` |
| | Sales Inbox | `/business/inbox` | `SalesInbox` |
| | Calendar | `/business/calendar` | `SalesCalendar category="business"` |
| | Reports | `/business/reports` | `SalesReports` |
| | Contacts | `/business/contacts` | `SalesContacts scope="sales"` (+ `/business/contacts/clients` → `Clients`) |
| | Marketing | `/business/marketing` | `SalesMarketingHub` |
| Selling | Properties | `/business/properties` | `SalesProperties category="business"` |
| | (wizard) | `/business/properties/new[/:id]` | `PropertyWizard` |
| | (property file) | `/business/property/:id` | `SalesPropertyFile` |
| | (settlement desk) | `/business/property/:id/settlement` | `SettlementDesk` |
| | Sale Agreements | `/business/agreements/sale` | `SaleAgreements category="business"` (BSS) |
| | Price Schedule | `/business/price-schedule` | `SalesPriceSchedule scope="business"` |
| Assurance | Compliance | `/business/compliance?category=business` | `Compliance` |
| | Contracts | `/business/contracts` | `SalesContracts` |
| | Introductions | `/business/introductions` | `SalesIntroductions` |
| | Checklists / Workflows | `/business/workflows?vertical_key=business_sale` | `Projects` |
| Money | Accounting | `/business/accounting` | `AccountingOverview` |
| | Settlements (Bulk) | `/business/settlements` | `SalesBulkSettlement` |
| Switch | → Buyer Service | `/business/buyer-service` | |

**Business Buyer console** (indigo), mirroring `COMMERCIAL_BUYER_NAV`:

| Group | Item | Route | Component |
|---|---|---|---|
| Home | Buyer Dashboard | `/business/buyer-service` | `BuyerServiceDashboard` |
| | My Work Queue | `/business/buyer/work-queue` | `SalesWorkQueue dealScope="buy"` |
| | Calendar | `/business/buyer/calendar` | `SalesCalendar category="business" scope="buy"` |
| | Buyer Enquiries | `/business/enquiry` | `SalesEnquiries category="business"` |
| Buying | Buy Deals | `/business/buy` (+ `/business/buy/:dealId`) | `DealsBoard category="business" dealType="buy"` / `BuyerDealFile` |
| | Buyer Mandates | `/business/mandates` (+ `/:id`) | `BuyerMandates` / `BuyerMandateDetail` |
| | Purchase Agreements | `/business/agreements/purchase` | `PurchaseAgreements category="business"` (BPS) |
| Directory & Money | Contacts | `/business/buyer/contacts` | `SalesContacts scope="buy"` |
| | Buyer Invoices | `/business/buyer-invoices` | `BuyerInvoices` |
| Switch | → Sale Dashboard | `/business/sell` | |

**Main sidebar:** Business → **Buy** (`/business/buyer-service`) · **Sale** (`/business/sell`) · **Rent** (`/business-rent`, unchanged).

**Retired (frontend only):** the Business Sale and Business Buy consoles built earlier. Old URLs redirect:

| Old | New |
|---|---|
| `/business`, `/business/sale` | `/business/sell` |
| `/business/listings`, `/business/listings/:id` | `/business/properties` |
| `/business/enquiries` | `/business/enquiry` |
| `/business/invoices` | `/business/buyer-invoices` |
| `/business/sale/agreements` | `/business/agreements/sale` |
| `/business/purchase/agreements`, `/business-buy/agreements` | `/business/agreements/purchase` |
| `/business-buy`, `/business-buy/*` other | `/business/buyer-service` |
| `/business-buy/mandates` | `/business/mandates` |
| `/business-buy/enquiries` | `/business/enquiry` |
| `/business-buy/invoices` | `/business/buyer-invoices` |
| `/business-buy/reports` | `/business/reports` |

`/business/reports` and `/business/mandates` keep their paths but now render the shared components.

## 4. Business-only scoping

**Frontend.** New hook `useSalesCategory()` in `screens/sales/paths.js` returns `'business'` for `/business/*` and nothing for `/business-rent/*`, `/business-registration/*` or any other path. These shared screens lock to that category **only when it is `business`**: Reports, Sales Inbox, Work Queue, Accounting, Contacts, Buyer Invoices, Bulk Settlements, Introductions. Locked screens send `category=business` on every request; Reports hides its category dropdown. Residential and Commercial are unchanged.

**Backend.** Endpoints that already accept `?category=` need no change (properties, deals, sales, calendar, enquiries, reports, contacts, disbursements, agreements). Add the same optional filter, applied through the linked property's or deal's category, to:

- `salesInbox.controller`
- `salesIntroduction.controller`
- `salesPayment.controller` (buyer invoices)
- `dealSettlement.controller` (bulk settlements)
- the work-queue endpoint
- `accounting.controller` (only records linked to a property or deal; unlinked general-ledger entries are excluded from the business view)

Rules: no `category` param means behaviour is unchanged; only `residential | commercial | rural | business` are honoured, anything else is ignored.

**Workflows.** Seed `business_sale` and `business_purchase` workflow templates (`vertical_key`) from the workbook and SOPs. `business_sale` uses the 14 workbook stages (sheet 2): lead intake, consultation, assessment, documentation, preparation, marketing, lead management, inspection, negotiation, due diligence, agreement, settlement, financial, closure. `business_purchase` uses the Purchase SOP phases: buyer engagement, business search & sourcing, inspection, negotiation, due diligence & verification, agreement & settlement, post-settlement.

## 5. Business-specific modules

All appear only when `category='business'`.

1. **Business profile.** The property's own `title` holds the real business name (visible in admin only for business properties). New table `property_business_profiles`, one row per property. Fields: business type (retail, restaurant/café, hospitality, manufacturing, service, trading, industrial, franchise, online, other), industry, ownership structure, company registration no., trade licence no., TIN/BIN, year established, staff count, lease status and lease details, reason for sale, annual turnover, annual profit, monthly revenue, included assets, stock, employee info, IP details, teaser headline, teaser summary, `preparation` JSON. The property wizard shows a **Business profile** step for business and hides residential-only fields (bedrooms, bathrooms, balconies).
2. **Assessment & Risk** tab on the property file (Sale Steps 2, 3, 6). Reuses `business_assessments`: preliminary, presentation and risk assessments with the SOP scores (operational condition, market attractiveness, readiness, commercial viability, growth potential, transaction feasibility, presentation), a risk list (ownership conflicts, legal disputes, tax, regulatory, lease, employee, licensing, operational) and a recommendation.
3. **Due Diligence** tab (Sale Steps 7, 19–21; Purchase Steps 15–17). Reuses `business_documents`. Pre-filled checklist: trade licence, company registration, lease agreements, supplier agreements, financial summaries, tax records, employee information, operational licences. Each item moves requested → received → verified, or flagged. Files are private. **Escalate compliance risk** (Step 20) adds a risk entry to the latest assessment and notifies management.
4. **Preparation** tab (Steps 6, 8): cleaning, maintenance, photography, videography, business profile preparation, signage, presentation improvement; each with status, owner and due date. Stored in `property_business_profiles.preparation`.
5. **Buyer suitability** tab on the buyer mandate (Purchase Step 2): buyer readiness, investment capability, financing feasibility, operational capability, verdict and notes. Stored in `buyer_mandates.suitability`. Screening and shortlisting (Purchase Steps 6–8) reuse the mandate's existing shortlist (`MandateCandidate`); business candidates show an investment summary (asking price, turnover, profit, price-to-profit multiple) from the business profile.

## 6. Website connection and NDA gate

**Live bug fix (first).** `/api/public-website` is mounted in `server.js` but missing from `routes/manifest.js`, which the production monolith mounts from, so it returns 404 in production and the website falls back to mock data. Add it to the manifest, and add any other route that is mounted in `server.js` but missing from the manifest.

**Teaser.** For every published business property, `/public-website/properties` and `/public-website/properties/:idOrSlug` return:

- Shown: teaser headline (as the title; falls back to "<business type> business in <area>"), business type, industry, area and city, asking price, staff count, years established, turnover band, photos and videos.
- Turnover bands, from `annual_turnover`: under ৳50 L · ৳50 L–1 Cr · ৳1–2 Cr · ৳2–5 Cr · ৳5–10 Cr · ৳10 Cr+ · "On request" when blank.
- Hidden: business name, street address, coordinates, exact turnover and profit, lease details, documents, and any other business-profile field not listed above.

The website's card and detail pages show business fields (type, industry, turnover band, staff, established) instead of the residential defaults (beds, baths, sqft) when `category='business'`.

**NDA flow.**

1. The business detail page shows **Request full details** (name, email, phone, company). It posts to `POST /public-website/business-nda-requests` (rate-limited).
2. The backend finds or creates the buyer contact, creates a buyer enquiry with `category='business'`, and creates a `business_ndas` row with status `requested`. A repeat request from the same buyer for the same property returns the existing open request.
3. Staff verify the buyer's identity and legitimacy, then **Approve & send NDA**: an eSign envelope is created from the **Business Confidentiality Agreement** template and the status becomes `sent`. If sending fails, the status stays `approved` and the error is shown.
4. When the envelope completes, the status becomes `signed` and an **Introduction** (buyer ↔ property) is recorded in the existing Introductions register as non-circumvention evidence.
5. Staff click **Release full details**: the release is recorded (who, when), a `release_token` is issued (30-day expiry) and the buyer is emailed a link to the full-details page. `GET /public-website/business-details/:token` returns full details only for a valid, unexpired token whose NDA is `released`; otherwise a friendly "link expired or invalid" response.
6. Staff can **Decline** a request with a reason.

**Admin.** The property file has a **Confidentiality / NDA** panel (requests, status, actions). The buyer's contact record lists their NDAs.

**Template.** The Business Confidentiality Agreement is drafted from the SOPs' confidentiality (Sale §14, Purchase §13) and non-circumvention (Sale §12, Purchase §11) sections. Its wording must be reviewed by the company's legal advisers before live use.

## 7. Data model

Migrations are additive, idempotent (`describeTable` / `showAllTables` guards), and every new column gets a model attribute.

| # | Change |
|---|---|
| 0141 | Create `property_business_profiles` (`property_id` unique, profile fields, teaser fields, `preparation` JSON). |
| 0142 | `business_assessments`, `business_documents`: add nullable indexed `property_id`; make `business_listing_id` nullable. |
| 0143 | `buyer_mandates`: add `suitability` JSON. |
| 0144 | Create `business_ndas` (`branch_id`, `property_id`, `contact_id`, `enquiry_id`, `envelope_id`, `status`, `approved_by/at`, `signed_at`, `released_by/at`, `release_token` unique, `token_expires_at`, `decline_reason`, timestamps). |

No change to `properties`. No tables are dropped. `business_mandates` and `business_invoices` stay in place, unused, until Business Rent is reworked.

Seeds (idempotent scripts run from `backend/`): workflow templates `business_sale` and `business_purchase`; the Business Confidentiality Agreement eSign template.

Security: NDA and due-diligence files live under private `/uploads/documents`; release tokens are 32 random bytes; JSON columns are parsed defensively because this database returns them as strings.

## 8. Build order

Each phase is one commit and is verified before the next starts.

1. Website 404 fix and `server.js` vs `manifest.js` audit.
2. Business Sale and Buyer consoles, routes, sidebar, `useSalesCategory`, backend category filters, retirement with redirects.
3. Business profile: migration, wizard step, public teaser mapping, website business cards and detail.
4. Assessment & Risk, Due Diligence and Preparation tabs; buyer suitability.
5. NDA flow: migration, backend, admin panel, website request form and token page.
6. Workflow templates, end-to-end verification with sample data, production deploy.

## 9. Verification

- **Backend:** after each phase, restart the server and run a Node script against the real endpoints that asserts status codes and response shapes, including that calls without `category` return the same results as before the change.
- **Frontend:** `npm run build` passes for `admin-portal` and `website-mock`; click through the changed screens in a browser.
- **End to end, through the admin panel:** create three realistic business listings (e.g. a café, a trading company, an IT services firm) with full business profiles, photos and videos, and publish them; confirm the website shows teasers without business name, address or financials; create a buyer mandate with suitability and a shortlist; run the full NDA flow (website request → approve → e-sign → introduction recorded → release → token page); create a deal, settlement and invoice; confirm the Business reports, inbox and accounting show only business records and Commercial's figures are unchanged. The samples stay live.

## 10. Rollout

Local development uses the same database as production, so migrations take effect in production as soon as they run. All migrations are additive and compatible with the currently deployed code. Deploy at the end using the existing process: stash the other contributor's uncommitted files, merge into `production`, push, confirm the Hostinger build completes, restore.

## 11. Changes found during planning

The implementation plan (`docs/superpowers/plans/2026-09-21-business-buy-sale-commercial-parity.md`) refines this spec as follows; where they differ, these notes win.

- **Phase 1 also** mounts `/api/marketing` (also missing from the production manifest) and makes `GET /public-website/properties/:idOrSlug` published-only with a field allowlist. That endpoint returned every property column (owner, key holders' phones, internal remarks, coordinates) for any id, so fixing the 404 without this would have exposed that data on the live site.
- **Agreement types:** eight hard-coded lists named only residential/commercial agreement types, so signed business agreements would draft no fee invoices. They are consolidated into one shared list that includes `business_sale_agreement` and `business_purchase_agreement`.
- **Buyer mandates** had no category, so migration 0141 adds `category` (with `suitability`) to scope the Business buyer console.
- **Migration numbers:** 0141 buyer mandate category + suitability · 0142 business profiles · 0143 assessment/document `property_id` · 0144 NDAs · 0145 workflow templates. The workflow templates ship as a migration (the pattern existing DBs already use), not a seed script. The NDA document is rendered in code, so it needs no DB template.
- **Due-diligence statuses** keep the register's existing vocabulary: required → received → verified, or rejected (shown as "flagged").
- **Property-file Workflow tab:** business property files use the same `properties_sale` SOP as Commercial (parity). The `business_sale` / `business_purchase` templates drive the console's Checklists/Workflows item.
- **Public search** never matches a business listing's title or address, so its real name can't be found by searching.
- **Wizard:** after creating a sale draft it stays in the console (it used to jump to `/sales/properties/new/:id`, which also affected Commercial).
- **Buyer's contact record** does not get a separate NDA list: the property file's NDA tab plus the Introductions register (written automatically when an NDA is signed) cover it.

## 12. Out of scope

Business Rent and Business Registration changes; a generic per-category custom-fields engine; auto-scoping Commercial or Residential screens; removing the old `business_*` tables.
