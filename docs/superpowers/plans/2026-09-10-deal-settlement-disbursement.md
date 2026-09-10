# Deal Settlement & Disbursement Workspace — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give residential sales deals a guided settlement & disbursement workspace — expected-vs-actual money on one screen, four distinct statuses, prepare→review→approve→record→reconcile, duplicate-payment protection, an append-only audit trail, and a bulk settlement run — all through the existing money engine.

**Architecture:** Extend the existing `PropertyDeal` with four status fields + settlement figures; add two small tables (`deal_disbursements` mirroring `owner_disbursements`, and append-only `deal_events`). Money IN reuses the existing invoice/payment engine (`POST /api/invoices/:id/payments`); money OUT is recorded as `deal_disbursements` rows with an approval gate and a duplicate-payment hash. New endpoints hang off `/api/deals`. A React workspace (embedded on the deal detail) and a bulk-run screen drive it. No parallel money path; no trust-account handling (Bangladesh).

**Tech Stack:** Node/Express, Sequelize (MySQL/MariaDB), sequelize-cli migrations, React (Vite) admin-portal on the `ui/kit` + `.pm-scope`/`residential` design system. **This repo has no unit-test framework** — verification is by Node API-harness scripts (`backend/scripts/*.js`, run with `node`), `curl`, and `npm run build`. Each task's "test" is a harness assertion that fails before implementation and passes after.

**Spec:** `docs/superpowers/specs/2026-09-10-property-sales-saas-improvement-plan.md` (Phase 1 / §6 "Make the money simple").

## Global Constraints

- **Regime:** Bangladesh, brokerage-service model (fee + commission). **No statutory trust account**; disbursement records payees/amounts/approvals/audit — do not build trust-ledger reconciliation.
- **Money correctness:** money IN posts only through the existing `POST /api/invoices/:id/payments` (never a parallel writer). Money OUT is an append-only `deal_disbursements` row; the deal's money must always reconcile to those records.
- **Auth:** deal routes already use `roleMiddleware(['super_admin','branch_admin','property_manager','sales_executive'])`. **Approval** actions additionally require `super_admin` or `branch_admin`.
- **Codes:** use `generateCode(model, field, prefix, pad=6)` — disbursement prefix `SSPC-DD-`.
- **Migrations:** next number is **0103** (latest existing is 0102). Run with `npx sequelize-cli db:migrate`. Additive only; log swallowed `addColumn` errors (lesson from 0100/0102).
- **New backend routes MUST be reachable** — `/api/deals` is already mounted in BOTH `server.js:209` and `routes/manifest.js:100`; new sub-routes are added to `routes/deal.routes.js` only.
- **Backend restart:** kill the listener on `:50001` and restart `node server.js` after backend changes before running a harness.
- **Frontend:** reuse `ui/kit` (`PageHead, Button, Field, Input, Select, Spinner, Badge`) + `useToast`; `admin-portal` must `npm run build` clean after each frontend task.
- **Money helpers (verbatim, already exist):**
  - `const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');`
  - `const { generateCode } = require('../utils/codeGenerator');`
  - Record a payment: `POST /api/invoices/:id/payments` body `{ amount, method, reference, paid_at?, notes? }`.

---

## File Structure

- `backend/migrations/0103-deal-settlement.js` — **create**: deal status/settlement columns + `deal_disbursements` + `deal_events`.
- `backend/models/PropertyDeal.js` — **modify**: add the new fields.
- `backend/models/DealDisbursement.js` — **create**: money-out record.
- `backend/models/DealEvent.js` — **create**: append-only audit.
- `backend/services/dealSettlement.service.js` — **create**: compute expected/actual/statuses/next-action; the single source of the money picture.
- `backend/controllers/dealSettlement.controller.js` — **create**: workspace read + prepare/receive/approve/disburse/settle + bulk run.
- `backend/routes/deal.routes.js` — **modify**: mount the new endpoints (before `/:id` where needed).
- `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx` — **create**: the guided workspace (embedded on deal detail).
- `admin-portal/src/screens/SalesBulkSettlement.jsx` — **create**: the bulk settlement run.
- `admin-portal/src/App.jsx`, `admin-portal/src/config/consoles.js` — **modify**: route + residential-nav entry.
- `backend/scripts/e2eDealSettlement.js` — **create**: the end-to-end verification harness.

---

### Task 1: Schema — deal statuses, disbursements, audit events

**Files:**
- Create: `backend/migrations/0103-deal-settlement.js`
- Modify: `backend/models/PropertyDeal.js`
- Create: `backend/models/DealDisbursement.js`, `backend/models/DealEvent.js`

**Interfaces:**
- Produces: `property_deals` gains `contract_status`, `settlement_status`, `payment_status`, `disbursement_status`, `expected_fee`, `expected_commission`, `deductions_total`, `settlement_approved_by`, `settlement_approved_at`. New models `DealDisbursement` (fields per code below) and `DealEvent`.

- [ ] **Step 1: Write the migration**

