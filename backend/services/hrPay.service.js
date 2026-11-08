/**
 * Payroll, performance review and exit rules (plan Task 25), ported from Hadi Real Estate's payroll controller
 * (getActiveWindow, canFinalizePayroll, calculatePayrollAmounts) and PerformanceReviews. Pure functions only;
 * hrPayStore.js loads the rows and saves the result. Unit-tested by scripts/testHrPay.js.
 *
 * Dates are 'YYYY-MM-DD' strings and are compared as UTC days, so the server's time zone never moves a day.
 */

const REVIEW_CRITERIA = ['Punctuality', 'Teamwork', 'Technical Skills', 'Communication', 'Initiative', 'Reliability'];

/** Hadi's adjustment types: one-off bonuses and deductions approved before a month is prepared. */
const BONUS_TYPES = ['performance_bonus', 'festival_bonus', 'attendance_bonus', 'sales_bonus', 'overtime', 'arrears', 'other'];
const DEDUCTION_TYPES = ['loan_repayment', 'advance_recovery', 'unpaid_leave', 'absence', 'late_fine', 'disciplinary_fine', 'manual_adjustment', 'tax', 'other'];

const money = (v) => Number.parseFloat(v || 0) || 0;
const round2 = (n) => Math.round(n * 100) / 100;
const ymd = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);
const dayMs = (d) => Date.parse(`${d}T00:00:00Z`);
const addDays = (d, n) => new Date(dayMs(d) + n * 86400000).toISOString().slice(0, 10);
const daysInclusive = (a, b) => Math.round((dayMs(b) - dayMs(a)) / 86400000) + 1;
const list = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/** The part of the month the person was employed, or null when they were not employed at all that month. */
const monthWindow = (employee, month, year) => {
  const m = String(month).padStart(2, '0');
  const monthStart = `${year}-${m}-01`;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const monthEnd = `${year}-${m}-${String(daysInMonth).padStart(2, '0')}`;
  const join = ymd(employee?.joining_date);
  const exit = ymd(employee?.exit_date);
  if (join && join > monthEnd) return null;
  if (exit && exit < monthStart) return null;
  const start = join && join > monthStart ? join : monthStart;
  const end = exit && exit < monthEnd ? exit : monthEnd;
  if (start > end) return null;
  const activeDays = daysInclusive(start, end);
  return { start, end, activeDays, daysInMonth, factor: activeDays / daysInMonth };
};

