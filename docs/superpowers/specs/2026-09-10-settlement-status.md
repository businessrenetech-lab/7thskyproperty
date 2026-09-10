# Settlement work — one reconciled status

**Date:** 2026-09-10 · **Branch:** `air-conditioning/phase-0-duplicate` (not merged)
**Purpose:** two tracks ran today against the same money code. This is the single status for both.
Everything below was checked in the repo or the running app, not assumed.

---

## The two tracks

| | Track A — *Agreed plan* | Track B — *Settlement redesign* |
|---|---|---|
| Source | `PROPERTY_SALES_SAAS_PHASED_PLAN.md` §14 (ChatGPT's plan + Claude's reconciliation) | `docs/superpowers/specs/2026-09-10-settlement-redesign.md` |
| Driven by | Architecture: stop duplicating the `/sales` engine | Owner's daily pain: "too complicated, too many verifications" |
| Plan file | `docs/superpowers/plans/2026-09-10-phase1-deals-sales-connect.md` | the spec above (§4 order of work) |

They are not rivals. **Track A says where money must live; Track B says how few clicks it takes.** Both converge on one authoritative money path (`/sales`).

## Combined status

| # | Work | Track | State | Commit |
|---|---|---|---|---|
| 1 | Read-model `GET /api/deals/:id/sales-picture` | A·1 | ✅ done | `0e0b52c` |
| 2 | Deal workspace driven by `/sales` (not `/deals`) | A·2 | ✅ done | `c502139` |
| 3 | Guided payout flow in the deal workspace | A·2b | ✅ done | `9d85d04` |
| 4 | Role gates + confirmations on money actions | A·2b fix | ✅ done | `429324c`, `5f2a190` |
| 5 | Deal workspace collapsed to one-click payout | B | ✅ done | `7d8d680` |
| 6 | `POST /sales/disbursements/:id/pay-out` — one verb for money-out | B·1 | ✅ done | `922d300` |
| 7 | One "Pay out" button per payout row | B·2 | ✅ done | `5fa8083` |
| 8 | Over-allocation blocked at creation | B·3 | ✅ done | `fa59eeb` |
| 9 | Settlement sub-tabs 7 → 3 | B·4 | ✅ done | `16616c5` |
| 10 | Stepper quietened, one primary action | B·5 | ✅ done | `118c3de` |
| 11 | Property-file hierarchy + text noise | B (extra) | ✅ done | `c978fcf`, `118dbf0` |
| 12 | **Retire the duplicate `/deals` money endpoints** | A·4 | ❌ **not done** | — |
| 13 | Draft agreed service-fee lines on settlement | A·3 | ❌ not done | — |
| 14 | Bulk settlement repointed to `/sales` readiness | A·4 | ❌ not done | — |
| 15 | End-to-end harness + real `npm test` | A·5 **=** B·6 | ❌ not done | — |

Items 15 (A·5) and (B·6) are the same piece of work — build it once.

## The one thing that matters most  ⚠️

**Two writable money paths still exist at the API level.**

- No screen calls the old path any more — verified: `DealSettlementWorkspace.jsx` contains **0** calls to `/deals/:id/settlement/receive|prepare|approve`, `/deals/:id/disbursements*` or `/deals/:id/settle`.
- But **8 `/deals` money routes are still registered and callable** (`backend/routes/deal.routes.js:12-23`): `settlement/bulk-data`, `settlement/bulk`, `:id/settlement/prepare`, `:id/settlement/approve`, `:id/settlement/receive`, `:id/disbursements`, `:id/disbursements/:did/pay`, `:id/settle`.

Those endpoints write money by the weak mechanics the agreed plan exists to remove — `LIKE '%DEAL:code%'` receipt matching, self-HTTP payment, a "paid" flag with no journal posting, no locking on the held-funds check. They are unreachable from the UI but reachable by anything holding a token.

**Until item 12 lands, the duplication the plan set out to end is still live.** That is the highest-value remaining task, ahead of any further UI work.

## Also outstanding

- **`npm test` is still the placeholder** (`backend/package.json:14` → `echo "Error: no test specified" && exit 1`). The real suite is the `backend/scripts/e2e*.js` harnesses, run by hand.
- **The over-allocation guard's arithmetic was proved against live data, but its full API path was never exercised** — that needs a fixture (active vendor party + verified bank account). Item 15 should cover it.
- Server-side "cleared out" and the screen's "Paid out" tile may differ on reversal-pair handling — worth confirming in item 15.

## Recommended order from here

1. **Item 12** — retire the `/deals` money endpoints (closes the duplication; the UI already doesn't need them).
2. **Item 15** — the harness, wired to `npm test`, covering the guard's API path and the reversal-pair question.
3. **Item 14** — bulk settlement onto `/sales` readiness.
4. **Item 13** — agreed service-fee drafting (needs the Phase-4 contracts catalogue, or an interim per-deal list).

## Not merged

All of the above sits on `air-conditioning/phase-0-duplicate`. Nothing has been merged to `main` and no PR has been opened.