```js
// backend/migrations/0103-deal-settlement.js
'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = {
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };
    const dealCols = {
      contract_status: { type: S.ENUM('none', 'drafted', 'sent', 'signed'), allowNull: false, defaultValue: 'none' },
      settlement_status: { type: S.ENUM('not_started', 'in_progress', 'settled'), allowNull: false, defaultValue: 'not_started' },
      payment_status: { type: S.ENUM('unpaid', 'partial', 'received'), allowNull: false, defaultValue: 'unpaid' },
      disbursement_status: { type: S.ENUM('none', 'pending', 'partial', 'disbursed'), allowNull: false, defaultValue: 'none' },
      expected_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      expected_commission: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deductions_total: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      settlement_approved_by: S.INTEGER,
      settlement_approved_at: S.DATE,
    };
    const d = await q.describeTable('property_deals').catch(() => null);
    if (d) for (const [c, def] of Object.entries(dealCols)) {
      if (!d[c]) await q.addColumn('property_deals', c, def).catch((e) => console.warn(`[0103] property_deals.${c}:`, e.message));
    }
    if (!(await q.describeTable('deal_disbursements').catch(() => null))) {
      await q.createTable('deal_disbursements', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        disbursement_code: { type: S.STRING(40), allowNull: false },
        deal_id: { type: S.INTEGER, allowNull: false },
        payee_type: { type: S.ENUM('agent', 'vendor', 'client_refund', 'expense', 'other'), allowNull: false, defaultValue: 'other' },
        payee_contact_id: S.INTEGER, payee_name: S.STRING(160),
        description: S.STRING(255), amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        method: { type: S.STRING(40), defaultValue: 'bank_transfer' }, reference: S.STRING(120),
        status: { type: S.ENUM('draft', 'approved', 'paid', 'void'), allowNull: false, defaultValue: 'draft' },
        source_hash: S.STRING(80), approved_by: S.INTEGER, approved_at: S.DATE, paid_at: S.DATE,
        created_by: S.INTEGER, ...ts,
      });
      await q.addIndex('deal_disbursements', ['deal_id'], { name: 'deal_disb_deal' }).catch(() => {});
      await q.addIndex('deal_disbursements', ['source_hash'], { name: 'deal_disb_hash' }).catch(() => {});
    }
    if (!(await q.describeTable('deal_events').catch(() => null))) {
      await q.createTable('deal_events', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        deal_id: { type: S.INTEGER, allowNull: false },
        event_type: { type: S.STRING(60), allowNull: false },
        detail: S.TEXT, amount: S.DECIMAL(15, 2),
        actor_user_id: S.INTEGER, occurred_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('deal_events', ['deal_id'], { name: 'deal_events_deal' }).catch(() => {});
    }
  },
  down: async (q) => {
    await q.dropTable('deal_events').catch(() => {});
    await q.dropTable('deal_disbursements').catch(() => {});
    for (const c of ['contract_status', 'settlement_status', 'payment_status', 'disbursement_status', 'expected_fee', 'expected_commission', 'deductions_total', 'settlement_approved_by', 'settlement_approved_at']) {
      await q.removeColumn('property_deals', c).catch(() => {});
    }
  },
};
```

- [ ] **Step 2: Run the migration**

Run: `cd backend && npx sequelize-cli db:migrate`
Expected: `0103-deal-settlement: migrated`. Then verify columns:
`node -e 'const d=require("./config/db.config");(async()=>{const [c]=await d.query("SHOW COLUMNS FROM property_deals");console.log(["contract_status","settlement_status","payment_status","disbursement_status"].every(x=>c.some(y=>y.Field===x)));process.exit(0);})()'`
Expected: prints `true`; `deal_disbursements` and `deal_events` tables exist.

- [ ] **Step 3: Add the new fields to `PropertyDeal.js`**

Insert after `notes: DataTypes.TEXT,` (before `created_by`):

```js
  contract_status: { type: DataTypes.ENUM('none', 'drafted', 'sent', 'signed'), defaultValue: 'none' },
  settlement_status: { type: DataTypes.ENUM('not_started', 'in_progress', 'settled'), defaultValue: 'not_started' },
  payment_status: { type: DataTypes.ENUM('unpaid', 'partial', 'received'), defaultValue: 'unpaid' },
  disbursement_status: { type: DataTypes.ENUM('none', 'pending', 'partial', 'disbursed'), defaultValue: 'none' },
  expected_fee: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  expected_commission: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  deductions_total: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  settlement_approved_by: DataTypes.INTEGER,
  settlement_approved_at: DataTypes.DATE,
```

- [ ] **Step 4: Create the two models**

```js
// backend/models/DealDisbursement.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const DealDisbursement = sequelize.define('DealDisbursement', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  disbursement_code: { type: DataTypes.STRING(40), unique: true },
  deal_id: { type: DataTypes.INTEGER, allowNull: false },
  payee_type: { type: DataTypes.ENUM('agent', 'vendor', 'client_refund', 'expense', 'other'), defaultValue: 'other' },
  payee_contact_id: DataTypes.INTEGER, payee_name: DataTypes.STRING(160),
  description: DataTypes.STRING(255), amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  method: { type: DataTypes.STRING(40), defaultValue: 'bank_transfer' }, reference: DataTypes.STRING(120),
  status: { type: DataTypes.ENUM('draft', 'approved', 'paid', 'void'), defaultValue: 'draft' },
  source_hash: DataTypes.STRING(80), approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE, paid_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
}, { tableName: 'deal_disbursements', underscored: true });
module.exports = DealDisbursement;
```

```js
// backend/models/DealEvent.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const DealEvent = sequelize.define('DealEvent', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  deal_id: { type: DataTypes.INTEGER, allowNull: false },
  event_type: { type: DataTypes.STRING(60), allowNull: false },
  detail: DataTypes.TEXT, amount: DataTypes.DECIMAL(15, 2),
  actor_user_id: DataTypes.INTEGER,
  occurred_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'deal_events', underscored: true, updatedAt: false });
module.exports = DealEvent;
```

- [ ] **Step 5: Verify models load**

