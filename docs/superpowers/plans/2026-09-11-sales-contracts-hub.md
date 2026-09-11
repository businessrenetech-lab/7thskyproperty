# Sales Contracts Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A residential-sales Contracts home over the RPPS/RPSS signing envelopes — status buckets (awaiting / expiring-soon / expired / completed / declined-voided), reminders, void, read-time expiry, signed archive, and a lightweight create-variation.

**Architecture:** Add a buckets read + a variation action to the existing `salesAgreement.controller` (reusing the signing `remind`/`void` endpoints for actions), and a `SalesContracts.jsx` hub screen. The RPPS/RPSS wizard accepts an optional `prefill`. No schema change.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-contracts-hub-design.md`

## Global Constraints

- **Additive/read-mostly:** one read endpoint + one void-reuse action; no schema change, no scheduler, no change to A's create flow or the signing controller.
- **Route ordering:** register `/contracts` and `/contracts/:id/variation` BEFORE the `/:kind/...` routes in `salesAgreement.routes.js`.
- **Reuse actions:** Remind = `POST /api/signing/envelopes/:id/remind`; Void = `POST /api/signing/envelopes/:id/void {reason}`; signer token via `GET /api/signing/envelopes/:id`.
- **Expiry read-time only** from `expires_at`; the DB status is not auto-flipped.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (27/0 + businessDays) + `npm run test:full` (28/0) green; build clean.

## SALE_RELATED = ['sale_purchase_agreement','sale_sale_agreement']; kindOf → 'purchase'|'sale'

## File Structure

- `backend/controllers/salesAgreement.controller.js` — **modify**: `contracts`, `createVariation`, helpers.
- `backend/routes/salesAgreement.routes.js` — **modify**: 2 routes before `/:kind`.
- `admin-portal/src/screens/sales/SalesContracts.jsx` — **create**: hub.
- `admin-portal/src/screens/sales/SalesAgreementScreen.jsx` — **modify**: accept `prefill`.
- `admin-portal/src/config/consoles.js` — **modify**: nav item.
- `admin-portal/src/App.jsx` — **modify**: route.

**Schema:** none.

---

### Task 1: Buckets endpoint + variation action

**Files:** Modify `backend/controllers/salesAgreement.controller.js`, `backend/routes/salesAgreement.routes.js`.

**Interfaces:** `GET /api/sales-agreements/contracts[?kind&search]` → `{ buckets, counts }`; `POST /api/sales-agreements/contracts/:id/variation` → `{ kind, prefill }`.

- [ ] **Step 1: Helpers + imports.** In `salesAgreement.controller.js`, add `const { Op } = require('sequelize');` (if absent) and:
```js
const SALE_RELATED = ['sale_purchase_agreement', 'sale_sale_agreement'];
const kindOf = (rt) => (rt === 'sale_sale_agreement' ? 'sale' : 'purchase');
const DAY = 86400000;
```

- [ ] **Step 2: `contracts` handler.**
```js
exports.contracts = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), related_type: { [Op.in]: SALE_RELATED } };
  if (req.query.kind === 'purchase') where.related_type = 'sale_purchase_agreement';
  if (req.query.kind === 'sale') where.related_type = 'sale_sale_agreement';
  if (req.query.search) where[require('sequelize').Op.or] = [{ title: { [Op.like]: `%${req.query.search}%` } }, { envelope_code: { [Op.like]: `%${req.query.search}%` } }];
  const rows = await SigningEnvelope.findAll({ where, include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'name', 'email', 'role', 'status'] }], order: [['created_at', 'DESC']] });
  const now = Date.now();
  const buckets = { awaiting_signature: [], expiring_soon: [], expired: [], completed: [], declined_voided: [] };
  for (const e of rows) {
    const s = (e.signers || [])[0] || {};
    const days = e.expires_at ? Math.ceil((new Date(e.expires_at).getTime() - now) / DAY) : null;
    const item = {
      id: e.id, envelope_code: e.envelope_code, kind: kindOf(e.related_type), title: e.title,
      party_name: s.name || null, party_email: s.email || null, status: e.status,
      sent_at: e.sent_at, expires_at: e.expires_at, completed_at: e.completed_at,
      days_to_expiry: days, signer_status: s.status || null, voided_reason: e.voided_reason || null,
      final_pdf_url: e.final_pdf_url || null, certificate_url: e.certificate_url || null,
    };
    const open = ['sent', 'viewed', 'partially_signed'].includes(e.status);
    if (e.status === 'completed') buckets.completed.push(item);
    else if (['declined', 'voided'].includes(e.status)) buckets.declined_voided.push(item);
    else if (open && days != null && days < 0) buckets.expired.push(item);
    else if (open && days != null && days <= 7) buckets.expiring_soon.push(item);
    else if (open) buckets.awaiting_signature.push(item);
    else buckets.awaiting_signature.push(item); // draft/pending_approval (A creates sent; safety net)
  }
  const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
  res.json({ buckets, counts });
});
```

- [ ] **Step 3: `createVariation` handler.** Void the original (voidable states only) + return prefill from `terms`:
```js
exports.createVariation = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: { [Op.in]: SALE_RELATED } } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (!['draft', 'pending_approval', 'sent', 'viewed', 'partially_signed'].includes(env.status)) return res.status(409).json({ error: `A ${env.status} agreement cannot be varied; only open agreements can be superseded.` });
  await env.update({ status: 'voided', voided_reason: `Superseded by variation (${env.envelope_code})` });
  const t = env.terms || {};
  const prefill = {
    client: {}, // party details are on the signer, re-entered in the wizard; kept minimal
    services: t.selected_services || [],
    pricing_input: { selected: (t.agreed_lines || []).map((l) => ({ code: l.code, agreed_price: l.agreed_price })), discount: 0, vat_percent: 0 },
    schedule_b: t.schedule_b || {},
    supersedes: env.envelope_code,
  };
  res.json({ kind: kindOf(env.related_type), prefill });
});
```

- [ ] **Step 4: Routes (before `/:kind`).** In `salesAgreement.routes.js`, ABOVE the `/:kind/...` lines:
```js
router.get('/contracts', ctrl.contracts);
router.post('/contracts/:id/variation', ctrl.createVariation);
```

- [ ] **Step 5: Verify (live).** Restart `:50001`. `GET /api/sales-agreements/contracts` → `{buckets,counts}` with the existing RPPS/RPSS envelopes under `awaiting_signature`. Back-date one envelope's `expires_at` (node) → it moves to `expired`; set one within 7 days → `expiring_soon`. `?kind=purchase` narrows. `POST /api/sales-agreements/contracts/<id>/variation` on an open one → the envelope becomes `voided` and the response has `{kind, prefill:{selected:[...], supersedes}}`; a completed one → 409. Paste counts + one variation result.

- [ ] **Step 6: Commit** — `feat(sales-contracts): buckets endpoint + lightweight variation`

---

### Task 2: Contracts hub screen + nav + route

**Files:** Create `admin-portal/src/screens/sales/SalesContracts.jsx`; modify `admin-portal/src/screens/sales/SalesAgreementScreen.jsx`, `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: Hub screen.** `SalesContracts.jsx` (`.pm-scope` styling like `SalesAgreementScreen`):
  - State: `data` (buckets/counts), `kind` (''/purchase/sale), `search` (URL-backed via `useSearchParams`). Load `GET /sales-agreements/contracts?kind&search`.
  - Render bucket sections in order **Awaiting signature · Expiring soon · Expired · Completed · Declined / voided**, each with a count header and a `.pm-tbl` of rows: envelope_code, kind badge, party (name/email), status chip, dates (`sent_at`, `expires_at` → "in Nd" / "Nd overdue", `completed_at`).
  - Per-row actions by bucket: **awaiting/expiring** → Remind (`POST /signing/envelopes/:id/remind`) + Copy link (fetch `GET /signing/envelopes/:id`, copy outstanding signer `/admin/sign/:token`) + Void; **expired** → Void + Vary; **completed** → Open (`final_pdf_url`||`certificate_url`, else the signing link) + Vary; **declined/voided** → show `voided_reason` + Vary.
  - **Void:** `window.prompt('Reason for voiding')` → POST void → reload. **Vary:** `POST /sales-agreements/contracts/:id/variation` → `navigate('/residential/agreements/' + res.kind, { state: { prefill: res.prefill } })`.
  - Kind filter buttons (All/Purchase/Sale) + a search box. Reuse `ui/kit` (`PageHead`? — this screen uses `.pm-head` like SalesAgreementScreen; match that) `Spinner`, toasts.

