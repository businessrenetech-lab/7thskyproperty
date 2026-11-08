/**
 * Pay, review and exit rules (plan Task 25). Pure functions, no database.
 * Run from backend/: node scripts/testHrPay.js
 */
const assert = require('assert');
const {
  monthWindow, canRunMonth, unpaidDays, absentDays, payslip, settlement, reviewOverall, REVIEW_CRITERIA,
} = require('../services/hrPay.service');

// monthWindow: Hadi's getActiveWindow — the part of the month the person was employed.
{
  const full = monthWindow({ joining_date: '2025-01-10' }, 9, 2026);
  assert.deepStrictEqual(full, { start: '2026-09-01', end: '2026-09-30', activeDays: 30, daysInMonth: 30, factor: 1 });
  const joined = monthWindow({ joining_date: '2026-09-16' }, 9, 2026);
  assert.strictEqual(joined.start, '2026-09-16');
  assert.strictEqual(joined.activeDays, 15);
  assert.strictEqual(joined.factor, 0.5);
  const left = monthWindow({ joining_date: '2025-01-01', exit_date: '2026-10-10' }, 10, 2026);
  assert.strictEqual(left.end, '2026-10-10');
  assert.strictEqual(left.activeDays, 10);
  assert.strictEqual(left.daysInMonth, 31);
  assert.strictEqual(monthWindow({ joining_date: '2026-11-01' }, 10, 2026), null, 'joined after the month');
  assert.strictEqual(monthWindow({ joining_date: '2025-01-01', exit_date: '2026-09-30' }, 10, 2026), null, 'left before the month');
  assert.strictEqual(monthWindow({}, 2, 2028).daysInMonth, 29, 'leap year February');
}

// canRunMonth: a month is paid only after it has closed (Hadi canFinalizePayroll).
assert.strictEqual(canRunMonth(9, 2026, '2026-10-01'), true);
assert.strictEqual(canRunMonth(10, 2026, '2026-10-31'), false);
assert.strictEqual(canRunMonth(12, 2026, '2027-01-01'), true);
assert.strictEqual(canRunMonth(13, 2026, '2027-05-01'), false, 'no 13th month');

// unpaidDays: approved unpaid leave inside the window, off days not counted; a half day counts 0.5.
{
  const window = monthWindow({ joining_date: '2025-01-01' }, 10, 2026);
  const closed = new Set(['2026-10-02', '2026-10-09']);   // Fridays
  const leaves = [
    { start_date: '2026-10-01', end_date: '2026-10-03', total_days: 2, is_paid: false },   // 1 and 3 (2 is closed)
    { start_date: '2026-10-12', end_date: '2026-10-12', total_days: 0.5, is_paid: false }, // half day
    { start_date: '2026-10-20', end_date: '2026-10-21', total_days: 2, is_paid: true },    // paid: not counted
    { start_date: '2026-09-29', end_date: '2026-10-01', total_days: 3, is_paid: false },   // only 1 Oct is inside, already counted
  ];
  assert.strictEqual(unpaidDays(leaves, window, closed), 2.5);
  assert.strictEqual(unpaidDays([{ start_date: '2026-11-02', end_date: '2026-11-03', total_days: 2, is_paid: false }], window, closed), 0);
}

// absentDays: shown on the payslip for HR, never deducted by itself (Hadi deducts absence only as an adjustment).
{
  const window = monthWindow({ joining_date: '2025-01-01' }, 10, 2026);
  const attendance = [
    { date: '2026-10-05', status: 'absent' }, { date: '2026-10-06', status: 'half_day' },
    { date: '2026-10-07', status: 'present' }, { date: '2026-10-09', status: 'absent' },   // closed day
    { date: '2026-10-14', status: 'absent' },                                               // on paid leave
  ];
  const leaves = [{ start_date: '2026-10-14', end_date: '2026-10-14', total_days: 1, is_paid: true }];
  assert.strictEqual(absentDays(attendance, window, new Set(['2026-10-09']), leaves), 1.5);
}

