# Deals Kanban Pipeline — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (Kanban), §9 Phase 3 (pipeline).
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

This is **Phase 3 sub-project 1**: turn the DealsBoard table into a real
Board + List pipeline over `PropertyDeal`, with server-enforced stage
transitions. The rest of Phase 3 (buyer mandates + shortlist, versioned
offers/approvals + introductions, SOP stage-gates + deadlines, calendar view,
saved-view presets) are separate later sub-projects.

Checked against live source on 2026-09-11. Reuses the deal model, the existing
`GET /deals` list, `settlementDeskPath`, and the next-action/blocker data from
sub-project 2 where cheaply available.

---

## 1. Goal

Replace `DealsBoard`'s table-only view with a Board (Kanban) + List toggle over
the same deals, where cards show the money and the next action at a glance and
staff move a deal between early pipeline stages by drag/drop — with the server
enforcing which moves are legal. Later-stage transitions that represent money or
legal events are NOT draggable; they stay driven by their real flows (accept an
offer, lock a settlement).

## 2. Scope

**In:**
- A guarded transition endpoint `POST /deals/:id/transition` (same rules for drag
  and keyboard), writing a `DealEvent` audit row.
- `assigned_to` name on the `GET /deals` list rows (small additive include).
- Rebuilt `DealsBoard`: Board + List toggle sharing one filter bar (deal type,
  stage, assignee, overdue, text search); board columns by the 6 existing
  statuses; draggable cards with revert-on-block; a keyboard "Move to stage"
  menu with identical rules; cards linking into the property file / Settlement
  Desk. Applies to residential + commercial + rural (shared `category` prop).

**Out (deferred / non-goals):**
- Calendar view; saved-view presets. (Board + List + core filters only.)
- Buyer mandates, shortlist/compare, versioned offers, SOP gates, deadlines/
  escalation — later Phase 3 sub-projects.
- Any money mutation or new settlement/offer logic; no schema change beyond
  reusing `DealEvent`.

## 3. Transitions — the guarded rules

`PropertyDeal.status` ∈ `lead → negotiation → agreed → settlement → completed →
cancelled`. Real flows already own the money/legal transitions: accepting an
offer sets `agreed` (+ creates the transaction), locking a completion settlement
sets `completed`, a withdrawal/cancel sets `cancelled`. The board must never
mark money paid or legal transfer complete (plan §5).

**Allowed by drag/keyboard (`POST /deals/:id/transition`):**
| From | To | Notes |
|---|---|---|
| `lead` | `negotiation` | free |
| `negotiation` | `lead` | free (moved back) |
| `lead`, `negotiation` | `cancelled` | requires `reason` |

**Blocked by the endpoint (409 with a pointer message):**
- Anything → `agreed` → "Accept an offer in the property file to move this deal to Agreed."
- Anything → `settlement` / `completed` → "Open the Settlement Desk — settlement status is set there."
- Moving out of `agreed`/`settlement`/`completed` → "This deal is past negotiation; changes happen in the offer/settlement flow."
- Cancelling `agreed`+ → "Cancel or unwind from the Settlement Desk / transaction."

Handler: validate the `(from,to)` pair against an allow-list, require a `reason`
for `→cancelled`, update `status`, write a `DealEvent`
(`event_type:'STAGE_CHANGED'`, detail `from→to`, `actor_user_id`), return the
updated deal. Branch-scoped, `roleMiddleware` (the existing deal ROLES). On a
blocked pair, 409 `{ error }` — the client reverts the card and shows it.

## 4. Backend changes