Run: `cd backend && node -e "require('./models/PropertyDeal');require('./models/DealDisbursement');require('./models/DealEvent');console.log('models OK')"`
Expected: `models OK`.

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/0103-deal-settlement.js backend/models/PropertyDeal.js backend/models/DealDisbursement.js backend/models/DealEvent.js
git commit -m "feat(deals): settlement status fields, deal_disbursements + deal_events (migration 0103)"
```

---

### Task 2: Settlement service — the single money picture

**Files:**
- Create: `backend/services/dealSettlement.service.js`

**Interfaces:**
- Consumes: `PropertyDeal`, `DealDisbursement`, `PropertyInvoice`, `Payment` models; `branchScope`.
- Produces: `computeDealMoney(deal)` → `{ expected:{fee,commission,total}, received, disbursed, deductions, remaining, statuses:{contract,settlement,payment,disbursement}, next_action }`. `logEvent(deal_id, branch_id, type, {detail, amount, actor})`. `recomputeStatuses(deal)` (persists payment_status/disbursement_status from live figures).

- [ ] **Step 1: Write a throwaway probe to learn the invoice link shape**

Run: `cd backend && node -e 'const d=require("./config/db.config");(async()=>{const [c]=await d.query("SHOW COLUMNS FROM invoices");console.log(c.map(x=>x.Field).filter(f=>/deal|contact|amount_paid|balance|kind|service_for/.test(f)).join(", "));process.exit(0);})()'`
Expected: shows there is no `deal_id` on `invoices`. **Decision locked by this probe:** money-in for a deal is linked by a `reference` convention `DEAL:<deal_code>` on the payment + an invoice tagged `service_for='deal'`; the service sums payments whose invoice is tagged to the deal. (If a `deal_id` column *does* appear, prefer it and note the deviation.)

- [ ] **Step 2: Write the service**

```js
// backend/services/dealSettlement.service.js
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const PropertyDeal = require('../models/PropertyDeal');
const DealDisbursement = require('../models/DealDisbursement');
const DealEvent = require('../models/DealEvent');
const num = (v) => Number(v || 0);

// Money received for a deal = completed payments on invoices tagged to it.
// Invoices carry no deal_id, so we tag them notes/title with the deal_code and
// match payments by reference `DEAL:<deal_code>` OR invoice title `Deal <code>`.
async function receivedFor(deal) {
  const [[r]] = await sequelize.query(
    `SELECT COALESCE(SUM(p.amount),0) AS total
       FROM payments p
      WHERE p.status = 'completed' AND p.branch_id = :b
        AND (p.reference LIKE :ref OR p.notes LIKE :ref)`,
    { replacements: { b: deal.branch_id, ref: `%DEAL:${deal.deal_code}%` } },
  );
  return num(r.total);
}

async function disbursedFor(dealId) {
  const rows = await DealDisbursement.findAll({ where: { deal_id: dealId, status: 'paid' }, attributes: ['amount'], raw: true });
  return rows.reduce((s, x) => s + num(x.amount), 0);
}

async function computeDealMoney(deal) {
  const expected = {
    fee: num(deal.expected_fee),
    commission: num(deal.expected_commission || deal.commission_amount),
  };
  expected.total = expected.fee + expected.commission;
  const received = await receivedFor(deal);
  const disbursed = await disbursedFor(deal.id);
  const deductions = num(deal.deductions_total);
  const remaining = expected.total - received;
  const net_held = received - disbursed; // money in hand not yet paid out
  const statuses = {
    contract: deal.contract_status,
    settlement: deal.settlement_status,
    payment: received <= 0 ? 'unpaid' : received + 0.001 >= expected.total ? 'received' : 'partial',
    disbursement: deal.disbursement_status,
  };
  let next_action = null;
  if (statuses.contract !== 'signed') next_action = { key: 'contract', label: 'Sign the service agreement' };
  else if (deal.settlement_status === 'not_started') next_action = { key: 'prepare', label: 'Prepare settlement (set expected amounts)' };
  else if (statuses.payment !== 'received') next_action = { key: 'receive', label: `Receive ${(remaining).toLocaleString()} outstanding` };
  else if (!deal.settlement_approved_at) next_action = { key: 'approve', label: 'Approve settlement' };
  else if (net_held > 0.001) next_action = { key: 'disburse', label: `Disburse ${net_held.toLocaleString()} held` };
  else if (deal.settlement_status !== 'settled') next_action = { key: 'settle', label: 'Mark settled' };
  return { expected, received, disbursed, deductions, remaining, net_held, statuses, next_action };
}

async function recomputeStatuses(deal) {
  const m = await computeDealMoney(deal);
  const disbursement_status = m.disbursed <= 0 ? (deal.disbursement_status === 'pending' ? 'pending' : 'none')
    : m.net_held > 0.001 ? 'partial' : 'disbursed';
  await deal.update({ payment_status: m.statuses.payment, disbursement_status });
  return m;
}

async function logEvent(deal_id, branch_id, event_type, { detail = null, amount = null, actor = null } = {}) {
  return DealEvent.create({ deal_id, branch_id, event_type, detail: typeof detail === 'string' ? detail : JSON.stringify(detail), amount, actor_user_id: actor });
}

module.exports = { computeDealMoney, recomputeStatuses, logEvent, receivedFor, disbursedFor };
```

- [ ] **Step 3: Verify it loads + computes on a real deal**

Run: `cd backend && node -e 'const s=require("./services/dealSettlement.service");const D=require("./models/PropertyDeal");(async()=>{const d=await D.findOne({order:[["id","DESC"]]});if(!d){console.log("no deal");process.exit(0);}console.log(JSON.stringify(await s.computeDealMoney(d)));process.exit(0);})()'`
Expected: prints a JSON money picture with `expected`, `received`, `statuses`, `next_action` (no throw).

- [ ] **Step 4: Commit**

```bash
git add backend/services/dealSettlement.service.js
git commit -m "feat(deals): dealSettlement service — expected/received/disbursed + statuses + next action"
```

---

### Task 3: Workspace read + prepare + approve endpoints

**Files:**
- Create: `backend/controllers/dealSettlement.controller.js`
- Modify: `backend/routes/deal.routes.js`

**Interfaces:**
- Consumes: `dealSettlement.service`.
- Produces: `GET /api/deals/:id/settlement`, `POST /api/deals/:id/settlement/prepare`, `POST /api/deals/:id/settlement/approve`.

- [ ] **Step 1: Write the controller (read + prepare + approve)**

```js
// backend/controllers/dealSettlement.controller.js
const PropertyDeal = require('../models/PropertyDeal');
const DealDisbursement = require('../models/DealDisbursement');
const DealEvent = require('../models/DealEvent');
const svc = require('../services/dealSettlement.service');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const { generateCode } = require('../utils/codeGenerator');