// payslip: basic and allowances pro-rated, unpaid days at basic / days in month, net never below 0.
{
  const employee = { basic_salary: '30000.00', allowances: [{ name: 'House rent', amount: 9000 }, { name: 'Transport', amount: '1500' }],
    deduction_rules: [{ name: 'Provident fund', amount: 1000 }, { name: 'Union fee', rule: '1% of basic' }] };
  const window = { start: '2026-09-01', end: '2026-09-30', activeDays: 30, daysInMonth: 30, factor: 1 };
  const adjustments = [
    { id: 1, direction: 'bonus', type: 'festival_bonus', amount: '15000' },
    { id: 2, direction: 'deduction', type: 'loan_repayment', amount: 2000 },
  ];
  const p = payslip(employee, window, { unpaidDays: 3, absentDays: 1, adjustments });
  assert.strictEqual(p.basic, 30000);
  assert.strictEqual(p.allowances_total, 10500);
  assert.strictEqual(p.bonus_total, 15000);
  assert.strictEqual(p.gross, 55500);
  assert.strictEqual(p.deduction_total, 3000 + 1000 + 2000, 'unpaid 3 × 1000 + provident fund + loan');
  assert.strictEqual(p.net, 49500);
  assert.strictEqual(p.unpaid_days, 3);
  assert.ok(p.lines.some((l) => l.label === 'Union fee' && l.amount === 0 && l.note === '1% of basic'), 'a rule without an amount is listed, not guessed');
  assert.ok(p.lines.some((l) => l.label === 'Unpaid leave (3 days)' && l.amount === 3000));
  assert.ok(p.lines.some((l) => l.kind === 'info' && l.label === 'Absent days' && l.value === 1));
  assert.deepStrictEqual(p.adjustment_ids, [1, 2]);

  const half = payslip(employee, { ...window, activeDays: 15, factor: 0.5 }, { unpaidDays: 0, adjustments: [] });
  assert.strictEqual(half.basic, 15000);
  assert.strictEqual(half.allowances_total, 5250);

  const nothing = payslip({ basic_salary: 1000 }, window, { unpaidDays: 0, adjustments: [{ id: 3, direction: 'deduction', type: 'disciplinary_fine', amount: 5000 }] });
  assert.strictEqual(nothing.net, 0, 'net never below 0');
  assert.strictEqual(payslip({}, window, {}).net, 0, 'no salary on file: 0, not NaN');
}

// settlement: the exit month to the last working day, less what is still owed on a loan.
{
  const employee = { basic_salary: 31000, allowances: [], deduction_rules: [], loan_balance: '4000.00', joining_date: '2024-01-01' };
  const s = settlement(employee, { last_working_day: '2026-10-10' }, { unpaidDays: 0, adjustments: [] });
  assert.strictEqual(s.payslip.basic, 10000);
  assert.strictEqual(s.loan_outstanding, 4000);
  assert.strictEqual(s.total, 6000);
  const owes = settlement({ ...employee, loan_balance: 20000 }, { last_working_day: '2026-10-10' }, {});
  assert.strictEqual(owes.total, -10000, 'a negative total is what the employee still owes');
}

// reviews: Hadi's six criteria, 1–5 each; the overall is their mean to one decimal.
assert.deepStrictEqual(REVIEW_CRITERIA, ['Punctuality', 'Teamwork', 'Technical Skills', 'Communication', 'Initiative', 'Reliability']);
assert.strictEqual(reviewOverall({ Punctuality: 5, Teamwork: 4, 'Technical Skills': 4, Communication: 3, Initiative: 4, Reliability: 5 }), 4.2);
assert.strictEqual(reviewOverall({ Punctuality: 5 }), null, 'every criterion must be rated');
assert.strictEqual(reviewOverall({ Punctuality: 6, Teamwork: 4, 'Technical Skills': 4, Communication: 3, Initiative: 4, Reliability: 5 }), null, 'ratings are 1 to 5');

console.log('testHrPay: all passed');
