# Sales Calendar + Saved Views — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` (Phase 3 usability — calendar + saved views).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase-3 completion, sub-project B of 2** (A = Introductions, done). Two
related usability features: a branch-wide sales **Calendar** aggregating the
dated items staff must act on, and **Saved views** (per-user filter presets) on
the Deals board and Work Queue.

Checked against live source 2026-09-11. Date sources exist: `ProjectStage.due_date`
(SOP, from the sub-project-4 work), `SaleOffer.expiry_date`, `SalesEnquiry.viewing_date`
+ `follow_up_date`. No month-grid calendar component exists (only the lucide
`Calendar` icon). DealsBoard filters live in component `useState`
(search/fStage/fAssignee/overdue/view — not URL-backed); Work Queue has a
scope toggle. No backend preference store exists. `localStorage` has precedent
but views must follow the user across devices → a server table.

---

## 1. Goal

- **Calendar:** a month grid at `/residential/calendar` showing, per day, the
  SOP stage deadlines, offer expiries, buyer viewings, and follow-ups across all
  sale properties; clicking a day lists its items, each linking to the property
  file.
- **Saved views:** on the Deals board and Work Queue, staff save the current
  filter set as a named view and re-apply or delete it later; views persist
  per-user across devices.

## 2. Scope

**In:**
- **Calendar aggregation endpoint** `GET /api/sales/calendar?from&to[&category]`
  → `{ events: [{ date, type, label, property_id, property_code, ref_id }] }`,
  `type ∈ sop_deadline | offer_expiry | viewing | follow_up`, branch-scoped, dates
  within [from,to].
- **Calendar page** `SalesCalendar.jsx` (`/residential/calendar`): month grid
  (prev/next month), day cells with type-colored dots + counts, a selected-day
  panel listing that day's events (each → property file). Built in-house with
  date math (no new library).
- **Saved views:** `saved_views` table (migration 0109) + `/api/saved-views`
  CRUD (list by scope, create, delete), per-user + branch. A `SavedViews`
  dropdown component wired on the Deals board and Work Queue: apply / save
  current / delete.

**Out (deferred / non-goals):**
- Creating/editing events from the calendar (read-only aggregation; you act on
  the linked property file).
- Drag-to-reschedule, week/day views, iCal export.
- `proposed_completion_date` and settlement dates as calendar sources (the 4
  above cover the actionable set; can add later).
- Sharing saved views between users; ordering/pinning beyond created order.
- Saved views on other screens (Introductions/Mandates) this sub-project.

## 3. Calendar aggregation (backend)

`sales.controller.calendar` (or a small `salesCalendar.controller.js`), route
under `/api/sales/calendar`, READ roles, branch-scoped. Given `from`/`to`
(inclusive DATEONLY; default = current month bounds if omitted) and optional
`category`:
- **sop_deadline:** `ProjectStage` join `Project` (vertical_key='properties_sale',
  branch), `due_date` between from/to, `status` in (pending,in_progress); label
  = stage_name; property from the project.
- **offer_expiry:** `SaleOffer` (branch, optional category via property),
  `expiry_date` between, `status` in (submitted,countered); label = offer_code.
- **viewing:** `SalesEnquiry` (branch), `viewing_date` (DATE → date part) between;
  label = enquirer/notes summary.
- **follow_up:** `SalesEnquiry` (branch), `follow_up_date` between; label = follow-up.
Each event resolves `property_id`/`property_code` (batch id-map like the
introductions controller). Response is a flat `events[]`; the client buckets by
`date`.

## 4. Calendar page (frontend)

`admin-portal/src/screens/sales/SalesCalendar.jsx`, route `/residential/calendar`,
nav item under a **Planning** group (or Selling) in `config/consoles.js`.
- State: `month` (a Date at the 1st). On mount/month change, GET the calendar for
  `[firstVisibleCell, lastVisibleCell]` (the grid shows leading/trailing days of
  adjacent months, so query the full 6-week span).
- Render a 7-column month grid (weekday headers, day cells). Each cell: day
  number + up to N type-colored dots (legend: SOP=blue, offer=amber, viewing=green,
  follow-up=grey) with a "+k" overflow. Today highlighted.
