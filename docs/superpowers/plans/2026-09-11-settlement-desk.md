# Settlement Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two existing sales settlement UIs with one canonical, five-view Settlement Desk at a stable route, capturing money data once and cutting the routine receipt/payout clicks by ≥40%.

**Architecture:** A new `SettlementDesk` page (Approach A) at `…/property/:id/settlement`, built from five focused view components over a single `useSettlementDesk` data hook, a shared `AuditPanel`, and a shared `settlementMoney` helper module. It is a **pure client** over the Phase-1-proven `/sales` endpoints — no new backend endpoints, no schema change. Handles both completion and withdrawal/refund settlements. The DealsBoard drawer and bulk screen point at it; `DealSettlementWorkspace.jsx` retires.

**Tech Stack:** React 18 + Vite (`admin-portal`), `react-router-dom`, `ui/kit.jsx` components, `services/api` (axios), `context/ToastContext`, `context/AuthContext`. Backend Node/Express/Sequelize on `:50001` (unchanged).

**Spec:** `docs/superpowers/specs/2026-09-11-settlement-desk-design.md`

## Global Constraints

- **Zero new money endpoints / no schema change.** The desk only calls existing `/sales/*` routes (verified in the spec §3). Money rules stay server-side.
- **Verification model (this repo has no frontend test runner).** "Tests" here are: `cd admin-portal && npm run build` must end `✓ built`; a **browser walkthrough** of the specific behaviour on the running app (`admin-portal` dev server + backend on `:50001`); and, where money flow is touched, the backend harnesses `cd backend && npm test` and `npm run test:full` must stay green. TDD's red/green rhythm maps to: state the expected observable behaviour, confirm it's absent, implement, confirm it's present.
- **Preserve every server gate.** Never weaken a role check, separation-of-duties rule, or the "outgoing payment must be cleared + reconciled before pay" gate. The desk surfaces gates; it never bypasses them.
- **Reuse, don't reinvent.** Port the working helpers/payout-chain from `DealSettlementWorkspace.jsx` into `settlementMoney.js` rather than rewriting them. Use `ui/kit` components and existing `.pm-*` styles; no raw `.wt-*` styles.
- **Money maths in minor units.** BDT to 2 decimals; reuse the existing `money()`/minor helpers, never float-sum for equality.
- **Branch:** `air-conditioning/phase-0-duplicate`. Commit after each task. Attribution footer on every commit: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

**New (all under `admin-portal/src/screens/sales/settlement-desk/`):**
- `settlementMoney.js` — ported helpers: `money`, `unwrap`, `arr`, `label`, `STATUS_TONE`, `derivePaymentState`, `derivePayoutState`, `PROGRESS`, `STEP_LABEL`, `LIFECYCLE_ACTIONS`, `AGENCY_LINE_TYPES`, `PAYOUT_LINE_TYPES`, plus payout builders (`payoutKind`, `payoutStepFor`, `buildDisbursementPayload`, `buildPaymentPayload`) and prefill/`badge` builders. Pure functions, no React.
- `useSettlementDesk.js` — the data hook: composes the four `/sales` reads, exposes `{ picture, refetch, busy, error, call }`.
- `SettlementDesk.jsx` — the page/shell (header, badges, next-action, quiet stepper, `?view=` routing, AuditPanel, active view switch).
- `PrepareView.jsx`, `ReviewApproveView.jsx`, `RecordMoneyView.jsx`, `MatchBankView.jsx`, `CompleteView.jsx` — the five views.
- `AuditPanel.jsx` — collapsible trust ledger / beneficiary ledgers / approval trail.

**Modified:**
- `admin-portal/src/screens/sales/paths.js` — add `settlementDeskPath`.
- `admin-portal/src/App.jsx` — register the desk route under `/residential` and `/sales`.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — settlement section (lines ~2880–4644) → summary card + desk link.
- `admin-portal/src/screens/DealsBoard.jsx` — drawer (line ~90) → desk link instead of embedded workspace.
- `admin-portal/src/screens/SalesBulkSettlement.jsx` — per-row link into the desk Complete view.

**Deleted:** `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx` (Task 7, after porting).

**Backend:** none.

---

### Task 1: Foundation — helpers, route, data hook, shell skeleton + baseline capture

**Files:**
- Create: `admin-portal/src/screens/sales/settlement-desk/settlementMoney.js`
- Create: `admin-portal/src/screens/sales/settlement-desk/useSettlementDesk.js`
- Create: `admin-portal/src/screens/sales/settlement-desk/SettlementDesk.jsx`
- Create: `admin-portal/src/screens/sales/settlement-desk/AuditPanel.jsx`
- Modify: `admin-portal/src/screens/sales/paths.js`
- Modify: `admin-portal/src/App.jsx`

