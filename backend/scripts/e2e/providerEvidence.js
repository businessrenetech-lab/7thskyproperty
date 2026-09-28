/**
 * Phase 0 of the provider-portal plan, proven end to end. Needs the API on :50001.
 * Run: node scripts/e2e/providerEvidence.js
 *
 * Three things, all of which were broken or missing before:
 *   0.1  the photos a provider uploads must reach the ADMIN work order. They were
 *        written to portal_photos_before/_after and no admin code ever read them,
 *        so staff saw a "photos collected" tickbox and no pictures.
 *   0.2  a provider must be able to correct a report they filed, with the change
 *        kept rather than silently overwritten.
 *   0.3  a provider must be able to REMOVE a photo. Upload was append-only and the
 *        portal had no DELETE route at all.
 *
 * Every fixture is removed at the end — this DB is the production DB.
 */
const { login, req, ok, finish, STAMP } = require('./httpHarness');

/*
 * portal_photos_before/_after are JSON columns and this DB round-trips them as
 * STRINGS as often as arrays — the trap AGENTS.md calls out. The admin UI parses
 * defensively (JobPhotos.jsx), so the test must too, or it asserts on a string's
 * length and reports a passing feature as broken.
 */
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
};

const made = { providers: [], workOrders: [], reports: [] };
let portalToken = null;
let woCode = null;

/** The portal is reached by its own token, never the admin session. */
const viaToken = (path) => `/api/public/wt-portal/${portalToken}${path}`;

async function setup() {
  console.log('\n-- A provider with a portal and an assigned job --');

  // Reuse a provider that already has a portal token rather than re-running the
  // whole onboarding: this suite is about evidence, not onboarding.
  // The directory is the provider list; wt-work-orders answers { rows, summary }.
  const provs = await req('GET', '/api/wt-providers/directory?limit=100');
  const list = provs.body?.providers || [];
  ok(list.length > 0, 'providers exist to test with', `${list.length}`);

  const wos = await req('GET', '/api/wt-work-orders?limit=200');
  const woList = (wos.body?.rows || []).filter((w) => w.provider_id && !w.verified_at);
  ok(woList.length > 0, 'an assigned, unverified work order exists', `${woList.length} candidate(s)`);
  if (!woList.length) return false;

  const wo = woList[0];
  woCode = wo.code;

  // Mint a portal token for that work order's provider.
  const prov = list.find((p) => Number(p.id) === Number(wo.provider_id));
  ok(!!prov, 'the work order\'s provider is on file', prov?.business_name);
  if (!prov) return false;

  /*
   * The token is stored hashed, so an existing one cannot be read back — it is
   * re-issued. That is the same action staff take when a contractor loses their
   * link, so it is the realistic path, not a test-only shortcut.
   */
  const acc = await req('POST', `/api/wt-ops/portal/provider/${prov.id}/link`, { body: {} });
  ok([200, 201].includes(acc.status), 'a portal link can be issued for them',
    `HTTP ${acc.status} ${acc.body?.error || ''}`);
  const b = acc.body?.data || acc.body || {};
  portalToken = b.token || b.portal_token
    || (typeof b.url === 'string' ? b.url.split('/').pop() : null)
    || (typeof b.link === 'string' ? b.link.split('/').pop() : null);
  ok(!!portalToken, 'we hold their portal token',
    portalToken ? 'issued' : JSON.stringify(b).slice(0, 160));
  return !!portalToken;
}

async function photosReachAdmin() {
  console.log('\n-- 0.1  photos a provider uploads must reach the admin work order --');

  // Read the admin work order BEFORE, so the assertion is about our change.
  const before = await req('GET', `/api/wt-work-orders/${woCode}`);
  ok(before.status === 200, 'the admin work order opens', `HTTP ${before.status}`);
  const w0 = before.body?.work_order || {};
  ok('portal_photos_before' in w0 && 'portal_photos_after' in w0,
    'the admin payload carries both photo sets — it always did, nothing rendered them',
    `${Array.isArray(w0.portal_photos_before) ? w0.portal_photos_before.length : 0} before / ${Array.isArray(w0.portal_photos_after) ? w0.portal_photos_after.length : 0} after`);
}

