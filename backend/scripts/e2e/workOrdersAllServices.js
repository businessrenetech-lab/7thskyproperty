/**
 * Work orders, end to end, across EVERY service line. Needs the API on :50001.
 * Run: node scripts/e2e/workOrdersAllServices.js
 *
 * The work order is one shared record used by 16 service lines, separated only
 * by `service_line` and the X-Service-Line header. That is efficient, and it is
 * also exactly how one line ends up showing another line's jobs, so this asserts
 * the separation rather than assuming it.
 *
 * What it covers:
 *   1. per line — the list answers, is scoped, and its codes carry the line's
 *      own prefix; reference data suits the line's delivery model; a job's
 *      detail, document and action history open
 *   2. isolation — no job appears under a line it does not belong to, and the
 *      providers offered for assignment all belong to the asking line
 *   3. the header — absent or unknown falls back to one line, never a mixture
 *   4. stale — no job on a retired line, no job pointing at a provider that no
 *      longer exists or belongs to another line
 *   5. the route table — every route is backed by a real controller function
 *   6. the console — every line is in the frontend path map at its own route
 *
 * READ-ONLY. This DB is the production DB, so nothing here creates, edits or
 * deletes a record; every boundary is asserted through a GET. (Work orders have
 * no create endpoint by design — a job is born from a signed agreement or an
 * accepted quotation, never typed by hand — so there is nothing to clean up.)
 */
const path = require('path');
const fs = require('fs');
const { login, req, ok, finish, STAMP } = require('./httpHarness');
const LINES = require('../../config/serviceLines');

const keys = LINES.SERVICE_LINE_KEYS;
const lineOf = (k) => LINES.getServiceLine(k);

/** Every call must say which line it is for; that header is the whole separation. */
const asLine = (k) => ({ headers: { 'X-Service-Line': k } });
const baseFor = (k) => `/api/${lineOf(k).api_base || 'wt'}-work-orders`;
const rowsOf = (b) => b?.rows || b?.data || (Array.isArray(b) ? b : []);

/** Filled by perLine(), reused by the isolation and staleness checks. */
const byLine = new Map();

async function perLine() {
  console.log(`\n-- Every service line's work-order surface (${keys.length} lines) --`);

  for (const key of keys) {
    const line = lineOf(key);
    const base = baseFor(key);

    const list = await req('GET', `${base}?limit=500`, asLine(key));
    if (list.status !== 200) {
      ok(false, `${key}: the work-order list answers`, `HTTP ${list.status} on ${base}`);
      continue;
    }
    const rows = rowsOf(list.body);
    byLine.set(key, rows);
    ok(true, `${key}: list answers`, `${rows.length} job(s)`);

    // The separation itself: every row must belong to this line.
    const foreign = rows.filter((w) => w.service_line && w.service_line !== key);
    ok(foreign.length === 0, `${key}: the list contains only ${key} jobs`,
      foreign.length ? [...new Set(foreign.map((w) => w.service_line))].join(',') : 'clean');

    // Codes must carry this line's own prefix, or a job cannot be identified by
    // eye and the record reads as though it belongs to another service.
    const prefix = line.code_prefix?.work_order;
    if (prefix && rows.length) {
      const wrong = rows.filter((w) => w.code && !String(w.code).startsWith(prefix));
      ok(wrong.length === 0, `${key}: every job code starts with ${prefix}`,
        wrong.length ? wrong.slice(0, 3).map((w) => w.code).join(',') : `${rows.length} checked`);
    }

    // Reference data drives the assignment UI.
    const ref = await req('GET', `${base}/reference`, asLine(key));
    ok(ref.status === 200, `${key}: reference answers`, `HTTP ${ref.status}`);
    const rb = ref.body?.data || ref.body || {};
    ok(Array.isArray(rb.statuses) && rb.statuses.length > 0, `${key}: reference offers statuses`,
      `${(rb.statuses || []).length}`);

    /*
     * The delivery model decides what assignment means. A provider line hands
     * the job to a contracted firm and must be able to offer one; an
     * internal-team line allocates its own crew and has no provider gate.
     */
    const model = line.delivery_model || 'provider';
    if (line.no_provider) {
      // Delivered in-house: the provider surface is refused outright, so the
      // console never offers an assignment the line cannot honour.
      const dir = await req('GET', '/api/wt-providers/directory', asLine(key));
      ok(dir.status === 409, `${key}: in-house line refuses the provider register`,
        `HTTP ${dir.status} (${model})`);
    } else {
      const eligible = rb.assignable_providers;
      ok(Array.isArray(eligible), `${key}: provider line offers assignable providers`,
        `${(eligible || []).length} eligible`);
      // A provider offered to this line must BE of this line, or the SOP gate
      // would hand a water-tank job to an air-conditioning contractor.
      const cross = (eligible || []).filter((p) => p.service_line && p.service_line !== key);
      ok(cross.length === 0, `${key}: every offered provider belongs to ${key}`,
        cross.length ? cross.map((p) => `${p.code}:${p.service_line}`).join(',') : 'clean');
    }

    // A job's own detail, document and history must open.
    if (rows.length) {
      const one = rows[0];
      const detail = await req('GET', `${base}/${one.code}`, asLine(key));
      ok(detail.status === 200, `${key}: a job's detail opens`, `HTTP ${detail.status} (${one.code})`);
      const w = detail.body?.work_order || {};
      ok(String(w.service_line || key) === key, `${key}: the detail is the right line's job`, w.service_line);

      const doc = await req('GET', `${base}/${one.code}/document`, asLine(key));
      ok([200, 404].includes(doc.status), `${key}: the work-order document answers`, `HTTP ${doc.status}`);

      const acts = await req('GET', `${base}/${one.code}/actions`, asLine(key));
      ok(acts.status === 200, `${key}: the job's action history opens`, `HTTP ${acts.status}`);

      const pays = await req('GET', `${base}/${one.code}/payouts`, asLine(key));
      ok(pays.status === 200, `${key}: the job's payout history opens`, `HTTP ${pays.status}`);
    } else {
      ok(true, `${key}: no jobs yet — detail not exercised`, 'empty book');
    }
  }
}

