# Property Management — end-to-end improvement program

**Date:** 2026-09-08
**Status:** Approved decomposition; Phase 0 in progress
**Scope:** the whole PM section — admin console + landlord & tenant portals + public
application flow — across UI/UX, workflow, features, and money-critical bulk runs.

## Decisions taken with the user

- **Order:** Phase 0 audit first, then the bulk features, then UI/feature fixes.
- **Bulk Rent Collection model:** a single global "Collect Rent" run for the whole
  portfolio — pick the month, filter by owner / property / floor / arrears, every due
  tenancy shows as a row with arrears auto-filled + editable amount/date/receipt/method,
  record all in one pass. (Modeled on the Chhagalnaiya "EstateManager" bulk-payment page:
  owner → leases → common-month picker → per-lease editable entry → batch record.)
- **Walkthrough method:** API journey harness — mint test-role tokens via the auth API
  and drive the real backend end-to-end as tenant/landlord/manager (no password entry into
  forms). Optional live browser spot-checks by the user.

## Reference model (EstateManager bulk-payment)

`client/src/pages/bulk-payment.tsx`: select owner → `GET /api/owners/:id/bulk-payment-data`
returns leases with per-month due/paid/future flags; UI filters by floor + search, offers a
common-month selector applied across all leases, and per-lease editable {months, amount
(auto from arrears due), paymentDate, receiptNumber, notes}; collectable = unpaid (+optional
future) months with arrears carry-forward. This is the UX target for 7th Sky Phase 1.

## Phases

- **Phase 0 — End-to-end audit & defect list.** Drive the full lifecycle: public enquiry
  → tenant application (`/apply`) → staff review & accept → owner approval → agreement send
  & sign → tenancy activation → rent invoices → tenant-portal rent payment → owner statement
  → owner disbursement → maintenance → renewal/vacancy/deposit. Record every error, dead end
  and confusing step. Output: a prioritized defect + improvement list driving Phases 3–5.
- **Phase 1 — Bulk Rent Collection run** (global, month + filters) posting through the
  existing invoicing → receipt → folio engine so money stays correct.
- **Phase 2 — Bulk Owner Disbursement run** — batch the current one-owner payout: select
  owners with held balances, preview net per owner from the folio, pay in one batch, record
  OwnerDisbursement + payout ledger + statements.
- **Phase 3 — UI/UX + workflow improvements** from Phase 0 findings.
- **Phase 4 — Feature improvements / new features** from Phase 0 findings.
- **Phase 5 — Fix remaining errors** and re-run the end-to-end until green.

Each phase gets its own design → approval → build → verify. Phases 1 and 2 are the
money-critical headline work; Phase 0 grounds the rest.

## Constraints

- Money correctness is paramount: bulk runs post through the existing invoicing/folio
  services (no parallel money path).
- No password entry into forms by the assistant; role journeys use minted API tokens.
- Test users (from project memory): admin@seventhskyproperty.com / Admin#2026;
  buyer1@example.com / Owner#2026 (landlord); tenant1@example.com / Tenant#2026.
  Backend serves everything on :50001; gateway/UI on :3005.
