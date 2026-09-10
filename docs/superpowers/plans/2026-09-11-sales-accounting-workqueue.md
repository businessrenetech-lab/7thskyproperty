# Sales Accounting Overview + Work Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a portfolio Accounting overview and a role-based Work Queue for residential sales — two read-only aggregate pages that drill into the Settlement Desk.

**Architecture:** Two new read-only `/sales` endpoints reuse the existing `dashboard` scan (branch sale properties → in-flight settlements with lines/payments/disbursements → `calculateSettlement`). Two new React pages consume one endpoint each and link every row into the desk via `settlementDeskPath`. No money mutations, no schema change.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite (`admin-portal`), `ui/kit.jsx`, `services/api`, `react-router-dom`. Verification = `npm run build` + live endpoint curls + browser walkthrough + the unchanged backend harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-accounting-workqueue-design.md`

## Global Constraints

- **Read-only.** Both endpoints only read; no money logic, no schema/migration. Backend `npm test` (27/0) and `npm run test:full` (28/0) must stay green.
- **Reuse the dashboard scan** verbatim in shape: `Property.findAll({ listing_type:'sale', ...branchScope, category? })` → `SaleSettlement.findAll({ ...branchScope, include:[SaleTransaction(required), payments, disbursements, lines] })` → `calculateSettlement(lines, payments, disbursements)`. `settlement.SaleTransaction.property_id` and `.property_deal_id` give the deal/property; map `property_code`/`title` from the properties list.
- **No blockers in the list path** — `to_lock` / `lock` readiness is approximated from calculations (`residual===0 && pending_disbursements===0 && receipts>=purchase_price`); the desk's lock is the authority.
- **Money in minor units** for equality (reuse `toMinor`/`fromMinor` from `utils/money`, already imported in the controller).
- **Role gates mirror the desk:** accounts = `super_admin`/`branch_admin`/`accounts`; admin = `super_admin`/`branch_admin`; prepare = `super_admin`/`branch_admin`/`property_manager`/`sales_executive`.
- **Drill-in:** every row uses `settlementDeskPath('residential', property_id)` (+ `?view=`), the helper from sub-project 1 in `screens/sales/paths.js`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/controllers/sales.controller.js` — **modify**: add `accountingOverview`, `workQueue` handlers + a small shared `scanSettlements(req)` helper (extracted from the dashboard scan) so the two new handlers and the dashboard share one code path.
- `backend/routes/sales.routes.js` — **modify**: two `GET` routes, `roleMiddleware(READ)`.
- `admin-portal/src/screens/sales/AccountingOverview.jsx` — **create**.
- `admin-portal/src/screens/sales/SalesWorkQueue.jsx` — **create**.
- `admin-portal/src/App.jsx` — **modify**: two routes under the residential layout.
- `admin-portal/src/config/consoles.js` — **modify**: two nav entries (`Inbox`, `Landmark` already imported).

---

### Task 1: Backend — `scanSettlements` helper + `GET /sales/accounting-overview`

**Files:** Modify `backend/controllers/sales.controller.js`, `backend/routes/sales.routes.js`.

**Interfaces:**
- Produces: `scanSettlements(req) → { properties, propertyById, settlements }` where `settlements` are hydrated with `SaleTransaction`, `payments`, `disbursements`, `lines`; `GET /api/sales/accounting-overview` → the §3a shape.

- [ ] **Step 1: Add the shared scan helper.** In `sales.controller.js`, above `exports.dashboard`, add a module-scope async function reusing the dashboard's queries:

