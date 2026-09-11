# Sales Introductions (Clause 22 / Non-Circumvention) — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` (protected introductions), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase-3 completion, sub-project A of 2** (B = Calendar + saved views, next).
Wire the unused `non_circumvention_records` table for sales: register a
protected introduction (agency introduced this buyer to this property/seller on
a date), compute a 12-month protection window, and let staff flag a breach —
surfaced on the property file and a branch-level Introductions page.

Checked against live source 2026-09-11. The `non_circumvention_records` table +
`NonCircumventionRecord` model exist but are **rental-shaped**
(`owner_contact_id`/`tenant_contact_id`/`tenancy_id`) and entirely **unwired** —
no route, controller, or UI. `generateCode(model, field, prefix)`, `branchScope`,
`pick`, `asyncHandler` are the standard controller helpers; routes mount in
BOTH `server.js` (explicit `mount()`) and `manifest.js`. The pattern to mirror
is Buyer Mandates (`/api/buyer-mandates`, `BuyerMandates.jsx` list +
per-property surfacing).

---

## 1. Goal

Staff record that the agency introduced a buyer to a property (and its
seller/vendor) on a given date. The system computes the protection window
(introduction_date + 12 months), shows whether it's active/expired and days
remaining, and lets staff mark a breach or close the record. Introductions
appear on the sales property file and on a branch-level Introductions list.

## 2. Scope

**In:**
- Migration `0108` — additively extend `non_circumvention_records` with
  `context` (STRING(20), so sales rows are separable from any rental rows),
  `deal_id` (INTEGER, nullable), `introduced_by` (INTEGER, nullable — the staff
  user who made/owns the introduction). Existing rows backfilled `context='rental'`.
- Model additions (`context`, `deal_id`, `introduced_by`) to `NonCircumventionRecord`.
- A sales-introductions controller + routes (`/api/sales/introductions`):
  list (branch, filters), create (property-scoped), getOne, update (edit fields,
  mark breach, close). Sales semantics on the reused columns:
  **`owner_contact_id` = seller/vendor**, **`tenant_contact_id` = introduced buyer**,
  `tenancy_id` unused, `property_id` set, `context='sale'`.
- Derived (read-time, not stored): `protection_until` = introduction_date + 12
  months, `expired` (today > protection_until), `days_remaining` (calendar days).
- Frontend: an "Introductions" section on the sales property file (list for that
  property + add/edit drawer + mark-breach/close actions), and a branch-level
  `/residential/introductions` page (list + status/expiry filters) in the
  **Assurance** nav group.

**Out (deferred / non-goals):**
- Automated breach detection (no offer/transaction hooks) — staff mark breaches
  manually this sub-project.
- Rental usage of the table (untouched; `context='rental'` rows are ignored by
  the sales endpoints).
- Business-day math (the 12-month window is calendar months — a legal period).
- Any money/settlement change; documents/e-sign of an introduction agreement.

## 3. Data model (migration 0108, additive)

Guarded `describeTable`/column checks (idiom from 0105). Add to
`non_circumvention_records`:
- `context` STRING(20) NOT NULL default `'sale'`; migration backfills existing
  rows to `'rental'` (they predate sales; keeps them out of sales lists).
- `deal_id` INTEGER nullable (link to a PropertyDeal when known).
- `introduced_by` INTEGER nullable (staff `users.id`).
`down` removes the three columns. No new table.

`NonCircumventionRecord` model gains the three fields.

Sales semantics (reused columns): `owner_contact_id`=vendor contact,
`tenant_contact_id`=buyer contact, `property_id`=property, `record_code`
`SSPC-IN-000001` via `generateCode`, `protected_relationship` free text
(e.g. "Agency-introduced buyer"), `introduction_date` DATEONLY,
`protection_basis` free text (default "Clause 22 — 12-month non-circumvention"),
`direct_communication_allowed` bool, `breach_risk` low/medium/high, `status`
active/breached/closed (pending unused), `monitoring_notes` text.

## 4. Backend — controller + routes

`backend/controllers/salesIntroduction.controller.js`, routes under
`/api/sales/introductions`, `roleMiddleware` = PREPARE roles (super_admin,
branch_admin, property_manager, sales_executive), branch-scoped, `context='sale'`
enforced on every query so rental rows never leak in.

- `GET /api/sales/introductions` — list for the branch, `context='sale'`,
  filters: `?property_id`, `?status`, `?expiry=active|expired`. Includes the two
  contacts (vendor, buyer) and property (code/title). Each row hydrated with
  `protection_until`, `expired`, `days_remaining`.