- Selecting a day shows a side/below panel listing that day's events (type badge,
  label, property code) each linking to `propertyFilePath(category, property_id)`
  (offer/SOP → `?section=offers`/`?section=workflow`, viewing/follow-up →
  `?section=enquiries`).
- Prev/next month buttons; "Today" reset. Responsive (grid collapses gracefully
  at phone width; cells keep a min touch size, horizontal scroll only if needed).

## 5. Saved views

**Table (migration 0109) `saved_views`:** `id`, `branch_id` (NOT NULL),
`user_id` (NOT NULL), `scope` STRING(40) (e.g. 'deals', 'work-queue'), `name`
STRING, `params` JSON, `created_at`/`updated_at`. Index `(branch_id, user_id, scope)`.

**Endpoint `/api/saved-views`** (`savedView.controller.js` + routes, mounted in
server.js + manifest.js), all roles, scoped to `req.user.id` + branch:
- `GET /api/saved-views?scope=deals` → this user's views for that scope.
- `POST /api/saved-views` `{ scope, name, params }` → create.
- `DELETE /api/saved-views/:id` → delete (only own).

**UI — `SavedViews` component** (`admin-portal/src/screens/sales/SavedViews.jsx`),
props `{ scope, current, onApply }`:
- A dropdown listing the user's saved views for `scope`; clicking one calls
  `onApply(view.params)`.
- "Save current view" → prompt for a name → `POST { scope, name, params: current }`.
- Delete affordance per view.
- **Deals board:** `current` = `{ search, view, fStage, fAssignee, overdue }`;
  `onApply` sets those `useState` values. Placed in the board toolbar.
- **Work Queue:** `current` = `{ scope: mine|all }` (the queue's own toggle);
  `onApply` sets it. (Note: `scope` the queue param vs `scope` the saved-view
  key are distinct; the component's `scope` prop = 'work-queue'.)

## 6. Testing & verification

- **Calendar endpoint (live):** seed/known dates → `GET /api/sales/calendar?from&to`
  returns events of each type with correct `date`/`property_id`; out-of-range
  dates excluded; category filter narrows. (Use the SOP deadline on property 51
  and an offer expiry as fixtures.)
- **Calendar page (browser):** month renders; a day with a known SOP deadline
  shows a blue dot; selecting it lists the item; clicking opens the property
  file; prev/next changes month + refetches.
- **Saved views:** migration 0109 applies (+down). `POST` a deals view, `GET
  ?scope=deals` returns it, applying it sets the board filters, `DELETE` removes
  it; a second user does not see the first user's views. Work Queue save/apply
  toggles scope.
- **Non-regression:** backend `npm test` (27/0 + businessDays) + `npm run
  test:full` (28/0) unaffected; build clean.
- **Acceptance:** calendar aggregates all 4 sources and links to property files;
  saved views persist per-user across sessions on both screens.

## 7. File plan

**Backend (new):** `migrations/0109-saved-views.js`, `models/SavedView.js`,
`controllers/salesCalendar.controller.js`, `controllers/savedView.controller.js`,
`routes/salesCalendar.routes.js`, `routes/savedView.routes.js`.
**Backend (modify):** `server.js` + `routes/manifest.js` (mount
`/api/sales/calendar` before `/api/sales`; mount `/api/saved-views`).
**Frontend (new):** `screens/sales/SalesCalendar.jsx`,
`screens/sales/SavedViews.jsx`.
**Frontend (modify):** `screens/DealsBoard.jsx` (+SavedViews),
`screens/sales/SalesWorkQueue.jsx` (+SavedViews), `config/consoles.js` (nav),
`App.jsx` (calendar route).
**Schema:** migration 0109 (saved_views table).

## 8. Risks & non-goals

- **Route prefix:** `/api/sales/calendar` must mount before `/api/sales`
  (prefix precedence), like `/api/sales/introductions`.
- **Calendar query cost:** four indexed range queries per month + one property
  id-map; bounded to the visible 6-week span.
- **Saved-view params are opaque JSON** the client owns; the backend only stores
  them scoped per user — no validation of param shape (each screen applies what
  it recognizes and ignores the rest).
- **DealsBoard filters are component state** (not URL) — SavedViews applies by
  setting those setters; no router change.
- **Non-goals:** event creation from calendar, week/day views, iCal, cross-user
  sharing, extra date sources.
