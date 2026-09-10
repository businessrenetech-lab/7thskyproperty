# Sales SOP — Progressive Lifecycle Unlock — design spec

**Date:** 2026-09-11 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Plan:** `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §5 (progressive SOP gates), Phase 3.
**Status:** design approved in brainstorming; awaiting spec review before the implementation plan.

**Phase 3 sub-project 4, layer 2 of 3.** Make the sale SOP stages open
progressively: later-phase stages start `blocked` and unlock automatically when
the real sale lifecycle event fires (offer received/accepted, assessment
approved, settlement locked). Builds on layer 1 (the `properties_sale` SOP
project + property-file Workflow section). Business-day deadlines + escalation
are layer 3 (separate).

Checked against live source 2026-09-11. `progressiveSop.service` already does
this for **rental** (`vertical_key:'leasing'`, hard-coded), and
`project.controller.hydrate` already surfaces `phase`/`locked`/`unlock_hint` for
any project. We generalize the engine to be vertical-parameterised and register
a sale phase/event map, keeping rental behavior identical.

---

## 1. Goal

A sale SOP project seeds with only its early "engagement" stages active and the
rest `blocked`; as the sale progresses, each server-side lifecycle event unlocks
its phase's stages automatically, and the property-file Workflow section shows
locked stages greyed with an "unlocks when …" hint (the hydrate metadata already
exists).

## 2. Scope

**In:**
- Generalize `progressiveSop.service` to a vertical-keyed registry: rental
  (`leasing`) unchanged; add sale (`properties_sale`) phase map + event→phase map.
- `unlockForEvent(propertyId, event, { vertical = 'leasing', transaction })` —
  default keeps every existing rental caller working with no change.
- Seed sale SOP stages with per-phase initial status (engagement active, rest
  `blocked`) via `createProjectFromTemplate` consulting the registry.
- Fire sale unlock events at their clean server hooks: offer submitted, offer
  accepted, assessment approved, settlement locked.
- Layer-1 Workflow UI already renders `blocked`/`unlock_hint` (via hydrate) — a
  small tweak so blocked stages show greyed + hint and can't be actioned.

**Out (deferred / non-goals):**
- Business-day deadlines, overdue, escalation → layer 3.
- Listing-activation and other fuzzy events not wired now (their phase can also
  be reached when a later event fires, or a stage manually started).
- Buyer-side SOP; introductions; any money/settlement logic change.

## 3. Sale phase model

Sale SOP stage_key (slug of the layer-1 stage names) → phase:
| phase | stages | unlocks |
|---|---|---|
| `engagement` | enquiry_consultation, inspection_assessment, documents_risk, agreement_phase_2_approval | active from the start |
| `marketing` | preparation, marketing_listing, buyer_enquiries_inspections | when the assessment is approved |
| `offer` | offers_negotiation | when the first offer is submitted |
| `settlement` | agreement_settlement | when an offer is accepted (transaction created) |
| `closure` | closure_post_sale | when the settlement is locked (completed) |

Event → phase(s):
```
sale_engagement_started : ['engagement']   // implicit at create; engagement is active from start
sale_assessment_approved: ['marketing']
sale_offer_received     : ['offer']
sale_offer_accepted     : ['settlement']
sale_settlement_locked  : ['closure']
```
Unlock hints (UI): marketing "unlocks when the assessment is approved"; offer
"unlocks when an offer is received"; settlement "unlocks when an offer is
accepted"; closure "unlocks when the settlement completes".

## 4. Engine generalization (progressiveSop.service)

Refactor to a registry without changing rental behavior:
```js
const REGISTRY = {
  leasing:          { stagePhase: LEASING_STAGE_PHASE, eventUnlocks: LEASING_EVENT_UNLOCKS, hints: LEASING_HINTS, activeAtStart: ['property'], ownerPhase: 'owner' },
  properties_sale:  { stagePhase: SALE_STAGE_PHASE,    eventUnlocks: SALE_EVENT_UNLOCKS,    hints: SALE_HINTS,    activeAtStart: ['engagement'] },
};
```
- `phaseOf(stageKey, vertical = 'leasing')`, `PHASE_UNLOCK_HINT` becomes
  `hintFor(phase, vertical)`. Keep the old exports (`phaseOf`, `PHASE_UNLOCK_HINT`,
  `STAGE_PHASE`) as leasing-defaulted aliases so `project.controller.hydrate`
  keeps working; extend `hydrate` to pass the project's `vertical_key` so sale
  stages get sale hints (small change in project.controller).
- `initialStatusFor(stageKey, { vertical = 'leasing', ownerLinked })` → `pending`
  if the stage's phase is in `activeAtStart` (or the owner phase when ownerLinked),
  else `blocked`. For a vertical with **no registry entry** (WT/AC/etc.), return
  `null` meaning "no phase gating" so those projects keep first=in_progress/
  rest=pending.
- `unlockForEvent(propertyId, event, { vertical = 'leasing', transaction })` —
  same loop as today but looks up `REGISTRY[vertical]`, finds the SOP project by
  `property_id` + that `vertical_key`, unlocks `blocked` stages in the mapped
  phases, promotes the first pending if nothing active. Idempotent. Default
  `vertical='leasing'` preserves all existing rental callers verbatim.

`createProjectFromTemplate` (layer-1 shared helper): after inserting stages, if
`initialStatusFor(stageKey, { vertical })` returns non-null, set each stage's
status accordingly (engagement `pending`/first `in_progress`, rest `blocked`);
if it returns null (no registry), keep the current behavior. So the sale SOP
seeds progressively; WT/AC/generic projects are unchanged; leasing continues to
use its own `rentalWorkflow` seeding path (untouched).

## 5. Wiring the sale events (server hooks)

All hooks already run server-side with the property id in scope; each call is
wrapped in try/catch and is non-fatal (unlock failure never breaks the action):
- **Offer submitted** — `sales.controller.createOffer` (status `submitted`) and
  `updateOfferStatus` (→ `submitted`): `unlockForEvent(property_id,
  'sale_offer_received', { vertical:'properties_sale', transaction })`.
- **Offer accepted** — `acceptOffer` (after the transaction is created):
  `'sale_offer_accepted'`.
- **Assessment approved** — `salesAssessment.controller.approveAssessment`:
  `'sale_assessment_approved'`.
- **Settlement locked (completion)** — `sales.controller.settlementAction` on the
  `lock` branch (completion type, where property → sold): `'sale_settlement_locked'`.

Engagement is active at seed time (no event needed). If a SOP project doesn't
exist yet for the property, `unlockForEvent` is a no-op (find returns null) —
staff can Start the SOP later and it seeds with engagement active; a subsequent
event unlocks the right phase.

## 6. Frontend (small)

Layer-1 Workflow section already receives `stage.status`. Add:
- A `blocked` stage renders greyed, no action buttons, with its `unlock_hint`
  (from hydrate) shown as sub-text ("unlocks when the assessment is approved").
- `pending`/`in_progress`/`done` unchanged.
No new fetch; the SOP payload already carries the fields once hydrate passes the
sale vertical.

## 7. Testing & verification

- **Rental unchanged (critical):** the rental SOP still seeds property-active/
  rest-blocked and unlocks on its events. Manually verify one rental unlock path
  still works (e.g. create tenancy → lease phase unlocks) — no behavior change.
  Backend `npm test` (27/0) + `npm run test:full` (28/0) stay green.
- **Sale seed:** `POST /sales/properties/:id/sop` → engagement stages
  `pending`/first `in_progress`, marketing/offer/settlement/closure stages
  `blocked` with hints.
- **Sale unlocks (live):** submit an offer → offers stage unblocks; approve the
  assessment → marketing stages unblock; accept an offer → agreement_settlement
  unblocks; lock a settlement → closure unblocks. Each idempotent (repeat event =
  no error). Verify via `GET …/sop`.
- **Browser:** Workflow section shows later stages greyed with "unlocks when …";
  after an offer is accepted the settlement stage becomes actionable.
- **Acceptance:** sale SOP opens progressively; every wired event unlocks exactly
  its phase; rental engine behavior is unchanged; no money/settlement change.

## 8. File plan

**Backend (modify):**
- `backend/services/progressiveSop.service.js` — registry generalization
  (leasing preserved), sale maps, vertical-param `unlockForEvent` /
  `initialStatusFor` / `phaseOf` / hints; keep back-compat exports.
- `backend/services/workflowProject.service.js` — `createProjectFromTemplate`
  applies `initialStatusFor` per vertical when the registry has the vertical.
- `backend/controllers/project.controller.js` — `hydrate` passes `vertical_key`
  to `phaseOf`/hint (so sale stages get sale hints).
- `backend/controllers/sales.controller.js` — fire `sale_offer_received`,
  `sale_offer_accepted`, `sale_settlement_locked` at the hooks above.
- `backend/controllers/salesAssessment.controller.js` — fire
  `sale_assessment_approved` on approve.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — greyed blocked stage
  + unlock hint in the Workflow section.

**Schema / migrations:** none (reuses `ProjectStage.status='blocked'`).

## 9. Risks & non-goals

- **Touching the rental engine.** Mitigation: the registry keeps leasing's maps
  and the default `vertical='leasing'` so all existing callers and behavior are
  byte-identical; verify a rental unlock path after refactor. No rental caller is
  edited.
- **SOP created after an event.** Non-fatal no-op; engagement-active seed +
  later events keep it consistent (a stage can also be started manually).
- **Non-goal:** deadlines/escalation (layer 3), listing/other events, buyer SOP,
  money changes.
