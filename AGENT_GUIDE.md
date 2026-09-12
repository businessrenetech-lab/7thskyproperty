# Seventh Sky Properties — Agent Working Guide

**Audience:** other AI/dev agents assigned to build features in this repo.
**Authority:** the Lead agent (Claude, the reviewer) approves all merges. You do
**not** merge to `main` yourself. Every task ends with a written report to the
Lead (see §7). Read this whole file before touching anything.

---

## 0. Golden rules (non‑negotiable)

1. **Log before and after.** Read `AGENT_WORK_LOG.md` and run `git status` first.
   Append a `STARTED` entry before you code and a `COMPLETED` entry when done.
   The log is **append‑only** — never edit or delete another agent's entries.
2. **Branch, never commit to `main`.** Work on a feature branch. The Lead handles
   integration.
3. **Never delete or overwrite test/seed data** unless the owner explicitly asks.
   No `destroy` scripts, no truncating tables, no "cleanup" on your own initiative.
4. **Follow the existing pattern, don't invent a parallel one.** This repo grows
   by *cloning* proven modules (see §4–§6). If you're writing something from
   scratch, you're probably doing it wrong — find the closest existing module.
5. **Migrations only — never `sequelize.sync()`.** Schema changes go through
   `sequelize-cli` migration files in `backend/migrations/` (see §2).
6. **Reuse `UploadButton` for every file/document field.** Never a raw text
   path/URL input. (`admin-portal/src/ui/UploadButton.jsx`.)
7. **Rebuild the admin bundle before you hand off.** `cd admin-portal && npm run build`
   — the app is served from `admin-portal/dist`, so unbuilt changes are invisible.
8. **Report to the Lead and wait for review.** You do not decide "done." (§3, §7)
9. **Commit message attribution** — end each commit with the attribution line the
   Lead gives you for your model (e.g. `Co-Authored-By: <model> <noreply@anthropic.com>`).

---

## 1. How to analyze the codebase & our workflow

### 1.1 Repo layout (monorepo)

| Path | What it is | Run it |
|---|---|---|
| `backend/` | Express + Sequelize (MySQL) API on **port 50001** | `node server.js` (migrations via `sequelize-cli`, **never** `sync()`) |
| `admin-portal/` | React 18 + Vite admin SPA, base `/admin/`, built to `dist/` | `npm run dev` / `npm run build` |
| `website-mock/` | Public marketing site (Vite) on **port 3005**, proxies `/api`,`/uploads`,`/admin` → `127.0.0.1:50001` | `npm run dev` |

The backend also **serves the built admin SPA at `/admin`** and every portal
(tenant / landlord / provider / register / sign). So `http://localhost:50001/admin`
and `http://localhost:3005/admin` both show the admin from `admin-portal/dist`.

### 1.2 The three core engines you must understand before building

- **Service consoles** — `admin-portal/src/config/consoles.js`. Each service line
  (Water Tank, Air Conditioning, Short Stay, Property Management, Residential
  Sell, Residential Buy, …) is a `*Console` config object with a `navGroups`
  array, rendered by a shared `ServiceConsole` (`<Outlet/>` + sidebar). New
  consoles are **cloned** from Water Tank with the `rebaseNav()` helper.
- **Service‑line core (backend)** — `backend/config/serviceLines.js` is the
  registry (code prefixes, line metadata). The Water Tank service files
  (`backend/services/wt*.service.js`) are **parameterized by a `service_line`
  column**, so Air Conditioning etc. reuse the exact same logic with a different
  `service_line` value. See memory note `service-line-duplication.md`.
- **Progressive SOP engine** — `backend/services/progressiveSop.service.js` has a
  `REGISTRY` keyed by **vertical** (`leasing`, `properties_sale`,
  `residential_purchase`, …). Each vertical defines its stage→phase map, unlock
  events, hints and SLAs. Projects are seeded from `workflow_templates` via
  `workflowProject.createProjectFromTemplate`; stage work is `PATCH
  /api/projects/:id/stages/:stageId`.

### 1.3 Cross‑cutting subsystems (know they exist, reuse them)

- **Signing** — `SigningEnvelope` + `EnvelopeSigner` + `SignatureField`. Document
  anchors `data-sign-party="X"` are matched to field labels `"X signature"` /
  `"X — date signed"` by `wtSignedDocument.applySignatures`. Multi‑party
  agreements use `Client 1..N` anchors (see `agreementSigners.service.js`).
- **KYC** — `PartyRoleProfile` + `KycDocument`. Verifying all required docs rolls
  the profile to `kyc_status: 'complete'` via `kycAutomation.onKycChange`.
  Public KYC‑by‑link: `POST /party-role-profiles/:id/registration-link` →
  `/api/public-party/register/:token`.