const isApprover = (req) => ['super_admin', 'branch_admin'].includes(req.user?.role);
const findDeal = (req) => PropertyDeal.findOne({ where: { id: req.params.id, ...branchScope(req) } });

exports.getSettlement = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const money = await svc.computeDealMoney(deal);
  const disbursements = await DealDisbursement.findAll({ where: { deal_id: deal.id }, order: [['created_at', 'DESC']], raw: true });
  const events = await DealEvent.findAll({ where: { deal_id: deal.id }, order: [['occurred_at', 'DESC']], limit: 50, raw: true });
  res.json({ data: { deal, money, disbursements, events } });
});

exports.prepare = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  await deal.update({
    ...pick(req.body, ['expected_fee', 'expected_commission', 'deductions_total']),
    settlement_status: 'in_progress',
  });
  await svc.logEvent(deal.id, deal.branch_id, 'settlement_prepared', { detail: pick(req.body, ['expected_fee', 'expected_commission', 'deductions_total']), actor: req.user?.id });
  res.json({ data: deal });
});

exports.approve = asyncHandler(async (req, res) => {
  if (!isApprover(req)) return res.status(403).json({ error: 'Only a branch admin or super admin can approve a settlement.' });
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const money = await svc.computeDealMoney(deal);
  if (money.statuses.payment !== 'received') return res.status(400).json({ error: 'Cannot approve — expected money not fully received yet.' });
  await deal.update({ settlement_approved_by: req.user?.id || null, settlement_approved_at: new Date() });
  await svc.logEvent(deal.id, deal.branch_id, 'settlement_approved', { actor: req.user?.id });
  res.json({ data: deal });
});
```

- [ ] **Step 2: Wire the routes**

In `backend/routes/deal.routes.js`, add these **before** `router.get('/:id', ctrl.getOne);` is not required (these are `/:id/...` sub-paths, unambiguous), so add after the existing `router.put('/:id', ...)` line:

```js
const settle = require('../controllers/dealSettlement.controller');
router.get('/:id/settlement', settle.getSettlement);
router.post('/:id/settlement/prepare', settle.prepare);
router.post('/:id/settlement/approve', settle.approve);
```

- [ ] **Step 3: Restart backend + verify**

Run (kill+restart): stop the `:50001` listener, `cd backend && node server.js &`, wait for up. Then:
`TOKEN=$(curl -s :50001/api/auth/login -X POST -H 'Content-Type: application/json' -d '{"email":"admin@seventhskyproperty.com","password":"Admin#2026"}' | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).token))')`
`curl -s ":50001/api/deals/1/settlement" -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1"`
Expected: 200 JSON with `data.money.statuses` and `data.disbursements: []` (or 404 if deal 1 absent — then use an existing deal id from `GET /api/deals`).

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/dealSettlement.controller.js backend/routes/deal.routes.js
git commit -m "feat(deals): settlement workspace read + prepare + approve endpoints"
```

---

### Task 4: Receive money (reuse the invoice/payment engine)

**Files:**
- Modify: `backend/controllers/dealSettlement.controller.js`, `backend/routes/deal.routes.js`

**Interfaces:**
- Produces: `POST /api/deals/:id/settlement/receive` body `{ amount, kind:'fee'|'commission', method?, reference?, invoice_id? }`. Records a payment through the existing engine, tags it `DEAL:<deal_code>`, recomputes payment_status, logs an event.

- [ ] **Step 1: Add the handler**

```js
// append to dealSettlement.controller.js
const num = (v) => Number(v || 0);
exports.receive = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const amount = num(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });

  // Reuse the existing money engine. Create (or reuse) a client invoice for this
  // deal, then record the payment via the app's own endpoint so folio/receipt
  // behaviour is identical to every other payment — no parallel money path.
  const PropertyInvoice = require('../models/PropertyInvoice');
  const { generateCode: gc } = require('../utils/codeGenerator');
  let invoiceId = req.body.invoice_id;
  if (!invoiceId) {
    const inv = await PropertyInvoice.create({
      branch_id: deal.branch_id, invoice_code: await gc(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      invoice_kind: 'client', contact_id: deal.seller_contact_id || null, property_id: deal.property_id,
      billed_to_type: 'client', service_for: 'deal', title: `Deal ${deal.deal_code} — ${req.body.kind || 'fee'}`,
      subtotal: amount, total: amount, balance: amount, amount_paid: 0, status: 'sent',
      issue_date: new Date(), created_by: req.user?.id || null,
    });
    invoiceId = inv.id;
  }
  const base = `http://127.0.0.1:${process.env.PORT || 50001}`;
  const r = await fetch(`${base}/api/invoices/${invoiceId}/payments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: req.headers.authorization, 'X-Branch-Id': req.headers['x-branch-id'] || String(resolveBranchId(req) || '') },
    body: JSON.stringify({ amount, method: req.body.method || 'bank', reference: `DEAL:${deal.deal_code} ${req.body.reference || ''}`.trim(), notes: `Deal ${deal.deal_code} ${req.body.kind || 'fee'}` }),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); return res.status(502).json({ error: e.error || 'Payment failed.' }); }
  await svc.recomputeStatuses(deal);
  await svc.logEvent(deal.id, deal.branch_id, 'money_received', { amount, detail: { kind: req.body.kind || 'fee', invoice_id: invoiceId }, actor: req.user?.id });
  const money = await svc.computeDealMoney(deal);
  res.status(201).json({ data: { money }, message: `Recorded ${amount.toLocaleString()} received.` });
});
```

- [ ] **Step 2: Route**

Add to `deal.routes.js`: `router.post('/:id/settlement/receive', settle.receive);`

- [ ] **Step 3: Restart + verify money-in moves payment_status**

Restart backend. With `$TOKEN` and an existing deal id `<D>`:
`curl -s ":50001/api/deals/<D>/settlement/prepare" -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' -d '{"expected_commission":10000}'`
`curl -s ":50001/api/deals/<D>/settlement/receive" -X POST -H "Authorization: Bearer $TOKEN" -H "X-Branch-Id: 1" -H 'Content-Type: application/json' -d '{"amount":10000,"kind":"commission","method":"bank"}'`
Expected: second call 201; re-`GET /settlement` shows `money.received` = 10000 and `statuses.payment` = `received`.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/dealSettlement.controller.js backend/routes/deal.routes.js
git commit -m "feat(deals): receive money via the existing invoice/payment engine"
```

---

### Task 5: Disbursements — create, duplicate-guard, approve-gated pay, settle

**Files:**
- Modify: `backend/controllers/dealSettlement.controller.js`, `backend/routes/deal.routes.js`

**Interfaces:**
- Produces: `POST /api/deals/:id/disbursements` (create draft; duplicate-guard by `source_hash`), `POST /api/deals/:id/disbursements/:did/pay` (approval-gated), `POST /api/deals/:id/settle` (reconcile → settled).

- [ ] **Step 1: Add the handlers**

```js
// append to dealSettlement.controller.js
const crypto = require('crypto');
const hashOf = (deal, b) => crypto.createHash('sha1').update(`${deal.id}|${b.payee_type}|${b.payee_contact_id || b.payee_name || ''}|${num(b.amount)}|${b.reference || ''}`).digest('hex').slice(0, 40);

exports.createDisbursement = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const b = req.body || {};
  if (num(b.amount) <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });
  const source_hash = hashOf(deal, b);
  const dup = await DealDisbursement.findOne({ where: { deal_id: deal.id, source_hash, status: ['draft', 'approved', 'paid'] } });
  if (dup) return res.status(409).json({ error: `Duplicate disbursement — ${dup.disbursement_code} already exists for the same payee/amount/reference.` });
  const row = await DealDisbursement.create({
    branch_id: deal.branch_id, disbursement_code: await generateCode(DealDisbursement, 'disbursement_code', 'SSPC-DD-'),
    deal_id: deal.id, ...pick(b, ['payee_type', 'payee_contact_id', 'payee_name', 'description', 'amount', 'method', 'reference']),
    status: 'draft', source_hash, created_by: req.user?.id || null,
  });
  if (deal.disbursement_status === 'none') await deal.update({ disbursement_status: 'pending' });
  await svc.logEvent(deal.id, deal.branch_id, 'disbursement_created', { amount: num(b.amount), detail: { code: row.disbursement_code, payee: b.payee_name || b.payee_type }, actor: req.user?.id });
  res.status(201).json({ data: row });
});