**Interfaces:**
- Produces: `settlementDeskPath(category, id) → string`; `useSettlementDesk(propertyId) → { picture, refetch, busy, error, call }` where `picture = { property, transaction, settlement, lines, payments, disbursements, parties, trust, blockers, statement, agencyQuote, bankLines, nextAction, partyBankAccounts }`; `SettlementDesk` default export (reads `:id` from route params, `?view=` from query).
- `call(fn, successMsg) → Promise<res|false>` — runs an api mutation, toasts success/error, returns the response or false; used by all views.

- [ ] **Step 1: Capture the Phase-0 baseline action counts (do this FIRST, before any code).**

On the running app, walk the CURRENT settlement flow in `SalesPropertyFile` for a prepared property and count discrete actions (click OR field entry OR navigation) for: (a) record a buyer receipt, (b) pay one payout end-to-end. Write the two counts into the spec's §9 acceptance block (edit `docs/superpowers/specs/2026-09-11-settlement-desk-design.md`, replacing the "estimated" ranges with the confirmed numbers and the ≥40% target = `ceil(baseline*0.6)`). Commit that spec edit alone:
```bash
git add docs/superpowers/specs/2026-09-11-settlement-desk-design.md
git commit -m "docs(settlement-desk): confirmed Phase-0 baseline action counts"
```

- [ ] **Step 2: Create `settlementMoney.js` by porting the helpers verbatim from `DealSettlementWorkspace.jsx`.**

Copy these top-of-file helpers/constants from `DealSettlementWorkspace.jsx` (lines ~40–102) into the new module and `export` each: `money`, `unwrap`, `arr`, `label`, `STATUS_TONE`, `PROGRESS`, `STEP_LABEL`, `PAYMENT_METHODS`, `AGENCY_LINE_TYPES`, `PAYOUT_LINE_TYPES`, `LIFECYCLE_ACTIONS`, `derivePaymentState(totals)`, `derivePayoutState(totals)`. Also port the payout-builder functions from within that component (lines ~290–495), rewritten as **pure functions that take their inputs as arguments** (they currently close over component state):

```js
// payoutKind(disbursement) -> payment_kind string
export const payoutKind = (d, partyById) => {
  const p = partyById?.[Number(d.transaction_party_id)] || null;
  if (p?.party_type === 'buyer') return 'buyer_refund';
  if (d.payee_type === 'vendor') return 'vendor_payout';
  if (d.payee_type === 'agency') return 'agency_fee';
  return 'third_party';
};

// Which step a disbursement is at: create -> record -> clear -> reconcile -> pay -> paid.
export const payoutStepFor = (d, paymentFor) => {
  if (!d) return 'create';
  if (d.status === 'paid') return 'paid';
  if (d.status === 'cancelled') return 'cancelled';
  const payment = paymentFor(d);
  if (!payment) return 'record';
  if (payment.status === 'rejected') return 'blocked';
  if (payment.status === 'cleared' && payment.reconciliation_status === 'reconciled' && payment.bank_statement_line_id) return 'pay';
  if (payment.status === 'cleared') return 'reconcile';
  return 'clear';
};

// Build the create-disbursement payload for a payable line.
// deps: { agencyBankAccountId, partyBankAccounts, payeeContactId(line), payeeFields(line), remainingForLine(line) }
export const buildDisbursementPayload = (line, deps) => {
  const amount = deps.remainingForLine(line);
  if (!amount) return { error: 'Nothing remaining on this obligation' };
  const fields = deps.payeeFields(line);
  const payload = { settlement_line_id: line.id, amount, payout_method: 'manual_bank', source_payment_id: null, ...fields };
  if (fields.payee_type === 'agency') {
    if (!deps.agencyBankAccountId) return { error: 'Set the agency operating bank account on the sales profile first' };
    payload.destination_bank_account_id = deps.agencyBankAccountId;
  } else {
    const contactId = deps.payeeContactId(line);
    const account = deps.partyBankAccounts.find((a) => a.status === 'verified' && Number(a.contact_id) === Number(contactId));
    if (!account) return { error: 'No verified bank account on file for this payee — add one in the full sales file' };
    payload.party_bank_account_id = account.id;
  }
  return { payload };
};

export const buildPaymentPayload = (d, partyById) => ({
  direction: 'outgoing', payment_kind: payoutKind(d, partyById), transaction_party_id: d.transaction_party_id || null,
  payment_at: new Date().toISOString(), value_date: new Date().toISOString().slice(0, 10),
  amount: d.amount, method: 'bank_transfer',
  to_account_name: d.bank_account_name || '', to_account_number: d.bank_account_number || '',
  reference: d.reference || `Payout #${d.id}`, proof_url: d.proof_url || '', status: 'pending',
  idempotency_key: `payout-payment-${d.id}-${Date.now()}`,
});

