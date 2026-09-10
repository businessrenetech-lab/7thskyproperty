# Buyer Mandates + Shortlist — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (buyer mandate before property), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 3 sub-project 2.** A buyer engagement that exists *before* a property is
chosen: a requirements brief + a shortlist of candidate properties, from which a
committed candidate converts into the existing property-linked buy
`PropertyDeal` (which then flows through the Kanban board + Settlement Desk).

Checked against live source 2026-09-11. Today a buy `PropertyDeal` requires a
`property_id`, and `SalesEnquiry` is property-specific — neither represents a
propertyless buyer brief. This adds that missing entity.

---

## 1. Goal

Let staff capture a buyer's brief (budget, areas, type, beds/baths, timeframe)
without a property yet, shortlist candidate properties against it with
per-candidate feedback/status, and convert a shortlisted candidate into a
property-linked buy deal in one action — closing the gap between "a buyer is
looking" and "a buyer is pursuing this property".

## 2. Scope

**In:**
- Two models + one migration (`0105`): `BuyerMandate`, `MandateCandidate`.
- REST: `/buyer-mandates` (list/get/create/update), `/:id/candidates`
  (add/update/remove), `/:id/candidates/:cid/convert`.
- Two React pages: a Buyer Mandates list, and a mandate detail (requirements +
  shortlist + convert), under a new "Buyer Mandates" nav entry (Buying group).
- Convert → a `property_id`-linked buy `PropertyDeal` (status `lead`), linked
  back to the candidate; mandate advances to `engaged`.

**Out (deferred / non-goals):**
- Side-by-side compare view and auto-suggested matching listings (later).
- Viewings/feedback as first-class scheduled events (a candidate carries a
  free-text feedback + status only here).
- Versioned offers, SOP gates, deadlines — other Phase 3 sub-projects.
- Any money/settlement change.

## 3. Data model (migration 0105)

**`buyer_mandates`** — the brief.
| col | type | notes |
|---|---|---|
| id | INT PK | |
| branch_id | INT not null | branch-scoped like every table |
| mandate_code | STRING(40) unique | `SSPC-BM-000001` (generateCode) |
| buyer_client_id | INT | the buying Client (optional) |
| buyer_contact_id | INT | the person (optional; at least one of client/contact) |
| status | ENUM(`active`,`engaged`,`fulfilled`,`cancelled`) default `active` | `engaged` once a candidate converts; `fulfilled` when its deal completes (set later, out of scope to auto-drive here); `cancelled` with reason |
| budget_min, budget_max | DECIMAL(15,2) | |
| areas | STRING | comma/text list of preferred areas |
| property_type | STRING | apartment/house/land/… (free text, matches Property.property_type) |
| beds_min, baths_min | INT | |
| timeframe | STRING | e.g. "3 months" |
| notes | TEXT | |
| assigned_to | INT | User |
| cancel_reason | TEXT | |
| created_by | INT | |
| + created_at/updated_at | | underscored |

**`mandate_candidates`** — a property on the shortlist.
| col | type | notes |
|---|---|---|
| id | INT PK | |
| branch_id | INT not null | |
| mandate_id | INT not null | FK → buyer_mandates |
| property_id | INT not null | FK → properties |
| status | ENUM(`shortlisted`,`viewing`,`rejected`,`converted`) default `shortlisted` | |
| fit_note | TEXT | why it fits the brief |
| feedback | TEXT | buyer's reaction after viewing |
| converted_deal_id | INT | set on convert |
| created_by | INT | |
| + created_at/updated_at | | |

Associations: `BuyerMandate.hasMany(MandateCandidate, as:'candidates')`;
`MandateCandidate.belongsTo(Property, as:'property')`; mandate `belongsTo`
Client(`as:'buyerClient'`)/Contact(`as:'buyerContact'`)/User(`as:'assignee'`).
Migration follows the 0103 idiom (guarded `describeTable`/`createTable`, `down`
drops both tables).

## 4. Backend — controller + routes

`backend/controllers/buyerMandate.controller.js`, mounted `['/api/buyer-mandates',
'./buyerMandate.routes']` in `routes/manifest.js`, `roleMiddleware` with the deal
ROLES (`super_admin`,`branch_admin`,`property_manager`,`sales_executive`),
branch-scoped.

- `GET /buyer-mandates?status=&assigned_to=` → list (with buyer name + candidate
  count + assignee).
- `POST /buyer-mandates` → create (mandate_code via generateCode `SSPC-BM-`;
  requires at least one of buyer_client_id/buyer_contact_id).
- `GET /buyer-mandates/:id` → mandate + candidates (each with its `property`).
- `PUT /buyer-mandates/:id` → update the brief / status (status→cancelled
  requires `cancel_reason`).
