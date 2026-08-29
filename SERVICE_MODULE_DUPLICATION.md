# Duplicating a Service Line — Water Tank → Air Conditioning → …

**Goal.** Stand up new service lines (Air Conditioning cleaning, then others) that run the
**exact same workflow** as Water Tank — provider onboarding, service request, site
assessment, quotation, agreement, work order, invoice, disbursement, AMC, reports — while
making sure that **fixing a core workflow once fixes it for every service**.

This document is the contract for how we do that. Read it before creating a new service or
editing a shared workflow.

---

## 0. TL;DR — the rule that makes this safe

> **Core workflow logic is written ONCE and shared. A service line is CONFIG, not a copy.**

Water Tank today is a monolith of ~18 controllers, ~26 services, ~18 routers, ~20
migrations and ~50 screens, all hard-named `wt_*` / `waterTank*` / `screens/watertank`.
If we photocopy that into `ac_*` for every service, then every bug fix (like the ones we
just did — token leak, XSS, work-order data loss, false "Verified", one-witness completion)
has to be hand-applied N times. That is the exact pain to avoid.

So we move to a **config-driven shared core** (Strategy A below). Until a piece is
extracted into the shared core, treat any per-service copy as **temporary debt** and record
it in the "Debt register" at the bottom so it gets unified.

---

## 1. Two strategies (and why we pick the hybrid)

### Strategy A — Shared multi-vertical core  ✅ target
One codebase serves all services. Every shared table gets a `service_line` column
(`water_tank`, `air_conditioning`, …). Controllers/services branch on `service_line`. A new
service is a **service manifest** (labels, code prefixes, catalogue vertical, document
templates, required documents, checklists) plus, at most, a few bespoke screens.

- **Pro:** one place to fix; edits auto-apply to all services; one test surface.
- **Con:** an upfront refactor of Water Tank to read its own identity from config.

### Strategy B — Physical duplication  ❌ avoid as the end state
Copy the module to `ac_*` / `screens/aircon/` with new prefixes.

- **Pro:** fastest to see one new service on screen.
- **Con:** every core edit must be repeated; guaranteed drift; this is the problem statement.

### The hybrid we actually run
1. **Extract the generic engines now** (they are already 90% service-agnostic — see §4).
   These are single-source and shared immediately.
2. **Introduce a service registry** (§3) so labels, prefixes, catalogue vertical, templates
   and required-docs come from config, not literals.
3. **Add `service_line` to the shared tables** (§5) and scope every query by it.
4. New services are then **config + optional bespoke screens** — no core copy.

If, for delivery pressure, a service must be duplicated before the core is extracted, do it
**against the checklist in §7** and log it in the Debt register so it is later folded back.

---

## 2. Water Tank inventory — what is CORE vs SERVICE-SPECIFIC

| Layer | Files (Water Tank today) | Classification |
|---|---|---|
| **Signing engine** | `controllers/signing.controller`, `routes/sign.routes`, models `SigningEnvelope` / `EnvelopeSigner` / `SignatureField` / `SigningAuditLog` | **CORE — already shared** (RPRM, STS, WT all use it) |
| **Agreement render/complete** | `services/wtSignedDocument`, `services/wtAgreementCompletion`, `services/htmlToPdf` | **CORE — make service-agnostic** (drop `wt` prefix → `agreementSignedDocument`, `agreementCompletion`, `htmlToPdf`) |
| **Money** | `services/wtLedger`, `wtInvoice`, `wtInvoicePdf`, `wtVoucher`, `wtReports`, `wtReportPdf` | **CORE — parametrize by service_line** |
| **Identity / project spine** | `services/wtIdentity`, `wtProject`, `wtStateMachine`, `wtJobContext`, `wtWorkQueue`, `wtCalendar` | **CORE — parametrize** |
| **Catalogue** | `services/wtCatalogue` (+ `ServiceItem.vertical`) | **CORE — already vertical-aware**; each service = a `vertical` value |
| **Provider onboarding** | `controllers/waterTankProviders`, `publicWaterTankProvider`, `services/wtProviderAgreement`, `wtProviderCommercial`, model `waterTankProviders` | **CORE — parametrize** (required-docs, template come from the service manifest) |
| **Intake→delivery** | `controllers/waterTankIntake`, `waterTankQuotation`, `waterTankWorkOrder`, `waterTankProject`, `waterTankInvoice`, `waterTankAmc`, `waterTankDisbursement`, `waterTankAgreementHub`, `waterTankClients`, `waterTankOps`, `waterTankReports`, `waterTankCatalogue`, `waterTankRegisters` | **CORE — parametrize by service_line** |
| **Agreement builders** | `services/wtCustomerAgreement`, `wtProviderAgreement` | **MOSTLY CORE** — the clause text/schedule template is service data; the engine is shared |
| **Portals** | `controllers/wtPortalAccount`, `publicWtPortal`, `services/wtPortal*` | **CORE — parametrize** |
| **Console shell / nav** | `config/consoles.js` (`waterTankConsole`), `styles/wt-scope.css`, `screens/watertank/*` | **PART CORE, PART SERVICE** — the shell/screens are shared components; the nav list, colour and labels are per-service config |
| **Branding / notify** | `services/wtBranding`, `wtNotify` | **CORE — parametrize** |