// Four headline badges from the picture (Contract / Settlement / Money due / Payouts).
export const deskBadges = (picture) => ({
  contract: picture.settlement?.contract_status || picture.badges?.contract || 'none',
  settlement: picture.settlement?.status || 'none',
  payment: derivePaymentState(picture.statement?.totals),
  payout: derivePayoutState(picture.statement?.totals),
});
```

Keep the exact `line_type` constant lists so behaviour matches the current screen. (The `payeeFields`/`payeeContactId`/`remainingForLine` closures stay in the view that has the parties/lines in scope and are passed in as `deps`.)

- [ ] **Step 3: Write `useSettlementDesk.js`.**

```js
import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { unwrap, arr } from './settlementMoney';

export function useSettlementDesk(propertyId) {
  const toast = useToast();
  const [picture, setPicture] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const file = unwrap(await api.get(`/sales/properties/${propertyId}`));
      const settlement = file.settlement || null;
      const sid = settlement?.id;
      const tx = file.transaction || file.activeTransaction || null;
      const [stmt, quote, bank, partyBanks] = await Promise.allSettled([
        sid ? api.get(`/sales/settlements/${sid}/statement`) : Promise.reject(),
        sid ? api.get(`/sales/settlements/${sid}/agency-fees`) : Promise.reject(),
        sid ? api.get(`/sales/settlements/${sid}/bank-lines`) : Promise.reject(),
        tx?.id ? api.get(`/sales/transactions/${tx.id}/bank-accounts`) : Promise.reject(),
      ]);
      setPicture({
        property: file.property || null,
        transaction: tx,
        settlement,
        profile: file.profile || null,
        lines: arr(settlement?.lines),
        payments: arr(settlement?.payments),
        disbursements: arr(settlement?.disbursements),
        parties: arr(tx?.parties),
        trust: file.trust || null,
        blockers: arr(file.blockers),
        nextAction: file.nextAction || file.next_action || null,
        statement: stmt.status === 'fulfilled' ? unwrap(stmt.value) : null,
        agencyQuote: quote.status === 'fulfilled' ? unwrap(quote.value) : null,
        bankLines: bank.status === 'fulfilled' ? arr(unwrap(bank.value)) : [],
        partyBankAccounts: partyBanks.status === 'fulfilled' ? arr(unwrap(partyBanks.value)) : [],
      });
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load the settlement.');
    } finally { setBusy(false); }
  }, [propertyId]);

  useEffect(() => { refetch(); }, [refetch]);

  const call = useCallback(async (fn, successMsg) => {
    setBusy(true);
    try { const res = await fn(); if (successMsg) toast.success(successMsg); await refetch(); return res; }
    catch (e) { toast.error(e.response?.data?.error || 'Action failed'); return false; }
    finally { setBusy(false); }
  }, [refetch, toast]);

  return { picture, refetch, busy, error, call };
}
```

Note: confirm the property-file read's key for blockers/nextAction against `getPropertyFile` (spec §3 lists them); adjust the field names above if the response uses different keys — grep `res.json` in `backend/controllers/sales.controller.js` `getPropertyFile` to confirm before finishing this step.

- [ ] **Step 4: Write `AuditPanel.jsx`.**

A `<details>`-based disclosure (default collapsed) taking `{ picture }` and rendering three small tables from `picture.trust.accounts` (beneficiary balances), `picture.statement.entries` (trust ledger with running balance), and `picture.statement.approvals` (approval trail: action, actor, from→to, reason). Use `ui/kit` `Badge` + `.pm-*` table classes. No mutations.

- [ ] **Step 5: Write the `SettlementDesk.jsx` shell.**

```jsx
import React from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { PageHead, Button, Badge, Spinner } from '../../../ui/kit';
import { useSettlementDesk } from './useSettlementDesk';
import { deskBadges, STATUS_TONE, label } from './settlementMoney';
import AuditPanel from './AuditPanel';
import PrepareView from './PrepareView';
import ReviewApproveView from './ReviewApproveView';
import RecordMoneyView from './RecordMoneyView';
import MatchBankView from './MatchBankView';
import CompleteView from './CompleteView';

const VIEWS = [
  { key: 'prepare', label: 'Prepare', C: PrepareView },
  { key: 'review', label: 'Review & approve', C: ReviewApproveView },
  { key: 'record', label: 'Record money', C: RecordMoneyView },
  { key: 'match', label: 'Match bank', C: MatchBankView },
  { key: 'complete', label: 'Complete', C: CompleteView },
];

