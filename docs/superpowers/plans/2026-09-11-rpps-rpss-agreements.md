# RPPS + RPSS Sales Service-Agreement Builders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two residential sales service-agreement builders — RPPS (Purchase, signed with Buyer) and RPSS (Sale, signed with Seller) — mirroring the proven RPRM/RPTM recipe: seed each Schedule C catalogue, render a full 25-clause + Schedules A–D HTML agreement, create a signing envelope with the correct signer, and drive it from a wizard screen.

**Architecture:** Reuse `ServiceItem`/`care_services` (catalogues, scoped by vertical), the `SigningEnvelope`/`EnvelopeSigner`/`SignatureField` eSign flow, and the RPRM service/controller/screen shapes. One controller with a `KIND` map serves both kinds at `/api/sales-agreements`. No schema change.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = seed run + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-rpps-rpss-agreements-design.md`
**Sources (verbatim clauses):** `docs/superpowers/Residential Property Purchase Service Agreement - V0.2.txt` and `…Sale Service Agreement - V0.2.txt` (committed with the spec).

## Global Constraints

- **Mirror the recipe** in `services/rprmAgreement.service.js`, `controllers/rprm.controller.js`, `routes/rprm.routes.js`, `scripts/seedRprmCatalog.js`, `screens/RprmAgreements.jsx` — copy shapes, adapt content. Do not modify any RPRM/RPTM file.
- **Scope catalogues by vertical** (`sale_purchase` / `sale_sale`) on every query so `care_services` rows never mix with PM/Care/WT.
- **Immutable snapshots:** render `document_html` at create time; catalogue edits never alter issued agreements.
- **Clauses verbatim** from the V0.2 source txt — transcribe, don't paraphrase. The 25 clause titles are enumerated in the spec §… and the source txt.
- **Mount in BOTH** `server.js` (explicit) and `routes/manifest.js`.
- **Additive only** — no migration, no schema change. Backend `npm test` (27/0 + businessDays) + `npm run test:full` (28/0) stay green; RPRM/TM untouched.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## File Structure

- `backend/scripts/seedSalesAgreementCatalogs.js` — **create**: seed both catalogues.
- `backend/services/salesAgreementRender.js` — **create**: shared catalog getter, computePricing, Schedule C table, cost summary, payment schedule, TOC.
- `backend/services/rppsAgreement.service.js` — **create**: RPPS 25 clauses + build.
- `backend/services/rpssAgreement.service.js` — **create**: RPSS 25 clauses + build.
- `backend/controllers/salesAgreement.controller.js` — **create**: KIND map, makeHandlers.
- `backend/routes/salesAgreement.routes.js` — **create**.
- `backend/server.js` + `backend/routes/manifest.js` — **modify**: mount `/api/sales-agreements`.
- `admin-portal/src/screens/sales/PurchaseAgreements.jsx` + `SaleAgreements.jsx` — **create**.
- `admin-portal/src/config/consoles.js` — **modify**: two nav items.
- `admin-portal/src/App.jsx` — **modify**: two routes.

**Schema:** none.

---

### Task 1: Seed both Schedule C catalogues

**Files:** Create `backend/scripts/seedSalesAgreementCatalogs.js`.

- [ ] **Step 1: Seeder** (mirror `seedRprmCatalog.js`: `findOrCreate` a `ServiceCategory` per vertical, then `ServiceItem` rows by `code`, idempotent). Two ITEM tables with the exact spec §5 data. Row tuple `[code, name, unit, base_price, fee_model, price_type, price_label, extra]`:
```js
const RPPS_ITEMS = [
  ['RPPS-001','Initial Property Consultation','Session',2000,'fixed','fixed',null,{}],
  ['RPPS-002','Property Requirement Assessment','Project',3000,'fixed','fixed',null,{}],
  ['RPPS-003','Property Search & Shortlisting','Project',8000,'quote','from','From 8,000',{}],
  ['RPPS-004','Market Research & Property Comparison','Project',5000,'quote','from','From 5,000',{}],
  ['RPPS-005','Property Inspection Coordination','Inspection',2000,'quote','from','From 2,000',{}],
  ['RPPS-006','Seller Communication & Negotiation','Transaction',5000,'quote','from','From 5,000',{}],
  ['RPPS-007','Offer Preparation & Submission','Transaction',3000,'quote','from','From 3,000',{}],
  ['RPPS-008','Documentation Coordination','Transaction',5000,'quote','from','From 5,000',{}],
  ['RPPS-009','Settlement Coordination','Transaction',8000,'quote','from','From 8,000',{}],
  ['RPPS-010','Loan Assistance Coordination','Project',5000,'quote','from','From 5,000',{}],
  ['RPPS-011','Property Valuation / Survey Coordination','Project',3000,'quote','from','From 3,000',{}],
  ['RPPS-012','Relocation & Utility Coordination','Project',3000,'quote','from','From 3,000',{}],
  ['RPPS-013','Professional Success Fee (Optional)','Purchase',0,'quote','percent','% of Purchase Price or As Agreed',{ percent: null }],
];
const RPSS_ITEMS = [
  ['RPSS-001','Initial Property Consultation','Session',2000,'fixed','fixed',null,{}],
  ['RPSS-002','Property Assessment','Property',3000,'fixed','fixed',null,{}],
  ['RPSS-003','Market Appraisal','Property',5000,'fixed','fixed',null,{}],
  ['RPSS-004','Property Photography','Property',5000,'quote','from','From 5,000',{}],
  ['RPSS-005','Drone Photography & Videography','Property',8000,'quote','from','From 8,000',{}],
  ['RPSS-006','Property Listing & Marketing','Property',10000,'quote','from','From 10,000',{}],
  ['RPSS-007','Buyer Inspection Coordination','Inspection',1500,'quote','from','From 1,500',{}],
  ['RPSS-008','Open House Coordination','Event',3000,'quote','from','From 3,000',{}],
  ['RPSS-009','Negotiation & Offer Coordination','Transaction',0,'fixed','included','Included',{}],
  ['RPSS-010','Documentation Coordination','Transaction',5000,'quote','from','From 5,000',{}],
  ['RPSS-011','Settlement Coordination','Transaction',8000,'quote','from','From 8,000',{}],
  ['RPSS-012','Property Preparation / Styling Coordination','Project',5000,'quote','from','From 5,000',{}],
  ['RPSS-013','Professional Sales Commission','Sale',0,'quote','percent','% of Final Sale Price',{ percent: null }],
];
```
Seed RPPS under category `SVC-CAT-RPPS` / `vertical 'sale_purchase'` / `service_group 'rpps'` / `applicable_to ['sales']`, and RPSS under `SVC-CAT-RPSS` / `vertical 'sale_sale'` / `service_group 'rpss'`. Each item's `tags = { price_type, price_label?, schedule:'C', ...extra }`. Copy the findOrCreate + re-run update logic from `seedRprmCatalog.js` verbatim.

- [ ] **Step 2: Run + verify.** `cd backend && node scripts/seedSalesAgreementCatalogs.js`. Node check:
```
node -e "const S=require('./models/ServiceItem');(async()=>{for(const v of ['sale_purchase','sale_sale']){const n=await S.count({where:{vertical:v}});console.log(v,n)}process.exit(0)})()"
```
Expect `sale_purchase 13` and `sale_sale 13`. Re-run once → still 13/13 (idempotent).

- [ ] **Step 3: Commit** — `feat(sales-agreements): seed RPPS + RPSS Schedule C catalogues`

---

### Task 2: Agreement render services (shared + RPPS + RPSS)

**Files:** Create `backend/services/salesAgreementRender.js`, `backend/services/rppsAgreement.service.js`, `backend/services/rpssAgreement.service.js`.

**Interfaces (both services):** `getCatalog(branchId) → [{code,name,unit,base_price,price_type,price_label,std_label}]`; `computePricing(input, branchId) → {lines, summary, payment_schedule}`; `buildRppsAgreement(data) → {title, doc_no, html, terms}` (and `buildRpssAgreement`). `data` = `{ client:{full_name,email,phone,nid,...}, property:{...}, pricing, services, checklist, ... }`.

- [ ] **Step 1: Shared render helpers** (`salesAgreementRender.js`) — copy the catalog getter + `computePricing` (std/agreed price, discount, VAT, cost-summary buckets, auto payment schedule) + `scheduleC(pricing)` (dual-price table of selected lines) + a TOC helper from `rprmAgreement.service.js`, generalized to take a `vertical` param. Percent/included lines contribute 0 to totals but render their `price_label`. Export `getCatalog(vertical, branchId)`, `computePricing(vertical, input, branchId)`, `scheduleC`, `costSummary`, `paymentSchedule`, `toc`.

- [ ] **Step 2: RPPS service** (`rppsAgreement.service.js`) — `getCatalog`/`computePricing` delegate to shared with `vertical='sale_purchase'`. `buildRppsAgreement(data)` returns `{ title: 'Residential Property Purchase Service Agreement', doc_no: 'SSPC-RPPS-01', html, terms }`. `html` = header (doc_no, Version 0.2, Effective Date, Division) + visible TOC + the **25 clauses transcribed verbatim** from `docs/superpowers/Residential Property Purchase Service Agreement - V0.2.txt` (clauses 1 PURPOSE … 25 EXECUTION, including 12 VARIATIONS and 22 NON-CIRCUMVENTION) + Schedule A (services summary) + Schedule B (property/engagement details) + Schedule C (`scheduleC(pricing)` selected priced lines + cost summary + payment schedule) + Schedule D. Mirror `buildResidentialPMAgreement`'s HTML structure/styles.

- [ ] **Step 3: RPSS service** (`rpssAgreement.service.js`) — same, `vertical='sale_sale'`, `title: 'Residential Property Sale Service Agreement'`, `doc_no:'SSPC-RPSS-01'`, 25 clauses transcribed from the Sale V0.2 txt (includes 4A SELLER INDEMNITY & AGREED MINIMUM SALE VALUE and the sales-commission structure). Seller-oriented party wording.

- [ ] **Step 4: Verify (node).**
```
node -e "const p=require('./services/rppsAgreement.service');const s=require('./services/rpssAgreement.service');const dp={client:{full_name:'Test Buyer',email:'t@x.com'},pricing:{lines:[],summary:{},payment_schedule:[]}};const a=p.buildRppsAgreement(dp),b=s.buildRpssAgreement(dp);console.log('RPPS',a.doc_no,/NON-CIRCUMVENTION/.test(a.html),/EXECUTION/.test(a.html));console.log('RPSS',b.doc_no,/SELLER INDEMNITY/i.test(b.html))"
```
Expect `RPPS SSPC-RPPS-01 true true` and `RPSS SSPC-RPSS-01 true`.

- [ ] **Step 5: Commit** — `feat(sales-agreements): RPPS + RPSS render services (25 clauses, schedules, pricing)`

---

### Task 3: Controller + routes (two kinds) + mounts

**Files:** Create `backend/controllers/salesAgreement.controller.js`, `backend/routes/salesAgreement.routes.js`; modify `backend/server.js`, `backend/routes/manifest.js`.

**Interfaces:** `GET /:kind/catalog`, `GET /:kind/meta`, `POST /:kind/preview`, `GET /:kind/agreements`, `POST /:kind/agreements`, `kind ∈ purchase|sale`.

- [ ] **Step 1: Controller** (adapt `rprm.controller.js`; one `KIND` map, `makeHandlers` reads `req.params.kind`):
```js
const crypto = require('crypto');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const rpps = require('../services/rppsAgreement.service');
const rpss = require('../services/rpssAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const sequelize = require('../config/db.config');

const KIND = {
  purchase: { svc: rpps, build: 'buildRppsAgreement', related_type: 'sale_purchase_agreement', signer: 'buyer',  party: 'Buyer',  code: 'RPPS' },
  sale:     { svc: rpss, build: 'buildRpssAgreement', related_type: 'sale_sale_agreement',     signer: 'seller', party: 'Seller', code: 'RPSS' },
};
const K = (req) => KIND[req.params.kind] || null;

exports.getCatalog = asyncHandler(async (req, res) => { const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown kind' }); res.json(await k.svc.getCatalog(branchScope(req).branch_id)); });
exports.getMeta = asyncHandler(async (req, res) => { const k = K(req); res.json({ party: k.party, code: k.code }); });
exports.preview = asyncHandler(async (req, res) => {
  const k = K(req); const branchId = resolveBranchId(req); const body = req.body || {};
  const pricing = await k.svc.computePricing(body.pricing_input || {}, branchId);
  res.json(k.svc[k.build]({ ...body, pricing }));
});
exports.listAgreements = asyncHandler(async (req, res) => {
  const k = K(req);
  const rows = await SigningEnvelope.findAll({ where: { ...branchScope(req), related_type: k.related_type }, include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id','name','email','role','status','signed_at'] }], order: [['created_at','DESC']] });
  res.json(rows);
});
exports.createAgreement = asyncHandler(async (req, res) => {
  const k = K(req); const branchId = resolveBranchId(req); const body = req.body || {};
  const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: `${k.party} full name is required.` });
  if (!client.email) return res.status(400).json({ error: `${k.party} email is required to send for signature.` });
  const pricing = await k.svc.computePricing(body.pricing_input || {}, branchId);
  const built = k.svc[k.build]({ ...body, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);
  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId, envelope_code: `ENV-${k.code}-${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`, document_html: built.html,
      related_type: k.related_type, related_id: body.property_id || null,
      status: 'sent', sent_at: new Date(), expires_at: expires, signing_order_enforced: false,
      kyc_role: k.signer, terms: built.terms, created_by: req.user?.id || null,
    }, { transaction: t });
    const token = crypto.randomBytes(24).toString('hex');
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, signer_order: 1, role: k.signer,
      name: client.full_name, email: client.email, phone: client.phone || null,
      contact_id: body.client_contact_id || null, access_token: token, token_expires_at: expires, status: 'sent',
    }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: `${k.party} signature` }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: 'Date' }, { transaction: t });
    return { env, token };
  });
  res.status(201).json({ id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status, signing_token: out.token, signing_path: `/admin/sign/${out.token}` });
});
```

- [ ] **Step 2: Routes.** `salesAgreement.routes.js`: authMiddleware; `router.get('/:kind/catalog', ctrl.getCatalog)`, `/:kind/meta`, `router.post('/:kind/preview', ctrl.preview)`, `router.get('/:kind/agreements', ctrl.listAgreements)`, `router.post('/:kind/agreements', ctrl.createAgreement)`.

- [ ] **Step 3: Mount (BOTH).** server.js: `mount('/api/sales-agreements', './routes/salesAgreement.routes');` near the other agreement mounts (rprm/rptm/sts). manifest.js: `['/api/sales-agreements', './salesAgreement.routes'],`. Load-check + restart.

- [ ] **Step 4: Verify (live).** `GET /api/sales-agreements/purchase/catalog` → 13 rows; `POST …/purchase/preview {client:{full_name:'B',email:'b@x'},pricing_input:{selected:[{code:'RPPS-001'}]}}` → HTML with clause headings; `POST …/purchase/agreements {client:{full_name:'B',email:'b@x'},property_id:<sale id>}` → `{signing_path}` + a `sale_purchase_agreement` envelope whose signer role is `buyer`; repeat `sale` → signer `seller`. `GET …/agreements` lists. Paste envelope_code + signer role for each kind.

- [ ] **Step 5: Commit** — `feat(sales-agreements): /api/sales-agreements endpoints (purchase+sale, correct signers)`

---

### Task 4: Wizard screens + nav + routes

**Files:** Create `admin-portal/src/screens/sales/PurchaseAgreements.jsx`, `SaleAgreements.jsx`; modify `admin-portal/src/config/consoles.js`, `admin-portal/src/App.jsx`.

- [ ] **Step 1: Screens** (copy `RprmAgreements.jsx`, adapt). Each: list mode (`GET /sales-agreements/:kind/agreements`) + 6-step wizard (Parties → Services → Property → Pricing → Checklist → Review & send). Change `apiBase` to `/sales-agreements/purchase` (Purchase) / `/sales-agreements/sale` (Sale); party labels to Buyer/Seller; `client` fields (full_name, email, phone, nid); optional property linkage (a `Combo endpoint="/properties?category=residential"` to set `property_id`). Pricing step consumes the catalog + preview endpoints (already generic). Review step shows `preview.html`; send posts to `…/agreements` and shows the `signing_path`.

- [ ] **Step 2: Nav.** `config/consoles.js`: add `{ to: '/residential/agreements/sale', label: 'Sale Agreements', icon: FileSignature }` under **Selling** and `{ to: '/residential/agreements/purchase', label: 'Purchase Agreements', icon: FileSignature }` under **Buying** (import `FileSignature` from lucide-react in consoles.js if absent).

- [ ] **Step 3: Routes.** `App.jsx`: import both; `<Route path="/residential/agreements/purchase" element={<PurchaseAgreements />} />` and `…/sale element={<SaleAgreements />} />`.

- [ ] **Step 4: Build + browser.** `npm run build` clean. Open each screen → run the wizard → create an agreement → the review shows the rendered doc and the list shows it; open `/admin/sign/:token` → the document renders with a signature box. Screenshot each.

- [ ] **Step 5: Commit** — `feat(sales-agreements): Purchase + Sale agreement wizard screens + nav`

---

### Task 5: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → businessDays + 27/0; `npm run test:full` → 28/0.
- [ ] **Step 2: Full flow (browser):** create one Purchase and one Sale agreement end-to-end; verify the buyer/seller signer, the rendered clauses + selected Schedule C lines + cost summary, and that the signing link renders.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (RPPS+RPSS builders + catalogues, mirror recipe, correct signers; Phase-4 sub-project A); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(sales-agreements): work-log + rebuild dist; Phase-4 sub-project A done`

