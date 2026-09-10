# Settlement Redesign — end to end, front and back

**Date:** 2026-09-10 · **Status:** PLAN FOR APPROVAL — nothing implemented yet.
**Trigger:** owner: *"payout sections allocate payments / record bank payments / mark failed — these are kind of duplicate. Redesign settlement from start to end, easy smooth process, both front and backend."*
**Method:** read from the running app (browser, property 11) and the live models — not assumed.

---

## 1. What is actually wrong (measured, not guessed)

| # | Finding | Evidence |
|---|---|---|
| F1 | **Two buttons for one intent.** Every payout row offers *Allocate payment* and *Record bank payment*. Both mean "the money went out". They differ only in whether a `sale_payments` row already exists. | Payouts tab, every row |
| F2 | **84 possible states for one payout.** `SaleDisbursement.status` has 7 values, `SalePayment.status` 4, `SalePayment.reconciliation_status` 3 — and the user is expected to drive them by hand. | `models/SalesModels.js:91,107` |
| F3 | **Over-allocation is allowed, then scolded.** The system lets payouts total ৳350,000 against ৳315,979 held, then shows a red banner saying they can never all be paid. | Payouts tab banner |
| F4 | **Seven sub-tabs under one tab.** Statement · Trust Ledger · Bank Recon · Beneficiary Ledgers · Funding Requests · Payouts · Audit Trail — inside the Settlement tab, which is itself 1 of 9 tabs. | Settlement tab |
| F5 | **Manual lifecycle driving.** Prepare → Submitted → Reviewed → Approved → Locked is clicked through by hand even where no human decision exists. | Control hub stepper |
| F6 | **Mark failed sits beside the pay actions** as an equal-weight button, so an exception is presented as a normal choice. | Payouts rows |

**The through-line:** the UI is a window onto the database's state machine. Every internal state became a button. The fix is to expose *intent* ("pay this vendor") and let the server run the states.

## 2. The redesigned process (target)

```
CREATE SETTLEMENT        money comes in            money goes out           CLOSE
      │                        │                          │                   │
  from accepted offer     Record receipt            Pay  (one button)      Lock
  fees auto-drafted       (buyer → trust)           per payee row          when
  from the agreement                                                       residual = 0
```

Four things a person does: **create · receive · pay · lock.** Everything else the server derives.

### 2a. One verb for money-out  *(fixes F1, F2, F6)*

Replace *Allocate payment* + *Record bank payment* with a single **Pay** button.

- **Backend:** one endpoint `POST /api/sales/disbursements/:id/pay-out`. It resolves the payment itself — reuses an existing unallocated payment that matches payee+amount, otherwise creates one — then clears and links it, in **one transaction**. The caller never chooses.
- **Failure** stops being a button. It becomes a *reported outcome*: if a transfer fails, that is recorded from the "Pay" result or from an explicit **Report a problem** action in the row's overflow menu — not a primary action sitting next to Pay.
- **Display status collapses to four human words**, derived server-side from the existing internal states (which stay intact for audit):
  | Shown | Derived from |
  |---|---|
  | **To pay** | disbursement pending/prepared, no payment |
  | **Paid** | disbursement paid |
  | **Waiting on bank** | payment exists, not yet cleared/reconciled |
  | **Problem** | failed / rejected / reversed |

### 2b. Guard at creation, not after  *(fixes F3)*

Validate a payout against **funds actually available** (held − already committed) at create time, and refuse with a clear message. The red "can never all be paid" banner then has nothing to report. Existing over-allocated rows get a one-time **Reduce to available** fix action.

### 2c. Auto-advance the lifecycle, keep the approvals  *(fixes F5)*

The approval gates are a real financial control and **stay** (owner decision, 2026-09-10). But:
- **Prepare** completes automatically once the statement balances — no click.
- **Submitted** happens on the preparer's "Send for review".
- **Reviewed / Approved** remain explicit human acts by different users (segregation of duties preserved).
- **Locked** is offered as one **Lock & complete** button the moment residual = 0 and blockers = 0.

Net: 5 manual steps → 2 human decisions (review, approve) + 1 finish click.

### 2d. Seven sub-tabs → three  *(fixes F4)*

| New tab | Absorbs |
|---|---|
| **Money** | Statement + Payouts |
| **Bank** | Bank Recon + Funding Requests |
| **Records** | Trust Ledger + Beneficiary Ledgers + Audit Trail |

Nothing is deleted — the same tables, regrouped by what the user is trying to do.

## 3. Scope of change

**Backend** (`sales.controller.js`, `salesSettlement.service.js`, `sales.routes.js`)
1. `POST /disbursements/:id/pay-out` — the one-verb endpoint (resolve-or-create payment → clear → link → post journal, transactional, idempotent).
2. `availableToCommit(settlementId)` in the service + validation inside `createDisbursement`.
3. `displayStatus` derived on each disbursement in the settlement read payload.
4. Auto-complete `prepare` when the statement balances.
5. `POST /disbursements/:id/report-problem` (replaces the bare `fail` as a primary path; `fail` stays for the API).

**Frontend** (`SalesPropertyFile.jsx`, `DealSettlementWorkspace.jsx`)
6. Payout row: **Pay** + an overflow menu (Report a problem · Cancel · details). Status chip uses `displayStatus`.
7. Payout create form: show available-to-commit, block over-allocation inline.
8. Settlement sub-tabs regrouped 7 → 3.
9. Control hub: auto-advanced steps shown as state, not buttons; single **Lock & complete** when eligible.

**Not changing:** the ledger, journals, trust accounts, approval policy, role gates, audit trail. Every record written today is still written.

## 4. Order of work

| Step | Change | Why first |
|---|---|---|
| 1 | Backend `pay-out` + `displayStatus` | The one-verb foundation; everything else leans on it |
| 2 | Frontend payout row → one **Pay** + overflow | Kills the visible duplication (F1, F6) |
| 3 | `availableToCommit` + create-time guard | Stops F3 at the source |
| 4 | Sub-tabs 7 → 3 | Structural relief (F4) |
| 5 | Lifecycle auto-advance + single Lock | Removes the manual stepper (F5) |
| 6 | End-to-end harness + browser verification | Prove the money path still reconciles |

Each step ends with the app rebuilt and **looked at in a browser**, not just compiled.

## 5. Success criteria

- Paying a vendor = **1 click** from the Payouts tab (today: 2 competing buttons + a status the user must interpret).
- A payout that exceeds available funds **cannot be created**.
- Settlement tab shows **3 sub-tabs**, not 7.
- Every ledger entry, journal, approval and audit row written today is still written.
- The end-to-end harness passes and the residual still reconciles to the minor unit.

## 6. Open questions

1. **Report a problem** — should a failed transfer automatically reopen the payout as "To pay", or stay parked until someone re-prepares it?
2. **Reduce to available** on existing over-allocated payouts — auto-suggest the reduced figure, or require the user to type it?
3. Does anyone rely on the **Funding Requests** tab today, or can it fold quietly into Bank?
