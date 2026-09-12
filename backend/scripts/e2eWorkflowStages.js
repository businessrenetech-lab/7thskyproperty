/**
 * e2eWorkflowStages.js — actually WORK a sales/buy SOP: tick EVERY checklist item
 * on every unlocked stage and complete the stage, looping until nothing more can
 * advance. Reports each stage, its checklist size, and the final project state
 * (and any stage still event-locked + why).
 * Usage:
 *   node scripts/e2eWorkflowStages.js [propertyId]         # properties_sale SOP
 *   node scripts/e2eWorkflowStages.js deal <dealId>        # residential_purchase SOP
 */
const http = require('http');
const PORT = Number(process.env.PORT) || 50001;
const EMAIL = process.env.E2E_EMAIL || 'admin@seventhskyproperty.com';
const PASSWORD = process.env.E2E_PASSWORD || 'Admin#2026';
const IS_DEAL = process.argv[2] === 'deal';
const ENTITY_ID = Number(IS_DEAL ? process.argv[3] : (process.argv[2] || 115));
const SOP_PATH = IS_DEAL ? `/api/sales/deals/${ENTITY_ID}/sop` : `/api/sales/properties/${ENTITY_ID}/sop`;
const LABEL = IS_DEAL ? `buy deal ${ENTITY_ID}` : `property ${ENTITY_ID}`;
let TOKEN = '';
const R = { pass: 0, fail: 0 };
const log = (s, m, d) => { R[s === 'PASS' ? 'pass' : 'fail'] += 1; console.log(`${s === 'PASS' ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}\t${m}${d !== undefined ? '  \x1b[2m' + d + '\x1b[0m' : ''}`); };
const ok = (c, m, d) => { log(c ? 'PASS' : 'FAIL', m, d); return c; };
const short = (o) => JSON.stringify(o).slice(0, 200);
function req(method, path, opts = {}) {
  return new Promise((resolve) => {
    const data = opts.body ? JSON.stringify(opts.body) : null;
    const headers = { 'X-Branch-Id': '1' };
    if (!opts.noAuth) headers.Authorization = 'Bearer ' + TOKEN;
    if (data) { headers['Content-Type'] = 'application/json'; headers['Content-Length'] = Buffer.byteLength(data); }
    const r = http.request({ host: '127.0.0.1', port: PORT, method, path, headers }, (x) => {
      let d = ''; x.on('data', (c) => { d += c; });
      x.on('end', () => { let j; try { j = JSON.parse(d); } catch { j = { _raw: d }; } resolve({ status: x.statusCode, body: j }); });
    });
    r.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    if (data) r.write(data); r.end();
  });
}
const finish = () => { console.log(`\n${'='.repeat(56)}\n${R.fail ? '\x1b[31m' : '\x1b[32m'}${R.pass} PASS / ${R.fail} FAIL\x1b[0m\n`); process.exit(R.fail ? 1 : 0); };

async function getSop() {
  const r = await req("GET", SOP_PATH);
  const d = r.body?.data || r.body;
  const proj = d.project || d;
  const stages = d.stages || proj.stages || [];
  return { projectId: proj.id, projectStatus: proj.status, stages };
}

(async () => {
  console.log(`\n===== WORKFLOW STAGE-BY-STAGE E2E (${LABEL}) =====\n`);
  const login = await req('POST', '/api/auth/login', { noAuth: true, body: { email: EMAIL, password: PASSWORD } });
  TOKEN = login.body?.token || '';
  if (!ok(!!TOKEN, 'admin login', EMAIL)) return finish();

  // Ensure the SOP exists.
  await req('POST', SOP_PATH, { body: {} });
  let { projectId, stages } = await getSop();
  if (!ok(!!projectId && stages.length > 0, 'SOP loaded', `project #${projectId}, ${stages.length} stages`)) return finish();

  // Print the full stage + checklist inventory first.
  console.log('\n--- STAGE / CHECKLIST INVENTORY ---');
  let totalItems = 0;
  for (const s of stages) {
    const cl = Array.isArray(s.checklist) ? s.checklist : [];
    totalItems += cl.length;
    console.log(`  [${s.status}]\t${s.stage_key} (${s.phase}) — ${cl.length} checklist item(s)${s.locked ? ' 🔒' : ''}`);
  }
  ok(totalItems > 0, 'stages carry checklist items', `${totalItems} items across ${stages.length} stages`);

  // Work loop: tick every checklist item on each in_progress/pending(unlocked) stage,
  // set it done, and let completion advance the next. Repeat until no progress.
  let worked = 0, guard = 0;
  while (guard++ < 30) {
    const sop = await getSop();
    stages = sop.stages;
    // A workable stage = not done/skipped/blocked and not locked.
    const stage = stages.find((s) => !['done', 'skipped', 'blocked'].includes(s.status) && !s.locked);
    if (!stage) break;
    const checklist = (Array.isArray(stage.checklist) ? stage.checklist : []).map((it) => ({ ...it, done: true }));
    const upd = await req('PATCH', `/api/projects/${projectId}/stages/${stage.id}`, { body: { checklist, status: 'done' } });
    if (![200, 201].includes(upd.status)) { ok(false, `complete stage ${stage.stage_key}`, `HTTP ${upd.status} ${short(upd.body)}`); break; }
    worked += 1;
    log('PASS', `stage completed: ${stage.stage_key}`, `${checklist.length} items ticked`);
  }

  // Final state.
  const finalSop = await getSop();
  const done = finalSop.stages.filter((s) => s.status === 'done').length;
  const blocked = finalSop.stages.filter((s) => s.status === 'blocked');
  const remaining = finalSop.stages.filter((s) => !['done', 'skipped'].includes(s.status));
  ok(worked > 0, 'worked through unlocked stages', `${worked} completed`);
  ok(done >= 1, 'stages marked done', `${done}/${finalSop.stages.length} done`);
  console.log(`\n--- FINAL STATE — project status: ${finalSop.projectStatus} ---`);
  finalSop.stages.forEach((s) => console.log(`  [${s.status}]\t${s.stage_key}${s.locked ? ` 🔒 (${s.unlock_hint || 'awaiting event'})` : ''}`));
  if (blocked.length) console.log(`\n\x1b[33mNOTE\x1b[0m ${blocked.length} stage(s) remain event-locked (unlock on their lifecycle event, not a checklist): ${blocked.map((s) => s.stage_key).join(', ')}`);
  ok(remaining.length === 0 || remaining.every((s) => s.status === 'blocked' || s.locked), 'all non-locked stages are completed', `${remaining.length} remaining (${remaining.map((s) => s.status).join('/') || 'none'})`);

  finish();
})().catch((e) => { log('FAIL', 'harness crashed', e.stack || e.message); finish(); });
