# Deploying — Seventh Sky Property Care

Live site: **https://www.seventhskypropertycare.com**

**Deploy = push to the `production` branch.** Hostinger's Git integration is
wired to `businessrenetech-lab/7thskyproperty` branch `production`; every push
triggers install → build → restart. There is nothing to upload by hand.

```bash
git checkout production
git merge <your-branch>
npm run build:all          # commit the rebuilt dist — see "Why dist is committed"
git push origin production
```

---

## 1. What actually runs

One Node process, `production-server.js`, serves everything on the single port
Hostinger assigns:

| Path | Served from | Notes |
|------|-------------|-------|
| `/` | `website-mock/dist` | The public marketing site. Static Vite + React-Router SPA, with an SPA fallback. |
| `/admin` | `admin-portal/dist` | The staff app. Static Vite SPA, SPA fallback. |
| `/api/*` | `backend/routes/manifest.js` | Mounted resiliently — a broken route logs `skipped:` instead of killing boot. |
| `/uploads/*` | `backend/uploads` | Public folders are open; everything else is JWT-gated (header **or** `?token=`). |

### The public site is `website-mock`, NOT `website`

`website/` is the legacy Language Academy Next.js app. It is **not built and not
served**. Its pages still carry `languageacademy.com.bd` canonicals and PTE blog
content. Leave it alone.

> **Trap:** `production-server.js` and the root `package.json` differ between
> branches. Feature branches still carry the old copies that boot `website/` via
> Next. **Only the `production` branch is authoritative.** To check what really
> ships, read it there:
> ```bash
> git show production:production-server.js | grep website-mock
> git show production:package.json
> ```
> Reading either file on a feature branch gives the wrong answer.

---

## 2. Build configuration (hPanel → Node.js app)

| Setting | Value |
|---------|-------|
| Node version | **20** |
| Application mode | Production |
| Entry / startup file | `production-server.js` |
| Build script | `build:all` |
| Application root | repo root |

```jsonc
"build:admin":   "cd admin-portal && npm install --include=dev && npx vite build",
"build:website": "cd website-mock  && npm install --include=dev && npx vite build",
"build:all":     "npm run build:admin && npm run build:website"
```

### Three rules that must not be broken

1. **`--include=dev` everywhere.** `NODE_ENV=production` is set on the host, so
   npm skips devDependencies — and vite, tailwindcss and postcss all live there.
   Drop the flag and the build dies with `Cannot find module 'tailwindcss'`.
2. **Root `package.json` must not list `react`, `react-dom` or `next`.** A second
   React copy at the root breaks the sub-app builds. Root deps stay lean:
   compression, cookie-parser, cors, dotenv, express, jsonwebtoken.
3. **Never hardcode `PORT`.** Passenger injects it; `production-server.js` reads
   `process.env.PORT` and captures it *before* dotenv can override it.

`scripts/postinstall.js` installs `backend`, `admin-portal` and `website-mock`,
skipping anything missing rather than failing the deploy.

### Why `dist` is committed

Both `admin-portal/dist` and `website-mock/dist` are in git. The site therefore
serves correctly even if the host build step fails. **This means a source change
is not live until you rebuild and commit the bundle.** Run `npm run build:all`
before pushing, or you will deploy old assets and see no change.

---

## 3. Configuration — three places, and which wins

Know which one you are editing; this is the most common source of confusion.

### a) `SystemSetting` table (the database) — **shared with production**

The local `.env` points at the same MySQL instance production uses. Writing a
setting here changes production **immediately, with no deploy.**

`communication.service.js` reads settings in this order:
**`SystemSetting` → `process.env` fallback.** So a row here overrides the host
env var. Mail, branding, SEO, tracking IDs and `COMPANY_WEBSITE` all live here,
editable from the admin UI under Settings.

### b) hPanel env vars (the Node app's Environment section)

`DB_*`, `JWT_SECRET`, `NODE_ENV`, `TZ`, `PORT`. The env API is **full-replace and
returns masked values** — to change one variable you must resend all of them, so
prefer editing in the hPanel UI.

### c) `backend/.env` — **local only**

Gitignored, never on the host. `production-server.js` loads it if present;
dotenv does not override variables that already exist, so hPanel always wins.
`backend/.env.hostinger.example` is the reference for what production expects.

### Base URLs

Most derive from the incoming request host, so they follow the domain with no
configuration. **Two do not:** `APP_BASE_URL` and `WEBSITE_BASE_URL` fall back to
`http://localhost:3005`. Left unset on the host they put localhost links into
outgoing email. Set both to `https://www.seventhskypropertycare.com`.

`CORS_ORIGINS`, when set, **replaces** the defaults in
`backend/config/cors.config.js` rather than adding to them.

---

## 4. Email

Sends through Hostinger SMTP, `smtp.hostinger.com:465` (587 also works).
Three accounts route by purpose — `info` (default), `hr`, `support` — each with
its own `SMTP_*_USER` / `SMTP_*_PASS` pair in `SystemSetting`.

Because these live in the shared database, **changing a mailbox takes effect on
production instantly — no deploy.** Verify before switching:

```bash
cd backend && node -e "require('dotenv').config();const n=require('nodemailer');
n.createTransport({host:'smtp.hostinger.com',port:465,secure:true,
auth:{user:'info@seventhskypropertycare.com',pass:process.argv[1]}})
.verify().then(()=>console.log('OK')).catch(e=>console.log('FAIL',e.message))" '<password>'
```

> **Known weakness:** SMTP passwords are stored as plain text with `is_secret`
> set, which only masks them in the UI. `utils/encryption.js` derives its key
> from `ENCRYPTION_KEY || JWT_SECRET`; `ENCRYPTION_KEY` is unset, and if the
> host's `JWT_SECRET` ever differs, `decrypt()` silently returns the ciphertext
> and mail fails auth with a garbage password. Encrypting these safely requires
> setting a matching `ENCRYPTION_KEY` locally and in hPanel first.

---

## 5. Database

Migrations own the schema — the server never calls `sequelize.sync()`.

```bash
cd backend && npx sequelize-cli db:migrate      # run from backend/, .env resolves to cwd
npm run db:migrate:status                       # what is applied
```

**The local database is the production database.** A migration run locally
applies to production instantly, so migrations must be additive and guarded with
`describeTable`, and test fixtures must never be left behind.

---

## 6. After deploying, check

- `https://www.seventhskypropertycare.com/api/health` → `{"status":"ok"}`
- `/` loads the marketing site
- `/admin` loads the staff app and signs in
- A private upload still requires a token
- hPanel → build log: `mounted:` lines for the API routes, no `skipped:` you did
  not expect

---

## 7. Open items

- **Default admin credentials are public** — `admin@seventhskyproperty.com` ships
  in the repo and in the built bundle. Change the password in the live database.
- **A dedicated production database.** The app currently runs against
  `u712081339_test1`, shared with local development.
- **Signed-PDF generation is degraded.** Puppeteer needs Node ≥22 plus a Chrome
  binary; the host is Node 20 shared hosting.
