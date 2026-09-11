# Contacts Relationships / Duplicates / Authorisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Contacts with a sales-engagement relationships view (grouped by property), duplicate detection (detect + warn), and an authorised-representatives record — on the existing ContactDetail screen.

**Architecture:** Two new read endpoints on `contact.controller` (`relationships`, `duplicates`) using raw queries + a property id-map; one additive `authorisations` JSON column saved via the existing `update`; a new Relationships tab on `ContactDetail.jsx`. No change to how sales records are created.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = migrate + live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-contacts-relationships-design.md`

## Global Constraints

- **Additive/read-mostly:** two read endpoints + one nullable JSON column; no change to existing contact getOne/update behaviour beyond the new whitelisted field.
- **Branch-scoped** on every query; duplicates exclude self and are advisory (no merge, no auto-block).
- **Aggregation only on the tab** (`GET …/relationships`), never folded into `getOne`.
- **id-map resolution** for property display (no fragile on-the-fly include aliases).
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (7+5+27) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/migrations/0111-contact-authorisations.js` — **create**: +column.
- `backend/models/Contact.js` — **modify**: +`authorisations`.
- `backend/controllers/contact.controller.js` — **modify**: `relationships`, `duplicates`, `CONTACT_FIELDS += 'authorisations'`.
- `backend/routes/contact.routes.js` — **modify**: 2 routes.
- `admin-portal/src/screens/ContactDetail.jsx` — **modify**: Relationships tab.

**Schema:** migration 0111 (one JSON column).

---

### Task 1: Migration + model + whitelist (authorisation store)

**Files:** Create `backend/migrations/0111-contact-authorisations.js`; modify `backend/models/Contact.js`, `backend/controllers/contact.controller.js` (whitelist).

- [ ] **Step 1: Migration** (guarded, idiom from 0108/0110):
```js
'use strict';
module.exports = {
  up: async (q, S) => {
    const t = await q.describeTable('contacts');
    if (!t.authorisations) await q.addColumn('contacts', 'authorisations', { type: S.JSON, allowNull: true, defaultValue: [] });
  },
  down: async (q) => { await q.removeColumn('contacts', 'authorisations').catch(() => {}); },
};
```

- [ ] **Step 2: Model.** Add `authorisations: { type: DataTypes.JSON, defaultValue: [] },` to `Contact` (near `tags`).

- [ ] **Step 3: Whitelist.** Add `'authorisations'` to `CONTACT_FIELDS` in `contact.controller.js` so `PUT /api/contacts/:id` persists it.

- [ ] **Step 4: Migrate + verify.** `cd backend && npx sequelize-cli db:migrate` → 0111 up. `node -e "const s=require('./config/db.config');s.query('DESCRIBE contacts',{type:s.QueryTypes.SELECT}).then(r=>{console.log(r.some(x=>x.Field==='authorisations'));process.exit(0)})"` → `true`.

- [ ] **Step 5: Commit** — `feat(contacts): migration 0111 + authorisations field`

---

### Task 2: Relationships + duplicates endpoints

**Files:** Modify `backend/controllers/contact.controller.js`, `backend/routes/contact.routes.js`.

**Interfaces:** `GET /api/contacts/:id/relationships` → `{ by_property, mandates, agreements }`; `GET /api/contacts/:id/duplicates` → `{ data:[{id,contact_code,full_name,matched_on}] }`.