- **Settlement (sell side)** — `SaleSettlement` / `SaleSettlementLine`; the money
  path is offer → accept → settlement → receipt → reconcile → approve → payouts →
  lock → sold. Gates live in `services/salesSettlement.service.js`.
- **Invoices** — `PropertyInvoice` (`/api/invoices`). Agreement‑fee invoices are
  auto‑drafted on signing completion (`salesAgreementCompletion.service.js`).

### 1.4 How to explore before you build

1. Find the closest existing module to your task (grep the console/route names).
2. Trace one full path end‑to‑end: route in `server.js` → `routes/*.routes.js` →
   `controllers/*.controller.js` → `services/*.service.js` → model.
3. On the frontend: `App.jsx` route → screen component → `services/api.js` call.
4. Confirm your understanding against a running instance (authenticated `curl`
   or the browser) **before** writing code.

---

## 2. How to modify — do's and don'ts

### DO

- **Add a new top‑level API route in BOTH places:** `backend/server.js`
  (`mount('/api/…', './routes/….routes')`) **and** `backend/routes/manifest.js`.
  Missing either one is the most common breakage.
- **Schema changes = a new migration** in `backend/migrations/` named
  `NNNN-description.js` (next number in sequence). Run with `npm run db:migrate`.
- **Keep changes minimal and in the surrounding style** — match the file's naming,
  comment density, and idioms. Prefer extending a config/registry over forking a
  component.
- **Keep both e2e harness suites green:** `npm test` (backend) and the sales/buyer
  and sell‑journey harnesses in `backend/scripts/e2e*.js`. Add assertions when you
  add behavior.
- **Rebuild `admin-portal/dist`** before handoff, and verify the actual built app
  (not just dev) at `http://localhost:50001/admin/…`.
- **Reuse** the signing, KYC, SOP, settlement and invoice subsystems — do not
  reimplement them.

### DON'T

- ❌ `sequelize.sync()` or any auto‑schema change. Migrations only.
- ❌ Commit to `main`, force‑push, or merge your own work.
- ❌ Delete/rename another agent's files, log entries, migrations, or test data.
- ❌ Add a route to `server.js` only (or `manifest.js` only).
- ❌ Introduce a new UI pattern when a console/screen already covers it.
- ❌ Store secrets, tokens, or the user's email in code, URLs, or payloads.
- ❌ Hand off with a stale `dist`, failing tests, or no report.

---

## 3. Handing work to the Lead for review (what the Lead will check)

You must give the Lead everything needed to review **without re‑deriving your
work.** For every task, provide the report in §7 plus:

- The **branch name** and the list of changed files (`git status` / `git diff --stat`).
- **How to run/verify it** — exact URLs, endpoints, or the e2e command that proves it.
- **Test evidence** — paste the PASS/FAIL summary from the relevant `e2e*.js`
  harness (or a new one you added), and note anything you couldn't test.
- Any **schema migration** added and confirmation `npm run db:migrate` succeeds.
- Confirmation the **admin bundle was rebuilt**.

The Lead reviews for: correctness, that you followed the existing pattern (not a
parallel one), route registered in both `server.js` + `manifest.js`, migrations
(no `sync`), tests green, `dist` rebuilt, no touched test data, and `AGENT_WORK_LOG.md`
updated. Do not treat a task as done until the Lead confirms.

---

## 4. Recipe A — Add a NEW SERVICE using the Water Tank / Air Conditioning dashboard

New services (a "service line" such as Air Conditioning, Land & Property
Assessment, Loan & Financial Support, Removal & Relocation, Property Care &
Concierge) are **clones of Water Tank**, keyed by a `service_line` value. They
reuse the same screens, workflow spine, quotations, work orders and invoicing.

**Frontend (`admin-portal/src/config/consoles.js`):**
1. Create the nav by rebasing Water Tank's:
   ```js
   export const MY_SERVICE_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/my-service');
   export const myServiceConsole = { key, title, basePath: '/my-service', navGroups: MY_SERVICE_NAV, /* icons/labels */ };
   ```
   (Air Conditioning is the reference: `AIR_CONDITIONING_NAV = rebaseNav(WATER_TANK_NAV, '/water-tank', '/air-conditioning')`.)
2. Register the console's routes in `admin-portal/src/App.jsx` mirroring the
   `/water-tank/*` block (or the shared `ServiceConsole` route that reads the
   console config), and add it to the main sidebar/switcher.

**Backend:**
3. Register the new line in `backend/config/serviceLines.js` (code prefix + metadata).
4. The `wt*.service.js` core already filters by `service_line`; pass your new
   line's key from the controller. **No logic fork** — just the new `service_line`.
5. If the service has a bespoke workflow, add a vertical to the
   `progressiveSop.service.js` `REGISTRY` and a `workflow_templates` seed row.