---

## Self-Review

**Spec coverage:** §2 catalogue seed → Task 1; §2/§3 services + KIND → Tasks 2–3; §4 signer model → Task 3 createAgreement; §5 catalogues → Task 1 (exact rows); §6 pricing → Task 2; frontend → Task 4; §7 testing → Tasks 1–5. Deferred (hub/billing/contacts/non-residential) absent — correct.

**Placeholder scan:** seeder ITEMS are exact; the controller is full real code; the services task points to the committed V0.2 txt for verbatim clause transcription (a real source, not a placeholder) with the 25 titles already enumerated in the spec + a build assertion checking specific clause presence. No "TBD"/"add error handling".

**Type consistency:** `buildRppsAgreement`/`buildRpssAgreement(data) → {title,doc_no,html,terms}` produced in Task 2, called via `KIND[kind].build` in Task 3. `getCatalog`/`computePricing` signatures match across shared helper (vertical-param) and the two services (vertical-bound) and the controller calls. `KIND` keys `purchase|sale` match the route `:kind`, the nav paths, and the screen `apiBase`. `related_type` `sale_purchase_agreement`/`sale_sale_agreement` and signer roles `buyer`/`seller` consistent between createAgreement and listAgreements. Catalogue verticals `sale_purchase`/`sale_sale` match seeder, services, and spec.

**Recipe fidelity:** RPRM/RPTM files are copied-from, never modified; catalogues scoped by vertical; envelope html stored at create (immutable); mounted in server.js + manifest.js.