- `POST /api/sales/introductions` — create; body `{ property_id, buyer_contact_id,
  seller_contact_id?, deal_id?, introduction_date, protection_basis?,
  direct_communication_allowed?, breach_risk?, protected_relationship?,
  monitoring_notes? }`. Validates property in branch; maps buyer→tenant_contact_id,
  seller→owner_contact_id; `introduced_by = req.user.id`; `context='sale'`;
  `record_code` generated; `status='active'`.
- `GET /api/sales/introductions/:id` — one record (branch + context scoped), hydrated.
- `PUT /api/sales/introductions/:id` — edit the mutable fields; also the state
  transitions via `status` in the body: `active`→`breached` (records a breach),
  `active|breached`→`closed`. (A single update endpoint; the UI sends the target
  status.)

A `hydrate(row)` deriver computes `protection_until`/`expired`/`days_remaining`
from `introduction_date` (12 calendar months). Reused by list + getOne.

Routes mounted in BOTH `server.js` (`mount('/api/sales/introductions',
'./routes/salesIntroduction.routes')`) and `manifest.js`.

## 5. Frontend

**Property-file section** (`SalesPropertyFile.jsx`): add an "Introductions"
section (SECTIONS entry, in the Assurance-ish area near Documents). On open,
`GET …/introductions?property_id=:id`. Renders a list (buyer, seller,
introduction date, protection-until with an active/expired badge, breach_risk,
status) + an "Add introduction" drawer (buyer `Combo` on contacts, optional
seller `Combo`, date, basis, direct-contact toggle, risk, notes) posting to the
endpoint; per-row actions "Mark breached" / "Close" (PUT status). Reuse `ui/kit`
+ `ui/pickers` `Combo`.

**Branch list page** (`SalesIntroductions.jsx`, route
`/residential/introductions`): a `DataTable` of all sales introductions with
status + expiry filters (URL-backed via `useSearchParams`), each row linking to
its property file. Nav item under **Assurance** in `config/consoles.js`
(`{ to: '/residential/introductions', label: 'Introductions', icon: … }`), route
in `App.jsx`.

## 6. Testing & verification

- **Migration:** `db:migrate` applies 0108; `describeTable` shows the three new
  columns; existing rows (if any) `context='rental'`; `down` removes them.
- **Endpoints (live):** create an introduction on a sale property → row with
  `SSPC-IN-…`, buyer/seller mapped, `context='sale'`, status active,
  `protection_until` = date + 12 months, `expired=false`, `days_remaining>0`.
  List returns it; a rental-context row (if seeded) is excluded. `PUT status:
  'breached'` → status breached; `PUT status:'closed'` → closed. Back-date
  introduction_date > 12 months → `expired=true`.
- **Browser:** property-file Introductions section lists + adds a record; branch
  page lists with filters; mark-breach/close reflected.
- **Non-regression:** backend `npm test` (27/0 + businessDays) + `npm run
  test:full` (28/0) unaffected (additive); build clean. Rental behavior
  unchanged (table columns additive; no rental code reads the new ones).
- **Acceptance:** introductions are recorded, protection window computed,
  breach/close work, and they surface on the property file + branch page;
  rental rows never appear in sales lists.

## 7. File plan

**Backend (new):** `migrations/0108-sales-introductions.js`,
`controllers/salesIntroduction.controller.js`, `routes/salesIntroduction.routes.js`.
**Backend (modify):** `models/NonCircumventionRecord.js` (+3 fields),
`server.js` + `manifest.js` (mount).
**Frontend (new):** `screens/sales/SalesIntroductions.jsx` (branch list).
**Frontend (modify):** `screens/sales/SalesPropertyFile.jsx` (section),
`config/consoles.js` (nav), `App.jsx` (route).
**Schema:** migration 0108 (3 additive columns).

## 8. Risks & non-goals

- **Rental separation.** `context` discriminator + `context='sale'` on every
  sales query keeps the two uses apart on one table; existing rows backfilled
  `'rental'`.
- **Reused column names.** owner/tenant columns carry sales meaning; the
  controller is the single translation point (buyer↔tenant, seller↔owner), and
  the API speaks buyer/seller so the UI never sees the rental names.
- **12-month window is calendar months**, computed at read time (no stored
  duplicate to drift).
- **Non-goals:** auto breach detection, rental wiring, e-sign, money.
