# Sales Service Coordination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface a sale property's service work on the deal — its work orders (provider, status, evidence, amount), a financial-commitments summary, and a raise-a-work-order action — reusing the existing WorkOrder engine.

**Architecture:** A dedicated `salesServices.controller` (mirrors `salesSop.controller`) exposing `GET /api/sales/properties/:propertyId/services` (aggregation), wired into `sales.routes` beside the SOP routes; a Services section on the property file that reads it and raises work orders via the existing `POST /api/work-orders`. No new mount, no schema, no engine change.

**Tech Stack:** Node/Express/Sequelize (`:50001`), React 18 + Vite. Verification = live curls + `npm run build` + browser + harnesses.

**Spec:** `docs/superpowers/specs/2026-09-11-sales-service-coordination-design.md`

## Global Constraints

- **Reuse, not reinvent:** WorkOrder list/create used as-is; this is aggregation + a prefilled create passthrough. No change to the WorkOrder engine, Services console, settlement, or invoicing.
- **Route beside SOP:** add `GET /properties/:propertyId/services` to `sales.routes.js` next to `/properties/:propertyId/sop` (same `/api/sales` router — proven, no prefix issue). No new top-level mount, no manifest change beyond that router.
- **Read-only aggregation**, branch-scoped; provider names via one id-map.
- **General WorkOrder only** (property_id-keyed); WT/Care work orders excluded.
- Branch `air-conditioning/phase-0-duplicate`. Commit after each task. Footer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Backend `npm test` (7+5+27) + `npm run test:full` (28/0) green; build clean.

## File Structure

- `backend/controllers/salesServices.controller.js` — **create**: `propertyServices`.
- `backend/routes/sales.routes.js` — **modify**: 1 route (require the new controller).
- `admin-portal/src/screens/sales/SalesPropertyFile.jsx` — **modify**: Services section + add drawer.

**Schema:** none.

---

### Task 1: Aggregation endpoint

**Files:** Create `backend/controllers/salesServices.controller.js`; modify `backend/routes/sales.routes.js`.

**Interfaces:** `GET /api/sales/properties/:propertyId/services` → `{ work_orders, commitments }`.

- [ ] **Step 1: Controller.**
```js
// backend/controllers/salesServices.controller.js
const WorkOrder = require('../models/WorkOrder');
const ServiceProvider = require('../models/ServiceProvider');
const PropertyInvoice = require('../models/PropertyInvoice');
const Property = require('../models/Property');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');

const arr = (v) => { if (Array.isArray(v)) return v; try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

exports.propertyServices = asyncHandler(async (req, res) => {
  const property = await Property.findOne({ where: { id: req.params.propertyId, ...branchScope(req) } });
  if (!property) return res.status(404).json({ error: 'Property not found.' });
  const pid = property.id; const scope = branchScope(req);

  const [wos, invoices] = await Promise.all([
    WorkOrder.findAll({ where: { property_id: pid, ...scope }, order: [['created_at', 'DESC']], raw: true }),
    PropertyInvoice.findAll({ where: { property_id: pid, ...scope }, order: [['created_at', 'DESC']], raw: true }),
  ]);

  const provIds = [...new Set(wos.map((w) => w.provider_id).filter(Boolean))];
  const provs = provIds.length ? await ServiceProvider.findAll({ where: { id: provIds }, attributes: ['id', 'company_name'], raw: true }) : [];
  const provName = new Map(provs.map((p) => [p.id, p.company_name]));

  const work_orders = wos.map((w) => ({
    id: w.id, work_order_code: w.work_order_code, title: w.title,
    provider_id: w.provider_id || null, provider_name: w.provider_id ? (provName.get(w.provider_id) || null) : null,
    status: w.status, scheduled_date: w.scheduled_date, completed_date: w.completed_date,
    amount: num(w.amount), before_count: arr(w.before_photos).length, after_count: arr(w.after_photos).length,
  }));

  const invoiced = invoices.reduce((s, i) => s + num(i.total), 0);
  const paid = invoices.reduce((s, i) => s + num(i.amount_paid), 0);
  const work_order_committed = wos.filter((w) => w.status !== 'cancelled').reduce((s, w) => s + num(w.amount), 0);
  const commitments = {
    invoices: invoices.map((i) => ({ invoice_code: i.invoice_code, title: i.title, status: i.status, total: num(i.total), agreement_envelope_id: i.agreement_envelope_id || null })),
    totals: { invoiced: Math.round(invoiced), paid: Math.round(paid), outstanding: Math.round(invoiced - paid), work_order_committed: Math.round(work_order_committed) },
  };
  res.json({ work_orders, commitments });
});
```

- [ ] **Step 2: Route.** In `sales.routes.js`, require the controller (`const svcCtrl = require('../controllers/salesServices.controller');`) and add beside the SOP routes:
```js
router.get('/properties/:propertyId/services', roleMiddleware(READ), svcCtrl.propertyServices);
```

