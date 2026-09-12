# Interior Design Solutions — Service Line Design

**Date:** 2026-09-13
**Status:** Approved for implementation planning
**Author:** Seventh Sky team + Claude

## 1. Summary

Add **Interior Design Solutions** as a new parent group of service lines on the
existing shared service-operations engine (the "Water Tank" console core, run
by every line and scoped by `service_line`). It has **7 client-facing verticals**
and **no service provider** side.

The first increment delivers the **shared framework + one complete vertical
(Residential Interior Design) end-to-end**. The other six are fast follow-ups —
each is one config entry + one Customer Service Agreement (CSA) "pack" + a
catalogue seed + a console entry, with no engine changes.

### The 7 verticals
| Vertical | short | CSA doc no. |
|---|---|---|
| Residential Interior Design | RIDS | SSPC-RIDS-CSA-01 |
| Commercial Interior Design | CIDS | SSPC-CIDS-CSA-01 |
| Custom Design & Fit-Out Solutions | CDFS | SSPC-CDFS-CSA-01 |
| Fitness Room Interior Design | FRID | SSPC-FRID-CSA-01 |
| Muslim Prayer Room IDS | PRID | SSPC-PRID-CSA-01 |
| Furniture & Styling Consultation | FSC | SSPC-FSC-CSA-01 |
| Space Planning & Renovation | SPR | SSPC-SPR-CSA-01 |

(Doc numbers confirmed against the source `.docx` during pack authoring.)

## 2. Goals / Non-goals

**Goals**
- Interior Design managed entirely inside the existing service console: clients,
  service requests, site visits, quotations, projects, work orders, **CSAs
  (rich e-sign)**, invoices, payments, reports, warranty/complaint registers.
- Each vertical's **original CSA content** (24 clauses + Schedules A–D) reflected
  faithfully, signed Seventh Sky ↔ Client + 2 witnesses.
- **Auto-drafted milestone invoices** from CSA Schedule C on signing.
- Dashboard + invoices identical to the other service lines.
- **No service provider** anywhere in these lines.

**Non-goals**
- No AMC (annual maintenance) module — not applicable to one-off projects.
- No provider onboarding / provider agreements / provider payouts / compliance &
  audits for these lines.
- The other 6 CSAs are authored in follow-up increments, not this one.

## 3. Architecture

Interior Design copies **no core code**. It reuses the shared engine exactly as
the 4 Doc-Verification sub-services do (shared `/api/wt-*` mount, scoped by the
`X-Service-Line` header, grouped under one `parent`).

**Reused as-is (no change):** the operations controllers/services, signing
(SigningEnvelope / EnvelopeSigner), the CSA renderer, the invoice engine incl.
the **existing agreement→invoice auto-draft** (`wtInvoice.service.js` +
`wtAgreementCompletion.onCompleted`, fired for any `*_customer_agreement`), and
the SSLCommerz "Pay Now" invoice gateway.

### 3.1 Backend changes

1. **`backend/config/serviceLines.js`** — add 7 entries, each with:
   - `parent: { key: 'interior_design', label: 'Interior Design Solutions' }`
   - `api_base: 'wt'`, unique `route_base`, `env_tag`, `catalogue_vertical`
     (e.g. `residential_interior_design_csa`), `short`, `accent`
   - `code_prefix` per the table above (client/project/request/assessment/
     quotation/work_order/invoice — **no `provider` prefix**)
   - `related_type.customer` = `residential_interior_design_customer_agreement`
     (etc.) — **no `related_type.provider`**
   - **`no_provider: true`** (new flag — see 3.3)
   - **`variations: true`**, **`completion_signoff: true`** (line modules — see 3.4)
   - `no_amc: true` (new flag to drop AMC — see 3.3)
   - `ui.*` vocabulary: project_types, categories, property_types,
     service_catalogue (from Schedule A), equipment fields relabelled
     (Space/Room details), report_types, warranty_types/months, complaint_types,
     incident_types — authored from each SOP + CSA.

2. **CSA pack** — `backend/services/wtCustomerAgreement.service.js`: add
   `RIDS_PACK` (clauses + Schedule A groups + `code_to_schedule_a` + Schedule B
   rows + Schedule D warranties + `doc_no`/`title`) and register it in `PACKS`
   under `residential_interior_design_csa`. Repeat per vertical in follow-ups.

3. **Catalogue seed** — Residential Schedule A/C service items (vertical
   `residential_interior_design_csa`) via the existing catalogue seed mechanism.

4. **Auto-invoicing** — no new code. Wiring the `related_type` correctly makes
   `wtAgreementCompletion.onCompleted` raise the Schedule C payment stages as
   draft invoices on signing (idempotent).

### 3.2 Frontend changes

1. **`admin-portal/src/config/consoles.js`** — one **"Interior Design Solutions"**
   parent that expands to the 7 verticals (mirroring the Doc-Verification parent
   grouping), each pointing at its `route_base`.
2. Console sidebar per line reuses the shared screens, with **Providers** and
   **Compliance & Audits** hidden by `no_provider`, **AMC** hidden by `no_amc`,
   and **Variations** + **Completion Sign-Off** shown by their flags. Reports +
   Issues registers shown.