async function isolation() {
  console.log('\n-- One line must never see, or open, another line\'s job --');

  // Every code, and the line that owns it.
  const owner = new Map();
  for (const [key, rows] of byLine) rows.forEach((w) => owner.set(w.code, key));

  const bleed = [];
  for (const [key, rows] of byLine) {
    for (const w of rows) {
      if (owner.get(w.code) !== key) bleed.push(`${w.code} in ${key}`);
    }
  }
  ok(bleed.length === 0, 'no job code appears under two different lines',
    bleed.slice(0, 5).join(', ') || `${owner.size} distinct job(s)`);

  /*
   * Listing is one boundary; fetching by code is the other. A code is guessable,
   * so a line asking for a job it does not own must be refused — otherwise the
   * scoping is cosmetic and the URL bar defeats it.
   */
  const probes = [];
  for (const [key, rows] of byLine) {
    if (!rows.length) continue;
    const other = keys.find((k) => k !== key && byLine.get(k)?.length);
    if (other) probes.push({ code: rows[0].code, ownedBy: key, askedAs: other });
  }
  const opened = [];
  for (const p of probes) {
    const r = await req('GET', `${baseFor(p.askedAs)}/${p.code}`, asLine(p.askedAs));
    if (r.status === 200) opened.push(`${p.code} (${p.ownedBy}) opened as ${p.askedAs}`);
  }
  ok(opened.length === 0, 'fetching another line\'s job by code is refused',
    opened.slice(0, 5).join(', ') || `${probes.length} probe(s) all refused`);
}

async function headerDefaulting() {
  console.log('\n-- The header is the separation, so its absence matters --');

  const none = await req('GET', '/api/wt-work-orders?limit=5');
  ok(none.status === 200, 'a request with no service line still answers', `HTTP ${none.status}`);
  const seen = [...new Set(rowsOf(none.body).map((w) => w.service_line))];
  ok(seen.length <= 1, 'and returns one line, not a mixture', seen.join(',') || 'empty');
  ok(seen.length === 0 || seen[0] === LINES.DEFAULT_SERVICE_LINE,
    `it falls back to the default line (${LINES.DEFAULT_SERVICE_LINE})`, seen[0] || 'empty');

  const junk = await req('GET', '/api/wt-work-orders?limit=5', asLine('not_a_real_line'));
  const junkSeen = [...new Set(rowsOf(junk.body).map((w) => w.service_line))];
  ok(junk.status === 200, 'an unknown service line still answers', `HTTP ${junk.status}`);
  ok(junkSeen.length === 0 || junkSeen[0] === LINES.DEFAULT_SERVICE_LINE,
    'an unknown line falls back to the default rather than opening everything',
    junkSeen.join(',') || 'empty');
}