- `backend/controllers/deal.controller.js`:
  - `exports.transition` — the handler above.
  - `list`: add the assignee to the include (`{ model: User, as: 'assignee',
    attributes: ['id','name'] }`) and ensure `PropertyDeal.belongsTo(User, { as:
    'assignee', foreignKey: 'assigned_to' })` exists (add if missing, mirroring
    the drawer's needs). Rows already carry status, price, expected_fee/
    commission, settlement/contract/payment status, settlement_date, assigned_to.
  - Raise the list `limit` handling so the board can request a large page
    (`?limit=500`) — `getPagination` already supports `limit`.
- `backend/routes/deal.routes.js`: `router.post('/:id/transition', ctrl.transition)`.
- No migration (reuses `DealEvent`).

## 5. Frontend — rebuilt DealsBoard

`admin-portal/src/screens/DealsBoard.jsx` (keeps its `{category, dealType,
title, desc}` props and the existing detail Drawer).

- **Filter bar** (shared by both views): deal type (when not fixed by prop),
  stage, assignee (from the rows), an Overdue toggle (`settlement_date < today`
  and not completed/cancelled), and text search. One fetch `GET /deals?deal_type=
  …&category=…&limit=500`; filtering is client-side over that page.
- **View toggle**: Board | List.
- **List**: the existing DataTable (kept) — no regression for table users.
- **Board**: 6 columns (Lead / Negotiation / Agreed / Settlement / Completed /
  Cancelled), each a drop zone. Column header shows count. A card shows: property
  code/title, buyer or seller name, price and expected agency fee as separate
  values, assignee, settlement/closing date (red when overdue), and status chips
  (contract/settlement/payment). Click → property file (`propertyFilePath` +
  `?section=settlement` shortcut or the deal drawer, as today). A "⋯ Move to
  stage" menu lists only the currently-legal targets.
- **Drag/drop**: native HTML5 DnD (no new dependency). On drop into a column,
  call `POST /deals/:id/transition`; optimistically move the card, and **revert
  on any 4xx**, showing the server's message via toast. A `→cancelled` drop
  prompts for a reason first. Dragging is disabled on cards in
  agreed/settlement/completed (they show the menu's blocked reasons instead).
- **Keyboard/a11y**: the "Move to stage" menu is the keyboard path and uses the
  same endpoint; cards are focusable; drop zones have accessible labels.
- Responsive: columns scroll horizontally in their own container on narrow
  screens (page body never scrolls sideways); on phone width the board collapses
  to a single-column stage selector + list (reuse the pattern from the desk).

## 6. Testing & verification

- **No money/regression:** backend `npm test` (27/0) + `npm run test:full`
  (28/0) stay green (transition touches only `status` + an event row, never
  money). `admin-portal npm run build` clean.
- **Endpoint checks (live, admin token):** `POST /deals/:id/transition` — a
  `lead→negotiation` succeeds and writes a DealEvent; `→agreed` returns 409 with
  the pointer message; `→cancelled` without a reason 400, with a reason 200.
- **Browser walkthrough:** Board renders deals in their status columns; drag a
  lead to Negotiation (persists on refresh); attempt to drag into Agreed (card
  reverts + toast); the Move-to-stage menu shows only legal targets; the List
  toggle still shows the table; filters (stage/assignee/overdue/search) work;
  a card links into the property file / desk. Phone width usable.
- **Acceptance:** a deal moved on the board reflects in the DB and on reload;
  no board action can reach agreed/settlement/completed; every move writes an
  audit event.

## 7. File plan

**Backend (modify):**
- `backend/controllers/deal.controller.js` — `transition` handler; assignee
  include on `list`; ensure `belongsTo(User, as:'assignee')`.
- `backend/routes/deal.routes.js` — the transition route.

**Frontend (modify):**
- `admin-portal/src/screens/DealsBoard.jsx` — Board + List toggle, filter bar,
  cards, native DnD, Move-to-stage menu. (New small helpers may live in the same
  file or a `deals/` folder if it grows.)

**Schema / migrations:** none.

## 8. Risks & non-goals

- **Optimistic move correctness.** Every drop is confirmed server-side and
  reverts on rejection — the server, not the client, decides legality; drag and
  keyboard share the endpoint. No move can set money/legal status.
- **DealsBoard is shared across 3 categories.** The rebuild keeps the props and
  the List/table path, so commercial/rural keep working; only the board view and
  filter bar are added.
- **Bundle/CSP.** Native DnD — no new dependency, nothing to allowlist.
- **Non-goal:** no calendar, saved views, mandates, versioned offers, SOP gates,
  deadlines, money mutations, or schema changes.
