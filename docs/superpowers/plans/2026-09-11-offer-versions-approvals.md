# Offer Versions + Written Approvals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture every offer submit/counter as an immutable version, and require a recorded written approval of the accepted version before an offer can be accepted.

**Architecture:** `SaleOffer` stays the negotiation thread (its current amount/terms unchanged, so accept→transaction/settlement is untouched). A new `SaleOfferVersion` child snapshots each submit/counter; a new `SaleOfferApproval` records the written approval of the version being accepted. `acceptOffer` is gated to require an approval (super-admin override with a reason). Migration 0106; both models added inline in `SalesModels.js`. The property-file Offers section shows a version timeline + the approval.

**Tech Stack:** Node/Express/Sequelize (`:50001`, sequelize-cli migrations), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + the backend harnesses (the full-lock harness is updated here to pass an approval).

**Spec:** `docs/superpowers/specs/2026-09-11-offer-versions-approvals-design.md`

## Global Constraints

- **`SaleOffer` thread is unchanged for downstream.** Its `amount`/`deposit`/terms still update as today; versions are additive history. `acceptOffer`'s transaction/deal/parties logic is untouched apart from the approval gate.
- **Accept gate:** acceptance requires `{ approval: { approver_side, note, decision:'approved' } }`; without it → 409, unless `req.user.role==='super_admin' && override && override_reason` (records the approval with `override_reason`). `decision:'rejected'` is never a valid accept (400).
- **Migration discipline:** 0103/0105 guarded idiom; next number **0106**; provide `down`; never edit an applied migration. No change to existing tables.
- **Models live inline in `SalesModels.js`** using its `define(name, tableName, attrs)` + `money()` + `jsonField()` helpers, associations in the block before `module.exports`, and added to the exports object.
- **Keep harnesses green:** `e2eDealSalesSettlementFull.js` accepts an offer — update its accept call to pass an approval, in this change. Backend `npm test` (27/0) + `npm run test:full` (28/0) must pass after.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/migrations/0106-offer-versions-approvals.js` — **create**: `sale_offer_versions` + `sale_offer_approvals`.
- `backend/models/SalesModels.js` — **modify**: two `define(...)` models + associations + exports.
- `backend/controllers/sales.controller.js` — **modify**: `appendOfferVersion` helper; call from create/patch/updateStatus; accept gate + approval in `acceptOffer`; include versions/approvals in the offers read (`getPropertyFile`).
- `backend/scripts/e2eDealSalesSettlementFull.js` — **modify**: pass an approval on accept.
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: offers-section version timeline + accept-with-approval.

**Schema:** migration 0106 (two new tables).

---

### Task 1: Migration + models

**Files:** Create `backend/migrations/0106-offer-versions-approvals.js`; modify `backend/models/SalesModels.js`.

- [ ] **Step 1: Migration** (guarded idiom):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = { created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } };
    const ts2 = { ...ts, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } };
    if (!(await q.describeTable('sale_offer_versions').catch(() => null))) {
      await q.createTable('sale_offer_versions', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        offer_id: { type: S.INTEGER, allowNull: false },
        version_no: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        side: { type: S.ENUM('buyer', 'seller'), allowNull: false, defaultValue: 'buyer' },
        amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        deposit_amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        finance_status: S.STRING(40), conditions: S.JSON,
        expiry_date: S.DATEONLY, proposed_completion_date: S.DATEONLY,
        notes: S.TEXT, parties_snapshot: S.JSON, created_by: S.INTEGER, ...ts,
      });
    }
    if (!(await q.describeTable('sale_offer_approvals').catch(() => null))) {
      await q.createTable('sale_offer_approvals', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        offer_id: { type: S.INTEGER, allowNull: false },
        offer_version_id: { type: S.INTEGER, allowNull: false },
        approver_side: { type: S.ENUM('buyer', 'seller'), allowNull: false, defaultValue: 'seller' },
        decision: { type: S.ENUM('approved', 'rejected'), allowNull: false, defaultValue: 'approved' },
        note: S.TEXT, override_reason: S.TEXT, approved_by: S.INTEGER, approved_at: S.DATE, ...ts2,
      });
    }
  },
  down: async (q) => { await q.dropTable('sale_offer_approvals').catch(() => {}); await q.dropTable('sale_offer_versions').catch(() => {}); },
};
```

