# Deploying to Hostinger — Seventh Sky Properties

Target: **Hostinger Business plan** (shared hosting with the "Setup Node.js App"
feature, powered by Passenger). Demo domain:
`https://darkgoldenrod-butterfly-615812.hostingersite.com`

---

## 0. Read this first (honest architecture note)

This project is **three services**:

| Piece | What it is | Needs |
|---|---|---|
| `website/` | Next.js **SSR** site (public) | a running Node process |
| `backend/` | Express API + MySQL | a running Node process |
| `admin-portal/dist/` | Vite **static** SPA (staff) | just static files (no Node) |

The app was designed for a **single origin** (relative `/api` calls). That maps
perfectly to a **Hostinger VPS + Nginx** (see Appendix B — the smoothest option).

On **Business shared hosting**, Passenger runs **one Node app per domain/subdomain**
and can't reverse-proxy several Node processes on one domain. So we split by
**subdomain** and let Next.js proxy `/api` for the website. This works and is
what the steps below do.

**Recommended topology (Business plan):**

```
darkgoldenrod-...hostingersite.com      → Node App #1  = Next.js website
api.darkgoldenrod-...hostingersite.com  → Node App #2  = Express API
                                                         + serves admin at /admin
                                                         + serves /uploads
```

- Public visitors → the main domain.
- Staff → `https://api.<domain>/admin` (same origin as the API, so login/KYC/
  settlement all work with zero CORS and no rebuild).

Two small code changes already made for this to work:
- `backend/server.js` serves the admin SPA at `/admin` when `ADMIN_DIST` is set.
- `website/next.config.mjs` proxies `/api` + `/uploads` to `NEXT_PUBLIC_API_ORIGIN`
  in production.
- `website/app.js` is the Passenger entry point for Next.js.

---

## 1. Create the MySQL database (hPanel)

1. hPanel → **Databases → MySQL Databases**.
2. Create a database + user, grant all privileges. Note:
   - DB name (e.g. `uXXXXXXX_seventhsky`)
   - DB user (e.g. `uXXXXXXX_admin`)
   - DB password
   - Host is usually `localhost`, port `3306`.

---

## 2. Create the API subdomain

hPanel → **Domains → Subdomains** → create `api` →
`api.darkgoldenrod-butterfly-615812.hostingersite.com`. Note its document root
(e.g. `/home/uXXXXXXX/domains/api.<domain>/public_html`).

---

## 3. Build locally, then upload

Run these on your machine (already done in this session, re-run to be current):

```bash
# API — nothing to build, but prune dev deps for upload size (optional)
# Admin SPA (static, base '/admin/')
cd admin-portal && npm ci && npm run build      # → admin-portal/dist

# Website (Next.js SSR)
cd ../website && npm ci && npm run build         # → website/.next
```

Upload via **SSH/SFTP** (Business includes SSH) or hPanel File Manager:

- **API app** → e.g. `/home/uXXXXXXX/api.domain/`
  Upload: `backend/` (all of it EXCEPT `node_modules`, `.env`), and the built
  `admin-portal/dist/` as `admin-dist/` next to it.
- **Website app** → main domain root, e.g. `/home/uXXXXXXX/public_html/` or a
  dedicated app dir. Upload: `website/` EXCEPT `node_modules` and `.env*`, but
  **including** `.next/`, `public/`, `package.json`, `package-lock.json`,
  `next.config.mjs`, and `app.js`.

> Tip: zip each folder, upload the zip, extract in File Manager — far faster
> than uploading thousands of files.

---

## 4. API Node app (hPanel → Advanced → Setup Node.js App)

1. **Create application**
   - Node version: **20** (or 18).
   - Application mode: **Production**.
   - Application root: `api.domain` (where you uploaded `backend/`).
   - Application URL: the `api.` subdomain.
   - Application startup file: `server.js`.
2. **Environment variables** — add every key from
   `backend/.env.hostinger.example` (DB_*, JWT_SECRET, ENCRYPTION_KEY,
   CORS_ORIGINS, PUBLIC_APP_URL, PUBLIC_API_URL, and
   `ADMIN_DIST=/home/uXXXXXXX/api.domain/admin-dist`). **Do not set PORT** —
   Passenger injects it (`server.js` already uses `process.env.PORT`).