**Reading of the table:** almost everything is core. The genuinely per-service things are a
short list: **display name & colour, code prefixes, catalogue `vertical`, required
compliance/insurance documents, the agreement clause/schedule template, the nav list, and
any bespoke screen.** That short list is what the **service manifest** holds.

---

## 3. The service registry (the heart of it)

Create one config object per service. This is the single source of per-service truth.

`backend/config/serviceLines.js`
```js
// Every service line the platform runs. Keys are the canonical `service_line` value
// stored on shared tables and used to scope every query.
module.exports = {
  water_tank: {
    key: 'water_tank',
    label: 'Water Tank',
    short: 'WTCM',
    accent: '#12b6f3',
    catalogue_vertical: 'water_tank_csa',
    code_prefix: {                 // was hard-coded across the WT controllers
      client: 'WTCM-C', project: 'WTCM-P', request: 'SR-', assessment: 'SA-',
      quotation: 'Q-', work_order: 'WO-', invoice: 'INV-', provider: 'SP-',
    },
    required_docs: {
      compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Safety Certification'],
      insurance: ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance', 'Vehicle Insurance'],
    },
    agreement_template: {
      customer: 'Water Tank Cleaning & Maintenance Customer Service Agreement',
      provider: 'Master Service Delivery Provider Agreement',
    },
    related_type: {                // envelope.related_type values
      customer: 'water_tank_customer_agreement',
      provider: 'water_tank_provider_agreement',
    },
  },

  air_conditioning: {
    key: 'air_conditioning',
    label: 'Air Conditioning',
    short: 'ACCM',
    accent: '#7c3aed',
    catalogue_vertical: 'air_conditioning_csa',
    code_prefix: {
      client: 'ACCM-C', project: 'ACCM-P', request: 'ACR-', assessment: 'ACA-',
      quotation: 'ACQ-', work_order: 'ACW-', invoice: 'ACI-', provider: 'ACP-',
    },
    required_docs: { compliance: [/* … */], insurance: [/* … */] },
    agreement_template: { customer: 'Air Conditioning Cleaning Customer Service Agreement', provider: 'Master Service Delivery Provider Agreement' },
    related_type: { customer: 'air_conditioning_customer_agreement', provider: 'air_conditioning_provider_agreement' },
  },
};
```

Frontend mirror: `admin-portal/src/config/serviceLines.js` (label, slug, accent, nav list,
route base). The console in `consoles.js` becomes a factory that reads this.

**The refactor discipline:** every literal in a `waterTank*` controller that names a prefix,
a vertical, a document set, a template, a label or a colour is replaced by a lookup on the
service manifest for the request's `service_line`. When that is done, the controllers no
longer "know" they are Water Tank — they serve whichever service the request is for.

---

## 4. Extract the generic engines FIRST (do this before AC)

These carry no service identity and should be renamed to drop `wt` and shared verbatim.
This is the highest-leverage step — the recent security/correctness fixes then protect every
service at once.

1. `services/htmlToPdf.service.js` — already generic. Keep as-is; used by any service.
2. `services/wtSignedDocument.service.js` → `agreementSignedDocument.service.js`
   (`applySignatures`, `buildSignedDocument` — no WT specifics).