async function staleRows() {
  console.log('\n-- Stale rows: a job pointing at something that is gone --');

  const lines = new Set();
  let total = 0;
  for (const [, rows] of byLine) {
    total += rows.length;
    rows.forEach((w) => lines.add(w.service_line || '(null)'));
  }
  const unknown = [...lines].filter((s) => s !== '(null)' && !keys.includes(s));
  ok(unknown.length === 0, 'no job sits on a service line that is not configured',
    unknown.join(',') || `${lines.size} line(s) in use`);
  ok(!lines.has('(null)'), 'no job has a null service line', lines.has('(null)') ? 'found' : 'clean');

  /*
   * A job carries provider_id AND provider_name, and what that may point at
   * depends on how the line delivers.
   *
   * A `no_provider` line is delivered in-house: the whole provider surface
   * answers 409 by design, so there is no register a provider could be chosen
   * from. A job on such a line carrying a provider_id names a contractor the
   * console cannot open and the operator cannot verify — it is stale by
   * definition, not merely inconsistent.
   *
   * A provider line must point at a provider that still exists on that line.
   */
  for (const key of keys) {
    const rows = byLine.get(key) || [];
    const assigned = rows.filter((w) => w.provider_id);

    if (lineOf(key).no_provider) {
      ok(assigned.length === 0, `${key}: in-house line — no job names a provider`,
        assigned.length
          ? assigned.slice(0, 4).map((w) => `${w.code}→provider ${w.provider_id}`).join(', ')
          : `${rows.length} job(s) clean`);
      continue;
    }

    if (!assigned.length) { ok(true, `${key}: no assigned job to check`, `${rows.length} job(s)`); continue; }

    const dir = await req('GET', '/api/wt-providers/directory?limit=500', asLine(key));
    if (dir.status !== 200) {
      ok(false, `${key}: the provider directory answers`, `HTTP ${dir.status}`);
      continue;
    }
    const ids = new Set(rowsOf(dir.body.providers).map((p) => p.id));
    const dangling = assigned.filter((w) => !ids.has(w.provider_id));
    ok(dangling.length === 0, `${key}: every assigned job points at a live ${key} provider`,
      dangling.length
        ? dangling.slice(0, 4).map((w) => `${w.code}→provider ${w.provider_id}`).join(', ')
        : `${assigned.length} assignment(s) checked`);
  }
  console.log(`  (${total} job(s) across ${lines.size} line(s))`);
}

function routeTable() {
  console.log('\n-- The route table must not point at a handler that is gone --');

  // Express throws when a route handler is undefined, and server.js mounts
  // resiliently — so a stale `ctrl.somethingRenamed` does not crash the boot, it
  // silently drops the WHOLE router and every work-order URL 404s. Worth a check
  // that does not need the server running.
  const routesSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', 'routes', 'waterTankWorkOrder.routes.js'), 'utf8',
  );
  const ctrl = require('../../controllers/waterTankWorkOrder.controller');

  const named = [...routesSrc.matchAll(/ctrl\.(\w+)/g)].map((m) => m[1]);
  const missing = [...new Set(named)].filter((n) => typeof ctrl[n] !== 'function');
  ok(missing.length === 0, 'every work-order route is backed by a real controller function',
    missing.join(',') || `${new Set(named).size} handler(s)`);
}

async function lifecycleEndpoints() {
  console.log('\n-- Every lifecycle endpoint is live, on every line --');

  /*
   * A work order moves through assign → accept → schedule → start → complete →
   * verify → invoice → pay. Each is a POST, and each mutates a real job, so they
   * are exercised here against a code that CANNOT exist: a live route answers
   * 404 "not found" from its own lookup, while a route that was never mounted —
   * or whose controller function was renamed — answers 404 from Express itself.
   * The two are told apart by the body: ours is JSON with an `error`, Express's
   * is HTML. Nothing can be mutated, because no such job exists.
   */
  const ghost = `WO-NOPE-${STAMP}`;
  const posts = ['assign', 'allocate', 'accept', 'decline', 'schedule', 'start',
    'complete', 'verify', 'raise-invoice', 'pay-provider'];

  for (const key of [LINES.DEFAULT_SERVICE_LINE, 'air_conditioning', 'residential_interior_design']) {
    const dead = [];
    for (const action of posts) {
      const r = await req('POST', `${baseFor(key)}/${ghost}/${action}`, { ...asLine(key), body: {} });
      // 404 with a JSON error is the handler refusing; a raw HTML body means no
      // route is mounted there at all.
      const handled = r.status !== 404 || (r.body && !r.body._raw);
      if (!handled) dead.push(action);
    }
    ok(dead.length === 0, `${key}: every lifecycle endpoint is mounted`,
      dead.join(', ') || `${posts.length} endpoints answered`);
  }
}