3. Dashboard + Invoices screens unchanged (already service-line-aware).

### 3.3 The `no_provider` and `no_amc` flags (new)

No provider-disable flag exists today, so we add config-driven gating:

- **Backend:** where provider onboarding / provider-agreement / provider-payout /
  compliance endpoints are reached for these lines, refuse with a clear message
  (or omit the nav that reaches them). The **work-order lifecycle** for a
  `no_provider` line **skips provider assignment**; completion is gated by the
  **Project Completion Sign-Off** instead of provider verification.
- **Payments/Disbursements:** the provider-payable side is hidden; only client
  receivables remain (which is all Interior Design needs).
- **Frontend:** `consoles.js` and any shared screen that renders provider/AMC
  sections read these flags (via the capabilities/reference endpoint that already
  returns the line's `ui` config) and omit them.

The CSA text still *contains* the "Third-Party Service Providers" clause as
agreement wording — that is document content, not a managed provider.

### 3.4 Variations & Completion Sign-Off (line modules)

Modelled on the existing line-specific module flags (`loan_tracker`,
`verification_register`). During implementation I will first check whether the
existing **work-order** and **service-report** tables can carry these (a work
order already represents scope + amount; a variation is a re-priced scope change;
a completion sign-off is a structured report/acknowledgement). Decision rule:

- If existing tables suffice → add typed views/actions only, **no migration**.
- If not → **one small table each** (`interior_variations`, `interior_signoffs`)
  keyed by `service_line` + project/work-order, with a single migration.

The spec will be updated with the chosen option before coding that part; the
default assumption is **reuse existing tables** (YAGNI).

## 4. Data / migrations

- Reuses the shared operations tables, scoped by `service_line` — the same
  approach every other line uses (generic `tank_*`/`equipment` columns relabelled
  as interior fields). **No schema change for the core flow.**
- At most one small migration if Variations/Completion Sign-Off need their own
  tables (see 3.4).

## 5. Faithful CSA authoring (Residential, this increment)

Transcribe **Residential Interior Design – Customer Service Agreement V0.2**
(SSPC-RIDS-CSA-01) into `RIDS_PACK`:
- 24 clauses (Purpose, Term, Services, Project Details, Responsibilities, Client
  Responsibilities, Quotations & Work Orders, Fees & Payment, Payment Terms,
  Materials/Furnishings/Installation, Timelines, Variations, Third-Party
  Providers, Warranties, Defects/Damage/Complaints, Liability, Limitation,
  Confidentiality, Force Majeure, Acknowledgements, Suspension & Termination,
  General, Governing Law, Execution).
- Schedule A: Interior Design & Planning / Renovation & Fit-Out / Furniture &
  Styling / Project Coordination service groups.
- Schedule B: Project Summary rows (relabelled for interiors).
- Schedule C: Pricing & Payment (Professional Services, Renovation & Fit-Out,
  Furniture & Styling, Project Cost Summary, Payment Schedule → auto-invoices).
- Schedule D: Warranty Summary + exclusions.

Wording is taken verbatim/faithful from the source; no re-drafting of legal text.

## 6. Verification

New harness `backend/scripts/e2eInteriorDesign.js` (WT cookie-session style):
1. Create Interior Design client (Residential line).
2. Send + sign the Residential CSA (Seventh Sky + Client + 2 witnesses).
3. Assert Schedule C **auto-drafted milestone invoices** exist (deposit/progress/
   final) on the Interior Design line.
4. Raise project → work order (assert **no provider assignment** required).
5. Raise a **Variation**; complete via **Completion Sign-Off**.
6. Record/collect an invoice; assert **SSLCommerz pay-link** available (ready-for-keys).
7. Cross-line isolation: Interior Design invoices/income do **not** appear under
   Water Tank / Air Conditioning / other lines, and vice-versa.
8. Assert provider + AMC endpoints/nav are absent for the line.

Target: all assertions green, plus no regression in `e2eFullPmCookie` and the
existing WT/service harnesses.

## 7. Replication path (verticals 2–7)

Per vertical, a self-contained follow-up:
1. `serviceLines.js` entry (config only).
2. `*_PACK` authored from that vertical's CSA + register in `PACKS`.
3. Catalogue seed.
4. Console entry under the Interior Design parent.

No engine, migration, or frontend-screen work — so each is small and low-risk.

## 8. Risks & mitigations

- **Provider assumptions in the shared work-order flow.** The engine assumes a
  provider can be assigned/paid. Mitigation: `no_provider` gates the assignment
  step and swaps completion to Sign-Off; the E2E harness asserts the flow works
  with no provider.
- **CSA fidelity.** Legal wording must match the source. Mitigation: transcribe
  from the `.docx`, keep clause order/titles, review the rendered document
  against the source before sign-off.
- **Cross-line leakage.** Mitigation: explicit isolation assertions in the harness
  (mirrors the invoice-scoping work already done).

## 9. Out of scope / later

- CSAs for verticals 2–7 (separate increments).
- Any provider management for interior design (explicitly excluded).
- AMC for interior design (excluded).