3. `services/wtAgreementCompletion.service.js` → `agreementCompletion.service.js`
   — replace the `WT_TYPES` map with a lookup over **all** service manifests'
   `related_type`, and the provider-document filing keys off the service manifest.
4. `controllers/signing.controller.js` + `routes/sign.routes.js` — already shared; the
   completion hook already calls the WT completion service. Make it call the generic one.
5. `services/wtLedger`, `wtInvoice`, `wtVoucher` — parametrize the `vertical`/table scope by
   `service_line`; otherwise generic.

> Acceptance for this step: Water Tank behaves identically, but the shared engines have no
> `wt` in their name and take `service_line` (or read `related_type` from the registry).

---

## 5. Database — one set of tables, a `service_line` column

**Do NOT create `ac_clients`, `ac_quotations`, …** That is Strategy B and it will drift.

Instead, one idempotent migration adds `service_line` to every shared table and backfills
existing rows to `'water_tank'`:

`backend/migrations/00XX-service-line-column.js`
```js
const TABLES = [
  'wt_clients','wt_service_requests','wt_enquiries','wt_site_assessments','wt_quotations',
  'wt_work_orders','wt_projects','wt_project_disbursements','wt_providers','wt_amc_contracts',
  'wt_amc_visits','wt_invoices','wt_complaints','wt_warranties','wt_incidents',
  'wt_client_events','wt_comm_logs','wt_money_events','wt_provider_documents', /* … */
];
module.exports = {
  up: async (q, S) => {
    for (const t of TABLES) {
      const d = await q.describeTable(t).catch(() => null); if (!d) continue;
      if (!d.service_line) {
        await q.addColumn(t, 'service_line', { type: S.STRING(40), allowNull: false, defaultValue: 'water_tank' });
        await q.addIndex(t, ['branch_id', 'service_line'], { name: `${t}_service_line` }).catch(() => {});
      }
    }
  },
  down: async (q) => { for (const t of TABLES) { await q.removeColumn(t, 'service_line').catch(() => {}); } },
};
```

Rules:
- The tables keep their `wt_` names for now (renaming is cosmetic and risky; a later
  migration can rename to `svc_*` if we want). What matters is the `service_line` column.
- Every model gets `service_line`. Every `where` clause gains `service_line: req.serviceLine`
  alongside `branch_id`. Add a small middleware that resolves `service_line` from the route
  (see §6) and hangs it on `req` so controllers scope uniformly (mirrors `branchScope`).
- `ServiceItem.vertical` already separates catalogues — each service uses its own `vertical`
  from the manifest; no schema change needed for the catalogue.

---

## 6. Routing & console — one mount, service resolved from the path

Today: `/api/wt-*`. Target: keep the friendly per-service base but resolve `service_line`
from it so the same controllers serve all services.

- Option 1 (fastest, least churn): mount the **same** routers under each service base, e.g.
  `/api/wt-*` and `/api/ac-*`, with a one-line middleware per mount that sets
  `req.serviceLine`. `manifest.js` gets a small loop over the service registry.
- Option 2 (cleaner long-term): `/api/svc/:serviceLine/*` with `service_line` as a path
  param. Front-end `api` prepends the active service.

Frontend console (`config/consoles.js`): replace the hand-written `waterTankConsole` /
`shortStayConsole` with `makeServiceConsole(serviceManifest)` that returns the console
object (slug, label, accent, nav groups) from the manifest. `screens/watertank/*` become
`screens/service/*` shared components that read the active service from context/route; the
nav list per service comes from the manifest.

> Until Option 2 lands, a new service can ship on Option 1 with a thin `/api/ac-*` mount and
> a copied-then-slimmed console entry — but log it in the Debt register.

---

## 7. Procedure — add a new service (e.g. Air Conditioning)

**Preferred (shared core in place):**
1. Add the service to `backend/config/serviceLines.js` and the frontend mirror.
2. Seed its catalogue under the new `vertical` (copy the WT catalogue seed, change the
   vertical + prefixes): `scripts/seed<Service>Catalogue.js`.
3. Seed its agreement templates (customer + provider) — the clause/schedule text is service
   data; upload via the template engine or a seed.