async function portalWiring() {
  console.log('\n-- The desk half of the provider conversation, per line --');

  for (const key of keys) {
    if ((lineOf(key).delivery_model || 'provider') !== 'provider') continue;
    const r = await req('GET', '/api/wt-ops/portal-threads', asLine(key));
    ok(r.status === 200, `${key}: portal threads answer`, `HTTP ${r.status}`);
    const threads = rowsOf(r.body);
    ok(typeof r.body?.summary?.threads === 'number',
      `${key}: threads come with a waiting count`, JSON.stringify(r.body?.summary || {}));

    // A thread must be openable — a listed thread whose detail 404s is a dead
    // row in the desk's inbox.
    const withParty = threads.find((t) => t.provider_id);
    if (withParty) {
      const one = await req('GET',
        `/api/wt-ops/portal-threads/provider/${withParty.provider_id}`, asLine(key));
      ok(one.status === 200, `${key}: a listed thread opens`, `HTTP ${one.status}`);
    } else {
      ok(true, `${key}: no linked thread to open`, `${threads.length} thread(s)`);
    }
  }
}

function frontendParity() {
  console.log('\n-- The console path map must cover every configured line --');
  const apiSrc = fs.readFileSync(
    path.join(__dirname, '..', '..', '..', 'admin-portal', 'src', 'services', 'api.js'), 'utf8',
  );

  /*
   * The frontend derives X-Service-Line from the URL. A line the map does not
   * know silently falls back to water_tank, so its console would show another
   * line's jobs with no error anywhere — the worst kind of failure, because it
   * looks like it works.
   */
  const missing = [];
  const wrong = [];
  for (const key of keys) {
    if (key === LINES.DEFAULT_SERVICE_LINE) continue; // the default needs no fragment
    if (!apiSrc.includes(`'${key}'`)) { missing.push(key); continue; }
    const routeBase = lineOf(key).route_base;
    if (!routeBase) continue;
    const esc = routeBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`\\['/${esc}'\\s*,\\s*'${key}'\\]`).test(apiSrc)) wrong.push(`${key}→/${routeBase}`);
  }
  ok(missing.length === 0, 'every non-default line is in the frontend path map',
    missing.join(',') || `${keys.length - 1} mapped`);
  ok(wrong.length === 0, 'each fragment matches the line\'s configured route_base',
    wrong.join(', ') || 'all aligned');

  // The console reads jobs from the shared mount; if a line's config named a
  // mount that does not exist, its screens would 404 while the config looked fine.
  const bad = keys.filter((k) => (lineOf(k).api_base || 'wt') !== 'wt');
  ok(bad.length === 0, 'every line names the shared /api/wt-* mount it actually calls',
    bad.map((k) => `${k}:${lineOf(k).api_base}`).join(', ') || `${keys.length} lines`);

  /*
   * All 16 consoles render the SAME screens, so every screen's links are written
   * `/water-tank/...` and rebased to the live console by useSvcNav. A screen that
   * reaches for react-router's useNavigate directly bypasses that: on the air
   * conditioning console, opening a job would navigate to /water-tank/work-orders/
   * ACW-0001, switching console AND service line, and the job would 404 in front
   * of the operator. common.jsx is the one legitimate caller — it IS the wrapper.
   */
  const dir = path.join(__dirname, '..', '..', '..', 'admin-portal', 'src', 'screens', 'watertank');
  const offenders = [];
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.jsx?$/.test(entry.name) || entry.name === 'common.jsx') continue;
      if (/=\s*useNavigate\(\)/.test(fs.readFileSync(full, 'utf8'))) offenders.push(entry.name);
    }
  };
  walk(dir);
  ok(offenders.length === 0, 'every service-console screen navigates through useSvcNav',
    offenders.join(', ') || 'no raw useNavigate outside the wrapper');
}

(async () => {
  console.log(`\n===== WORK ORDERS — ALL SERVICE LINES (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  await perLine();
  await isolation();
  await headerDefaulting();
  await staleRows();
  routeTable();
  await lifecycleEndpoints();
  await portalWiring();
  frontendParity();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