export default function SettlementDesk() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const desk = useSettlementDesk(id);
  const view = sp.get('view') || 'prepare';
  const goView = (k) => setSp((prev) => { const n = new URLSearchParams(prev); n.set('view', k); return n; }, { replace: true });

  if (desk.error) return <div className="pm-card card-pad">{desk.error} <Button variant="ghost" size="sm" onClick={desk.refetch}>Retry</Button></div>;
  if (!desk.picture) return <div className="card-pad"><Spinner /></div>;
  const { picture } = desk;
  const badges = deskBadges(picture);
  const Active = (VIEWS.find((v) => v.key === view) || VIEWS[0]).C;

  return (
    <div className="settlement-desk">
      <PageHead
        title={`Settlement · ${picture.property?.property_code || picture.property?.title || ''}`}
        desc={picture.settlement ? `${label(picture.settlement.settlement_type)} settlement ${picture.settlement.settlement_code}` : 'No settlement yet'}
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Back</Button>}
      />
      <div className="desk-badges" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', badges.contract], ['Settlement', badges.settlement], ['Money due', badges.payment], ['Payouts', badges.payout]].map(([k, v]) => (
          <div key={k} className="card card-pad"><div className="cell-sub">{k}</div><Badge tone={STATUS_TONE[v] || 'grey'}>{label(v)}</Badge></div>
        ))}
      </div>
      {picture.nextAction && <NextAction picture={picture} goView={goView} desk={desk} />}
      <nav className="desk-stepper" role="tablist" style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
        {VIEWS.map((v) => (
          <button key={v.key} role="tab" aria-selected={view === v.key} className={view === v.key ? 'on' : ''} onClick={() => goView(v.key)}>{v.label}</button>
        ))}
      </nav>
      <Active picture={picture} desk={desk} goView={goView} />
      <AuditPanel picture={picture} />
    </div>
  );
}
```

Add a small `NextAction` component in the same file: it reads `picture.nextAction` (e.g. `submit_settlement`, `review_settlement`, `approve_settlement`, `clear:<blocker>`, `lock_settlement`, `complete`) and renders ONE prominent button that either jumps to the owning view (`goView`) or, for a direct action, calls the relevant endpoint via `desk.call`. For `clear:<blocker>` map the blocker to its owning view (a `BLOCKER_VIEW` map: payment/receipt blockers → `record`, reconciliation → `match`, approval/lifecycle → `review`, everything else → `complete`).

- [ ] **Step 6: Add `settlementDeskPath` to `paths.js`.**

```js
/** The five-view settlement desk for one property's settlement. */
export const settlementDeskPath = (category, id) => `${salesBase(category)}/property/${id}/settlement`;
```

- [ ] **Step 7: Register the route in `App.jsx` under both bases.**

Add `import SettlementDesk from './screens/sales/settlement-desk/SettlementDesk';` and two routes beside the existing property-file routes:
```jsx
<Route path="/residential/property/:id/settlement" element={<SettlementDesk />} />
<Route path="/sales/property/:id/settlement" element={<SettlementDesk />} />
```

- [ ] **Step 8: Create placeholder view files so the shell compiles.**

Create `PrepareView.jsx`, `ReviewApproveView.jsx`, `RecordMoneyView.jsx`, `MatchBankView.jsx`, `CompleteView.jsx`, each a default-export component `({ picture, desk, goView }) => <div className="pm-card card-pad">…name… (coming next)</div>`. They get real bodies in Tasks 2–6.

- [ ] **Step 9: Verify.** `cd admin-portal && npm run build` → `✓ built`. Then on the running app open `…/property/<a prepared property id>/settlement`: header, four badges, next-action button and the five-tab stepper render; switching tabs updates `?view=` and survives refresh; AuditPanel expands. Paste the build tail into the report.

- [ ] **Step 10: Commit.**
```bash
git add admin-portal/src/screens/sales/settlement-desk admin-portal/src/screens/sales/paths.js admin-portal/src/App.jsx
git commit -m "feat(settlement-desk): shell, route, data hook + ported money helpers"
```

---

### Task 2: PrepareView — obligation schedule, edit fee, rebalance

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/PrepareView.jsx`

**Interfaces:**
- Consumes: `{ picture, desk }` from Task 1. Uses `picture.lines`, `picture.parties`, `picture.statement.totals`, `picture.settlement.status`; `desk.call`.
- Produces: nothing consumed downstream (leaf view).

- [ ] **Step 1: Behaviour to reach.** On a draft/returned settlement, the view lists every settlement line grouped as the current screen does — purchase price, then payable obligations (commission, advertising, vendor_proceeds, refunds, other deductions) with payee name and amount, and an expected-vs-actual summary from `picture.statement.totals`. Confirm this is absent (placeholder still shows).

- [ ] **Step 2: Render the schedule.** Build a `<table className="tbl">` of `picture.lines`: columns Line type (`label`), Payee (resolve `payee_transaction_party_id` → party `snapshot_name`, else `payee_contact_id`, else agency/—), Terms, Amount (`money`). Above it, a summary strip from `picture.statement.totals`: purchase price, obligations, funds held, residual. Use `PAYOUT_LINE_TYPES`/`AGENCY_LINE_TYPES` from `settlementMoney` to tag editable fee rows.

- [ ] **Step 3: Edit a fee.** For a `commission`/`advertising` line, an "Edit" button opens an inline form (amount + a required reason). Save → `desk.call(() => api.patch(\`/sales/settlement-lines/${line.id}/fee\`, { amount, edit_reason: reason }), 'Fee updated')`. Disable editing unless `picture.settlement.status` is `draft`/`returned` and the user has the prepare role (reuse the role flags the current screen computes from `useAuth`; PREPARE = super_admin/branch_admin/property_manager/sales_executive).