/** A month is prepared only once it has ended (Hadi: from the 1st of the next month). */
const canRunMonth = (month, year, today) => {
  const mo = Number(month);
  const yr = Number(year);
  if (!Number.isInteger(mo) || mo < 1 || mo > 12 || !Number.isInteger(yr)) return false;
  const nextMonthStart = mo === 12 ? `${yr + 1}-01-01` : `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
  return ymd(today) >= nextMonthStart;
};

/** Each working day inside both the range and the window, as YYYY-MM-DD. */
const workingDates = (from, to, window, closed) => {
  const a = ymd(from) > window.start ? ymd(from) : window.start;
  const b = ymd(to) < window.end ? ymd(to) : window.end;
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) if (!closed || !closed.has(d)) out.push(d);
  return out;
};

/** Days of approved unpaid leave inside the window. A one-day leave of half a day counts 0.5. */
const unpaidDays = (leaves, window, closed) => {
  const days = new Map();
  for (const l of leaves || []) {
    if (l.is_paid !== false) continue;
    const share = ymd(l.start_date) === ymd(l.end_date) && money(l.total_days) > 0 && money(l.total_days) < 1 ? money(l.total_days) : 1;
    for (const d of workingDates(l.start_date, l.end_date, window, closed)) days.set(d, Math.max(days.get(d) || 0, share));
  }
  return [...days.values()].reduce((s, v) => s + v, 0);
};

/** Days marked absent (half day 0.5) on working days not covered by approved leave. Shown, never deducted by itself. */
const absentDays = (attendance, window, closed, leaves = []) => {
  const onLeave = new Set();
  for (const l of leaves) workingDates(l.start_date, l.end_date, window, closed).forEach((d) => onLeave.add(d));
  return (attendance || []).reduce((s, a) => {
    const d = ymd(a.date);
    if (!d || d < window.start || d > window.end || (closed && closed.has(d)) || onLeave.has(d)) return s;
    return s + (a.status === 'absent' ? 1 : a.status === 'half_day' ? 0.5 : 0);
  }, 0);
};

/**
 * One person's pay for the window. Basic and allowances are pro-rated by the days employed; each unpaid day
 * costs basic / days in the month; recurring deduction rules with an amount apply every month (a rule written
 * as text is listed for HR, not guessed); approved one-off bonuses and deductions are added. Net is never below 0.
 */
const payslip = (employee, window, { unpaidDays: unpaid = 0, absentDays: absent = 0, adjustments = [] } = {}) => {
  const factor = window?.factor ?? 1;
  const daysInMonth = window?.daysInMonth || 30;
  const fullBasic = money(employee?.basic_salary);
  const lines = [];
  const basic = round2(fullBasic * factor);
  lines.push({ kind: 'earning', label: factor < 1 ? `Basic salary (${window.activeDays} of ${daysInMonth} days)` : 'Basic salary', amount: basic });
  let allowances = 0;
  for (const a of list(employee?.allowances)) {
    const amt = round2(money(a.amount) * factor);
    allowances += amt;
    lines.push({ kind: 'earning', label: a.name || 'Allowance', amount: amt });
  }
  let bonuses = 0;
  let deductions = 0;
  const ids = [];
  for (const adj of adjustments) {
    const amt = round2(money(adj.amount));
    if (adj.id != null) ids.push(adj.id);
    const label = String(adj.type || 'other').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
    if (adj.direction === 'bonus') { bonuses += amt; lines.push({ kind: 'earning', label, amount: amt, adjustment_id: adj.id }); }
    else { deductions += amt; lines.push({ kind: 'deduction', label, amount: amt, adjustment_id: adj.id }); }
  }
  const unpaidCost = round2((fullBasic / daysInMonth) * unpaid);
  if (unpaid > 0) lines.push({ kind: 'deduction', label: `Unpaid leave (${unpaid} ${unpaid === 1 ? 'day' : 'days'})`, amount: unpaidCost });
  let recurring = 0;
  for (const r of list(employee?.deduction_rules)) {
    if (r.amount == null || r.amount === '') { lines.push({ kind: 'deduction', label: r.name || 'Deduction', amount: 0, note: r.rule || null }); continue; }
    const amt = round2(money(r.amount));
    recurring += amt;
    lines.push({ kind: 'deduction', label: r.name || 'Deduction', amount: amt });
  }
  if (absent > 0) lines.push({ kind: 'info', label: 'Absent days', value: absent });
  const gross = round2(basic + allowances + bonuses);
  const deductionTotal = round2(deductions + unpaidCost + recurring);
  return {
    active_days: window?.activeDays || 0,
    days_in_month: daysInMonth,
    unpaid_days: unpaid,
    basic,
    allowances_total: round2(allowances),
    bonus_total: round2(bonuses),
    deduction_total: deductionTotal,
    gross,
    net: Math.max(0, round2(gross - deductionTotal)),
    lines,
    adjustment_ids: ids,
  };
};

/** Final settlement: the exit month's pay up to the last working day, less what is still owed on a loan. */
const settlement = (employee, exit, extras = {}) => {
  const last = ymd(exit.last_working_day);
  const [y, m] = last.split('-').map(Number);
  const window = monthWindow({ joining_date: employee.joining_date, exit_date: last }, m, y);
  const slip = payslip(employee, window, extras);
  const loan = round2(money(employee.loan_balance));
  return { month: m, year: y, payslip: slip, loan_outstanding: loan, total: round2(slip.net - loan) };
};

/** Mean of the six criteria, to one decimal, or null unless every one is rated 1 to 5. */
const reviewOverall = (ratings) => {
  const r = ratings || {};
  const vals = REVIEW_CRITERIA.map((c) => Number(r[c]));
  if (vals.some((v) => !Number.isInteger(v) || v < 1 || v > 5)) return null;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
};

module.exports = {
  REVIEW_CRITERIA, BONUS_TYPES, DEDUCTION_TYPES, monthWindow, canRunMonth, unpaidDays, absentDays, payslip, settlement, reviewOverall, money, round2, ymd,
};
