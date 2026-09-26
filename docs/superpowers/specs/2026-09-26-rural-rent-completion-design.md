# Rural Rent completion — disputes and the service registers

**Date:** 2026-09-26
**Status:** scoped from spec §12, awaiting review
**Parent spec:** `docs/superpowers/specs/2026-09-26-rural-rent-pm-console-design.md` (§12 Out of scope)
**Sources:** `Downloads/Rural-.../Rural/Rent/` — RURAL PROPERTY - RENT - WORKFLOW - CHECKLIST V0.1
(owner Sheets 18-22, tenant Sheets 19-23), SOP Rural Property Rental Management V0.1 §6 Step 4 and
§14, SOP Rural Property Tenancy Management V0.1 §12.

---

## 1. Why this is its own plan

Spec §12 deferred five things. Measured, they are **three** independent bodies of work, not one:

| Plan | Scope | Size |
|---|---|---|
| **A (this spec)** | dispute management, complaint / communication / feedback / closure registers | ~4 tasks; completes the live Rural Rent console |
| **B** | the Rural **Sale** SOP — seller and buyer pipelines, two V0.2 agreements, a corrupted template | ~10 tasks; the same size as the Rural Rent build |
| **C** | rural owner/tenant portal surfaces and the public website surface for rural listings | ~5 tasks; touches live public endpoints |

Building them as one plan would mix a small completion, a full second console and a public-surface
change behind a single review gate. They ship separately.

## 2. What already exists (measured, 2026-09-26)

- **13 `rural_rent` register definitions** (ids 149-161) seeded 2026-06-26 from the client's CRM
  workbook, with 8 entries against `ownership_verification`. The Rural Rent build rides these.
- **The five registers this plan needs do NOT exist.** Owner Sheets 19-22 (Complaint, Communication
  Log, Owner Feedback, Project Closure) and tenant Sheets 21-23 (Complaint, Tenant Feedback,
  Closure) have no definitions. This is the gap.
- **`property_risks` exists and is category-scoped** (proven by fixture in the isolation suite). The
  workbook's Risk Register examples — *Ownership Dispute, Boundary Dispute, Environmental Risk,
  Tenant Default, Access Risk, Regulatory Risk* — are risk **categories**, and the SOP escalation
  triggers already ride `project_stages.escalation_trigger` from the Rural Rent build.
- **`rural_sale` has 3 definitions** (`seller_master_register`, `property_register`,
  `offer_register`) — noted for Plan B, untouched here.

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | The five registers are **register definitions**, seeded by a script | Consistent with the 13 that already exist; definitions are data, not schema. No new tables. |
| 2 | Disputes ride **`property_risks`**, not a new table | It exists, it is category-scoped, and the workbook models disputes as risk categories. A dispute is a risk with a defined lifecycle. |
| 3 | A dispute gets a **lifecycle**, not just a row | The SOP escalates: raised → under review → escalated → resolved / closed. Without status transitions it is a note, not management. |
| 4 | Retention is **an attribute of closure**, not a sixth register | The workbook's "record retention compliance" is a field on the Closure register, not a separate sheet. |

## 4. Design

**The five registers** (`rural_rent` and `rural_tenancy` verticals, matching the workbook's columns):

| register_key | vertical | columns |
|---|---|---|
| `complaint_register` | rural_rent | date · party · complaint · severity · action_taken · resolved_on · outcome |
| `communication_log` | rural_rent | date · party · channel · subject · summary · follow_up |
| `owner_feedback_register` | rural_rent | date · owner · rating · feedback · action |
| `closure_register` | rural_rent | project · closed_on · final_reconciliation · records_archived · retention_until · notes |
| `tenant_feedback_register` | rural_tenancy | date · tenant · rating · feedback · action |

Tenant-side complaint and closure reuse the rural_rent definitions through the existing entry
filters rather than duplicating two more definitions for the same columns.

**Disputes** extend `property_risks` with the lifecycle the SOP implies: a `RURAL_DISPUTE_CATEGORIES`
constant (ownership, boundary, succession, access, environmental, regulatory, tenant default), a
status flow with recorded transitions, and an escalation flag that surfaces on the Operations view.
Existing risk rows are untouched and unscoped callers behave exactly as before.

**Surfaces:** one `Rural · Service Registers` screen (tabbed over the five, built from each
definition's own columns as the Ownership screen is) and a `Disputes` screen over the scoped risk
API. Both land in a new `Service & Disputes` nav group.

## 5. Verification

- **Unit:** the register seed is idempotent and does not touch the 13 that exist; the dispute status
  machine refuses an invalid transition; retention date math.
- **Isolation:** the new registers answer only for rural; `consoleIsolation` stays green.
- **E2E:** extend `scripts/e2e/ruralRent.js` — raise a dispute, move it through the lifecycle,
  record a complaint and a closure with a retention date, and assert the other three consoles are
  unmoved.
- **Baseline:** residential 53 managed / 103 open actions after every task.

## 6. Out of scope

Plan B (Rural Sale) and Plan C (portals and the public website surface). Also unchanged: the 118
accumulated E2E fixture properties in the production DB, which await a dry-run inventory and the
user's decision.
