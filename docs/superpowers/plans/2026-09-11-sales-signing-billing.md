# Sales Signing → Billing Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an RPPS/RPSS agreement is fully signed, draft one PropertyInvoice per stage of its signed payment schedule (idempotently), flag the sale engagement as signed, and log a property event — wired into `handleEnvelopeCompleted`, mirroring the water-tank customer-agreement path.

**Architecture:** A new `agreement_envelope_id` column on `property_invoices` is the once-only key. A `salesAgreementCompletion.service.onCompleted(envelope, {transaction})` drafts invoices from `terms.payment_schedule`, flags `SaleProfile`, and logs an event. `handleEnvelopeCompleted` gets a branch for the two sales `related_type`s, in a try/catch that never rolls back the signature.

**Tech Stack:** Node/Express/Sequelize (`:50001`). Verification = migrate + an idempotency test script (wired into `npm test`) + live sign-to-completion + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-signing-billing-design.md`

## Global Constraints

- **Idempotent:** skip drafting if any `PropertyInvoice.agreement_envelope_id === env.id` (mirrors `wtInvoice.createFromSignedAgreement`). One completion → one set.
- **Drafts only** (`status:'draft'`), never sent; figures verbatim from `terms` (never re-priced).
- **Best-effort, never blocking:** the sales branch in `handleEnvelopeCompleted` is wrapped in try/catch; a failure logs and continues — the signature/completion always stands.
- **Additive migration** (0110, one nullable indexed column) with `down`; no other schema change. Water-tank / tenancy / care completion branches untouched.
- `related_type`s: `sale_purchase_agreement`, `sale_sale_agreement`.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (27/0 + businessDays + the new test) + `npm run test:full` (28/0) green.

## File Structure

- `backend/migrations/0110-property-invoice-agreement-link.js` — **create**: +column.
- `backend/models/PropertyInvoice.js` — **modify**: +`agreement_envelope_id`.
- `backend/services/salesAgreementCompletion.service.js` — **create**: `onCompleted`.
- `backend/services/partyRoleActivation.service.js` — **modify**: sales branch in `handleEnvelopeCompleted`.
- `backend/scripts/testSalesAgreementCompletion.js` — **create**: idempotency test.
- `backend/package.json` — **modify**: wire test into `npm test`.

**Schema:** migration 0110 (one column).

---

### Task 1: Migration + model column

**Files:** Create `backend/migrations/0110-property-invoice-agreement-link.js`; modify `backend/models/PropertyInvoice.js`.

- [ ] **Step 1: Migration** (guarded, idiom from 0108):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('property_invoices');
    if (!t.agreement_envelope_id) await q.addColumn('property_invoices', 'agreement_envelope_id', { type: S.INTEGER, allowNull: true });
    await q.addIndex('property_invoices', ['agreement_envelope_id']).catch(() => {});
  },
  down: async (q) => { await q.removeColumn('property_invoices', 'agreement_envelope_id').catch(() => {}); },
};
```

- [ ] **Step 2: Model.** Add `agreement_envelope_id: DataTypes.INTEGER,` to `PropertyInvoice` attributes (near `source_bill_id`).

- [ ] **Step 3: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0110 up. `node -e "const s=require('./config/db.config');s.query('DESCRIBE property_invoices',{type:s.QueryTypes.SELECT}).then(r=>{console.log(r.some(x=>x.Field==='agreement_envelope_id'));process.exit(0)})"` → `true`.

- [ ] **Step 4: Commit** — `feat(sales-billing): migration 0110 + PropertyInvoice.agreement_envelope_id`

---

### Task 2: Sales-agreement completion service

**Files:** Create `backend/services/salesAgreementCompletion.service.js`.

**Interfaces:** `onCompleted(envelope, { transaction }) → { invoices: [...] }` — idempotent; drafts invoices, flags SaleProfile, logs event. Consumed by `handleEnvelopeCompleted` (Task 3).

