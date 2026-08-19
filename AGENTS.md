# AGENTS.md — Working on Seventh Sky Property Care

This file is the practical guide for any developer or AI agent changing this codebase.
Read it before you touch anything. For *how the system works* (data flow, subsystems),
see **ARCHITECTURE.md** next to this file.

## Shared Agent Coordination (mandatory)

`AGENT_WORK_LOG.md` is the shared, persistent handoff record for all human and AI
contributors. This workflow is automatic and does not require the user to request it again.

For every task, including investigation, documentation, and no-code tasks:

1. Before doing substantive work, read `AGENT_WORK_LOG.md` and run `git status` to identify
   active, completed, blocked, and uncommitted work from other contributors.
2. Append a `STARTED` entry to `AGENT_WORK_LOG.md` before changing project files. Include
   your identity, requested outcome, and intended scope.
3. Preserve concurrent work. Never edit or remove another contributor's log entry, and
   never revert, overwrite, stage, or claim their project changes. If scopes overlap,
   inspect carefully and document the coordination decision.
4. Before ending the task, append a `COMPLETED`, `BLOCKED`, or `PAUSED` entry. List files
   changed, decisions made, exact verification and results, and any remaining work.
5. Update the log even when no files changed or verification failed. Do not include secrets,
   credentials, tokens, `.env` values, or private customer data.

The log is append-only. Follow its entry template exactly enough that another agent can
resume without relying on chat history. Updating it is part of the definition of done.

---

## 0. What this repo is

The git root is a **shared folder holding several unrelated apps** (Language Academy,
crm-portal, hr-portal, gateway, accounting-portal, …). **The active product is
Seventh Sky Property Care**, made of exactly two things:

| Part | Path | Stack | Runs on |
|------|------|-------|---------|
| **API / backend** | `backend/` | Node + Express + Sequelize + MySQL | `http://localhost:5001` |
| **Admin web app** | `admin-portal/` | React 18 + Vite | `http://localhost:3000` (base path `/admin/`) |

The admin app **proxies** `/api` and `/uploads` to the backend at `127.0.0.1:5001`
(see `admin-portal/vite.config.js`). There is no separate gateway process for
day-to-day development — run the two parts above.

> Ignore the sibling apps unless you are explicitly asked to work on them.

---

## 1. Running it locally

```bash
# 1) Backend (from the backend/ directory — .env lives there)
cd backend
npm install            # first time only
npm run db:migrate     # apply any new migrations
npm start              # node server.js → http://localhost:5001

# 2) Frontend (separate terminal, from admin-portal/)
cd admin-portal
npm install            # first time only
npm run dev            # vite → http://localhost:3000/admin/
```

- **Test login:** `admin@seventhskyproperty.com` / `Admin#2026`
- Build the frontend for production with `npm run build` (outputs `admin-portal/dist/`).
- **Always run backend node scripts from `backend/`** (e.g. `node scripts/seedTenantAgreement.js`).
  `.env` is resolved relative to the working directory; running from the repo root fails DB connect.

---

## 2. Backend at a glance

`backend/` is a conventional layered Express app. Sizes: ~73 controllers, ~120 models,
~72 routes, ~22 services, ~37 migrations.

```
backend/
  server.js          # app bootstrap + resilient route mounting + static uploads
  config/            # db.config.js (Sequelize), cors.config.js
  routes/            # thin: URL → controller, with auth middleware
  controllers/       # request/response handlers (use asyncHandler)
  services/          # business logic reused across controllers
  models/            # Sequelize models (underscored: true)
  migrations/        # sequelize-cli, numbered 00NN-*.js — OWN the schema
  middleware/        # auth.middleware.js, errorHandler.js
  utils/             # controllerHelpers.js, uploadAny.js, codeGenerator.js, …
  scripts/           # one-off/seed scripts (run from backend/)
  uploads/           # user files (git-ignored content)
```

### Request flow
`routes/*.js` → `authMiddleware` + `roleMiddleware([...])` → `controllers/*.js`
(wrapped in `asyncHandler`) → `services/*.js` → `models/*.js`. Errors bubble to
`middleware/errorHandler.js`.

### Helpers you should reuse (`utils/controllerHelpers.js`)
- `asyncHandler(fn)` — wrap every async controller so thrown errors reach the error handler.
- `branchScope(req)` — returns a `{ branch_id }` filter; **always apply it** to queries so
  data stays scoped to the user's branch.
- `resolveBranchId(req, bodyBranchId)` — the branch id to write on new rows.
- `getPagination(req)` — `{ limit, offset, page }`.
- `pick(body, allowedKeys)` — whitelist request fields before create/update (never spread `req.body`).

### Auth
- JWT bearer token. `authMiddleware` verifies it and sets `req.user`.
- `roleMiddleware(['super_admin','branch_admin',...])` gates by role.
- Public (no-login) endpoints exist for token flows (signing/intake/registration) —
  they authenticate via a per-record `access_token`, **not** JWT.

---

## 3. Frontend at a glance

```
admin-portal/src/
  App.jsx            # all routes (Router basename="/admin")
  services/api.js    # axios instance, baseURL "/api", injects JWT from localStorage
  ui/kit.jsx         # shared components: Button, Input, Select, Field, Drawer, DataTable, Badge…
  ui/FileUpload.jsx  # upload widget; fileSrc(url) appends ?token for private previews
  screens/           # one file per page
  components/         # Sidebar, BottomNav, shared layout
  context/           # AuthContext, ToastContext, PermissionContext, ThemeContext
  styles/            # pm-design.css (scoped .pm-scope design system), GlobalStyles.css
```