- [ ] **Step 3: Load-check + verify (live).** `node -e "require('./controllers/salesServices.controller');require('./routes/sales.routes');console.log('load OK')"`, restart `:50001`. On a sale property (e.g. 62, which has fee invoices from Phase-4 C), `GET /api/sales/properties/62/services` → `commitments.totals` (invoiced/paid/outstanding) reflecting its invoices; `work_orders` = [] if none. Then `POST /api/work-orders {property_id:62,title:'Prep clean',amount:5000,status:'issued'}` and re-GET → the work order appears with amount 5000, provider null, before/after counts 0, and `work_order_committed` 5000. Paste totals + the work-order row.

- [ ] **Step 4: Commit** — `feat(sales-services): property services aggregation endpoint`

---

### Task 2: Property-file Services section

**Files:** Modify `admin-portal/src/screens/sales/SalesPropertyFile.jsx`.

- [ ] **Step 1: SECTIONS + state.** Add `{ key: 'services', label: 'Services', icon: Wrench }` (import `Wrench` from lucide-react if absent — else reuse an existing icon like `ClipboardCheck`) after `workflow`. Add state `const [services, setServices] = useState(undefined)`. On entering the section, `GET /sales/properties/:id/services` → `setServices(data)` (the endpoint returns `{work_orders,commitments}` directly, no `.data` wrapper — confirm and unwrap accordingly).

- [ ] **Step 2: Render.** In a `section === 'services'` block:
  - **Commitments strip:** 4 tiles from `services.commitments.totals` — Invoiced, Paid, Outstanding, Work committed (format BDT).
  - **Work orders table:** `services.work_orders` → columns code, title, provider_name (or —), `StatusBadge status`, scheduled_date, completed_date, evidence (`📎 {before_count}/{after_count}`), amount. Empty state "No service work orders for this property." when none. Spinner while `services === undefined`.
  - **Add work order** (when `canPrepare`): a Drawer (title*, scope Textarea, provider `Combo endpoint="/providers"` labelFn company_name, scheduled_date Input(date), amount Input(number)) → `POST /work-orders { property_id: id, status:'issued', ...form }` → toast + refetch. On the endpoint's role error (sales_executive), surface the message via toast.
  Reuse `ui/kit` + `ui/pickers`; confine to the new section.

- [ ] **Step 3: Build.** `cd admin-portal && npm run build` → `✓ built`. Paste tail.

- [ ] **Step 4: Browser.** Open a sale property → Services: commitments strip shows totals; the work order created in Task 1 lists with its amount/status; "Add work order" (as admin) creates one and it appears. Screenshot.

- [ ] **Step 5: Commit** — `feat(sales-services): property-file Services section (work orders + commitments + raise)`

---

### Task 3: End-to-end verification + wrap-up

- [ ] **Step 1: Harnesses.** `cd backend && npm test` → 7+5+27; `npm run test:full` → 28/0.
- [ ] **Step 2: Non-regression:** the WorkOrder engine + Services console are unedited (only a new read controller + one route added); spot-check `GET /api/work-orders?property_id=62` still works and matches what the services aggregation shows.
- [ ] **Step 3: Rebuild dist + work-log.** `admin-portal npm run build`; append an AGENT_WORK_LOG COMPLETED entry (services aggregation + property-file Services section + raise-work-order; Phase-5 sub-project C — **Phase 5 complete**); `git add admin-portal/dist AGENT_WORK_LOG.md`. Clean up the test work order created during verification.
- [ ] **Step 4: Commit** — `chore(sales-services): work-log + rebuild dist; Phase-5 sub-project C done`

---

## Self-Review

**Spec coverage:** §3 aggregation → Task 1; create passthrough → Task 2 (reuses POST /work-orders); §4 Services section → Task 2; §5 testing → Tasks 1–3. Deferred (provider portal, approval/assign here, WT/Care, engine changes) absent — correct.

**Placeholder scan:** the full `propertyServices` controller (real queries + id-map + totals) and the section render are concrete; the one confirm-on-implement note (endpoint returns `{work_orders,commitments}` directly vs `.data`) is explicit in Task 2 Step 1. No "TBD".

**Type consistency:** payload `{ work_orders:[{id,work_order_code,title,provider_name,status,scheduled_date,completed_date,amount,before_count,after_count}], commitments:{invoices[],totals:{invoiced,paid,outstanding,work_order_committed}} }` produced Task 1, consumed by the section Task 2. The create call posts to `POST /work-orders` with `property_id` — the verified existing endpoint + FIELDS whitelist. Route shape `/properties/:propertyId/services` matches the SOP sibling.

**Reuse safety:** WorkOrder/ServiceProvider/PropertyInvoice are read-only here; the create action calls the existing endpoint unchanged; no schema, no mount beyond the one sales-router route.