- `POST /buyer-mandates/:id/candidates` `{property_id, fit_note?}` → add to
  shortlist (reject a duplicate property on the same mandate).
- `PATCH /candidates/:cid` `{status?, feedback?, fit_note?}` → update a candidate.
- `DELETE /candidates/:cid` → remove a candidate (only while not `converted`).
- `POST /buyer-mandates/:id/candidates/:cid/convert` → in one transaction:
  create a buy `PropertyDeal` `{deal_type:'buy', property_id: candidate.property_id,
  buyer_client_id: mandate.buyer_client_id, owner_contact_id: property.owner_contact_id,
  status:'lead', assigned_to: mandate.assigned_to, deal_code via generateCode}`;
  set candidate `status:'converted'`, `converted_deal_id`; set mandate
  `status:'engaged'` (if still `active`); return `{ deal, candidate }`. Reject if
  the candidate is already converted.

No money logic; deal creation mirrors the existing `deal.controller.create`
field set (reuse its FIELDS/generateCode pattern).

## 5. Frontend — two pages + nav

- `admin-portal/src/screens/sales/BuyerMandates.jsx` (`/residential/mandates`):
  list of mandates (code, buyer name, budget range, areas, status badge,
  candidate count, assignee) with a status filter + search, a "New mandate"
  drawer (buyer client/contact combo + requirement fields), row → detail.
- `admin-portal/src/screens/sales/BuyerMandateDetail.jsx`
  (`/residential/mandates/:id`): the requirements panel (editable via a drawer),
  status control (with cancel-reason prompt), and the **shortlist** — a table of
  candidates (property code/title, fit note, status, feedback) with: add-candidate
  (property combo + fit note), inline status/feedback edit, remove, and a
  **Convert** button per shortlisted candidate → creates the buy deal, then links
  to it (the DealsBoard drawer / property file). A converted row shows its deal
  code.
- Nav (`config/consoles.js`, residential **Buying** group): add
  `{ to: '/residential/mandates', label: 'Buyer Mandates', icon: ClipboardList }`
  (icon already common; confirm import). Routes registered in `App.jsx` under the
  residential layout.
- Reuse `ui/kit` (`PageHead`, `DataTable`, `Drawer`, `Field`, `Input`, `Select`,
  `Badge`, `Button`) and the `Combo` picker used by `NewDealDrawer`.

## 6. Testing & verification

- **No money change:** backend `npm test` (27/0) + `npm run test:full` (28/0)
  stay green. `admin-portal npm run build` clean.
- **Migration:** `npx sequelize-cli db:migrate` applies 0105; both tables exist;
  `db:migrate:undo` drops them.
- **Endpoint checks (live, admin token):** create a mandate → 200 with code;
  add a candidate → appears in GET; convert → returns a buy PropertyDeal
  (`status:'lead'`, correct `property_id`), candidate `converted` with
  `converted_deal_id`, mandate `engaged`; a second convert of the same candidate
  → 409.
- **Browser walkthrough:** create a mandate, add 2 candidates, edit one's
  status/feedback, convert one → the new deal shows on the Deals board (Lead
  column); cancel a mandate (reason required).
- **Acceptance:** a converted candidate produces exactly one buy deal linked to
  the candidate's property; the mandate + shortlist persist and reload; branch
  scoping holds.

## 7. File plan

**Backend (new):**
- `backend/migrations/0105-buyer-mandates.js`
- `backend/models/BuyerMandate.js`, `backend/models/MandateCandidate.js`
- `backend/controllers/buyerMandate.controller.js`
- `backend/routes/buyerMandate.routes.js`

**Backend (modify):**
- `backend/routes/manifest.js` — register `/api/buyer-mandates`.

**Frontend (new):**
- `admin-portal/src/screens/sales/BuyerMandates.jsx`
- `admin-portal/src/screens/sales/BuyerMandateDetail.jsx`

**Frontend (modify):**
- `admin-portal/src/App.jsx` — two routes.
- `admin-portal/src/config/consoles.js` — nav entry.
- `admin-portal/src/screens/sales/paths.js` — `mandatesPath`, `mandateDetailPath`.

**Schema:** migration 0105 (two new tables; no change to existing tables).

## 8. Risks & non-goals

- **New subsystem, but isolated.** New tables + endpoints; the only touch to
  existing flow is convert, which creates a normal buy `PropertyDeal` via the
  established create path — nothing in settlement/board changes.
- **Migration discipline:** follow the 0103 guarded idiom; never edit an applied
  migration; provide `down`.
- **Buyer identity:** a mandate needs a client or a contact (at least one);
  convert carries `buyer_client_id` to the deal (may be null if only a contact —
  acceptable, matches how buy deals already allow a null buyer).
- **Non-goal:** compare view, suggested matches, scheduled viewings, versioned
  offers, SOP gates, money changes.
