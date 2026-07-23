# Deploying to Hostinger — Seventh Sky Properties

Target: **Hostinger Business plan** (shared hosting with "Setup Node.js App",
powered by Passenger). Demo domain:
`https://darkgoldenrod-butterfly-615812.hostingersite.com`

There are three ways to run this, easiest first:

- **Option 1 — Single Node app (recommended, matches Git deploy).** One process
  (`production-server.js`) serves the website, the API, the admin, and uploads on
  the one port Hostinger assigns. No subdomains, no code changes.
- **Option 2 — Subdomain split.** Website and API as two separate Node apps.
- **Option 3 — VPS + Nginx.** The cleanest for a multi-service Node stack.

---

## Fixing the build error you hit

Hostinger's Git deploy ran `npm install` at the repo root, which failed because
the old root `postinstall` referenced portals that don't exist here
(`student-portal`, `teacher-portal`). **Fixed:** the root `postinstall` now runs
`scripts/postinstall.js`, which installs only the three real subprojects
(`backend`, `admin-portal`, `website`) and **skips anything missing** instead of
crashing. Re-deploy and the install step will pass.

---

## Option 1 — Single Node app (recommended)

`production-server.js` is a monolith: it boots the Next.js website, mounts the
API from `backend/routes/manifest.js`, serves the admin SPA at `/admin`, and
serves `/uploads` (private docs stay JWT-gated) — all on Hostinger's port.
This preserves the app's single-origin design, so **nothing needs rewiring**.

### 1. MySQL database
hPanel → **Databases → MySQL** → create DB + user. Note DB name, user, password,
host (`localhost`), port `3306`.

### 2. Upload the repo
Git deploy, or SSH/SFTP the whole repo to the app root
(e.g. `/home/uXXXXXXX/domains/<domain>/public_html`). Exclude `node_modules`,
`.env`, and `website/.next` (built on the server in step 4). `admin-portal/dist`
is committed, so it ships with the repo.

### 3. Backend env
Create `backend/.env` from `backend/.env.hostinger.example` and fill in the DB
credentials, `JWT_SECRET`, `ENCRYPTION_KEY`, `CORS_ORIGINS`, and `NODE_ENV=production`.
**Do not set PORT** — Hostinger/Passenger injects it (the server reads
`process.env.PORT`).

### 4. Install + build (SSH or the Node app terminal)
```bash
npm install              # root deps + postinstall installs backend/admin/website
npm run build:all        # builds admin-portal/dist and website/.next
cd backend && npx sequelize-cli db:migrate && cd ..   # create the schema
# fresh DB only: seed a super-admin
cd backend && npx sequelize-cli db:seed:all && cd ..
```

### 5. Create the Node.js app (hPanel → Advanced → Setup Node.js App)
- Node version **20**, mode **Production**.
- Application root: the repo root you uploaded.
- Application URL: the main domain.
- **Startup file: `production-server.js`**.
- Click **Run NPM Install**, then **Restart**.

### 6. Verify
- `https://<domain>/api/health` → `{"status":"ok"}`
- `https://<domain>/admin` → admin login (sign in with the seeded admin)
- `https://<domain>/` → the public website
- Upload a KYC/proof file, confirm `/uploads` serves it (with a token)
- hPanel → SSL → install free Let's Encrypt on the domain

> **Note on the public website:** the site under `/` is the legacy
> Language-Academy Next.js site; a few of its `/api/public/*` endpoints depend on
> models that were removed when this repo became Seventh Sky, so those pages may
> show empty data. The **Seventh Sky admin/sales platform at `/admin` is fully
> functional** (59/68 API routes mount; the 9 that skip are dead legacy routes).
> Replace `website/` with your Seventh Sky public site when ready — the monolith
> serves whatever Next build is in `website/.next`.

---

## Option 2 — Subdomain split (website + API as separate Node apps)

Use this if you prefer the website and API isolated. Topology:

```
<domain>       → Node App #1 = Next.js website (startup: website/app.js)
api.<domain>   → Node App #2 = Express API (startup: backend/server.js)
                              + serves admin at /admin + /uploads
```

Enabling pieces already in the repo:
- `backend/server.js` serves the admin SPA at `/admin` when `ADMIN_DIST` is set.
- `website/next.config.mjs` proxies the site's `/api` and `/uploads` to
  `NEXT_PUBLIC_API_ORIGIN` in production.
- `website/app.js` is the Passenger entry for Next.js.

Steps:
1. Create the `api` subdomain (hPanel → Subdomains).
2. **API app** (`api.<domain>`, startup `server.js`): upload `backend/` + the
   built `admin-portal/dist` as `admin-dist/`; set env from
   `backend/.env.hostinger.example` (incl. `ADMIN_DIST=…/admin-dist`); Run NPM
   Install; `npx sequelize-cli db:migrate`; restart.
   → `https://api.<domain>/admin` is the staff app, `…/api/health` the API.
3. **Website app** (`<domain>`, startup `app.js`): upload `website/` incl.
   `.next`; set env from `website/.env.hostinger.example`
   (`NEXT_PUBLIC_API_ORIGIN` + `INTERNAL_API_URL` = `https://api.<domain>`);
   Run NPM Install; restart.

---

## Option 3 — Hostinger VPS (cleanest for this stack)

A KVM VPS matches the single-origin design with **no code changes**:
```bash
sudo apt update && sudo apt install -y nginx mysql-server
npm i -g pm2
npm install && npm run build:all
cd backend && npx sequelize-cli db:migrate && cd ..
pm2 start production-server.js --name seventhsky --update-env   # PORT via env
pm2 save && pm2 startup
```
Nginx: proxy your domain to the app's port; add SSL with `certbot --nginx`.
(You can also run `backend/server.js` and `website/app.js` as separate PM2
processes behind Nginx if you prefer — see Option 2 topology.)

---

## Updating after a code change
```bash
git pull                    # or re-upload changed files
npm install                 # if deps changed
npm run build:all           # rebuild website + admin
cd backend && npx sequelize-cli db:migrate && cd ..   # if schema changed
```
Then **Restart** the Node app in hPanel.

---

## Files that make deployment work
- `production-server.js` — single-process monolith (Option 1 startup)
- `backend/routes/manifest.js` — shared API route list (backend + monolith)
- `scripts/postinstall.js` — resilient workspace installer (fixes the build error)
- `backend/server.js` — serves admin at `/admin` via `ADMIN_DIST` (Option 2)
- `website/app.js` — Passenger/Next.js entry (Option 2)
- `website/next.config.mjs` — prod `/api` + `/uploads` proxy (Option 2)
- `backend/.env.hostinger.example`, `website/.env.hostinger.example` — env templates
