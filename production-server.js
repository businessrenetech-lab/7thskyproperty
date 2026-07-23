/**
 * Seventh Sky Properties — Monolith Production Server
 * Single process · Single port · Hostinger-ready
 *
 * Serves the Next.js website (/), the Express API (/api/*), the admin SPA
 * (/admin), and uploads (/uploads) all on ONE Hostinger-assigned port — the
 * app's single-origin design, mapped straight onto Hostinger's one-Node-app
 * model. API routes come from backend/routes/manifest.js (shared with the
 * standalone backend/server.js, so they never drift).
 */

const fs = require('fs');
const path = require('path');

// ─── DEBUG LOG — file + console so a host build is always diagnosable ────────
const LOG_FILE = path.join(__dirname, 'startup-debug.log');
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch (e) { /* ignore */ }
}
try { fs.writeFileSync(LOG_FILE, ''); } catch (e) { /* ignore */ }

log('═══ SEVENTH SKY PRODUCTION SERVER STARTING ═══');
log(`Node ${process.version} · ${process.platform} ${process.arch}`);
log(`ENV PORT (before dotenv): ${process.env.PORT || '(not set)'}`);

// Capture Hostinger's PORT before dotenv can override it.
const HOSTINGER_PORT = process.env.PORT;

process.on('uncaughtException', (err) => log(`UNCAUGHT: ${err.stack || err}`));
process.on('unhandledRejection', (err) => log(`UNHANDLED: ${err && err.stack ? err.stack : err}`));

// ─── Step 1: env ─────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, 'backend', '.env');
log(`STEP 1: dotenv from ${envPath} (exists: ${fs.existsSync(envPath)})`);
require('dotenv').config({ path: envPath });
process.env.TZ = process.env.TZ || 'Asia/Dhaka';

const PORT = HOSTINGER_PORT || process.env.PORT || 3000;
process.env.PORT = String(PORT);
if (!process.env.INTERNAL_API_URL) process.env.INTERNAL_API_URL = `http://127.0.0.1:${PORT}`;
log(`  PORT=${PORT} · DB_HOST=${process.env.DB_HOST || '(NOT SET)'} · DB_NAME=${process.env.DB_NAME || '(NOT SET)'}`);

// ─── Step 2: express ─────────────────────────────────────────────────────────
let express;
try {
  express = require('express');
  log(`STEP 2: express ${require('express/package.json').version}`);
} catch (err) { log(`FATAL: express: ${err.message}`); process.exit(1); }

// ─── Step 3: Next.js (the public website) ────────────────────────────────────
// The website is OPTIONAL for the platform: if it isn't built, we still serve
// the API and the admin portal (no crash loop). Build it with `npm run build:all`.
let nextApp, nextHandle, hasWebsite = false;
const websiteDir = path.join(__dirname, 'website');
const nextDir = path.join(websiteDir, '.next');
const websiteBuilt = fs.existsSync(path.join(nextDir, 'BUILD_ID'));
log(`STEP 3: website=${fs.existsSync(websiteDir)} .next=${fs.existsSync(nextDir)} BUILD_ID=${websiteBuilt}`);
if (websiteBuilt) {
  try {
    const next = require(path.join(websiteDir, 'node_modules', 'next'));
    nextApp = next({ dev: false, dir: websiteDir });
    nextHandle = nextApp.getRequestHandler();
    hasWebsite = true;
    log('  Next.js app created');
  } catch (err) {
    log(`  ⚠ Next.js unavailable — serving API + admin only: ${err.message}`);
  }
} else {
  log('  ⚠ No website build (.next/BUILD_ID missing). Serving API + admin only. Run `npm run build:all` to enable the public site.');
}