- [ ] **Step 4: Rebalance.** A "Rebalance vendor proceeds" button → `desk.call(() => api.post(\`/sales/settlements/${sid}/rebalance\`, {}), 'Rebalanced')`. Same draft/returned + role gate.

- [ ] **Step 5: Verify.** `npm run build` clean. On a draft settlement: schedule + summary render with correct payees/amounts; edit a commission fee with a reason and see the figure update after refetch; rebalance runs. On an approved settlement, edit/rebalance are disabled. Confirm `cd backend && npm test` still green (no backend change, sanity).

- [ ] **Step 6: Commit.** `git commit -am "feat(settlement-desk): Prepare view — schedule, edit fee, rebalance"`

---

### Task 3: ReviewApproveView — lifecycle actions + approval trail

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/ReviewApproveView.jsx`

**Interfaces:**
- Consumes: `{ picture, desk }`; `picture.settlement.status`, `picture.statement`, `LIFECYCLE_ACTIONS` from `settlementMoney`; `useAuth` role flags.

- [ ] **Step 1: Behaviour to reach.** The view shows the read-only statement summary and exactly the lifecycle action(s) valid for the current status, gated by role, plus the approval trail. Submit→review→approve moves the settlement forward; a single-user branch can use the super-admin override with a written reason.

- [ ] **Step 2: Render.** A read-only totals panel (from `picture.statement.totals`) + the approval trail table (`picture.statement.approvals`: action, actor, from→to status, reason, date). Then the lifecycle buttons: iterate `LIFECYCLE_ACTIONS` and show a button when `action.from.includes(settlement.status)` AND the user's role matches (`accounts` actions: super_admin/branch_admin/accounts; `approve`: super_admin/branch_admin). Add a `Return` button for `submitted`/`reviewed`/`approved` (requires a reason).

- [ ] **Step 3: Wire the actions.**
```js
const act = (key, extra = {}) => desk.call(
  () => api.post(`/sales/settlements/${sid}/${key}`, extra),
  `Settlement ${key === 'return' ? 'returned' : key + 'ed'}`,
);
```
For `return`, prompt for a reason and send `{ reason }`. For review/approve/lock, when the current user is super_admin offer an "override separation of duties" checkbox + reason and send `{ override: true, override_reason }` (the server enforces the rule; this only surfaces it).

- [ ] **Step 4: Verify.** `npm run build` clean. On a prepared settlement with cleared+reconciled receipt, drive submit → review → approve (using the override as a single user) and watch the status badge + trail update. A wrong-status action isn't shown. `npm run test:full` still green.

- [ ] **Step 5: Commit.** `git commit -am "feat(settlement-desk): Review & approve view — lifecycle + trail"`

---

### Task 4: RecordMoneyView — capture-once Receive + one-click Pay

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/RecordMoneyView.jsx`

**Interfaces:**
- Consumes: `{ picture, desk }`; `settlementMoney` helpers (`buildDisbursementPayload`, `buildPaymentPayload`, `payoutStepFor`, `PROGRESS`, `PAYMENT_METHODS`, `money`, `label`); `useAuth`.

- [ ] **Step 1: Behaviour to reach.** Two panels. **Receive**: a prefilled buyer-receipt form (payer = primary buyer party, amount = remaining due = `purchase_price − cleared receipts`, method default) that records in one save. **Pay**: one row per payable line/disbursement with a single "Pay out" button that chains create→record→clear, resuming from the row's actual step; plus "Match bank"/"Mark paid" once further along. Advanced granular controls live under a disclosure.

- [ ] **Step 2: Local `deps` closures (parties/lines are in scope here).**
```js
const partyById = Object.fromEntries(picture.parties.map((p) => [Number(p.id), p]));
const primaryBuyer = picture.parties.find((p) => p.party_type === 'buyer' && p.is_primary) || picture.parties.find((p) => p.party_type === 'buyer');
const clearedReceipts = Number(picture.statement?.totals?.receipts || 0);
const remainingDue = Math.max(0, Number(picture.statement?.totals?.purchase_price || 0) - clearedReceipts);
const remainingForLine = (l) => { /* line.amount minus non-cancelled disbursements on that line, in minor units → number */ };
const payeeFields = (l) => { /* { payee_type, transaction_party_id?, contact_id? } from line type + parties, mirroring DealSettlementWorkspace payeeFieldsForLine */ };
const payeeContactId = (l) => { /* vendor/buyer party contact_id, or line.payee_contact_id */ };
const paymentFor = (d) => picture.payments.find((p) => Number(p.id) === Number(d.payment_id)) || null;
```
Port `remainingForLine`, `payeeFields`(`payeeFieldsForLine`), `payeeContactId` from `DealSettlementWorkspace.jsx` (lines ~261–290) unchanged in logic.

