# Property Care & Concierge Services — service line design

**Date:** 2026-09-08
**Status:** Approved (design), building
**Line key:** `property_care_concierge` · **env_tag:** PCC · **accent:** emerald `#059669`
**Source docs:** `SSPC-PCCS-SOP-01` (client SOP v0.2), `SSPC-PCCS-CSA-01` (customer agreement v0.2), `Seventh_Sky_MAPS_Property_Care_Concierge_CRM_Enterprise_Detailed_V0.2.xlsx`

## Summary

The 8th service line on the shared service-management core. It is an **internal-team delivery**
line (work done by Seventh Sky's own crew/vehicles, optional external subcontractors per work
order, **no provider service agreement**) — the same delivery model as Removal & Relocation, so it
reuses the Removal Team & Fleet + `allocate` work already on the core. The SOP is the standard
7-phase spine (Enquiry → Assessment → Quotation & CSA → Work Order & Resource Allocation → Service
Delivery → QA → Completion + Complaints). What makes this line different, and drives the net-new
work, is: **recurring/ongoing services** (a Frequency dimension), a **Property Asset & Maintenance
Register**, **Concierge & Access** (key-holding, access declarations, entry/exit checklists), and a
**Utility Coordination** register.

Decisions taken with the user:
- **Recurring services** → reuse the existing AMC recurring-visit engine (frequency → scheduled visits).
- **Bespoke modules** → build all four selected; the "Damage & Security Incidents" one extends the
  existing shared Incident register rather than duplicating it.
- **Delivery model** → internal team + optional subcontractors; customer agreement only.

## Line identity & manifest

`backend/config/serviceLines.js` entry `property_care_concierge`:
- code_prefix: client `PCC-C`, provider `PCC-P` (unused), request `PCCR-`, assessment `PCCA-`,
  quote `PCCQ-`, work_order `PCCW-`, invoice `PCCI-`. Envelope prefix `ENV-PCCCSA-`.
- catalogue_vertical `property_care_concierge_csa`; env_tag `PCC`.
- Behavior flags: `delivery_model: 'internal_team'`, `provider_agreement_required: false`,
  `team_fleet: true`, `two_locations: false` (single service property), plus the new module flags
  `asset_register: true`, `concierge: true`, `utility_coordination: true`.
- ui block: care/concierge vocab; single-location assessment with property-condition checks
  (size/condition/areas/accessibility/existing damage/safety/utilities/parking/security);
  7 service categories; staff/vehicle types; `incident_types` enriched for property care.
- related_type `property_care_concierge_customer_agreement` = 42 chars (fits VARCHAR(100), migration 0095).

## Catalogue

`backend/scripts/seedPropertyCareConciergeCatalog.js`, vertical `property_care_concierge_csa`. The 7
SOP/Schedule-A service groups with their sub-services (≈40 SERVICE items), plus LABOUR (crew roles)
and MATERIAL/consumable items. **All prices 0** — set on the frontend Price Schedule screen, flowing
into Schedule B/C and the work order. Groups:
1. Property Care & Maintenance (Cleaning, Gardening & Landscaping, Repairs & Maintenance, Painting,
   Minor Renovation, Emergency Assistance, Property Inspections, Utility Bill Assistance, Work
   Progress Reporting, Before & After Photography)
2. Property Presentation (Styling, Home Staging, Furnishing Assistance, Seasonal Preparation, Readiness)
3. Smart Property Solutions (CCTV, Smart Lock, Smart Home Devices, Access Control, Remote Monitoring)
4. Security & Monitoring (Vacant Property Checks, Property Monitoring, Emergency Response, Security Patrol)
5. Property Marketing Support (Photography, Videography, Drone, Listing Prep, Social Media)
6. NRB Property Services (Overseas Owner Reporting, Remote Monitoring, Periodic Video Inspection,
   Property Visit Reports, Overseas Owner Care)
7. Concierge Services (Mail Collection, Key Holding, Opening & Closing, Appointment Coordination,
   Utility Connection Assistance, Pre-Arrival Preparation)

## Agreements & work order

- Customer agreement pack `PCC_PACK` in `backend/services/wtCustomerAgreement.service.js`:
  doc_no `SSPC-PCCS-CSA-01`, 22 clauses (Purpose/Term/Services/Booking & WO/Responsibilities/Site
  Access/Fees & Payment/Payment Terms [incl. Ongoing or Scheduled Services]/Variations/Liability/
  Standard Price Schedule/Delays & Force Majeure/Property Damage & Complaints/Limitation/
  Confidentiality/Acknowledgements/Dispute/Suspension & Termination/General/Governing Law/Execution).
  Schedule A = the 7 service groups; code→Schedule-A map; Schedule B rows per group + Project Cost
  Summary + Payment Schedule; Schedule C = Project Summary. Checklist groups: **Client
  Acknowledgements**, **Property Access & Valuables Declaration**, **Service Standards**. No warranty
  group (rectification is via Complaints). Registered in the PACKS map by vertical.
- WO doc pack `PCC_PACK` in `backend/services/wtWorkOrderDoc.service.js`: doc_no `SSPC-PCCS-PWO-01`,
  Section 4 = Service & Property Details (incl. frequency). Registered in WO_PACKS.
- No provider master agreement (internal team).

## Recurring / ongoing services — reuse AMC

Add `PCC_PACKAGES` + `PCC_VISIT_TYPES` to the by-line maps in `backend/services/wtAmc.service.js`,
keyed `property_care_concierge`. Example packages: *Home Care Plan* (Cleaning weekly, Gardening
fortnightly, Inspection monthly), *Vacant Property Watch* (Inspection + Security check weekly),
*NRB Owner Care* (Video Inspection + Report monthly). Visit types: Cleaning, Gardening, Inspection,
Monitoring, Concierge, Maintenance. `generateVisitPlan` and `PAYMENT_FREQUENCIES` already handle the
frequency spread and instalment split. Ongoing services flow through the existing per-line AMC console.

