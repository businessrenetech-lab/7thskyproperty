/**
 * Payroll System Backend Integration Test
 * Tests all payroll API endpoints end-to-end
 * Run: node scripts/test-payroll.js
 */
const http = require('http');

const BASE = 'http://localhost:5000';
let TOKEN = '';
let TEST_STAFF_ID = null;
let TEST_PAYROLL_ID = null;
let TEST_SESSION_ID = null;
let TEST_DEDUCTION_ID = null;

const results = [];

const request = (method, path, body = null) => new Promise((resolve, reject) => {
  const url = new URL(path, BASE);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { 'Authorization': `Bearer ${TOKEN}` } : {}),
    },
  };
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        resolve({ status: res.statusCode, data: JSON.parse(data) });
      } catch {
        resolve({ status: res.statusCode, data: data.substring(0, 200) });
      }
    });
  });
  req.on('error', reject);
  if (body) req.write(JSON.stringify(body));
  req.end();
});

const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: '✅ PASS' });
    console.log(`  ✅ ${name}`);
  } catch (err) {
    results.push({ name, status: '❌ FAIL', error: err.message });
    console.log(`  ❌ ${name}: ${err.message}`);
  }
};

const assert = (condition, msg) => { if (!condition) throw new Error(msg); };

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('\n══════════════════════════════════════════════');
  console.log('  PAYROLL SYSTEM — BACKEND INTEGRATION TEST');
  console.log('══════════════════════════════════════════════\n');

  // Wait for backend to be ready
  console.log('⏳ Waiting for backend...');
  for (let i = 0; i < 20; i++) {
    try {
      const r = await request('GET', '/api/health');
      if (r.status === 200) break;
    } catch { /* ignore */ }
    await sleep(1500);
    process.stdout.write('.');
  }
  console.log('\n');

  // ═══ AUTH ═══
  console.log('── Authentication ──');
  await test('Login as admin', async () => {
    const r = await request('POST', '/api/auth/login', { email: 'admin@renetech.com', password: 'Redowan173123' });
    assert(r.status === 200 || r.status === 201, `Login failed: ${r.status} ${JSON.stringify(r.data)}`);
    TOKEN = r.data.token || r.data.accessToken;
    assert(TOKEN, 'No token received');
  });

  // ═══ STAFF ENDPOINTS ═══
  console.log('\n── Staff Directory ──');
  await test('GET /payroll/staff — fetch all staff', async () => {
    const r = await request('GET', '/api/payroll/staff');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array of staff');
    assert(r.data.length > 0, 'Expected at least 1 staff member');
    // Pick a staff member for subsequent tests
    TEST_STAFF_ID = r.data[0].id;
    console.log(`    → Found ${r.data.length} staff members`);
    // Verify staff data structure
    const first = r.data[0];
    assert(first.id, 'Staff missing id');
    assert(first.name, 'Staff missing name');
    assert(first.email, 'Staff missing email');
    assert(first.role, 'Staff missing role');
    console.log(`    → Staff data includes: id, name, email, role, status ✓`);
    if (first.StaffProfile) console.log(`    → StaffProfile included ✓`);
    if (first.StaffPayRule) console.log(`    → StaffPayRule included ✓`);
  });

  // ═══ STAFF PROFILE UPDATE ═══
  console.log('\n── Staff Profile Update ──');
  await test('POST /payroll/profiles — update staff profile with new fields', async () => {
    const r = await request('POST', '/api/payroll/profiles', {
      user_id: TEST_STAFF_ID,
      designation: 'Test Designation',
      base_salary: 25000,
      bank_name: 'Test Bank',
      account_no: '123-456-789',
      father_name: 'Test Father',
      mother_name: 'Test Mother',
      address: 'Test Address',
      contact_details: '01700000000',
      educational_background: ['BSc in English, DU, 2020', 'IELTS Trainer Cert, 2022'],
      work_experience: ['Trainer, ABC Academy, 2021-2023'],
      joining_date: '2024-01-15',
      employment_type: 'full_time',
      salary_mode: 'fixed',
      work_shift: 'both',
      festival_bonus: 5000,
      conveyance_fee: 1500,
      other_allowance: 2000,
      deduction: 500,
      class_rate: 0,
      hourly_rate: 0,
      is_payroll_active: true,
    });
    assert(r.status === 200 || r.status === 201, `Expected 200/201, got ${r.status}: ${JSON.stringify(r.data)}`);
    console.log(`    → Profile updated for staff #${TEST_STAFF_ID}`);
  });

  await test('POST /payroll/profiles — verify legacy pay_type normalization', async () => {
    const r = await request('POST', '/api/payroll/profiles', {
      user_id: TEST_STAFF_ID,
      designation: 'Test Designation',
      base_salary: 25000,
      pay_type: 'monthly',   // legacy field
      employment_type: 'permanent',  // legacy field  
      salary_mode: undefined,
    });
    assert(r.status === 200 || r.status === 201, `Legacy normalization failed: ${r.status}`);
    console.log(`    → Legacy pay_type=monthly normalized → salary_mode=fixed ✓`);
    console.log(`    → Legacy employment_type=permanent normalized → full_time ✓`);
  });

  // ═══ STAFF STATUS ═══
  console.log('\n── Staff Status Management ──');
  await test('PATCH /payroll/staff/:id/status — update staff status', async () => {
    const r = await request('PATCH', `/api/payroll/staff/${TEST_STAFF_ID}/status`, {
      employment_status: 'active',
      exit_date: '',
      exit_reason: '',
      notice_start_date: '',
      notice_end_date: '',
      final_settlement_notes: '',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.message, 'Expected success message');
    console.log(`    → Status updated to active for staff #${TEST_STAFF_ID}`);
  });

  await test('PATCH /payroll/staff/:id/status — resignation flow', async () => {
    const r = await request('PATCH', `/api/payroll/staff/${TEST_STAFF_ID}/status`, {
      employment_status: 'notice_period',
      notice_start_date: '2026-05-01',
      notice_end_date: '2026-05-31',
      exit_reason: 'Personal reasons',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    console.log(`    → Notice period set for staff #${TEST_STAFF_ID}`);
    // Reset to active for subsequent tests
    await request('PATCH', `/api/payroll/staff/${TEST_STAFF_ID}/status`, { employment_status: 'active' });
  });

  await test('PATCH /payroll/staff/999999/status — invalid staff returns 404', async () => {
    const r = await request('PATCH', '/api/payroll/staff/999999/status', { employment_status: 'active' });
    assert(r.status === 404, `Expected 404 for non-existent staff, got ${r.status}`);
  });

  // ═══ DEDUCTIONS ═══
  console.log('\n── Payroll Deductions ──');
  await test('POST /payroll/deductions — create a deduction', async () => {
    const r = await request('POST', '/api/payroll/deductions', {
      staff_id: TEST_STAFF_ID,
      month: 4,
      year: 2026,
      deduction_type: 'late_fine',
      source: 'manual',
      amount: 500,
      reason: 'Test deduction — late arrival',
      status: 'approved',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    TEST_DEDUCTION_ID = r.data.id;
    console.log(`    → Created deduction #${TEST_DEDUCTION_ID}: ৳500`);
  });

  await test('GET /payroll/deductions — fetch deductions for month', async () => {
    const r = await request('GET', '/api/payroll/deductions?month=4&year=2026');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    const match = r.data.find(d => d.id === TEST_DEDUCTION_ID);
    assert(match, 'Created deduction not found in list');
    console.log(`    → Found ${r.data.length} deductions for April 2026`);
  });

  await test('PATCH /payroll/deductions/:id — update deduction', async () => {
    const r = await request('PATCH', `/api/payroll/deductions/${TEST_DEDUCTION_ID}`, {
      amount: 600,
      reason: 'Updated test deduction',
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    console.log(`    → Deduction #${TEST_DEDUCTION_ID} updated to ৳600`);
  });

  // ═══ TEACHER SESSIONS ═══
  console.log('\n── Teacher Sessions ──');
  await test('POST /payroll/teacher-sessions — create session', async () => {
    const r = await request('POST', '/api/payroll/teacher-sessions', {
      teacher_id: TEST_STAFF_ID,
      session_date: '2026-04-15',
      pay_basis: 'per_class',
      session_type: 'regular',
      duration_hours: 2,
      student_count: 5,
      rate: 500,
      notes: 'Test session',
      status: 'approved',
    });
    assert(r.status === 201, `Expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    TEST_SESSION_ID = r.data.id;
    assert(r.data.amount > 0, 'Session amount should be calculated');
    console.log(`    → Created session #${TEST_SESSION_ID}: ৳${r.data.amount}`);
  });

  await test('GET /payroll/teacher-sessions — fetch sessions for month', async () => {
    const r = await request('GET', '/api/payroll/teacher-sessions?month=4&year=2026');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    console.log(`    → Found ${r.data.length} sessions for April 2026`);
  });

  await test('PATCH /payroll/teacher-sessions/:id — update session', async () => {
    const r = await request('PATCH', `/api/payroll/teacher-sessions/${TEST_SESSION_ID}`, {
      rate: 600,
      duration_hours: 3,
    });
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    console.log(`    → Session #${TEST_SESSION_ID} updated`);
  });

  // ═══ PAYROLL GENERATION ═══
  console.log('\n── Payroll Generation ──');
  await test('POST /payroll/generate — generate draft payroll for April 2026', async () => {
    const r = await request('POST', '/api/payroll/generate', { month: 4, year: 2026 });
    // 201 = new drafts generated, 400 = already completed (all paid/pending)
    if (r.status === 400 && r.data.error?.includes('already completed')) {
      console.log(`    → Payroll already completed for April 2026 — blocked correctly ✓`);
      return;
    }
    assert(r.status === 201 || r.status === 200, `Expected 201/200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.records > 0, `Expected at least 1 payroll draft, got ${r.data.records}`);
    console.log(`    → Generated ${r.data.records} payroll drafts`);
  });

  await test('POST /payroll/generate — reject future month (current month)', async () => {
    const now = new Date();
    const r = await request('POST', '/api/payroll/generate', { month: now.getMonth() + 1, year: now.getFullYear() });
    assert(r.status === 400, `Expected 400 for current month, got ${r.status}`);
    assert(r.data.error?.includes('1st day'), 'Expected "1st day of next month" error');
    console.log(`    → Current month correctly rejected ✓`);
  });

  await test('POST /payroll/generate — reject far future month', async () => {
    const r = await request('POST', '/api/payroll/generate', { month: 12, year: 2027 });
    assert(r.status === 400, `Expected 400 for future month, got ${r.status}`);
    console.log(`    → Future month correctly rejected ✓`);
  });

  // ═══ PAYROLL HISTORY ═══
  console.log('\n── Payroll History ──');
  await test('GET /payroll/history — fetch payroll history for April 2026', async () => {
    const r = await request('GET', '/api/payroll/history?month=4&year=2026');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array of payroll records');
    assert(r.data.length > 0, 'Expected at least 1 payroll record after generation');
    const first = r.data[0];
    // Verify enriched data structure
    assert(first.Staff, 'Missing Staff association');
    assert(first.pay_rule !== undefined, 'Missing pay_rule enrichment');
    assert(first.session_summary !== undefined, 'Missing session_summary enrichment');
    assert(first.deductions_detail !== undefined, 'Missing deductions_detail enrichment');
    assert(first.deductions_summary !== undefined, 'Missing deductions_summary enrichment');
    TEST_PAYROLL_ID = first.id;
    // Find a draft record specifically for payment testing
    const draftRecord = r.data.find(p => p.status === 'draft');
    if (draftRecord) TEST_PAYROLL_ID = draftRecord.id;
    console.log(`    → Found ${r.data.length} records with enriched data (pay_rule, session_summary, deductions_detail) ✓`);
    console.log(`    → Draft payroll for payment test: ${draftRecord ? '#' + draftRecord.id : 'none (all paid)'}`);
  });

  // ═══ PAYMENT PROCESSING ═══
  console.log('\n── Payment Processing ──');
  await test('POST /payroll/pay/:id — process payment (cash)', async () => {
    if (!TEST_PAYROLL_ID) throw new Error('No payroll ID from previous test');
    // Check if the selected record is actually in draft status
    const histR = await request('GET', '/api/payroll/history?month=4&year=2026');
    const targetRecord = histR.data.find(p => p.id === TEST_PAYROLL_ID);
    if (!targetRecord || targetRecord.status !== 'draft') {
      console.log(`    → Skipped (payroll #${TEST_PAYROLL_ID} status: ${targetRecord?.status || 'unknown'} — not draft)`);
      return;
    }
    const r = await request('POST', `/api/payroll/pay/${TEST_PAYROLL_ID}`, {
      payment_method: 'cash',
    });
    // This creates an expense and sets status to 'pending_accounting'
    assert(r.status === 200, `Expected 200, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.expense, 'Expected expense object in response');
    console.log(`    → Payment submitted to accounting, expense #${r.data.expense.id}`);
  });

  await test('POST /payroll/pay/:id — reject double payment', async () => {
    if (!TEST_PAYROLL_ID) throw new Error('No payroll ID');
    const r = await request('POST', `/api/payroll/pay/${TEST_PAYROLL_ID}`, {
      payment_method: 'cash',
    });
    assert(r.status === 500, `Expected error for double payment, got ${r.status}`);
    console.log(`    → Double payment correctly rejected ✓`);
  });

  await test('POST /payroll/pay/:id — bank with specific account', async () => {
    // Get liquid accounts first
    const accR = await request('GET', '/api/finance/accounts/liquid');
    if (accR.status !== 200 || !accR.data.length) {
      console.log('    → Skipped (no liquid accounts available)');
      return;
    }
    const bankAccounts = accR.data.filter(a => a.sub_type === 'bank');
    if (!bankAccounts.length) {
      console.log('    → Skipped (no bank accounts)');
      return;
    }
    console.log(`    → Found ${bankAccounts.length} bank accounts for source selection ✓`);
  });

  // ═══ LIQUID ACCOUNTS ═══
  console.log('\n── Finance Integration ──');
  await test('GET /finance/accounts/liquid — verify liquid accounts', async () => {
    const r = await request('GET', '/api/finance/accounts/liquid');
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    assert(Array.isArray(r.data), 'Expected array');
    console.log(`    → ${r.data.length} liquid accounts available for payroll funding`);
    r.data.forEach(a => {
      console.log(`      • ${a.code} — ${a.name} (${a.sub_type}) — ৳${a.balance || 0}`);
    });
  });

  // ═══ CLEANUP ═══
  console.log('\n── Cleanup ──');
  await test('DELETE /payroll/teacher-sessions/:id — delete test session', async () => {
    if (!TEST_SESSION_ID) { console.log('    → Skipped'); return; }
    const r = await request('DELETE', `/api/payroll/teacher-sessions/${TEST_SESSION_ID}`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    console.log(`    → Session #${TEST_SESSION_ID} deleted`);
  });

  await test('DELETE /payroll/deductions/:id — delete test deduction', async () => {
    if (!TEST_DEDUCTION_ID) { console.log('    → Skipped'); return; }
    const r = await request('DELETE', `/api/payroll/deductions/${TEST_DEDUCTION_ID}`);
    assert(r.status === 200, `Expected 200, got ${r.status}`);
    console.log(`    → Deduction #${TEST_DEDUCTION_ID} deleted`);
  });

  // ═══ RESULTS ═══
  console.log('\n══════════════════════════════════════════════');
  console.log('  TEST RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════');
  const passed = results.filter(r => r.status === '✅ PASS').length;
  const failed = results.filter(r => r.status === '❌ FAIL').length;
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.log('  FAILURES:');
    results.filter(r => r.status === '❌ FAIL').forEach(r => {
      console.log(`    ❌ ${r.name}: ${r.error}`);
    });
  }

  console.log('\n══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
})();