- [ ] **Step 3: Receive form.** Fields prefilled: `transaction_party_id = primaryBuyer?.id`, `amount = remainingDue`, `method='bank_transfer'`, `reference`, optional `proof_url`. Save:
```js
desk.call(() => api.post(`/sales/settlements/${sid}/payments`, {
  direction: 'incoming', payment_kind: 'buyer_receipt',
  transaction_party_id: form.transaction_party_id, amount: form.amount,
  reference: form.reference, method: form.method, proof_url: form.proof_url || undefined,
  status: 'cleared',
}), 'Receipt recorded');
```
(Server posts journal + records trust receipt on `cleared`.) Gate: accounts role.

- [ ] **Step 4: Pay rows + one-click chain.** Build `payableRows` exactly as `DealSettlementWorkspace` does (existing disbursements first, then untouched payable lines while draft/returned). Each row shows `PROGRESS[payoutStepFor(d, paymentFor)]` and a primary button whose label follows the step: "Pay out" (create/record/clear), "Match bank" (reconcile → jump `goView('match')`), "Mark paid" (pay). Implement `startPayout(row)` by porting the chain from `DealSettlementWorkspace.jsx` (lines ~496–535), using the pure builders from `settlementMoney` with a `deps` object:
```js
const deps = { agencyBankAccountId: picture.profile?.agency_bank_account_id, partyBankAccounts: picture.partyBankAccounts, payeeFields, payeeContactId, remainingForLine };
// create -> record -> clear, resuming from payoutStepFor(); each await via api, refetch at the end.
```
Keep the `window.confirm` money confirmations and the `chainError` surfacing (never swallow a failure). "Mark paid" stays gated: only when the linked payment is `cleared` + `reconciled` + has a `bank_statement_line_id` (call `/sales/disbursements/:id/pay`).

- [ ] **Step 5: Advanced disclosure.** Under a `<details>`, expose the granular controls ported from `DealSettlementWorkspace` (manual create-payout with custom amount/account, record-outgoing-by-hand, clear-by-hand, submit transfer, cancel payout) — same endpoints, same gates. This preserves every existing capability behind one disclosure.

- [ ] **Step 6: Verify.** `npm run build` clean. On an approved settlement: the Receive form is prefilled with the buyer and the remaining due; recording it needs one save. A payable line pays out in one click (confirm), then shows "Match bank". `cd backend && npm test && npm run test:full` — both green (the desk drives the same endpoints the harnesses assert). Record the desk's action counts for receipt and payout (for Task 8's gate evidence).

- [ ] **Step 7: Commit.** `git commit -am "feat(settlement-desk): Record money — capture-once receive + one-click payout"`

---

### Task 5: MatchBankView — reconcile with suggested matches

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/MatchBankView.jsx`

**Interfaces:**
- Consumes: `{ picture, desk }`; `picture.payments`, `picture.bankLines`, `picture.settlement`; `money`, `label`.

- [ ] **Step 1: Behaviour to reach.** Lists every cleared payment whose `reconciliation_status !== 'reconciled'`. For each, shows client-ranked candidate bank lines and a one-click "Match" that reconciles against the chosen line + an uploaded statement URL. Importing a bank line is available; a match is never fabricated.

- [ ] **Step 2: Rank candidates (client-side, no backend).**
```js
const expectedMinor = (p) => (p.direction === 'incoming' ? 1 : -1) * Math.round(Number(p.amount) * 100);
const candidatesFor = (p) => picture.bankLines
  .filter((l) => l.status === 'unmatched' || (l.matched_entity_type === 'sale_payment' && Number(l.matched_entity_id) === Number(p.id)))
  .map((l) => ({ l, exact: Math.round(Number(l.amount) * 100) === expectedMinor(p) }))
  .sort((a, b) => (b.exact - a.exact));
```
Show exact-amount candidates first, flagged "exact match".

- [ ] **Step 3: Match action.** Each unreconciled cleared payment row: pick a candidate line (default the top exact one) + a statement URL field (must match `/^\/uploads\/documents\/[a-z0-9._-]+$/i`, the server's rule). Confirm →
```js
desk.call(() => api.post(`/sales/payments/${p.id}/reconcile`, {
  reconciliation_status: 'reconciled', bank_statement_line_id: Number(lineId), statement_url: url,
}), 'Payment matched');
```
Also an "Import a bank line" inline form → `POST /sales/settlements/:sid/bank-lines` `{ date, description, reference, amount }` (signed), then it appears as a candidate. Exceptions (no candidate) stay listed as outstanding.

- [ ] **Step 4: Verify.** `npm run build` clean. After a receipt and a payout are cleared, both appear here; each shows an exact-amount candidate first; matching one flips it to reconciled and it leaves the list. `npm run test:full` green.

- [ ] **Step 5: Commit.** `git commit -am "feat(settlement-desk): Match bank view — ranked reconciliation"`

---

### Task 6: CompleteView + withdrawal/refund reshaping

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/CompleteView.jsx`
- Modify: `admin-portal/src/screens/sales/settlement-desk/SettlementDesk.jsx` (withdrawal labels + entry)