**Then:** migrate if you added columns, rebuild `dist`, run the harnesses, report.

> The reusable console pattern and the 8 live service lines are documented in the
> memory notes `service-console-figma-pattern.md` and `service-line-duplication.md`.
> Read them before starting Recipe A.

---

## 5. Recipe B — Residential Buy/Sell, and adding NEW deal verticals

The **Residential Sell** console (`RESIDENTIAL_NAV` / `residentialConsole`) and
the **Residential Buy** console (`BUYER_NAV` / `buyerConsole`) both render through
`ServiceConsole` and drive the deal lifecycle via the progressive‑SOP engine:

- Sell side vertical = `properties_sale` (SOP: engagement → … → settlement).
- Buy side vertical = `residential_purchase` (SOP: enquiry → planning → search →
  diligence → offer → settlement → closure).
- The anchor for buy work is the **buyer deal file** (`PropertyDeal` with
  `deal_type='buy'`); sell work anchors on the property/transaction.

**To add a new buy/sell vertical** (e.g. **Commercial Buy/Sell**, **Rural**,
**Business Buy/Sell**):
1. **New SOP vertical** — add an entry to the `REGISTRY` in
   `progressiveSop.service.js` (stage→phase map, unlock events, hints, SLA) and a
   `workflow_templates` seed row for its stages. Reuse the `properties_sale` /
   `residential_purchase` entries as templates.
2. **New console** — add a `*_NAV` + `*Console` in `consoles.js`. If the screens
   are the same shape as residential, reuse the residential screens and pass a
   `scope`/`vertical` prop (the residential Contacts, Work Queue, Calendar and
   Invoices screens already take a `scope`/`kind` prop — follow that pattern) so
   the new vertical gets its **own dedicated, filtered** views.
3. **Routes** — add the console's routes in `App.jsx` and a submenu entry under the
   relevant main section (e.g. a "Commercial" group). Backend endpoints go in
   `server.js` **and** `manifest.js`.
4. **Deal typing** — reuse `PropertyDeal` with the new `deal_type`/category; do not
   create a parallel deal table.
5. Agreements/KYC/settlement/invoicing are shared subsystems — reuse them; only add
   a new agreement template (service like `rpps`/`rpss`) if the contract differs.

---

## 6. Recipe C — Add a new PROPERTY‑MANAGEMENT vertical (e.g. Commercial Management)

Property Management (`PROPERTY_MGMT_NAV` / `propertyMgmtConsole`) already hosts
several verticals (rental/leasing, short‑stay) sharing work orders, statements,
portals, maintenance, renewals and reports, filtered by `?vertical=` /
`?vertical_key=`.

To add **Commercial Management** (or similar):
1. Add the vertical to the SOP `REGISTRY` and a `workflow_templates` seed row.
2. Reuse the Property Management screens with the new `vertical_key` filter (the
   nav already uses `?vertical_key=…`); add nav entries for the new vertical.
3. Reuse owner statements, maintenance/work orders, portals and reports — pass the
   new vertical; do **not** duplicate those subsystems.
4. Route/mount any new endpoints in `server.js` **and** `manifest.js`; migrate for
   any new columns.

---

## 7. Definition of Done + the report you send the Lead

A task is **ready for review** (not "done") when:

- [ ] `AGENT_WORK_LOG.md` has your `STARTED` + `COMPLETED` entries (append‑only).
- [ ] Change follows an existing pattern; no parallel reimplementation.
- [ ] New API routes are in **both** `server.js` and `routes/manifest.js`.
- [ ] Schema changes are migrations (no `sync`); `npm run db:migrate` succeeds.
- [ ] File/document fields use `UploadButton`.
- [ ] `npm test` (backend) and the relevant `e2e*.js` harness are green; you added
      assertions for new behavior.
- [ ] `admin-portal` rebuilt (`npm run build`) and verified on the built app.
- [ ] No test/seed data deleted or overwritten.
- [ ] On a feature branch, not `main`; commit attribution line present.

**Report template (send to the Lead, every task):**

```
TASK: <one line>
BRANCH: <branch> · FILES: <git diff --stat summary>
WHAT I DID: <what changed and why, in the existing pattern — name the module you cloned>
HOW I CODED IT: <key decisions, which existing files/patterns you reused, anything non‑obvious>
HOW TO VERIFY: <exact URLs / endpoints / e2e command>
TEST EVIDENCE: <PASS/FAIL summary; what you could not test and why>
MIGRATIONS: <files added, migrate result> · DIST REBUILT: yes/no
OPEN QUESTIONS / RISKS: <anything the Lead should decide>
```

The Lead will review the code, run the verification steps, and either request
changes or approve for integration. **Always wait for the Lead's review — never
self‑merge.**