4. Register its API base (one loop entry) and its console (one `makeServiceConsole` call).
5. Point the public website/onboarding form at the new service base.
6. Run the `service_line` migration if not already applied. Done — all workflows work.

**Fallback (physical duplication, temporary):** only if the core isn't extracted yet.
Copy with this exact rename map, then **immediately** log it in the Debt register:

| Water Tank | New service (AC example) |
|---|---|
| `wt_*` tables | `ac_*` tables (new migration, copy 0065-0092 body) |
| `waterTank*Controller` / `wt*Service` | `airCon*Controller` / `ac*Service` |
| `/api/wt-*` (manifest) | `/api/ac-*` |
| `screens/watertank/*` | `screens/aircon/*` |
| `wt-scope.css` | `ac-scope.css` (or share and swap `--accent`) |
| `WTCM-*` code prefixes | `ACCM-*` |
| `vertical: 'water_tank_csa'` | `vertical: 'air_conditioning_csa'` |
| `related_type: 'water_tank_*_agreement'` | `related_type: 'air_conditioning_*_agreement'` |
| `waterTankConsole` in `consoles.js` | `airConConsole` |

Duplication checklist (every item, or it will half-work):
- [ ] All `where` clauses scoped to the new tables (no stray `wt_` reference).
- [ ] `manifest.js` mounts the new routers (remember: `server.js` and the monolith both
      need them — we hit this exact drift before).
- [ ] Catalogue seeded under the new `vertical`.
- [ ] Customer + provider agreement templates seeded; `related_type` values unique.
- [ ] Required compliance/insurance doc lists set for the service.
- [ ] Console registered; nav routes point at the new base; accent colour set.
- [ ] Public onboarding + website enquiry point at the new base.
- [ ] `npm run build:admin` clean; migrations run; smoke-test the full chain
      (onboarding → request → assessment → quotation → agreement → sign → work order →
      invoice → disbursement).

---

## 8. Keeping services in lockstep — how a core edit auto-propagates

- **With the shared core (target):** a fix to `signing.controller`, `agreementCompletion`,
  `wtInvoice`, `waterTankQuotation`, the onboarding controller, etc. is **one edit** and
  applies to every service, because they all run the same code scoped by `service_line`.
  This is the whole point.
- **While any duplication remains:** the Debt register (below) is the checklist of "same
  edit must be applied here too". A change to a duplicated file is **not done** until every
  row in the register for that concern is updated. Prefer extracting to the shared core over
  re-copying a fix.
- **Guardrails to add:** a tiny test that asserts each service manifest is complete (all
  prefixes/verticals/templates present) and that every shared table query includes
  `service_line`. (No durable test suite exists yet — this is the first one worth writing.)

---

## 9. Do / Don't

**Do**
- Put every per-service literal in the service manifest.
- Scope every shared query by `branch_id` **and** `service_line`.
- Extract a generic engine the moment a second service needs it.
- Keep `related_type` values unique per service so signing completion routes correctly.

**Don't**
- Don't hard-code a prefix, vertical, template name, colour or label in a controller.
- Don't copy a core engine per service — parametrize it.
- Don't forget `manifest.js` when adding routers (server.js ≠ monolith drift bit us before).
- Don't mark the migration destructive — additive `service_line` only.

---

## 10. Debt register (duplicated-until-unified)

Log every place a service was physically duplicated instead of sharing, so a core fix knows
where else to land. Remove a row when the concern is folded into the shared core.

| Date | Service | Duplicated file/area | Shared target it should fold into | Owner |
|---|---|---|---|---|
| _(none yet — Water Tank is the origin; AC is the first duplication decision)_ | | | | |

---

### Appendix — recommended sequencing

1. **Extract generic engines** (§4) — rename off `wt`, no behaviour change. *(small, safe)*
2. **Service registry** (§3) — introduce config, repoint Water Tank literals to it.
3. **`service_line` migration** (§5) — additive, backfill `water_tank`.
4. **Scope queries** by `service_line` (middleware + `where` clauses).
5. **Console/route factories** (§6).
6. **Add Air Conditioning** as config (§7 preferred path). Repeat for later services.

Steps 1–5 make Water Tank identical but service-agnostic. Step 6 is then a day, not a fork.