- [ ] **Step 2: Wizard prefill.** In `SalesAgreementScreen.jsx`, read `useLocation().state?.prefill` (import `useLocation` from react-router-dom) and, when present, initialise the Builder's `d` by merging prefill into `emptyState()` (services, pricing_input.selected, schedule_b, and stash `supersedes` into `schedule_b`/a note). Only affects a build opened via a variation; the normal "New agreement" path is unchanged.

- [ ] **Step 3: Nav + route.** `config/consoles.js`: add `{ to: '/residential/contracts', label: 'Contracts', icon: FileText }` under **Assurance**. `App.jsx`: import `SalesContracts`; `<Route path="/residential/contracts" element={<SalesContracts />} />`.

- [ ] **Step 4: Build + browser.** `npm run build` clean. Open `/residential/contracts` → buckets render with the RPPS/RPSS agreements; Remind toasts; Void moves a row to declined/voided; Vary opens the correct wizard pre-filled (services ticked); kind filter + search work. Screenshot.

- [ ] **Step 5: Commit** — `feat(sales-contracts): Contracts hub screen + variation prefill + nav`

---

### Task 3: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → businessDays + 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Full flow (browser):** confirm each bucket action end-to-end (remind, void, copy link, open completed, vary→prefilled wizard→send creates a new agreement and the old shows voided).
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (Contracts hub: buckets, remind/void/expiry, variation; Phase-4 sub-project B); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-contracts): work-log + rebuild dist; Phase-4 sub-project B done`

---

## Self-Review

**Spec coverage:** §3 buckets + variation → Task 1; §4 hub + wizard prefill → Task 2; §5 testing → Tasks 1–3. Deferred (draft stage, supersedes column, billing, other types) absent — correct.

**Placeholder scan:** the `contracts` + `createVariation` handlers are full real code with concrete bucket rules; the hub screen task specifies exact endpoints, actions per bucket, and the variation→navigate flow. No "TBD"/"add error handling".

**Type consistency:** item shape (`id, envelope_code, kind, party_name, status, expires_at, days_to_expiry, …`) produced by `contracts` (Task 1) and consumed by the hub (Task 2). `createVariation` returns `{kind, prefill:{services, pricing_input.selected, schedule_b, supersedes}}` — consumed by `navigate(..., {state:{prefill}})` and read by `SalesAgreementScreen` (Task 2 Step 2) whose builder state keys (services, pricing_input.selected, schedule_b) match. `SALE_RELATED`/`kindOf` consistent across both handlers. Action endpoints match the verified signing routes.

**Route-order pitfall:** Task 1 Step 4 puts `/contracts` before `/:kind` explicitly (spec risk #1).