- **API calls:** always use the shared `api` (from `services/api.js`). It sets `baseURL`,
  attaches the JWT, and redirects to login on 401. Never hardcode `http://localhost:5001`.
- **Screens** are registered in `App.jsx`. Property-care / agreement screens are **not** in
  the legacy `Sidebar.jsx` menu — they are reached from `CareDashboard.jsx` quick-links and
  direct routes. Add both the route (App.jsx) and a link where users will find it.
- **Public token pages** (no auth) live at `/sign/:token`, `/intake/:token`, `/approve/:token`,
  `/register/:token`, `/provider-register/:token`.
- **Styling:** for property-management/care screens use the scoped design system — wrap content
  in `className="pm-scope"` and use `.pm-*` classes. Match the surrounding screen's style.

---

## 4. How to do common tasks

### Add a backend endpoint
1. Add the handler to the relevant `controllers/x.controller.js`, wrapped in `asyncHandler`,
   using `branchScope`, `pick`, `getPagination`.
2. Register the route in `routes/x.routes.js` with the right `roleMiddleware`.
3. If the route file is new, `mount('/api/x', './routes/x.routes')` in `server.js`.

### Add / change a DB column or table
1. Create `migrations/00NN-description.js` (next number). Guard with `describeTable` /
   column-exists checks so it is safe to re-run:
   ```js
   const t = await queryInterface.describeTable('signing_envelopes');
   if (!t.my_col) await queryInterface.addColumn('signing_envelopes', 'my_col', { type: Sequelize.STRING, allowNull: true });
   ```
2. Add the attribute to the matching `models/X.js`.
3. `npm run db:migrate` from `backend/`. Never edit an already-applied migration — add a new one.

### Add a React screen
1. Create `screens/MyScreen.jsx` using `ui/kit.jsx` components and the `api` service.
2. Register `<Route path="/my" element={<MyScreen/>} />` in `App.jsx`.
3. Add a way to reach it (Sidebar item, or a CareDashboard/hub link).

### Add or edit an agreement template
Templates are **seeded from scripts**, not hand-written in the DB. See
`backend/scripts/seed{Tenant,Provider,Customer}Agreement.js`. Edit the script (fields +
`content_html`) and re-run it (`node scripts/seedXAgreement.js` from `backend/`). It is
idempotent by template name. Details in ARCHITECTURE.md → "Agreement Builder & KYC".

---

## 5. DO

- **DO** apply `branchScope(req)` to every list/find and set `branch_id` on every create.
- **DO** wrap async controllers in `asyncHandler` and return proper status codes + JSON `{ error }`.
- **DO** whitelist input with `pick(req.body, [...])`.
- **DO** own schema through **migrations only**, numbered, idempotent (`describeTable` guards).
- **DO** add a model attribute whenever you add a DB column — Sequelize ignores columns it
  doesn't know, which silently drops data (this exact bug bit the KYC envelope work).
- **DO** parse JSON columns defensively (see DON'T below).
- **DO** keep KYC / identity documents under the **private** `/uploads/documents` folder.
- **DO** use the shared `api` axios instance on the frontend and `ui/kit.jsx` components.
- **DO** re-run the frontend `npm run build` after changing admin-portal code you want served
  from `dist/`, and verify backend changes against a real endpoint before claiming done.

## 6. DON'T

- **DON'T** call `sequelize.sync()` or let models create tables. Migrations own the schema; the
  server boots without syncing.
- **DON'T** trust JSON columns to come back as objects. In this DB they frequently **round-trip
  as strings** (e.g. `rate_card`, `terms`, agreement `fields`/`signers`). Always
  `typeof x === 'string' ? JSON.parse(x) : x` with a try/catch, and strip stray numeric keys.
- **DON'T** add a foreign key to a legacy table by accident. `signing_envelopes.template_id`
  FKs to the **old** `document_templates`; the agreement system uses the separate
  `agreement_template_id` column. Use the right one.
- **DON'T** expose private files through public static URLs. Only `properties, services,
  website, branches, assets` under `/uploads` are public; everything else is JWT-gated
  (via `Authorization` header **or** `?token=`).
- **DON'T** hardcode a branch id, the API base URL, or credentials.
- **DON'T** spread `req.body` straight into `create`/`update`.
- **DON'T** edit an applied migration or renumber migrations; add a new one.
- **DON'T** put property-care screens only in the legacy Sidebar and assume users find them —
  wire a hub/quick link too.
- **DON'T** rely on shell unicode round-tripping when testing on Windows (Git Bash mangles
  `☑`/`☐`); write test payloads via a small Node script and assert on the response.

---

## 7. Verifying your change

- **Backend:** restart `node server.js`, log in to get a JWT, and hit the real endpoint with
  `curl`. Confirm status codes and shape. The server mounts routes resiliently and logs
  `mounted:` / `skipped:` on boot — check your route mounted.
- **Frontend:** `npm run build` must succeed (no import errors), then click the flow in the app.
- **Migrations:** `npm run db:migrate:status` shows applied state.
- Report failures honestly with the actual output; don't claim success you didn't observe.