exports.payDisbursement = asyncHandler(async (req, res) => {
  if (!isApprover(req)) return res.status(403).json({ error: 'Only a branch admin or super admin can pay a disbursement.' });
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  if (!deal.settlement_approved_at) return res.status(400).json({ error: 'Settlement must be approved before any disbursement is paid.' });
  const row = await DealDisbursement.findOne({ where: { id: req.params.did, deal_id: deal.id } });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });
  if (row.status === 'paid') return res.status(409).json({ error: 'Already paid.' });
  const money = await svc.computeDealMoney(deal);
  if (num(row.amount) > money.net_held + 0.001) return res.status(400).json({ error: `Amount exceeds money held for this deal (${money.net_held.toLocaleString()}).` });
  await row.update({ status: 'paid', approved_by: req.user?.id || null, approved_at: new Date(), paid_at: new Date() });
  await svc.recomputeStatuses(deal);
  await svc.logEvent(deal.id, deal.branch_id, 'disbursement_paid', { amount: num(row.amount), detail: { code: row.disbursement_code }, actor: req.user?.id });
  res.json({ data: row });
});

exports.settle = asyncHandler(async (req, res) => {
  const deal = await findDeal(req);
  if (!deal) return res.status(404).json({ error: 'Deal not found.' });
  const money = await svc.computeDealMoney(deal);
  if (money.statuses.payment !== 'received') return res.status(400).json({ error: 'Cannot settle — money not fully received.' });
  await deal.update({ settlement_status: 'settled', settlement_date: deal.settlement_date || new Date() });
  await svc.logEvent(deal.id, deal.branch_id, 'settled', { actor: req.user?.id });
  res.json({ data: deal });
});
```

- [ ] **Step 2: Routes**

Add to `deal.routes.js`:
```js
router.post('/:id/disbursements', settle.createDisbursement);
router.post('/:id/disbursements/:did/pay', settle.payDisbursement);
router.post('/:id/settle', settle.settle);
```

- [ ] **Step 3: Restart + verify guard + gate**

Restart. On the deal from Task 4 (payment received): approve it (`/settlement/approve`), create a disbursement `{payee_type:'agent',payee_name:'Agent A',amount:2000,reference:'X'}` → 201; repeat the identical create → **409 duplicate**; pay it → 200 and `GET /settlement` shows `disbursed`=2000, `net_held`=8000; pay before-approve on a fresh deal → **400**.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/dealSettlement.controller.js backend/routes/deal.routes.js
git commit -m "feat(deals): disbursements with duplicate guard + approval-gated pay + settle"
```