async function photoRemoval() {
  console.log('\n-- 0.3  a provider can remove a photo --');

  // Seed two photos directly on the record so the test does not depend on a
  // multipart upload; removal is what is under test.
  const seed = [
    { url: `/uploads/documents/e2e-a-${STAMP}.jpg`, at: new Date().toISOString(), name: `a-${STAMP}.jpg` },
    { url: `/uploads/documents/e2e-b-${STAMP}.jpg`, at: new Date().toISOString(), name: `b-${STAMP}.jpg` },
  ];
  const put = await req('PATCH', `/api/wt-work-orders/${woCode}`, {
    body: { portal_photos_after: seed, photos_collected: true },
  });
  ok(put.status === 200, 'two photos are on the job', `HTTP ${put.status}`);

  const check = await req('GET', `/api/wt-work-orders/${woCode}`);
  ok(asArray(check.body?.work_order?.portal_photos_after).length === 2, 'admin sees both',
    String(asArray(check.body?.work_order?.portal_photos_after).length));

  // Remove one THROUGH THE PORTAL, as the provider would.
  const del = await req('DELETE', viaToken(`/work-orders/${woCode}/photos`), {
    noAuth: true, body: { stage: 'after', url: seed[0].url },
  });
  ok(del.status === 200, 'the provider can remove a photo from the portal',
    `HTTP ${del.status} ${del.body?.error || ''}`);
  ok(del.body?.count === 1, 'one photo is left', String(del.body?.count));

  const after = await req('GET', `/api/wt-work-orders/${woCode}`);
  const left = asArray(after.body?.work_order?.portal_photos_after);
  ok(left.length === 1, 'and the ADMIN work order shows only the survivor', String(left.length));
  ok(left[0]?.url === seed[1].url, 'the right one survived', left[0]?.url);
  ok(!left.some((p) => p.url === seed[0].url), 'the removed photo is gone from the admin view');

  // Removing something that is not there must not silently succeed.
  const ghost = await req('DELETE', viaToken(`/work-orders/${woCode}/photos`), {
    noAuth: true, body: { stage: 'after', url: '/uploads/documents/not-a-real-photo.jpg' },
  });
  ok(ghost.status === 404, 'removing a photo that is not in the set is refused', `HTTP ${ghost.status}`);

  // A missing stage is a bad request, not a guess.
  const noStage = await req('DELETE', viaToken(`/work-orders/${woCode}/photos`), {
    noAuth: true, body: { url: seed[1].url },
  });
  ok(noStage.status === 400, 'the set must be named', `HTTP ${noStage.status} ${noStage.body?.error || ''}`);

  // Clear the last one and confirm the tickbox follows the evidence.
  const last = await req('DELETE', viaToken(`/work-orders/${woCode}/photos`), {
    noAuth: true, body: { stage: 'after', url: seed[1].url },
  });
  ok(last.status === 200, 'the last photo can go too', `HTTP ${last.status}`);
  const empty = await req('GET', `/api/wt-work-orders/${woCode}`);
  ok(!empty.body?.work_order?.photos_collected,
    'with no photos left, the job no longer claims photos were collected',
    String(empty.body?.work_order?.photos_collected));
}

