# Provider portals — verified audit and a phased upgrade plan

**Date:** 2026-09-27
**Status:** plan only. No code was changed for this document.
**Builds on:** `Downloads/implementation_plan.md` (Gemini agent). Its claims are re-verified
below — most hold, two are sharpened, and one large gap it missed is added.

---

## 0. What I ran, and what it proved

| Suite | Result | Note |
|---|---|---|
| `scripts/e2eFullJourney.js` | **73 PASS / 0 FAIL** | Confirms the Gemini figure. Onboarding → KYC → master agreement → intake → assessment → quotation → work order → completion → report → warranty → payout, for `air_conditioning`. |
| `npm test` | **exit 0**, 27/27 on the final settlement e2e | The whole unit chain plus its HTTP e2e. |
| Read-only probes | see §1 | Portal payload, admin comm register, work-order assignability gating. |

**Caveat worth stating:** `e2eFullJourney.js` **deliberately keeps its records** ("KEPT RECORDS
(visible in the UI)") so staff can inspect them. My run created `ACP-0014`, `ACW-0023`,
`ENV-ACSSDP-000002` and ~11 more. That is the suite's design, not a leak, but it is a different
convention from the suites I wrote for rural/commercial, which delete everything they create.
Worth aligning one way or the other.

---

## 1. The six questions, answered from measurement

### Q1 — Is the provider portal properly interactive?

**Partly. It can run a job; it cannot run a business.** Gemini's answer is correct, and I confirm
the interactive set: accept/decline, schedule, start, complete, photo upload, work-order eSign
launch, and outbound messaging.

What I would add to its read-only list — the portal is **structurally** unable to close any loop
that needs a reply, because of Q7 below.

### Q2 — Property submissions / project-order approvals?

**No property submission. Work-order acceptance only.** Confirmed as Gemini describes. A provider
cannot register a site, and does not approve customer quotations (correctly — that is the client's
and Seventh Sky's decision).

### Q3 — Does admin properly create jobs for signed providers?

**Yes, and the gating is real.** I called `GET /api/wt-work-orders/reference` and it returns
`stages`, `providers`, `assignable_providers`, `statuses` — with 6 providers marked eligible and a
`blocker` field for the ineligible. The approval / KYC / insurance / master-agreement / territory
gates Gemini lists are genuinely enforced. **No change needed here.**

### Q4 — Is job creation too complicated?

The 5-tab manual form is heavy, and the auto-creation path (client e-signs → work order appears)
already exists. **But you have said you do not want a "create jobs" upgrade**, so §3 does not
propose one. Instead Phase 1 makes the **existing work order** carry the weight — which is the same
outcome by a route you already own.

### Q5 — Is work-order signing too complicated?

**Yes for routine jobs** — 7 steps and a 2-party envelope for a BDT 1,200 filter service.

One correction to Gemini's recommendation: dropping the eSign envelope for jobs under a threshold
is **a legal and commercial decision, not a technical one.** Whether portal acceptance against the
Master Agreement is sufficient evidence of instruction is for the client and their lawyer to
confirm. Phase 2 therefore builds the *mechanism* and leaves the threshold as configuration set to
"always sign" until the client says otherwise. I would not ship a default that quietly reduces the
paper trail.

### Q6 — Better portals, per service line?

**Yes, and this is the highest-leverage finding in the audit — sharper than Gemini put it.**

Gemini said the portal "renders a generic single-column view". The real situation is more specific
and much more favourable:

- `backend/config/serviceLines.js` carries, per line: `required_docs.compliance`,
  `required_docs.insurance`, `service_categories`, and a whole `ui` block — `full_label`,
  `project_types`, `categories`, `property_types`, `service_catalogue`. Its own comment reads:
  *"The words the shared operations screens show — so an AC console never says 'Tank'. Reference
  endpoints return this; the frontend renders from it."*
- The **admin** screens do exactly that: `waterTankOps.controller.js` uses
  `getServiceLine(sl).ui.full_label`.
- **The portal is the only surface that ignores it.** `services/wtPortal.service.js` and
  `controllers/publicWtPortal.controller.js` contain **zero** references to `serviceLines` or
  `getServiceLine`. `PortalProvider.jsx` contains **zero** references to `service_line`. The
  backend passes the raw string through (`service_line: ctx.row.service_line || 'water_tank'`) and
  the frontend discards it.

So per-line specialisation is a **reuse** job against a proven mechanism, not a new subsystem. That
is why Phase 3 is cheap relative to its value.

### Q7 — Does admin↔provider communication properly work? *(your extra question — and the biggest gap)*

**Inbound works. Outbound does not exist. The channel is one-way.**

Measured, not inferred:

1. A provider message writes `WtCommLog` with `channel:'portal', direction:'inbound'`.
2. Admin **can** see it: `GET /api/wt-ops/comms` returns it. Live counts right now:
   `note/outbound 236`, `email/outbound 50`, **`portal/inbound 13`**, `note/inbound 1`.
3. **There is no `portal/outbound` row anywhere, and no code that could create one.** Every single
   `channel: 'portal'` write in the repository is `direction: 'inbound'` (6 sites, all in
   `publicWtPortal.controller.js`). No admin action writes back into the portal.

So a contractor messages the operations desk and **cannot receive a reply in the portal.** Staff
reply by phone, WhatsApp or email, outside the system, and the thread dies. Gemini's audit lists
messaging under "what IS interactive" — true for one direction only, and the omission matters
because it is the difference between a message box and a conversation.

Two further attribution problems found while checking:

- The provider's Messages tab reads `WtCommLog where client_name = provider.business_name` — a
  **string match on the business name**. Rename the business and the thread orphans.
- A provider's own work-order actions are logged under the **client's** name
  (`client_name: wo.client_name`), so they never appear in the provider's own thread, and the admin
  register attributes the provider's action to the client. Of the 13 `portal/inbound` rows,
  **0 have `ref_type='providers'`.**

### UI, measured

`PortalProvider.jsx`: 646 lines, 7 tabs, **47** inline `style={{` props, **3** responsive hints,
and **0** `tel:` or map links. For a tool used one-handed on a rooftop, the missing "call the
client" and "open directions" actions are more valuable than any new tab.

---

## 2. Architecture already in place (what not to rebuild)

- `Portal.jsx` routes on `party_type` to `PortalProvider` / `PortalClient`, with `portalBits.jsx`
  shared. Correct shape — extend it, do not fork it.
- Both a **token** portal (`/api/public/wt-portal/:token`, no login) and a **session** portal
  (`/api/wt-portal/*`, real login) exist with matching endpoints. Any new capability must be added
  to both or deliberately to one, and the plan says which.
- 15 service lines in config; all share the WT core keyed by `service_line`.

---

## 3. The phased plan

Each phase is independently shippable, ends green, and is ordered by **value per unit of risk**.
Phase 1 is deliberately not a new feature — it is the two-way channel, because everything else
assumes a provider can be answered.

### Phase 0 — The photo defect, and provider control of their own evidence *(DONE — 1ec8a89)*

Added 2026-09-27 at the client's direction. Three items, all verified in code before planning.

**0.1 — Admin cannot see the photos providers upload. This is a live defect.**

Root cause, traced: a provider's photos are written to `wt_work_orders.portal_photos_before` /
`portal_photos_after` by `publicWtPortal.controller.js`. Those two columns are referenced in
**exactly two files in the whole repository** — the portal controller that writes them and
`models/waterTankOps.js` that declares them. **No admin code, backend or frontend, ever reads them.**

The data is not lost and the API is not at fault: `waterTankWorkOrder.controller.js:detail` does
`const w = wo.toJSON()` and responds `{ work_order: { ...w, stages, progress } }`, so both photo
arrays **already reach the admin frontend today**. `WorkOrderDetail.jsx` simply never renders them
— it shows a tickbox, "Before & after photos collected" (`photos_collected`), and `<img>` does not
appear anywhere in the screen. Staff see a ticked box where the evidence should be.

Fix: render the before/after sets on the admin work order, through `fileSrc()` from
`ui/FileUpload.jsx`, because `/uploads/documents/` is JWT-gated and a bare `<img src>` would 401.
No migration and no backend change are needed for the read path.

**0.2 — A provider cannot edit a report once submitted.**

`WtServiceReport` is created when the job is completed and there is no provider-facing update path
of any kind. A typo, a wrong reading or a missing finding is permanent. Add a scoped edit — the
provider may amend their own report, with the change recorded rather than silently overwritten.

**0.3 — A provider can add photos but never remove one.**

`handleUpload` only appends (`next = [...current, { ... }]`), and the portal router has **no DELETE,
PATCH or PUT route at all** — both the token portal and the session portal are append-only. A photo
uploaded to the wrong job, or of the wrong tank, stays forever. Add removal, scoped to the
provider's own work order, and keep a record of what was removed and by whom.

**Boundaries this phase must respect**
- Edits and deletions are **evidence**, so neither may be silent: keep who, when and what.
- A provider may only touch **their own** work order and **their own** report — the existing
  `providerWorkOrder(ctx, code)` ownership check is the gate to reuse.
- Once a job is verified or paid, amendment should stop being the provider's decision. Where that
  line sits is a client call; the build makes it configurable rather than guessing.

*Verification:* extend the journey suite — upload two photos, remove one, confirm the admin work
order shows the survivor and not the removed one; amend a report and confirm both the new text and
the fact of amendment are visible to admin.

### Phase 1 — Make the conversation two-way *(DONE — 22ac9d5)*

1. Add an **admin → portal reply**: one endpoint that writes `channel:'portal',
   direction:'outbound'` against a provider (and client), and surface a **Reply** action on the
   comm register and the provider file.
2. Fix thread identity: key the portal thread on **`provider_id` / `ref_code`**, not on
   `client_name` string equality. Backfill is unnecessary — match on either while old rows exist.
3. Attribute provider actions to the provider: add `provider_id` (or set `ref_type:'providers'`)
   on the rows written by provider portal actions, keeping `client_name` for the client the job
   belongs to. This is what makes "show me everything this contractor said" possible at all.
4. **Unread state**, both ways: a provider should see that the desk replied; the desk should see
   which provider messages are unanswered. Without this, a two-way channel is still not a
   conversation anyone tends.

*Verification:* extend the journey suite — provider sends, admin replies, provider sees the reply,
both directions appear on the register, and a renamed business keeps its thread.

### Phase 2 — Work orders that carry their own weight *(replaces the rejected "create jobs" work)*

Improving the existing work order rather than adding a job-creation path:

1. **Make the 7-step PWO document optional by configuration, defaulting to ON.** Build the
   "portal acceptance against the Master Agreement" record as a first-class, immutable,
   timestamped evidence row — then let the client choose a value threshold, or none. Do not ship a
   default that reduces the paper trail (Q5).
2. **One-screen work-order editor** for the common case: the existing 5 tabs stay for the full
   record, but the fields an operator actually types for a routine job appear on one pane, with the
   rest collapsed. Same record, same endpoints, fewer keystrokes.
3. **Interactive completion checklist** on the work order itself, so "complete" means the checklist
   is satisfied rather than a free-text note.
4. **Material and extra-cost claim** on the work order, so a provider's out-of-pocket spend has a
   home instead of a phone call.

### Phase 3 — Per-line specialisation, by reusing the config *(cheap, because the mechanism exists)*

1. Have the portal payload include the line's `ui` block and `required_docs`, the way the admin
   reference endpoints already do — one `getServiceLine()` call in `wtPortal.service.js`.
2. Render vocabulary from it in `PortalProvider.jsx`, so an AC technician never reads "Tank".
3. Add a **per-line technical capture** step on completion, driven by config so a new line needs no
   new screen:

| Line | Capture on completion |
|---|---|
| `water_tank` | pH / TDS / residual chlorine, disinfectant batch, confined-space sign-off, crack notes |
| `air_conditioning` | refrigerant type + PSI, amperage draw, coil photos, compressor checklist |
| `solar_energy` | inverter V / kW, roof load note, net-metering document |
| `land_property_assessment` | GPS coordinates, boundary notes, mouza/khatiyan checklist |
| `removal_relocation` | inventory list, damage waiver, Packed → In Transit → Unloaded |
| interior design lines | measurement sheet, material sample approval, render upload |

Gemini's table is good and I have kept its substance; the change is that these become **config
entries**, not six bespoke forms.

### Phase 4 — Field-first UI *(smoother across every service)*

1. **`tel:` and map links** on every job card — call the client, open directions. Currently zero.
   Highest ratio of value to effort in the whole plan.
2. Replace the 47 inline styles with the `pm-*` design system already used elsewhere, and make the
   job card a real mobile card with large tap targets.
3. One **priority feed** at the top: what needs you today, in order.
4. Offline-tolerant photo upload — a rooftop has poor signal, and a failed upload after an hour of
   work loses the evidence.

### Phase 5 — Provider self-service *(closes the remaining read-only loops)*

1. **Compliance vault** — upload a renewed trade licence or insurance directly. The expiry
   countdown already exists; the upload does not, so today it ends in a WhatsApp message.
2. **Payout details and claims** — maintain bank/bKash details, request a payout, download the
   voucher as a receipt.
3. **Right of reply on complaints** — a provider can currently see a complaint and its effect on
   their rating, but cannot answer it. That is a fairness problem, not only a feature gap.
4. **Site observation / property lead submission** (Gemini's idea, kept) — a contractor on a roof
   sees work nobody has quoted. Worth a finder's fee and a defined intake.

### Phase 6 — Parity and hardening

1. Apply every capability to **both** the token portal and the session portal, or record which is
   deliberately excluded.
2. Extend `e2eFullJourney.js` across more than one line, and decide the fixture convention —
   either it cleans up like the rural/commercial suites, or it documents its kept records as
   intentional seed data.
3. A **portal e2e per capability**, in the style of `scripts/e2e/portals.js`: every write asserted,
   and the shared baseline checked at the end.

---

## 4. Sequencing advice

Phase 0 is already approved and comes first regardless — 0.1 is a defect, not an improvement.

Of the rest, if only one phase ships: **Phase 1.** A portal that cannot answer a contractor is a form, not a
portal, and every later phase (claims, disputes, compliance queries) generates messages that
currently have nowhere to go.

If two: **Phase 1 and Phase 4.1** — the reply path and the `tel:`/maps links. Together they are
small, and they change the portal from a record-keeping obligation into something a technician opens
on purpose.

Phase 3 is the one to reach for when you want visible breadth across services, because the
mechanism is already built and proven on the admin side.

---

## 5. What I have not verified

- I did not drive the portal UI in a browser; the frontend findings are from reading
  `PortalProvider.jsx` and the payload it receives, not from clicking.
- The 6 eligible providers in the assignability probe are largely e2e fixtures, so the gating is
  proven to *work*, not proven against real production provider data.
- Whether staff currently reply to providers by phone or WhatsApp is an inference from the absence
  of any `portal/outbound` row. Worth confirming with the operations desk, because it sets how
  urgent Phase 1 is.