---

### Task 6: Sales bulk settlement run

**Files:**
- Modify: `backend/controllers/dealSettlement.controller.js`, `backend/routes/deal.routes.js`

**Interfaces:**
- Produces: `GET /api/deals/settlement/bulk-data` (deals awaiting settlement with money picture) and `POST /api/deals/settlement/bulk` `{ deal_ids: [] }` (marks each settled where fully received). Declared **before** `/:id` routes.

- [ ] **Step 1: Add handlers**

```js
// append to dealSettlement.controller.js
exports.bulkData = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), settlement_status: ['not_started', 'in_progress'] };
  if (req.query.deal_type) where.deal_type = req.query.deal_type;
  const deals = await PropertyDeal.findAll({ where, order: [['id', 'ASC']], limit: 500 });
  const rows = [];
  for (const d of deals) {
    const m = await svc.computeDealMoney(d);
    rows.push({ deal_id: d.id, deal_code: d.deal_code, deal_type: d.deal_type, expected: m.expected.total, received: m.received, remaining: m.remaining, net_held: m.net_held, statuses: m.statuses, next_action: m.next_action });
  }
  res.json({ data: rows, summary: { deals: rows.length, awaiting: rows.filter((r) => r.statuses.payment !== 'received').length, ready_to_settle: rows.filter((r) => r.statuses.payment === 'received').length } });
});

exports.bulkSettle = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.deal_ids) ? req.body.deal_ids.map(Number) : [];
  if (!ids.length) return res.status(400).json({ error: 'No deals selected.' });
  const results = []; let settled = 0; let skipped = 0;
  for (const id of ids) {
    const deal = await PropertyDeal.findOne({ where: { id, ...branchScope(req) } });
    if (!deal) { results.push({ deal_id: id, status: 'failed', error: 'not found' }); continue; }
    const m = await svc.computeDealMoney(deal);
    if (m.statuses.payment !== 'received') { results.push({ deal_id: id, status: 'skipped', reason: 'not fully received' }); skipped += 1; continue; }
    await deal.update({ settlement_status: 'settled', settlement_date: deal.settlement_date || new Date() });
    await svc.logEvent(deal.id, deal.branch_id, 'settled', { detail: 'bulk', actor: req.user?.id });
    results.push({ deal_id: id, status: 'settled' }); settled += 1;
  }
  res.json({ results, summary: { settled, skipped } });
});
```

- [ ] **Step 2: Routes (before `/:id`)**

In `deal.routes.js`, add immediately after the `router.post('/', ctrl.create);` line (so they precede `/:id`):
```js
router.get('/settlement/bulk-data', settle.bulkData);
router.post('/settlement/bulk', settle.bulkSettle);
```
(Add `const settle = require('../controllers/dealSettlement.controller');` near the top if not already added in Task 3 — it is; keep one require.)

- [ ] **Step 3: Restart + verify**

Restart. `GET /api/deals/settlement/bulk-data` → 200 with `summary`; `POST /api/deals/settlement/bulk {deal_ids:[<received deal>]}` → `settled:1`; a not-received deal → `skipped`.

- [ ] **Step 4: Commit**

```bash
git add backend/controllers/dealSettlement.controller.js backend/routes/deal.routes.js
git commit -m "feat(deals): sales bulk settlement run"
```

---

### Task 7: Deal Settlement workspace UI (embedded on the deal)

**Files:**
- Create: `admin-portal/src/screens/sales/DealSettlementWorkspace.jsx`
- Modify: `admin-portal/src/screens/DealsBoard.jsx` (open the workspace from a deal), or `admin-portal/src/screens/sales/SalesPropertyFile.jsx` if that is the deal detail — inspect first and wire into whichever renders a single deal.

**Interfaces:**
- Consumes: `GET/POST /api/deals/:id/settlement*`, `/disbursements*`, `/settle`.

- [ ] **Step 1: Inspect where a single deal is shown**

Run: `cd admin-portal && grep -rnE "deals/|PropertyDeal|dealType|/residential/buy" src/screens/DealsBoard.jsx | head` and open the file to find the row/card click handler. Decide the mount point (a drawer or a `/residential/deals/:id` route). Record the choice at the top of the new file as a comment.

- [ ] **Step 2: Write the workspace component**