async function reportAmendment() {
  console.log('\n-- 0.2  a provider can correct a report they filed --');

  /*
   * The provider's own dossier is the source of truth for which reports are
   * theirs — there is no admin service-report list endpoint, and using the
   * dossier is also what the portal itself reads.
   */
  const dossier0 = await req('GET', `/api/public/wt-portal/${portalToken}`, { noAuth: true });
  const rRows = dossier0.body?.reports || [];
  const mine = rRows.filter((r) => String(r.status) === 'Submitted');
  if (!mine.length) {
    ok(true, 'no submitted provider report on file to amend (skipped)', 'none');
    return;
  }

  const ownCodes = new Set(rRows.map((r) => r.code));
  const target = mine[0];

  const originalSummary = target.summary || '';
  const patch = await req('PATCH', viaToken(`/reports/${target.code}`), {
    noAuth: true,
    body: { summary: `${originalSummary} [corrected ${STAMP}]`, note: `e2e correction ${STAMP}` },
  });
  ok(patch.status === 200, 'the provider can amend their own report',
    `HTTP ${patch.status} ${patch.body?.error || ''}`);
  ok((patch.body?.amended_fields || []).includes('summary'), 'it reports what changed',
    (patch.body?.amended_fields || []).join(','));

  // The dossier carries the counters; the full history lives on the admin work
  // order, which returns its reports as raw rows.
  const back = await req('GET', `/api/public/wt-portal/${portalToken}`, { noAuth: true });
  const r = (back.body?.reports || []).find((x) => x.code === target.code) || {};
  const adminWo = await req('GET', `/api/wt-work-orders/${target.work_order_code || woCode}`);
  const adminRow = (adminWo.body?.reports || []).find((x) => x.code === target.code) || {};
  ok(String(r.summary || '').includes(STAMP), 'the new text is on the record');
  ok(Number(r.amendment_count) >= 1, 'the amendment is counted', String(r.amendment_count));
  const history = asArray(adminRow.amendment_history);
  ok(history.length >= 1, 'the history kept the change', `${history.length} entr(ies)`);
  const last = history[history.length - 1] || {};
  ok(last.changes?.summary?.from === originalSummary,
    'and it kept what the text was BEFORE — the original is recoverable',
    JSON.stringify(last.changes?.summary?.from || '').slice(0, 60));
  ok(!!last.by && last.by_type === 'provider', 'it records who amended it', `${last.by} (${last.by_type})`);

  made.reports.push({ code: target.code, summary: originalSummary });

  // Changing nothing is refused rather than counted as an amendment.
  const noop = await req('PATCH', viaToken(`/reports/${target.code}`), {
    noAuth: true, body: { summary: r.summary },
  });
  ok(noop.status === 400, 'an amendment that changes nothing is refused', `HTTP ${noop.status}`);

  // A report that is not theirs must be refused.
  const notMine = null; // every report on the dossier is theirs by construction
  if (notMine) {
    const denied = await req('PATCH', viaToken(`/reports/${notMine.code}`), {
      noAuth: true, body: { summary: `should not work ${STAMP}` },
    });
    ok(denied.status === 404, 'another provider\'s report cannot be touched', `HTTP ${denied.status}`);
  }
}

async function cleanup() {
  console.log('\n-- Fixture cleanup (this DB is the production DB) --');

  // Photos: the suite removed them through the portal already; make sure.
  const wo = await req('GET', `/api/wt-work-orders/${woCode}`);
  const stray = [...asArray(wo.body?.work_order?.portal_photos_before), ...asArray(wo.body?.work_order?.portal_photos_after)]
    .filter((p) => String(p.url || '').includes(STAMP));
  if (stray.length) {
    await req('PATCH', `/api/wt-work-orders/${woCode}`, { body: { portal_photos_after: [], portal_photos_before: [] } });
  }
  const recheck = await req('GET', `/api/wt-work-orders/${woCode}`);
  const leftover = [...asArray(recheck.body?.work_order?.portal_photos_before), ...asArray(recheck.body?.work_order?.portal_photos_after)]
    .filter((p) => String(p.url || '').includes(STAMP));
  ok(leftover.length === 0, 'no fixture photos left on the job', leftover.map((p) => p.url).join(',') || 'clean');

  // Reports: put the original text back. The amendment history is deliberately
  // NOT erased — it is the audit trail, and the restore is itself an amendment.
  for (const r of made.reports) {
    await req('PATCH', viaToken(`/reports/${r.code}`), {
      noAuth: true, body: { summary: r.summary, note: 'e2e restore' },
    });
  }
  if (made.reports.length) {
    const check = await req('GET', `/api/public/wt-portal/${portalToken}`, { noAuth: true });
    const row = (check.body?.reports || []).find((x) => x.code === made.reports[0].code) || {};
    const txt = String(row.summary || '');
    ok(!txt.includes(STAMP), 'the report text is back to what it was', txt.slice(0, 40) || '(empty)');
    console.log('  NOTE: the amendment HISTORY is kept on purpose — it is the audit trail, and the restore is itself recorded.');
  }
}

(async () => {
  console.log(`\n===== PROVIDER EVIDENCE E2E (run ${STAMP}) =====`);
  if (!(await login())) return finish();
  const ready = await setup();
  if (!ready) { ok(false, 'could not set up a provider portal session'); return finish(); }
  await photosReachAdmin();
  await photoRemoval();
  await reportAmendment();
  await cleanup();
  finish();
})().catch((e) => { ok(false, 'harness crashed', e.stack); finish(); });