```js
// Shared branch-wide scan of in-flight sale settlements (also used by the
// dashboard). Returns settlements hydrated with transaction/payments/
// disbursements/lines, plus a property lookup for codes/titles.
async function scanSettlements(req) {
  const category = req.query.category;
  const where = { listing_type: 'sale', ...branchScope(req), ...(category ? { category } : {}) };
  const properties = await Property.findAll({ where, attributes: ['id', 'property_code', 'title', 'category', 'status', 'price'], raw: true });
  const propertyIds = properties.map((p) => p.id);
  const propertyById = new Map(properties.map((p) => [Number(p.id), p]));
  if (!propertyIds.length) return { properties, propertyById, settlements: [] };
  const settlements = await SaleSettlement.findAll({
    where: { ...branchScope(req) },
    include: [
      { model: SaleTransaction, required: true, where: { property_id: { [Op.in]: propertyIds } } },
      { model: SalePayment, as: 'payments' },
      { model: SaleDisbursement, as: 'disbursements' },
      { model: SaleSettlementLine, as: 'lines' },
    ],
  });
  return { properties, propertyById, settlements };
}
```

- [ ] **Step 2: Add the `accountingOverview` handler.** Append to `sales.controller.js`:

```js
const AGENCY_LINE_TYPES = ['commission', 'advertising'];
exports.accountingOverview = asyncHandler(async (req, res) => {
  const { propertyById, settlements } = await scanSettlements(req);
  const headline = { trust_cash_held: 0, buyer_receivable: 0, agency_fees_outstanding: 0, payables_outstanding: 0, completed_sales_value: 0, completed_sales_count: 0 };
  const worklists = { awaiting_receipt: [], payouts_to_pay: [], to_approve: [], to_lock: [] };
  for (const s of settlements) {
    const lines = s.lines || []; const payments = s.payments || []; const disb = s.disbursements || [];
    const calc = calculateSettlement(lines, payments, disb);
    const tx = s.SaleTransaction; const prop = propertyById.get(Number(tx?.property_id)) || {};
    const row = { deal_id: tx?.property_deal_id || null, property_id: tx?.property_id || null, property_code: prop.property_code || null, title: prop.title || null };
    if (s.status === 'locked') { headline.completed_sales_value += calc.purchase_price; headline.completed_sales_count += 1; continue; }
    // in-flight aggregates
    headline.trust_cash_held += calc.funds_held;
    headline.buyer_receivable += Math.max(0, calc.purchase_price - calc.receipts);
    const paidByLine = disb.filter((d) => d.status === 'paid');
    const paidMinor = (pred) => paidByLine.filter(pred).reduce((sum, d) => sum + toMinor(d.amount), 0);
    const lineMinor = (pred) => lines.filter(pred).reduce((sum, l) => sum + toMinor(l.amount), 0);
    headline.agency_fees_outstanding += fromMinor(Math.max(0, lineMinor((l) => AGENCY_LINE_TYPES.includes(l.line_type)) - paidMinor((d) => d.payee_type === 'agency')));
    headline.payables_outstanding += fromMinor(Math.max(0, lineMinor((l) => l.line_type === 'vendor_proceeds' || l.line_type === 'buyer_refund') - paidMinor((d) => d.payee_type !== 'agency')));
    if (calc.receipts < calc.purchase_price) worklists.awaiting_receipt.push({ ...row, expected: calc.purchase_price, received: calc.receipts });
    if (s.status === 'approved' && disb.some((d) => !['paid', 'cancelled'].includes(d.status))) worklists.payouts_to_pay.push({ ...row, amount: fromMinor(disb.filter((d) => !['paid', 'cancelled'].includes(d.status)).reduce((sum, d) => sum + toMinor(d.amount), 0)) });
    if (['submitted', 'reviewed'].includes(s.status)) worklists.to_approve.push({ ...row, status: s.status });
    if (s.status === 'approved' && toMinor(calc.residual) === 0 && !calc.pending_disbursements && calc.receipts >= calc.purchase_price) worklists.to_lock.push(row);
  }
  ['trust_cash_held', 'buyer_receivable', 'completed_sales_value'].forEach((k) => { headline[k] = Math.round(headline[k] * 100) / 100; });
  res.json({ data: { headline, worklists } });
});
```
(Confirm `calculateSettlement`, `toMinor`, `fromMinor`, `Op`, `Property`, `SaleSettlement`, `SaleTransaction`, `SalePayment`, `SaleDisbursement`, `SaleSettlementLine` are already required at the top of the controller — they are, per the dashboard. If `fromMinor` is not imported, add it from `../utils/money`.)