- [ ] **Step 1: Requires.** At the top of `contact.controller.js`, add the sales models (require lazily inside the handler to avoid load-order issues):
```js
// inside relationships handler:
const { PropertyDeal } = { PropertyDeal: require('../models/PropertyDeal') };
const { SaleOfferParty, SaleTransactionParty, SaleOffer, SaleTransaction } = require('../models/SalesModels');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const BuyerMandate = require('../models/BuyerMandate');
const NonCircumventionRecord = require('../models/NonCircumventionRecord');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SigningEnvelope = require('../models/SigningEnvelope');
const Property = require('../models/Property');
```
(Place these requires at the top of the file with the others if they don't create a circular-require problem — verify in Step 3; otherwise keep them inside the handler.)

- [ ] **Step 2: `relationships` handler.**
```js
exports.relationships = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const cid = contact.id; const scope = branchScope(req);
  const { SaleOfferParty, SaleTransactionParty, SaleOffer, SaleTransaction } = require('../models/SalesModels');
  const PropertyDeal = require('../models/PropertyDeal');
  const PartyRoleProfile = require('../models/PartyRoleProfile');
  const BuyerMandate = require('../models/BuyerMandate');
  const NonCircumventionRecord = require('../models/NonCircumventionRecord');
  const EnvelopeSigner = require('../models/EnvelopeSigner');
  const SigningEnvelope = require('../models/SigningEnvelope');
  const Property = require('../models/Property');

  const [deals, offerParties, txParties, roles, mandates, intros, signerRows] = await Promise.all([
    PropertyDeal.findAll({ where: { ...scope, [Op.or]: [{ seller_contact_id: cid }, { owner_contact_id: cid }] }, raw: true }),
    SaleOfferParty.findAll({ where: { contact_id: cid }, raw: true }),
    SaleTransactionParty.findAll({ where: { contact_id: cid }, raw: true }),
    PartyRoleProfile.findAll({ where: { contact_id: cid, ...scope }, raw: true }).catch(() => []),
    BuyerMandate.findAll({ where: { buyer_contact_id: cid, ...scope }, raw: true }).catch(() => []),
    NonCircumventionRecord.findAll({ where: { ...scope, context: 'sale', [Op.or]: [{ owner_contact_id: cid }, { tenant_contact_id: cid }] }, raw: true }).catch(() => []),
    EnvelopeSigner.findAll({ where: { contact_id: cid }, raw: true }),
  ]);

  // resolve parent offers/transactions/envelopes
  const offers = offerParties.length ? await SaleOffer.findAll({ where: { id: [...new Set(offerParties.map((p) => p.offer_id))] }, raw: true }) : [];
  const offerById = new Map(offers.map((o) => [o.id, o]));
  const txs = txParties.length ? await SaleTransaction.findAll({ where: { id: [...new Set(txParties.map((p) => p.transaction_id))] }, raw: true }) : [];
  const txById = new Map(txs.map((t) => [t.id, t]));
  const envIds = [...new Set(signerRows.map((s) => s.envelope_id))];
  const envs = envIds.length ? await SigningEnvelope.findAll({ where: { id: envIds }, attributes: ['id', 'envelope_code', 'title', 'status', 'related_type', 'related_id'], raw: true }) : [];

  // build per-property grouping
  const groups = new Map(); // property_id -> {deals,offers,transactions,roles,introductions}
  const g = (pid) => { if (!groups.has(pid)) groups.set(pid, { deals: [], offers: [], transactions: [], roles: [], introductions: [] }); return groups.get(pid); };
  for (const d of deals) g(d.property_id).deals.push({ deal_code: d.deal_code, status: d.status, role: d.seller_contact_id === cid ? 'seller' : 'owner' });
  for (const p of offerParties) { const o = offerById.get(p.offer_id); if (o) g(o.property_id).offers.push({ offer_code: o.offer_code, amount: o.amount, status: o.status }); }
  for (const p of txParties) { const t = txById.get(p.transaction_id); if (t) g(t.property_id).transactions.push({ party_type: p.party_type, status: p.status }); }
  for (const r of roles) if (r.property_id) g(r.property_id).roles.push({ profile_code: r.profile_code, role_type: r.role_type, status: r.status });
  for (const n of intros) if (n.property_id) g(n.property_id).introductions.push({ record_code: n.record_code, status: n.status, side: n.owner_contact_id === cid ? 'seller' : 'buyer' });

  const pids = [...groups.keys()].filter(Boolean);
  const props = pids.length ? await Property.findAll({ where: { id: pids }, attributes: ['id', 'property_code', 'title'], raw: true }) : [];
  const propById = new Map(props.map((p) => [Number(p.id), p]));
  const by_property = [...groups.entries()].map(([pid, v]) => ({ property: propById.get(Number(pid)) || { id: pid }, ...v }));

  const agreements = envs.map((e) => ({ envelope_code: e.envelope_code, title: e.title, status: e.status, related_type: e.related_type, property_id: e.related_id }));
  res.json({ by_property, mandates: mandates.map((m) => ({ mandate_code: m.mandate_code, status: m.status })), agreements });
});
```

- [ ] **Step 3: `duplicates` handler.**
```js
exports.duplicates = asyncHandler(async (req, res) => {
  const contact = await Contact.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!contact) return res.status(404).json({ error: 'Contact not found.' });
  const ids = { primary_phone: contact.primary_phone, email: contact.email, national_id: contact.national_id, passport_no: contact.passport_no };
  const or = Object.entries(ids).filter(([, v]) => v && String(v).trim()).map(([k, v]) => ({ [k]: v }));
  if (!or.length) return res.json({ data: [] });
  const rows = await Contact.findAll({ where: { ...branchScope(req), status: 'active', id: { [Op.ne]: contact.id }, [Op.or]: or }, attributes: ['id', 'contact_code', 'full_name', 'primary_phone', 'email', 'national_id', 'passport_no'], raw: true });
  const data = rows.map((r) => ({ id: r.id, contact_code: r.contact_code, full_name: r.full_name, matched_on: Object.keys(ids).filter((k) => ids[k] && r[k] === ids[k]) }));
  res.json({ data });
});
```

- [ ] **Step 4: Routes.** In `contact.routes.js` (before `/:id`-only conflicts — these are `/:id/...` so order is fine): `router.get('/:id/relationships', ctrl.relationships);` and `router.get('/:id/duplicates', ctrl.duplicates);`.

- [ ] **Step 5: Load-check + verify (live).** Restart `:50001`. Pick a contact that is a seller on a deal / buyer on an offer / an introduced party (e.g. the introductions contacts from sub-project A, or offer buyers). `GET /api/contacts/:id/relationships` → `by_property` with the right codes/roles; `agreements` lists any signed envelopes for the contact; a fresh contact → all empty. `GET /api/contacts/:id/duplicates` → for two contacts sharing a phone, each lists the other with `matched_on:['primary_phone']`; self never appears. Paste one non-empty relationships + one duplicates result.

- [ ] **Step 6: Commit** — `feat(contacts): relationships + duplicates endpoints`

---

### Task 3: ContactDetail Relationships tab

**Files:** Modify `admin-portal/src/screens/ContactDetail.jsx`.

- [ ] **Step 1: Tab + state.** Add a `relationships` tab button (after `overview`). State `rel`, `dupes`. On selecting the tab (or on load), `GET /contacts/:id/relationships` → `rel`, `GET /contacts/:id/duplicates` → `dupes`.

- [ ] **Step 2: Render.** In the `relationships` tab body:
  - **Engagements by property:** for each `rel.by_property` entry, a card: property code/title (a link/button to the sale property file via the residential path) + compact lists of its `deals` (code · role · status), `offers` (code · amount · status), `transactions` (party_type · status), `roles` (role_type · status), `introductions` (code · side · status). Skip empty sub-lists. Empty state when `by_property`, `mandates`, and `agreements` are all empty.
  - **Buyer mandates:** list `rel.mandates` (code · status).
  - **Agreements:** list `rel.agreements` (envelope_code · title · status), linking to the Contracts hub / signing view where useful.
  - **Possible duplicates:** when `dupes.length`, a warning-styled panel listing each (full_name · code · matched_on chips) linking to that contact (`/contacts/:id`). Hidden when none.
  - **Authorised representatives:** an editable list bound to `contact.authorisations` (name, relationship, phone, email, note) with add/remove; Save calls `PUT /contacts/:id { authorisations }` and reloads. Reuse the screen's existing edit/save affordances + card styling.

- [ ] **Step 3: Build + browser.** `cd admin-portal && npm run build` → `✓ built`. Open a contact with a sales footprint → Relationships tab shows engagements grouped by property; a contact sharing a phone shows the duplicates panel; add/remove an authorised rep saves and persists on reload. Screenshot.

- [ ] **Step 4: Commit** — `feat(contacts): ContactDetail Relationships tab (engagements, duplicates, authorisations)`

---

### Task 4: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 7+5+27; `npm run test:full` → 28/0.
- [ ] **Step 2: Full flow (browser):** relationships grouped by property render with working property links; duplicates panel appears only when matches exist and never lists self; authorised reps persist across reload.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (contacts relationships + duplicates + authorisations; Phase-4 sub-project D — **Phase 4 complete**); `git add admin-portal/dist AGENT_WORK_LOG.md`.
- [ ] **Step 4: Commit** — `chore(contacts): work-log + rebuild dist; Phase-4 sub-project D done`

---

## Self-Review

**Spec coverage:** §3 relationships → Task 2; §4 duplicates + authorisation column → Tasks 1+2; §5 Relationships tab → Task 3; §6 testing → Tasks 2–4. Deferred (merge, preferences, cross-branch) absent — correct.

**Placeholder scan:** the migration, both handlers (full real code with the exact per-model queries + id-map grouping), and the duplicates matcher are concrete; the UI task specifies each panel + the exact endpoints and the PUT for authorisations. No "TBD"/"add error handling".

**Type consistency:** `relationships → { by_property:[{property,deals,offers,transactions,roles,introductions}], mandates, agreements }` produced Task 2, consumed by the tab Task 3. `duplicates → { data:[{id,contact_code,full_name,matched_on}] }` produced Task 2, consumed Task 3. `authorisations` (JSON list) — column (Task 1), whitelist (Task 1), edited via PUT and read from `contact` (Task 3). Query keys match the verified model fields (seller_contact_id/owner_contact_id, SaleOfferParty.offer_id→SaleOffer.property_id, SaleTransactionParty.transaction_id→SaleTransaction.property_id, NonCircumventionRecord owner/tenant_contact_id + context 'sale').

**Open item (resolved in execution):** Task 2 Step 1 flags the sales-model require placement (top-level vs in-handler) to be confirmed against circular-require at load-check (Step 5); in-handler requires are the safe default.
