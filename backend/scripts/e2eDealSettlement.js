/*
 * Deal settlement & disbursement end-to-end verification harness (throwaway).
 * Mirrors backend/scripts/e2ePmJourney.js in structure (node global fetch, a
 * login helper, small helpers to unwrap `{ data: ... }` envelopes) but asserts
 * hard pass/fail per step instead of only logging findings, prints a final
 * "N PASS / M FAIL" summary, and exits 1 if anything failed.
 */
const BASE = 'http://127.0.0.1:50001';

let pass = 0;
let fail = 0;
const failures = [];
function assert(cond, label, detail) {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; failures.push({ label, detail }); console.log(`  FAIL  ${label}  ${detail || ''}`); }
}

const j = async (r) => { try { return await r.json(); } catch { return {}; } };
const login = (e, p) => fetch(BASE + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: e, password: p }),
}).then((r) => r.json());

let A; // admin token
const H = () => ({ Authorization: 'Bearer ' + A, 'X-Branch-Id': '1', 'Content-Type': 'application/json' });
const req = async (m, p, body) => {
  const r = await fetch(BASE + p, { method: m, headers: H(), ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await j(r);
  return { status: r.status, ok: r.ok, data };
};
const GET = (p) => req('GET', p);
const POST = (p, b) => req('POST', p, b || {});
const PUT = (p, b) => req('PUT', p, b || {});
// Most deal endpoints wrap the record in { data: {...} }; unwrap one level.
const rec = (res) => (res.data && res.data.data !== undefined) ? res.data.data : res.data;

(async () => {
  console.log('── STEP 1: login admin ──');
  const loginRes = await login('admin@seventhskyproperty.com', 'Admin#2026');
  A = loginRes.token;
  assert(!!A, 'login admin → token', JSON.stringify(loginRes).slice(0, 160));
  if (!A) return dump();

  console.log('── STEP 2: create sell deal #1 ──');
  const d1 = await POST('/api/deals', { deal_type: 'sell', sale_price: 1000000 });
  const deal1 = rec(d1);
  assert(d1.status === 201 && !!(deal1 && deal1.id), 'create deal 1 → 201', `${d1.status} ${JSON.stringify(d1.data).slice(0, 200)}`);
  const dealId = deal1 && deal1.id;
  if (!dealId) return dump();
  console.log(`  deal #1 id=${dealId} code=${deal1.deal_code}`);

  console.log('── STEP 3: sign contract ──');
  const sign1 = await PUT(`/api/deals/${dealId}`, { contract_status: 'signed' });
  assert(sign1.status === 200, 'PUT contract_status=signed → 200', `${sign1.status} ${JSON.stringify(sign1.data).slice(0, 200)}`);

  console.log('── STEP 4: prepare settlement ──');
  const prep1 = await POST(`/api/deals/${dealId}/settlement/prepare`, { expected_commission: 10000 });
  assert(prep1.status === 200, 'prepare expected_commission=10000 → 200', `${prep1.status} ${JSON.stringify(prep1.data).slice(0, 200)}`);

  console.log('── STEP 5: GET settlement (before receive) ──');
  const s1 = await GET(`/api/deals/${dealId}/settlement`);
  const m1 = s1.data && s1.data.data && s1.data.data.money;
  assert(s1.status === 200, 'GET settlement → 200', `${s1.status}`);
  assert(!!m1 && m1.statuses && m1.statuses.contract === 'signed', 'money.statuses.contract == "signed"', `statuses=${JSON.stringify(m1 && m1.statuses)}`);
  assert(!!m1 && m1.next_action && m1.next_action.key === 'receive', 'next_action.key == "receive" (money not yet received)', `next_action=${JSON.stringify(m1 && m1.next_action)}`);

  console.log('── STEP 6: receive commission ──');
  const recv1 = await POST(`/api/deals/${dealId}/settlement/receive`, { amount: 10000, kind: 'commission', method: 'bank_transfer' });
  assert(recv1.status === 201, 'receive {amount:10000, kind:commission} → 201', `${recv1.status} ${JSON.stringify(recv1.data).slice(0, 200)}`);
  const s2 = await GET(`/api/deals/${dealId}/settlement`);
  const m2 = s2.data && s2.data.data && s2.data.data.money;
  assert(!!m2 && Number(m2.received) === 10000, 'money.received == 10000', `received=${m2 && m2.received}`);
  assert(!!m2 && m2.statuses && m2.statuses.payment === 'received', 'statuses.payment == "received"', `statuses=${JSON.stringify(m2 && m2.statuses)}`);

  console.log('── STEP 7: approve settlement ──');
  const appr1 = await POST(`/api/deals/${dealId}/settlement/approve`);
  assert(appr1.status === 200, 'approve → 200', `${appr1.status} ${JSON.stringify(appr1.data).slice(0, 200)}`);

  console.log('── STEP 8: create disbursement ──');
  const disbBody = { payee_type: 'agent', payee_name: 'Agent A', amount: 3000, reference: 'X' };
  const disb1 = await POST(`/api/deals/${dealId}/disbursements`, disbBody);
  const disb1Rec = rec(disb1);
  assert(disb1.status === 201, 'create disbursement (agent, 3000) → 201', `${disb1.status} ${JSON.stringify(disb1.data).slice(0, 200)}`);
  const did = disb1Rec && disb1Rec.id;

  console.log('── STEP 9: duplicate disbursement guard ──');
  const disbDup = await POST(`/api/deals/${dealId}/disbursements`, disbBody);
  assert(disbDup.status === 409, 'identical disbursement again → 409 (duplicate guard)', `${disbDup.status} ${JSON.stringify(disbDup.data).slice(0, 200)}`);

  console.log('── STEP 10: pay disbursement ──');
  if (did) {
    const pay1 = await POST(`/api/deals/${dealId}/disbursements/${did}/pay`);
    assert(pay1.status === 200, 'pay disbursement → 200', `${pay1.status} ${JSON.stringify(pay1.data).slice(0, 200)}`);
  } else {
    assert(false, 'pay disbursement → 200', 'no disbursement id captured from step 8');
  }
  const s3 = await GET(`/api/deals/${dealId}/settlement`);
  const m3 = s3.data && s3.data.data && s3.data.data.money;
  assert(!!m3 && Number(m3.disbursed) === 3000, 'money.disbursed == 3000', `disbursed=${m3 && m3.disbursed}`);
  assert(!!m3 && Number(m3.net_held) === 7000, 'money.net_held == 7000', `net_held=${m3 && m3.net_held}`);
  assert(!!m3 && m3.statuses && m3.statuses.disbursement === 'partial', 'statuses.disbursement == "partial"', `statuses=${JSON.stringify(m3 && m3.statuses)}`);

  console.log('── STEP 11: approval gate on a second, unapproved deal ──');
  const d2 = await POST('/api/deals', { deal_type: 'sell', sale_price: 500000 });
  const deal2 = rec(d2);
  const dealId2 = deal2 && deal2.id;
  assert(d2.status === 201 && !!dealId2, 'create deal 2 → 201', `${d2.status} ${JSON.stringify(d2.data).slice(0, 200)}`);
  if (dealId2) {
    console.log(`  deal #2 id=${dealId2} code=${deal2.deal_code}`);
    const prep2 = await POST(`/api/deals/${dealId2}/settlement/prepare`, { expected_commission: 5000 });
    assert(prep2.status === 200, 'deal2 prepare {expected_commission:5000} → 200', `${prep2.status} ${JSON.stringify(prep2.data).slice(0, 200)}`);
    const recv2 = await POST(`/api/deals/${dealId2}/settlement/receive`, { amount: 5000, kind: 'commission', method: 'bank_transfer' });
    assert(recv2.status === 201, 'deal2 receive 5000 → 201', `${recv2.status} ${JSON.stringify(recv2.data).slice(0, 200)}`);
    // Deliberately NOT approved.
    const disb2 = await POST(`/api/deals/${dealId2}/disbursements`, { payee_type: 'agent', payee_name: 'Agent B', amount: 1000, reference: 'Y' });
    const disb2Rec = rec(disb2);
    assert(disb2.status === 201, 'deal2 create disbursement → 201', `${disb2.status} ${JSON.stringify(disb2.data).slice(0, 200)}`);
    const did2 = disb2Rec && disb2Rec.id;
    if (did2) {
      const pay2 = await POST(`/api/deals/${dealId2}/disbursements/${did2}/pay`);
      assert(pay2.status === 400, 'pay disbursement before approval → 400 (approval gate)', `${pay2.status} ${JSON.stringify(pay2.data).slice(0, 200)}`);
    } else {
      assert(false, 'pay disbursement before approval → 400 (approval gate)', 'no disbursement id captured on deal 2');
    }
  } else {
    assert(false, 'approval gate scenario', 'deal 2 was not created; skipped');
  }

  console.log('── STEP 12: settle deal #1 ──');
  const settle1 = await POST(`/api/deals/${dealId}/settle`);
  assert(settle1.status === 200, 'settle deal 1 → 200', `${settle1.status} ${JSON.stringify(settle1.data).slice(0, 200)}`);
  const s4 = await GET(`/api/deals/${dealId}/settlement`);
  const deal1After = s4.data && s4.data.data && s4.data.data.deal;
  assert(!!deal1After && deal1After.settlement_status === 'settled', 'deal.settlement_status == "settled"', `settlement_status=${deal1After && deal1After.settlement_status}`);

  console.log('── STEP 13: bulk-data ──');
  const bulk = await GET('/api/deals/settlement/bulk-data');
  assert(bulk.status === 200, 'GET settlement/bulk-data → 200', `${bulk.status} ${JSON.stringify(bulk.data).slice(0, 200)}`);
  const summary = bulk.data && bulk.data.summary;
  assert(!!summary && typeof summary === 'object', 'bulk-data returns a summary object', `summary=${JSON.stringify(summary)}`);

  dump();
})().catch((e) => {
  console.error('HARNESS ERROR', e);
  fail++;
  failures.push({ label: 'harness crashed', detail: e && e.stack || String(e) });
  dump();
});

function dump() {
  console.log('\n===== SUMMARY =====');
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f.label}: ${f.detail}`));
  }
  console.log(`\n${pass} PASS / ${fail} FAIL`);
  process.exitCode = fail > 0 ? 1 : 0;
  setTimeout(() => process.exit(process.exitCode), 200);
}