3. Click **Run NPM Install**.
4. Open the app's terminal (button in the Node app panel) and run migrations:
   ```bash
   npx sequelize-cli db:migrate
   ```
5. **Restart** the app. Visit `https://api.<domain>/api/health` → should return
   `{"status":"ok"}`. Visit `https://api.<domain>/admin` → admin login loads.

Seed a super-admin if this is a fresh DB:
```bash
npx sequelize-cli db:seed:all       # or: node seeders/0001-bootstrap.js
```

---

## 5. Website Node app (main domain)

1. **Setup Node.js App** → new application:
   - Node version: **20**.
   - Application mode: **Production**.
   - Application root: where you uploaded `website/`.
   - Application URL: the **main** domain.
   - Application startup file: **`app.js`**.
2. **Environment variables** (from `website/.env.hostinger.example`):
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_ORIGIN=https://api.<domain>`
   - `INTERNAL_API_URL=https://api.<domain>`
3. **Run NPM Install**.
4. **Restart**. Visit `https://<domain>` → the public site loads and its data
   (courses/blog/branches) comes through `/api` proxied to the API subdomain.

> The website's `.next` build is uploaded, so Passenger doesn't rebuild. If you
> change `NEXT_PUBLIC_*` vars you must rebuild locally and re-upload `.next`.

---

## 6. Post-deploy checklist

- [ ] `https://api.<domain>/api/health` → ok
- [ ] `https://api.<domain>/admin` → admin login; sign in with the seeded admin
- [ ] `https://<domain>` → public site renders with live data
- [ ] Create a listing in admin → appears on the public site
- [ ] Submit a public enquiry → shows in admin CRM
- [ ] File upload works (KYC/proof) and `/uploads` serves it
- [ ] SSL padlock on both domains (hPanel → SSL → install free Let's Encrypt)

---

## 7. Updating after a code change

```bash
# locally
cd admin-portal && npm run build
cd ../website && npm run build
git commit -am "..." && git push        # optional
```
Re-upload the changed folders (`admin-dist/`, `website/.next/`, or `backend/`),
then **Restart** the affected Node app in hPanel. Run new migrations from the
API app terminal if the DB schema changed.

---

## Appendix A — Single-domain variant (no subdomain)

If you'd rather keep everything on the main domain and skip the API subdomain:
run the **website as the only Node app** and set
`NEXT_PUBLIC_API_ORIGIN` to a **VPS/other host** for the API — not possible on a
single shared domain because Passenger won't run the API process too. Use the
subdomain split (above) or a VPS (below).

## Appendix B — Hostinger VPS (recommended for this stack)

A KVM VPS matches this app's single-origin design with **no code changes** and
no subdomain split:

```bash
# on the VPS (Ubuntu)
sudo apt update && sudo apt install -y nginx mysql-server
# install Node 20 (nvm or nodesource), pm2:
npm i -g pm2

# build + start each service
cd backend  && npm ci && npx sequelize-cli db:migrate && pm2 start server.js --name api
cd ../website && npm ci && npm run build && pm2 start app.js --name web
pm2 save && pm2 startup
```

Nginx (one server block on your domain):
```nginx
server {
  server_name your-domain.com;
  location /api      { proxy_pass http://127.0.0.1:5001; }
  location /uploads  { proxy_pass http://127.0.0.1:5001; }
  location /admin    { alias /var/www/seventhsky/admin-portal/dist/; try_files $uri $uri/ /admin/index.html; }
  location /         { proxy_pass http://127.0.0.1:3000; }   # Next.js
}
```
Set backend PORT=5001 and website PORT=3000 in each app's env. Add SSL with
`certbot --nginx`. This is the cleanest production setup.

---

## Files added for deployment
- `backend/.env.hostinger.example` — API env template
- `website/.env.hostinger.example` — website env template
- `website/app.js` — Passenger/Next.js startup entry
- `backend/server.js` — now serves the admin SPA at `/admin` via `ADMIN_DIST`
- `website/next.config.mjs` — production `/api` + `/uploads` proxy to the API origin