async function start() {
  // ─── Step 4: prepare Next.js (only if it's built) ──────────────────────────
  if (hasWebsite) {
    log('STEP 4: preparing Next.js (10-30s)…');
    try { await nextApp.prepare(); log('  Next.js ready'); }
    catch (err) { log(`  ⚠ Next prepare failed — serving API + admin only: ${err.message}`); hasWebsite = false; }
  } else {
    log('STEP 4: skipped (no website build)');
  }

  // ─── Step 5: Express app + middleware ──────────────────────────────────────
  log('STEP 5: building Express app…');
  const app = express();
  const compression = require('compression');
  const cors = require('cors');
  const cookieParser = require('cookie-parser');
  const jwt = require('jsonwebtoken');
  const { getCorsOptions } = require('./backend/config/cors.config');

  app.use(compression());
  app.use(cors(getCorsOptions()));
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'seventh-sky', port: PORT, ts: new Date().toISOString() }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'seventh-sky-api', ts: new Date().toISOString() }));

  // ─── Uploads (mirror backend/server.js): public asset dirs cached, the rest
  //     token-gated so private KYC/settlement documents need a valid JWT. ─────
  const uploadsRoot = path.join(__dirname, 'backend', 'uploads');
  const publicUploadDirs = ['properties', 'services', 'website', 'branches', 'assets'];
  publicUploadDirs.forEach((dir) => {
    app.use(`/uploads/${dir}`, express.static(path.join(uploadsRoot, dir), { maxAge: '1d', etag: true, lastModified: true }));
  });
  app.use('/uploads', (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.query.token;
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try { jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
  }, express.static(uploadsRoot, { maxAge: '1d', etag: true, lastModified: true }));

  // ─── API routes from the shared manifest ───────────────────────────────────
  const manifest = require('./backend/routes/manifest');
  let mounted = 0; let failed = 0;
  for (const [mountPath, moduleRel] of manifest) {
    try {
      app.use(mountPath, require(path.join(__dirname, 'backend', 'routes', moduleRel)));
      mounted += 1;
    } catch (err) {
      failed += 1;
      log(`  ✘ ${mountPath} FAILED: ${err.message}`);
    }
  }
  log(`  API routes mounted ${mounted}/${manifest.length} (${failed} failed)`);

  // ─── Admin SPA (Vite build, base '/admin/') ────────────────────────────────
  const MIME = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.json': 'application/json', '.webp': 'image/webp', '.map': 'application/json' };
  const adminDist = process.env.ADMIN_DIST ? path.resolve(process.env.ADMIN_DIST) : path.join(__dirname, 'admin-portal', 'dist');
  const adminIndex = path.join(adminDist, 'index.html');
  log(`  admin dist=${fs.existsSync(adminDist)} index=${fs.existsSync(adminIndex)} (${adminDist})`);
  if (fs.existsSync(adminIndex)) {
    app.use('/admin/assets', (req, res) => {
      const assetPath = path.join(adminDist, 'assets', req.path.substring(1));
      if (!fs.existsSync(assetPath)) return res.status(404).type('text/plain').send('Asset not found');
      res.set('Content-Type', MIME[path.extname(assetPath).toLowerCase()] || 'application/octet-stream');
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      return res.sendFile(assetPath);
    });
    app.use('/admin', express.static(adminDist, { index: false }));
    app.get('/admin/{*splat}', (req, res) => {
      if (path.extname(req.path)) return res.status(404).type('text/plain').send('Asset not found');
      res.set('Cache-Control', 'no-store');
      res.sendFile(adminIndex);
    });
  }

  // ─── Website public assets, then the catch-all ────────────────────────────
  app.use(express.static(path.join(websiteDir, 'public'), { index: false }));
  if (hasWebsite) {
    app.all('{*splat}', (req, res) => nextHandle(req, res));
  } else {
    // No public site yet — keep /api and /admin working; friendly placeholder at /.
    app.all('{*splat}', (req, res) => {
      if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
      res.status(200).type('html').send(
        '<!doctype html><meta charset="utf-8"><title>Seventh Sky Properties</title>'
        + '<body style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:64px auto;padding:0 20px;color:#0d1b2f">'
        + '<h1>Seventh Sky Properties</h1>'
        + '<p>The admin portal is live at <a href="/admin">/admin</a>.</p>'
        + '<p style="color:#8a99ae">The public website has not been built yet. Run '
        + '<code>npm run build:all</code> on the server and restart to enable it.</p></body>'
      );
    });
  }
  log('STEP 5: done');

  // ─── Step 6: database (authenticate only — migrations own the schema) ──────
  log('STEP 6: database…');
  try {
    const sequelize = require('./backend/config/db.config');
    await sequelize.authenticate();
    log('  ✓ Database connected');
  } catch (err) {
    log(`  ⚠ DB not reachable (${err.code || 'ERR'}). API starts anyway; DB routes fail until MySQL is up. Run migrations.`);
  }

  // ─── Step 7: listen ────────────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    log(`STEP 7: LISTENING on 0.0.0.0:${PORT}`);
    log('═══ SEVENTH SKY PRODUCTION SERVER READY ═══');
    // Best-effort background schedulers (never block startup).
    try { require('./backend/services/rentalReceiptScheduler.service').startRentalReceiptScheduler(); }
    catch (e) { log(`  (scheduler not started: ${e.message})`); }
  });
}

start().catch((err) => { log(`FATAL STARTUP: ${err.stack || err.message}`); process.exit(1); });
