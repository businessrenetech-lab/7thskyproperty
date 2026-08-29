# Shared Agent Work Log

This is the persistent handoff log for every developer and AI agent working in this
repository. Read the full log before starting work and append an entry for every task.
The mandatory workflow is defined in `AGENTS.md` under **Shared Agent Coordination**.

> **Working on the Water Tank module (`/water-tank/*`)?** Read
> **Working Conventions — Water Tank Module** at the bottom of this file first.
> It documents the register/detail/edit route shape, the central identity service,
> the server-enforced SOP gates, the shared UI toolkit, and the verification
> discipline the module was built with. It is also the reference pattern for the
> other six service lines.

## Rules

- Append only. Never delete, rewrite, reorder, or claim another contributor's entry.
- Add a `STARTED` entry before changing files and a `COMPLETED`, `BLOCKED`, or `PAUSED`
  entry before ending the task.
- Use local time in `YYYY-MM-DD HH:mm` format and identify yourself when possible.
- State the scope, files changed, important decisions, and exact verification performed.
- Record failures and incomplete work honestly. Never mark unverified work as complete.
- Do not include passwords, access tokens, private customer data, or `.env` values.
- Check `git status` as well as this log. The worktree may contain concurrent changes that
  have not yet been documented.
- If another active entry overlaps your task, preserve its changes and coordinate or leave
  a clear `BLOCKED` entry instead of overwriting work.

## Entry Template

```md
### YYYY-MM-DD HH:mm | Agent/name | STATUS | Short task title
- Request: What the user asked for.
- Scope: Files or subsystem being worked on.
- Changes: What changed, or `None yet` for a `STARTED` entry.
- Verification: Commands/checks and results, or `Not run` with a reason.
- Handoff: Remaining work, risks, assumptions, and anything the next agent must know.
```

## Work Log

### 2026-08-03 | Unknown contributors | INHERITED | Existing uncommitted worktree
- Request: Not available in the current conversation.
- Scope: Short-term-stay backend/frontend feature work plus edits to existing portal,
  signing, client, property, KYC, UI, design, QA, and generated distribution files.
- Changes: The worktree already contained modified, deleted, and untracked files before
  this coordination log was created. See `git status` for the authoritative current list.
- Verification: Not run by the agent creating this snapshot; completion is unknown.
- Handoff: Treat all pre-existing changes as owned by another contributor. Inspect and
  preserve them. Do not revert, overwrite, stage, or claim them without explicit review.

### 2026-08-03 | OpenCode (GPT-5.6) | STARTED | Establish shared agent task logging
- Request: Automatically keep a Markdown record of every task so multiple agents can see
  what each other has done without the user needing to repeat the instruction.
- Scope: `AGENTS.md` and new root-level `AGENT_WORK_LOG.md` only.
- Changes: Created this append-only log and its entry template.
- Verification: Confirmed no existing task/work/handoff log matched this purpose and
  inspected the pre-existing worktree with `git status --short --branch`.
- Handoff: Add the mandatory automatic read/write workflow to `AGENTS.md`, verify the diff,
  and append the completion entry below.

### 2026-08-03 02:45 | OpenCode (GPT-5.6) | COMPLETED | Establish shared agent task logging
- Request: Automatically keep a Markdown record of every task so multiple agents can see
  what each other has done without the user needing to repeat the instruction.
- Scope: `AGENTS.md` and `AGENT_WORK_LOG.md` only.
- Changes: Added mandatory shared-agent coordination instructions to `AGENTS.md`; created
  this append-only task log with rules, a reusable template, and an inherited-worktree
  warning. No pre-existing application files or changes were modified.
- Verification: `git diff --check -- AGENTS.md AGENT_WORK_LOG.md` passed with only Git's
  LF-to-CRLF working-copy warning; reviewed the targeted diff and status.
- Handoff: Every future agent must now read this file and `git status`, append a `STARTED`
  entry, preserve concurrent work, and append a completion/blocker entry for every task.
  Existing short-term-stay and portal work remains unverified and owned by prior contributors.

### 2026-08-03 03:25 | OpenCode (GPT-5.6) | STARTED | Complete short-stay property operations
- Request: Add create-new and load-existing short-stay properties with full public listing
  details, a dedicated per-property dashboard, and complete operational workflows.
- Scope: Existing uncommitted short-stay backend/frontend module, canonical property reuse,
  public listing APIs/website integration, security, and verification. Work will be phased,
  beginning with the secure property foundation and dedicated property workspace.
- Changes: None yet.
- Verification: Read `AGENT_WORK_LOG.md`, inspected `git status`, and completed read-only
  backend, frontend, property-model, and public-listing architecture analysis.
- Handoff: Preserve all inherited short-stay and portal changes. Existing property records
  must remain available in their original rental/sales channels when linked to short stay;
  public visitors will enquire/request bookings rather than instant-book.