- [ ] **Step 2: Models in `SalesModels.js`.** After the `SaleOffer`/`SaleOfferParty` defines, add:
```js
const SaleOfferVersion = define('SaleOfferVersion', 'sale_offer_versions', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  offer_id: DataTypes.INTEGER, version_no: DataTypes.INTEGER, side: DataTypes.ENUM('buyer', 'seller'),
  amount: money(), deposit_amount: money(), finance_status: DataTypes.STRING(40), conditions: jsonField('conditions', []),
  expiry_date: DataTypes.DATEONLY, proposed_completion_date: DataTypes.DATEONLY, notes: DataTypes.TEXT,
  parties_snapshot: jsonField('parties_snapshot', []), created_by: DataTypes.INTEGER,
}, { updatedAt: false });
const SaleOfferApproval = define('SaleOfferApproval', 'sale_offer_approvals', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, branch_id: { type: DataTypes.INTEGER, allowNull: false },
  offer_id: DataTypes.INTEGER, offer_version_id: DataTypes.INTEGER, approver_side: DataTypes.ENUM('buyer', 'seller'),
  decision: DataTypes.ENUM('approved', 'rejected'), note: DataTypes.TEXT, override_reason: DataTypes.TEXT,
  approved_by: DataTypes.INTEGER, approved_at: DataTypes.DATE,
});
```
In the associations block add:
```js
SaleOffer.hasMany(SaleOfferVersion, { as: 'versions', foreignKey: 'offer_id' });
SaleOfferVersion.belongsTo(SaleOffer, { foreignKey: 'offer_id' });
SaleOffer.hasMany(SaleOfferApproval, { as: 'approvals', foreignKey: 'offer_id' });
SaleOfferApproval.belongsTo(SaleOfferVersion, { as: 'version', foreignKey: 'offer_version_id' });
```
Add `SaleOfferVersion, SaleOfferApproval` to `module.exports`.

- [ ] **Step 3: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0106 up; `node -e "const m=require('./models/SalesModels'); console.log(!!m.SaleOfferVersion, !!m.SaleOfferApproval)"` → `true true`.

- [ ] **Step 4: Commit** — `feat(offers): sale_offer_versions + sale_offer_approvals (migration 0106 + models)`

---

### Task 2: Backend — version-append on submit/counter

**Files:** Modify `backend/controllers/sales.controller.js`.

**Interfaces:** `appendOfferVersion(offer, side, actorId, transaction)`; called from `createOffer`, `patchOffer`, `updateOfferStatus`.

- [ ] **Step 1: Helper.** Add near the offer handlers (import `SaleOfferVersion`, `SaleOfferParty` already in scope):
```js
async function appendOfferVersion(offer, side, actorId, transaction) {
  const parties = await SaleOfferParty.findAll({ where: { offer_id: offer.id, branch_id: offer.branch_id }, transaction, raw: true });
  const last = await SaleOfferVersion.max('version_no', { where: { offer_id: offer.id }, transaction });
  return SaleOfferVersion.create({
    branch_id: offer.branch_id, offer_id: offer.id, version_no: (last || 0) + 1, side,
    amount: offer.amount, deposit_amount: offer.deposit_amount, finance_status: offer.finance_status,
    conditions: offer.conditions, expiry_date: offer.expiry_date, proposed_completion_date: offer.proposed_completion_date,
    notes: offer.notes, parties_snapshot: parties.map((p) => ({ contact_id: p.contact_id, client_id: p.client_id, ownership_percent: p.ownership_percent, is_primary: p.is_primary })),
    created_by: actorId,
  }, { transaction });
}
```