**Interfaces:**
- Consumes: `{ picture, desk, goView }`; `picture.blockers`, `picture.settlement`, `picture.statement`, `picture.transaction`.

- [ ] **Step 1: Behaviour to reach.** Complete view shows the readiness check: if `picture.blockers` is non-empty, list each with a human label and a **Resolve link** that jumps to the owning view; when empty and status is `approved`, a prominent **Lock & complete** button. Below, the closing statement summary and a **Issue vendor invoice** action. For a `withdrawal` settlement the same views relabel and completion uses the withdrawal path.

- [ ] **Step 2: Blocker list + Resolve links.** Render `picture.blockers` with a `BLOCKER_LABEL` map (e.g. `settlement_residual_nonzero → "Settlement doesn't balance"`, `unreconciled_payments → "A cleared payment isn't matched to the bank"`, `pending_disbursements → "A payout is still pending"`, `posting_required`, `party_kyc_not_verified`, `agency_agreement_not_signed`, etc.) and a `BLOCKER_VIEW` map routing each to `record`/`match`/`review`/`complete`; each row has a "Resolve" button calling `goView(BLOCKER_VIEW[b] || 'complete')`.

- [ ] **Step 3: Lock.** When `blockers.length === 0 && settlement.status === 'approved'`, show "Lock & complete" → `desk.call(() => api.post(\`/sales/settlements/${sid}/lock\`, override ? { override:true, override_reason } : {}), 'Settlement locked')`. After success the badges flip and (completion) the property becomes sold — the shell refetch reflects it.

- [ ] **Step 4: Vendor invoice + closing statement.** A summary from `picture.statement` (totals + per-beneficiary payout) and an "Issue vendor invoice" button → `POST /sales/settlements/:sid/vendor-invoice` (accounts role). Link to `GET …/vendor-invoice` result if present.

- [ ] **Step 5: Withdrawal reshaping.** In `SettlementDesk.jsx`, when `picture.settlement?.settlement_type === 'withdrawal'`, relabel the stepper's Prepare→"Withdrawal schedule" and the money view's Pay→"Refund", and CompleteView uses the same blocker rendering (the server already returns `withdrawalBlockers` in `picture.blockers` for a withdrawal). Add an **"Unwind / refund"** entry: when a completion settlement is draft/returned with cleared receipts, a button in CompleteView → `desk.call(() => api.post(\`/sales/transactions/${txId}/withdrawal\`, { buyer_party_id, reason, ...}), 'Withdrawal opened')` then refetch (the buyer_party_id/deductions come from a small inline form).

- [ ] **Step 6: Verify.** `npm run build` clean. On a fully-paid approved settlement, Complete shows zero blockers and Lock completes it → property sold (confirm via the badges + reload). Introduce a blocker (e.g. an unmatched payment) and confirm its Resolve link jumps to Match. Open a withdrawal settlement on a case with a cleared receipt and confirm the views relabel and its blockers list. `cd backend && npm run test:full` green.

- [ ] **Step 7: Commit.** `git commit -am "feat(settlement-desk): Complete view + withdrawal/refund reshaping"`

---

### Task 7: Make the desk canonical — repoint entry points, retire DealSettlementWorkspace

**Files:**
- Modify: `admin-portal/src/screens/DealsBoard.jsx`
- Modify: `admin-portal/src/screens/SalesBulkSettlement.jsx`
- Modify: `admin-portal/src/screens/sales/SalesPropertyFile.jsx`
- Delete: `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx`

**Interfaces:**
- Consumes: `settlementDeskPath(category, id)` from Task 1.

- [ ] **Step 1: DealsBoard drawer → desk link.** In `DealsBoard.jsx` remove the `import DealSettlementWorkspace` (line 8) and replace `<DealSettlementWorkspace dealId={sel.id} />` (line ~90) with a compact block: the four badges (if a settlement summary is cheaply available from the deal row) plus a primary button `onClick={() => navigate(settlementDeskPath(category, sel.property_id || sel.Property?.id))}` labelled "Open Settlement Desk". Import `useNavigate` and `settlementDeskPath`. (If `sel` lacks `property_id`, read it from `detail` which the drawer already loads.)

- [ ] **Step 2: Bulk screen row link.** In `SalesBulkSettlement.jsx`, add a "Open" link/button per row → `navigate(settlementDeskPath('residential', row.property_id) + '?view=complete')`. If the readiness row lacks `property_id`, add it to the backend `salesBulkData` response (it already loads each deal; include `property_id: deal.property_id`) — this is the one small allowed backend read change; note it in the commit. Verify the bulk endpoint still returns and the link resolves.