### 2026-08-03 03:15 | Claude Code (Opus 5) | COMPLETED | Short Term Stay module rebuild + check-in/out redesign
- Request: Rebuild the Short Term Stay frontend from the HTML mockup into our pm-scope design system (all 14 screens), wire presentational buttons, deepen screens vs the mockup, build Settings, then redesign Check-in/Check-out as a table + modal with clickable persisting checklists and working photo upload; admin-editable checklists.
- Scope: backend/services/shortTermStay.service.js, backend/controllers/shortTermStay.controller.js, backend/routes/shortTermStay.routes.js, backend/controllers/signing.controller.js (+ /remind), backend/routes/signing.routes.js, backend/models/ShortStayIncident.js, backend/models/ShortStayReadinessCheck.js (read-path only), backend/migrations/0060-short-stay-incident-provider.js (NEW, applied), admin-portal/src/screens/ShortStayHub.jsx, admin-portal/src/screens/shortstay/* (NEW dir: common, Dashboard, Availability, Bookings, Properties, CheckInOut, Enquiries, Guests, Housekeeping, Maintenance, OwnerAgreements, GuestAgreements, AgreementsScreen, Payments, OwnerStatements, Reports, Settings), admin-portal/src/ui/Layout.jsx (STR nav), admin-portal/dist/* (built). Deleted admin-portal/src/screens/ShortStayDashboard.jsx.
- Changes: New STR hub router (?tab=) + 15 real screens in pm-scope. Backend reads added: availability, bookings/:id, enquiries, guests, owner-agreements, guest-agreements, payments, owner-statements, reports, settings (GET/PUT), checkinout board, bookings/:id/readiness, readiness upsert, qualify, provider PATCH on incidents/housekeeping, signing /remind. Migration 0060 added assigned_provider_id to short_stay_incidents. Check-in/out redesigned to table+modal (clickable checklist, real photo upload to /api/uploads?folder=properties, condition notes) with admin-editable checkin/checkout checklists in Settings. Fixed JSON getter bug: reading readiness with raw:true returned unparsed strings and dropped checklist/photos — now read via model getters.
- Verification: `npm run build` (admin-portal) passes. Backend restarted on 50001; all new endpoints return 200. Browser QA (headless) of every screen with real data, no console errors. Check-in flow verified end-to-end: toggled checklist items + uploaded photo → saved → reloaded → persisted; board shows 3/8 + 1 photo progress. Created two throwaway test bookings (STB-816746 checked-out, STB-013135 confirmed w/ demo progress) to exercise the flow.
- Handoff: Entire STR module is UNCOMMITTED (working tree) and shares files with other in-flight sessions (Rentals/Vacancies/Clients/SalesEnquiries/property/client controllers were NOT touched by me — leave them). Actual dev ports here are backend 50001 / admin 3005 (AGENTS.md says 5001/3000). Remaining/deferred: Guests protected-document vault + Maintenance request-quote/approve-repair (need sub-models), Housekeeping Awaiting-QC column (needs enum). Nothing committed yet — awaiting user go-ahead to commit the STR fileset.

### 2026-08-03 03:15 | Antigravity (Gemini 3.6 Flash) | COMPLETED | Analyze Landlord Service Agreement & Plan Agreement Feature Improvements
- Request: Read docx service agreement from Downloads, analyze full text, dynamic redesign for Landlord Property Management Agreements, design Schedule C (Standard vs Agreed price), Payment Schedule, Table of Contents, input options, and generate comprehensive .md plan with full agreement contents.
- Scope: `implementation_plan.md` artifact created in brain folder (`94df3d5f-3769-4c00-8198-8e1f38f3ef19`).
- Changes: Analyzed `Residential Property Rental Management Service Agreement - V0.2.docx` (Doc No: SSPC-RPRMS-01, V0.2) from Downloads folder using Python zip/xml parser. Designed complete field input taxonomy (7 groups), Schedule C dual pricing (Standard BDT vs Agreed BDT), Payment Schedule, Schedule A service checkboxes, and interactive Table of Contents bar. Created full `implementation_plan.md` containing complete verbatim agreement HTML/Markdown template.
- Verification: Extracted and verified 538 lines of raw text & table data from DOCX file. Verified template placeholders, Schedule C code list (RPRM-001 to RPRM-018), Schedule A 39 service items, and 25 legal clauses.
- Handoff: Detailed implementation plan is ready in `implementation_plan.md` artifact. Ready for user approval to proceed with seed script (`seedLandlordPropertyManagementAgreement.js`) and UI implementation.



### 2026-08-03 03:35 | Claude Code (Opus 5) | STARTED | Dynamic Residential PM Service Agreement (RPRMS) — Phase 1 pricing catalog
- Request: Analyse the Residential Property Rental Management Service Agreement (SSPC-RPRMS-01 v0.2) and rebuild agreements dynamically — selection/entry inputs, Schedule C Standard vs Agreed pricing (standard prices editable, always in system), selected-services + payment-schedule summary, visible Table of Contents, everything landlord-visible. Decisions locked: reuse ServiceItem catalog; extend Smart-Agreement/KYC flow; auto-suggest payment schedule.
- Scope (P1): backend catalog only — seed RPRM ServiceCategory tree + 18 line items (RPRM-001..018) into ServiceItem with standard prices + a price_type for included/from/percent-of-rent; no changes to other sessions' files.
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Phases P2 (builder), P3 (landlord render + eSign), P4 (Schedule D + PDF) to follow. Reuses SigningEnvelope/eSign + OwnerFeeSchedule. Ports here are backend 50001 / admin 3005.

### 2026-08-03 03:39 | Claude Code (Opus 5) | COMPLETED | RPRMS agreement — P1 catalog + P2 dynamic renderer & endpoints
- Request: Dynamic redesign of the Residential PM Service Agreement (Schedule C Standard vs Agreed pricing, selected-services + payment-schedule summary, visible TOC, landlord-visible).
- Scope: NEW files only — backend/scripts/seedRprmCatalog.js, backend/services/rprmAgreement.service.js, backend/controllers/rprm.controller.js, backend/routes/rprm.routes.js; +1 mount line in backend/server.js ('/api/rprm'). Reverted an earlier wrong edit to routes/manifest.js (that file is NOT used by server.js — server.js mounts explicitly).
- Changes: Seeded 18 Schedule C line items (RPRM-001..018) into ServiceItem (care_services) under new ServiceCategory 'SVC-CAT-RPRM' (vertical residential_pm); special price formats (included/from/percent_of_rent) encoded in tags.price_type — no schema change to shared care_services. Built rprmAgreement.service: getRprmCatalog, computePricing (one-time vs recurring, discount/VAT, auto payment schedule, percent-of-rent w/ min), buildResidentialPMAgreement (full 25 clauses + visible TOC + Schedules A–D + Schedule C dual-price table + cost summary + payment schedule). Endpoints: GET /api/rprm/catalog, GET /api/rprm/meta, POST /api/rprm/preview.
- Verification: Seed created 18 items. Backend booted (mount list includes /api/rprm). Live preview 200: pricing math correct (one-time 18,500; monthly mgmt fee 3,000 = max(5% of 40k, min 3,000); agreed override 1,500 applied; total 17,500). Rendered HTML (42,958 chars) screenshotted — TOC + all clauses + Schedules A/B/C/D + Standard-vs-Agreed pricing all display.
- Handoff / COORDINATION: Another agent (Antigravity/Gemini 3.6) logged a COMPLETED plan for the SAME feature at 03:15 (implementation_plan.md in a brain folder) — analysis/plan only, no code; this entry is the working implementation. Concurrent edits by another agent to shortTermStay.controller/routes + server.js are present and were PRESERVED (not reverted). Remaining: P3 admin builder wizard UI (extend Smart-Agreement/KYC flow) + landlord eSign integration + PDF/OwnerFeeSchedule persistence. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-03 03:47 | Claude Code (Opus 5) | STARTED | RPRMS agreement — P3 builder UI + landlord eSign
- Request: Build the admin agreement builder (wizard) + landlord signing (reuse eSign/KYC) + persist agreed pricing/fee; consolidate on this implementation.
- Scope: NEW files (rprm builder screen + create/list endpoints) reusing SigningEnvelope/EnvelopeSigner; small nav mount. Preserve concurrent STR/server edits.
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Follows P1 catalog + P2 renderer (already COMPLETED). Backend 50001 / admin 3005.

### 2026-08-03 03:56 | Claude Code (Opus 5) | COMPLETED | RPRMS agreement — P3 builder UI + landlord eSign
- Request: Admin builder wizard + landlord signing (reuse eSign) + persist fee; consolidate on this implementation.
- Scope: NEW admin-portal/src/screens/RprmAgreements.jsx (list + 6-step builder wizard); backend rprm.controller createAgreement/listAgreements + rprm.routes; +1 route in App.jsx (/agreements/property-management), +1 nav item + breadcrumb in ui/Layout.jsx; +1 mount line in server.js (done in P2). Preserved all concurrent STR/server edits by other agents.
- Changes: POST /api/rprm/agreements creates a SigningEnvelope (document_html = full rendered agreement, related_type property_management_agreement) + landlord EnvelopeSigner (access token) + signature/date SignatureFields + OwnerFeeSchedule (recurring mgmt fee). GET /api/rprm/agreements lists them. Builder wizard: Parties (Contact+Property Combos auto-fill) → Services (Schedule A) → Property (Schedule B) → Pricing (Schedule C standard vs agreed + live cost summary + payment schedule via /rprm/preview) → Checklist (Schedule D + witnesses) → Review (full inline preview) → Send. Landlord signs via existing public /admin/sign/:token SignPage which renders document_html + signature fields.
- Verification: npm run build passes. Backend booted (/api/rprm mounted). Created ENV-RPRM-645343 via API (201, total 17,500); list shows it; opened landlord signing link → full agreement renders (TOC, 25 clauses, Schedules A–D, Schedule C dual pricing, TOTAL CONTRACT VALUE, payment schedule) + 'Your signature fields' + Sign/Decline; envelope status auto-advanced sent→viewed. Admin list screen renders with Copy link. Left one demo envelope (ENV-RPRM-645343) in DB.
- Handoff: Feature complete P1→P3 (catalog, dynamic renderer, builder, landlord eSign). Standard prices editable via ServiceItem catalog (base_price). Optional future: dedicated Schedule-C price-editor UI, PDF/certificate on completion (existing signing already generates final_pdf on sign), KYC gating for landlord. Overlaps Gemini's plan-only doc (implementation_plan.md) — user chose to consolidate on THIS implementation. Nothing committed. Backend 50001 / admin 3005.

### 2026-08-03 04:11 | Claude Code (Opus 5) | STARTED | Tenancy Management Service Agreement (RPTMS) — mirror of RPRM for tenants
- Request: Same dynamic agreement features as PM but signed with the TENANT; content differs (SSPC-RPTMS-01, 25 tenancy clauses, Schedule C 14 items RPTM-001..014, tenant party). Name it "TM Agreement" in the sidebar.
- Scope: NEW files — backend/scripts/seedRptmCatalog.js, services/rptmAgreement.service.js, controllers/rptm.controller.js, routes/rptm.routes.js; +1 mount in server.js (/api/rptm); frontend parameterize RprmAgreements.jsx + NEW TmAgreements wrapper; +1 route in App.jsx + nav in Layout.jsx. Preserve concurrent agents' STR/server edits.
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Mirrors the completed RPRM (P1-P3). Reuses SigningEnvelope eSign. Backend 50001 / admin 3005.

### 2026-08-03 06:56 | Claude Code (Opus 5) | COMPLETED | Tenancy Management Service Agreement (RPTMS) — mirror of RPRM for tenants
- Request: Same dynamic agreement features as PM, signed with TENANT; content = SSPC-RPTMS-01; sidebar "TM Agreements".
- Scope: NEW files only — backend/scripts/seedRptmCatalog.js, services/rptmAgreement.service.js, controllers/rptm.controller.js, routes/rptm.routes.js, admin-portal/src/screens/TmAgreements.jsx; +1 mount in server.js (/api/rptm); +1 route in App.jsx (/agreements/tenancy-management); +1 nav item + breadcrumb in ui/Layout.jsx ("TM Agreements"). No shared logic reverted; all concurrent STR edits preserved.
- Changes: Seeded 14 Schedule C items (RPTM-001..014) into ServiceItem under ServiceCategory SVC-CAT-RPTM (vertical tenancy_mgmt); price_type in tags. rptmAgreement.service: getRptmCatalog, computePricing (professional vs coordination fee buckets + recurring RPTM-014 + auto payment schedule), buildTenancyMgmtAgreement (25 tenancy clauses + visible TOC + Schedules A–D + Schedule C dual pricing + cost summary + payment schedule; Tenant party, Seventh Sky acting for owner). Endpoints /api/rptm: catalog, meta, preview, GET/POST agreements. Create → SigningEnvelope(document_html, related_type tenancy_management_agreement) + tenant EnvelopeSigner + signature fields. TmAgreements.jsx = list + 6-step wizard (Parties/Services/Tenancy/Pricing/Checklist/Review).
- Verification: seed 14 created. Backend booted (/api/rptm mounted, 401 unauth). npm run build passes. Created ENV-RPTM-524917 via cookie-auth API (201, total 6,500); tenant signing link renders full agreement (TOC, 25 clauses, Tenant party, Schedules A–D, Schedule C dual pricing, TOTAL CONTRACT VALUE, payment schedule, signature fields); status auto sent→viewed; admin TM list + sidebar "TM Agreements" render, no console errors.
- Handoff: Mirrors RPRM (P1-P3). NOTE: admin API auth is cookie-based (withCredentials) — QA fetches must use credentials:'include', not just a localStorage Bearer. No OwnerFeeSchedule for tenancy (no recurring % of rent). Nothing committed. Backend 50001 / admin 3005.

### 2026-08-03 07:06 | OpenCode (GPT-5.6) | COMPLETED | Complete short-stay property operations
- Request: Add create-new and load-existing short-stay properties with complete public listing, dedicated property workspace, and end-to-end operational workflows; continue autonomously and test after implementation.
- Scope: Short-stay backend controller/routes/service/models/migrations/seeds; shared agreement merge/intake/KYC activation; admin short-stay hub/screens/navigation/design primitives; public website short-stay pages and API routing; generated admin distribution.
- Changes: Restored the protected router by adding the missing property-readiness handler. Added seasonal rates, safe public DTOs, branch-scoped settings, availability limits, transactional calendar locking, state-safe confirmation/cancellation/deposit deductions, booking rescheduling with repricing/folio adjustment/agreement invalidation, per-owner KYC isolation, agency countersigners, escaped conditional agreement merging, readiness and KYC deactivation gates, earned-and-collected period reporting, persisted owner statement generation and ready/sent/paid/closed transitions, and payout evidence validation. Added permission-aware admin actions/navigation, request-to-book conversion, mobile property controls, authenticated condition-photo previews, accessible drawers/fields, responsive table wrappers, explicit website API rewrites, and coarse public location data. Applied migrations `0062-short-stay-rate-plans.js` and `0063-short-stay-booking-cancellation.js`; reseeded both short-stay agreement templates.
- Verification: Backend `node --check` passed for all changed short-stay/agreement/KYC controllers, routes, services, and seeds. `admin-portal npm run build` passed (1,920 modules); `website npm run build` passed (Next.js 16.2.6, all routes generated); `git diff --check` passed with Windows LF/CRLF notices only. `npm run db:migrate:status` shows migrations through `0063` up. Live port-50001 checks returned 200 for login, public listings, dashboard, properties, settings, bookings, reports, and owner statements; new statement-generation route returned 201; missing booking-amendment and readiness resources returned expected 404. Shared merge escaping/conditional rendering and protected-router loading passed. Live negative-owner-balance transitions returned sent 200, paid rejection 409, and closed 200. Browser QA loaded the public short-stay page at desktop/mobile/tablet with no application console errors, logged into admin, loaded the short-stay dashboard/property/booking/statement screens, generated a statement, opened the amendment drawer, verified dialog focus/labels/Escape close, and verified the mobile property action bar after the scroll fix.
- Handoff: No commit was created. Backend remains running on `127.0.0.1:50001` as PID 35096; the temporary website server was stopped. Public inventory currently has zero published listings, so browser QA covered the empty listing state but not a real public detail/request submission. Agreement builders were seeded and statically/runtime-route checked but were not invoked during final QA to avoid sending real emails. QA generated the current-period Short Term Stay statement for the existing Rahim Uddin / Flat 4B test data and advanced it to `closed` while verifying that a negative payout is rejected. Remaining non-blocking warnings: Vite's existing >1 MB chunk warning, Google Identity CSP blocking on login, and font preload warnings. Preserve all unrelated concurrent RPRM/RPTM/client/sales changes visible in `git status`.

### 2026-08-03 07:21 | Claude Code (Opus 5) | STARTED | Short Term Stay — Guest Verification modal (mockup parity)
- Request: Complete the guest-verification flow on Short Term Stay; clicking a guest opens a modal that mirrors the mockup (party list + per-member doc status/actions, Verification state timeline, Risk & notes, Protected documents, Mark verified / Request more information / Reject / Request documents).
- Scope: ISOLATED new files to avoid the other agent's in-flight STR controller/routes — migration 0064 (occupant id_document_url), NEW backend/controllers/shortStayVerification.controller.js + routes/shortStayVerification.routes.js mounted at /api/short-stay-verification (+1 server.js line); NEW admin-portal/src/screens/shortstay/GuestVerificationModal.jsx wired into Guests.jsx. Preserve all concurrent STR work (migrations through 0063, rate plans, cancellation, KYC isolation).
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Reads existing GET /short-stay/bookings/:id for party data; mutations via new isolated endpoints. Backend 50001 / admin 3005; admin auth is cookie-based.

### 2026-08-03 07:32 | Claude Code (Opus 5) | COMPLETED | Short Term Stay — Guest Verification modal (mockup parity)
- Request: Clicking guest verification opens a modal matching the mockup process.
- Scope: ISOLATED new files (avoided the other agent's in-flight STR controller/routes). Migration 0064 (occupant id_document_url/type + booking verification_meta JSON) applied; models ShortStayBookingOccupant + ShortStayBooking extended (additive); NEW controllers/shortStayVerification.controller.js + routes/shortStayVerification.routes.js mounted at /api/short-stay-verification in server.js; NEW admin-portal/src/screens/shortstay/GuestVerificationModal.jsx wired into Guests.jsx (Open verification button + clickable party card).
- Changes: Modal mirrors mockup — Party & identity documents (lead + occupants, per-member doc chip + View file/Review/Add file/Chase), footer Mark verified / Request more information / Reject, right rail Verification state 7-step timeline + Request documents, Risk & notes (occupation/emergency/notes save), Protected documents vault (upload to /uploads?folder=documents). Endpoints: GET view, POST document/review-member/state/risk/protected-doc. Verification meta persisted in ShortStayBooking.verification_meta JSON; per-member doc state on occupant.
- Verification: migration 0064 migrated. Backend booted (/api/short-stay-verification 401 unauth). npm run build passed. Cookie-auth QA: view endpoint returns shaped party+7-state timeline; opened modal in UI (all sections render); Request documents→Mark verified persisted (state=verified, timeline recorded); reset demo booking 5 back to not_started. No app console errors.
- Handoff: Preserved concurrent agent's STR work (migrations 0061-0063, rate plans, cancellation, KYC isolation) — my migration is 0064, all new files isolated. Admin auth cookie-based (credentials:'include'). Nothing committed. Backend 50001 / admin 3005.

### 2026-08-03 08:14 | Claude Code (Opus 5) | STARTED | STS agreement (SSPC-STRMS-01) + STR bulk owner disbursement page
- Request: Build STS (Short-Term Rental Management) agreement like PM/TM (signed with Owner); add a button on STR payments tab → bulk owner disbursement page where payout deducts Seventh Sky fees (fees per agreement Schedule C — STR-013 fixed monthly / STR-014 revenue share %).
- Scope: (A) NEW backend seedStsCatalog.js + stsAgreement.service.js + sts.controller.js + sts.routes.js (+1 server.js mount /api/sts); createAgreement persists fee model to ShortStayOwnerManagement so the EXISTING owner-statement engine deducts it. NEW admin StsAgreements.jsx + route + nav "STS Agreement". (B) NEW admin OwnerDisbursement page consuming EXISTING /short-stay/owner-statements(+/generate,/:id/status) — button on Payments screen. Do NOT modify the other agent's shortTermStay.service owner-statement logic.
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Reuses other agent's owner-statement/payout backend (generate, mark paid w/ reference). Backend 50001 / admin 3005; cookie auth.

### 2026-08-03 08:25 | Claude Code (Opus 5) | COMPLETED | STS agreement (SSPC-STRMS-01) + STR bulk owner disbursement
- Request: STS agreement like PM/TM (signed with Owner) + button on STR payments tab → bulk owner disbursement page where payout deducts Seventh Sky fees per the agreement Schedule C.
- Scope: NEW backend seedStsCatalog.js (STR-001..014, vertical str_mgmt, cat #11), stsAgreement.service.js, sts.controller.js, sts.routes.js (+ mount /api/sts in server.js). NEW admin StsAgreements.jsx + route /agreements/short-term-rental + nav "STS Agreements". NEW admin shortstay/OwnerDisbursement.jsx wired into ShortStayHub (tab owner-disbursement) + "Owner disbursement" button on Payments screen. Preserved concurrent agent STR work.
- Changes: STS builder captures management-fee model (STR-013 fixed monthly / STR-014 revenue share %) and on create persists it to ShortStayOwnerManagement (fixed_monthly_fee/revenue_share_percent) so the EXISTING owner-statement/disbursement engine deducts Seventh Sky's fee. Disbursement page consumes existing GET /short-stay/owner-statements + /generate + /:id/status: shows per-owner gross revenue − Seventh Sky fee − expenses = net payout, bulk-select, "Disburse selected" (generates statements, marks sent→paid with a disbursement reference). Negative payouts non-disbursable (backend rejects).
- Verification: STS catalog seeded 14. Backend booted (/api/sts + /api/short-stay-verification mounted). npm run build passed. Cookie-auth QA: created ENV-STS-847659 with 20% revenue share → owner statement now shows pct 20, fee=rev×20% (7500→1500); STS signing page renders full owner agreement (TOC, Property Owner/Client, Schedule C "% of Gross", signature fields). Disbursement page renders from payments-tab button: KPIs (gross 7.5k / SS fees 1.5k / expenses 56.1k / payouts due 0), per-owner net = revenue − fee(20%) − expenses, bulk bar + reference + Disburse selected; negative payout shows "Owner owes" (disabled). No app console errors.
- Handoff: STS agreement fee flows to disbursement via ShortStayOwnerManagement.revenue_share_percent (other agent's getOwnerStatements only applies revenue_share_percent, not fixed_monthly_fee — fixed-fee owners would show 0 SS fee until that calc is extended; flagged, not modified). Test STS agreement set property 1 mgmt to 20% (left as realistic data). Nothing committed. Backend 50001 / admin 3005; cookie auth (credentials:'include').

### 2026-08-09 12:28 | Claude Code (Opus 5) | STARTED | Rename Property Care → "Services" + 7 service-line dashboards
- Request: Rename nav "Property Care Services" → "Services". Sub-menu = Water Tank / Air Conditioning / Interior Design / Removal / Solar & Energy / Property Care & Concierge / Doc Verification & Transfer. Each service = separate dashboard + operations + SOP (details shared later, service by service).
- Scope: NEW admin-portal/src/screens/services/ServiceLineDashboard.jsx (generic per-slug shell: Dashboard/Operations/SOP tabs, catalog from /service-catalog/items?vertical=); route /services/lines/:slug in App.jsx; rename + restructure the 'care' nav group in ui/Layout.jsx (label "Services" + 7 service-line children + breadcrumbs). Preserve existing Property Care pages/routes.
- Changes: None yet.
- Verification: Not run yet.
- Handoff: Scaffolds only — each service's real operations/SOP to be fleshed out when the user shares specifics. Backend 50001 / admin 3005; cookie auth.

### 2026-08-09 12:35 | Claude Code (Opus 5) | COMPLETED | Rename Property Care → "Services" + 7 service-line dashboards
- Request: Rename nav group to "Services"; sub-menu = 7 service lines; each with separate dashboard/operations/SOP (details shared later).
- Scope: NEW admin-portal/src/screens/services/ServiceLineDashboard.jsx; route /services/lines/:slug in App.jsx; renamed 'care' nav group label → "Services" + added SERVICE LINES group (water-tank, air-conditioning, interior-design, removal, solar-energy, property-care-concierge, doc-verification) above a "Shared operations" group in ui/Layout.jsx; breadcrumb titles. Existing Property Care pages/routes preserved (demoted under "Shared operations").
- Changes: Generic per-slug service dashboard (SERVICE_LINES config: name/vertical/icon/blurb) with Dashboard/Operations/SOP tabs. Dashboard shows real catalog from GET /service-catalog/items?vertical= (KPIs + catalog table); Operations + SOP are structured scaffolds pending each service's shared workflow/SOP. No backend changes.
- Verification: npm run build passed. Cookie-auth QA (UI form login was flaky; logged in via fetch /api/auth/login then cookie): /services/lines/water-tank renders full dashboard with real water_tank catalog (28 items, 10 priced, avg ৳3,820, Rooftop ৳3,500 / Residential AMC ৳12,000 etc.); /services/lines/air-conditioning renders clean empty state; SOP/Operations tabs render; nav shows "Services" with 7 lines + Shared operations. No app console errors.
- Handoff: Scaffolds ready — user will share each service's operations + SOP + pricing service-by-service; then seed catalog (vertical per SERVICE_LINES) + build ops pipeline/SOP stages per line (same pattern as STR/PM). Only water_tank vertical currently seeded. Nothing committed. Backend 50001 / admin 3005.

### 2026-08-09 13:44 | Claude Code (Opus 4.8) | COMPLETED | Import Water Management (Water Tank) UI from Figma → 7th Sky branding
- Source: Figma file zRvMmXd3y541APm5xGhEUA node 2:9 ("7th Sky Watermanagement section" → dashboard). Pulled via Figma MCP get_design_context/get_metadata/get_screenshot.
- Design-to-code: rebuilt the standalone "Operations Dashboard" 1:1 in the admin portal, recoloured to 7th Sky branding only (Figma slate-900 sidebar #0f172a → deep navy #012a4e; teal accent #14b8a6/#0d9488 → cyan #12b6f3). Semantic status colours + neutrals kept as designed. Icons = lucide-react (every sidebar glyph matches a lucide name).
- ARCHITECTURE (per user): each service line is a SEPARATED console with its OWN sidebar/window. Water Tank is now a self-contained shell rendered OUTSIDE the global admin Layout (own 13-item sidebar: Dashboard, Clients, Service Requests, Site Assessments, Quotations, Work Orders, Projects, Providers, AMC, Invoices, Complaints, Communication Log, Settings). This is the REUSABLE pattern for all other service lines (swap nav+brand+accent).
- New files: admin-portal/src/styles/wt-scope.css (scoped recoloured tokens); admin-portal/src/screens/watertank/WaterTankConsole.jsx (shell + WT_NAV + Outlet), Dashboard.jsx (faithful dashboard, sample data), Placeholder.jsx (themed landing for the 12 not-yet-designed nav destinations).
- Wiring: App.jsx new auth-gated route group at /water-tank/* using WaterTankConsole (no global Layout). Layout.jsx Services nav "Water Tank Services" now → /water-tank (was /services/lines/water-tank). Old ServiceLineDashboard route left intact for other lines.
- Verify: npm run build passed. Viewed live via user's authenticated Chrome at /admin/water-tank — matches Figma, no console errors; fixed sidebar nav overflow (13 items) so nav scrolls internally with footer pinned.
- Next: build out real operations per Water Tank SOPs (task #33, now unblocked) + the two Water Tank agreements (customer #34 / provider #35) following the RPRM/PM flow. Sample dashboard figures to be wired to live endpoints. Nothing committed.

### 2026-08-09 14:03 | Claude Code (Opus 4.8) | COMPLETED | Water Tank operations screens (all 12 nav destinations, live)
- Built the full Water Tank operations pipeline behind every console nav item, in the imported Figma wt-scope style, backed by a real DB module.
- BACKEND (isolated, wt_ prefix — safe alongside concurrent agents): migration 0065-water-tank-ops (10 tables: wt_clients, wt_service_requests, wt_site_assessments, wt_quotations, wt_work_orders, wt_providers, wt_amc_contracts, wt_invoices, wt_complaints, wt_comm_logs); models/waterTankOps.js; controllers/waterTankOps.controller.js (generic list/detail/create/update/delete per entity + /dashboard aggregate); routes/waterTankOps.routes.js mounted /api/wt-ops in server.js; scripts/seedWaterTankOps.js (realistic seed matching the Figma sample). Ran db:migrate + seed OK; restarted backend (node server.js, no nodemon) — /api/wt-ops mounted.
- FRONTEND: admin-portal/src/screens/watertank/ — common.jsx (Pill map, WtHead, WtDrawer, generic WtListScreen with search + status filter + inline status PATCH + create drawer + detail drawer), OpsScreens.jsx (Clients, ServiceRequests, SiteAssessments, Quotations, WorkOrders, Projects, Amc, Invoices, Complaints, CommLog), Providers.jsx (card grid mirroring dashboard), Settings.jsx (WTC price schedule + Client/Third-Party SOP stages). Dashboard.jsx now wired live to GET /wt-ops/dashboard (KPIs, funnel, recent requests, upcoming AMC, top providers). App.jsx routes point to the real screens (Placeholder.jsx now unused).
- NOTE: 3005 is a VITE DEV SERVER (serves src with HMR) — source edits are live without rebuild; npm run build still passes.
- Verify: build passed; live QA via user's Chrome — Dashboard (live seeded figures), Clients, Service Requests (KPIs, filters, inline status, priority pills), Providers (card grid, compliance badge) all render correctly, no app console errors (only router future-flag warnings). Fixed provider compliance JSON parsed defensively (Sequelize JSON-as-string quirk).
- NEXT: the two Water Tank agreements (customer #34 / provider #35) on the RPRM/PM builder flow; deeper SOP-stage checklists per work order; wire quotation line-items from the WTC catalog. Nothing committed.

### 2026-08-09 14:38 | Claude Code (Opus 4.8) | COMPLETED | Import ALL Figma Water Tank screens 1:1 + wire to backend
- User feedback: earlier ops screens were "mediocre/basic" vs the imported dashboard; the Figma file has ALL screens designed, not just the dashboard — reflect every one in the system.
- Discovered 12 top-level frames in Figma file zRvMmXd3y541APm5xGhEUA (page 0:1): dashboard 2:9, client-list 2:256, client-detail 2:414, service-requests 2:1339, site-assessments 2:1512, quotation-management 2:1665, work-orders 2:581, project-detail 2:2128, provider-management 2:723, amc-register 2:885, invoices-payments 2:1814, complaint-management 2:1975. Pulled screenshots + design context for each.
- BACKEND: reset & rewrote migration 0065-water-tank-ops (undid old, re-migrated) so wt_ tables carry the exact fields the designs show; ADDED wt_projects (lifecycle/timeline/linked/milestones JSON). models/waterTankOps.js + controllers/waterTankOps.controller.js updated (entities: clients WTCM-C, service-requests SR-, site-assessments SA-, quotations Q-, work-orders WO-, projects WTCM-P, providers SP-, amc AMC-, invoices INV-, complaints COMP-, comms; detail() now resolves by id OR code). seedWaterTankOps.js rewritten to the EXACT sample data from the Figma screens. Migrated + seeded + backend restarted (node server.js).
- FRONTEND: rewrote common.jsx toolkit (Pill tone map incl. design vocab, WtHead/WtTabs/WtDrawer/CreateDrawer/StatCards/useCollection/parseJson). Removed OpsScreens.jsx + Placeholder.jsx. New faithful screens in src/screens/watertank/: Clients (filter bar + pagination) + ClientDetail (profile + tabs + overview), ServiceRequests (status tabs + Actions), SiteAssessments (table + verification checklist + photo gallery), Quotations (master-detail cost sheet w/ WTC line items), WorkOrders (status tabs + expandable scope/conditions/fee/actions), Projects + ProjectDetail (lifecycle stepper + timeline + linked records), Providers (KPI cards + master-detail compliance/performance), Amc (filters + ledger/calendar + financial summary), Invoices (KPI cards + table + milestone stages), Complaints (KPI + tabs + master-detail SLA timeline + urgent dispatch), CommLog. wt-scope.css extended (tabs, filter bar, master-detail split, wt-detail-grid 360px|1fr, cost sheet, checklist, timeline, stepper, milestones, linked chips, sub-tabs, progress, pager). App.jsx imports/routes updated incl. /clients/:code and /projects/:code.
- Verify: build passed; live QA via user's Chrome on clients, client-detail, service-requests, quotations (+cost sheet), work-orders (expanded), providers, amc, invoices (+milestones), complaints, site-assessments, project-detail — all match Figma, no console errors. Fixes: detail column order (360|1fr grid), provider compliance JSON parse, complaints default→open incident, linked-chip width, deleted a stray Q-1050 TEST row.
- NOTE: 3005 = Vite dev server (HMR live); backend = node server.js (no nodemon, restart for route/model changes). Nothing committed.
- NEXT: the two Water Tank agreements (customer #34 / provider #35).

### 2026-08-09 14:51 | Claude Code (Opus 4.8) | COMPLETED | Water Tank agreements — Customer + Provider (PM/tenancy builder flow)
- Built both Water Tank agreements on the SAME recent RPRM/PM dynamic-builder flow.
- SHARED CATALOG: scripts/seedWaterTankAgreementCatalog.js seeds Schedule C/B into ServiceItem vertical `water_tank_csa` (WTC-001..028 services, MAT-001..008 materials, LAB-001..005 labour; group tag for sectioning). Standard price = base_price. Seeded 41 items under category SVC-CAT-WTCSA.
- BACKEND: services/wtCustomerAgreement.service.js (SS-WTCM-CSA-01: 25 clauses + TOC + Sched A selected services / B project summary / C dual-price Services|Materials|Labour + cost summary + payment schedule / D warranty) and services/wtProviderAgreement.service.js (SSPC-WTCM-SDPMA-01: 25 clauses + TOC + Sched A authorised services / B standard price schedule dual-price / C insurance&licence checklist / D work order summary + Cumilla exclusive toggle). One controllers/wtAgreements.controller.js (customer→signer role `client`, related_type water_tank_customer_agreement; provider→role `service_provider`, related_type water_tank_provider_agreement) reusing SigningEnvelope/EnvelopeSigner/SignatureField. routes/wtAgreements.routes.js mounted /api/wt-agreements (/customer/* + /provider/*) in server.js.
- FRONTEND: admin-portal/src/screens/WtCustomerAgreements.jsx (list + 6-step wizard Parties→Services→Project→Pricing[qty+agreed, cost summary, payment schedule]→Warranty→Review) and WtProviderAgreements.jsx (list + 5-step wizard Provider→Authorised Services→Price Schedule→Compliance→Review + Cumilla toggle). App.jsx routes /agreements/water-tank-customer + /agreements/water-tank-provider; Layout.jsx nav "WT Customer Agreements" + "WT Provider Agreements" under Documents & Signing + breadcrumb titles.
- Verify: catalog seeded, backend restarted (/api/wt-agreements mounted), admin build passed. Live QA via user's Chrome: both preview endpoints render full docs (customer 25 clauses/4 schedules/total math ৳7,245 correct; provider 25 clauses/4 schedules/Cumilla ☑). Created one of each → envelopes ENV-WTCSA-390574 + ENV-WTSDP-391748 (status sent, signer tokens). Customer list shows record (৳3,675 = WTC-004 + 5% VAT). Public signing page /admin/sign/:token renders the full Customer Service Agreement ("Signing as QA Customer (client)"), confirming end-to-end eSign.
- CLEANUP NOTE: two QA test envelopes remain (ENV-WTCSA-390574 "QA Customer", ENV-WTSDP-391748 "QA Provider Ltd") — safe to void/delete from eSign Envelopes if unwanted.
- Nothing committed. This completes the Water Tank service line: Figma import + all ops screens + both agreements.

### 2026-08-09 15:00 | Claude Code (Opus 4.8) | FIX | WT agreements — show only selected items in Schedule C/B on signing page
- User: agreements must show ONLY selected items (not the full price catalog) on the signing page.
- Customer Schedule C already showed only selected (verified WTC-004 only). Provider Schedule B had a fallback that rendered the FULL 41-item catalog when nothing was selected — removed it. Now wtProviderAgreement.service.js scheduleB() renders only pricing.lines (heading renamed "Agreed Service Price Schedule"; shows "No services selected yet." if empty). Restarted backend; fresh provider preview now shows only the selected code.
- Cleaned up: voided the two QA test envelopes (ids 95 ENV-WTCSA-390574, 96 ENV-WTSDP-391748) via POST /signing/envelopes/:id/void.
- NOTE: envelope document_html is stored at create time, so this affects NEW agreements only.

### 2026-08-09 16:20 | Claude Code (Opus 5) | COMPLETED | Water Tank console — full operation wiring, efficiency + finish pass
- Request: "http://localhost:3005/admin/water-tank — cover all things under our water tank service, stay with the current UI, make it more efficient and user friendly, need perfect finished." User said an HTML showing the complete water service operation would be shared; it had NOT landed at time of work (repo's renetech-stitch-v2.html is an unrelated PTE/education ERP mockup). Did every part not dependent on that file.
- AUDIT FOUND: (a) dead controls everywhere — SR View/Assign, Quotation Send/Approve, WO Cancel/Accept/Mark Completed, Complaint Urgent Dispatch, ClientDetail Edit/Schedule, dashboard search; (b) no record could be edited or deleted after creation; (c) FAKE hardcoded figures shown as live data (Invoices 1,450,000 / 2,890,000 / 450,000 / "42" / "14"; Complaints "18.4 Hours" / "98.2%"; AMC 4,250,000 / "94.8%"; Providers 28/22/5/1; ClientDetail fake timeline + fabricated project id); (d) no pipeline — every screen an isolated list, nothing linked request→assessment→quote→WO→invoice.
- BACKEND (controllers/waterTankOps.controller.js + routes/waterTankOps.routes.js): NEW POST /wt-ops/:entity/:id/advance implementing the PIPELINE (service-requests→site-assessments→quotations→work-orders→invoices). Each hop creates the downstream record, opens/reuses the client's project file, stamps project stage + timeline + linked map, writes a wt_comm_logs audit line, and moves the source record's status. NEW GET /wt-ops/search (console-wide, all 11 entities, code + text columns) and GET /wt-ops/pipeline. Dashboard aggregate extended with real finance{}, sla{}, amc{} and an alerts[] action-centre feed (registered /search + /pipeline BEFORE /:entity so they aren't swallowed).
- FRONTEND toolkit (screens/watertank/common.jsx): toast pub/sub + ToastHost, RecordDrawer (view/edit/delete on a shared fields[] config), AdvanceDrawer, StatusCell (inline status PATCH via dropdown), RowActions (⋯ menu), EmptyState, error states + Retry on every collection, useCollection now returns patch/remove/advance, useCatalog (live WTC schedule), useFocusedRecord (?focus=CODE deep-link). NEW CommandPalette.jsx — ⌘K/Ctrl-K global search over records + screens, arrow/enter nav, deep-links into any list.
- SCREENS REWRITTEN: Dashboard (Action Centre, clickable KPIs/funnel/rows, real Revenue&Collections + Quality&SLA panels), ServiceRequests, SiteAssessments (checklist items now tick and persist), Quotations (line-item editor + "Add from price schedule" off the live catalog, live VAT/total recompute, Send/Approve/Reject wired), WorkOrders (Cancel/Accept/Start/Complete/Raise Invoice all wired), Invoices (real computed KPIs, full+partial payment recording, payout clearing), Complaints (real SLA maths from resolution_hours, Urgent Dispatch + timeline entries + resolve computing hours), Amc (renew drawer, expiry-in-60-days tracking, real portfolio figures, working visit calendar), Providers (real counts, compliance checklist now togglable), Clients (search + quick edit + log-request action), ClientDetail (real linked projects/requests/assessments/quotations/invoices/comms across 5 tabs, working Edit + Log Service Request), Projects + ProjectDetail (clickable stage stepper writing timeline, real Work Orders/Billing/Communication tabs), CommLog (channel tabs, search, edit), Settings (price schedule now live from /service-catalog/items?vertical=water_tank_csa instead of a 28-row hardcoded array). wt-scope.css extended (toasts, read-field grid, status/action menus, tab counts, command palette, sidebar search, danger buttons).
- ZERO fake numbers remain in the console — every figure is computed from records on file, with honest em-dash/empty states when there is no data.
- Verification: backend require-check OK; admin `npm run build` passed twice; backend restarted (PID replaced, /api/health 200) so /wt-ops/search + /advance are mounted. LIVE UI QA NOT YET RUN — the admin session had expired and I do not authenticate on the user's behalf; user was asked to sign in at /admin/login to finish the click-through.
- Handoff: when the user shares the water-service operation HTML, diff it against this console and fill any missing operation (likely candidates not yet built: photo/document upload on assessments, provider payout batching, water-quality test certificates). Backend 50001 (node server.js, no nodemon — restart for route changes) / admin 3005 (Vite dev, HMR live). Nothing committed.

### 2026-08-09 17:05 | Claude Code (Opus 5) | COMPLETED | Move Payments & Registers from Property Care → Water Tank console
- Request: move /admin/property-care/payments and /admin/property-care/registers under Water Tank Services "and wire properly".
- DECISION: not a route rename — the two pm-scope screens read /care/* (shared Property Care) data. "Wire properly" = rebuilt in the Water Tank console's wt-scope design against water-tank records, with the money model made real.
- BACKEND: migration 0066-water-tank-registers-payouts (NEW wt_warranties, wt_incidents; payout columns provider_paid_amount/payout_status/payout_date/payout_method/payout_reference on wt_work_orders; paid_amount + payments JSON ledger on wt_invoices). Migration 0067-water-tank-source-ref (source_ref on wt_warranties/wt_incidents/wt_complaints/wt_work_orders for carry-over provenance + idempotency). models/waterTankOps.js: NEW WtWarranty + WtIncident, new columns. Controller: ENTITIES gains 'warranties' (WTY-) + 'incidents' (INC-); NEW GET /wt-ops/payments (receivable/payable/settled + totals incl. Seventh Sky margin), POST /wt-ops/work-orders/:id/pay-provider (full/partial payout, validates against remaining, mirrors Cleared onto the project's invoice, logs to comms), POST /wt-ops/invoices/:id/record-payment (full/partial receipt, appends to the payments ledger, auto-marks Paid and drops the provider payout into Pending). Routes registered BEFORE the generic /:entity/:id handlers.
- FRONTEND: NEW screens/watertank/Payments.jsx (KPIs receivable/payable/collected/margin; tabs Client Receivables | Provider Payouts | Settled Payouts; amount drawer with method + reference, partial payments supported; rows deep-link to the invoice/WO). NEW screens/watertank/Registers.jsx (tabs Warranties | Complaints | Incidents; warranties track expiry with a 60-day lapse warning; complaints tab summarises wt_complaints and links to the Complaints desk; incidents are a full register; ?tab= deep-links). Added to WT_NAV + App.jsx routes.
- OLD ROUTES: /property-care/payments and /property-care/registers now <Navigate replace> to the water-tank equivalents; removed from the Property Care nav group and breadcrumb map; CareDashboard tiles repointed; unused CarePayments/CareRegisters imports dropped (CareBilling.jsx + CareRegisters.jsx left on disk, no longer routed).
- DATA CARRY-OVER (user chose "migrate", asked via AskUserQuestion after I found the legacy rows were all water-tank work): NEW scripts/migrateCareToWaterTank.js — care_warranties→wt_warranties, care_complaints→wt_complaints, care_incidents→wt_incidents, care_work_orders WHERE vertical='water_tank'→wt_work_orders. Maps care's lowercase status vocab to the Title Case vocab the WT screens use; resolves provider_id→company_name; carries provider_paid_amount so settled jobs land in the Settled tab. Idempotent via source_ref; supports --dry. Ran: 1 warranty + 1 complaint + 1 incident + 15 work orders carried; re-run skipped all 18. Nothing deleted from care_* (Property Care keeps its own view until that module is retired — flagged as the one duplication).
- Fixed during the run: the code allocator re-queried per row, so a batch (and any --dry run) handed every record the same code; replaced with a single high-water-mark read + in-memory increment.
- Verification: both migrations applied; admin `npm run build` passed; backend restarted (/api/health 200). DB check confirms the Payments queue is real — 9 work orders payable (~৳65,100 across Bengal SafeWater 15,000 / MegaClean 24,500 / Sikder 8,000 / Pure Flow 6×), 4 settled, registers hold 1 warranty / 1 incident / 3 complaints. LIVE UI QA STILL NOT RUN — admin session expired at /admin/login and I don't authenticate on the user's behalf.
- Handoff: Property Care's Work Orders + Invoicing screens still list the same 15 water-tank jobs from care_work_orders; retire or filter them when Property Care is decommissioned to remove the double listing. Backend 50001 (node server.js, restart for route/model changes) / admin 3005 (Vite dev). Nothing committed.

### 2026-08-09 18:40 | Claude Code (Opus 5) | COMPLETED | Water Tank — Third-Party Service Provider Management (SSPC-WTCM-SOP-02) end to end
- Request: user pasted the full provider-side SOP (SSPC-WTCM-SOP-02 v0.1) and asked for the entire frontend+backend designed to it — super user-friendly, site assessment "more organised professional", each provider with their own dashboard, complete onboarding → service delivery. Customer-side SOP to follow later (user said so mid-turn).
- DESIGN PRINCIPLE: the §4 workflow is the spine. Application → Capability Assessment → Compliance Verification → Insurance Verification → Agreement Signing → Territory Briefing → Approved. A provider is NOT assignable until §6 Step 4 (signed master agreement) — enforced server-side, surfaced everywhere as an "assignable / not assignable" badge. Every UI affordance carries its SOP clause reference so operators learn the procedure by using the tool.
- BACKEND: migration 0068-water-tank-provider-sop — wt_providers extended by 48 columns (business profile §5.1, workflow position §4, capability assessment, agreement §6.4, Cumilla briefing §6.5/§11, breach counters §11/§12, the nine §16 KPI fields, audit/renewal dates); NEW wt_provider_documents (§5.2 compliance + §5.3 insurance, one row per doc with expiry tracking), wt_provider_audits (§14), wt_provider_events (lifecycle timeline), wt_protected_clients (§12, 24-month non-circumvention), wt_service_reports (§8.10); wt_site_assessments extended (tank profile, risks, variations, water test, recommended services, sign-off, after-photos). NEW models/waterTankProviders.js. NEW controllers/waterTankProviders.controller.js — SOP reference data as single source of truth, buildGates() (per-provider gate evaluation + blocking reasons + assignability), buildKpis() (all nine §16 measures computed from real work orders/complaints/warranties/reports), directory aggregate, per-provider dashboard aggregate, lifecycle actions (stage/capability/agreement/territory-briefing/sanction/renewal/breach), document CRUD+verify, audit CRUD (completing stamps provider audit dates; Failed → Conditional), report CRUD+review, protected-client register (self-lapses on read) + /protected/check, and /alerts compliance watchtower. Routes mounted at /api/wt-providers. Hooked wt-ops work-order completion → §9 Step 12 warranty registration + §12 protection clock (both idempotent).
- FRONTEND: NEW providers/ProviderDirectory.jsx (KPI strip, clickable §4 pipeline funnel, compliance watchtower, readiness bar per row, assignable badge), providers/ProviderOnboarding.jsx (3-step application wizard — profile / capability / coverage, with Cumilla flagged as protected territory), providers/ProviderDetail.jsx (the provider's own dashboard: 9 tabs — Overview with readiness gates + all nine §16 KPIs, Compliance, Insurance, Agreement & Territory, Work Orders, Reports, Audits, Protected Clients, Timeline; every lifecycle action wired). NEW Compliance.jsx (Watchtower / Audits §14 / Protected Clients §12). NEW ServiceReports.jsx (§8.10 with Accept/Rework review per §9 Step 11). NEW AssessmentEditor.jsx + rewritten SiteAssessments.jsx — the "organised professional" rebuild: seven named sections in the order an assessor walks a job (details, tank profile, 9-point safety checklist, contamination + on-site water test, risks with level & control, scope/variations with estimates, photo evidence, sign-off), and the list now reads as an assessment report with a risk banner. wt-scope.css extended (~90 lines: pipeline, alerts, gates, readiness bars, wizard steps, check grids, assessment sections). Nav + routes added; superseded Providers.jsx deleted; command palette deep-links providers.
- DATA: NEW scripts/backfillWaterTankProviders.js — maps the 4 pre-SOP providers onto the workflow (old compliance JSON → 12 document-register rows marked verified with details outstanding; approved_services → §2 categories; coverage text → districts; onboarded_since → application/approved dates; cumilla_exclusivity flag). Deliberately does NOT backfill agreements or briefings — no evidence they happened, so the watchtower keeps flagging them (all 4 currently show "Approved without a signed agreement", which is a real pre-existing gap the system now surfaces). Idempotent (re-run skipped 12).
- Verification: migration applied (wt_providers now 67 columns); all 5 new tables created; backend require-check + restart OK (/api/health 200); admin `npm run build` passed 3×; backfill ran + re-ran clean. LIVE UI QA STILL NOT RUN — the admin session at /admin/login is expired and I do not authenticate on the user's behalf.
- Handoff: (1) customer-side SOP (SSPC-WTCM-SOP-01) still to come — the client journey screens should mirror this pattern. (2) Provider self-service portal (providers logging in to submit their own reports) is NOT built — reports are currently logged by Seventh Sky staff on the provider's behalf; the data model supports either. (3) response_time_hours is a stored field, not yet auto-computed from WO issue→accept timestamps (needs an accepted_at column on wt_work_orders). (4) Document file_url is a link field — wire to the existing FileUpload component for real uploads. Backend 50001 (node server.js, restart for route/model changes) / admin 3005 (Vite). Nothing committed.

### 2026-08-09 20:15 | Claude Code (Opus 5) | COMPLETED | Water Tank — Client / End User Management (SSPC-WTCM-SOP-01) + full-page client creation + calendar pickers
- Request: (a) new-client creation must be its own route (/water-tank/clients/new), step-by-step, not a modal; (b) must be able to fetch existing clients from the DB rather than retyping; (c) every date field needs a dynamic calendar dropdown; (d) every client needs a professionally designed dedicated dashboard; (e) build to the client-side SOP (SSPC-WTCM-SOP-01 v0.1), pasted in full.
- BACKEND: migration 0069-water-tank-client-sop — wt_clients +34 columns (§4 workflow_stage/stage_updated_at, §5.1 enquiry_date/channel/requested_service/service_category/alt contact, §5.2 consultation + water_quality_concerns + amc_required, §7.6 agreement_status/code/envelope/signed_date, deposit_required/amount/paid/date, §9.10 handover_date/handover_docs/maintenance_recommendations, §12 final_payment_confirmed/satisfaction_score/closure_checklist/closed_date/archived, first/last service dates, converted flags); NEW wt_client_events (lifecycle timeline); wt_complaints +acknowledged_at/acknowledged_by/ack_due_at for §11. NEW controllers/waterTankClients.controller.js — SOP reference data (§2 service catalogue by category, property/tank types, enquiry channels, §12 closure checklist, §9.10 handover pack), directory aggregate with all six §13 KPIs (lead conversion, service completion, satisfaction, complaint resolution time, AMC renewal, repeat client), /lookup across wt_clients AND the shared Contact directory, per-client 360° dashboard aggregate, buildGates() (11 phase gates), and lifecycle actions: stage / consultation / agreement / deposit / handover / closure / note / register (opens Project ID per §5 Step 1). §7 Step 6 enforced server-side: moving to Provider Assignment or Service Delivery without a signed Customer Service Agreement is rejected with the blocking clause. Routes mounted /api/wt-clients.
- FRONTEND: NEW DatePicker in common.jsx — real calendar popover (month/year selects, day grid, today/clear, min/max, click-away + Esc); FieldInput now renders it for EVERY type:'date' field, so all existing forms across the console got calendar dropdowns for free. NEW clients/ClientCreate.jsx at /water-tank/clients/new — full-page 4-step wizard with a sticky phase rail: Step 0 searches existing water-tank clients AND Seventh Sky contacts before letting you create (existing → opens their file; contact → pre-fills), then contact & property, requested service (picked from the §2 catalogue), initial consultation. On save it registers the client, opens the Project ID and stamps the consultation in one move, per §5 Step 1+2. NEW clients/ClientDashboard.jsx at /water-tank/clients/:code — hero card, clickable §4 eleven-stage pipeline, agreement-blocking banner, 8 tabs (Overview with 6 stat tiles + closure checklist, Journey with the 11 phase gates and Resolve buttons, Service History, Account, AMC & Warranty, Complaints with §11 acknowledgement state, Documents with the §9.10 handover pack, Timeline merging events + comms). Complaints screen gained §11 acknowledge-within-1-business-day: action, banner, KPI tile and timeline entry. Clients list "New Client" now routes to the wizard; old ClientDetail.jsx deleted. wt-scope.css +~70 lines (calendar, wizard rail/pane, lookup rows, client hero).
- DATA: NEW scripts/backfillWaterTankClients.js — places the 5 existing clients on the §4 workflow from evidence (work orders → Service Delivery/Completion, approved quote → Agreement Signing, assessment → Site Assessment, AMC status → AMC/Ongoing Support), sets enquiry_date, converted flags and first/last service dates, writes a migration event. Agreements deliberately NOT backfilled. Ran: 5 updated (C0001→Site Assessment, C0002/C0005→AMC/Ongoing Support, C0004→Completion); re-run skipped all 5.
- Verification: migration applied (wt_clients now 62 columns, wt_client_events live); backend require-check + restart OK (/api/health 200); admin `npm run build` passed 3×; both backfills idempotent. LIVE UI QA STILL NOT RUN — admin session expired at /admin/login; I do not authenticate on the user's behalf.
- Handoff: (1) §11 requires acknowledgement within 1 BUSINESS day — currently tracked as a timestamp + flag, but ack_due_at is not auto-computed with a business-day calendar (needs a holiday table). (2) Satisfaction survey is a score+notes field on closure, not a sent survey. (3) Client portal (clients logging in to see their own reports/warranties) not built. (4) Both SOPs are now implemented; the two consoles share the same gate/pipeline/KPI pattern. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-09 21:30 | Claude Code (Opus 5) | COMPLETED | Site Assessments split into register + own route; frontend debug pass; § removed
- Request (a): remove the § section sign everywhere. Replaced 285 occurrences across 20 source files with "Sec. " — user-visible labels, the backend clause strings the API sends to the UI (gate labels, watchtower alerts, phase names) and code comments, so screen and code agree. Only node_modules retains § (third-party libs, untouched).
- Request (b): /water-tank/site-assessments must show ONLY KPI cards + the list; each assessment opens its own route. Rewrote SiteAssessments.jsx as a pure register — 4 computed StatCards (Scheduled, Completed + not-scope-confirmed, Safety Verification % = completed visits with all 9 checks, High-Risk Findings), status tabs with counts, search, inline status change, row actions, chevron affordance. Removed from the list page: the master-detail report panel, the inline editor, the AdvanceDrawer and the selected-row state. NEW AssessmentDetail.jsx at /water-tank/site-assessments/:code — status strip (safety count, risk count, scope-confirmed, variation value) with one-click status changes, high-risk banner naming uncontrolled risks, left rail (assessment + tank profile + water-test readings), and the report body in six sections: Safety Verification, Contamination & Leakage, Risks (level + control, missing control called out in red), Scope & Variations (recommended services, variation table with total, findings), Photographic Evidence, Sign-Off. Edit opens the existing AssessmentEditor drawer; Build Quotation advances via the existing pipeline. Route wired in App.jsx; list rows + useFocusedRecord(?focus=CODE) now navigate to the detail route. Backend needed no change — /wt-ops/:entity/:id already resolves by id OR code.
- Request (c): frontend debug. No ESLint config exists in admin-portal (npx eslint fails: "couldn't find eslint.config.js"), so I wrote a static checker (scratchpad/debugcheck.py) for the bug class that crashes a React page but still passes a Vite build: JSX components/helpers referenced but not imported, and imports never used. Found and removed 9 genuinely dead imports: Pill (Clients, Compliance, ServiceReports, SiteAssessments, WorkOrders), ShieldCheck (Compliance), ArrowRight + ClipboardList (ClientDashboard), CalendarClock (ProviderDetail), plus Building2 + ClipboardList in the new AssessmentDetail. No missing-import (crash-class) defects found. NOTE: the checker's other "MISSING" hits are false positives — regex matching CSS functions var()/rgba()/minmax() inside style strings and ordinary prose inside comments; the "React imported but never used" hits are also false (JSX compiles to React.createElement).
- Verification: admin `npm run build` passed 3× (final 8.5s, no errors); debug checker re-run clean of real unused imports; 3 assessments on file confirmed addressable at /water-tank/site-assessments/SA-0402|0403|0404. LIVE UI QA STILL NOT RUN — admin session at /admin/login expired; I do not authenticate on the user's behalf.
- Handoff: admin-portal has NO eslint config — worth adding one (eslint.config.js + eslint-plugin-react-hooks) so this class of defect is caught at commit rather than by an ad-hoc script. The scratchpad checker is disposable, not committed. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-09 22:40 | Claude Code (Opus 5) | COMPLETED | Site Assessment: own edit route, step-by-step wizard, real photo upload, extensible checklist, comments
- Request: assessment edit must open in its own route; step-by-step; photo upload sections; pre-set checklist per assessment type with the ability to add new items; comments / more-detail feature.
- BACKEND: migration 0070-water-tank-assessment-detail — NEW wt_assessment_comments (body, category, author, attachment_url, pinned); wt_site_assessments += custom_checks, equipment, attendees, weather, duration_minutes, client_present, client_signature, template_key. Model WtAssessmentComment added. Controller: NEW GET /wt-ops/assessment-reference serving the checklist system — 9 STANDARD_CHECKS grouped (Access & Safety / Condition / Systems) plus 5 CHECK_TEMPLATES (standard, overhead, underground, commercial, repair) each adding its own extras (e.g. underground adds gas test, forced ventilation, standby person, groundwater ingress) — plus equipment options, comment categories, risk levels, tank types, materials, water sources, recommended services. NEW comment CRUD at /wt-ops/site-assessments/:id/comments (+ /:commentId for patch/delete), registered before the generic /:entity/:id routes.
- ROUTES: /water-tank/site-assessments/new and /water-tank/site-assessments/:code/edit both render the new full-page AssessmentForm. The drawer editor (AssessmentEditor.jsx) is deleted; list + detail now navigate instead of opening a modal.
- NEW AssessmentForm.jsx — 7 steps with a sticky rail (Visit details, Tank profile, Safety checklist, Water quality, Risks & scope, Photo evidence, Sign-off). "Save & continue" PATCHes on every step so a half-finished assessment is never lost; creating from /new POSTs on the first save then rewrites the URL to the edit route so a refresh keeps the record. Live counters in the rail. Final step is a readiness checklist (7 gates incl. "every risk has a control measure").
- CHECKLIST: template selector swaps in the right pre-list per tank type; items render grouped; each item is Verified / unset / N/A (three states, N/A greys out and is excluded from the verified count); assessors add their own items inline (slugged key, badged "Added", removable). Custom items persist in custom_checks and show on the report.
- PHOTOS: NEW PhotoUpload.jsx (WtPhotoGrid) — real multi-file upload to /api/uploads with drag & drop, thumbnail grid, per-photo caption, view-full-size, remove, and a paste-a-link fallback. Before and After sections. Detail page now renders actual thumbnails instead of placeholder icons.
- COMMENTS: NEW AssessmentComments.jsx — threaded notes with categories (Note / Observation / Risk / Client Request / Follow-up), file attachment, pin-to-top, delete, Ctrl+Enter to post; rendered as a "Comments & Observations" section on the assessment report.
- PRIVACY DECISION: photos and comment attachments are stored in the PRIVATE `documents` folder, not `services`. backend/server.js serves properties/services/website/branches/assets publicly with no auth; assessment photos show the inside of a client's tank and identify their property, so they are JWT-gated. fileSrc() already appends the token, so <img> thumbnails still render.
- DEBUG PASS: no ESLint config exists in admin-portal, so the static checker was re-run — found and removed 1 unused import (MessageSquare in AssessmentComments) plus the earlier 11. No missing-import (crash-class) defects.
- Verification: migration applied (all 7 new columns + comments table confirmed); backend require-check + restart OK (/api/health 200); admin `npm run build` passed 4×; created backend/uploads/documents-adjacent services dir. LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: (1) client_signature column exists but no signature-pad UI yet — sign-off is typed name + date. (2) Comments are flat, not threaded replies. (3) Photo EXIF/geotag is not captured. (4) admin-portal still has NO eslint config — worth adding. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-09 23:55 | Claude Code (Opus 5) | COMPLETED | Quotation builder from assessment + branded PDF/email + Customer Service Agreement hand-off
- Request: Build Quotation opens its own route from an assessment; lists services/fees from the customer agreement + standard pricing with editable prices; search/select services; add other fees; then Send-email-PDF and Download-PDF with branded quotation format + branded email template pulling contact details from Settings; after the quotation, create the Customer Service Agreement fetched from the existing /agreements/water-tank-customer flow, default drafted, editable, sendable.
- ROUTES: /water-tank/site-assessments/:code/quotation (builder) and /:code/quotation/:quoteCode/agreement (agreement). Build Quotation on the assessment detail + list row now navigate here; the old AdvanceDrawer path is removed from AssessmentDetail.
- BACKEND: migration 0071 (wt_quotations += source_assessment, other_fees, discount, vat_exempt, payment_terms, notes, sent_at, sent_to, agreement_envelope_id, agreement_code). NEW services/wtBranding.service.js — single source for brand + contact details read from Settings, with only-configured contact lines so documents never print blanks. NEW controllers/waterTankQuotation.controller.js: GET /wt-quotes/builder/:assessmentId (assessment + client + 41-item priced catalogue grouped Services/Materials/Labour from tags.group + assessor recommendations auto-matched to catalogue + variations as suggested fees + existing quote), POST /from-assessment/:id (server recomputes all totals — client sends lines only; idempotent per assessment; stamps project timeline + comm log), GET /:id/document (branded print-ready HTML), GET /:id/email-preview, POST /:id/send (emails via existing communication.service with the PDF attached; own 25 MB json parser since the global limit is 2 MB), GET /:id/agreement-draft, POST /:id/link-agreement (marks quote Approved, moves client to Agreement Signing, writes client event + comm log). Mounted /api/wt-quotes.
- PDF DESIGN DECISION: the server renders the branded HTML (one source of truth) and the browser turns it into the PDF via html2pdf — so the emailed attachment is byte-identical to the downloaded file, and there is no second server-side renderer to keep in sync. Backend pdfkit was deliberately not used for this.
- FRONTEND: NEW QuotationBuilder.jsx (sticky searchable price-schedule panel with group chips; click to add; per-line qty + editable rate with a "reset to standard" control and a Std-price hint when adjusted; Add other fee/material rows are fully editable; live totals with allocation fee, discount, VAT-exempt toggle; Preview / Save / Download PDF / Email / Create Service Agreement). NEW QuotationSend.jsx (drawer showing the real branded email in an iframe before sending, editable to/subject/personal message, builds the PDF then posts it). NEW QuotationAgreement.jsx (drafts the Customer Service Agreement from the quote, editable client/property/project/pricing, live preview rendered by the EXISTING /wt-agreements/customer/preview engine — no second agreement engine — then creates + sends via the existing create endpoint and links the envelope back to the quote; success view shows the signing link with copy/open).
- VERIFIED end to end with a scripted run through the real controllers (not just a build): builder 200 (41 items, 3 groups, 6 of 7 recommendations auto-matched), save 200 → Q-1050 with totals 2800 + 1500 + 800 − 200 = 4900 +5% VAT = 5145 confirmed correct, document 200 containing all expected sections, email preview 200, agreement draft 200, and the real agreement engine building a 40k-char document.
- BUG FOUND AND FIXED during that run: the provider allocation fee was not carried into the agreement draft, so the agreement's contract value came out 4305 against the quotation's 5145. Allocation fee now rides in the agreement's transport/other figure; both sides now reconcile at 5145 exactly. The automated-check quotation Q-1050 was deleted afterwards.
- SETTINGS GAP FOUND AND FIXED: system_settings held only 5 rows — initializeDefaults() had never run on this database, so every branding/contact key was absent and documents would have printed almost no contact details. Ran it (57 rows now). Also corrected wtBranding to the REAL key names (CONTACT_EMAIL_PRIMARY / CONTACT_EMAIL_SUPPORT, not CONTACT_EMAIL) and added four new editable keys: COMPANY_WEBSITE, COMPANY_TRADE_LICENCE, COMPANY_BIN, COMPANY_TIN for the document footer.
- ACTION FOR THE USER: CONTACT_PHONE_PRIMARY, CONTACT_ADDRESS, CONTACT_WHATSAPP, BRAND_LOGO_URL and the new COMPANY_* keys are still EMPTY in Settings. Until they are filled the quotation PDF and email print only the email address. Email sending also needs SMTP_PASS set.
- Verification: migration applied; backend require-checks + restart OK (/api/health 200); admin `npm run build` passed 4×; debug checker clean of real unused imports (2 removed). LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: (1) fill the Settings contact keys. (2) SMTP_PASS required before any email will actually send. (3) The agreement draft maps catalogue service lines by code; custom fee lines ride in as transport/other rather than as itemised agreement lines. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-10 00:45 | Claude Code (Opus 5) | COMPLETED | Quotations page brought to the same pattern as Site Assessments
- Request: /water-tank/quotations should have the same features built for site assessments — register-only list, own route per record, own edit route, comments.
- COMMENTS GENERALISED: migration 0072 replaces wt_assessment_comments with wt_record_comments (entity_type + entity_id + entity_code), carrying existing rows across before dropping the old table (it held 0 rows). Model WtAssessmentComment → WtRecordComment. Controller comment endpoints are now entity-addressed with a COMMENTABLE allow-list (site-assessments, quotations, work-orders, invoices, complaints) so the same thread can be attached to any of them later. Routes became /wt-ops/:entityType/:id/comments — safe ahead of the generic /:entity/:id family because the third segment is the literal "comments". Frontend AssessmentComments.jsx → RecordComments.jsx taking entityType + entityId; AssessmentDetail updated.
- LIST (Quotations.jsx rewritten): KPI cards + list only, exactly like the assessment register. Four computed cards — Open Pipeline (value + count awaiting decision), Approved Value (with how many became agreements), Win Rate (approved vs decided), Not Yet Sent. Decision tabs with counts, search, inline decision change, row actions (open / edit lines / create agreement when approved / delete), chevron affordance, average value in the footer. The old master-detail cost-sheet panel and inline line editor are gone.
- DETAIL (NEW QuotationDetail.jsx at /water-tank/quotations/:code): status strip (decision, line count, total, validity, sent state, linked agreement) with approve/reject; left rail (quotation facts, client card linking to the client file, action stack); cost sheet grouped Services / Additional Fees with standard-vs-agreed shown per line and the full totals block; terms & notes; and a comment thread. Actions: Preview, Edit, Download PDF, Email to client (re-uses QuotationSendDrawer), Create Service Agreement, View site assessment, Delete.
- EDIT ROUTE: /water-tank/quotations/:code/edit reuses the QuotationBuilder. Backend builder + save now accept EITHER an assessment code or a quotation code — quotations raised before the builder existed (Q-1048, Q-1049) have no source_assessment, and previously could not be opened at all. Saving through a quote code updates in place rather than creating a duplicate. Agreement route also works from either entry path (/quotations/:code/agreement).
- VERIFIED with a scripted run against the real controllers: builder opens from a standalone quote code and resolves the client + 41-item catalogue + the existing quote; save updates in place (quotation count 2 → 2, no duplicate) with correct maths (800 × 2 + 5% = 1,680); document renders carrying the quote number; a comment posts against entity_type "quotations" and lists back; agreement draft resolves. Debug checker clean.
- DATA I DAMAGED AND RESTORED: the save step of that verification overwrote Q-1049's seeded lines (৳29,820 → ৳1,680). I restored it from scripts/seedWaterTankOps.js — 4 lines, service_charges 28,400, allocation 18,000, VAT 1,420, total 29,820, decision Pending. Verified back in place. The earlier leftover verification quotation Q-1050 was also deleted.
- Verification: migration applied; backend require-check + restart OK (/api/health 200); admin `npm run build` passed; debug checker clean of real unused imports. LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: work-orders / invoices / complaints are already on the COMMENTABLE allow-list but their screens do not render RecordComments yet — dropping <RecordComments entityType="..." entityId={...} /> into each detail view is all that is left. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-10 02:10 | Claude Code (Opus 5) | COMPLETED | Service Requests: website enquiry intake + step-by-step request wizard with assessment/quote branching
- Request: New Request as a step-by-step flow; ask whether a site assessment is required — if yes schedule the assessment date, if no go straight to building a quote from the full searchable service list; providers must load from existing SIGNED providers; this section connects to the website (all water-tank enquiries land here: client name, phone, email, site address, required services, short info) under an Enquiries tab; an "add service request" button inside enquiries starts the request flow; NO prices on the public website.
- BACKEND: migration 0073 — NEW wt_enquiries (client_name, phone, email, site_address, district, property_type, services_requested JSON, tank_type, tanks_count, preferred_date, message, source, page_url, status, assigned_officer, contacted_at, notes, converted_* linkage); wt_service_requests += client_code, email, phone, district, property_type, services_requested, needs_assessment, assessment_date, assessment_code, quotation_code, project_id, source, enquiry_code. NEW controllers/waterTankIntake.controller.js + routes.
- PUBLIC (unauthenticated, mounted /api/public/water-tank): GET /services returns the service menu grouped into 9 customer-facing families derived from the service names (Inspection & Assessment, Tank Cleaning, Disinfection & Treatment, Water Quality Testing, Repairs & Waterproofing, Pump & Pressure, AMC, Maintenance, Emergency) — names and units ONLY, materials and labour rates filtered out and no pricing field emitted anywhere. POST /enquiry takes the website form, requires name + phone, writes a comm-log line and returns only { ok, reference, message } so nothing internal leaks.
- CONSOLE: GET/POST/PATCH/DELETE /wt-intake/enquiries with a summary (new / contacted / qualified / converted / unqualified + conversion rate). GET /wt-intake/request-reference returns the priced catalogue AND every provider annotated with `assignable` + `blocked_reason` — enforcing SOP-02 Sec. 6 Step 4 (approved status AND a signed master agreement) so only genuinely eligible providers can be picked. POST /wt-intake/requests is the one-shot router: creates/reuses the client, opens the project file, raises the request, then EITHER schedules the site assessment on the chosen date OR raises the quotation from the selected lines, stamps the project timeline, writes the comm log, and marks the originating enquiry Converted with a back-link.
- FRONTEND: ServiceRequests.jsx rebuilt as two registers behind one screen with a view switch — Enquiries (4 KPI cards, status tabs, search, inline status, per-row "Add service request" button, log-an-enquiry drawer, converted rows link to their request) and Requests (4 KPI cards, status tabs, a "Routed to" column linking straight to the assessment or quotation it produced). NEW ServiceRequestNew.jsx at /water-tank/service-requests/new — 4-step wizard with sticky rail: Client (searches both the water-tank book and the Seventh Sky contact directory) → Service details → Route the job (two large choice cards) → then either Schedule assessment (date picker + eligible provider) or Build quote (searchable price schedule, click to add, editable qty/rate with reset-to-standard, add-other-fee rows, live totals). Accepts ?enquiry=CODE to pre-fill from an enquiry and jump to step 2. CreateDrawer gained an optional postTo so it can target /wt-intake/enquiries.
- VERIFIED end to end against the real controllers: public enquiry 201 returning only {ok, reference, message}; it appears in the register as New/Website; reference data returns 41 catalogue items + all 4 providers correctly annotated; branch A produced SR-1100 → client WTCM-C0007 → project WTCM-P0005 (stage Assessment) → assessment SA-0405 dated as chosen, with the enquiry flipped to Converted and back-linked; branch B produced SR-1101 → quotation Q-1050 at 3,465 matching the expected 2 services + 500 allocation + 5% VAT exactly; all three validation guards rejected with 400. Public services endpoint scanned for price leakage — clean. Everything the check created was deleted afterwards.
- FINDING FOR THE USER: **0 of 4 providers are currently assignable**, so the provider dropdown in the wizard is empty. Bengal SafeWater and Sikder Tank Services have no signed master agreement (Sec. 6 Step 4); Xyz is Pending; Dhaka Clean Water Group is Conditional. This is the SOP gate working, not a bug — record the master agreements on each provider file to unblock assignment.
- Verification: migration applied; backend require-checks + restart OK (/api/health 200); admin `npm run build` passed twice; debug checker clean (1 unused import removed). LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: (1) the website form itself is not built — point it at POST /api/public/water-tank/enquiry and GET /api/public/water-tank/services. (2) No email/SMS acknowledgement is sent to the enquirer yet. (3) Enquiries do not yet appear on the console dashboard's action centre. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-10 03:40 | Claude Code (Opus 5) | COMPLETED | Work Orders: auto-raised on signed agreement, dedicated dashboard with progress bar, provider assignment, step-by-step edit
- Request: after the customer agreement is signed a work order should be generated automatically; assign the provider from there; clicking a work order opens its own route with a dynamic dedicated dashboard showing all relevant details and a progress bar (also shown in the list); edit in its own route, step by step; add more features.
- AUTO-GENERATION: the signing controller already funnels every completed envelope through handleEnvelopeCompleted() in partyRoleActivation.service, which dispatches on related_type (there was an existing precedent — care_quotation raises a work order the same way). Added a `water_tank_customer_agreement` branch calling NEW services/wtWorkOrder.service.js → createFromSignedAgreement(). It pulls the contract value from the envelope terms, the lines/fees from the originating quotation, the client and project file, and raises the work order inside the same transaction. Idempotent on agreement_envelope_id — a double-completed envelope cannot produce two work orders. Also moves the client to "Provider Assignment", stamps agreement_status/code/date, writes a client event, marks the quotation Approved and appends to the project timeline.
- PROGRESS MODEL: 9 weighted stages (raised 5, assigned 10, accepted 10, scheduled 10, attended 15, work_done 25, reports 10, verified 10, invoiced 5) summing to 100. Crucially progress is DERIVED from the record (provider set → assigned; accepted_at → accepted; started_at → attended; status Completed → work_done; reports+photos → reports; verified_at → verified), so the bar can never disagree with what actually happened, even if someone edits a field directly. stages/progress are stripped from PATCH bodies for the same reason.
- BACKEND: migration 0074 (28 columns on wt_work_orders — provenance, assignment, acceptance, delivery, attendance JSON, stages JSON, progress, the Sec. 9 Step 9 verification checklist, lines). NEW controllers/waterTankWorkOrder.controller.js + routes at /api/wt-work-orders: reference (stage defs + providers annotated assignable/blocked_reason), list (each row with progress + summary), detail (work order + client + provider + quotation + project + invoices + reports + comms + money + computed next_action), and lifecycle actions assign / accept / decline / schedule / start / complete / verify. Assignment REFUSES a provider who is not approved with a signed master agreement (Sec. 6 Step 4) rather than warning. Completion reuses the existing warranty + protected-client side-effects via a newly exposed hook on waterTankOps.controller.
- FRONTEND: NEW WorkOrderDetail.jsx at /water-tank/work-orders/:code — progress bar + 9-stage track with the next action highlighted and a one-click "Do it", status strip, left rail (work order / client / money incl. margin and provider-due), assigned-provider panel, scope with line items, the Sec. 9 Step 9 verification gate list, service reports, and a comment thread. Assign drawer lists eligible providers with rating/completion-rate and shows the blocked ones with their reason. NEW WorkOrderForm.jsx at /:code/edit — 5-step full-page wizard (job details → provider → schedule & crew → money with a live margin warning if the provider fee exceeds the contract → completion checklist), saving on each step. WorkOrders.jsx rewritten as a register with progress bars in every row, 4 KPI cards, a banner when work orders are waiting for a provider, and source badges showing which came from a signed agreement. RecordComments re-exported from common.
- VERIFIED with a scripted run through the real service + controller: auto-raise produced WO-0500 at 5% from a simulated signed envelope with contract 8,610 / provider fee 7,000 / SS fee 1,200; re-running returned the same work order (no duplicate); client moved to Provider Assignment with agreement Signed; assigning a blocked provider was refused 400 with the reason, an eligible one accepted 200; the bar walked 5 → 25 → 35 → 50 → 75 → 95% across assign/accept/schedule/start/complete/verify with every weight adding up; dashboard returned next_action "Raise the invoice" and 8 of 9 stages done; the register showed the row at 95% flagged as agreement-sourced. All fixtures deleted afterwards.
- NOTE ON THE 35% STEP: scheduling did not move the bar because the work order already carried a target_date from the agreement's start date, so the "scheduled" stage was satisfied at creation. Correct behaviour, not a gap.
- FINDING: the register currently shows **5 work orders awaiting a provider**, and still **0 of 4 providers are assignable** (2 have no signed master agreement, 1 Pending, 1 Conditional). Assignment stays blocked until those agreements are recorded on the provider files.
- Verification: migration applied; backend boots with /api/wt-work-orders mounted (/api/health 200); admin `npm run build` passed twice; debug checker clean (7 unused imports removed). LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: (1) the "invoiced" stage is not yet auto-ticked when an invoice is raised against the project — currently only reachable via the invoices screen. (2) Providers cannot accept/decline themselves; staff record it on their behalf. (3) No SMS/email notification to the provider on assignment. Backend 50001 / admin 3005. Nothing committed.

### 2026-08-10 05:00 | Claude Code (Opus 5) | COMPLETED | System-wide automatic ID generation and linkage (Client ID / Project ID everywhere)
- Report: WO-0499's Project ID was blank on the edit screen even though projects exist. Investigated rather than patching the one record — the gap was systemic: 15/18 work orders had no project_id, 18/18 no client_code, 5/6 service requests missing both, 1/1 warranty missing project_id.
- ROOT CAUSE: three write paths never resolved linkage — (a) the generic /wt-ops/:entity create, which most screens use, (b) the earlier care→water-tank carry-over script, (c) seeded records predating the columns. Codes were minted per-controller with duplicated logic, so anything created outside a purpose-built flow got a code but no links.
- FIX — NEW services/wtIdentity.service.js: one place that mints every water-tank code (13 entities, each with its prefix/pad/start) and attaches linkage. ensureClient() finds by code, then by name, and creates the client if genuinely new. ensureProject() finds the client's open project or opens one. attachIdentifiers() fills only what is blank and never overwrites, so it is safe on every write. A LINKS map declares which fields each entity carries.
- WIRED IN: the generic create now calls attachIdentifiers, so ANY record created from ANY screen gets its Client ID and Project ID, creating the client and project if this is the first record naming them. The generic update and the work-order controller's update backfill blanks on edit, so opening and saving an old record repairs it.
- PLACEHOLDER GUARD: my earlier carry-over wrote client_name 'Unknown client' where the source had none. The resolver refuses to mint identities for placeholder names (unknown / n/a / none / test / tbd / bare dashes), so the gap stays visible rather than being papered over with a fake client. Verified: creating a work order named "Unknown client" leaves client_code blank.
- MISTAKE I MADE AND CORRECTED: the first version of scripts/backfillWaterTankIdentifiers.js honoured --dry only for the row update, not for the client/project creation inside the resolver — so the "dry run" actually wrote 14 clients and 12 projects. Threaded a dryRun flag through ensureClient/ensureProject/attachIdentifiers (returning virtual '(new client)' / '(new project)' placeholders instead of writing) and confirmed a dry run now leaves the counts unchanged (20 clients / 15 projects before and after). Deleted the one illegitimate record pair the accident created — client WTCM-C0015 and project WTCM-P0010, both named 'Unknown client'. The other 13 clients and 11 projects it created were legitimate — real client names on real work orders that needed the linkage — so they were kept.
- BACKFILL: ran for real — 23 records repaired across service requests, work orders and warranties; re-run repaired 0 and skipped all 34, so it is idempotent. WO-0499 now reads client_code WTCM-C0020, project_id WTCM-P0015. Every table is now clean except one work order (WO-0486, the 'Unknown client' placeholder) which is correctly left blank.
- UI: the work-order edit form no longer offers Project ID as a free-text box. System identifiers (Work Order, Client ID, Project ID, Agreement, Quotation) render as read-only chips; Client ID and Project ID are clickable through to their files, and show "Assigned on save" when not yet minted.
- VERIFIED with a scripted run against the real controller: a work order for a never-seen client minted WTCM-C0022 + WTCM-P0017 and created both records; a second record for the same client reused the same project rather than opening another; a placeholder name minted nothing. All fixtures cleaned up.
- Verification: backend require-checks + restart OK (/api/health 200); admin `npm run build` passed. LIVE UI QA STILL NOT RUN — admin session expired; I do not authenticate on the user's behalf.
- Handoff: the resolver covers the water-tank module only. Other modules (property care, short stay, sales, tenancy) still mint codes in their own controllers — worth generalising the same pattern if blank-linkage bugs show up there. Backend 50001 / admin 3005. Nothing committed.

---

## Working Conventions — Water Tank Module (read before touching it)

Written 2026-08-10 by Claude Code (Opus 5) after building the module end to end:
SOP-01 (client management), SOP-02 (provider management), and the operational
chain enquiry → request → assessment → quotation → agreement → work order → invoice.

These are not preferences. They are the patterns the module is already built on;
breaking one will make your screen inconsistent with the other fifteen.

### 1. Screen architecture — register / detail / edit

Every entity follows the same three-route shape. Do not put a detail panel on a
list screen — that pattern was deliberately removed from Site Assessments and
Quotations because it made the register unreadable.

    /water-tank/<entity>              register: KPI cards + list ONLY
    /water-tank/<entity>/new          create: full-page step-by-step wizard
    /water-tank/<entity>/:code        detail: its own route, dedicated dashboard
    /water-tank/<entity>/:code/edit   edit: its own route, step-by-step

- Registers: 4 computed KPI cards, status tabs with counts, search, inline status
  change, a RowActions menu, and a chevron affordance on each row.
- Detail screens: status strip first, then a left rail of facts and a body of
  sections. Anything actionable is an action, not a read-only display.
- Wizards use wt-wizard / wt-wizrail / wt-wizpane and **save on every step**, so a
  half-finished record is never lost.
- Cross-screen deep links use ?focus=CODE; useFocusedRecord() handles it.

### 2. Never leave a control that does nothing

The first pass over this module found dead buttons on nearly every screen — Send
Quote, Accept Contract, Mark Completed, Urgent Dispatch, Edit Client Info. If you
render a control, wire it. If the action is not built yet, do not render it.

### 3. Never display a number you did not compute

Every figure must come from records on file. The original screens carried
hardcoded values presented as live data (BDT 1,450,000 outstanding, "98.2% SLA",
"28 providers") — all removed. Show an em dash and an honest empty state rather
than a plausible-looking invention.

### 4. SOP rules are enforced server-side, not suggested

Two gates matter, and both **refuse with HTTP 400** rather than warning:

- **Sec. 6 Step 4** — a provider cannot be assigned client work without
  status = Approved AND agreement_status = Signed.
  See waterTankWorkOrder.controller.assign and waterTankIntake.controller.requestReference.
- **Sec. 7 Step 6** — a client cannot move to Provider Assignment or Service
  Delivery without a signed Customer Service Agreement.
  See waterTankClients.controller.setStage.

When blocking, return { error, blocking: [...] } so the UI can print the clause.
Users learn the procedure from the tool.

### 5. Identifiers are minted centrally, never typed

services/wtIdentity.service.js owns every code (13 entities) and all linkage.
attachIdentifiers() runs on the generic create and update, so a record from any
screen gets its Client ID and Project ID — creating the client and project if it
is the first record naming them. It only ever fills blanks, never overwrites.

- Do not mint codes inside a controller. Add the entity to CODES instead.
- Do not render an ID as an editable input. Use the read-only wt-idchip pattern.
- Placeholder names (unknown, n/a, test, tbd) mint nothing on purpose, so real
  data gaps stay visible instead of being hidden behind a fake client.

### 6. Derived state beats stored state

Work-order progress is computed from the record — provider set means assigned,
accepted_at means accepted, status Completed means work_done — and stages/progress
are stripped from PATCH bodies. The bar therefore cannot disagree with reality.
Apply the same thinking anywhere a summary could drift from its source.

### 7. Shared toolkit — extend it, do not fork it

screens/watertank/common.jsx holds the kit: WtHead, WtTabs, StatCards,
RecordDrawer, AdvanceDrawer, StatusCell, RowActions, EmptyState, DatePicker,
useCollection, useCatalog, useFocusedRecord, toast, parseJson, bdt, dateFmt.

- Every type:'date' field renders the calendar DatePicker. Never a native date input.
- Comments are entity-addressed: <RecordComments entityType="..." entityId={...} />,
  backed by wt_record_comments. The allow-list already covers work-orders,
  invoices and complaints — those screens just need the component dropped in.
- Styling lives in styles/wt-scope.css, scoped under .wt-scope. Do not import
  pm-scope classes; they use different CSS variables and will render unstyled.

### 8. Documents and email pull branding from Settings

services/wtBranding.service.js is the single source for brand and contact details.
The server renders the branded HTML; the browser turns it into the PDF (html2pdf),
so the emailed attachment is byte-identical to the download and there is no second
renderer to maintain. Never hardcode a phone number, address or logo into a document.

### 9. Express route ordering

Fixed paths must be declared before /:entity/:id families or they get swallowed.
See routes/waterTankOps.routes.js for the pattern. The quotation send route needs
its own express.json({ limit: '25mb' }) because the PDF arrives base64 and the
global limit is 2 MB.

### 10. Verification discipline — the important one

A passing build proves nothing about behaviour. For anything with logic:

- Write a throwaway script that calls the **real controllers** and walks the whole
  chain, asserting the numbers. Genuine bugs were caught only this way: a provider
  allocation fee that never reached the agreement (quote said 5,145, agreement said
  4,305), and a code allocator that handed every row in a batch the same code.
- **Create your own fixtures and delete them afterwards.** I twice ran write tests
  against live seeded data and had to restore Q-1049 from the seed file. Do not
  repeat that mistake.
- A --dry flag must be genuinely read-only. Mine was not: it skipped the row update
  but not the client/project creation inside the resolver, so a "dry run" wrote 14
  clients and 12 projects before I noticed. Thread the flag all the way down.
- admin-portal has **no ESLint config** — npx eslint fails outright. Adding one
  (eslint.config.js + eslint-plugin-react-hooks) is genuinely worth doing. Until
  then check imports by hand; ~20 dead ones have been removed so far.
- Backend needs a restart for route/model changes (node server.js, no nodemon).
  Admin on 3005 is Vite dev with HMR. Health check: /api/health.

### 11. Report honestly

Say what you verified and what you did not. **Live UI click-through has never been
run on any of this work** — the admin session expires and an agent should not
authenticate on the user's behalf. Every entry above says so plainly. Do the same:
if you did not click it, do not claim it works.

### Outstanding items the next agent should know

- **0 of 4 providers are assignable** — two lack a signed master agreement, one is
  Pending, one Conditional. This blocks assignment on 5 work orders. Not a bug: the
  gate is working. Record the agreements on each provider file to unblock.
- **Settings are half-empty** — CONTACT_PHONE_PRIMARY, CONTACT_ADDRESS,
  BRAND_LOGO_URL and the COMPANY_* keys are blank, so quotation PDFs and emails
  print only an email address. SMTP_PASS is unset, so no email will actually send.
- **The public website form is not built.** The endpoints are ready and price-free:
  GET /api/public/water-tank/services, POST /api/public/water-tank/enquiry.
- **WO-0486 keeps a blank Client ID deliberately** — its client name is the literal
  string "Unknown client" from an earlier import.
- Not built: provider self-service portal, client portal, signature pad, auto-tick
  of the work-order "invoiced" stage, notifications to providers on assignment,
  business-day calculation for the Sec. 11 one-business-day acknowledgement SLA.

### Reusing this pattern for the other service lines

Water Tank is the reference implementation for the other six service lines (Air
Conditioning, Interior Design, Removal, Solar & Energy, Property Care & Concierge,
Doc Verification). The console shell, the register/detail/edit shape, the identity
service, the SOP-gate approach and the branded-document pipeline are all designed
to be copied with the vertical key, nav and accent colour swapped. Do that rather
than inventing a second pattern.

### 2026-08-10 00:29 | OpenCode (GPT-5.6) | STARTED | Dynamic Water Tank provider onboarding and commercial agreements
- Request: Professionally redesign the Water Tank providers area; move onboarding to dedicated step-by-step routes; implement hybrid staff/provider onboarding; make the full 63-clause Provider Master Agreement plus agreed rates canonical; support draft/edit/review/two-party signing; and automatically calculate provider work-order fees and payouts from signed terms.
- Scope: Water Tank provider models/migration/controllers/routes, provider agreement renderer and signing completion automation, work-order fee provenance, admin provider directory/detail/onboarding/agreement screens and Water Tank navigation/styles. Existing uncommitted Water Tank and unrelated concurrent changes will be preserved.
- Changes: None yet.
- Verification: Read the complete shared log and Water Tank conventions; inspected the current worktree, provider UI/API/schema, agreement variants, signing automation, work-order assignment and payment flow; user selected the 63-clause agreement with rates, hybrid onboarding, and gross-rate less commission payout calculation.
- Handoff: Worktree is heavily uncommitted and the whole Water Tank module is currently untracked. Build against the existing register/detail/edit conventions, use wt-scope, branch scope and whitelisted writes, and do not claim or revert other contributors' files.


### 2026-08-10 01:27 | OpenCode (GPT-5.6) | COMPLETED | Dynamic Water Tank provider onboarding and commercial agreements
- Request: Professionally redesign the Water Tank providers area; move onboarding to dedicated step-by-step routes; implement hybrid staff/provider onboarding; make the full 63-clause Provider Master Agreement plus agreed rates canonical; support draft/edit/review/two-party signing; and automatically calculate provider work-order fees and payouts from signed terms.
- Backend completed: migration 0075 adds versioned provider agreements/rates, hybrid onboarding state and tokens, active-agreement linkage, and immutable work-order commercial snapshots. Added canonical agreement rendering, persistent draft/edit/send/detail APIs, ordered provider then Seventh Sky signing, completion activation/supersession, private provider document intake, approval gates, agreement-rate matching, authorised overrides, commission deduction, and signed-trigger payout eligibility.
- Frontend completed: dedicated staff onboarding wizard, public token onboarding flow, provider agreement register/new/detail/edit routes, provider dashboard commercial state, work-order fee provenance and override controls, payment eligibility/blocked queues, and Water Tank navigation/route/style integration.
- Decisions: the 63-clause agreement plus Schedule F is canonical; staff starts and provider completes onboarding; provider signs first and Seventh Sky countersigns; work-order gross is agreed rate x quantity, agreement commission is deducted, and the resulting net is the provider payout; rates do not activate before both signatures complete.
- Defects found and fixed during live verification: WtProviderAgreement/WtProviderAgreementRate now map Sequelize timestamps to migration columns created_at/updated_at; active-agreement date selection now uses the configured Asia/Dhaka process date instead of UTC, preventing today's agreement from being rejected between local midnight and 06:00.
- Files changed for this task: backend/migrations/0075-water-tank-provider-commercials.js; backend/models/waterTankProviders.js; backend/models/waterTankOps.js; backend/controllers/wtAgreements.controller.js; backend/controllers/publicWaterTankProvider.controller.js; backend/controllers/waterTankProviders.controller.js; backend/controllers/waterTankWorkOrder.controller.js; backend/controllers/waterTankOps.controller.js; backend/controllers/signing.controller.js; backend/services/wtProviderAgreement.service.js; backend/services/wtProviderCommercial.service.js; backend/services/partyRoleActivation.service.js; backend/routes/wtAgreements.routes.js; backend/routes/publicWaterTankProvider.routes.js; backend/routes/waterTankProviders.routes.js; backend/routes/manifest.js; backend/scripts/seedProviderAgreement.js; admin-portal/src/App.jsx; admin-portal/src/screens/WaterTankProviderOnboard.jsx; admin-portal/src/screens/WtProviderAgreements.jsx; admin-portal/src/screens/watertank/providers/ProviderOnboarding.jsx; admin-portal/src/screens/watertank/providers/ProviderDirectory.jsx; admin-portal/src/screens/watertank/providers/ProviderDetail.jsx; admin-portal/src/screens/watertank/WorkOrderDetail.jsx; admin-portal/src/screens/watertank/Payments.jsx; admin-portal/src/screens/watertank/common.jsx; admin-portal/src/styles/wt-scope.css; generated admin-portal/dist assets. Unrelated concurrent changes were not modified or reverted.
- Verification: npm run db:migrate applied 0075; npm run db:migrate:status reports 0075 up; backend node --check passed for all changed models/controllers/services; git diff --check passed (line-ending warnings only); admin npm run build passed (1,962 modules, existing >1000 kB chunk warning only); backend restarted on 50001 with /api/health 200 and all relevant routes mounted.
- Live HTTP verification: authenticated as the supplied test admin, created a disposable hybrid provider application, resolved the public invite, submitted onboarding, verified all compliance/insurance/payment/territory/capability gates, rendered a draft containing Clause 63 and Schedule F, completed the ordered provider and staff signatures, activated and approved the provider, assigned a coded work order at gross 2,000 / commission 10% = 200 / net 1,800, confirmed payout blocked before completion verification and payable at 1,800 after verification. Every provider/document/event/agreement/rate/envelope/field/work-order fixture was deleted after each run.
- UI verification limitation: the production Vite build passed, but automated click-through was not run because the installed gstack browse executable is incomplete and fails before launch with "Cannot find server.ts". No UI runtime success is claimed. The temporary verification backend was stopped after testing.
- Handoff: Existing provider records still need real agreements and onboarding evidence before they become assignable. Browser click-through remains a useful manual follow-up; no functional backend item from this request remains open. Nothing committed.

### 2026-08-10 | Claude (Opus 5) | COMPLETED | Provider operations console redesign + review of the OpenCode provider work
- Request: (1) redesign the providers dashboard professionally; (2) step-by-step
  onboarding on its own route with commercial terms drafted from the master
  agreement; (3) sign + edit agreements at /agreements/water-tank-provider;
  (4) provider fees set automatically from the agreement; (5) add further
  relevant features. Plus: review the preceding OpenCode work and fix its errors.

- **Review of the OpenCode (GPT-5.6) work — verdict: sound.** I ran a functional
  test of the whole commercial chain against the live database (fixture provider →
  agreement + rate → activation → work-order fee calculation, all fixtures purged
  afterwards). Results: gross 6,000 = agreed 3,000 x qty 2; commission 600 at 10%;
  net 5,400 — matches. An unpriced line is refused with UNMATCHED_RATES rather than
  silently costed at zero. A future-dated agreement is correctly not active. Their
  Sec. 6 Step 4 assignment gate is stricter than my original (it also requires
  compliance and insurance evidence), which is the right call. Migration 0075 is
  `up`, all changed files pass `node --check`, both new tables exist, and the
  63-clause template resolves with 47 template fields and a 41-item rate catalogue.
  **Two apparent failures in my first test run were my own test's fault, not theirs**
  (I guessed the fee field names and omitted a required fixture column). No defect
  was found in wtProviderCommercial.service.js or the activation chain.

- **One genuine defect found and fixed:** the agreement detail's "Amend or renew"
  button navigated with `?supersedes=<id>`, but the builder never read that query
  parameter, so a renewal was saved with `supersedes_id: null` and the agreement it
  replaced would never have been marked Superseded on completion. The backend had
  always accepted the field. Fixed in WtProviderAgreements.jsx (query param read
  into the payload) with a note in the builder explaining the switchover.

- **Backend — directory now carries commercial state** (waterTankProviders.controller.js).
  The dashboard could not answer "why can this provider not be priced?" because the
  endpoint returned no agreement data. Each row now also returns the live agreement
  (code, version, commission %, payout trigger, expiry, days left, expiring/expired
  flags), the draft agreement if one is in flight, the count of approved rate lines,
  and earned/paid/owed money derived from that provider's work orders. The summary
  gained with_agreement, without_agreement, agreements_in_draft, agreements_expiring,
  priced_services, avg_commission, earned_total and owed_total. All computed — none
  of it stored, so it cannot drift.

- **Frontend — ProviderDirectory.jsx rebuilt as an operations console.** The screen
  now answers three questions: who is assignable today, where the commercial
  paperwork is stuck, and what breaks if ignored this week. Five-up command strip
  (assignable / onboarding / commercial cover / compliance / payable to providers);
  the Sec. 4 pipeline kept; then a roster beside a sticky attention rail. The rail
  derives seven lenses from live rows — ready to approve, no signed agreement,
  agreement without rates, approved but blocked, documents expired, audit overdue,
  agreement expiring — each showing its SOP reason and filtering the roster in place
  (with a bar explaining why the roster is narrowed). Readiness is an SVG donut
  coloured by actual assignability rather than a flat bar. New commercial column
  states plainly when fees cannot be calculated. Added a table/card view switch
  (persisted), five sort orders, search across coverage areas and agreement codes,
  and a direct link to the master agreement register. Zero hardcoded figures.

- Styles: ~55 lines appended to wt-scope.css, all under `.wt-scope` — five-up KPI
  grid, readiness ring, lens list and lens bar, provider cards, sort/view controls,
  and a stacked variant of the watchtower for the narrow rail. Three breakpoints.

- Verification: enriched directory endpoint returns 200 with the new fields
  populated against real data (5 providers, ৳23,000 owed across two of them);
  `vite build` passes; backend restarts with /api/health 200; no unused imports.
  **Automated UI click-through was not run** — no runtime UI success is claimed.

- **Data state the next agent must know:** there are still **zero provider
  agreements**, so all five providers show "No agreement — fees cannot be
  calculated" and none is assignable. This is empty data, not a bug: the template,
  catalogue, builder, signing chain and fee engine are all in place and verified.
  The gap closes the moment someone drafts and signs one agreement through
  /agreements/water-tank-provider/new. SP-0021 ("tt 22 tyr") looks like a user test
  record and already carries 6 proposed rates. Settings contact fields and SMTP_PASS
  remain unset, so agreements and quotations still cannot actually email.
- Structural fix: the OpenCode STARTED entry had been inserted inside the Working
  Conventions section, splitting "Reusing this pattern for the other service lines"
  away from it. Section restored above both OpenCode entries. Append at the end of
  this file, not into an existing section.
- Nothing committed.

### 2026-08-10 | Claude (Opus 5) | COMPLETED | Fix: provider edit route crashed on null columns
- Reported: /water-tank/providers/SP-0019/edit threw "Cannot read properties of
  null (reading 'trim')" and rendered nothing.
- Cause: ProviderOnboarding.jsx hydrated the wizard with `{ ...blank, ...row }`.
  Unset DB columns come back as `null`, so the spread overwrote the `''` defaults
  with null — SP-0019 has 34 null columns including contact_email. `valid()` then
  called `.trim()` on null at step 0 and the screen died. The same nulls would also
  have turned every affected input into an uncontrolled one.
- Fix: hydrate() now coerces every null in the merged object back to its blank
  default, and valid() uses a null-safe `filled()` helper instead of bare `.trim()`.
- Checked the sibling wizards for the same class of bug — AssessmentForm,
  WorkOrderForm, ServiceRequestNew and ClientCreate all hydrate field-by-field with
  `|| ''` and are safe. ProviderOnboarding was the only one affected.
- Verification: `vite build` passes; loaded the edit route in Chrome — the six-step
  wizard renders at "Continue Dhaka Clean Water Group Onboarding" with a clean
  console (only the pre-existing React Router v7 future-flag warnings). Also loaded
  the redesigned /water-tank/providers console in the browser: KPIs, Sec. 4
  pipeline, roster, attention rail and watchtower all render against live data
  (5 providers, ৳23,000 payable, 5 without an agreement, 2 approved-but-blocked).
- Convention for the next agent: never hydrate a form by spreading a DB row over
  defaults. Map fields explicitly with `|| ''`, or normalise nulls after merging.
- Nothing committed.

### 2026-08-10 | Claude (Opus 5) | COMPLETED | Provider master agreement now uses the house document design
- Reported: the provider agreement at /agreements/water-tank-provider/WTPA-000001
  did not look like the other agreements (customer service, property management,
  tenancy) as seen on the /admin/sign/<token> page.
- Cause: every other agreement renderer (rprmAgreement, rptmAgreement, stsAgreement,
  wtCustomerAgreement) builds a proper deed — Georgia serif shell, double-ruled
  letterhead, document number line, two-column table of contents, footer.
  wtProviderAgreement.service.js instead returned the seeded Word template's raw
  content_html with merge values substituted and no shell at all, so it rendered as
  unstyled sans-serif h1/h3/p.
- Fix (backend/services/wtProviderAgreement.service.js): added decorate(), which
  drops the template's own centred <h1>, anchors each of the 69 clause and schedule
  headings as #cl-N, styles them to the house 15px/#003768, gives unstyled <p>/<ul>/
  <li> their margins, builds the two-column linked table of contents, and wraps the
  whole thing in the same Georgia shell and letterhead the other agreements use
  ("Seventh Sky Property Care" / cyan WATER TANK CLEANING & MAINTENANCE eyebrow /
  MASTER SERVICE DELIVERY PROVIDER AGREEMENT / Document No · Version · Effective
  Date) with the standard e-signing footer.
- Second defect fixed in the same file: the template prints its own
  "Schedule F – Agreed Provider Rate Schedule" heading immediately above the
  {{provider_rate_schedule}} placeholder, but scheduleB() injected a second heading
  reading "SCHEDULE B — Agreed Service Price Schedule". The document therefore showed
  two headings with different letters over one table. scheduleB() now takes a
  withHeading flag and emits the table alone when the template supplies the heading;
  the fallback path is relabelled Schedule F to match.
- Also: doc_no was the raw upload filename ("Water Tank CM - Service Provider Master
  Agreement - V0.1.docx"). Now SSPC-WTCM-SDPMA-01, matching SS-WTCM-CSA-01 and
  SSPC-RPRMS-01, and the title is "Master Service Delivery Provider Agreement".
- Note for the next agent: detailAgreement serves `envelope.document_html` when an
  envelope exists, so agreements already sent keep the design they were sent with.
  That is correct — a document a signer has already been shown must not restyle
  itself. WTPA-000001 still displays the old layout for that reason; void and
  reissue it to pick up the new one. Drafts and all new sends use the new design.
- Verification: node --check passes; rendered the agreement through buildAgreement —
  Georgia shell, letterhead, 69 TOC entries all anchored to 69 matching headings, no
  leftover <h1>, no duplicate SCHEDULE B heading, no unmerged {{placeholders}}.
  Confirmed in Chrome on the builder's Review step: letterhead, table of contents and
  clause typography all render as intended. One flaw caught in the browser and fixed
  — TOC labels were double-escaped ("Client Claims &amp; Complaints") because the
  heading text is already HTML-escaped in the template; removed the second esc().
- Nothing committed.

### 2026-08-10 | Claude (Opus 5) | COMPLETED | Project Work Order (SSPC-WTCM-PWO-01) — signed, priced, automated
- Request: assigning a provider to a work order must require signing the work order
  agreement; quotation pricing reflects into it and stays editable; both parties
  sign and the provider is onboarded to the project; input fields to follow the
  source document; after signing, email the client with the scheduled provider's
  name and contact details, and send the provider a branded work order PDF plus a
  PDF of the signed agreement. Source: "Water Tank CM - Project Work Order V0.2".
- Migration 0076 adds the ten sections to wt_work_orders: project information,
  client details, the eight service checkbox families, tank details, deliverables,
  materials/chemicals/equipment, timeline (incl. AMC dates), material and labour
  lines, cost summary, payment schedule, payment method, warranty periods, project
  checklist, plus the two-party signing columns (wo_envelope_id, wo_doc_status,
  wo_sent_at, wo_signed_at, wo_signed_document_html, provider_onboarded_at,
  client_notified_at). Fields registered on the WtWorkOrder model.
- services/wtWorkOrderDoc.service.js renders all ten sections in the house deed
  design (Georgia shell, double-ruled letterhead, linked TOC, e-signing footer) —
  the same design as the customer and provider agreements. computeTotals() derives
  every figure in Section 8D from the line tables so the summary can never disagree
  with the schedule above it; only the adjustment rows are operator-entered.
  computePaymentSchedule() derives 8E amounts from the total so percentages always
  reconcile. hydrateFromQuotation() copies the priced selections across but only
  fills blanks — the agreed price may legitimately differ from the quoted price
  (Pricing Note 2), so an operator's edits are never overwritten unless they ask.
- services/wtWorkOrderPdf.service.js draws both PDFs with pdfkit (no browser is
  available in the signing callback): the branded Project Work Order with all ten
  sections, drawn checkboxes and bordered tables, and a certificate of execution
  listing every signatory with signed timestamps.
- Controller: document, saveDocument, syncQuotation, documentPdf, sendDocument,
  voidDocument, documentReference. sendDocument creates a two-signer envelope
  (provider order 1 — signing IS their acceptance — Seventh Sky countersigns),
  related_type 'water_tank_work_order', and refuses with a blocking list when
  Section 8 has no value, the provider has no email, or the client is unnamed.
  Editing is refused once the document is out for signature or executed.
  assign() now seeds the document from the source quotation on first assignment.
- Completion hook in partyRoleActivation.service.js: freezes the executed HTML as
  the legal record, sets wo_signed_at/provider_onboarded_at, advances the work
  order to Accepted, writes a provider event, then queues post-commit notifications.
  Added a `deferred` queue so email and PDF work runs AFTER the transaction commits —
  a slow SMTP server must not hold the signing transaction open and a failed send
  must never roll back a completed signature.
- notifyWorkOrderExecuted(): emails the client a branded confirmation naming the
  provider, their contact person, phone, email and the scheduled date (plus a warning
  to refuse anyone else on site), and emails the provider the branded work order PDF
  and the execution certificate PDF as attachments. Each recipient is guarded
  separately. Contact details come from Settings via wtBranding.
- Frontend: screens/watertank/WorkOrderDocument.jsx at
  /water-tank/work-orders/:code/document — seven steps across the ten sections,
  editable line tables for services/materials/labour/payment stages, catalogue
  search to add priced lines, live totals mirroring the server calculation exactly,
  derived rows visibly marked "from the lines above", signature progress with
  per-signer copy-link, withdraw, PDF download, and a lock banner once issued.
  Entry point added to the work order detail header.
- Verification: migration applied; all new modules pass node --check and load;
  functional test of the calculation chain — services 6,400 + materials 1,950 +
  labour 2,800 + transport 500 + VAT 320 = 11,970 TOTAL matched exactly, the 30/40/30
  payment schedule reconciled to the total, all ten sections anchored, checkboxes
  rendered; both PDFs generated as valid %PDF- buffers (13,606 and 3,554 bytes).
  Backend restarts with /api/health 200 and the new routes mounted (401 without a
  token). vite build passes. Confirmed in Chrome on WO-0499: the wizard, the pricing
  step with schedules A–E, and the issue step with the document preview all render,
  console clean.
- Not verified end to end: an actual signature completing and the two emails going
  out — SMTP_PASS is still unset, so no mail can leave this environment. The code
  path is exercised only as far as envelope creation.
- Nothing committed.

---

## STARTED — Water Tank PROJECTS module rebuild (Projects is the last un-upgraded console screen)
Date: 2026-08-12

Scope requested by the user:
- Step-by-step project entry on its own route (same pattern as service-requests/new
  and site-assessments/new), auto-generated project ID.
- Assign a property from the DB or create one and assign it; assign a client from
  the DB or create one (surfacing the customer service agreement link).
- Ask at entry whether a quotation or a site assessment is needed; the service
  request is raised automatically when a project is created directly.
- Per-project dashboard: KPI cards, better visualisation, finishing polish.
- Show AMC linkage when the project sits under an AMC contract.
- Billing tab gains a Disbursements section; all project-related detail lives here.
- Follow SSPC-WTCM-SOP-01 (Client / End User Management) for the lifecycle.

Files I am claiming (all NEW except the two Projects screens + route/nav wiring):
  backend/migrations/0077-water-tank-projects.js          (NEW)
  backend/services/wtProject.service.js                   (NEW)
  backend/controllers/waterTankProject.controller.js      (NEW)
  backend/routes/waterTankProject.routes.js               (NEW)
  backend/models/waterTankOps.js                          (append fields to WtProject + new WtProjectDisbursement)
  backend/server.js                                       (one mount line)
  admin-portal/src/screens/watertank/ProjectForm.jsx      (NEW)
  admin-portal/src/screens/watertank/ProjectDetail.jsx    (NEW — split out of Projects.jsx)
  admin-portal/src/screens/watertank/Projects.jsx         (rewrite of the index)
  admin-portal/src/App.jsx                                (routes only)
  admin-portal/src/styles/wt-scope.css                    (append-only new classes)
Not touching work orders, quotations, assessments, payments or providers.

---

## COMPLETED — Water Tank PROJECTS module rebuild
Date: 2026-08-12

Projects was the last console screen still on its original Figma stub (flat table,
quick-edit drawer, 7-label stepper over a table holding only name/client/provider/
two dates/three JSON blobs). SOP-01 Sec. 4 makes the project the spine of the
operation, so it has been rebuilt as a real file.

- Migration 0077 extends wt_projects with client linkage, customer-agreement
  state, site linkage into the SHARED properties register, scope + tank detail,
  the upstream chain (enquiry/request/assessment/quotation/work order), AMC
  linkage, delivery, commercials and Sec. 12 closure evidence; widens stage to
  STRING(60); adds wt_project_disbursements. Verified reversible: db:migrate ->
  db:migrate:undo -> db:migrate all clean.
- Lifecycle is now the ELEVEN SOP-01 Sec. 4 stages, not the seven the Figma frame
  showed. LEGACY_STAGE_MAP folds the old labels forward on read (Lead -> Lead
  Enquiry, Delivery -> Service Delivery, ...) so existing rows keep working.
  Verified in node.
- services/wtProject.service.js owns the logic: STAGES (with the SOP reference and
  the precondition each stage carries), nextProjectCode (mirrors the generator in
  waterTankClients.controller.js registerProject so the two paths cannot collide),
  createProject, projectDossier, computeFinancials, buildDisbursementLedger,
  stageWarning, advanceStage.
- createProject runs in ONE transaction: resolve-or-create the water-tank client,
  resolve-or-create the property in the shared properties register (same approach
  as shortTermStay.service.js, using generateCode(Property,...,'SSPC-PR-')), create
  the project, then ALWAYS raise the service request (Sec. 5 Step 1 puts it at the
  head of the chain, so a project created directly still gets one) and a site
  assessment when the operator chose 'assessment first'.
- Money is DERIVED on every read, never stored on the project row: contract value,
  invoiced, collected, receivable, provider committed/paid, register paid/pending,
  disbursed, committed cost, gross margin, net position. Same discipline as
  wtWorkOrderDoc.service.js computeTotals(). Verified by a functional test of the
  whole chain — invoiced 50,000 / collected 35,000 / receivable 15,000 / provider
  paid 22,000 / register paid 3,000 / disbursed 25,000 / committed 32,000 / gross
  margin 18,000 / net position 10,000 — all eleven assertions passed.
- DISBURSEMENTS: wt_project_disbursements holds what Seventh Sky spends on a job
  (materials, transport, lab testing, government fees, equipment hire,
  reimbursements). Provider payouts are NOT duplicated — they live on
  wt_work_orders (migration 0066, owned by the Payments screen) and are synthesised
  into the ledger as read-only rows so the Billing tab shows the complete outflow
  without touching another agent's data. Only 'Paid' rows count as disbursed;
  requested/approved are reported separately so nothing is double-counted as spent.
- Stage gates are ADVISORY: entering a stage whose SOP precondition is unmet
  (e.g. Service Delivery before the agreement is signed, Sec. 7 Step 6) returns 409
  with requires_acknowledgement; the UI confirms and re-posts with acknowledge:true.
  Ops must be able to record what actually happened.
- API /api/wt-projects: reference, overview, client-lookup, property-lookup, list,
  create, dossier, patch, delete, stage, closure, and the disbursement register.
  Mounted in server.js; confirmed in the mount list, 401 without a token.
- Frontend: ProjectForm.jsx (NEW, 6-step wizard at /water-tank/projects/new using
  the existing wt-wizard chrome — Client / Property & site / Scope / Origin & AMC /
  Delivery / Review, with the reserved project ID shown on the rail and an explicit
  'records created on save' list), ProjectDetail.jsx (NEW, split out of Projects.jsx
  — KPI row with a progress ring, AMC ribbon, 11-stage rail, and Overview /
  Timeline / Work Orders / Billing / Documents / Closure tabs), Projects.jsx
  (rewritten index with server-side rollups, KPI cards and stage/AMC filters).
- wt-scope.css: APPEND ONLY, 143 new lines, every selector prefixed .wt-scope.
  Renamed my .wt-reviewgrid -> .wt-revgrid and .wt-ring -> .wt-pring after finding
  another agent had already defined both with a different markup contract.
  Brace balance verified (753/753).
- Verification done: migration up/down/up; node --check + module load on all new
  backend files; backend restarts with /api/health 200 and /api/wt-projects
  mounted; financial chain functionally tested; vite build passes clean.
- NOT yet verified: the browser end-to-end pass (both wizard paths, stage warning,
  disbursement maths on screen, AMC ribbon). The admin session had expired when I
  reached that step and I did not sign in on the user's behalf. Everything else
  above is verified.
- Nothing committed.

---

## COMPLETED â€” Project data now flows into the quotation and the Customer Service Agreement
Date: 2026-08-12

User report: everything entered while creating a project failed to appear on the
Customer Service Agreement; selected services were not ticked on the agreement;
the advance payment appeared nowhere; and Schedule B asked the operator to type
Work Order No. and Quotation No. by hand even though both are system generated.

Four separate breaks, all real:

1. SCHEDULE A NEVER TICKED. Schedule A ticks a fixed legal taxonomy of service
   NAMES; Schedule C prices catalogue CODES. The two vocabularies do not match â€”
   "Residential Water Tank Cleaning (1,001-2,500L)" in the catalogue vs
   "Residential Water Tank Cleaning" in Schedule A â€” and nothing joined them. So
   pricing services left every Schedule A box empty, and Clause 3 ("only the
   services selected in Schedule A form part of this Agreement") excluded the very
   work being billed. Added CODE_TO_SCHEDULE_A (28 WTC codes; one code may tick
   more than one box) plus scheduleAFromCodes(). buildAgreement() now folds the
   priced lines into the tick set automatically. MAT-* and LAB-* deliberately tick
   nothing â€” they are priced but are not services in their own right.

2. ADVANCE PAYMENT WAS A SENTENCE, NOT A FIGURE. The quotation held payment_terms
   as free text ("50% advance, balance on completion"), which cannot be computed
   from, so the agreement hardcoded a 40/30/30 schedule and the two documents
   could state different numbers for the same job. Migration 0078 adds
   advance_percent, advance_amount and advance_basis to wt_quotations.
   computePricing() now accepts advance_amount OR advance_percent, caps it at the
   contract value, derives the other figure, and builds a two-stage schedule from
   it. With nothing supplied the legacy 40/30/30 still applies and now REPORTS its
   own advance, so both documents agree either way. The balance is never stored â€”
   it is total minus advance. Advance and balance render in Schedule B, in
   Schedule C, on the quotation HTML and in the quotation cost summary.

3. THE PROJECT FED NOTHING. The agreement wizard started blank. Added
   agreementDraft() and quotationDraft() to wtProject.service.js, exposed as
   GET /api/wt-projects/:code/agreement-draft and /quotation-draft. The draft
   carries client, site, tanks, water source, scope, materials, provider, site
   contact, access notes, dates, AMC, warranty, the priced service lines, the
   Schedule A ticks those lines imply, and the advance derived from the project
   deposit. The agreement wizard accepts ?project=CODE, hydrates from it, and
   shows a banner naming the source project. POST /:code/link-agreement writes the
   envelope reference back onto the project so the chain is traceable both ways.

4. SYSTEM-GENERATED NUMBERS WERE TYPED BY HAND. Schedule B now renders Project
   No., Work Order No. and Quotation No. from the linked records, and the wizard
   shows them as read-only fields â€” with "Not yet issued" when the record does not
   exist yet â€” instead of free-text inputs. Schedule B was also expanded to every
   item Clause 4 (PROJECT DETAILS) actually requires: property address and type,
   water source, materials, provider, site contact, access requirements, agreed
   price, advance, AMC contract/package/frequency. The wizard step now groups
   these into four sections instead of one flat grid.

Also: the existing quotation-to-agreement handoff now carries the advance and the
Schedule B references, so that path gets the same fix.

Verified â€” 22 assertions in a functional test of the whole chain: Schedule A ticks
correct with no spurious ticks; all eight Schedule B references present in the
rendered HTML; advance plus balance reconcile exactly to the total; the payment
schedule sums to the total; advance rendered in both Schedule B and Schedule C;
Schedule C still prices ONLY the selected lines. Advance maths separately checked
for the amount form, the percent form, the legacy fallback and the over-cap guard.
Migration 0078 applied. node --check on all six changed backend files. Backend
restarts clean with the new endpoints 401 without a token. vite build passes.
(The MODULE_NOT_FOUND lines in the boot log are pre-existing legacy LMS routes â€”
Student, Batch, Enrollment â€” nothing to do with this work.)

NOT verified: the browser pass. The admin session had expired and I did not sign
in on the user's behalf.

Files touched (all Water Tank; no sibling module edited):
  backend/migrations/0078-water-tank-quotation-advance.js   (NEW)
  backend/services/wtCustomerAgreement.service.js
  backend/services/wtProject.service.js
  backend/controllers/waterTankProject.controller.js
  backend/controllers/waterTankQuotation.controller.js
  backend/routes/waterTankProject.routes.js
  backend/models/waterTankOps.js
  admin-portal/src/screens/WtCustomerAgreements.jsx
  admin-portal/src/screens/watertank/QuotationBuilder.jsx
  admin-portal/src/screens/watertank/ProjectDetail.jsx

Nothing committed.


---

## FIX — advance percentage is operator-set, not fixed at 40%
Date: 2026-08-12

User: "Advance payable on acceptance (40% of contract price) this should be
editable not fixed value it can be 20/30 or 40 ... user can edit before sending".

- The 40% was the templates fallback leaking into the document text, so it read
  as a house rule. There is no house percentage - 20, 30, 40 and 50 are all
  normal depending on the job.
- New AdvanceEditor component in WtCustomerAgreements.jsx: preset buttons
  (20/25/30/40/50%), a free percent field, a fixed-amount field as an
  alternative, an Apply that re-renders the preview, and a Clear that returns to
  the standard schedule. It shows the exact sentence the agreement will print.
- Placed on BOTH the Pricing step and the Review & send step, because the advance
  is the figure most often adjusted at the last moment and must stay editable
  right up to sending.
- Fixed a self-contradiction found while testing: on the 40/30/30 fallback the
  document printed an advance/balance PAIR (advance 40% / balance 60%) beside a
  THREE-stage schedule that also had a 30% progress payment. Added
  summary.advance_explicit; the advance/balance pair now renders only when an
  advance was actually chosen. Schedule B always states the first payment stage
  (marked "standard schedule" on the fallback) so it can never disagree with the
  Payment Schedule in Schedule C.
- Verified: 15 assertions. Each of 20/25/30/40/50% produces the right advance and
  balance, reconciles to the total, and renders in both Schedule B and Schedule C;
  a fixed amount still derives its own percentage; the fallback keeps three stages
  and prints no contradictory pair; an explicit advance produces a two-stage
  schedule that reconciles. Backend restarted, vite build passes.
- Nothing committed.

---

## FIX — editing a project now uses the same route-based form as entry
Date: 2026-08-12

User: "edit projects currently old modals...should properly edit the project as
how projects entered route basis".

- ProjectDetail had a RecordDrawer quick-edit exposing ~16 flat fields. It could
  not touch the client, the property, the services, the tanks, the AMC link or
  the origin chain - i.e. most of what the entry wizard captures. Editing a
  project was a different, smaller job than creating one.
- ProjectForm.jsx now serves BOTH routes. /water-tank/projects/:code/edit loads
  the project and maps it back into the same six steps. The Edit button on the
  project header routes there; the drawer is deleted.
- Backend: extracted resolveClient() and resolveProperty() out of createProject
  so create and update share one set of rules, then added updateProject() -
  same wizard payload, re-links the client and reassigns or creates the property
  when they change, whitelists the plain fields, recomputes contract_value from
  the service lines, clears the AMC fields when the toggle goes off, and writes a
  timeline entry naming what actually changed.
- controller update() branches: a payload carrying client/property goes through
  updateProject; flat payloads (inline status edits, stage side-effects) keep the
  simple whitelisted path, so nothing else that PATCHes a project breaks.
- Edit mode differences, deliberate: every step is jumpable (the record is
  already valid, so you should not have to walk the wizard to change one field);
  a "Save changes" button appears in the footer from any step; the "what does
  this job need next" routing choice is hidden, because the service request and
  assessment already exist and re-asking would raise duplicates; the review step
  lists what the save CHANGES rather than what it creates; Delete moved onto the
  form with a confirm that states the request and assessment are detached, not
  destroyed.
- Splice note: the createProject body was replaced by the two shared helpers via
  a line-indexed edit (the file has box-drawing characters that defeated string
  matching). Backed up to /tmp/wtProject.bak.js first; verified the file still
  parses, both helpers are used by create, and all three functions export.
- Verified: node --check on both changed backend files, service loads with
  updateProject/resolveClient/resolveProperty exported, backend restarts with
  /api/health 200 and PATCH 401 without a token, vite build passes (1965 modules).
- NOT verified: the browser pass. The admin session is still expired and I did
  not sign in on the user behalf.
- Nothing committed.

---

## FIX — "Create agreement" on the client file now follows the SOP branch
Date: 2026-08-12

User: "create agreement options...this can automatically create qoutation for
records..and accepted showing....ask for site assestement if required then
qoutation after assesment,,auto site assesment generated if not required then
direct qouation generated".

- The client file only had "Record agreement" - a manual drawer that wrote a
  status and a reference onto the client row. It generated nothing, so the
  quotation the agreement is legally built from (Clause 7) never existed.
- The branching logic already existed and was correct: waterTankIntake
  createRequest() raises the service request, then EITHER schedules a site
  assessment (Sec. 6) OR generates the quotation directly (Sec. 7 Step 5). It was
  simply unreachable from the client file. I did not rebuild it.
- ServiceRequestNew now accepts ?client=CODE and ?route=assessment|quotation:
  the client is resolved from the lookup, the search step is skipped, the SOP
  branch is preselected and the wizard lands on the step that needs input.
- Client file gets a primary "Create agreement" button opening a chooser that:
    * shows what is ALREADY in progress first (open assessment, pending
      quotation with an Approve action, approved quotation with Raise agreement)
      so the operator cannot duplicate work they already started;
    * asks "does this job need a site visit first?" - yes routes to the journey
      with the assessment branch, no routes to the direct-quotation branch;
    * once a quotation is APPROVED, collapses to a single "Raise the agreement
      now" action that carries the project through to the prefilled agreement.
- Kept the old drawer, renamed "Record an existing agreement", for one signed on
  paper outside the system. It is no longer the only route.
- Vocabulary correction: I first wrote Accepted/Declined. The quotation register
  uses Pending / Sent / Approved / Rejected, and the SOP gate at Sec. 7 Step 5
  keys off "approved" - the client file now speaks the same vocabulary, so the
  approval it records actually satisfies the gate.
- Also fixed: intake wrote the LEGACY stage labels onto the project spine
  (Assessment / Quotation from the old 7-label Figma stepper). normaliseStage
  papered over it on read; now it writes the real SOP label "Site Assessment".
- Verified: node --check on the intake controller, vite build passes (1965
  modules), backend restarts with /api/health 200. Assessment -> quotation
  continuation already existed on AssessmentDetail ("Build Quotation") so the
  assessment branch completes without new code.
- NOT verified: the browser pass - the admin session is still expired.
- Nothing committed.

---

## FIX — Schedule B inputs on the quotation-agreement screen wrote to a dead shape
Date: 2026-08-12

User (with screenshot): "on agreement window with clients...there is no options
for input for schedule b items....if have some input options but it does not
reflect on the agreement on SCHEDULE B - Project Summary".

Root cause: this is QuotationAgreement.jsx, a DIFFERENT screen from the one I
fixed earlier (WtCustomerAgreements.jsx). Its "Property & Project" card bound to
draft.property.* and draft.project.*, but buildAgreement() reads schedule_b.*.
The whole draft object is posted straight to /preview and /agreements, so the
operator typed into fields the renderer never looked at - no error, the values
just never appeared in the document. The screenshot shows exactly that: address
"assda", type "asds", tank "sadsad", capacity "adsdasd" all filled on the left,
all blank in Schedule B on the right.

Two fixes, both needed:
1. QuotationAgreement.jsx - the card is now "Schedule B - Project Summary" and
   binds to schedule_b.* directly. It also gained the fields Clause 4 requires
   that the screen never had at all: number of tanks, water source, service
   provider, materials & consumables, site contact name/phone, site access
   requirements, estimated completion date, AMC contract/package/frequency,
   warranty period, special conditions. Project No. / Quotation No. / Work Order
   No. render as read-only RefBox fields (system generated).
   On load the draft is normalised onto schedule_b, folding any legacy
   property/project values in so nothing the server already knew is lost.
2. buildAgreement() - defensive fallback. A caller sending the legacy shape used
   to get a silently blank Schedule B; it now folds property/project in wherever
   schedule_b left a gap, with schedule_b taking precedence when both exist.
   This protects any other caller I have not found from the same silent loss.

Verified: 22 assertions. All 15 Schedule B fields render from the modern shape;
all 6 legacy fields still render (no silent loss); schedule_b wins over legacy
when both are present. vite build passes (1965 modules), backend restarts 200.
NOT verified: the browser pass - admin session still expired.
Nothing committed.

---

## FIX — provider agreement dropped 23 of the 47 inputs it offered
Date: 2026-08-12

User: "check every input items showing in the agreements .....properly".

Audited by rendering with every form-exposed field filled with a unique marker
and checking the marker reached the HTML. Result before: 47 fields offered, only
21 rendered.

ROOT CAUSE: in buildAgreement the merge map was
    const values = { ...templateValues, agreement_term: ..., ss_rep_name: ..., }
templateValues (everything typed in step 3, "All legal template inputs") was
spread FIRST, then 23 of those exact keys were overwritten by derived values -
and where the structured source was empty the derived value was the empty
string, so the field rendered as __________ . The operator typed a value and the
document showed a blank line. Affected: agreement term, notice period,
commission, fee notes, all six bank fields, all four Seventh Sky rep fields, all
four provider rep fields, business name, and all four witness fields.

FIX: derived values are now the DEFAULT and templateValues is overlaid on top,
skipping blank/unticked entries so an empty field falls back rather than wiping
the derived default. 44 of 44 slotted fields now render what was typed.

Also fixed: payment_model / payout_trigger / payment_due_days have no
placeholder of their own - they ride inside ss_fee_notes. An operator who
rewrote the fee notes erased them from the document, even though the payout
trigger decides when the provider is legally entitled to be paid. The structured
summary is now always prepended, with the operator wording appended.
Verified: trigger and due days survive an operator override.

MISTAKE MADE AND CORRECTED: I first audited the wrong template. Two provider
templates exist - "Water Tank CM - Service Provider Master Agreement - V0.1"
(the Word import) and "Service Provider Master Agreement" (what getMasterTemplate
actually loads). The first audit reported false gaps. Re-run against the ACTIVE
template. The placeholder mappings added for the Word-import vocabulary
(registered_address / trade_licence_no / company_registration_no) are inert on
the active template but harmless, and correct if that template is ever activated.

OPEN — NEEDS A DECISION, NOT A CODE FIX:
The active template has NO placeholder for the provider legal identity -
registered address, trade licence no, TIN, BIN, company registration no. Those
facts are held on the provider record and never appear in the signed agreement,
which names the business but not the licence or registration it binds. Adding
them means editing the legal template content, so I did not do it silently.

Verified: 47-field audit re-run (44/44 rendered), payment-override test 4/4,
node --check, backend restarts 200. Nothing committed.

---

## FIX — customer agreement now signs with ALL parties; witness + advance inputs added
Date: 2026-08-12

User, on /water-tank/quotations/Q-1052/agreement: no witness detail inputs, no
advance payment input, and asked to check end-to-end signing to all parties with
signature and date fields on Customer, Seventh Sky and Witness.

BIGGEST FINDING - the agreement could complete with three of four signature
blocks blank. createAgreement created exactly ONE signer (the client). The
document printed "Signature: __________________" lines for Seventh Sky and both
witnesses that nobody could ever fill, and the envelope reached status
completed as soon as the client alone signed. The execution block named four
parties; only one was ever bound.

Backend:
- createAgreement now builds a signer per party: client (order 1), Seventh Sky
  countersigner (order 2, only when an org email is supplied), then each witness
  with an email. Each gets its own signature AND date_signed SignatureField.
- signing_order_enforced flipped false -> true. A witness cannot meaningfully
  attest a signature that has not been made yet, so: client signs, Seventh Sky
  countersigns, then witnesses attest. signing.controller already promotes the
  next signer pending -> sent on each signature, so the chain runs itself.
- The response now returns a per-signer array with an individual signing_path,
  not a single token.
- The execution block in wtCustomerAgreement renders real per-party slots
  carrying data-sign-anchor / data-sign-party / data-sign-field markers instead
  of dead underscore lines, so each captured signature lands in its own box.
  Witness email is printed when supplied.

Frontend:
- QuotationAgreement.jsx gained a "Signing parties" card: Seventh Sky
  representative / position / countersigner email, and both witnesses with name,
  NID and email. It also gained the advance editor (20/25/30/40/50 presets, free
  percent, fixed amount, clear-to-40/30/30) with a live "the agreement will read"
  line. Witnesses and org are seeded so the inputs are controlled.
- The sent confirmation now lists one signing link per party in order, noting
  which open only after the previous party signs.
- WtCustomerAgreements.jsx: witnesses gained an email field (they had name/NID
  only, so they could never be sent to) and the Parties step gained the Seventh
  Sky signatory block with the countersigner email.

Verified end to end - 19 assertions: four per-party signature anchors, four
signature slots, four date slots, witness details and email printed, NO dead
placeholder lines left, advance at 30% printed; envelope wiring gives 4 signers
and 8 fields with only the client live; then the chain was walked signature by
signature - each signature promotes the next party to live and the fourth
completes the envelope. Test envelope was deleted afterwards.
vite build passes (1965 modules), backend restarts 200, POST 401 unauthenticated.

NOTE: a party without an email is deliberately NOT added as a signer - it would
create a block nobody can reach. The UI says so on both screens.
NOT verified: real emails leaving (SMTP_PASS unset in this environment) and the
browser pass - the admin session is still expired.
Nothing committed.

---

## FIX — provider agreement: cover page, TOC page, parties page, and full signing
Date: 2026-08-12

User asked for, on /agreements/water-tank-provider/new:
  page 1 Seventh Sky branding + contract name naming both parties + contract date
         (= signed date)
  page 2 table of contents
  page 3 full contact and business details of BOTH parties, then the body
  the defect-rectification input not appearing
  signature part done the same way as the client agreement

decorate() restructured from a single flowing document into four parts:
- PAGE 1 cover: large Seventh Sky branding, "Contract Name" label, the contract
  named as Service Provider Agreement between Seventh Sky Properties and the
  provider, and Contract Date. The date is the SIGNED date when the agreement has
  been executed; before that it reads "On execution by both Parties" rather than
  asserting a date that has not happened.
- PAGE 2 table of contents, numbered, linked to each clause anchor.
- PAGE 3 The Parties: Seventh Sky (legal name, division, address, phone, email,
  represented by, position) and the Service Provider (business name, legal name,
  business type, registered address, district, trade licence, company
  registration, TIN, BIN, contact person, represented by, position, phone, email,
  years of experience, coverage). This closes the gap flagged in the previous
  entry - the provider legal identity now appears WITHOUT editing the legal
  template, because it lives in the document shell rather than the clause body.
- Then the agreement body, then the execution block.

Execution block now matches the customer agreement exactly: per-party
data-sign-anchor / data-sign-party / data-sign-field slots for Seventh Sky, the
Service Provider and both witnesses, so a captured signature lands in its own box
instead of a dead underscore line. Witness email printed when supplied.
Provider signing gained witnesses as ordered signers (provider -> Seventh Sky
countersign -> witnesses attest), each with signature AND date_signed fields,
labelled by party rather than by name.

DEFECT RECTIFICATION FIELD — not a bug. It is template field
defect_rectification_days and it renders correctly when set (verified: prints
"within: 5 Business Days"); it only shows __________ when left blank. The real
problem was discoverability - it sat alone in step 4 among 47 legal inputs. It is
now also surfaced in step 2 next to the other commercial terms, writing to the
same template_values key, so filling it either place works.

Frontend: witness name / NID / email inputs added to the provider builder with
the signing order stated. blank seeded with email so the inputs are controlled.

Verified: 30 assertions on document structure - cover names both parties, contract
date is the signed date, 3 page breaks, TOC present, all 12 party-detail values on
the parties page, defect days renders the typed value, 4 signature anchors, 4
signature and 4 date slots, and the order cover -> TOC -> parties -> body ->
execution. The 47-field audit still reports 44/44 rendered. vite build passes
(1965 modules), backend restarts 200.
NOT verified: the browser pass - the admin session is still expired.
Nothing committed.

---

## FIX — signature section moved to the END of every agreement
Date: 2026-08-12

User: move the signature section to the end for ALL agreements (TM, PM, short
term, client service, provider master) and follow how the client service and
provider master agreements do the signature part.

All five put signatures BEFORE the schedules, so the parties signed above the
schedules they were agreeing to. Now last in every one.

Composition reordered clauses -> Schedules A-D -> Signatures in:
  wtCustomerAgreement.service.js  (Water Tank customer service)
  rprmAgreement.service.js        (Property Management)
  rptmAgreement.service.js        (Tenancy Management)
  stsAgreement.service.js         (Short Term Stay)
TOCs needed no change - none of them listed Signatures.

RPRM / RPTM / STS also still used dead "Signature: ____ Date: ____" lines. All
three now use the same anchored signSlot() helper as the Water Tank agreements:
data-sign-anchor / data-sign-party / data-sign-field per party, so a captured
signature lands in its own box. Witness email printed when supplied. Zero dead
underscore signature lines remain in any of the four.

PROVIDER MASTER AGREEMENT - different problem, template driven. Two findings:
1. Appending my own execution block would have given the document TWO signature
   sections, because the seeded 63-clause template carries its own
   ("SIGNED FOR SEVENTH SKY" / "SIGNED FOR SERVICE PROVIDER" / WITNESS 1 / 2)
   with four dead underscore pairs. Instead the templates own lines are upgraded
   in place to anchored slots, in their fixed order.
2. That block sits INSIDE clause 63, BEFORE Schedule A - so it was not at the end
   either. It is now lifted out and placed after every schedule. Clause 63s
   acknowledgement paragraph deliberately stays where it is; only the signing
   blocks move, and the templates own wording is preserved verbatim.

Verified: 48 assertions across the four schedule-based agreements (signatures
after Schedule A and D, no dead lines, four anchored parties, four signature and
four date slots each) plus 10 on the provider agreement (execution after every
schedule, exactly one execution section, four slots, template wording preserved,
clause 63 intact). Earlier suites re-run clean: provider document structure 28,
customer hydration 22.

One stale assertion in my own older test failed - it expected the witness EMAIL
printed in the provider document. That came from the block I removed; the
templates witness block shows Name + NID only and the email is used for sending,
not printing. Witness names and NIDs verified present. Not a defect.

node --check on all five services, backend restarts 200. Nothing committed.

---

## BUILD — AMC rebuilt as a real term contract with a visit schedule
Date: 2026-08-12

User: create AMC should get its own /create-amc route with a step-by-step process
like projects; re-read the SOPs; make it featureful; what terms follow from the
agreements and SOPs; what extra inputs an AMC needs.

Re-read from C:\Users\ADMIN\Downloads\WATER TANK:
  SOP-01 Sec.10 (Phase 6) schedule cleaning / inspection / water testing / pump
    inspection visits; monitor visit completion, renewal dates, satisfaction
  SOP-01 Sec.13 KPI: AMC Renewal Rate
  Customer Service Agreement Clause 2  term runs for the duration in the Work Order
  Customer Service Agreement Clause 9  payment Monthly/Quarterly/Half-Yearly/Annually
  Customer Service Agreement Schedule A seven package tiers
  Work Order Section 7 AMC Start Date / AMC Expiry Date

THE INSIGHT: an AMC is not a status on a client, it is a term contract that
promises a SCHEDULE OF VISITS at a price and is judged on whether those visits
happened. wt_amc_contracts was a 9-column summary row, so "monitor visit
completion" (Sec.10) was impossible and the renewal conversation had no evidence.

Migration 0079: extends wt_amc_contracts with client/site/tank linkage, package
tier, inclusions/exclusions, term + auto-renew + renewal notice + renewed_from/to,
the visit plan counters, billing (payment_frequency, instalment, advance,
per-visit, VAT, discount, contract value), service level (response hours,
emergency call-outs, water testing, reports), agreement/project/provider linkage,
satisfaction and timeline. NEW TABLE wt_amc_visits - one row per planned visit
with due date, type, completion, work order, findings, water test result, photos,
client sign-off and satisfaction.

services/wtAmc.service.js:
- PACKAGES: the seven Schedule A tiers, each seeding a visit mix, response time,
  water-testing flag and emergency call-out allowance.
- VISIT_TYPES: exactly the four activities Sec.10 names.
- generateVisitPlan() spreads each type EVENLY across the term and scales the
  annual rate to the actual duration - 4 cleans/yr over 6 months becomes 2, not 4.
  Visits landing on the same date are one site mobilisation doing several
  activities, which is how the work is actually delivered.
- computeBilling() derives VAT, contract value, instalment count and amount from
  the payment frequency AND the term (a quarterly 24-month contract is 8
  instalments, not 4), advance, balance and per-visit value. Nothing stored twice.
- createAmc() resolves-or-creates the client, resolves-or-creates the property in
  the shared register, creates the contract and materialises every visit row in
  ONE transaction, then syncs the client file.
- amcDossier() returns contract + visits + completion stats + renewal window +
  average satisfaction + billing recomputed on read.

API /api/wt-amc: reference, overview (incl. the Sec.13 renewal-rate KPI and visit
completion %), preview (plan + billing before saving), list with renewal filter,
create, dossier, patch, delete, visit list/update, and renew.
RENEWAL is a NEW contract superseding the old one (renewed_from/renewed_to), not
an edited old one - the expired term and its visit history stay intact as the
record of what was actually delivered.

Frontend: AmcForm.jsx at /water-tank/amc/create-amc - six steps (Client, Site &
tanks, Package, Visit plan, Commercials, Review) using the same wizard chrome as
the project form. Step 4 is the centre: set visits per year per activity, press
Build the plan, and the exact dated schedule appears before saving. Step 5 shows
every derived figure. Review warns when no Customer Service Agreement is linked
(Sec.7 Step 6) and when the contract is unpriced. The index keeps the old quick-add
drawer and gains a primary Create AMC button.

Verified: 26 assertions end to end - code generation, client creation, package
application, 12-month term and renewal date, 8 visits materialised from a
4/2/1/1 mix, contract value 23100 from 24000-2000+5%, quarterly instalment 5775,
first/next visit pointers, service level seeded, all visits Planned and
chronological with unique codes, completion tracking, dossier stats 1/8 = 13%,
billing recomputed on read, and a 6-month term correctly scaling 2 clean+1
inspect/yr down to 2 visits. Test contracts, visits and client deleted afterwards.
Migration applied, vite build 1966 modules, backend restarts 200 with /api/wt-amc
mounted and 401 unauthenticated.
NOT verified: the browser pass - admin session still expired. Nothing committed.

### 2026-08-12 20:22 | OpenCode (GPT-5.6) | COMPLETED | Document Water Tank product assessment
- Request: Create one Markdown file containing the complete Water Tank section assessment and nothing else.
- Scope: `ASSESSMENT_GPT_WATER_TANK.md` and mandatory append-only work-log entries.
- Changes: Created a production-planning assessment covering current capability, customer/provider lifecycle diagrams, confirmed blockers, canonical states and calculations, catalogue consolidation, navigation, screen recommendations, customer/provider portals, strict permissions, UX/accessibility, notifications, data migration, tests, operations, delivery phases, and acceptance criteria.
- Verification: Confirmed the new Markdown file exists and reviewed its structure; documentation-only task, so no application build or runtime test was required.
- Handoff: Use `ASSESSMENT_GPT_WATER_TANK.md` as the implementation and production-readiness baseline. Revalidate source-line findings before coding because the Water Tank worktree remains heavily uncommitted and concurrent.

### 2026-08-12 20:16 | OpenCode (GPT-5.6) | STARTED | Document Water Tank product assessment
- Request: Create one Markdown file containing the complete Water Tank section assessment and nothing else.
- Scope: New root-level Water Tank assessment document only, plus mandatory append-only work-log entries.
- Changes: None yet.
- Verification: Read the shared work log and checked the current git status; preserving all concurrent uncommitted work.
- Handoff: Consolidate the completed product, UX, workflow, security, financial, portal, testing, and delivery assessment into one implementation-ready Markdown document.

---

## BUILD — Water Tank invoicing: auto-draft on signature, edit, send, branded PDF
Date: 2026-08-12

User: invoice from the contract pricing; auto-generate after the contract is
signed; mention the advance; list selected service names and prices as items;
discounts and all relevant info; plan how AMC invoices are calculated; branded
professional PDF; generated -> drafted -> editable -> final -> send; smooth.

GOVERNING RULE: an invoice must reconcile with the contract that was signed. So
invoices are BUILT FROM the signed envelope terms (agreed_lines, pricing_summary,
payment_schedule) rather than retyped, and every total is derived from the lines
on each read. The client should recognise the items from Schedule C.

Migration 0080 gives wt_invoices: lines JSON, the full breakdown (subtotal,
discount + reason, transport, govt fees, other, VAT, advance_applied), the
Draft->Sent->Part Paid->Paid->Void lifecycle with timestamps, bill-to block,
provenance (agreement/AMC/project/quotation/work order), AMC instalment context
(instalment_no/of, period_start/end), and document_html + issued_snapshot to
freeze what the client received. Balance is NOT stored - it is total minus
advance minus paid.

TWO CALCULATION MODELS:
1. PROJECT/ONE-OFF from a signed Customer Service Agreement. The agreement
   carries a payment schedule; each stage becomes its own invoice. A single-stage
   contract bills its lines as they stand. A staged one bills a SHARE of the
   whole - and this is the bug I found and fixed in testing: scaling only the
   LINES silently dropped the discount and VAT, so the stages summed to the gross
   subtotal (8200) instead of the signed contract value (7560). The discount,
   transport and govt fees are now scaled by the same proportion and the VAT rate
   is unchanged, so the stages reconcile exactly.
2. AMC from a contract. Contract value splits across the instalments falling
   inside the term (Clause 9 frequency x duration). Every instalment takes the
   rounded share and the LAST absorbs the remainder, so the schedule always sums
   to exactly the contract value - a client must never be billed a total that
   differs from what they signed (verified: 12 monthly instalments of 10000/12
   still total exactly 10000). VAT is NOT re-applied because it is already inside
   the contract value. The advance credits against the FIRST instalment only,
   never spread, so the client sees it discharged where they paid it.

AUTO-GENERATION: hooked into the customer-agreement completion in
partyRoleActivation.service.js alongside the existing work-order hook. It DRAFTS,
never sends - an invoice is the one thing you cannot un-send. Idempotent per
envelope, and wrapped so a failure can never roll back a completed signature.
Only the first stage is released; later stages are drafted (so the operator sees
the whole billing plan) but carry no due date until their trigger.

PDF: services/wtInvoicePdf.service.js, pdfkit, same house style as the work order
and agreements - navy/cyan letterhead, DRAFT/TAX INVOICE/VOID badge, bill-to and
references, ruled zebra item table, totals with the advance credited and a filled
BALANCE DUE / PAID IN FULL bar, advance note, payment terms, remit-to bank block.
A draft prints a footer saying it is not a demand for payment.

API /api/wt-invoices: reference, overview, AMC schedule preview + generate, list,
create, detail, PATCH (drafts only - refuses with a clear message otherwise),
send (freezes issued_snapshot), pdf, payments, void, delete (drafts only; issued
invoices are voided so the numbering stays continuous).

Frontend: InvoiceEditor.jsx at /water-tank/invoices/:code - bill-to, editable
item table with catalogue search, adjustments, live totals mirroring the server,
record-payment panel, PDF preview and send with an explicit confirm that sending
freezes the document. Read-only with a lock banner once issued. The list now
opens it.

Verified: 29 assertions - staged invoices reconcile to the contract value,
advance invoice is exactly the 30% agreed, selected services appear as line
items, provenance carried, single-stage discount/VAT correct, 4 quarterly AMC
instalments summing exactly, advance on the first only, periods correct, rounding
remainder absorbed, and every status transition (Overdue/Paid/Part Paid/Void).
PDF renders a valid 3846-byte %PDF-. Migration applied, vite build 1967 modules,
backend restarts 200 with /api/wt-invoices mounted and 401 unauthenticated.

NOT DONE: email delivery. SMTP_PASS is unset in this environment, so send()
freezes the document and returns the PDF endpoint rather than claiming an email
went out. Wire the mailer when SMTP is configured.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## BUILD — direct quotation, agreement continue-or-resign, auto-drafted work order
Date: 2026-08-12

User asked for four things on /water-tank/quotations:
  a Create quotation button that needs no assessment - create and done
  a client who already signed should not have to sign again, BUT the system must
    ASK: sign a new contract, or continue?
  after the quotation is created, a work order drafted under Drafts
  the Work Order should carry the Clause 9 AMC payment sentence

1. AMC PAYMENT ON THE WORK ORDER — was NOT there. The document had the AMC start
   and expiry dates but nowhere to record the billing cycle, so Clause 9
   ("payment may be made monthly, quarterly, half-yearly or annually AS SPECIFIED
   IN THE WORK ORDER") pointed at a field that did not exist. Section 7 now
   prints that sentence verbatim with the four options as tick boxes against a
   new wo.amc_payment_frequency column (migration 0081).
   Verified: sentence present, selected option ticked, others left unticked, and
   nothing ticked when no cycle is set.

2. DIRECT QUOTATION — new POST /wt-quotes/direct plus
   GET /wt-quotes/agreement-position. Quotations previously only existed
   from-assessment; the builder could EDIT a standalone quote but nothing could
   create one. Migration 0081 adds direct_quote / client_code / site_address /
   work_order_code to wt_quotations.

3. THE AGREEMENT QUESTION — agreementPosition() reports rather than decides.
   Clause 1 makes the Customer Service Agreement the umbrella for the engagement,
   with each jobs specifics confirmed in the quotation and work order, so a
   client who signed does NOT sign again. But a materially different engagement
   may warrant a fresh agreement, so the screen states the position and offers
   both options with the SOP-recommended one marked - the operator chooses
   knowingly. Choosing "raise a new agreement" routes straight to the agreement
   builder after the quote is created.

4. AUTO-DRAFTED WORK ORDER — new createFromQuotation() in wtWorkOrder.service.js,
   idempotent per quotation, creating the order as a DRAFT so nothing reaches a
   provider until it is issued. It fires when the client is already under a
   signed agreement (or the operator picks "continue"), which is exactly the case
   where no new signature is needed. The existing createFromSignedAgreement path
   is untouched.

Frontend: QuotationDirect.jsx at /water-tank/quotations/new - client search,
the agreement position card with the two choices, catalogue-driven service lines,
terms with the structured advance, and a live total panel that states what the
save will do. The Quotations header now offers both routes: "Build from an
assessment" (Sec. 6) and "Create quotation" (Sec. 7 Step 5).

Verified: migration 0081 applied, model fields registered, node --check on all
four changed backend files, createFromQuotation exported, the AMC tick-box
assertions above, vite build 1968 modules, backend restarts 200 with both new
endpoints 401 unauthenticated.
Note: one assertion in my first pass failed because I asserted the wrong tick
glyph - the helper renders U+2611 not U+2612. The code was right; the test was
wrong. Corrected and re-run.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## FIX — invoice create moved to a centred modal, with DB client search and catalogue items
Date: 2026-08-12

User on /water-tank/invoices: items and amounts should be editable; add terms for
adjustments; the create button should open a CENTRED modal not a right-side
drawer; load the client from the DB searchable by name, email, mobile or project
ID; add items from the catalogue and by manual pricing.

WHY A MODAL: building an invoice needs the client search, the catalogue and the
running total visible together. The 460px right-hand drawer cannot hold that
without the operator scrolling past the very figures they are trying to
reconcile. A drawer suits a short edit form; this is not one.

Added .wt-modal-* to wt-scope.css (APPEND ONLY, 26 lines, all prefixed):
centred overlay, 980px max-width card, sticky head/foot, scrolling body, and a
wt-modal-cols grid so the form sits beside a running total. Brace balance
verified 769/769.

InvoiceCreateModal.jsx (NEW):
- Client search hitting a new GET /wt-invoices/client-lookup. It searches the
  client book by name, email, mobile, client code AND service address, and ALSO
  resolves PROJECT codes to their client - an operator raising an invoice
  usually has the project reference to hand, not the clients details. Each hit
  reports what it matched on so the operator can see the search worked.
- A client with exactly one project has it preselected; more than one gets a
  chooser. Signed-agreement status is surfaced on the picked client.
- Items from the price schedule by search, or a manual line; every field
  (code, description, qty, rate) is editable inline and the amount recomputes.
- Full adjustments block: discount WITH a reason field that prints on the
  invoice, transport, government fees, other charges, VAT %, advance already
  paid with its own note, payment terms and invoice notes.
- Running total panel updates live and the footer carries the figure, so the
  operator never has to scroll to see what they are about to create.
- Escape and backdrop-click close it; creating opens the full editor on the new
  draft rather than dumping the operator back on the list.

Editing was already in place from the previous build (InvoiceEditor at
/water-tank/invoices/:code, drafts editable, frozen once issued) - the gap was
that nothing good existed to CREATE one. CreateDrawer removed from Invoices.jsx
along with its now-unused import.

Verified: node --check on both changed backend files, backend restarts 200 with
client-lookup 401 unauthenticated, vite build 1969 modules clean, CSS brace
balance intact, all six new modal classes present.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## FIX — "(inv.lines || []).map is not a function" on the invoice screen
Date: 2026-08-12

User hit it on /water-tank/invoices/INV-0484.

CAUSE: the known Sequelize behaviour on this MySQL setup - JSON columns come
back as STRINGS, not parsed objects. Confirmed against the real row:
typeof lines === "string". `(inv.lines || [])` is therefore a non-empty STRING,
which is truthy, so the fallback never fires and .map() blows up. (payments
happened to come back parsed, which is why only lines crashed - the behaviour is
inconsistent, so neither can be trusted.)

FIXED AT THE API BOUNDARY, not at the call site. Added shape() to
waterTankInvoice.controller.js normalising lines / payments / issued_snapshot,
and applied it to EVERY response that returns an invoice: detail, list, update,
send, recordPayment and void. Fixing only the one crashing screen would have left
the same trap for the next consumer.

Frontend belt-and-braces: InvoiceEditor parses with the existing parseJson helper
on load, so a stale or cached response cannot crash the page either.

The PDF path was already safe - it goes through computeTotals(), which uses
asArray() internally. Verified it still renders from the RAW unshaped row.

Verified against INV-0484 itself: lines and payments are real arrays after
shaping, .map() is callable, totals compute (subtotal 25600 / outstanding 25600),
and the PDF renders. Backend restarts 200, vite build clean.

NOTE for future work in this module: this is the third time this class of bug has
appeared (providers compliance, project services, now invoice lines). Any new
JSON column needs either parsing at the API boundary or parseJson at the point of
use - never assume Sequelize returns it parsed.

---

## FIX — Sec. notation, and the Lifecycle moved to its own check-mark tab
Date: 2026-08-12

User: fix the "Sec. 4 unknown sign", make the Lifecycle check-mark based, and put
it in a new tab.

THE SIGN: checked first rather than assuming. The file IS valid UTF-8 and the
byte sequence was a correct U+00A7 SECTION SIGN, so it was rendering fine - the
notation itself was just unclear. Replaced every user-facing occurrence with
"Sec." across the water-tank screens (AmcForm 3, ProjectDetail 2, ProjectForm 4,
Projects 1), which is the notation the SOP documents themselves use. Zero section
signs remain in the module.

THE LIFECYCLE: was an 11-column stepper sitting above the tabs, permanently
occupying the top of the screen and too cramped to carry each stage label plus
its SOP reference. Now a "Lifecycle" tab, second in the row, holding a CHECKLIST:
- a tick box per stage - filled green with a check when done, an accent dot when
  current, empty when still to come. The operators three questions (what is done,
  where are we, what is left) are answered by the ticks at a glance, which a
  numbered rail does not do.
- stages grouped by SOP PHASE, because that is how Sec. 4 itself reads.
- a header showing "N of 11 complete - currently <stage>" with a progress bar.
- clicking a row still moves the project, and the existing out-of-order warning
  and acknowledge flow is untouched.
- a Key dates block (started / scheduled / actual start / target / actual
  completion / handover) which had nowhere sensible to live before.

The KPI row keeps its progress ring, so the top of the screen still shows where
the project is without opening the tab.

CSS: .wt-liferow appended to wt-scope.css (append-only, .wt-scope prefixed).
Brace balance verified 782/782. The old .wt-srail / .wt-sstep rules are left in
place - another screen may still use them and removing them is not my call.

Verified: vite build 1969 modules clean, no section signs left in the module, the
stepper markup is gone from ProjectDetail, all 13 new CSS rules present.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## BUILD — agreements register at /water-tank/agreements, and signatures that actually appear
Date: 2026-08-12

User: track all agreements under one place - client, provider and work order;
show how many parties signed or not; a resend button; and after all parties sign,
the downloaded agreement must SHOW the signatures.

THE BUG THAT MATTERED MOST — signatures were never rendered into the document.
signing.controller stores each captured value on signature_fields.value, but the
envelope document_html is never updated. So "download the signed agreement"
returned the ORIGINAL document with empty signature boxes. The signatures existed
in the database and nowhere on the page a client would actually keep.

services/wtSignedDocument.service.js closes it. The agreement renderers emit
anchored slots (data-sign-field / data-sign-party) and the SignatureField rows
are labelled "<Party> signature" / "<Party> - date signed"; matching on the party
name joins the two. Handles BOTH value shapes - a data: URL from a signature pad
renders as an <img>, typed text renders in a script face. An unsigned party KEEPS
its blank ruled line, so a partially-signed document reads honestly instead of
looking complete. Adds an execution banner (FULLY EXECUTED / PARTIALLY SIGNED -
N of M) with the per-party tick list and the content hash.
VERIFIED ON REAL DATA: ENV-WTCSA-660006 (4/4 signed) now has 8 values injected -
four signatures and four dates - with zero unsigned parties.

THE REGISTER — /api/wt-agreement-hub + AgreementsHub.jsx at
/water-tank/agreements. Reads straight from SigningEnvelope + EnvelopeSigner so
it cannot drift from the signing engine. Three families in one table: client
(water_tank_customer_agreement), provider (water_tank_provider_agreement) and
work order (water_tank_work_order) - previously visible only from three separate
screens, so nobody could answer "what is out for signature and who are we waiting
on?" without checking each in turn. Confirmed against live data: 6 envelopes
across all three types.

Features beyond the ask, chosen because they answer questions the signing process
actually raises:
- PARTY CHIPS per row: one square per signer, green tick signed, red cross
  declined, grey number pending - the whole signing state at a glance.
- WAITING ON: names the specific person whose signature is blocking, because
  "2 of 4" does not tell you who to chase.
- SIGNATURES OUTSTANDING as a KPI (individual signatures owed, not agreements) -
  the number that reflects the actual chasing workload.
- EXPIRY tracking: expiring within 7 days, and already expired, both flagged.
  An expired envelope silently blocking a job is easy to miss.
- RESEND rotates the token rather than reusing it. A forwarded link would
  otherwise stay live forever; rotating makes the resend the only way in. The new
  link is copied to the clipboard.
- PER-PARTY resend and copy-link in the detail drawer, so you can chase one
  witness without re-sending to everyone.
- Partially-signed download behind a confirm that names who is still outstanding.
- Void with a reason, refused once fully executed.
- Content hash surfaced as proof of execution.

Console nav: the provider-only "Provider Agreements" link is replaced by
"Agreements" pointing at the register.

Verified: 8 assertions on signature injection (typed and drawn, dates, unsigned
parties reported, blank lines preserved, label→party mapping) plus the real
ENV-WTCSA-660006 test above; node --check on all three new backend files; backend
restarts 200 with /api/wt-agreement-hub mounted and 401 unauthenticated; vite
build 1970 modules clean.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## BUILD — AMC yes/no with backend-loaded packages, and client-type-driven party details
Date: 2026-08-12

User: on the customer agreement, AMC package and frequency should load from the
backend for invoice generation; make AMC a yes/no - if yes show packages,
frequency and the rest, if no show nothing. And on client selection: residential
asks major contact details (already fine), commercial/industrial should also ask
representative name, position, contact and business information.

1. AMC — YES/NO FIRST, THEN LOAD FROM THE BACKEND
Both agreement screens (QuotationAgreement and the WtCustomerAgreements wizard)
now open with a Yes/No question. Answering No shows nothing AND clears any
previously chosen package - a stale package must never survive onto a signed
document. Answering Yes reveals, all loaded from /wt-agreements/customer/meta:
  - the 7 Schedule A package tiers with their visits/yr (from wtAmc PACKAGES)
  - visit frequency
  - BILLING CYCLE from Clause 9 PAYMENT_FREQUENCIES (Monthly / Quarterly /
    Half-Yearly / Annually) - this is what drives AMC invoice generation
  - the LIVE AMC contracts, so an agreement can be tied to one that already
    exists; picking one auto-fills its package and cycle
  - AMC start and expiry dates (Work Order Section 7)
Confirmed the endpoint serves real data: 7 packages, 4 cycles, 2 live contracts.

The renderer matches: AMC rows print ONLY when the project is genuinely under
one. Printing empty AMC lines on a one-off job invites the client to think a
contract exists. Verified both ways - 9 assertions.

2. CLIENT TYPE DRIVES THE PARTY BLOCK
A residential customer signs personally; a commercial/industrial/institutional
client is an ENTITY signing THROUGH someone. Without naming the entity and the
person with authority to bind it, there is no way to tell who is actually liable
under the agreement.
Client type is now a choice on both screens. Residential keeps what it had
(name, NID, phone, address) plus an alternate contact. Business types instead
ask for: registered/legal name, business type, trade licence no., company
registration no., TIN, BIN/VAT, registered address — then a separate
AUTHORISED REPRESENTATIVE block (name, position, phone, NID) and an accounts
contact + email for where invoices go.
The agreement renderer prints the matching block: 15 assertions confirm a
residential agreement shows NO business fields and no representative block,
while a commercial one prints all ten business/representative values.

Note: I restructured the parties template in wtCustomerAgreement.service.js -
my first edit put the conditional logic INSIDE the template literal, which broke
the parse. Caught by node --check, logic moved above the template, re-verified.

Verified: node --check on both changed backend files, 24 assertions across the
two features, backend restarts 200 with the meta endpoint 401 unauthenticated,
vite build 1970 modules clean.
NOT verified: the browser pass - admin session still expired. Nothing committed.

---

## PHASE 0 COMPLETE — baseline commit + the browser QA catch-up
Date: 2026-08-12

### 0a. Rollback point
Committed 115 Water Tank files on branch water-tank/phase-0-baseline (4d46fcf).
Scoped by filename, never git add -A — 97 other-agent changes left untouched in
the working tree. Four shared files (App.jsx, server.js, partyRoleActivation,
wt-scope.css) were included because the tree would not build without them; the
commit message states plainly that App.jsx and server.js also carry concurrent
Short Stay / RPRM / TM / STS work, so a rollback would revert that too.

### 0b. First authenticated browser pass of the whole module
The user signed in. This was the first time any of this session work had been
opened in a browser. Two REAL defects found, both invisible to backend tests:

BUG 1 — numeric-truthy JSX rendering (visible on 20 of 21 project rows).
MySQL TINYINT comes back as the NUMBER 0, not false. In JSX, {0 && <span/>}
renders a literal "0", so every project row read "No provider0". Fixed with an
explicit !! at the five API-sourced render sites (Projects, ProjectDetail x3,
QuotationAgreement). Verified in the browser: the stray 0 is gone.
Checked and CLEAR: no `.length &&` instances anywhere; the wizard forms already
coerce with !! on edit-hydration, so form state was never affected.

BUG 2 — a PAID invoice was reported as fully receivable (financial).
computeFinancials had `num(i.outstanding) || (amount - paid)`. A settled invoice
legitimately has outstanding = 0, which is FALSY, so it fell through to the
fallback and counted the entire invoice as still owed. WTCM-P0022 showed
Collected 25,600 AND Receivable 25,600 — the same money twice.
Same pattern found at two more sites, and the third is worse than display:
  services/wtProject.service.js  computeFinancials (display)
  waterTankOps.controller.js:487 payments receivable (display)
  waterTankOps.controller.js:594 recordPayment DUE — would have reopened a
                                 settled invoice for further payment
Fixed with a shared outstandingOf() in both files that treats null/blank as
"derive it" but a recorded zero as authoritative. 5 assertions incl. the exact
failing row; verified in the browser — project receivable 47,440 -> 21,840 and
the paid invoice now reads 0.

### Not defects, but worth recording
- The 500 on /api/wt-projects at the start of QA was MY process management, not
  the app: `nohup node server.js &` from a Bash tool call gets reaped when the
  call ends. Re-launched as a tracked background process; 10/10 requests then
  passed. Any future "backend randomly 500s" should check the process is alive
  before hunting application bugs.
- Endpoint sweep: 23 of 24 water-tank endpoints return 200 under a real session.
  The one 404 was my wrong test slug (/wt-ops/registers — the screen actually
  uses warranties + incidents, both 200).
- Console is clean apart from the pre-existing React Router v7 future-flag
  warnings.
- Screenshot/script-injection timed out repeatedly on the original tab after a
  vite rebuild; a fresh tab recovered it. Known behaviour in this project.

### Observations for later phases (NOT fixed — they are design questions)
- Project contract_value (2,900) vs invoiced (25,600) diverge because an AMC
  invoice is matched into the project by project_id. Either AMC billing should
  not roll into the project contract comparison, or contract_value should
  include it. Needs a decision, not a patch.
- The progress KPI truncates "AMC / Ongoing Support" to "AMC / On...".

Verified: vite build 1970 modules clean; backend restarts 200; both fixes
confirmed on screen against real data.

---

## 2026-08-12 — Claude — COMPLETED: Water Tank Phase 1 (P0 security + runtime)

Branch `water-tank/phase-0-baseline`. Six surgical fixes, no new features. Each
finding was verified against source first — I did not take the assessment's word
for any of them.

### 1. Latent crash on work-order completion (real, would have fired in production)
`services/partyRoleActivation.service.js` — the `water_tank_work_order` block
used `P.WtProviderEvent` but only `M` was required in scope. `P` was required in
the *provider-agreement* block above, so this threw a ReferenceError
**synchronously** — meaning the `.catch()` on the `create()` never saw it, and the
whole signing transaction aborted for any work order with a provider attached.
Added the missing require. Also froze the *executed* HTML (with signatures)
rather than the blank original, so the archived document matches what was signed.

### 2. Signing order was enforced on VIEW but not on SUBMIT
`controllers/signing.controller.js` — `viewByToken` checked earlier signers;
`signByToken` did not. Anyone holding their own valid token could sign ahead of
the parties before them, so a witness could attest a client signature that did
not exist yet. Added the check inside `signByToken`, returning 423 with the name
of the party being waited on, and auditing `order_violation_blocked`.
Tested live against a real 3-signer envelope: witness blocked, countersigner
blocked, correct order completes, 2 violations in the audit trail (9/9).

### 3. Signer access tokens were in every list payload
`controllers/waterTankAgreementHub.controller.js` (my own code) returned
`access_token` per signer — anyone who could load the register could sign as
anyone. Replaced with a boolean `has_live_link`; links now come from an explicit
audited `POST /:id/signing-link/:signerId`. Same leak removed from work-order
detail.

### 4. Role matrix — there was NO role enforcement on any water-tank route
New `middleware/wtRoles.js`: WT_READ / WT_OPERATE / WT_FINANCE / WT_LEGAL /
WT_ADMIN → `canRead`, `canOperate`, `canTransact`, `canBind`, `canAdminister`.
Applied across all 143 routes in 10 route files.
Confirmed `admin@seventhskyproperty.com` is `super_admin` BEFORE applying guards,
specifically to avoid locking the only admin account out.
`waterTankProviders.routes.js` kept its two pre-existing narrower guards
(`MANAGE`, `APPROVE` — the latter also admits `accounts`, who verify payment
details); they now compose with the shared tiers.

### 5. Generic write hole
`/api/wt-ops/:entity` spread `req.body` straight into model writes, bypassing
every specialist controller's validation. Quotations, work orders, projects, AMC,
invoices, providers and clients are now **read-only** through that route; writes
return 405 naming the correct specialist endpoint. Applied to create/update/
remove/advance.

### 6. Work-order documents had no signature anchors
`services/wtWorkOrderDoc.service.js` printed dead `Signature: ______` lines, so
executed work orders showed blanks where agreements showed signatures. Added
`data-sign-party` slots for Seventh Sky and Service Provider, and aligned the
signer field labels in `waterTankWorkOrder.controller.js` so `partyFromLabel()`
resolves them. All 4 values now inject.

### Mistake worth recording
My scripted import insertion matched `const { authMiddleware }` and silently
missed `waterTankProviders.routes.js`, whose line is
`const { authMiddleware, roleMiddleware }`. `node --check` PASSED — the file
parsed fine and only threw at require time. Because `server.js` uses a resilient
`mount()` that **silently skips a throwing route file**, the entire provider API
would have disappeared with no error visible in the app. Fixed, and I now verify
`require()` succeeds on all 11 water-tank route modules, not merely that they parse.
**`node --check` is not sufficient in this repo.**

### Verified
- 11/11 water-tank route modules `require()` OK; server boot log shows all 11
  mounted and none in "skipped (to be rebuilt)".
- `verify-phase1.js`: 28/28 assertions pass.
- `test-phase1.js` against the live server: 9/9.
- `/api/health` 200; all new routes 401 unauthenticated.
- `npm run build`: 1970 modules, clean.

### NOT verified — needs you
Browser confirmation of the role matrix and the token-leak fix could not be done:
the Chrome extension disconnected and the admin session expired. Everything above
is source- and API-verified. When you next sign in, the checks are: a wt-ops write
as a non-admin role must 403, and no network response may contain `access_token`.

---

## 2026-08-12 — Claude — COMPLETED: Water Tank Phase 2 (single write authority + money safety)

Branch `water-tank/phase-0-baseline`. Two halves: one writer for money, one
declaration of every lifecycle rule.

### FIRST — two defects I introduced in Phase 1, found and fixed here
1. **A route was destroyed by my own script.** `waterTankWorkOrder.routes.js:14`
   read `...ctrl.documentReference);   // before /:idrouter.get('/', canRead,
   ctrl.list);` — the newline was eaten, so `GET /api/wt-work-orders` was inside
   a comment. The work-orders register would have returned 404 with no error
   anywhere. `node --check` passes on this happily; it is valid JavaScript.
   Fixed, and I then wrote a route-inventory diff (every `router.<verb>('path')`
   in all 11 files, before Phase 1 vs now) which confirmed this was the ONLY
   route lost. That check now runs as part of verification.
2. **The Phase 1 role sweep missed `waterTankOps.routes.js` entirely.** My
   "all 143 routes carry a role guard" was true of the ten specialist routers I
   listed by name — and wt-ops, the one with the generic CRUD and both money
   endpoints, was not among them. Until this commit any authenticated user,
   including a `tenant` or an `owner`, could POST a payment. Now guarded, and
   verified with real tokens: tenant and owner get 403 on receipts, payouts,
   deletes, and even the dashboard read.

### Money: one writer, an append-only ledger (migration 0082)
`wt_invoices.paid_amount` and `wt_work_orders.provider_paid_amount` were
incremented in place — read, add, write — outside any transaction, by two
different routes with different rules (wt-ops would take a payment against a
DRAFT invoice; the invoice controller refuses). Two interleaved requests lose a
payment and nothing in the data shows it happened.

New `wt_money_events` table + `services/wtLedger.service.js`:
- every post locks the subject row `FOR UPDATE` inside one transaction
- balance is `SUM(amount)` over the rows; the old columns are now a CACHE
  recomputed from that sum, never incremented
- `amount` is SIGNED — a correction is a compensating row pointing at the
  original, never an edit or a delete, so the mistake and the fix both stay
- `idempotency_key` unique per branch; a double-click returns the ORIGINAL row
  and the response says `duplicate: true` so the UI does not claim a second
  payment landed
- existing history was BACKFILLED (8 rows: 2 invoice receipts, 6 payouts), so
  the ledger is complete from day one rather than from deployment

`/wt-ops/invoices/:id/record-payment` and `/wt-ops/work-orders/:id/pay-provider`
now return **410** naming their replacement. Payouts moved to the work-order
controller behind `canTransact`. Reversals sit behind `canAdminister`.

### Lifecycle: `services/wtStateMachine.service.js`
Transitions for quotation / work order / invoice / AMC declared once. Two kinds
of obstacle, deliberately distinct: **blockers** refuse (they would corrupt the
record or break a contract), **warnings** proceed with a note — the advisory
pattern from `wtProject.stageWarning()`, because software that refuses to record
what actually happened gets worked around in a spreadsheet.
`GET /:code/actions` lets the UI ask instead of reimplementing the rules.

**This closed a real hole:** `invoice.void` previously voided unconditionally and
set `outstanding = 0` — including on an invoice the client had already paid. The
receivable vanished while the receipts stayed in the ledger, and nothing said so.
It is now refused with "reverse the receipt first".

### Verified
- **86 Phase 2 assertions, 0 failures**, across three suites against the real DB:
  - 8 concurrent identical posts → exactly 1 ledger row, 7 told "duplicate"
  - 5 identical posts with NO key → still collapse to 1 (derived key)
  - 4 genuinely different concurrent payments → all 4 land, no lost update
  - two requests racing for the last 4,400 → exactly one wins, never over-collects
  - reversal nets the balance, original row untouched, cannot be replayed or stacked
  - a corrupted cache recomputes back to the ledger sum
  - tenant/owner 403 on every money route
- Phase 1 suite re-run: 30/30 still pass (I reported this as "28/28" last time —
  the correct count is 30; nothing else about that report changes).
- Route inventory: no route dropped. All 11 modules `require()` and mount.
- `npm run build` clean at 1970 modules.

### NOT done in this phase
- Project and enquiry transitions are declared nowhere yet; only the four
  entities above are in the machine.
- The `/wt-ops/:entity/advance` generic pipeline still exists for the non-
  specialist entities and does not consult the state machine.
- Browser QA still outstanding — verification here is API-level with minted
  tokens, which is stronger for the role matrix than clicking, but no one has
  yet watched the Payments screen post a receipt through the new endpoint.

---

## 2026-08-12 — Claude — COMPLETED: Water Tank Phase 3 (catalogue integrity)

Branch `water-tank/phase-0-baseline`.

### A plan item I did NOT do, and why
The plan's item 9 was "consolidate the 28 `water_tank` items onto the 41
`water_tank_csa`, retire the legacy vertical". I checked the premise before
acting on it and it does not hold:

- `water_tank_csa` is ALREADY the only catalogue this module reads. Every
  water-tank consumer — quotations, agreements, invoices, projects, AMC, intake,
  work-order docs — queries `water_tank_csa`. There is no competing list here.
- The 28 `water_tank` items are **Property Care's** catalogue. They are
  referenced by 24 live records (`care_work_orders` 15, `care_quotations` 6,
  `care_amc_contracts` 2, `care_enquiries` 1), most recent activity 2026-08-09,
  and `/property-care/*` is still fully routed in App.jsx.

Retiring that vertical would have broken a live module outside this scope. Two
catalogues exist because there are two service lines, not because of drift.
**Not done deliberately** — if consolidation is genuinely wanted it is a Property
Care migration and needs its own decision.

### What was actually broken — verified by reproducing it first
I changed a price, renamed an item and archived one on the real database and
watched what happened to a Schedule C:

| Manipulation | Before |
|---|---|
| Rename an item | The name AND unit were **rewritten** on any recomputed Schedule C |
| Archive an item | Its line **silently vanished** — 2 lines in, 1 line out, no error |
| Change a price | Stored `agreed_price` held (this part was already safe) |
| Delete an item | Allowed unconditionally, even under signed contract |

The disappearing line is the worst of these: a client's agreed scope shrinking
with nothing looking wrong. Cause was `wtCustomerAgreement.computePricing()`:
`const line = byCode[s.code]; if (!line) return null; ... {...line}` — it
resolved every line against the LIVE catalogue and dropped what it could not find.

Stored quotation lines were tested too and do NOT drift; they already snapshot
code/name/unit/price. The exposure was specifically on recompute.

### Built
- **`services/wtCatalogue.service.js`** — `resolveLine()` reads a line's own
  snapshot first and treats the catalogue as fallback; a withdrawn item renders
  flagged `orphaned` instead of disappearing. Plus usage counting, append-only
  history, guarded create/update/archive/restore/clone/delete.
- **Migration 0083** `wt_catalogue_history` — every price/name/status change with
  who, when, why and an `effective_from`, so "what did this cost in March" is
  answerable. Backfilled an opening row per existing item.
- **`computePricing` fixed** — resolves through the snapshot, and looks items up
  INCLUDING archived rows so legacy lines (code only, no snapshot) also survive.
  The picker still offers active items only.
- **`/api/wt-catalogue`** + a real editor screen at `/water-tank/catalogue`:
  usage shown next to every row, price history with reason, archive as the
  normal removal, Delete shown ONLY for items nothing has priced against.
- **Closed the bypass**: the shared `/service-catalog/items/:id` DELETE
  hard-destroyed with no check. It now refuses for `water_tank_csa` items in use
  and names archiving. Other verticals keep their existing behaviour — I have not
  verified how to count usage for them and did not want to add an unproven guard.

### A real bug found by the tests, not by review
`priceOn()` returned the SUPERSEDED price intermittently. `changed_at` has
one-second resolution, so two edits in the same second tied on
`(effective_from, changed_at)` and MySQL was free to return either — and did.
Added `id DESC` as the final tiebreak. Confirmed stable over three consecutive
runs; before the fix it passed once and failed once on identical input.

### Verified — 182 assertions, 0 failures
- Phase 3: 36 service-level + 30 over HTTP. The rename/archive manipulations that
  previously corrupted a Schedule C now hold name, unit, list-price-as-at-agreement,
  agreed price and the contract total (8400 before and after).
- Regression: Phase 1 30/30, Phase 2 30+25+31, all still green.
- Role guards: tenant and owner 403 on read and on every write.
- Route inventory: nothing dropped. All 12 route modules load and mount.
- `npm run build` clean, 1971 modules.

### NOT done
- Quotation and work-order builders do not yet WRITE the new `snapshot` field
  onto their lines — they still store code/name/unit/price, which the resolver
  reads as a partial snapshot. New agreements are protected via the archived-
  inclusive lookup; full snapshotting of those two builders is a follow-up.
- Browser QA of the new editor screen.

---

## 2026-08-12 — Claude — COMPLETED: Water Tank Phase 4 (navigation + work queue)

Branch `water-tank/phase-0-baseline`.

### Grouped navigation with badges that mean something
Eighteen flat sidebar links became **8 collapsible groups** (Home · Sales &
Intake · Delivery · Contracts · Providers · Finance · Assurance ·
Administration), collapsed state kept in localStorage, and a group containing the
current page opens regardless of that state. A collapsed group surfaces its
total on the header so nothing can hide behind it. `WT_NAV` is now DERIVED from
the groups, so adding a screen is one edit, not two.

Badges count **what is waiting on you**, never how many rows exist. "Invoices 48"
is the same number tomorrow whether you worked or not, so it stops being read;
"Invoices 9" that falls to zero as you send them is worth a glance.

### New: `services/wtWorkQueue.service.js` + `/wt-ops/work-queue`
Eleven queues across intake, signature, delivery, money and care — all built
from data that already exists, no new status fields. One query serves both the
sidebar badges and the new **My Work Queue** screen, so they cannot disagree.
Live figures on this database: 69 records waiting, 26 of them past a promised date.

**A bug I introduced and caught in the same sitting:** the first version summed
each destination's queues, so a work order that is both unassigned AND overdue
counted twice — the sidebar read 24 where 20 records need attention, and
complaints read 3 for 2. Badges now count DISTINCT record ids. An inflated badge
is worse than no badge, because it trains the operator to ignore it.

**A second thing caught by looking rather than assuming:** I had written the
envelope filter as `sent | partially_signed | in_progress`. `in_progress` is not
a status this system uses, and `viewed` — the client opened the document and did
not sign, precisely the state worth chasing — is. It would have hidden 12 of the
30 live envelopes.

### AMC detail route
`/water-tank/amc/:code` — the register's rows, its row actions and the command
palette now open a real page instead of a drawer, so a contract can be linked,
bookmarked and sent to a colleague. Visit plan with overdue highlighting,
derived billing against the invoices raised, contract/client/site/cover panels,
and renewal.

Two things I got wrong by assuming and fixed by reading the actual code:
- The renew endpoint returns `amc` = the contract just SUPERSEDED and `renewed`
  = the new one. Following `amc` would have left the operator staring at the
  expired term. Now follows `renewed`.
- `AmcForm` is create-only (`useSearchParams`, no `useParams`), so the
  `/amc/:code/edit` route I had wired would have rendered a blank wizard.
  Replaced with an edit drawer that PATCHes what actually changes mid-term
  (status, dates, money, renewal intent) — deliberately NOT package or visit mix,
  since regenerating a visit plan would rewrite work already delivered.

### Agreement URLs canonicalised
`/water-tank/agreements/customer` and `/water-tank/agreements/provider/*` are now
canonical; the old `/agreements/water-tank-*` paths redirect. The redirect
preserves the query string and substitutes route params — several links carry
`?project=WTCM-P0022`, and a bare `<Navigate>` drops it, handing the user an
empty agreement builder. 21 internal call sites updated to the canonical URLs.

`ui/Layout.jsx` and `WtCustomerAgreements.jsx` were **left untouched** — another
agent has them modified. Their old links keep working through the redirects.

### Verified — 223 assertions, 0 failures
- Phase 4: 41, including every queue count recomputed independently from raw rows
  (unassigned 8, draft invoices 9, open complaints 2 — all matching), no settled
  invoice reported overdue, all 20 nav destinations resolving to real routes, and
  no screen still pointing at a legacy agreement URL.
- Regression: Phase 1 30/30, Phase 2 30+25+31, Phase 3 36+30. All green.
- Role guards: tenant and owner 403 on the work queue.
- `npm run build` clean at 1973 modules.

### NOT done
- Detail ROUTES for complaints, warranties, incidents and service reports. They
  have working drawers on their registers; AMC was the one whose contract, visit
  plan and renewal genuinely needed a page. The rest are still not linkable.
- Role-aware hiding of nav destinations. The API refuses what a role may not do
  (verified in Phases 1–3), but the sidebar still shows every link to everyone.
- The dashboard KPI rework (plan item 17) — deferred with the rest of Phase 5.
- Browser QA of the grouped sidebar and the two new screens.

---

## 2026-08-13 — Claude — COMPLETED: Phase 5 + the Phase 4 leftovers

Branch `water-tank/phase-0-baseline`. Everything listed as "not done" at the end
of Phase 4 is now done, plus Phase 5's calendar and dashboard rework.

### Unified calendar — `services/wtCalendar.service.js` + `/water-tank/calendar`
Four scheduled things, each previously on its own screen: assessment dates, work
order target/scheduled dates, AMC visit plans and invoice due dates. The AMC plan
was the sharpest cost — it generates a year of dated rows the moment a contract
activates and nothing ever showed them beside anything else, so a week with four
AMC visits and two assessments looked empty until you opened two registers.
28 events on this database, 12 overdue, 4 unassigned. Month grid + agenda, filter
by kind, and "overdue" means the date passed AND the thing did not happen — a
completed job is never flagged.

No new scheduling model. It reads dates that already exist.

### Dashboard rework
Action Centre moved ABOVE the headline figures — what needs a person today is the
reason to open the screen. Every KPI now lands on the ROWS IT COUNTED via a new
`useUrlTab` hook, instead of the bare register.

**Caught by verifying rather than assuming:** I first wrote the projects KPI as
`?tab=Active`. That register's statuses are Open / On Hold / Completed /
Cancelled — there is no "Active", so the link would have silently done nothing
and no build or type check would have said so. The test now checks every KPI's
filter value against the target register's own status constant.

### Detail routes for the registers that had none
`useRoutedRecord` in common.jsx backs all of them, so there is one hook rather
than four copies. `useFocusedRecord` (?focus=CODE) deletes the param after
jumping — right for the command palette, wrong for a location — so records now
live in the path:
  /water-tank/complaints/:code
  /water-tank/reports/:code
  /water-tank/registers/:kind and /registers/:kind/:code
Warranties and incidents get separate base paths so their codes cannot collide,
and the Registers tab now lives in the URL too, so the back button walks tabs.

### Role-aware navigation
New `capabilitiesFor(role)` in wtRoles.js and `GET /wt-ops/capabilities`. The
console asks; it does NOT restate any role list — two copies of an authorization
rule is one rule and one bug waiting to happen. Finance destinations need
`transact`, the price schedule needs `bind`. A group with nothing left is not
drawn as an empty heading, and the command palette is filtered by the same
predicate so it cannot offer a hidden destination.
Default is permissive until capabilities load: hiding is a courtesy, the API is
what refuses.

### Browser QA — done, and it found something
Signed in and walked it. Grouped sidebar, badges, collapse (SALES & INTAKE
collapsed correctly surfaces its total 6), calendar month grid, work queue,
`?tab=Overdue` landing on the right tab, and all three new detail routes
resolving from a pasted URL. No console errors.

**Found by looking at the screen:** the AMC page showed a green "Active" pill
directly beside "This contract expired on Dec 31, 2024. Cover has lapsed." Both
were truthful — one is the stored status, the other derived from the end date —
but together they read as a bug. The mismatch is now named explicitly rather
than left for the operator to reconcile. No test would have caught that; it
needed eyes.

### Verified — 271 assertions, 0 failures
Phase 5: 48, including calendar counts recomputed independently from raw rows,
the capabilities endpoint matching the middleware exactly for every role present,
and every dashboard KPI filter checked against the real status list.
Regression: Phase 1 30/30, Phase 2 30+25+31, Phase 3 36+30, Phase 4 41.
Build clean at 1974 modules. No route dropped.

### NOT done
- Phase 6 (provider and customer portals) and Phase 7 (notifications, automated
  money-path tests, release QA) remain.
- `ui/Layout.jsx` and `WtCustomerAgreements.jsx` are still another agent's;
  their legacy agreement links keep working through the Phase 4 redirects.

---

## 2026-08-13 — Claude — COMPLETED: Water Tank Phase 6 (provider & customer portals)

Branch `water-tank/phase-0-baseline`. External parties can now do their own
steps. Until this, a provider accepted a job by telephoning the office who
clicked Accept for them, and a client asked for their invoice and someone
emailed a PDF — staff impersonating someone else, and for anything meant to be
the other party's decision, not really their decision at all.

### The security model
Migration 0084 adds `portal_token_hash` / `portal_token_expires_at` /
`portal_last_seen_at` / `portal_revoked_at` to wt_providers and wt_clients, plus
an append-only `wt_portal_events` audit table. The pattern is the one already
proven by provider onboarding: a 32-byte token is shown ONCE and only its
SHA-256 is stored, so a database dump yields no working links.

Deliberately SEPARATE columns from `onboarding_token_hash`: onboarding expires
when the application completes, portal access outlives it. Sharing one column
would mean finishing onboarding either kills portal access or silently extends
an application link forever.

### The rule the whole service is built around
**The portal returns a WHITELIST, never a record.** Every other API here hands
back rows and lets the caller pick — fine behind an admin session, dangerous
when the payload leaves the building. Two leaks are structurally prevented
rather than remembered:

- A CLIENT never sees `provider_fee`, `ss_fee`, `provider_paid_amount` or
  `payout_status`. Those sit on the work order right beside everything the
  client legitimately sees, so returning the row would publish Seventh Sky's
  margin on the client's own job.
- A PROVIDER never sees what the client was charged — no invoice figures, no
  contract value. Only their own fee and what has been paid against it.

Adding a column to a model therefore cannot widen a portal payload by accident.

Portal actions go through `wtStateMachine`, the same table the admin API obeys,
so a provider accepting through the portal is subject to exactly the rules as an
operator accepting on their behalf. Completion files a report with status
**Submitted, not approved** — the portal lets a provider report their work; it
does not let them sign it off (SOP-01 Sec. 9 Step 11 keeps verification with
Seventh Sky).

### Assumptions I got wrong and fixed by checking the models
Four field names I wrote from memory did not exist: `WtWorkOrder.specific_service`
and `.photos` (the real columns are `scope`, `service_selections` and boolean
evidence flags; reports live in `WtServiceReport`), `WtProvider.specialty`
(it is `approved_services`), `WtQuotation.decision_date` (does not exist), and
`EnvelopeSigner.party_role` (the column is `role`). Each was caught by querying
`rawAttributes` before running anything.

### A test that was passing without testing anything
The first run reported 43/43 — but the two most important checks had SILENTLY
SKIPPED for want of data: "a provider cannot touch another provider's job" and
"the state machine still governs portal actions". The ownership boundary is the
entire security model of the provider portal, and it was verifying nothing.
Rebuilt both as explicit fixtures rather than hunting for convenient rows, and
added the happy path so the refusals cannot pass by accident. 55/55 now, with
the fixtures torn down afterwards (confirmed: 0 rows and 0 live tokens left).

### Verified — 326 assertions, 0 failures
Phase 6's 55 include: only a hash stored and it matches the issued token; the
status endpoint never returns the hash; identical error text for unknown and
wrong-type tokens so probing learns nothing; margin fields absent from real
client payloads and invoice figures absent from real provider payloads; cross-
party tokens refused; another provider's work order refused AND unchanged AND
not reassigned; an already-completed job refused with the state machine's own
wording; revoke clearing the hash so it matches nothing; re-issue invalidating
the previous link; tenant/owner refused issuing and accounts refused revoking.
Regression: Phases 1–5 all green. Build clean at 1976 modules.

### NOT done
- Photo UPLOAD from the portal. Completion accepts photo URLs and files the
  report; wiring multipart upload to the existing upload service is a follow-up.
- Email delivery of portal links — they are copied by hand from the admin card.
  Phase 7 wires SMTP.
- Browser QA of the two portal screens.

---

## 2026-08-13 — Claude — BUILD: portal ACCOUNTS (email + password, auto-provisioned)

Extends Phase 6. The magic link is right for one-off access and wrong for a
lasting relationship: it expires, cannot be remembered, forwarding it hands over
everything, and the holder can change nothing about their own access. Providers
and clients now get a real login, and both mechanisms coexist.

### What happens automatically
When a provider's MASTER AGREEMENT or a client's SERVICE AGREEMENT completes,
`partyRoleActivation` now also creates the account and emails the credentials.
Both hooks are best-effort and sit outside what can roll the signature back — a
fully executed agreement must never fail because SMTP was down or no email was
on file.

### Accounts live in the EXISTING users table
Roles `wt_provider` and `wt_client`, routed to `/portal` by PORTAL_PATHS. A
parallel identity system is how a codebase ends up with two ways to authenticate
and only one of them patched when something is found.

### Password self-service — which did not exist anywhere, for any role
Before this a password could only be set FOR someone by an administrator, so
every forgotten password was a phone call. External parties cannot ring the
office, so `/auth/forgot-password`, `/auth/reset-password` and
`/auth/change-password` were added; staff get the same capability as a result.

- The temporary password is generated, emailed, and stored only as a bcrypt
  hash. `must_change_password` forces a replacement at first sign-in, so a
  password that travelled through an inbox stops working once used.
- The gate lives in `RequireAuth`, not on the login screen — it has to hold for
  EVERY authenticated destination, or a bookmarked deep link walks past it.
- Reset tokens are stored as SHA-256, single-use, one-hour expiry.
- forgot-password answers identically for a known and an unknown address.
  Enumeration protection is the identical response, not the rate limit.

### An email already in use is REFUSED, never repointed
Attaching a party to an existing account would silently give that person sight
of records that are not theirs, and a collision usually means a typo. 409 with
an explanation instead.

### Settings → Portal Accounts
New register at `/water-tank/portal-accounts`, linked from Settings and the
sidebar. Lists every provider and client with account state, INCLUDING those who
cannot be invited, carrying the reason ("No email address on file") — hiding
them would leave an operator wondering why someone never appears. Create access,
reset password, suspend, restore. The temporary password is shown once, as a
fallback for when the email does not arrive.

### Two things the tests found
- **My test, not the code:** the reset tests used 20-character stand-in tokens,
  and `completeReset` correctly refuses anything under 32 before it looks
  anything up. Real tokens are 64 hex chars. Verified the service directly
  before changing anything, rather than "fixing" working code.
- **The code, genuinely:** re-running hit 429. The limiter was doing its job,
  but 10/hour PER IP covers a whole office behind one NAT address — a handful of
  colleagues resetting on the same morning would lock each other out. Split by
  purpose: forgot-password (sends mail, worth throttling) 20/hour;
  reset-password (sends nothing, already needs a valid single-use token) 60/hour.

### Verified — 61 assertions for this feature, 0 failures; 387 across the module
Including: the password stored hashed and matching what was issued; provisioning
idempotent; a clashing email refused AND the original link intact AND the
clashing party given nothing; the emailed password ceasing to work after first
change while the chosen one works; a portal login refused on three admin
endpoints and a staff login refused on the portal endpoint; suspension blocking
sign-in without breaking the link; reset tokens single-use and expiring with 410.
All previous suites still green. Build clean at 1979 modules.

### NOT done
- Browser QA of the new screens (Portal Accounts, forced change, forgot/reset).
- Email delivery is best-effort and unverified end to end here — SMTP is
  configured, but no message was actually sent to a real inbox in testing.

---

## 2026-08-13 — Claude — COMPLETED: Phase 7 (notifications, money tests, release QA)

Branch `water-tank/phase-0-baseline`. The last phase, plus the three portal
leftovers.

### Notifications — SMTP was configured all along and unused
`services/wtNotify.service.js` + migration 0087. Seven templates wired to real
events: quotation sent, invoice issued, payment received, invoice overdue, AMC
visit due, AMC expiring, work order assigned, provider paid. A sweep handles the
things that become true because a date passed, and `GET /wt-ops/notifications`
previews exactly what WOULD go out before `POST` sends it — these reach real
clients, so seeing the list first matters more than one-endpoint convenience.

**Corrected a false comment while wiring it.** `invoice.send` carried
"SMTP is not configured in this environment", marked the invoice Sent and sent
nothing. SMTP has been configured throughout; the claim was stale. An invoice
recorded as sent that nobody received is the worst thing to be wrong about here.
Confirmed working end to end — `[COMM_SERVICE] Email sent via info@` in the log,
which also closes the "email delivery unverified" gap left after portal accounts.

### A bug the tests found that no review would have
De-duplication originally wrote the event key into `wt_comm_log.ref_code`, a
**VARCHAR(30)**. The keys are longer, MySQL truncated silently, and the lookup
therefore never matched — **de-duplication never worked at all.** Every sweep
would have emailed the same client about the same overdue invoice again, every
run, forever. Moved to `wt_notifications` with a UNIQUE INDEX, where the INSERT
itself is the claim, so it is also race-safe: SELECT-then-INSERT would let two
concurrent sweeps both send.

Then a second bug in the fix: `claim()` matched the duplicate error by grepping
`e.message`, but Sequelize puts "must be unique" in `errors[0].message` and
leaves `message` generic — so it rethrew as an unhandled rejection instead of
suppressing. Now matched on `e.name` and the driver's `ER_DUP_ENTRY`. Verified:
5 concurrent sends of one event produce exactly 1 email and 1 claim row.

### Portal leftovers, all three
- **Photo upload** (migration 0086 + `PhotoPicker`): multipart straight from a
  phone camera (`capture="environment"`), forced into the PRIVATE documents
  folder because site photos show a client's premises. One shared handler for
  the token and session paths, so the ownership check cannot differ. Both
  complete handlers fold the uploaded photos into the filed report.
- **Portal links are emailed** rather than copied by hand — the last
  hand-carried step. Still returned once as a fallback.
- **Browser QA**, which earned its keep again: three layout collisions only
  visible on screen. `gap: 0` on the work-order grid rendered
  "Oct 05, 2024Booked for" as one run-on line; the invoice table header read
  "OutstandingStatus"; the receipt amount butted into its date. All three fixed
  and re-verified. No console errors.

### Money-path tests, as the plan asked for
44 assertions covering what Phase 2's burst test could not: notifications firing
twice, a receipt emailed for money that was never posted, a full lifecycle
reconciling end to end (three postings + a reversal, checked against BOTH the
ledger and the cache at every step), the journal agreeing with the invoice, and
the provider payout path including over-payment refusal.

### Release QA — 431 assertions across 11 suites, 0 failures
Phase 1 30 · Phase 2 30+25+31 · Phase 3 36+30 · Phase 4 41 · Phase 5 48 ·
Phase 6 55 · portal accounts 61 · Phase 7 44. No route dropped since the Phase 1
baseline. Build clean. Both portals walked in a real browser.

### NOT done
- The sweep is manual (preview then send). Putting it on a schedule is a
  deployment decision — a cron that emails clients should be switched on
  deliberately, not by a developer.
- Notification templates are English only.

---

## COMPLETED — Warranty & Issues rework (warranties · complaints · incidents)
**Agent:** Claude (Water Tank console) · **Date:** 2026-08-13
**Files:** `backend/migrations/0089-registers-job-context.js`,
`backend/models/waterTankOps.js`, `backend/services/wtJobContext.service.js` (new),
`backend/controllers/waterTankRegisters.controller.js` (new),
`backend/controllers/publicWtPortal.controller.js`,
`backend/controllers/waterTankProviders.controller.js`,
`backend/routes/waterTankOps.routes.js`, `backend/routes/publicWtPortal.routes.js`,
`backend/routes/wtPortalSession.routes.js`,
`admin-portal/src/screens/watertank/JobPicker.jsx` (new),
`admin-portal/src/screens/watertank/RegisterModal.jsx` (new),
`admin-portal/src/screens/watertank/Registers.jsx`,
`admin-portal/src/screens/watertank/ServiceReportModal.jsx`,
`admin-portal/src/screens/watertank/Portal.jsx`

### The defect
All three registers captured their context as free text: the client typed by
hand, the work order typed by hand, no property field at all. A warranty could
therefore cover a client who was not the client on the job it came from, and
nothing objected. Separately, a customer complaint raised through the portal
wrote a line to the communication log and never appeared on the complaints
register — the one place anyone reviews for unresolved problems.

### The fix
Same idea as the service report rework: **all three are records ABOUT A JOB.**
The caller picks the work order; the server resolves client, project, property
and provider from it. `wtJobContext.service` is the single implementation of
that resolution — `reportJobs` was refactored to delegate to it rather than keep
a second copy, because two copies are two chances to answer differently.

- Migration 0089 adds `work_order_id`, `client_code`, `site_address`,
  `raised_via`, `logged_by` to all three; complaints also get `details`,
  `resolution`, `project_id`, `work_order_code`, `provider_name`.
- `POST /wt-ops/registers/:register` resolves the job and IGNORES client fields
  in the request body. A warranty or incident with no job is refused (400); a
  job that does not exist is refused (404) rather than saved half-filled.
- A complaint may stand alone — a client can be unhappy about something that
  never became a work order, and refusing that only means it goes unrecorded.
- Warranty cover starts the day the work FINISHED and runs the standard period
  for its type, both adjustable. Complaint SLA follows severity (4/8/24/48 h)
  instead of being typed as free text like "6 Hours Left".
- `POST /public/wt-portal/:token/complaint` and `POST /wt-portal/complaint`
  create real register rows stamped `raised_via: 'client'`, scoped so a party
  can only complain about their own job. The portal has a complaint form, kept
  separate from the message box because they are not the same act.
- Reference lists (types, statuses, severities, cover periods) come from
  `/wt-ops/registers/reference`; the screens no longer carry their own copies.

### Verified
48 new assertions, plus the full suite re-run: **491 across 13 suites, 0 failures.**
Two real bugs were caught by the new tests before commit: warranty cover starting
today instead of at job completion, and a `DATE` column returning a Date object
where a `YYYY-MM-DD` string was assumed, which made every derived expiry invalid.
Browser QA: all three modals open centred, the job search resolves client /
project / provider, a warranty saved end to end (removed afterwards), and the
customer portal complaint form renders with the client's own jobs. Build clean.

### NOT done
- The Complaints desk screen (`/water-tank/complaints`) still has its own older
  create path; the register now has the good one. Consolidating them is a
  follow-up.
- Warranty claims (calling on cover) are still a status change, not a workflow.

---

## COMPLETED — Record Payment, Bulk Payment and Client Refunds
**Agent:** Claude (Water Tank console) · **Date:** 2026-08-13
**Files:** `backend/migrations/0090-money-batch-and-refunds.js` (new),
`backend/models/waterTankOps.js`, `backend/services/wtLedger.service.js`,
`backend/controllers/waterTankInvoice.controller.js`,
`backend/routes/waterTankInvoice.routes.js`,
`admin-portal/src/screens/watertank/PaymentModal.jsx` (new),
`admin-portal/src/screens/watertank/BulkPaymentModal.jsx` (new),
`admin-portal/src/screens/watertank/Invoices.jsx`,
`admin-portal/src/screens/watertank/InvoiceEditor.jsx`,
`admin-portal/src/screens/watertank/Payments.jsx`

### What was found first
The existing "Record Payment" on the invoice register was a right-hand drawer
that PATCHed `outstanding` and `status` straight onto the invoice row. Two
things were wrong: it bypassed the ledger entirely, and — since Phase 1 closed
generic invoice writes — it had been answering **405** and doing nothing at all.
The inline Status and Provider Payout dropdowns on the same table used the same
dead path. The button had been broken, silently, not merely unsafe.

### What was built
- **Centred Record Payment modal**, replacing the drawer, posting through
  `/wt-invoices/:code/payments` — the single money writer. Used by BOTH the
  register and the invoice detail page, which previously had two different
  payment forms with two validations.
- **Idempotency from the UI.** The ledger has always accepted a key; nothing
  sent one. The modal mints one per opening, so a double-click, a slow network
  and a Retry all resolve to one receipt. Proven with four concurrent requests:
  all answered, one posted.
- **Method-aware references.** bKash/Nagad/Rocket/Bank/Cheque require one and
  are asked for it by its real name (TrxID, cheque number); cash is not. The
  list comes from the API so the screen cannot drift from what reconciliation
  expects.
- **Duplicate warning before committing**, not after.
- **Bulk payment**: one client, one lump sum, several invoices. Starts from a
  new `/wt-invoices/collections` (who owes what, grouped by client code — a name
  is not an identity), offers oldest-first allocation, and refuses to post while
  a single taka is unallocated. Posts atomically: all invoices update or none.
  Every row carries a shared `batch_ref`, so a statement shows ONE payment
  across four invoices rather than four payments.
- **Client refunds**, deliberately separate from reversal. A reversal says the
  entry was wrong; a refund says the money arrived and we gave it back. They
  read differently on a client statement and reconcile differently against the
  bank, so `client_refund` is its own event type with its own reason column and
  its own direction. Bounded by what was actually received, inside the lock.
  Refunding raises the outstanding balance again, which is correct.
- **Role split honoured**: `accounts` can take money in and post a bulk payment;
  refunding and reversing sit with administrators. Proven with fixture users.

### Verified
66 new assertions; full suite **611 across 16 suites, 0 failures**. Balances are
asserted against the LEDGER, never the cached column. Two of my own mistakes were
caught by writing the tests: a role expectation that was wrong (a
`property_manager` correctly cannot touch cash — `canTransact` is finance-only),
and a fixture that pre-stringified a JSON column, which double-encoded it.

### NOT done
- **Browser QA of the three screens.** The Chrome extension disconnected partway
  through this session and would not reconnect, so the modals have not been
  opened on screen. Everything is API- and build-verified; the layout is not.
- An invoice is worth the sum of its LINES. One live row (`INV-DD90495`) carries
  an amount of 100 with no line items, so it is worth zero and cannot take a
  payment. The modal now explains this instead of showing "exceeds the
  outstanding balance of 0", but the row itself still needs its lines filled in.
- Overpayment still cannot be parked as a client credit balance; the ledger
  refuses to take more than is owed. A credit-note subsystem is a separate piece
  of work, and inventing somewhere to put unexplained money would be worse.

---

## COMPLETED — Disbursements, payment runs and branded vouchers
**Agent:** Claude (Water Tank console) · **Date:** 2026-08-13
**Files:** `backend/migrations/0091-disbursements-and-vouchers.js` (new),
`backend/models/waterTankOps.js`, `backend/services/wtLedger.service.js`,
`backend/services/wtVoucher.service.js` (new),
`backend/controllers/waterTankDisbursement.controller.js` (new),
`backend/routes/waterTankDisbursement.routes.js` (new), `backend/server.js`,
`admin-portal/src/screens/watertank/DisbursementModal.jsx` (new),
`admin-portal/src/screens/watertank/BulkDisbursementModal.jsx` (new),
`admin-portal/src/screens/watertank/Payments.jsx`

### The gap, as the operator named it
"Sometimes some payments do not always go to service provider — it directly
relates to Seventh Sky." Exactly right, and the software had nowhere to put
that. Chemicals, transport, government fees and day labour either went
unrecorded or landed in `wt_project_disbursements`, a table the money ledger has
never read. So the Payments screen's `disbursed` counted provider payouts only,
and **the margin it derived was overstated by everything the business spent on
its own account.** That is the defect this closes; the buttons are the surface.

### What was built
- **Two kinds of disbursement, one register.** A PROVIDER PAYOUT keeps its gates
  (the signed agreement's payout trigger, unchanged). A DIRECT COST has a
  free-text payee — the whole point is that the payee is on no list — and no
  gate, because the money has already gone and refusing to record it would only
  hide it. `project_code` became nullable: a drum of hypochlorite covers six
  jobs, and forcing a project means someone picks one at random.
- **Both write to the ledger**, so the journal, the margin and the register
  cannot disagree. `direct_disbursement` is a real event type with its own
  reversal, and reversing one now updates the register row — previously the
  branch did not exist, so a reversed row would have kept reading "Paid".
- **Branded payment voucher** for every payment, provider payouts included —
  they had none, so a contractor was paid and signed nothing. Amount in words in
  Bangladeshi numbering (lakh/crore, not million), a PAID mark carrying the
  method, and three signature blocks: prepared, approved, received.
- **Payment run**: several disbursements in one banking act, provider fees and
  direct costs together, atomic, sharing one batch reference, producing ONE
  document — a summary page for the bank line, then a voucher per recipient.
  Blocked payouts are shown with their reason rather than hidden.
- **Direct Costs tab** on the Payments screen with a spend-by-category
  breakdown, and the margin card corrected to subtract direct costs.

### Two bugs found and fixed while here
- **Refunds corrupted the journal.** Refunds are stored negative (they hang off
  the invoice, whose balance must fall), but the journal summed raw amounts for
  outflows — so a refund *reduced* what the business appeared to have paid out.
  `cashOut()` now reconciles that in one place.
- **Journal totals were computed over the fetched page**, not the whole set.
  Correct today at 9 events; silently wrong past 200, with nothing on screen to
  say so. Totals now sum every matching row.

### Verified
69 new assertions; full suite **680 across 17 suites, 0 failures**. Vouchers are
checked by inflating the PDF and decoding its hex text — the first version
grepped raw bytes and "failed" on a perfectly good document, since pdfkit
deflates its streams and writes text as hex inside kerned TJ arrays. Sample
voucher and run PDFs rendered and read back field by field.

### NOT done / needs attention
- **Browser QA.** The Chrome extension has been disconnected for two sessions
  and would not reconnect. The screens are API-, build- and PDF-verified but
  have not been opened.
- **Company details are missing from Settings** — address, phone, BIN, TIN and
  logo are all unset, so every voucher, invoice and agreement goes out with only
  a name and an email in the letterhead. Nothing to fix in code; it is five
  minutes in Settings and it materially improves every outbound document.
- Direct costs marked "rechargeable" are flagged but do not raise a client
  invoice by themselves; wiring that to invoicing is a separate piece of work.

---

## COMPLETED — Accounting reports (5), with branded PDFs and date filters
**Agent:** Claude (Water Tank console) · **Date:** 2026-08-13
**Files:** `backend/services/wtReports.service.js` (new),
`backend/services/wtReportPdf.service.js` (new),
`backend/controllers/waterTankReports.controller.js` (new),
`backend/routes/waterTankReports.routes.js` (new), `backend/server.js`,
`admin-portal/src/screens/watertank/Reports.jsx` (new),
`admin-portal/src/screens/watertank/ReportView.jsx` (new),
`admin-portal/src/screens/watertank/WaterTankConsole.jsx`,
`admin-portal/src/screens/watertank/clients/ClientDashboard.jsx`,
`admin-portal/src/screens/watertank/providers/ProviderDetail.jsx`,
`admin-portal/src/screens/watertank/WorkOrderDetail.jsx`, `admin-portal/src/App.jsx`

### The shape of it
Five reports were asked for and a sixth will be asked for eventually, so this is
ONE engine with five definitions rather than five screens. Each definition
declares what it selects, its COLUMNS, and how it summarises. Three consequences,
all deliberate: the date filter cannot drift between reports (one resolver); the
table and the branded PDF cannot disagree about what is in them (neither owns
the column list); and the sixth report is a definition, not a screen plus an
endpoint plus a PDF builder plus a date picker.

Four of the five read the money ledger, so they are views of the same truth
rather than five independent tallies. That is asserted directly: money in and
money out on the bank statement must equal the money journal's own totals.

### Reports
1. **Client Payments** — receipts, refunds and corrections; refunds shown as
   money OUT, not as negative receipts. By client and by method.
2. **Provider Payouts** — by provider and by method.
3. **Seventh Sky Payments** — direct costs by category and payee, separating
   what is recoverable from clients from what the business absorbs.
4. **Service Completion** — jobs finished, days taken, on-time %, verified,
   contract value.
5. **Bank Statement** — every movement in date order with a running balance,
   carrying a real OPENING balance from everything before the range. A statement
   that starts from zero mid-year cannot be reconciled against an account.

Presets: today · yesterday · 7d · 14d · 30d · 1Y · custom from–to. Every report
downloads as a branded landscape PDF with headline figures, a totals row and a
breakdown page.

### Per-party dashboards
The client dashboard has a **Transactions** tab and the provider dashboard a
**Payouts** tab, both built by the SAME engine with a filter applied. A dashboard
total that disagreed with the report the same party is emailed would be worse
than no dashboard; two implementations guarantee that eventually.

### Three real bugs found by building this
- **Every date preset was off by one in Dhaka.** `iso()` formatted local midnight
  through `toISOString()`, and local midnight is 18:00 UTC the previous day — so
  "Today" showed yesterday's takings. Silent, and the worst failure a reporting
  module can have.
- **Four provider payouts have a null `received_on`,** so filtering on it made
  them invisible to every dated report including the bank statement. Now
  COALESCEd to the entry date: slightly wrong beats absent.
- **The statement was not chronological** — null-dated rows sorted first, so the
  running balance went 12 Aug, 12 Aug, 09 Aug, 17 Aug. Ordered by the same
  coalesced date now.

### Routing
`/water-tank/reports` is now the accounting hub; Service Reports moved to
`/water-tank/service-reports`. Six links across four screens were repointed, and
old `/reports/RPT-xxxx` links are recognised by prefix and forwarded, so nothing
bookmarked breaks. Both entries sit in the sidebar — they are different things.

### Verified
64 new assertions; full suite **745 across 18 suites, 0 failures**. PDFs are
checked by inflating them and confirming every declared column heading is
printed, which is what stops the table and the print drifting apart. A filtered
PDF is asserted to say so on its face.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for three sessions.
  Everything is API-, build- and PDF-verified; the screens have not been opened.
- Reports are per-branch and not yet exportable to CSV/Excel — PDF only, as asked.
- The company address, phone and BIN are still unset in Settings, so report
  letterheads carry only a name and an email.

---

## COMPLETED — Client and provider portals rebuilt as full applications
**Agent:** Claude (Water Tank console) · **Date:** 2026-08-13
**Files:** `backend/services/wtPortal.service.js`,
`admin-portal/src/screens/watertank/Portal.jsx` (rewritten as a shell),
`admin-portal/src/screens/watertank/PortalClient.jsx` (new),
`admin-portal/src/screens/watertank/PortalProvider.jsx` (new),
`admin-portal/src/screens/watertank/portalBits.jsx` (new)

### What they were
Two single-scroll pages. The client saw quotations, invoices, a list of job
dates and a message box; the provider saw job cards with accept/schedule/
start/complete. Everything else the module knows about these two parties was
invisible to them.

### The sharpest gap
A client could RAISE a complaint from the portal — built last session — and then
had no way to see whether anything had happened to it. A button that appears to
do nothing is worse than no button. That loop is now closed: complaints appear
directly beneath the form with status, SLA and resolution.

### Client portal — nine sections
Overview · My property · Jobs · **Reports & photos** · Quotations · Invoices ·
AMC & warranty · **Requests & complaints** · Messages.

New: the service reports and site assessments for their own tanks WITH the
before/after photographs (the evidence they paid for, previously invisible);
tank profile and risks from the assessment; their complaints with live status;
their service requests; project progress; the message thread; their property
record; warranty expiry countdowns.

### Provider portal — seven sections
Overview · My jobs · **My reports** · **Earnings** · **Compliance** ·
**Performance** · Messages.

New: their agreement and rate card (what they are paid, when, and on what
trigger); a payout statement with voucher numbers so they can match their bank;
their own filed reports with photographs and Seventh Sky's review note;
compliance documents with a DAYS-REMAINING countdown; audits with corrective
actions; complaints and incidents about their work, with an explanation of why
it matters.

Compliance is the one that earns its keep. Lapsed cover is the commonest reason
a provider is suspended, the expiry date lives in Seventh Sky's system rather
than theirs, and the first they hear is being stood down. The countdown and the
banner prevent the whole event.

### Design decisions
- **Tabs, not a longer scroll.** These are applications now. Tabs wrap for a
  provider on a phone on a rooftop, and carry counts so a badge draws the eye.
- **Alert banners above the tabs** for the things that bite: lapsed compliance,
  overdue invoices, quotations blocking work, open complaints.
- **Shared chrome in `portalBits`.** When the two portals drift into two
  different-looking products, the next person to change one forgets the other.
- **Asymmetric disclosure, deliberately.** The provider sees Seventh Sky's
  review note on their own report — they need to know why it was sent back. The
  client does not: "photos slightly dark" reads as a botched job.

### Verified
86 new assertions; full suite **832 across 19 suites, 0 failures**. The leak
checks are the point and are exhaustive: the client payload contains no
`provider_fee`, no `ss_fee` and neither figure as a raw value; the provider
payload contains no invoice section and nothing the client was charged. Proven
structurally too — a secret written onto the work order, the client and the
provider records reaches neither portal, because every shape is an explicit
whitelist. The stored `file_url` on compliance documents is withheld rather than
re-served, since a token-authenticated path echo is a file-read primitive.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for four sessions.
  All API-, build- and leak-verified; not opened on screen.
- Clients cannot yet download signed agreements or work-order documents from the
  portal — only invoices. Wiring the document store needs its own access rules.
- No push/email digest of portal alerts; a provider still has to open the portal
  to see a lapsing certificate.

---

## COMPLETED — Short Term Stay opens as its own console; shared shell extracted
**Agent:** Claude (console pattern) · **Date:** 2026-08-13
**Files:** new `admin-portal/src/ui/ServiceConsole.jsx`,
new `admin-portal/src/config/consoles.js`,
new `admin-portal/src/screens/shortstay/ShortStayConsole.jsx`,
`admin-portal/src/screens/watertank/WaterTankConsole.jsx` (now a thin wrapper),
`admin-portal/src/screens/ShortStayHub.jsx`, `admin-portal/src/App.jsx`,
`admin-portal/src/ui/Layout.jsx`, plus link repointing in
`screens/shortstay/{Properties,ShortStayPropertyFile,ShortStayPropertyOnboarding}.jsx`

### Step 0 first: Short Term Stay was committed
Every STS file was untracked — ten models, six migrations, four route files,
three controllers, two services, sixteen screens, the public website pages. One
bad checkout from gone. Committed unchanged as a rollback point before anything
was restructured (commit "chore(short-stay): commit the Short Term Stay module").

### What changed
Water Tank opened as a separated console; Short Term Stay was one hub screen
inside the global admin Layout, navigated by `?tab=bookings`, with fifteen
children crowding the shared sidebar. Its screens were already real — only the
shell was missing.

- **`ui/ServiceConsole.jsx`** — the Water Tank shell with its five hard-coded
  seams (nav, brand, endpoints, storage key, CSS import) turned into a config.
  Both consoles now render through it; neither carries sidebar markup any more.
- **`config/consoles.js`** — one entry per vertical. Property Management adds
  itself here plus a route block, and gets the whole shell.
- **Theming without touching CSS.** The accent is an inline custom property on
  the console root, so Short Term Stay is amber over the same navy and no second
  stylesheet exists. `var(--wt-accent)` is used 450 times; it all follows.
- **Screens untouched.** All sixteen are written in `pm-design.css` (284 `pm-*`
  references, zero `wt-*`), so the shell hosts them via `contentClass: 'pm-scope'`
  rather than restyling sixteen files.

### Three defects fixed on the way
- **The console footer was hard-coded** to "Dhaka Ops Center /
  admin@seventhsky.com" and never read `useAuth()` — every operator saw somebody
  else's name in the corner of a console they were signed into.
- **`owner-disbursement` had no sidebar entry at all.** A working 153-line bulk
  payout screen reachable only from a button on Payments. It now has one, and a
  test asserts every hub tab is reachable from the nav so it cannot recur.
- **STS Agreements** sat in the global Documents section, away from its module.
  Now in the console's Agreements group (the old link still redirects).

### Verified
56 new assertions (`test-consoles.js`); full suite **888 across 20 suites, 0
failures**. The reachability assertion was proved by sabotage: removing the
owner-disbursement nav entry fails three assertions and names the screen.

Three older suites asserted sidebar behaviour by reading `WaterTankConsole.jsx`
and failed after the extraction. Each was checked against the new files before
being repointed — 8 groups, collapse memory, `inHere`, `groupTotal`, filtered
palette all still present. Stale locations, not regressions.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for five sessions.
  Build- and assertion-verified only; not opened on screen.
- **No badges or ⌘K search for Short Term Stay** — both need `work-queue` and
  `search` endpoints it does not have. The shell supports them the day they
  exist; until then its nav gates on `roles:` as it already did.
- The two known STS business-logic bugs are untouched and still open:
  `shortTermStay.service.js` ignores `fixed_monthly_fee` in owner statements,
  and Housekeeping has no "Awaiting QC" state.
- Property Management, Residential Sales, Commercial and Rural are unchanged.
  Sequencing note: the shell buys ~400 lines of reuse per vertical, but Water
  Tank has ~60 screens behind its sidebar while Commercial and Rural have zero
  dedicated screens between them. Short Term Stay was the right second console
  precisely because its screens already existed.

---

## COMPLETED — Owner disbursements: ledger, vouchers and payment runs
**Agent:** Claude (Short Term Stay) · **Date:** 2026-08-13
**Files:** new `backend/migrations/0092-sts-owner-disbursements.js`,
new `backend/models/shortStayMoney.js`, new `backend/services/stsLedger.service.js`,
new `backend/controllers/stsOwnerDisbursement.controller.js`,
new `backend/routes/stsOwnerDisbursement.routes.js`, `backend/server.js`,
`backend/services/shortTermStay.service.js` (fee bug), `backend/services/wtVoucher.service.js`,
new `admin-portal/src/screens/shortstay/OwnerPayDrawer.jsx`,
new `admin-portal/src/screens/shortstay/OwnerPaymentRunDrawer.jsx`,
`admin-portal/src/screens/shortstay/OwnerDisbursement.jsx`

### What paying an owner used to be
Three columns stamped on their statement and a status moved along an enum. That
records that money moved; it does not record the movement. It produced no
document for the owner, appeared in no journal, and **could not be undone** — a
paid statement could only go to `closed`.

The bulk path was worse: the screen looped one PATCH per owner counting
`ok++ / fail++`. If the third of eight failed, three owners were paid, five were
not, and the operator got "Disbursed 3 owners, 5 failed" with no way to tell
which — from a screen whose entire job is paying people.

### What it is now
The provider disbursement treatment, applied to owner money.

- **`sts_money_events`** — append-only, one transaction and one lock per post,
  idempotency key unique per branch, reversals as compensating rows. What an
  owner has been paid is SUM over their rows; the statement's own columns are a
  cache recomputed from it.
- **A SEPARATE ledger from `wt_money_events`, deliberately.** Water Tank's
  journal and bank statement query on branch alone with no vertical filter, so
  short-stay money in that table would silently change Water Tank's reported
  cash and margin. Two service lines, two sets of books — asserted directly.
- **Numbered branded voucher** (`OPV-nnnn`) per payment, and a **payment run**
  that settles several owners atomically under one batch reference, producing
  one document: a summary page for the bank line, then a voucher per owner.
- **The amount comes from the statement**, not from a box. Part payments are
  allowed and checked against what remains, so a statement cannot be paid twice
  over. Statements not yet sent are shown as blocked rather than hidden.

### Two defects fixed on the way
- **`fixed_monthly_fee` was ignored.** The fee applied `revenue_share_percent`
  alone, so an owner on a pure fixed retainer was charged NOTHING and the
  statement paid them the entire takings — Seventh Sky earning zero on that
  property, and the figure looking deliberate. Flagged in this log on 3 Aug and
  left; fixed now, because a disbursement system that pays the wrong number is
  worse than none.
- **The voucher letterhead was hard-coded** to "WATER TANK CLEANING &
  MAINTENANCE" — true while water tank was the only thing issuing vouchers, a
  small lie the moment a short-stay owner received one. It now follows the kind
  of payment. One voucher design still serves the whole company.

### Verified
69 new assertions; full suite **959 across 21 suites, 0 failures**. Balances are
asserted against the LEDGER, never the statement columns. Four concurrent
identical requests: all answered, one posted. A run whose second line is already
settled leaves the FIRST line unposted. A rendered owner voucher was read back
field by field.

Three of my own errors were caught by the tests rather than by me: the `due`
endpoint passed `scope.branch_id`, which is undefined for a super_admin;
the first test suite dated every payment in the future, so the API correctly
refused all of them; and two assertions grepped whole files including the
comments documenting the very fixes they were checking.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for six sessions.
  API-, build- and PDF-verified; not opened on screen.
- **The two ledgers now share a discipline but not an implementation.**
  Extracting a common append/reverse/balance core is worth doing, but as its own
  change with the money suites as the safety net — not folded into a feature.
- The single-owner `OwnerPayDrawer` is built and tested but not yet wired to a
  per-row button on the statements screen; the payment run covers the bulk case
  the request was about.
- Housekeeping still has no "Awaiting QC" state (needs an enum value).

---

## COMPLETED — Property Management opens as its own console (the third)
**Agent:** Claude (console pattern) · **Date:** 2026-08-13
**Files:** new `admin-portal/src/screens/PropertyMgmtConsole.jsx`,
`admin-portal/src/config/consoles.js`, `admin-portal/src/ui/ServiceConsole.jsx`,
`admin-portal/src/App.jsx`, `admin-portal/src/ui/Layout.jsx`

### What it cost
A config object, a 20-line wrapper and a route block — which is the whole point
of having extracted the shell two sessions ago. One change to `ServiceConsole`
itself was needed, described below.

Property Management was 20 routes inside `PmScopeLayout` with 27 children
crowding the global sidebar. It now opens the way Water Tank and Short Term Stay
do: own sidebar, own window, violet accent over the same navy.

**Its URLs did not change.** `/property-management/*` meant these screens before
and means them now, so unlike Short Term Stay nothing needed a redirect — only
the chrome around the screens is different.

### The problem the third console surfaced
Eight of the 27 nav items were not Property Management screens at all. They were
SHARED screens — work orders, inspections, compliance, workflows, tenant
invoices, receipts, folios, landlord bills — filtered to rentals by a query
string and living at global paths. Left alone, clicking one would have thrown the
operator out of the console and back into the admin shell, sidebar and all.

They are now routed at `/property-management/*` **inside** the console, rendering
the same components, still reading their own query string. The rental filter is
intact and not one of those components was touched. Their global paths remain for
the other verticals that use them.

That in turn exposed a real bug in the shared shell: `inHere` compared
`loc.pathname.startsWith(item.to)`, and `pathname` never contains a `?`, so a nav
item carrying a query string would silently fail to open its own group. Fixed by
comparing on the path alone — and proved by reverting the fix and watching the
assertion fail.

### Nav
27 destinations across 7 groups. The old "Rental Accounting" sub-group held ten
items, which is a list you read rather than scan, so it is split by DIRECTION —
Money In (tenant invoices, receipts, folios, arrears, global invoicing) and Money
Out (owner statements, disbursements, landlord bills, deposit settlements,
expense approvals). Chasing arrears and paying an owner are different jobs.
`roles:` gating added to every finance destination, matching the convention the
other consoles use.

`ui/PmScopeLayout.jsx` is now unused — the console supplies `.pm-scope` through
`contentClass`. Left in place rather than deleted, since deleting a file other
agents may be mid-edit on is not worth the saving.

### Verified
12 new assertions; full suite **971 across 21 suites, 0 failures**. Every nav
destination in all three consoles is asserted to resolve to a declared route, so
a sidebar item cannot point at nothing.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for six sessions.
  Build- and assertion-verified only.
- **No badges or ⌘K for Property Management** — both need `work-queue` and
  `search` endpoints it does not have. The shell lights them up the day they
  exist; until then the nav gates on `roles:`.
- Residential Sales, Commercial and Rural remain. Honest note: those three share
  three components between them and have no dedicated screens, so a console
  would be chrome around very little. They need screens before they need a
  sidebar.

---

## COMPLETED — TM Agreements moved into the Property Management console
**Agent:** Claude (console pattern) · **Date:** 2026-08-13
**Files:** `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`,
`admin-portal/src/ui/Layout.jsx`

`/agreements/tenancy-management` now lives at
`/property-management/tenancy-agreements`, inside the console, under an
**Agreements** group beside PM Agreements. The group was called "Contracts";
renamed, since it now holds the two agreement builders this module owns and
"Agreements" is what people call them.

- PM = the owner/agency management agreement (SSPC-RPRMS-01)
- TM = the tenancy agreement between landlord and tenant (SSPC-RPTMS-01)

A property manager drafting a tenancy agreement was leaving the console to do it.

### Tidied while here
- **`/agreements/short-term-rental` was declared twice** — a redirect added when
  Short Term Stay got its console, and the original live route further down,
  with the redirect shadowing it. Harmless, but exactly the sort of thing that
  gets "fixed" later by deleting the wrong one. The dead duplicate is gone.
- The old `/agreements/property-management` and `/agreements/tenancy-management`
  paths are now redirects rather than live routes, so there is one home per
  screen and bookmarks still work.
- The global **Documents & Signing** section still lists all five agreement
  builders — it is where someone looks for "all our agreements" — but the links
  now point straight at their new homes instead of bouncing through a redirect.

### Verified
12 new assertions; full suite **983 across 21 suites, 0 failures**. The
destination-count assertion caught the addition on its own (27 → 28), which is
what it is for.

### NOT done
Browser QA — the Chrome extension has been disconnected for six sessions.

---

## COMPLETED — Residential Sales opens as its own console (the fourth)
**Agent:** Claude (console pattern) · **Date:** 2026-08-13
**Files:** new `admin-portal/src/screens/ResidentialConsole.jsx`,
new `admin-portal/src/screens/sales/paths.js`,
`admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`,
`admin-portal/src/ui/Layout.jsx`, `admin-portal/src/screens/PropertySellDashboard.jsx`,
`admin-portal/src/screens/SalesEnquiries.jsx`

Six destinations across four groups, in emerald over the same navy — cyan for
Water Tank, amber for Short Term Stay, violet for Property Management. Nothing in
`ui/ServiceConsole.jsx` changed for it.

### The problem this console had that the others did not
Its three register screens — `PropertySellDashboard`, `DealsBoard`,
`SalesEnquiries` — are ONE set of components rendered three times. Residential,
Commercial and Rural differ only by a `category` prop. Residential now opens in a
console and the other two do not, so the same click has to lead to two different
places: inside the console for residential, out to the global `/sales/*` screens
for the rest.

Six navigation sites across two files were hard-coding `/sales/...`. They now go
through `salesBase(category)` in `screens/sales/paths.js` — one place that
decides, rather than six chances to get it wrong. When Commercial and Rural get
consoles, that is a one-line change.

Commercial and Rural are untouched and asserted to be: their routes, their
`/sales/*` property file and their grouped sidebar entries all still work.

### No agreements group yet — deliberately
Buyer and seller agreements are being rewritten to work the way the PM and TM
builders do, and the documents have not arrived yet. No sales agreement screen
exists in the codebase at all, so a nav entry would point at nothing. The group
is left out with a comment saying why, so it reads as deferred rather than
forgotten — and the route-reachability assertion would have refused it anyway.

### Verified
15 new assertions; full suite **998 across 21 suites, 0 failures**. The
destination-count assertion caught my own miscount (I wrote seven, there are six)
before it reached a commit.

One build break on the way, entirely mine: the script that inserted the import
used "the last line starting with `import`", which landed inside a multi-line
`import { ... }` block and produced a syntax error. Caught by the build.

### NOT done
- **Browser QA.** The Chrome extension has been disconnected for six sessions.
- **Buyer and seller agreements** — waiting on the updated documents.
- Commercial and Rural still render in the global admin. They have no dedicated
  screens at all, so a console for either would be chrome around three shared
  components; worth doing when they have something of their own.

### 2026-08-19 12:40 | Claude Code (Opus 4.8) | COMPLETED | Add DESIGN.md + Short Term Stay QA report (docs only)
- Request: Study the Short Term Stay mockup, produce a system design doc and a QA
  report, then commit and push. (The mockup rebuild itself is planned, not yet coded.)
- Scope: Two new root docs only — `DESIGN.md`, `QA_SHORT_TERM_STAY_REPORT.md`. No
  source/`dist` changes. A prior session's Short Term Stay module is already
  committed and pushed (`a1ceab5`, `10e896f`, `0857c52`).
- Changes: `DESIGN.md` — full design-system reference (base theme + `.pm-scope`
  cockpit: palettes, typography, tokens, component kit, screen patterns, front-end
  integration contract). `QA_SHORT_TERM_STAY_REPORT.md` — end-to-end QA of the
  short-stay workflow with the bugs fixed.
- Verification: Committed ONLY these two files (+ this log entry). `git status`
  confirmed ~30 other modified/untracked files belong to concurrent sessions
  (Rentals, Clients, RPRM/RPTM, website, pm-design.css, kit.jsx) and were left
  untouched. `dist` deliberately NOT committed — a build over other sessions'
  uncommitted `src` would bake in their WIP; the server rebuilds `dist` on deploy
  per `DEPLOY_HOSTINGER.md`.
- Handoff: Deploy instructions already exist (`DEPLOY_HOSTINGER.md`) — not
  recreated. Next: the full 14-screen Short Term Stay rebuild from the mockup
  (`Seventh Sky - Short Term Stay.html`) + backend read endpoints, scoped but not
  started. Nothing else of mine is pending.

### 2026-08-19 13:05 | Claude Code (Opus 4.8) | COMPLETED | Full-system build snapshot — rebuild admin dist + commit concurrent module work
- Request: "Build latest version for the whole system and commit push to git"
  (template: prior successful build commit 10b84eb2, which committed source +
  rebuilt dist together).
- Scope: Whole working tree on this machine — the committed artifact is brought
  in line with current source across every in-flight module.
- Changes: Ran `npm run build:admin` (vite) → regenerated the tracked
  `admin-portal/dist` bundle (old hashed assets removed, new ones added). Then
  committed the full working tree: concurrent multi-session source (RPRM + RPTM
  service agreements incl. new screens/controllers/routes/services/seed scripts,
  short-stay owner disbursements, Clients/Rentals/Vacancies/RentalProperties,
  Care dashboard, pm-design.css, kit.jsx, pickers.jsx, several backend
  controllers/services, website src) plus the rebuilt dist, so dist matches src.
- Verification: `npm run build:admin` succeeded — 1997 modules transformed, 0
  errors, built in ~14s, so the entire current tree compiles. `website/.next` is
  not tracked; the deploy rebuilds it (`DEPLOY_HOSTINGER.md`). Excluded the
  413KB design-input file `Seventh Sky - Short Term Stay.html` from the commit.
- Handoff: This is a snapshot commit that bundles work authored by other
  concurrent agents/sessions — their changes are preserved, not claimed. If any
  in-flight feature was mid-change, this ships its current state; owners should
  verify their own module against this snapshot.

### 2026-08-19 13:40 | Claude Code (Opus 4.8) | COMPLETED | Fix live 404 — mount Water Tank + STS/RPRM/RPTM routes in monolith manifest
- Request: Live site — Water Tank service dashboard shows "Could not load the
  dashboard / Not found".
- Root cause: `backend/server.js` (dev) hard-codes its own `mount()` list and
  mounts all 18 `/api/wt-*` routers + `/api/sts`, `/api/short-stay-verification`,
  `/api/sts-disbursements`, `/api/rprm`, `/api/rptm`. But the Hostinger monolith
  (`production-server.js`) mounts from `backend/routes/manifest.js`, which never
  received any of them — so every `/api/wt-ops/dashboard` etc. 404'd in production.
  The two lists had silently drifted (server.js does not read manifest).
- Scope/Changes: `backend/routes/manifest.js` only — added the 18 Water Tank
  mounts + sts/short-stay-verification/sts-disbursements + rprm/rptm.
- Verification: Required every manifest module in Node — 86 load OK, 0 of my
  additions failed. The only 9 failures are the pre-existing dead Language-Academy
  legacy routes (Student/Batch/Enrollment/Course) the monolith already try/catch
  skips (per DEPLOY_HOSTINGER.md, "the 9 that skip are dead legacy routes").
  Backend-only change — no dist rebuild needed.
- Handoff: Needs redeploy + Node app restart on Hostinger to take effect (git
  pull → restart; no build/migration required). server.js and manifest.js should
  eventually be unified to one source so they can't drift again.

### 2026-08-19 14:10 | Claude Code (Opus 4.8) | COMPLETED | WT new quotation — browse full price schedule instead of one-by-one search
- Request: /water-tank/quotations/new should show the full services list so the
  user can select services, rather than finding them one at a time.
- Root cause (UX): the whole catalog was already loaded client-side
  (`/wt-invoices/reference` → `ref.catalog`), but the Services picker only
  revealed a max-10 dropdown WHILE the operator typed, adding one line per search.
- Scope/Changes: `admin-portal/src/screens/watertank/QuotationDirect.jsx` only.
  Replaced the search-gated dropdown with an always-visible, grouped
  (Services / Materials / Labour, by catalog `group`), tickable list: click a row
  to add it, click again to remove; selected rows are highlighted with a check and
  a live "N of M selected" count. The search box now filters the full list instead
  of gating it. Added `removeByCode` + grouping helpers; reused existing `addLine`
  and the `.wt-lookup-item` styling.
- Verification: `npm run build:admin` succeeded (1997 modules, 0 errors, 14s);
  committed the rebuilt admin-portal/dist alongside the source (matches the
  10b84eb2 pattern). Not yet browser-verified on the live URL — needs redeploy.
- Handoff: Backend unchanged. Redeploy + restart on Hostinger to see it live.

### 2026-08-19 15:30 | Claude Code (Opus 4.8) | COMPLETED | Water Tank end-to-end QA + 3 safe fixes + standardise intake on Service Requests
- Request: Full QA of the Water Tank service (UI/UX, workflow, endpoints, calcs);
  then fix the three safe issues and standardise intake on Service Requests.
- QA: exercised 51 read endpoints with a super-admin token — all 200, 0 errors.
  Report written to WATER_TANK_QA_REPORT.md (health ~7/10; engine solid, workflow
  needs consolidation). Verified quotation math correct (Q-1055: 8000+5%=8400).
- Fixes:
  * M1 (backend/controllers/waterTankOps.controller.js) — dashboard finance now
    recomputes every invoice via wtInvoice.service computeTotals() instead of the
    stale raw `amount` column. invoiced_total 174,755 → 138,155, now equal to the
    invoice list and overview.
  * M2 (backend/controllers/waterTankInvoice.controller.js) — Draft/Void invoices
    no longer report an `outstanding` in the list; the overview `outstanding`
    excludes drafts (they stay in `draft_value`). Stops drafts inflating receivables.
  * L1 (backend/routes/waterTankQuotation.routes.js) — GET /wt-quotes now returns a
    JSON 404 pointing at /wt-ops/quotations instead of falling through to SPA HTML.
  * H2 (admin-portal/src/screens/watertank/ServiceRequestNew.jsx + ProjectForm.jsx)
    — retired the separate "Enquiry" object: removed the dead enquiry-conversion
    path and the Enquiry origin option + linkage select. Service Request is the
    single intake; "enquiry" stays only as channel/stage metadata.
- Verification: all three backend modules load; backend restarted; re-probed —
  invoiced_total 138,155 == list; drafts-with-outstanding 0; GET /wt-quotes JSON.
  npm run build:admin passed (0 errors); rebuilt dist committed.
- NEW data finding (not auto-fixed — financial record): INV-0484 has status "Paid"
  but a full 25,600 outstanding (marked paid with no payment recorded). Surfaced by
  the M1 switch to computeTotals. Needs an operator to correct the invoice.
- Handoff: redeploy + restart on Hostinger for the live site. Larger workflow items
  (single front-door entry, provider-agreement gate, nest WOs under Projects) are
  in the report, pending sign-off.

### 2026-08-19 16:20 | Claude Code (Opus 4.8) | COMPLETED | Water Tank workflow items — single front door, provider-gate consistency, WO-under-Project
- Request: take on the three larger workflow items from the QA report.
- H1 (single front door / finish intake standardisation):
  * ServiceRequests.jsx — removed the "Enquiries | Requests" view switch and the
    Enquiries register; the screen now shows Requests only (the single intake).
  * Dashboard.jsx — added a prominent primary "New Service Request" CTA in the header.
  * SiteAssessments/Quotations/Projects — demoted their direct "New" create buttons
    from primary to secondary and added subtitle hints that jobs normally start from
    a Service Request (the SOP direct paths stay available, just not the front door).
    Also de-"enquiry"-ed the Projects subtitle.
- H3 (provider-agreement gate) — discovered it was ALREADY enforced server-side:
  the WO assign endpoint refuses (400) any provider without an active completed
  Master Agreement (getActiveAgreement), and the WO picker only lists
  assignable_providers. The one real defect was that the Providers directory
  computed `assignable` from the provider's agreement_status FIELD (buildGates)
  while enforcement uses the live agreement RECORD — so a provider could look
  assignable but be refused. Fixed: directory `assignable` now also requires the
  live record (`assignable && !!live`), matching enforcement. Verified: 0 providers
  assignable (none have a live agreement), consistent with the assign endpoint.
- M4 (WO under Project) — ProjectDetail already has a Work Orders tab listing the
  project's WOs. Reordered the Delivery nav so Projects (the container) leads and
  Work Orders follows.
- Verification: backend restarted; providers directory + dashboard + WO reference +
  intake all 200; npm run build:admin passed (0 errors); rebuilt dist committed.
- Handoff: redeploy + restart on Hostinger. The dead EnquiriesRegister function
  remains in ServiceRequests.jsx (unreachable) — safe to delete in a later cleanup.
  Enquiry backend routes left in place (data-preserving, just unsurfaced).

### 2026-08-19 17:10 | Claude Code (Opus 4.8) | COMPLETED | Water Tank — dead-code cleanup + M3 draft hygiene + L2 nav consolidation
- Request: do the cleanup and tackle M3 and L2.
- Cleanup (frontend): removed the now-dead EnquiriesRegister from ServiceRequests.jsx
  (the register, ENQUIRY_STATUSES, ENQUIRY_FIELDS, SOURCE_ICON and their exclusive
  imports — api, useEffect, useCallback, several icons). Build clean.
- Cleanup (backend) — NOT removed, on purpose. The enquiry routes/model are fed by
  the PUBLIC website form (POST /public/water-tank/enquiry → WtEnquiry), and
  createRequest is heavyweight (needs an assessment date or service lines and
  creates a client + project), so a raw website lead cannot go straight into a
  Service Request. Removing the enquiry backend would orphan real inbound leads.
  Left intact (data + website safe); flagged the follow-up (reroute the website
  form to create Service Requests) for a separate, deliberate change.
- M3 (draft-invoice hygiene): there is only ONE WtInvoice.create site — no
  auto-spawn from work orders (the WO screen only *suggests* "Raise the invoice").
  The 71 drafts are created-and-abandoned. M2 already fixed the numbers; here I
  added a "Drafts to Raise" stat card on the Invoices screen (count + ৳ value,
  amber when >0) so abandoned drafts are visible and actionable rather than quietly
  cluttering the register.
- L2 (nav consolidation): WATER_TANK_NAV cut from 8 groups to 6 — merged
  Delivery + Contracts → "Delivery & Contracts" (Projects, Work Orders, Agreements,
  AMC) and Assurance + Administration → "Assurance & Admin". All destinations and
  role/needs gates preserved; no routes changed.
- Verification: npm run build:admin passed (0 errors); rebuilt dist committed.
  Backend unchanged this round (no restart needed).
- Handoff: redeploy + restart on Hostinger. Open follow-ups: reroute the public
  website enquiry to a Service Request (then the enquiry backend can retire), and
  the INV-0484 "Paid but 25,600 owed" data correction.

### 2026-08-19 17:45 | Claude Code (Opus 4.8) | COMPLETED | Reroute public website enquiry → Service Request; retire enquiry console
- Request: reroute the website-enquiry form so the enquiry backend can retire.
- Change (backend only): rewrote publicEnquiry (POST /public/water-tank/enquiry —
  same URL the website posts to) to create a lightweight WtServiceRequest in status
  "New" (source Website, needs_assessment true, no project/assessment yet) instead
  of a WtEnquiry. A coordinator triages it into an assessment/quotation, which is
  when the client file + project are created (createRequest, unchanged).
- Retired the internal enquiry console: removed the 4 /wt-intake/enquiries routes
  and their handlers (listEnquiries/createEnquiry/updateEnquiry/deleteEnquiry) plus
  ENQUIRY_STATUSES. The WtEnquiry model is KEPT so any historical enquiry rows stay
  readable; the createRequest "close off enquiry" block is now dormant but harmless.
- Verification: backend restarted; unauthenticated POST to the public route →
  201 { reference: SR-1108 }; the record shows in /wt-ops/service-requests as
  status New / source Website; deleted the SR-1108 test row afterwards. Controller
  + routes load; no frontend calls /wt-intake/enquiries anymore. Backend-only — no
  dist rebuild.
- Handoff: redeploy + restart on Hostinger. The enquiry pipeline is now fully
  retired end to end (one intake: the Service Request). Next: the SA→Quotation→
  Agreement page prefill (/water-tank/site-assessments/:sa/quotation/:q/agreement).

### 2026-08-19 18:20 | Claude Code (Opus 4.8) | COMPLETED | WT customer agreement — editable Schedule C (services) prefilled from the quotation
- Request: on /water-tank/site-assessments/:sa/quotation/:q/agreement the services
  should be editable here (show the full list, pre-filled from the quotation),
  reflect on the agreement, with editable payment terms and no double adding.
- Finding: the screen already prefills from /wt-quotes/:id/agreement-draft (client,
  property, schedule_b, pricing_input.selected from the quote lines) and the
  advance/discount/VAT/transport were already editable. The one gap was the service
  lines — read-only ("edit on the quotation").
- Change (frontend only, QuotationAgreement.jsx): fetch /wt-agreements/customer/
  catalog and render an editable Schedule C — the full price schedule grouped
  (Services / Materials / Labour) with the quote's services pre-ticked; tick to
  add/remove, edit qty and agreed price. Edits flow into pricing_input.selected,
  which the existing live preview redraws, so the agreement + total redraft in
  place. No re-adding: the quote's lines arrive selected.
- Verification: /wt-agreements/customer/catalog → 41 items across the three groups;
  a quote's agreement-draft returns pricing_input.selected prefilled (e.g. WTC-005
  x1 @6500). npm run build:admin passed; rebuilt dist committed.
- Handoff: redeploy + restart on Hostinger. Backend unchanged.

### 2026-08-19 18:40 | Claude Code (Opus 4.8) | COMPLETED | WT agreement Schedule C — add a search filter
- Request: add a search filter to the editable Schedule C on the customer agreement screen.
- Change (frontend only, QuotationAgreement.jsx): added a search box that filters the
  41-item price schedule by code or name before grouping; a "nothing matches" note when
  empty (already-selected services stay on the agreement regardless of the filter).
- Verification: npm run build:admin passed; rebuilt dist committed. Backend unchanged.

### 2026-08-19 19:05 | Claude Code (Opus 4.8) | COMPLETED | WT agreement — add editable Schedule A (services covered)
- Request: the customer agreement screen had no Schedule A service-selection option
  (services the agreement covers), and it wasn't on the quotation either — make it
  dynamic and smooth.
- Finding: the agreement engine already merges Schedule A from priced codes +
  explicit data.services (scheduleAFromCodes), but nothing surfaced it and
  draft.services was never initialised.
- Change:
  * Backend (wtAgreements.controller.js): the customer meta now also returns
    code_to_schedule_a (the catalogue-code → Schedule A map) so a builder can show
    which Schedule A entries a priced line already covers.
  * Frontend (QuotationAgreement.jsx): initialise draft.services; added a
    "Schedule A — services this agreement covers" card that renders meta
    .service_groups as grouped checkboxes. Services implied by the priced Schedule C
    lines are shown ticked + locked ("· from pricing") and recompute live as pricing
    changes; the operator ticks any additional coverage (draft.services). Renamed the
    pricing card to "Schedule C — priced services" for clarity.
- Verification: meta returns service_groups (8) + code_to_schedule_a (28);
  WTC-005 → Commercial Water Tank Cleaning. build:admin passed; dist committed;
  backend restarted.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-19 19:45 | Claude Code (Opus 4.8) | COMPLETED | WT projects open on quotation approval (not at intake)
- Request: only open the project when a quotation is approved.
- Was: a project opened up front — at Service Request time (createRequest) and via
  the generic identity linker whenever a quotation/assessment/work-order was created.
- Now:
  * waterTankIntake.controller createRequest — no longer creates a project; it
    attaches to the client's existing open project if one exists, else leaves the
    request/assessment/quotation with project_id null (all project.* refs guarded).
  * wtIdentity.service attachIdentifiers — defers project creation for `quotations`
    and `site-assessments` (they link to a project once one exists); other entities
    (e.g. work-orders) still open/attach as before.
  * waterTankQuotation.controller setDecision — on decision "Approved" it opens (or
    reuses the client's open) project via identity.ensureProject, sets the quote's
    project_id, and back-fills the source assessment + originating service request.
- Verified end to end: direct request → SR + quote created with project_id null,
  project count unchanged (23); approve the quote → project WTCM-P0025 opens (24),
  quote.project_id set, SR back-filled to the same project. Repeat-client safe
  (findOrCreate open project, no duplicates). Test records cleaned up (a stray
  approved quote can't be deleted by design — harmless).
- Handoff: redeploy + restart on Hostinger. Effect: the Projects register / the
  dashboard "active projects" now count won engagements (approved+), not leads.
  Agreements/work-orders/invoices already come after approval, so project_id is set
  by the time they need it.

### 2026-08-19 20:20 | Claude Code (Opus 4.8) | COMPLETED | WT agreements — one-click "Countersign as Seventh Sky"
- Request: a customer signed but the agreement wasn't completed; the Seventh Sky
  signing option was not discoverable.
- Finding: Seventh Sky IS a signer (role staff_countersign, order 2) on both
  customer and provider agreements, but the only way to sign was to copy that
  signer's link from the hub and paste it — hence "where is the option".
- Change (frontend, AgreementsHub.jsx): in the agreement detail drawer's signer
  list, a pending staff_countersign signer now shows a prominent "Countersign as
  Seventh Sky" button that opens the signing page in one click (reuses the existing
  signing-link + /sign/:token flow; falls back to copying the link if pop-ups are
  blocked). Works for client and provider agreements alike.
- Verification: build:admin passed; dist committed. Backend unchanged.
- Handoff: the completion pipeline (signed PDF → email to customer/provider →
  save under Documents) is planned separately — it hinges on a PDF-generation
  decision (no server-side HTML→PDF engine today; only pdfkit).

### 2026-08-19 21:00 | Claude Code (Opus 4.8) | COMPLETED | WT agreement completion pipeline — email signed copy + file it
- Request (part 2): once all parties sign, send the signed agreement to the
  customer/provider email, and save it under their Documents tab.
- Decision: signed-HTML + link approach (server has no HTML→PDF engine; only
  pdfkit). Clients surface the doc from the register; providers file it.
- Changes (backend):
  * New services/wtAgreementCompletion.service.js — onCompleted(env, baseUrl):
    for water_tank_customer_agreement / water_tank_provider_agreement, emails the
    principal (client/provider) a secure link to their fully-signed copy, and for
    providers upserts a WtProviderDocument (category 'agreement', file_url = link).
  * signing.controller signByToken — after handleEnvelopeCompleted, calls the WT
    completion hook (best-effort, try/catch so signing never fails).
  * signing.controller signedByToken + GET /api/sign/:token/signed-document (public,
    rate-limited) — serves the fully-signed HTML by the party's own token (used by
    the email link); 409 until completed, 404 for a bad token.
- Verified: modules load; the token endpoint returns the signed HTML (200) for a
  completed envelope and 404 for a bogus token; email is simulated until SMTP is
  configured. Staff already have "download signed copy" in AgreementsHub.
- Handoff: redeploy + restart on Hostinger. Remaining: surface signed agreements
  inside the CLIENT Documents tab (today it lists quotations + reports; clients
  have no separate doc store) — offered as the next increment.

### 2026-08-29 11:11 | OpenCode (GPT-5.6) | STARTED | Read-only Water Tank end-to-end QA and audit
- Request: Check Claude's Water Tank QA progress and agent logs; independently audit every Water Tank sidebar destination, agreement creation/editing/signing, frontend, backend, UX, accessibility, and end-to-end workflow; provide recommendations to Claude without changing current application code.
- Scope: Read-only review of `WATER_TANK_QA_REPORT.md`, `ASSESSMENT_GPT_WATER_TANK.md`, Water Tank frontend/backend source and tests, current local runtime and browser flows. Only this mandatory append-only log will be edited.
- Changes: None to application code.
- Verification: Read the complete shared work log and Water Tank conventions; checked `git status --short --branch` and found only the pre-existing untracked `Seventh Sky - Short Term Stay.html`; loaded report-only QA, backend, UX, and accessibility audit guidance.
- Handoff: Preserve all application files and runtime data. Revalidate Claude's August 19 findings against the current branch because several were subsequently addressed and later agreement/document changes introduced new open follow-ups.

### 2026-08-29 12:05 | Claude Code (Opus 4.8) | COMPLETED | WT: every new engagement opens its own project; hide "Create Agreement" when covered
- Request: a new agreement for an existing client must ALWAYS open a new project
  (otherwise all work orders pile under the same project); and on the quotation
  window, if the client is covered by an existing agreement, hide "Create Customer
  Agreement".
- Changes:
  * wtIdentity.service ensureProject — new `forceNew` hint: opens a fresh project
    even when the client has an open one (an explicit hint.project_id still wins).
  * waterTankQuotation.controller setDecision — on Approved, ensureProject is now
    called with forceNew (unless the quote is already tied to a specific project),
    so every approved quotation opens its OWN project and back-fills the chain.
  * waterTankIntake.controller createRequest — no longer attaches a new request to
    the client's existing open project (was the real cause of pooling); requests/
    assessments/quotations stay project-less until approval.
  * QuotationDetail.jsx + QuotationBuilder.jsx — when the client has a signed
    Customer Service Agreement and this quote hasn't raised its own, the "Create
    Service Agreement" button is replaced by "Covered by <agreement code>".
- Verified: two service requests for the SAME client, each approved, opened two
  DIFFERENT projects (WTCM-P0026, P0027); a first request came through with
  project null. build:admin passed; dist rebuilt. Test rows cleaned up (approved
  quotes can't be deleted by design — a few harmless local dev rows remain).
- Handoff: redeploy + restart on Hostinger. Note: this overrides the earlier
  "reuse the client's open project" behaviour by explicit request.

### 2026-08-29 12:40 | Claude Code (Opus 4.8) | COMPLETED | Fix "cannot create clients" (generic write blocked) + specialist create
- Report: creating a Water Tank client failed with "Generic writes are disabled for
  'clients' because they bypass its business rules."
- Cause: ClientCreate.jsx POSTed to the generic /wt-ops/clients route, which is
  intentionally blocked (READ_ONLY_ENTITIES in waterTankOps.controller). The
  specialist /wt-clients router had every sub-action but NO create endpoint, so the
  frontend had nowhere valid to create a client.
- Changes:
  * waterTankClients.controller — new exports.create: whitelists fields, generates
    the WTCM-C#### code, de-dupes by name/mobile/email (returns the existing client
    rather than a duplicate), sets New Lead / Lead Enquiry defaults, logs the event.
  * waterTankClients.routes — POST '/' → ctrl.create (before the /:id family).
  * ClientCreate.jsx — POSTs to /wt-clients now; removed the auto
    /wt-clients/:id/register call so client creation no longer opens a project
    (projects open on quotation approval per the current rule); fixed the toast.
- Verified: /wt-ops/clients still 405 (rules intact); POST /wt-clients → 201
  (WTCM-C0034, all fields); duplicate name returns the existing client. build passed.
- Handoff: redeploy + restart on Hostinger. The registerProject endpoint still
  exists for any explicit "open project from client" action.

### 2026-08-29 13:05 | Claude Code (Opus 4.8) | COMPLETED | WT agreement — add editable Schedule D (warranty summary)
- Report: on /water-tank/quotations/:code/agreement, "SCHEDULE D — Warranty Summary"
  showed in the document but had no input option on the left (edit) side.
- Cause: QuotationAgreement.jsx (the streamlined agreement screen) rendered Schedule
  A/B/C inputs but never Schedule D, and never initialised draft.checklist — while
  the engine renders Schedule D from data.checklist. (The full builder,
  WtCustomerAgreements Step 4, did have it.)
- Change (frontend, QuotationAgreement.jsx): initialise draft.checklist; add a
  "Schedule D — warranty summary & project requirements" card rendering
  meta.checklist_groups (Warranty Coverage, Project Requirements) as checkboxes
  bound to draft.checklist. Ticks flow into the live preview and the sent document.
- Verified: meta returns the two checklist groups; build:admin passed; dist committed.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-29 13:25 | Claude Code (Opus 4.8) | COMPLETED | WT agreement — stop the preview jumping to top on every edit
- Report: on the agreement screen, changing any input/checkbox scrolls the right-side
  agreement preview back to the top.
- Cause: the preview is an <iframe srcDoc>; the effect refreshed it on EVERY draft
  change (each keystroke/tick), and each srcDoc reload reset the iframe scroll to 0.
- Change (frontend, QuotationAgreement.jsx): debounced the auto-refresh (500ms after
  the operator pauses) so quick edits don't thrash it; and preserve the iframe scroll
  across reloads — saved before setPreview and restored in onLoad. The iframe sandbox
  moved from "" to "allow-same-origin" (no allow-scripts, so the agreement HTML still
  can't run JS) so the parent can read/restore scrollY.
- Verified: build:admin passed; dist committed.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-29 13:45 | Claude Code (Opus 4.8) | COMPLETED | WT agreement — pin the action header (Refresh/Full preview/Send) to the top
- Request: Refresh preview / Full preview / Send for signature should stay fixed at
  the top while scrolling the agreement form.
- Change (frontend, QuotationAgreement.jsx): wrapped this screen's WtHead in a
  sticky bar (position: sticky, top: 0, z-index 30, page background, bottom border)
  so the three actions stay in reach. Bumped the preview card's sticky top from 20
  to 104 so it sits below the pinned header instead of sliding under it. WtHead
  itself is unchanged (shared component), so only this screen is affected.
- Verified: build:admin passed; dist committed.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-29 11:59 | OpenCode (GPT-5.6) | COMPLETED | Read-only Water Tank end-to-end QA and agreement security audit
- Request: Independently audit every Water Tank sidebar destination plus customer/provider agreement creation, editing, signing, completion, frontend, backend, UX, accessibility and mobile behavior; make no application-code changes.
- Scope/changes: Read-only application review. Changed only this append-only work log. Temporary Playwright/Axe scripts and results were written under `C:\Users\ADMIN\AppData\Local\Temp\opencode\wt-playwright-audit`. Preserved concurrent commits through `6bfafe3` and the pre-existing untracked `Seventh Sky - Short Term Stay.html`.
- Browser verification: authenticated and audited all 23 sidebar destinations at 1440x900 and 390x844 (46 page/viewport runs), then five agreement routes and one quotation-agreement route. No navigation errors, application exceptions, failed requests or HTTP error responses. Every mobile route overflowed horizontally because the shared 240px console sidebar has no mobile mode. All 46 core runs had Axe A/AA violations, chiefly contrast; unnamed controls appeared on Calendar, Clients, Projects, AMC and Settings. The quotation agreement alone had 76 unlabelled controls plus a nested interactive DatePicker control.
- Critical security/integrity findings: authenticated provider and generic envelope detail APIs serialize signer `access_token` and `otp_code`; `canRead` includes technicians while generic signing includes sales executives, so read-level roles can obtain bearer signing authority. `POST /api/sign/:token/decline` checks neither expiry nor signer/envelope state and can downgrade an already completed agreement; the public UI still offers Decline after signing. OTP fields are stored but never generated or enforced. The completion hash excludes captured field/signature values despite being presented as tamper evidence.
- Agreement findings: customer preview preserved raw executable HTML from client, Seventh Sky representative and witness names, then preview/signing screens inject it with `dangerouslySetInnerHTML`. Customer creation sets `sent` but sends no email although the UI says it was sent. Customer countersigning is optional while the document says both parties must sign; live recheck found 5 completed customer agreements and 4 generated signed copies with blank signature anchors. Hub `can_void` advertises completed envelopes as voidable; the hub writes `void_reason` instead of model field `voided_reason` and attempts invalid signer status `voided`. Hub Resend rotates the token but does not email it. Signed-copy links reuse non-expiring signing bearer tokens.
- Downstream verification: all 5 completed customer agreements produced work orders and invoices, but every generated work order had zero service lines; 3/5 lacked a project link and 3/5 lacked a site address. The agreement terms omit client identity and `wtWorkOrder.service` reads legacy `terms.property`/`terms.project` instead of the emitted `schedule_b`/`agreed_lines`. Completion persistence and operational activation are not one atomic transaction; customer automation errors are swallowed with no retry/reconciliation path.
- Build/schema verification: frontend production build passed to a temporary outDir (1997 modules); audited backend modules all passed `node --check`. Build warned about the 2.27MB main JS chunk and 985kB html2pdf chunk. `npm run db:migrate:status` succeeded but showed `0090-money-batch-and-refunds.js`, `0091-disbursements-and-vouchers.js` and `0092-sts-owner-disbursements.js` pending. No automated backend or frontend test command exists (backend test is the placeholder failure).
- Handoff: P0 rotate exposed signer tokens, stop serializing token/OTP fields, repair decline state validation, sanitize all agreement HTML inputs and hash the canonical executed artifact including signature values. P1 require the Seventh Sky countersigner, repair customer email/resend delivery and downstream terms mapping, add transactional/idempotent completion with reconciliation, implement or remove OTP, and add a responsive console shell. Then remediate WCAG labels/contrast, apply pending migrations and add agreement state-transition/integration tests.

### 2026-08-29 14:30 | Claude Code (Opus 4.8) | COMPLETED | WT signing — email BOTH parties on completion; verify signature placement
- Reports (agreement signing): (a) no witness / Seventh Sky rep inputs; (b) signature
  not placed on the placeholder; (c) on full completion, email each party (customer +
  Seventh Sky) the signed doc; (d) witnesses only sign, no doc.
- Findings:
  * (a) The "Signing parties" card in QuotationAgreement.jsx DOES render the Seventh
    Sky representative/position/countersigner-email inputs and Witness 1 & 2
    (name/NID/email) — near the bottom of the form. No code gap found.
  * (b) applySignatures places signatures correctly — unit-tested: 3/3 anchors filled,
    both names present. The SIGN PAGE shows the raw form (typed-name fields), so the
    placed signatures only appear in the SIGNED-DOCUMENT view (hub "Download signed"
    and the completion email link, which run buildSignedDocument). Not an engine bug.
- Change (backend, wtAgreementCompletion.service): on completion, email the signed
  copy to BOTH principals — customer/provider AND the Seventh Sky countersigner —
  each via their own token link to the fully-signed document (signatures placed;
  printable/savable to PDF). Witnesses excluded (they only attest). Provider filing
  unchanged.
- PDF constraint (unchanged): the server has no HTML→PDF engine (only pdfkit), so the
  email delivers a link to the signed HTML (print/save to PDF), not a PDF attachment.
  A true PDF attachment needs a headless renderer — flagged for a decision.
- Verified: service loads; backend restarted. Backend-only, no dist change.
- Handoff: redeploy + restart on Hostinger. Open: (1) real PDF attachment needs a
  renderer; (2) optionally show placed signatures on the sign page itself after signing.

### 2026-08-29 15:20 | Claude Code (Opus 4.8) | COMPLETED | WT signing — real signed-PDF: email attachment to both parties + save under Documents
- Request: on full completion, email a real PDF of the signed agreement to each party
  (customer + Seventh Sky), and save the signed PDF under the client/provider Documents tab.
- Changes:
  * backend/services/htmlToPdf.service.js (new) — HTML→PDF via puppeteer-core using an
    EXISTING Chrome/Chromium (env PUPPETEER_EXECUTABLE_PATH/CHROME_PATH or common paths);
    no bundled Chromium download, so npm install/deploy can't break on it. pdfAvailable()
    guards; htmlToPdf() throws when unavailable so callers fall back to a link.
  * backend/package.json — added puppeteer-core (^25.9.0).
  * wtAgreementCompletion.service — on completion: build the fully-signed HTML, render it
    to a real PDF once, save it to uploads/documents/<code>-signed.pdf, and email BOTH
    principals (customer/provider + Seventh Sky) with the PDF ATTACHED. Falls back to the
    secure link if no Chrome is present. Provider filing (WtProviderDocument) now points at
    the saved PDF. Witnesses excluded.
  * waterTankClients.controller detail — added an `agreements` array (completed customer
    agreements linked via the 'client' signer name) exposing signed_pdf_url.
  * ClientDashboard Documents tab — new "Signed Agreements" card with a token-authed
    "Signed PDF" download link (/uploads is JWT-gated; ?token= supported).
- Verified END TO END: ran onCompleted against a real completed customer agreement
  (ENV-WTCSA-620119) — generated a 216KB PDF, saved it, and SMTP actually delivered the
  email with the PDF attached. htmlToPdf unit test produced a valid %PDF- buffer.
- Deploy note: Hostinger shared hosting has no Chrome → pdfAvailable() false → link
  fallback (no breakage). For real PDFs on the server, install Chromium and set
  PUPPETEER_EXECUTABLE_PATH. Saved PDFs live under backend/uploads (gitignored).
- Handoff: redeploy + restart on Hostinger (npm install pulls puppeteer-core only).

### 2026-08-29 16:40 | Claude Code (Opus 4.8) | COMPLETED | Security + correctness audit fixes (signing/agreements) — batch 1
- Source: external audit (ChatGPT) of the signing/agreement subsystem. Verified each
  finding against code and fixed the security-critical + high-impact correctness ones.
- F1 CRITICAL token leak: signing.controller envelopeIncludes serialized signer
    access_token + otp_code. Now excluded. Verified: envelope detail shows neither.
- F2 CRITICAL decline-after-complete: declineByToken had no guards. Added token-
    expiry, already-signed/declined, and envelope completed/voided/declined checks.
    SignPage now shows "already signed/declined" instead of re-offering Sign/Decline.
- F3 CRITICAL stored XSS: the `or()` helper in wtCustomerAgreement + wtProviderAgreement
    interpolated user values (names/positions/NID) into HTML rendered with
    dangerouslySetInnerHTML. `or` now HTML-escapes. Verified: <script>/<img onerror>
    payloads come out escaped, no executable HTML survives.
- F4 HIGH weak completion hash: hash excluded signature values. Now includes every
    SignatureField value, so tampering a signature changes the hash.
- F5 HIGH optional countersign: customer agreement made the Seventh Sky countersigner
    REQUIRED (400 if no countersigner email) so it can't be "fully executed" on the
    client's signature alone.
- F6 HIGH work-order data loss: createFromSignedAgreement read legacy terms.property/
    terms.project and only took lines from a back-linked quote → zero-line WOs. Now
    reads the agreement's real terms (schedule_b + agreed_lines): lines from
    agreed_lines (fallback quote), site_address/scope/dates/project from schedule_b.
- F7 HIGH "Send" sent no email: customer createCustomer now emails the first signer
    their link (envelope was marked "sent" with no email). Hub "Resend" now actually
    emails the rotated link (was rotating the token silently).
- F12 MEDIUM void bugs: wrote void_reason (col is voided_reason) and set an invalid
    'voided' signer status. Now writes voided_reason and nulls outstanding tokens
    (no 'voided' signer status exists), so a voided envelope can't be signed.
- Verified: all backend modules load; admin build passed; F1 + F3 confirmed live.
- Handoff/DEFERRED (larger, separate efforts): F8 atomic completion + reconciliation;
    F9 OTP generate/validate (fields exist, unused) or remove; F10 signed-doc links
    ignore token_expires_at (permanent read of one's own completed doc); F11 mobile
    responsive sidebar (23 routes overflow at 390px); a11y contrast/labels; migrations
    0090-0092 pending (run on deploy); no automated test suite; JS bundle size.
- Redeploy + restart on Hostinger.

### 2026-08-29 17:05 | Claude Code (Opus 4.8) | COMPLETED | Run pending migrations 0090–0092 (WT/STS money schema)
- Request: run the pending migrations.
- Inspected first — all three are additive & idempotent: up() only addColumn/createTable/
  addIndex (+ widen project_code to nullable in 0091), guarded by describeTable; removals
  are confined to down(). No data-loss operations in the up path.
- Ran `npx sequelize-cli db:migrate` (development): 0090, 0091, 0092 all migrated OK.
- Verified: migrate:status shows all three 'up'; wt_money_events.batch_ref + refund_reason
  present; sts_money_events + sts_owner_disbursements tables created; app health 200 and
  the money/disbursement endpoints respond.
- DEPLOY NOTE: this migrated the LOCAL dev DB only. Hostinger's DB must be migrated on
  deploy — run `cd backend && npx sequelize-cli db:migrate` there after pulling.

### 2026-08-29 17:45 | Claude Code (Opus 4.8) | COMPLETED | Signing UX fixes — load failure, resend buttons, see prior signatures, one-witness completion
- Reports: sign link "unable to load"; "Send for signature" should become "Resend" (+ an
  "Edit & resend"); a signer should see other parties' signatures already placed; with two
  witnesses only one witness signature should be required to complete.
- Fixes:
  * Load failure — root cause was the /sign rate limiter (60 req/15min per IP) returning
    429. Split into a generous read limiter (600/15min for GET view + signed-document) and
    a tighter write limiter (60/15min for POST sign/decline). The failing token was valid.
  * viewByToken now returns the document with EARLIER signers' signatures applied
    (applySignatures over all signers/fields), so each party sees who has signed.
  * Completion rule (signByToken): complete when all PRINCIPALS (client/provider + Seventh
    Sky) have signed AND, where witnesses exist, at least ONE witness has signed. A second
    witness is no longer a blocker.
  * SignPage shows a read-only "already signed / fully signed / voided" state (with the
    document) instead of a live form once this party is done or the envelope is finished.
  * QuotationAgreement: when the quote already has an agreement envelope, the header shows
    "Resend" (re-emails the current agreement's next pending link via the hub) and
    "Edit & resend" (voids the current agreement and raises a fresh one from the edits),
    instead of "Send for signature".
- Verified: the previously-failing token now loads (200); backend loads; admin build passed.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-29 18:30 | Claude Code (Opus 4.8) | COMPLETED | Provider agreement prefill + provider dashboard shows full submission
- Request: on /water-tank/agreements/provider/new?provider=SP-0022 prefill everything
  from the provider invitation; show provider submission records + submitted documents
  on the provider dashboard; more automation.
- Findings: the builder already prefilled services/bank/rates/cumilla via selectProvider,
  and buildAgreement derives most identity at render — but (a) the provider's contact
  phone/email never reached the agreement (it read p.phone/p.email; the provider stores
  contact_phone/contact_email), and (b) the form didn't visibly prefill the legal identity.
  The dashboard already showed the business profile + categories + coverage + equipment +
  documents, but not proposed rates / bank / availability.
- Changes:
  * wtProviderAgreement.service — sp_rep_phone/email now read contact_phone/contact_email
    first, so the agreement carries the provider's real contact.
  * WtProviderAgreements selectProvider — also prefills template_values (sp_business_name,
    sp_rep_name/phone/email, registered_address, trade_licence_no, company_registration_no)
    from the provider so the template inputs show the invitation data already filled.
  * ProviderDetail Overview — added "Proposed Rates", "Payment/Bank Details" and
    "Availability Notes" from the submission (parsed with parseJson, since these columns
    are stored as JSON strings). Documents already appear in the Compliance/Insurance tabs.
- Verified: SP-0022 detail returns contact + 4 documents; proposed_rates/bank_details are
  JSON strings (now parsed). build passed.
- Handoff: redeploy + restart on Hostinger.

### 2026-08-29 19:15 | Claude Code (Opus 4.8) | COMPLETED | Provider onboarding/docs — review preview, doc metadata, fix false "Verified"
- Reports: provider invitation should ask all info needed for the agreement incl. insurance;
  compliance/insurance "showing verified" incorrectly; no preview of submitted documents on
  the dashboard for review.
- Root cause of "showing verified": verifyDocument had no guard, so document rows with NO
  uploaded file were marked Verified. Found 13 compliance/insurance docs across providers
  verified with no file (e.g. SP-0022 Trade Licence). RESET them to Pending, and added a
  guard: a document cannot be verified unless a file has been uploaded (file_url present).
- Document preview (the review gap): ProviderDetail's compliance/insurance table now has a
  token-authed "View" link per document (opens the uploaded file); the JWT /uploads route
  accepts ?token=. Uploaded docs (incl. the provider's own submissions) can now be reviewed.
- Onboarding now captures document metadata the agreement needs: each compliance/insurance
  row collects a document/policy number + expiry, and insurance rows also a sum insured;
  sent with the upload (publicWaterTankProvider.upload now stores sum_insured too).
- Note: documents are already provider-scoped (unique per provider) — the shared list is
  just the required-checklist (Trade Licence, TIN, … / Public Liability, …). The problem
  was the false-verified state, now fixed.
- Verified: backend loads + healthy; admin build passed; 13 bad docs reset.
- Handoff: redeploy + restart on Hostinger. (Public onboarding preview of one's own upload
  is not added — /uploads is JWT-gated and onboarding is token-only; the admin reviews.)

### 2026-08-29 20:00 | Claude Code (Opus 4.8) | COMPLETED | Design doc — duplicating a service line (Water Tank → AC → …)
- Request: an MD to duplicate the Water Tank service for Air Conditioning (and future
  services), such that fixes to core workflows (onboarding/quotation/assessment/invoice/
  agreement) auto-propagate to every service.
- Wrote SERVICE_MODULE_DUPLICATION.md: recommends a config-driven SHARED CORE (one codebase,
  a `service_line` column on the shared wt_* tables, a per-service "service manifest" holding
  the only per-service truth — labels/colour/code-prefixes/catalogue vertical/required docs/
  agreement templates/related_type/nav). Includes the WT inventory classified core vs
  service-specific, the generic-engine extraction to do first, the additive service_line
  migration pattern, route/console factories, the preferred "add a service = config" path,
  a physical-duplication fallback checklist (with the server.js↔manifest.js drift warning),
  and a Debt register to keep duplicated code in lockstep until unified.
- Docs only; no code change.

### 2026-08-29 21:30 | Claude Code (Opus 4.8) | STARTED | Air Conditioning service — duplicate Water Tank (branch air-conditioning/phase-0-duplicate)
- Request: create a new Air Conditioning console duplicating Water Tank; SOPs at
  Downloads/Air Conditioning/SOP; agreements to be shared later. Core-workflow edits
  must auto-propagate across services (per SERVICE_MODULE_DUPLICATION.md).
- Milestone 1 (foundation + AC window), all additive & WT-safe:
  * backend/config/serviceLines.js — service registry (WT + AC manifests from the AC SOP:
    AC adds Electrical/Refrigerant/Safety compliance + Professional Indemnity/Equipment
    insurance; ACCM-* code prefixes; air_conditioning_csa vertical; violet accent).
  * controllerHelpers — serviceScope(req)/resolveServiceLine(req) (defaults water_tank).
  * migration 0093 — additive service_line column on 26 wt_* tables (default water_tank,
    backfilled); ran OK. Models: service_line added to the shared `base` in both WT models.
  * admin api.js — sends X-Service-Line=air_conditioning when the path is /air-conditioning/*.
  * consoles.js — airConditioningConsole (nav rebased from WATER_TANK_NAV to
    /air-conditioning/*, violet); registered in CONSOLES. AirConditioningConsole.jsx shell.
  * App.jsx — 57 AC routes reusing the WT screen components + public AC onboarding route.
  * common.jsx — svcBase() helper for milestone-2 intra-screen path parameterization.
- Verified: backend loads; admin build passes; WT still returns its data.
- KNOWN (milestone 2, the "edit each by each"): controllers don't yet apply serviceScope to
  their where-clauses, so AC currently shares WT data (provider directory returns 6 for
  both). Next: swap branchScope→wtScope (branch+service) across WT controllers and set
  service_line on create paths; parametrize the catalogue vertical by service line; then AC
  is fully isolated. Also intra-screen nav() links still point at /water-tank (svcBase pass).
- Handoff: WIP on the AC branch. Not merged to main.

### 2026-08-29 22:10 | Claude Code (Opus 4.8) | COMPLETED | AC milestone 2a — provider module scoped by service_line (proven isolated)
- Applied branch+service scoping to waterTankProviders.controller: added serviceScope/
  resolveServiceLine imports + a local scoped(req)=branch+service; swapped all 26
  branchScope(req)→scoped(req); the provider create + dedupe now set/scope service_line.
- VERIFIED end to end: WT provider directory stays 6 (no header); AC directory (X-Service-
  Line: air_conditioning) is 0; creating a provider under AC returns service_line
  air_conditioning and shows ONLY under AC (WT unchanged at 6). Isolation mechanism proven.
- Next (2b+): repeat the scoped(req) pass on the other WT controllers (intake, clients,
  quotation, work-order, project, invoice, amc, disbursement, ops, reports, registers,
  agreementHub) + set service_line on their creates; parametrize the catalogue vertical by
  service line; then the svcBase() intra-screen nav pass.

### 2026-08-29 22:40 | Claude Code (Opus 4.8) | COMPLETED | AC milestone 2b (batch 1) — ops/registers/disbursement scoped
- Applied scoped(req)=branch+service to waterTankOps (16), waterTankRegisters (2),
  waterTankDisbursement (7) — all query only wt_* tables (safe). Tagged their creates with
  service_line (ops generic create; register common block → warranty/complaint/incident;
  disbursement creates).
- VERIFIED: WT dashboard still 22 active projects / 2 new leads (no header); AC dashboard 0/0.
  Isolation holds, WT unaffected.
- Remaining 2b (surgical — these controllers also touch non-wt tables Contact/SigningEnvelope/
  Property/ServiceItem, which lack service_line, so a blind swap would break them): intake,
  clients, quotation, work-order, project, invoice, amc, wtAgreements. Each needs scoped(req)
  ONLY on wt_* queries + service_line on creates. Plus thread service_line into
  wtIdentity.ensureClient/ensureProject, and parametrize the catalogue vertical. Then svcBase().

### 2026-08-29 23:30 | Claude Code (Opus 4.8) | COMPLETED | AC milestone 2b (batch 2) — clients/quotation/work-order/project/invoice/amc scoped
- Applied branch+service scoping to the remaining core controllers, protecting cross-module
  queries that lack service_line (Contact, Property, ServiceItem, SigningEnvelope*):
  * clients (Contact kept on branchScope), quotation (wt_* only), work-order (wt_* only;
    SigningEnvelope uses findByPk/its own create), project (Contact + Property kept),
    invoice (reference ServiceItem kept), amc (reference ServiceItem kept).
  * Tagged the record creates they own (clients: WtClient/WtProject; quotation: WtQuotation).
- VERIFIED WT intact + AC isolated: work-orders 51/0, projects 24/0, invoices 87/0, amc 5/0,
  clients populated/0, service-requests 14/0, providers 6/0, dashboard 22 projects/0.
- Remaining tail (service-layer creates default to water_tank via the model): thread
  service_line into wtIdentity.ensureClient/ensureProject (quotation-approval + generic
  link path), wtInvoice.service and wtAmc.service creates, and the signed-agreement WO
  create in wtWorkOrder.service; parametrize the catalogue vertical by service line
  (air_conditioning_csa) + seed it; then the svcBase() intra-screen nav pass over screens.

### 2026-08-30 00:10 | Claude Code (Opus 4.8) | COMPLETED | AC milestone 2c — service-layer creates carry service_line (full flow proven)
- Threaded service_line through the shared create paths: wtIdentity.ensureClient/ensureProject
  (scope lookups + set service_line, from hint/extra.service_line, default water_tank);
  attachIdentifiers passes body.service_line; setDecision (quotation approval) passes the
  quote's service_line; wtWorkOrder.service createFromSignedAgreement + createFromQuotation
  tag the WO service_line (from quote / envelope related_type).
- VERIFIED full AC flow: AC direct request → SR-1109 + Q-1067 (project null, deferred);
  approving Q-1067 opened project WTCM-P0026 — and every record (request, quote, project,
  client) is service_line=air_conditioning; WT untouched. Test rows cleaned up.
- Remaining tail: wtInvoice.service / wtAmc.service record creates (invoices/AMC raised via
  those services still default water_tank); parametrize the catalogue vertical
  (air_conditioning_csa) + seed it; then the svcBase() intra-screen nav pass over the shared
  screens so AC deep-links stay in the AC console.

### 2026-08-30 00:55 | Claude Code (Opus 4.8) | COMPLETED | AC milestone 2d — catalogue vertical per service line + AC catalogue seeded
- The ServiceItem catalogue is separated by `vertical` (not service_line). Added
  controllerHelpers.catalogueVertical(req) → the service line's catalogue_vertical
  (water_tank_csa / air_conditioning_csa). Swapped the hard-coded 'water_tank_csa' for it in
  the invoice/intake/amc/quotation/project controllers; parametrized the customer/provider
  agreement getCatalog with a `vertical` option and pass catalogueVertical(req) from the
  agreements controller.
- Seeded the AC catalogue: scripts/seedAirConCatalog.js cloned the 41 water_tank_csa items
  into air_conditioning_csa (a working starting point; operator refines via Price Schedule).
- VERIFIED: customer-agreement catalog + invoice reference each return 41 for WT and 41 for
  AC, from their own vertical.
- Remaining tail: wtCatalogue.service (Price Schedule screen) still uses a module-level
  VERTICAL='water_tank_csa' — the Price Schedule shows WT items regardless of console; small
  follow-up. Then the svcBase() intra-screen nav pass + rebuild dist.