- [ ] **Step 2: createOffer.** In `createOffer`'s transaction, after the `SaleOfferParty.bulkCreate`, when `initialStatus === 'submitted'` append version 1:
```js
if (initialStatus === 'submitted') await appendOfferVersion(row, 'buyer', req.user.id, transaction);
```
(Confirm `row`/`initialStatus`/`transaction` are in scope — they are.)

- [ ] **Step 3: patchOffer.** In its transaction, after `offer.update(...)` (and party rebuild), append a version tagged by side:
```js
const side = req.body.side === 'seller' ? 'seller' : 'buyer';
await appendOfferVersion(offer, side, req.user.id, transaction);
```

- [ ] **Step 4: updateOfferStatus.** It is not transactional today; wrap the update+event in a `sequelize.transaction` and append a version on the counter/re-submit moves:
```js
// submitted -> countered = seller's counter; countered -> submitted = buyer re-submit
if ((old === 'submitted' && target === 'countered')) await appendOfferVersion(offer, 'seller', req.user.id, transaction);
if ((old === 'countered' && target === 'submitted')) await appendOfferVersion(offer, 'buyer', req.user.id, transaction);
```
Keep the existing status update + recordEvent inside the same transaction.

- [ ] **Step 5: Restart + verify.** Create+submit an offer (via the property file API or curl `POST /sales/properties/:pid/offers {amount,deposit_amount,status:'submitted',buyers:[…]}`) → `GET` shows version 1 `side:'buyer'`. `POST /sales/offers/:id/status {status:'countered'}` → version 2 `side:'seller'`. (Add a temporary `GET /sales/offers/:id/versions` if needed, or read via the property file in Task 4 — for now query the table with a node one-liner.) Paste version_no/side.

- [ ] **Step 6: Commit** — `feat(offers): snapshot each submit/counter as an immutable SaleOfferVersion`

---

### Task 3: Backend — accept gate + approval, and offers read

**Files:** Modify `backend/controllers/sales.controller.js`; modify `backend/scripts/e2eDealSalesSettlementFull.js`.

- [ ] **Step 1: Accept gate.** In `acceptOffer`, inside the transaction, before creating the transaction/deal, resolve the latest version and require an approval:
```js
const latest = await SaleOfferVersion.findOne({ where: { offer_id: offer.id }, order: [['version_no', 'DESC']], transaction });
const ap = req.body.approval || {};
const isOverride = req.user?.role === 'super_admin' && req.body.override && String(req.body.override_reason || '').trim();
if (ap.decision === 'rejected') fail(400, 'A rejected offer cannot be accepted.');
if (!ap.note && !isOverride) fail(409, 'A written approval of this offer version is required to accept it.');
// (create the transaction/deal/parties exactly as today) …
await SaleOfferApproval.create({
  branch_id: offer.branch_id, offer_id: offer.id, offer_version_id: latest?.id || null,
  approver_side: ['buyer', 'seller'].includes(ap.approver_side) ? ap.approver_side : 'seller',
  decision: 'approved', note: ap.note || null,
  override_reason: isOverride ? String(req.body.override_reason).trim() : null,
  approved_by: req.user.id, approved_at: new Date(),
}, { transaction });
```
Place the approval insert alongside the existing accept writes (same transaction). Do not change the transaction/deal/party creation logic. If no version exists yet (offer accepted without a prior submitted version — edge case), append one first via `appendOfferVersion(offer, 'buyer', req.user.id, transaction)` then approve it.

- [ ] **Step 2: Offers read.** In `getPropertyFile`, add to the offers include: `{ model: SaleOfferVersion, as: 'versions' }` and `{ model: SaleOfferApproval, as: 'approvals', include: [{ model: SaleOfferVersion, as: 'version' }] }` (order versions by `version_no`). Confirm the offers query is an `include` on the property/settlement read; if offers are fetched separately, add the includes there.

- [ ] **Step 3: Update the full-lock harness.** In `e2eDealSalesSettlementFull.js`, change the accept call to pass an approval:
```js
const accept = await req('POST', `/api/sales/offers/${offerId}/accept`, { body: { approval: { approver_side: 'seller', note: 'e2e approval' } } });
```
(The offer it accepts is created with `status:'submitted'`, so version 1 exists.)