- [ ] **Step 3: SalesPropertyFile settlement section → summary + link.** Replace the body of the `section === "settlement"` block (`SalesPropertyFile.jsx` ~2880–4644) with a compact summary card (status + the four badges if already computed in that file, else just the settlement status/next action it already has) and a primary "Open Settlement Desk" button → `navigate(settlementDeskPath(category, id))`. Remove the now-dead money/bank/records sub-tab render and any helpers used ONLY by it (leave anything still used by other sections). Keep the `settlement` entry in `SECTIONS`.

- [ ] **Step 4: Delete `DealSettlementWorkspace.jsx`** and confirm nothing imports it: `grep -rn "DealSettlementWorkspace" admin-portal/src` returns nothing.

- [ ] **Step 5: Verify.** `npm run build` clean. Browser: the DealsBoard deal drawer now opens the desk; the bulk screen rows link into the desk Complete view; the property file's Settlement section shows the summary + desk link and every OTHER section (overview/parties/assessment/enquiries/offers/onboarding/documents/activity) still renders. `cd backend && npm test && npm run test:full` green.

- [ ] **Step 6: Commit.** `git commit -am "refactor(settlement): make Settlement Desk canonical; retire DealSettlementWorkspace"`

---

### Task 8: Mobile layout + 40% gate evidence

**Files:**
- Modify: `admin-portal/src/screens/sales/settlement-desk/SettlementDesk.jsx` (+ a scoped stylesheet or inline styles)
- Modify: `docs/superpowers/specs/2026-09-11-settlement-desk-design.md` (§9 acceptance)

**Interfaces:** none new.

- [ ] **Step 1: Responsive shell.** Add scoped styles (a `settlement-desk.css` imported by the shell, or a `<style>` block) so that at ≤640px: the `.desk-stepper` renders as a full-width `<select>` stage selector (render both, hide one via CSS/media query, or branch on a `useMediaQuery`), the next-action becomes a `position: sticky; bottom: 0` bar, forms in the views go full-width/full-screen, and any `.tbl`/statement sits inside a wrapper with `overflow-x: auto`. Side gutter ≥16px; body never scrolls horizontally.

- [ ] **Step 2: Verify responsive.** `npm run build` clean. In the browser at ~400px and ~640px widths: stage selector replaces the tab row, the next-action bar sticks, forms are usable, tables scroll within their box, no horizontal page scroll. At desktop width the original layout is unchanged.

- [ ] **Step 3: Capture the "after" action counts** for the two routine tasks (record a receipt; pay a payout) performed in the desk, using the same action definition as the Task 1 baseline. Compute the reduction vs the confirmed baseline.

- [ ] **Step 4: Record the gate evidence.** Edit the spec §9 acceptance block with the confirmed before/after counts and the % reduction for both tasks; state pass/fail against ≥40%. If either task falls short, note which extra clicks remain and address them (usually a still-separate confirm or field) before claiming the gate.

- [ ] **Step 5: Commit.**
```bash
git add admin-portal/src/screens/sales/settlement-desk docs/superpowers/specs/2026-09-11-settlement-desk-design.md
git commit -m "feat(settlement-desk): mobile layout + 40% action-count gate evidence"
```

---

## Self-Review

**Spec coverage:**
- §3 route/hook/zero-endpoints → Task 1 (+ the one allowed `property_id` read addition noted in Task 7 Step 2).
- §4 shell + five views → Task 1 (shell) + Tasks 2–6 (views).
- §5 capture-once → Task 4.
- §6 withdrawal/refund → Task 6.
- §7 canonical wiring + retirement → Task 7.
- §8 mobile → Task 8 Steps 1–2.
- §9 40% gate (baseline + after) → Task 1 Step 1 (baseline) + Task 8 Steps 3–4.
- §10 testing → each task's verify step runs build + browser + `npm test`/`test:full` where money flow is touched.

**Placeholder scan:** The view JSX is specified by exact data fields, endpoints, payloads and ported source locations rather than full pixel-level markup — deliberate for a large React build in an existing codebase with established `ui/kit`/`.pm-*` patterns; every logic-bearing piece (hook, payout chain, prefill builders, ranking, badge derivation, lock/blocker routing) has real code or an exact port reference. No "TBD"/"handle edge cases"/"similar to Task N". The one investigation note (Task 1 Step 3: confirm `getPropertyFile` field names) has a defined action (grep the controller) and output.

**Type consistency:** `useSettlementDesk` returns `{ picture, refetch, busy, error, call }` — consumed identically in every view and the shell. `picture` keys are defined once in Task 1 Step 3 and referenced by those names throughout. `settlementDeskPath(category, id)` signature is identical in Task 1, Task 7 Steps 1–3. Helper names (`payoutStepFor`, `buildDisbursementPayload`, `buildPaymentPayload`, `deskBadges`, `derivePaymentState`, `derivePayoutState`) match between `settlementMoney.js` (Task 1) and their consumers (Tasks 4, 6).

**Open item carried to execution:** Task 7 Step 2 adds `property_id` to the `salesBulkData` response — a read-only additive field, the sole backend touch, called out so it isn't mistaken for a money-endpoint change.