- [ ] **Step 3: Route it.** In `sales.routes.js`, beside `dashboard`:
```js
router.get('/accounting-overview', roleMiddleware(READ), ctrl.accountingOverview);
```

- [ ] **Step 4: Restart + verify.** Restart `:50001`. With an admin token + `X-Branch-Id:1`:
`GET /api/sales/accounting-overview` → 200 `{ data: { headline:{...6 keys}, worklists:{awaiting_receipt,payouts_to_pay,to_approve,to_lock} } }`. Spot-check `trust_cash_held` against `GET /api/sales/dashboard` `metrics.client_funds_held` (should agree). Paste the JSON keys + the two figures into the report.

- [ ] **Step 5: Commit** — `feat(sales): accounting-overview read-model (portfolio finance)`

---

### Task 2: Backend — `GET /sales/work-queue`

**Files:** Modify `backend/controllers/sales.controller.js`, `backend/routes/sales.routes.js`.

**Interfaces:**
- Consumes: `scanSettlements(req)` (Task 1). Produces: `GET /api/sales/work-queue` → `{ data: { items: [ {deal_id, property_id, property_code, title, kind, label, role, amount?} ] } }`, filtered to the caller's role unless `?scope=all` (admin/manager only).

- [ ] **Step 1: Add the `workQueue` handler.** Append to `sales.controller.js`:

```js
const QUEUE_ROLE_MEMBERS = {
  accounts: ['super_admin', 'branch_admin', 'accounts'],
  admin: ['super_admin', 'branch_admin'],
  prepare: ['super_admin', 'branch_admin', 'property_manager', 'sales_executive'],
};
exports.workQueue = asyncHandler(async (req, res) => {
  const { propertyById, settlements } = await scanSettlements(req);
  const role = req.user?.role;
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(role);
  const wantAll = req.query.scope === 'all' && isManager;
  const items = [];
  const push = (queueRole, kind, label, row, extra = {}) => items.push({ ...row, kind, label, role: queueRole, ...extra });
  for (const s of settlements) {
    if (s.status === 'locked') continue;
    const lines = s.lines || []; const payments = s.payments || []; const disb = s.disbursements || [];
    const calc = calculateSettlement(lines, payments, disb);
    const tx = s.SaleTransaction; const prop = propertyById.get(Number(tx?.property_id)) || {};
    const row = { deal_id: tx?.property_deal_id || null, property_id: tx?.property_id || null, property_code: prop.property_code || null, title: prop.title || null };
    const name = prop.title || prop.property_code || `deal ${row.deal_id}`;
    if (['draft', 'returned'].includes(s.status)) push('prepare', lines.length ? 'submit' : 'prepare', `${lines.length ? 'Submit' : 'Prepare'} settlement for ${name}`, row);
    else if (s.status === 'submitted') push('accounts', 'review', `Review settlement for ${name}`, row);
    else if (s.status === 'reviewed') push('admin', 'approve', `Approve settlement for ${name}`, row);
    else if (s.status === 'approved') {
      if (calc.receipts < calc.purchase_price) push('accounts', 'record_receipt', `Record buyer receipt for ${name}`, row, { amount: Math.max(0, calc.purchase_price - calc.receipts) });
      if (payments.some((p) => p.status === 'cleared' && p.reconciliation_status !== 'reconciled')) push('accounts', 'match_bank', `Match a bank payment for ${name}`, row);
      if (disb.some((d) => !['paid', 'cancelled'].includes(d.status))) push('accounts', 'pay_out', `Pay out for ${name}`, row);
      if (toMinor(calc.residual) === 0 && !calc.pending_disbursements && calc.receipts >= calc.purchase_price) push('admin', 'lock', `Lock & complete ${name}`, row);
    }
  }
  // Offers awaiting review (open offers on sale properties) — a prepare-role item.
  const openOffers = await SaleOffer.findAll({ where: { property_id: { [Op.in]: [...propertyById.keys()] }, status: { [Op.in]: ['submitted', 'countered'] }, ...branchScope(req) }, raw: true });
  for (const o of openOffers) { const prop = propertyById.get(Number(o.property_id)) || {}; push('prepare', 'offer_review', `Review an offer on ${prop.title || prop.property_code || o.property_id}`, { deal_id: null, property_id: o.property_id, property_code: prop.property_code || null, title: prop.title || null }); }
  const visible = wantAll ? items : items.filter((it) => (QUEUE_ROLE_MEMBERS[it.role] || []).includes(role));
  res.json({ data: { items: visible } });
});
```
(If `[...propertyById.keys()]` is empty the `Op.in` is harmless — guard with `propertyById.size ? … : []` to skip the offers query.)