- [ ] **Step 4: Restart + verify.**
  - Accept without approval → 409 (`A written approval…`).
  - Accept with `{approval:{approver_side:'seller',note:'ok'}}` → 201; transaction+deal created (unchanged); a `sale_offer_approvals` row links the latest version.
  - Super-admin `{override:true, override_reason:'no counterpart'}` (no note) → 201 with `override_reason` recorded.
  - `cd backend && npm test` → 27/0; `npm run test:full` → 28/0 (harness now passes the approval).
  Paste the codes + harness result.

- [ ] **Step 5: Commit** — `feat(offers): require a written approval to accept; record SaleOfferApproval + harness update`

---

### Task 4: Frontend — version timeline + accept-with-approval

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx` (offers section only).

- [ ] **Step 1: Read the data.** The offers section already renders offers from the property-file payload; each offer now carries `versions` (array) + `approvals`. No new fetch.

- [ ] **Step 2: Version timeline.** Under each offer, add a collapsible "History (N)" showing versions newest-first: `v{version_no}` + a side badge (Buyer/Seller) + `money(amount)` (deposit) + expiry/completion + date. Read-only. Use existing `.pm-*`/`ui/kit` styles.

- [ ] **Step 3: Accept-with-approval.** Change the offer Accept control to open a small inline form / drawer: `approver_side` (Buyer/Seller select, default seller), a required `note`, and — for a super_admin — an "override (no formal approval)" checkbox + reason. Submit → `POST /sales/offers/:id/accept` with `{ approval: { approver_side, note } }` (or `{ override:true, override_reason }`). On the existing "Accept" path, block submit until a note (or override reason) is present; surface the 409 message if the server still refuses.

- [ ] **Step 4: Show the approval.** On an accepted offer, display its approval (side, note, who/when) from `offer.approvals`.

- [ ] **Step 5: Verify.** `cd admin-portal && npm run build` → `✓ built`. Browser: on a property, submit an offer → History shows v1 (Buyer); counter it → v2 (Seller); Accept prompts for an approval note and, on submit, creates the transaction and shows the approval; a super-admin can override with a reason. Paste the build tail.

- [ ] **Step 6: Commit** — `feat(offers): property-file version timeline + accept-with-approval`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Full negotiation (browser):** submit → counter → counter-back → each appends a version; accept with approval → transaction created and the accepted flow still reaches the Settlement Desk; the accepted offer shows the approval + full history.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG entry; `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(offers): work-log + rebuild dist; Phase 3 sub-project 3 done`

---

## Self-Review

**Spec coverage:** §3 models/migration → Task 1; §4 version-append (create/patch/updateStatus) → Task 2, accept gate + approval + offers read → Task 3; §5 timeline + accept-with-approval → Task 4; §6 testing incl. harness update → Tasks 3 & 5. Introductions absent (deferred) — correct.

**Placeholder scan:** migration, both models, the append helper, the accept-gate block, and the harness edit are real code; verification steps are concrete curls/clicks with expected codes/versions. No "TBD"/"handle errors"/"similar to". The one edge case (accept with no prior version) has a defined action (append then approve).

**Type consistency:** `appendOfferVersion(offer, side, actorId, transaction)` — same signature at every call site (Tasks 2–3). `SaleOfferVersion`/`SaleOfferApproval` names match the `SalesModels.js` exports (Task 1) and the includes (Task 3 Step 2). Accept body shape `{ approval: { approver_side, note, decision? }, override?, override_reason? }` matches between controller (Task 3), harness (Task 3 Step 3), and frontend (Task 4 Step 3). `versions`/`approvals` association aliases used identically in the read and the UI.

**Open item carried to execution:** Task 3 Step 2 assumes offers are read via an `include` in `getPropertyFile`; if the offers list is assembled differently, add the version/approval includes wherever the offers array is built (defined output: offers carry `versions` + `approvals`). Confirm at the top of Task 3 Step 2 by grepping `SaleOffer` includes in `getPropertyFile`.