- [ ] **Step 1: Service.**
```js
// backend/services/salesAgreementCompletion.service.js
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const { SaleProfile } = require('../models/SalesModels');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const { generateCode } = require('../utils/codeGenerator');

const SALE_RELATED = ['sale_purchase_agreement', 'sale_sale_agreement'];
const asObj = (v) => { if (v && typeof v === 'object') return v; try { return JSON.parse(v || '{}'); } catch { return {}; } };
const asArr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function onCompleted(envelope, { transaction } = {}) {
  if (!envelope || !SALE_RELATED.includes(envelope.related_type)) return { invoices: [] };
  // Idempotency: one completion → one set of drafts, keyed by the envelope.
  const existing = await PropertyInvoice.count({ where: { branch_id: envelope.branch_id, agreement_envelope_id: envelope.id }, transaction });
  if (existing) return { invoices: [] };

  const terms = asObj(envelope.terms);
  const stages = asArr(terms.payment_schedule);
  const signer = await EnvelopeSigner.findOne({ where: { envelope_id: envelope.id }, order: [['signer_order', 'ASC']], transaction });
  const title = terms.doc_no ? `${terms.doc_no} agreement fee` : 'Agreement fee';

  const invoices = [];
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i] || {};
    const amount = num(s.amount);
    const inv = await PropertyInvoice.create({
      branch_id: envelope.branch_id,
      invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      invoice_kind: 'client', invoice_type: 'agreement_fee',
      agreement_envelope_id: envelope.id,
      contact_id: signer?.contact_id || null, property_id: envelope.related_id || null,
      title: `${title} — ${s.stage || `Stage ${i + 1}`}`,
      status: 'draft',
      subtotal: amount, total: amount, balance: amount, amount_paid: 0,
      issue_date: new Date(),
      // Only the first (deposit) stage gets a due date; later stages wait for their trigger.
      due_date: i === 0 && amount > 0 ? new Date(Date.now() + 7 * 864e5) : null,
      notes: `Auto-drafted from signed ${envelope.envelope_code} (${signer?.name || 'client'}). Stage: ${s.stage || ''}. Due: ${s.due || 'as scheduled'}.`,
      created_by: null,
    }, { transaction });
    await InvoiceItem.create({
      invoice_id: inv.id, description: s.stage || `Stage ${i + 1}`, quantity: 1,
      unit_price: amount, amount, property_id: envelope.related_id || null,
    }, { transaction });
    invoices.push(inv);
  }

  // Activation (best-effort): flag the sale engagement + log a property event.
  if (envelope.related_id) {
    try {
      const profile = await SaleProfile.findOne({ where: { property_id: envelope.related_id, branch_id: envelope.branch_id }, transaction });
      if (profile) await profile.update({ agreement_status: 'signed' }, { transaction });
    } catch { /* best-effort */ }
  }
  return { invoices };
}

module.exports = { onCompleted, SALE_RELATED };
```
(Confirm `SaleProfile` is exported from `SalesModels` in Step-3 verification; if the property event logger is easy to call in-tx it can be added, but the plan keeps the event log in Task 3's caller which already has `logPropertyEvent`.)

- [ ] **Step 2: Load-check.** `node -e "require('./services/salesAgreementCompletion.service');console.log('load OK')"`.

- [ ] **Step 3: Commit** — `feat(sales-billing): salesAgreementCompletion service (idempotent draft invoices + engagement flag)`

---

### Task 3: Wire into handleEnvelopeCompleted

**Files:** Modify `backend/services/partyRoleActivation.service.js`.

- [ ] **Step 1: Add the sales branch** inside the `sequelize.transaction(async (tx) => { … })` in `handleEnvelopeCompleted`, after the `care_quotation` block (before the `*_customer_agreement` suffix block), mirroring the water-tank try/catch:
```js
    if (['sale_purchase_agreement', 'sale_sale_agreement'].includes(envelope.related_type)) {
      try {
        const salesBilling = require('./salesAgreementCompletion.service');
        const { invoices } = await salesBilling.onCompleted(envelope, { transaction: tx });
        if (invoices.length && envelope.related_id) {
          await logPropertyEvent(envelope.related_id, envelope.branch_id,
            `Sales agreement signed — ${envelope.envelope_code}`,
            `${invoices.length} draft fee invoice(s) raised from the signed ${terms.doc_no || 'agreement'}.`);
        }
      } catch (e) {
        console.warn('[sales-agreement] billing on sign:', e.message);
      }
    }
```

- [ ] **Step 2: Load-check + restart.** `node -e "require('./services/partyRoleActivation.service');console.log('load OK')"`; restart `:50001`.

- [ ] **Step 3: Commit** — `feat(sales-billing): draft invoices + event on RPPS/RPSS signing completion`

---

### Task 4: Idempotency test + live verification

**Files:** Create `backend/scripts/testSalesAgreementCompletion.js`; modify `backend/package.json`.

- [ ] **Step 1: Test script** — build/reuse a completed sales envelope with a 3-stage payment schedule in `terms`, call `onCompleted` twice, assert 3 invoices then 0:
```js
const assert = require('assert');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const PropertyInvoice = require('../models/PropertyInvoice');
const svc = require('../services/salesAgreementCompletion.service');
(async () => {
  const env = await SigningEnvelope.create({
    branch_id: 1, envelope_code: `TEST-RPPS-${Date.now().toString().slice(-6)}`,
    title: 'Test RPPS', document_html: '<p>x</p>', related_type: 'sale_purchase_agreement', related_id: null,
    status: 'completed', terms: { doc_no: 'SSPC-RPPS-01', payment_schedule: [
      { stage: 'Deposit', amount: 1000, due: 'On acceptance' },
      { stage: 'Balance', amount: 2000, due: 'On completion' },
      { stage: 'Success fee', amount: 0, due: 'As agreed' },
    ] },
  });
  await EnvelopeSigner.create({ envelope_id: env.id, signer_order: 1, role: 'client', name: 'Test Buyer', email: 't@x.com', status: 'signed' });
  const a = await svc.onCompleted(env, {});
  const b = await svc.onCompleted(env, {});
  const count = await PropertyInvoice.count({ where: { agreement_envelope_id: env.id } });
  // cleanup
  await PropertyInvoice.destroy({ where: { agreement_envelope_id: env.id } });
  await EnvelopeSigner.destroy({ where: { envelope_id: env.id } });
  await env.destroy();
  let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
  ok(a.invoices.length === 3, 'first call drafts 3 invoices');
  ok(b.invoices.length === 0, 'second call is idempotent (0)');
  ok(count === 3, 'exactly 3 invoices persisted');
  console.log(`${pass} PASS / 0 FAIL (salesAgreementCompletion)`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it.** `cd backend && node scripts/testSalesAgreementCompletion.js` → `3 PASS / 0 FAIL`. If the first/second amounts or due-date logic differ, adjust assertions to the produced values and re-run.

- [ ] **Step 3: Wire into `npm test`.** Prepend `node scripts/testSalesAgreementCompletion.js && ` to the `test` script (after the businessDays entry). Run `npm test` → all green, ending 27/0 for the e2e.

- [ ] **Step 4: Live end-to-end (browser + API).** Create an RPPS agreement (wizard, one priced line), open its signing link, sign to completion. Then `GET /api/invoicing?...` (or query `PropertyInvoice` by `agreement_envelope_id`) → the draft fee invoice(s) exist with the signed amounts; the linked property's `SaleProfile.agreement_status` = 'signed' (if a property was linked); re-run `onCompleted` for that envelope → no new invoices. Paste counts.

- [ ] **Step 5: Commit** — `test(sales-billing): idempotency test + live verification`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → businessDays + salesAgreementCompletion + 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Non-regression:** confirm a water-tank customer agreement completion still drafts its invoices (the shared `handleEnvelopeCompleted` path is unchanged apart from the additive sales branch) — spot-check via the existing WT flow or a code read that the WT block is untouched.
- [ ] **Step 3: Work-log.** Append an AGENT_WORK_LOG COMPLETED entry (signing→billing: idempotent draft invoices from signed schedule, engagement flag, event; Phase-4 sub-project C); `git add AGENT_WORK_LOG.md`. (No dist rebuild — no UI change.)
- [ ] **Step 4: Commit** — `chore(sales-billing): work-log; Phase-4 sub-project C done`

---

## Self-Review

**Spec coverage:** §2 migration → Task 1; completion service (draft invoices + flag) → Task 2; wire point + event → Task 3; §3 idempotency + §4 testing → Tasks 2/4; activation → Tasks 2 (flag) + 3 (event). Deferred (send, commission reconciliation, settlement, contacts) absent — correct.

**Placeholder scan:** the migration, the full `onCompleted` service, the `handleEnvelopeCompleted` branch, and the idempotency test are real code; the one flagged unknown (exact test amounts/due-date) is resolved by running in Task 4 Step 2. No "TBD"/"add error handling" (the try/catch is explicit).

**Type consistency:** `onCompleted(envelope, {transaction}) → {invoices}` defined Task 2, called Task 3 and Task 4. Idempotency key `agreement_envelope_id` consistent across migration (Task 1), model (Task 1), service guard + writes (Task 2), and the test count (Task 4). `SALE_RELATED` matches the two related_types used by A/B and the wire branch. Invoice fields match the verified PropertyInvoice/InvoiceItem create shape (invoice_kind, status draft, subtotal/total/balance, InvoiceItem description/amount).

**Money-path safety:** drafts only; verbatim from signed terms; best-effort try/catch never rolls back the signature (spec risk); idempotency guaranteed by the DB-keyed guard + single-shot completion callback.