```jsx
// admin-portal/src/screens/sales/DealSettlementWorkspace.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select, Spinner, Badge } from '../../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
const STATUS_TONE = { none: 'grey', unpaid: 'grey', not_started: 'grey', drafted: 'amber', sent: 'amber', partial: 'amber', pending: 'amber', in_progress: 'amber', signed: 'green', received: 'green', settled: 'green', disbursed: 'green' };

export default function DealSettlementWorkspace({ dealId }) {
  const toast = useToast();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rcv, setRcv] = useState({ amount: '', kind: 'commission', method: 'bank' });
  const [disb, setDisb] = useState({ payee_type: 'agent', payee_name: '', amount: '', method: 'bank_transfer', reference: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get(`/deals/${dealId}/settlement`); setD(data); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not load settlement'); }
    finally { setLoading(false); }
  }, [dealId, toast]);
  useEffect(() => { load(); }, [load]);

  const call = async (fn, ok) => { try { await fn(); toast.success(ok); load(); } catch (e) { toast.error(e.response?.data?.error || 'Failed'); } };
  if (loading || !d) return <Spinner />;
  const m = d.money; const s = m.statuses;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['Contract', s.contract], ['Settlement', s.settlement], ['Payment', s.payment], ['Disbursement', s.disbursement]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '8px 12px' }}><div style={{ fontSize: 11, color: '#64748b' }}>{k}</div><Badge tone={STATUS_TONE[v] || 'grey'}>{String(v).replace('_', ' ')}</Badge></div>
        ))}
      </div>
      {m.next_action && <div className="card" style={{ padding: 12, borderLeft: '3px solid #0284c7' }}><strong>Next:</strong> {m.next_action.label}</div>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[['Expected', m.expected.total], ['Received', m.received], ['Disbursed', m.disbursed], ['Remaining', m.remaining], ['Held', m.net_held]].map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '10px 14px', minWidth: 130 }}><div style={{ fontSize: 11, color: '#64748b' }}>{k}</div><div style={{ fontWeight: 800 }}>{money(v)}</div></div>
        ))}
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Prepare</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8 }}>
          <Field label="Expected commission"><Input type="number" defaultValue={d.deal.expected_commission} id="ec" /></Field>
          <Field label="Expected fee"><Input type="number" defaultValue={d.deal.expected_fee} id="ef" /></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/prepare`, { expected_commission: document.getElementById('ec').value, expected_fee: document.getElementById('ef').value }), 'Prepared')}>Save expected</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <strong>Receive money</strong>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', marginTop: 8 }}>
          <Field label="Amount"><Input type="number" value={rcv.amount} onChange={(e) => setRcv({ ...rcv, amount: e.target.value })} /></Field>
          <Field label="Kind"><Select value={rcv.kind} onChange={(e) => setRcv({ ...rcv, kind: e.target.value })}><option value="commission">Commission</option><option value="fee">Fee</option></Select></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/receive`, rcv), 'Recorded')}>Record receipt</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>Disbursements</strong>
          {!d.deal.settlement_approved_at && <Button onClick={() => call(() => api.post(`/deals/${dealId}/settlement/approve`), 'Approved')}>Approve settlement</Button>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'end', margin: '8px 0' }}>
          <Field label="Payee"><Input value={disb.payee_name} onChange={(e) => setDisb({ ...disb, payee_name: e.target.value })} /></Field>
          <Field label="Type"><Select value={disb.payee_type} onChange={(e) => setDisb({ ...disb, payee_type: e.target.value })}>{['agent', 'vendor', 'client_refund', 'expense', 'other'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
          <Field label="Amount"><Input type="number" value={disb.amount} onChange={(e) => setDisb({ ...disb, amount: e.target.value })} /></Field>
          <Button onClick={() => call(() => api.post(`/deals/${dealId}/disbursements`, disb), 'Added')}>Add</Button>
        </div>
        <table className="tbl"><tbody>
          {(d.disbursements || []).map((x) => (
            <tr key={x.id}><td>{x.disbursement_code}</td><td>{x.payee_name || x.payee_type}</td><td style={{ textAlign: 'right' }}>{money(x.amount)}</td><td><Badge tone={x.status === 'paid' ? 'green' : 'amber'}>{x.status}</Badge></td>
              <td>{x.status !== 'paid' && <Button size="sm" onClick={() => call(() => api.post(`/deals/${dealId}/disbursements/${x.id}/pay`), 'Paid')}>Pay</Button>}</td></tr>
          ))}
        </tbody></table>
      </div>

      {s.payment === 'received' && d.deal.settlement_status !== 'settled' && (
        <Button onClick={() => call(() => api.post(`/deals/${dealId}/settle`), 'Settled')}>Mark settled</Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Mount it** on the deal detail (drawer or route decided in Step 1). Pass `dealId`.

- [ ] **Step 4: Build**

Run: `cd admin-portal && npm run build`
Expected: `✓ built`.

- [ ] **Step 5: Commit**

```bash
git add admin-portal/src/screens/sales/DealSettlementWorkspace.jsx admin-portal/src/screens/DealsBoard.jsx
git commit -m "feat(deals): guided settlement & disbursement workspace UI"
```

---

### Task 8: Sales bulk settlement screen + nav

**Files:**
- Create: `admin-portal/src/screens/SalesBulkSettlement.jsx`
- Modify: `admin-portal/src/App.jsx` (route `/residential/settlements`), `admin-portal/src/config/consoles.js` (RESIDENTIAL_NAV → add under a new "Money" group).

**Interfaces:**
- Consumes: `GET /api/deals/settlement/bulk-data`, `POST /api/deals/settlement/bulk`.

- [ ] **Step 1: Write the screen** (mirror `BulkOwnerDisbursement.jsx`: KPI strip deals/awaiting/ready, table with checkbox + deal_code + expected/received/remaining + status, "Settle N" action → per-row result).

```jsx
// admin-portal/src/screens/SalesBulkSettlement.jsx
import React, { useState, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Spinner, Badge } from '../ui/kit';
const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
export default function SalesBulkSettlement() {
  const toast = useToast();
  const [rows, setRows] = useState([]); const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false); const [sel, setSel] = useState({}); const [res, setRes] = useState(null);
  const load = useCallback(async () => { setLoading(true); setRes(null);
    try { const { data } = await api.get('/deals/settlement/bulk-data'); setRows(data.data || []); setSummary(data.summary); const s = {}; (data.data || []).forEach((r) => { s[r.deal_id] = r.statuses.payment === 'received'; }); setSel(s); }
    catch (e) { toast.error(e.response?.data?.error || 'Load failed'); } finally { setLoading(false); } }, [toast]);
  React.useEffect(() => { load(); }, [load]);
  const ids = rows.filter((r) => sel[r.deal_id]).map((r) => r.deal_id);
  const run = async () => { try { const { data } = await api.post('/deals/settlement/bulk', { deal_ids: ids }); setRes(data); toast.success(`${data.summary.settled} settled, ${data.summary.skipped} skipped`); load(); } catch (e) { toast.error(e.response?.data?.error || 'Run failed'); } };
  const resultFor = (id) => res?.results?.find((x) => x.deal_id === id);
  return (<>
    <PageHead title="Sales Settlement (Bulk)" desc="Settle every fully-received deal in one run — posts nothing new, just confirms settlement."
      actions={<><Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button><Button icon={Play} onClick={run} disabled={!ids.length}>Settle {ids.length}</Button></>} />
    {summary && <div style={{ display: 'flex', gap: 12, margin: '8px 0' }}>{[['Deals', summary.deals], ['Awaiting money', summary.awaiting], ['Ready to settle', summary.ready_to_settle]].map(([k, v]) => <div key={k} className="card" style={{ padding: '10px 14px' }}><div style={{ fontSize: 11, color: '#64748b' }}>{k}</div><strong>{v}</strong></div>)}</div>}
    <div className="card">{loading ? <div className="card-pad"><Spinner /></div> : (
      <table className="tbl"><thead><tr><th /><th>Deal</th><th style={{ textAlign: 'right' }}>Expected</th><th style={{ textAlign: 'right' }}>Received</th><th>Payment</th><th>Result</th></tr></thead>
      <tbody>{rows.map((r) => { const x = resultFor(r.deal_id); return (
        <tr key={r.deal_id}><td><input type="checkbox" checked={!!sel[r.deal_id]} onChange={(e) => setSel({ ...sel, [r.deal_id]: e.target.checked })} /></td>
          <td>{r.deal_code}</td><td style={{ textAlign: 'right' }}>{money(r.expected)}</td><td style={{ textAlign: 'right' }}>{money(r.received)}</td>
          <td><Badge tone={r.statuses.payment === 'received' ? 'green' : 'amber'}>{r.statuses.payment}</Badge></td>
          <td>{x ? <Badge tone={x.status === 'settled' ? 'green' : 'grey'}>{x.status}</Badge> : ''}</td></tr>); })}</tbody></table>
    )}</div>
  </>);
}
```

- [ ] **Step 2: Route + nav**

`App.jsx`: `import SalesBulkSettlement from './screens/SalesBulkSettlement';` and add `<Route path="/residential/settlements" element={<SalesBulkSettlement />} />` inside the residential console routes.
`consoles.js` RESIDENTIAL_NAV: add a group `{ key: 'money', label: 'Money', items: [{ to: '/residential/settlements', label: 'Settlements (Bulk)', icon: HandCoins }] }` (import `HandCoins` if not present).

- [ ] **Step 3: Build**

Run: `cd admin-portal && npm run build` → `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add admin-portal/src/screens/SalesBulkSettlement.jsx admin-portal/src/App.jsx admin-portal/src/config/consoles.js
git commit -m "feat(deals): sales bulk settlement screen + residential Money nav"
```

---

### Task 9: End-to-end verification harness

**Files:**
- Create: `backend/scripts/e2eDealSettlement.js`

**Interfaces:**
- Consumes: all endpoints above.

- [ ] **Step 1: Write the harness** (mirrors `backend/scripts/e2ePmJourney.js`): login admin; create a sell deal (`POST /api/deals {deal_type:'sell', property_id, sale_price, ...}`); set `contract_status='signed'` via `PUT /api/deals/:id`; prepare (expected_commission 10000); GET settlement (assert next_action='receive'); receive 10000 (assert payment 'received'); approve; create disbursement agent 3000 (assert 201); duplicate create (assert 409); pay it (assert net_held 7000, disbursement 'partial'); settle (assert settled); bulk-data (assert appears); bulk settle. Print `N PASS / M FAIL`.

- [ ] **Step 2: Run it**

Run: `cd backend && node scripts/e2eDealSettlement.js`
Expected: all PASS, 0 FAIL (duplicate → 409, approval gate → 400 before approve, net_held maths correct).

- [ ] **Step 3: Full build gate**

Run: `cd admin-portal && npm run build`
Expected: `✓ built`.

- [ ] **Step 4: Commit**

```bash
git add backend/scripts/e2eDealSettlement.js
git commit -m "test(deals): end-to-end settlement & disbursement harness"
```

---

## Self-Review

**Spec coverage (§6 of the spec):** four distinct statuses → Task 1 + workspace (7); expected-vs-actual on one screen → Task 2/3 + 7; receive + pay from one place → 4/5/7; prepare→review→approve→record→reconcile → 3/4/5; duplicate-payment guard → 5 (`source_hash` 409); append-only audit trail → 1 (`deal_events`) + logged everywhere; bulk run → 6/8; surfaced from the deal workspace → 7; reuse existing engine (no parallel money path) → 4 (calls `/api/invoices/:id/payments`); no trust account → honored (none built). Verify green → 9.

**Placeholder scan:** none — every step has real code or an exact command.

**Type consistency:** `computeDealMoney` returns `{expected{fee,commission,total}, received, disbursed, deductions, remaining, net_held, statuses{contract,settlement,payment,disbursement}, next_action}` — consumed consistently in Tasks 3/5/6/7. `generateCode(model, field, prefix)`, `source_hash` (≤40 chars), disbursement statuses `draft|approved|paid|void`, deal statuses as defined in Task 1 — used identically throughout.

**Open dependency flagged:** Task 2 Step 1 probe confirms `invoices` has no `deal_id`; money-in is matched by the `DEAL:<deal_code>` payment reference. If a future migration adds `invoices.deal_id`, switch `receivedFor` to it. (Recorded so an executor isn't surprised.)
