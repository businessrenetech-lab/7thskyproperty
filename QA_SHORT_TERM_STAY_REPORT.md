# QA Report — Short Term Stay Module

The Short Term Stay module (originally scaffolded by Gemini) had a substantial backend but
its workflow was non-functional and its UI did not match the platform. This pass fixed the
bugs, aligned the UI to the current system conventions, cleaned up the sidebar, and verified
the full guest journey end-to-end in the browser.

## What was broken (and fixed)

### Backend — the workflow never actually ran
1. **Booking creation always threw** — the guest folio was created with `folio_type: 'guest'`
   and `status: 'open'` (both invalid enums; valid are tenant/landlord/provider and
   active/closed/suspended) plus three nonexistent columns. Rewritten to valid Folio columns.
2. **No `hold → confirmed` path** — check-in requires a confirmed booking, but nothing could
   confirm one, so the whole guest journey dead-ended. Added `POST /bookings/:id/confirm`
   (records payment + security deposit to the folio, returns a **blocker list** if payment or
   deposit is incomplete, then advances to `confirmed`).
3. **Property could never be activated** — added `PATCH /properties/:id/status` with a
   gating rule (owner-management record required) and a **super-admin override with written
   reason**, mirroring the sales-settlement pattern.
4. **Dashboard 500** — queried `Contact.display_name` / `Contact.phone`; real columns are
   `full_name` / `primary_phone`.
5. **Agreement builds 500** — both owner and guest `EnvelopeSigner` records used wrong column
   names (`full_name`→`name`, `signer_role`→`role`, `signing_token`→`access_token`,
   `signing_order`→`signer_order`). Fixed with real access tokens + expiry.
6. **Owner-agreement activation looked up the wrong record** — `findByPk(related_id)` where
   `related_id` is the *property* id, not the management PK. Changed to `findOne({property_id})`.
7. **Writes lost their branch** — controllers used `branchScope(req).branch_id` (undefined for
   super-admin) for creates, so records/folios had `branch_id = null`. Switched writes to
   `resolveBranchId(req)`.
8. Added check-out gating (must be `checked_in`) and check-in house-rules acknowledgement.

### Frontend — did not match the current system UI
9. **Both drawers rendered permanently** over the page — the kit `Drawer` has no `isOpen`
   prop, but the hub passed `isOpen=`. Now conditionally rendered.
10. **`alert()` everywhere** → replaced with the shared **toast** system (`useToast`).
11. **Raw numeric ID inputs and hardcoded `contact_id: 1`** → replaced with the shared
    **`Combo` pickers** (searchable property / guest / owner selectors) and a property `Select`.
12. Added the missing **Confirm-booking**, **Activate-property (override)**, and
    **Owner-agreement** drawers so the workflow is fully operable from the UI.
13. Mapped guest fields to real columns (`full_name` / `primary_phone`).

### Sidebar — removed irrelevant menus
The nav had **10 sub-items but only one screen**, so 9 were dead links all showing the same
hub. Trimmed to the **7 real hub tabs**, each deep-linking via `?tab=` (Dashboard, Properties
& Listings, Reservations, Check-In/Out, Housekeeping & Turnovers, Incidents & Damage, Owner
Payouts). The hub is now URL-tab-aware, so every sidebar item lands on its section.

## End-to-end test (browser + DB verified)

| Step | Result |
|------|--------|
| Add STR listing (Combo master-property picker) | ✅ profile created (draft) |
| Booking blocked while property is draft | ✅ blocked with clear message |
| Activate property — gate + super-admin override w/ reason | ✅ blocked without owner mgmt; override → active |
| Create reservation (property Select + guest Combo) | ✅ STB-674586, ৳11,000, hold |
| Double-booking on overlapping dates | ✅ collision blocked |
| Send guest tenancy agreement (eSign envelope + signer) | ✅ envelope ENV-STG-… created → pending_agreement |
| Confirm booking — payment gating | ✅ partial blocked; full payment + deposit → confirmed (folio posted) |
| Check-in | ✅ → checked_in, property occupancy → occupied |
| Check-out | ✅ → checked_out, occupancy → available, **turnover housekeeping auto-scheduled** |
| Incident / deposit claim | ✅ #INC-1 damage/minor, ৳1,500 deposit deduction |
| Dashboard KPIs + Housekeeping tab | ✅ reflect the completed journey |

Owner agreement build (joint-owner ready) and guest agreement build both verified (201).

## Scope note — what is intentionally not built yet

The original brief spans 18 parts; this pass made the **implemented surface correct, polished,
and end-to-end functional**, not the entire brief. Still stubbed for a later phase: the
availability *calendar* screen, standalone readiness-assessment screen, full owner
statement/finance generation, the guest-enquiry funnel screen, and public token signing pages.
The data model and agreement/KYC hooks for these already exist; they need their own UI + service
work. These were removed from the sidebar so nothing advertises a screen that isn't there.
