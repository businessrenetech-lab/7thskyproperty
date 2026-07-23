# ARCHITECTURE.md — How Seventh Sky Property Care Works

Companion to **AGENTS.md** (which covers how to *work on* the code). This document explains
how the running system is put together and how its major subsystems behave, so you can change
things without breaking them.

- **Backend:** Node + Express + Sequelize + MySQL, `backend/`, port **5001**.
- **Frontend:** React 18 + Vite, `admin-portal/`, port **3000**, base path `/admin/`,
  proxies `/api` + `/uploads` → `127.0.0.1:5001`.

---

## 1. High-level shape

```
Browser (admin-portal, /admin/)
   │  axios `api` (baseURL /api, JWT from localStorage)
   ▼
Vite dev server :3000  ──proxy /api,/uploads──►  Express :5001
                                                   │
                            ┌──────────────────────┼───────────────────────┐
                            ▼                       ▼                       ▼
                        routes/*  ──►  controllers/*  ──►  services/*  ──►  models/*  ──►  MySQL
                                                   │
                                          middleware/errorHandler
```

- **server.js** boots Express, applies `helmet`/`cors`/`cookie-parser`/JSON body limits,
  serves `/uploads`, then **mounts each route module independently** with a `mount()` helper
  that logs failures instead of crashing (so a broken module can't take down the API). On boot
  it prints `mounted:` and `skipped:` lists — check them.
- **DB schema is owned by `migrations/` (sequelize-cli), never by `sequelize.sync()`.** The
  server authenticates the connection and starts even if the DB is down.

---

## 2. Conventions that apply everywhere

- **`underscored: true`** on models → snake_case columns, `created_at`/`updated_at`.
- **Branch scoping (multi-branch tenancy of the business).** Almost every table has
  `branch_id`. Controllers filter with `branchScope(req)` and stamp new rows with
  `resolveBranchId(req, ...)`. Respect this or users will see other branches' data.
- **JSON columns often round-trip as strings.** Columns like `terms`, `rate_card`,
  agreement `fields`/`signers`, `bank_details` may come back as a JSON *string*. Always parse
  defensively (`typeof v === 'string' ? JSON.parse(v) : v`) and strip stray numeric keys that
  double-encoding can introduce. Several models add parse-safe getters for this reason.
- **Codes** (human-readable ids like `SSPC-ENV-000123`) are generated with
  `utils/codeGenerator.js` `generateCode(Model, field, prefix)`.
- **Errors:** controllers throw or `return res.status(n).json({ error })`; `asyncHandler`
  funnels thrown errors to `middleware/errorHandler.js`.

---

## 3. Authentication & access

- **Staff app:** JWT. `POST /api/auth/login` → token → stored in `localStorage.token` →
  attached as `Authorization: Bearer` by the axios interceptor. `authMiddleware` verifies and
  sets `req.user`; `roleMiddleware([...])` gates by role
  (`super_admin`, `branch_admin`, `property_manager`, `accounts`, …).
- **Public flows (no login):** signing, KYC intake, owner approval, and role/provider
  registration are reached by outside parties via a **per-record `access_token`** in the URL,
  not a JWT. These live under `/api/sign`, `/api/intake`, `/api/public*`, etc., are
  rate-limited, and only expose that one record.

---

## 4. File uploads & document privacy

Served in `server.js`:

- **Public folders** (`properties, services, website, branches, assets`) under `/uploads` are
  static and cacheable — website media, listing photos.
- **Everything else under `/uploads`** (KYC, IDs, contracts, receipts) is **JWT-gated**: the
  static handler requires a valid token via `Authorization` header **or** `?token=` query
  (so `<img>`/`<iframe>` previews can pass the token). `ui/FileUpload.jsx` `fileSrc(url)`
  appends `?token=` automatically for private previews.
- **Uploader:** `utils/uploadAny.js` (multer) routes files to an allow-listed sub-folder via
  `?folder=` (`documents` = private default, `properties` = public), 15 MB limit, type filter.
  Rule: **identity/KYC documents must land in the private `documents` folder.**

---

## 5. Money model — folios

The financial backbone is the **folio** (a per-party running ledger: landlord, tenant,
provider, etc.), in `services/folio.service.js`.

- **Sign convention:** `current_balance += debit − credit`.
- For landlord/provider folios, rent/accruals are **debits** (balance grows = we hold/owe),
  fees/payouts are **credits** (balance shrinks).
- **Every third-party service provider has its own folio** (`folio_type: 'provider'`).
- `allocatePaymentToBuckets()` splits a payment across rent → service → utility → adjustment.
- Owner fees on rent, income entries, and disbursements build on top of this
  (`services/ownerFees.service.js`, `controllers/disbursement.controller.js`).

If you touch balances, keep the sign convention and post through the folio service — don't
mutate balances directly.

---

## 6. Progressive onboarding (SOP)

Property onboarding is a staged, step-by-step flow (property → owner → tenant → move-in)
rather than one giant form, in `services/progressiveSop.service.js`. Events
(`unlockForEvent(propertyId, event)`) unlock later stages as earlier ones complete
(property created, owner profile saved, assessment done, application, tenancy created/signed,
vacancy). Wire new lifecycle steps through this service so the UI's stage gating stays correct.

---

## 7. e-Sign envelopes (the signing engine)

Generic electronic-signature system, reused by every agreement type. Tables/models:

- `signing_envelopes` (**= one agreement instance**): `document_html`, `status`, `terms` (JSON
  of field values), `related_type`/`related_id` (what it activates), `cc_emails`, plus
  KYC/agreement columns (below).
- `envelope_signers`: each party, ordered, each with a unique `access_token`.
- `signature_fields`: the fields a signer completes (signature, date, …).
- `signing_audit_logs`: viewed/signed/completed events with IP + timestamp.

Flow (`controllers/signing.controller.js`): `viewByToken` → `signByToken` (persists field
values, advances signing order, hashes the document) → on the last signer, envelope →
`completed` and **`handleEnvelopeCompleted(envelope)`** fires.

**`services/partyRoleActivation.service.js` `handleEnvelopeCompleted`** is the automation
bridge: it dispatches by `related_type` and writes the agreed `terms` into operational records —
e.g. `tenancy` → activate lease + folios + occupancy; `party_role` (landlord/tenant/…) →
sync terms + activate the role; `service_provider` → mark agreement signed and (with KYC)
approve; `care_quotation` → raise the work order. **When you add a new agreement outcome, add a
branch here.**

---

## 8. Agreement Builder & KYC intake (the flagship subsystem)

This is the most involved area. It lets staff generate a **prefilled, read-only** agreement and
send it to a party who **reviews → uploads KYC → (fills their own fields) → signs**, after which
status/activation update automatically. Full history is in the project memory file
`smart-agreement-kyc-system.md`.

### 8.1 Templates (`agreement_templates`)
Each template has `content_html` with `{{key}}` placeholders and a `fields` array. A field:
```js
{ key, label, type, group, required,
  options?,        // for type 'checkbox_group' / 'select'
  default?,        // prefilled editable text (e.g. standard terms)
  clause_yes?, clause_no?,  // for type 'boolean' → narrative clause
  signer_fill?     // true → the RECIPIENT fills it on their intake page, not staff
}
```
Field **types**: `text, date, number, currency, percentage, email, tel, select, textarea,
boolean, checkbox_group`. Grouping by `group` drives the builder's left "sections" rail.

Templates are **seeded from `backend/scripts/seed*Agreement.js`** (idempotent by name). Current
templates: **#1 Water Tank Customer Service** (checkbox service selection, no KYC), **#2
Residential Tenancy** (full 19-clause), **#3 Service Provider Master** (full 63-clause). To change
wording/fields, edit the script and re-run it from `backend/`.

### 8.2 The builder (`admin-portal/src/screens/AgreementBuilder.jsx`)
Opened from Agreement Templates → **"Build & send"**. Left rail shows section completion
(green ✓ = required filled / blue • = partial / grey todo). Center renders the section's fields:

- **checkbox_group** → tick list where options are **editable (add/remove per instance)**.
- **boolean** → Yes/No radios that generate a narrative clause.
- others → normal inputs.

`buildValues(fields, values, groupOptions)` converts form state into the values sent to the API:
- checkbox_group → rendered HTML (**all options shown, selected ticked ☑ / unticked ☐**),
- boolean → `{key}_clause` narrative text,
- textarea → newlines to `<br>`.

Because `merge()` injects `{{key}}` values **raw** into the HTML
(`services/docTemplate.service.js`), pre-rendered checkbox HTML passes straight through.

- **Preview** → `POST /api/agreement-templates/:id/preview` (merged, read-only).
- **Prefill from record** → `GET /api/agreement-templates/:id/prefill?source_type=&source_id=`
  auto-fills field values from a tenancy / tenant application / property / provider / contact
  (`services/prefill.service.js`, template-aware — it even ticks the matching checkbox option).
- **Send** → `POST /api/agreement-templates/:id/prepare`. This merges the doc, creates a
  `signing_envelope` (storing `agreement_template_id`, `terms`, `kyc_role`, `kyc_policy`,
  `related_type`/`related_id`), creates signers with tokens, and returns links. If a `kyc_role`
  is set the links point to `/intake/:token`; otherwise `/sign/:token`.

### 8.3 KYC (`kyc_documents`)
One polymorphic table for every role's identity documents, keyed by
`related_type`/`related_id` + `role`, with lifecycle `submitted → verified / rejected /
needs_resubmission / expired`. Two services:

- `services/kycRequirements.service.js` — per-role required/optional document schema
  (`tenant, landlord, buyer, vendor, provider`; **customer = none**) and `evaluate(role, docs)`
  → checklist + rolled-up `kyc_status`.
- `services/kycAutomation.service.js` `onKycChange(doc)` — when a document is verified, rolls the
  result up to the linked `party_role`/`service_provider` and **completes any activation that was
  held pending KYC**.

Admin KYC API: `/api/kyc` (`requirements/:role`, `documents` CRUD, `status`, `verify` with
`{action: verify|reject|resubmit|expire}`, `review` = the review-centre feed).

### 8.4 The intake page (`admin-portal/src/screens/IntakePage.jsx`, `/intake/:token`)
The recipient's public flow, driven by the envelope signer's `access_token`
(`controllers/intake.controller.js`, `/api/intake`):

1. **Your Details** (only if the template has `signer_fill` fields) — the recipient fills their
   own fields (e.g. a provider's bank account); `POST /:token/values` merges them into `terms` and
   **re-renders the agreement** from the template.
2. **Your Documents** — KYC upload rows from the role's requirement schema; files stored privately
   via `POST /:token/upload`.
3. **Review** the finished agreement (read-only).
4. **Sign** — `POST /:token/sign` enforces the **KYC policy** then delegates to the shared
   `signByToken`.

### 8.5 KYC policy (activation gate)
On the envelope, `kyc_policy` ∈ `strict | flexible | none`:
- **strict** — cannot sign until all required KYC is uploaded.
- **flexible** — can sign now, but **operational activation is held until KYC is verified**
  (provider → `approved`; tenant party-role → `active`). This is the default for KYC roles.
- **none** — plain sign, no KYC (e.g. customer service agreements).

### 8.6 The golden path
```
Staff: Build & send (prefill → tick/fill → preview)         [AgreementBuilder]
   → envelope + signers created, links emailed                [prepare]
Recipient: /intake/:token
   → fill own fields → upload KYC → review → sign             [intake.controller]
   → envelope completed                                       [signByToken]
   → terms written to operational records                     [handleEnvelopeCompleted]
Staff: verify KYC in review centre
   → held activation completes (role/tenancy/provider live)   [kycAutomation]
```

---

## 9. Where things live (quick index)

| Concern | File(s) |
|--------|---------|
| App bootstrap, route mounting, static uploads | `backend/server.js` |
| Shared controller helpers | `backend/utils/controllerHelpers.js` |
| Auth | `backend/middleware/auth.middleware.js` |
| Uploads | `backend/utils/uploadAny.js`, `admin-portal/src/ui/FileUpload.jsx` |
| Folios / money | `backend/services/folio.service.js`, `ownerFees.service.js`, `controllers/disbursement.controller.js` |
| Progressive SOP | `backend/services/progressiveSop.service.js` |
| e-Sign engine | `backend/controllers/signing.controller.js`, `services/partyRoleActivation.service.js` |
| Agreement templates / merge | `backend/services/docTemplate.service.js`, `controllers/agreementTemplate.controller.js`, `scripts/seed*Agreement.js` |
| Prefill | `backend/services/prefill.service.js` |
| KYC | `backend/services/kycRequirements.service.js`, `kycAutomation.service.js`, `controllers/kyc.controller.js` |
| Builder UI | `admin-portal/src/screens/AgreementBuilder.jsx` |
| Intake UI | `admin-portal/src/screens/IntakePage.jsx` |
| Design system | `admin-portal/src/styles/pm-design.css` (`.pm-scope`) |
| Frontend routes | `admin-portal/src/App.jsx` |

For the change-safety rules (DO / DON'T) that go with all of the above, read **AGENTS.md**.