- [ ] **Step 2: Route it.** In `sales.routes.js`:
```js
router.get('/work-queue', roleMiddleware(READ), ctrl.workQueue);
```

- [ ] **Step 3: Restart + verify.** `GET /api/sales/work-queue` (admin) → items with `kind`/`role`/`label`; a `record_receipt`/`pay_out` item carries `amount`. `GET /api/sales/work-queue?scope=all` returns ≥ the default set. Confirm an approved settlement with unpaid disbursements yields a `pay_out` item, and a `submitted` one a `review` item. Paste a few items into the report.

- [ ] **Step 4: Commit** — `feat(sales): work-queue read-model (role-derived pending items)`

---

### Task 3: Accounting overview page

**Files:** Create `admin-portal/src/screens/sales/AccountingOverview.jsx`; modify `App.jsx`, `config/consoles.js`.

**Interfaces:** Consumes `GET /sales/accounting-overview`; `settlementDeskPath` from `./paths`.

- [ ] **Step 1: Build the page.**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, RefreshCw, Wallet, HandCoins, Receipt, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, StatCard, Button, Spinner } from '../../ui/kit';
import { settlementDeskPath } from './paths';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function AccountingOverview() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/sales/accounting-overview'); setData(data.data); }
    catch (e) { setError(e.response?.data?.error || 'Could not load accounting overview.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDesk = (propertyId, view) => navigate(`${settlementDeskPath('residential', propertyId)}?view=${view}`);
  const WL = ({ title, rows, view, cols }) => (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3><span className="cell-sub">{rows.length}</span>
      </div>
      {rows.length === 0 ? <div className="card-pad cell-sub">Nothing here.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl"><thead><tr><th>Property</th>{cols.map((c) => <th key={c.k} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.h}</th>)}<th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={`${r.deal_id}-${r.property_id}`}>
                <td>{r.property_code || r.title || r.property_id}</td>
                {cols.map((c) => <td key={c.k} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.money ? money(r[c.k]) : r[c.k]}</td>)}
                <td style={{ textAlign: 'right' }}><Button size="sm" variant="ghost" onClick={() => openDesk(r.property_id, view)}>Open desk</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="card-pad"><Spinner /></div>;
  if (error) return <div className="pm-card card-pad">{error} <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>;
  const h = data.headline; const w = data.worklists;
  return (
    <>
      <PageHead title="Accounting" desc="Portfolio finance across every sale — drill into a deal's Settlement Desk to act." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="grid-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon={Wallet} tone="green" label="Trust cash held" value={money(h.trust_cash_held)} />
        <StatCard icon={Receipt} tone="sky" label="Buyer receivable" value={money(h.buyer_receivable)} />
        <StatCard icon={HandCoins} tone="amber" label="Agency fees outstanding" value={money(h.agency_fees_outstanding)} />
        <StatCard icon={HandCoins} tone="amber" label="Payables outstanding" value={money(h.payables_outstanding)} />
        <StatCard icon={CheckCircle2} tone="green" label={`Completed sales (${h.completed_sales_count})`} value={money(h.completed_sales_value)} />
      </div>
      <WL title="Awaiting receipt" rows={w.awaiting_receipt} view="record" cols={[{ k: 'expected', h: 'Expected', money: true, right: true }, { k: 'received', h: 'Received', money: true, right: true }]} />
      <WL title="Payouts to pay" rows={w.payouts_to_pay} view="record" cols={[{ k: 'amount', h: 'Amount', money: true, right: true }]} />
      <WL title="To approve" rows={w.to_approve} view="review" cols={[{ k: 'status', h: 'Status' }]} />
      <WL title="To lock" rows={w.to_lock} view="complete" cols={[]} />
    </>
  );
}
```

- [ ] **Step 2: Route + nav.** In `App.jsx` add `import AccountingOverview from './screens/sales/AccountingOverview';` and, under the residential console layout beside the other `/residential/*` routes: `<Route path="/residential/accounting" element={<AccountingOverview />} />`. In `config/consoles.js` `RESIDENTIAL_NAV` → the `money` group `items`, add `{ to: '/residential/accounting', label: 'Accounting', icon: Landmark }` (before Settlements (Bulk)).

- [ ] **Step 3: Verify.** `cd admin-portal && npm run build` → `✓ built`. Browser: `/residential/accounting` shows five stat cards + four worklist cards; an "Open desk" row navigates to the right desk view; empty cards say "Nothing here"; Refresh works. Paste the build tail.

- [ ] **Step 4: Commit** — `feat(sales): Accounting overview page + nav`

---

### Task 4: Work Queue page

**Files:** Create `admin-portal/src/screens/sales/SalesWorkQueue.jsx`; modify `App.jsx`, `config/consoles.js`.

**Interfaces:** Consumes `GET /sales/work-queue` (+ `?scope=all`); `settlementDeskPath`; `useAuth` for the manager check.

- [ ] **Step 1: Build the page.**

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PageHead, Button, Spinner, Badge } from '../../ui/kit';
import { settlementDeskPath } from './paths';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
// kind -> [group label, desk view]. offer_review routes to the property file offers section.
const KIND = {
  prepare: ['Prepare', 'prepare'], submit: ['Submit for review', 'review'], review: ['Review', 'review'],
  approve: ['Approve', 'review'], record_receipt: ['Record receipt', 'record'], match_bank: ['Match bank', 'match'],
  pay_out: ['Pay out', 'record'], lock: ['Lock & complete', 'complete'], offer_review: ['Offer review', null],
};
const ORDER = ['prepare', 'submit', 'review', 'approve', 'record_receipt', 'match_bank', 'pay_out', 'lock', 'offer_review'];

export default function SalesWorkQueue() {
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [scope, setScope] = useState('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get(`/sales/work-queue${scope === 'all' ? '?scope=all' : ''}`); setItems(data.data.items || []); }
    catch (e) { setError(e.response?.data?.error || 'Could not load your work queue.'); }
    finally { setLoading(false); }
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  const go = (it) => {
    if (it.kind === 'offer_review') return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=offers`);
    const view = KIND[it.kind]?.[1] || 'prepare';
    navigate(`${settlementDeskPath('residential', it.property_id)}?view=${view}`);
  };

  if (loading) return <div className="card-pad"><Spinner /></div>;
  if (error) return <div className="pm-card card-pad">{error} <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>;
  const groups = ORDER.map((k) => [k, items.filter((it) => it.kind === k)]).filter(([, rows]) => rows.length);

  return (
    <>
      <PageHead title="My Work Queue" desc="Everything waiting on you across the sales pipeline." actions={<>
        {isManager && <Button variant="ghost" size="sm" onClick={() => setScope(scope === 'all' ? 'mine' : 'all')}>{scope === 'all' ? 'Show my work' : 'Show all'}</Button>}
        <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
      </>} />
      {groups.length === 0 ? <div className="pm-card card-pad">You're all caught up. 🎉</div> : groups.map(([k, rows]) => (
        <div className="card" key={k} style={{ marginTop: 12 }}>
          <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{KIND[k][0]}</h3><Badge tone="amber">{rows.length}</Badge>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl"><tbody>
              {rows.map((it, i) => (
                <tr key={i}>
                  <td>{it.label}</td>
                  <td style={{ textAlign: 'right' }}>{it.amount != null ? money(it.amount) : ''}</td>
                  <td style={{ textAlign: 'right' }}><Button size="sm" onClick={() => go(it)}>Go</Button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 2: Route + nav.** In `App.jsx` add `import SalesWorkQueue from './screens/sales/SalesWorkQueue';` and `<Route path="/residential/work-queue" element={<SalesWorkQueue />} />` under the residential layout. In `config/consoles.js` `RESIDENTIAL_NAV` → the `home` group `items`, add `{ to: '/residential/work-queue', label: 'My Work Queue', icon: Inbox }` after Sell Dashboard.

- [ ] **Step 3: Verify.** `npm run build` → `✓ built`. Browser: `/residential/work-queue` groups items by kind with count badges; a **Go** navigates to the right desk view (and `offer_review` to the property file offers section); the manager scope toggle switches My work / All; the caught-up empty state shows when there are no items. Paste the build tail.

- [ ] **Step 4: Commit** — `feat(sales): Work Queue page + nav`

---

### Task 5: End-to-end verification + harness regression

**Files:** none (verification only).

- [ ] **Step 1: Backend harnesses unchanged.** `cd backend && npm test` → `27 PASS / 0 FAIL`; `npm run test:full` → `28 PASS / 0 FAIL`. (These endpoints are read-only; this confirms nothing regressed.)

- [ ] **Step 2: Reconciliation check.** With an admin token, confirm `accounting-overview.headline.trust_cash_held` equals `dashboard.metrics.client_funds_held`, and that a deal known to be `approved` with an unpaid payout appears in both `accounting-overview.worklists.payouts_to_pay` and `work-queue` (`kind:'pay_out'`). Record the matched figures.

- [ ] **Step 3: Role-filter check.** Confirm `work-queue` as admin includes `approve`/`lock` items; `?scope=all` returns a superset; (if an accounts-only test user is available) that user sees `review`/`record_receipt`/`pay_out` but not `approve`/`lock`.

- [ ] **Step 4: Build + browser final pass.** `admin-portal` build clean; both pages load, drill into the desk, and render empty/error states honestly at desktop and ~400px width.

- [ ] **Step 5: Commit** (docs/log) — `test(sales): verify accounting-overview + work-queue reconcile with dashboard/desk`

---

## Self-Review

**Spec coverage:** §3a accounting-overview → Task 1; §3b work-queue → Task 2; §4 overview page → Task 3; §5 work queue page → Task 4; §6 nav → Tasks 3–4 Step 2; §7 testing → Task 5 (+ each task's verify). No blockers in the list path (approximated readiness) — honored in Tasks 1–2. Read-only / no schema — honored throughout.

**Placeholder scan:** the handlers and both pages are given as real code; verification steps are concrete curls/clicks with expected shapes. No "TBD"/"handle errors"/"similar to Task N". The one confirm-before-finishing note (Task 1 Step 2: `fromMinor` import) has a defined check + fix.

**Type consistency:** `scanSettlements(req)` returns `{ properties, propertyById, settlements }`, consumed identically in Tasks 1 & 2. Worklist/item rows use `{deal_id, property_id, property_code, title}` everywhere; `settlementDeskPath('residential', property_id)` + `?view=` is the drill-in in both pages; `kind` values in the backend map exactly to the frontend `KIND`/`ORDER` tables (prepare/submit/review/approve/record_receipt/match_bank/pay_out/lock/offer_review). Endpoint paths `/sales/accounting-overview` and `/sales/work-queue` match between controller, routes, and pages.

**Open item carried to execution:** `offer_review` drills to the property file offers section (`?section=offers`), which is state-selected today — acceptable; when the property-file URL-restructure sub-project lands, that link upgrades to a real route.