## New modules (line-specific-module pattern)

Each: manifest flag → gated controller (`ensureX` returns 404 for other lines) → console-only nav
injection → `svcX()` frontend gate → model + migration `0101` + routes mounted in BOTH `server.js`
and `routes/manifest.js`. All scoped by branch + service_line.

1. **Property Asset Register** (`asset_register`) — model `waterTankPropertyAssets.js`
   (`wt_property_assets`, code `AST-`): client_id/code, property_address, area, category, brand_model,
   serial_no, condition, last_service_date, next_service_due, warranty_expiry, responsible_tech,
   maintenance_requirement, est_cost, status, photo_url, notes. Controller/routes `/api/wt-assets`
   (reference / list+search / summary [due-soon ≤30d, overdue, warranty-expiring] / CRUD). Frontend
   `PropertyAssets.jsx` + "Property Assets" nav. Helper `svcAssetRegister()`.
2. **Concierge & Access** (`concierge`) — models in `waterTankConcierge.js`:
   `wt_access_declarations` (code `ACC-`: key_access_method, alarm_managed, pets, vulnerable_persons,
   known_hazards, restricted_areas, valuables_secured, client_authorisation, declaration_date, notes)
   + `wt_property_visits` (code `VIS-`: work_order_code, property_address, visit_type [Entry/Exit],
   visit_date, access_method, condition, meter_readings, security_check, doors_locked, alarm_activated,
   keys_returned, photos, issues, completed_by, notes). Controller/routes `/api/wt-concierge`
   (declarations CRUD + visits CRUD + reference + summary). Frontend `Concierge.jsx` with two tabs.
   Helper `svcConcierge()`.
3. **Utility Coordination** (`utility_coordination`) — model `waterTankUtilities.js`
   (`wt_utility_requests`, code `UTL-`): client_id/code, property_address, utility_type,
   service_request, provider, account_ref, request_date, required_date, status, amount,
   client_approval, completion_date, notes. Controller/routes `/api/wt-utilities` (reference /
   list+search / summary / CRUD). Frontend `Utilities.jsx` + "Utilities" nav. Helper
   `svcUtilityCoordination()`.

## Extend the existing shared Incident register (4th selection)

The shared core already has `WtIncident` (`wt_incidents`, `INC-`, rendered on every console via
`waterTankRegisters.controller.js`). Instead of a new module: add PCC `incident_types` vocab to the
manifest (Property Damage, Security / Access Breach, Prohibited Conduct, Theft / Loss, Injury / WHS,
Equipment Failure, Other) and add optional columns to `wt_incidents` via migration 0101:
`pre_existing` (bool), `estimated_cost`, `responsibility`, `rectification_action`. Surface Incidents
in the PCC console. Model `WtIncident` in `waterTankOps.js` gets the same optional columns.

## Migration 0101

`backend/migrations/0101-property-care-concierge.js` (additive, idempotent, logs swallowed
addColumn/createTable errors — lesson from 0100): create `wt_property_assets`,
`wt_access_declarations`, `wt_property_visits`, `wt_utility_requests`; add the four optional damage
columns to `wt_incidents`.

## Frontend / console

- `admin-portal/src/config/consoles.js`: `propertyCareConciergeConsole` (emerald) + `PCC_NAV`
  (rebaseNav; the internal-team Team & Fleet group inherited from Removal replaces the Providers
  group; add Property Assets / Concierge & Access / Utilities; Incidents already present). Add to CONSOLES.
- `admin-portal/src/screens/watertank/PropertyCareConciergeConsole.jsx` shell + the three module screens.
- `admin-portal/src/App.jsx`: route block `/property-care-concierge/*` — customer agreement + AMC
  routes only, no provider-agreement routes; the three module routes; team-fleet route.
- `admin-portal/src/services/api.js`: add `['/property-care-concierge', 'property_care_concierge']`.
- `admin-portal/src/screens/watertank/common.jsx`: SERVICE_UI entry (care vocab, internal_team +
  team_fleet + asset_register/concierge/utility_coordination flags, single-location assess block) +
  SVC_BASES / LINE_TO_BASE / BASE_TO_VERTICAL + helpers svcAssetRegister / svcConcierge /
  svcUtilityCoordination.
- `admin-portal/src/ui/Layout.jsx`: "Property Care & Concierge" under the Services submenu.
- UI built to the **tidy-sheet** design language.

## Verification

A focused end-to-end script (e2eFullJourney is provider-centric, so not used for an internal-team
line): assessment vocab is care (no tank/removal terms); CSA declarations present; Team & Fleet crew
`CREW-`/vehicle `VH-`; intake → client `PCC-C` → request `PCCR-` → assessment → quote `PCCQ-` → CSA
`ENV-PCCCSA` + 2/2 sign → WO auto-raised `PCCW-` → allocate (crew+vehicle → Accepted) → schedule /
start / complete / verify → invoice `PCCI-`; AMC recurring plan (PCC package → visit plan); Property
Asset create + due-soon summary; Access Declaration + Entry/Exit visit; Utility request; Incident with
damage fields; water_tank AND a doc-verification line 404-gated on the new modules. `npm run build` passes.

## Non-goals (YAGNI)

- No provider onboarding / provider master agreement for this line.
- No new recurring engine — AMC is reused.
- No new incident module — the shared register is extended.
- The older standalone Property Care module (`Asset.js`/`UtilityBill.js`/`CareIncident.js`) is NOT
  reused or modified; this line lives entirely on the shared `wt_*` core.
