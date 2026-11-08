/**
 * Leave (owner request 2026-10-14): "staff can not request leave ... leave type not visible ... each staff can get
 * 21 leaves annually: Sick Leave 11, Casual Leave 10 ... weekend leave if a staff works on a weekend (notes for
 * proof) ... each leave request will generate a PDF as an application, branded".
 *
 *   ensureDefaultLeaveTypes()   idempotent (by code, else by name): Sick 11 + Casual 10 (category 'annual'),
 *                               Weekend Leave (category 'weekend', proof required). Run at start-up.
 *   balances(userId, year)      per active type: entitled, used (approved), pending, remaining (null = no cap).
 *                               Days count toward the year the leave STARTS in.
 *   validate(user, body)        -> { error, field } | { data }: dates, overlap with an open request, the yearly
 *                               cap (pending requests included), and for weekend leave one day per worked day,
 *                               the worked day in the past and before the leave, used once, and a proof note.
 *   markAttendance(request)     on approval: 'on_leave' attendance for each day that has no record yet.
 *   renderPrint(request)        the branded application letter (A4), saved as PDF by the browser.
 *
 * Days are WORKING days (owner request 2026-10-18): the office calendar's closed days (weekly day off, public
 * holidays, other closures; officeCalendar.service) inside the range are skipped and not taken from the balance.
 *   leaveDays(userId, start, end) -> { days, span, closed: [{ ymd, kind, name }] }
 * Weekend leave: the day worked must be an office closed day, and the day off one working day.
 */
const { Op } = require('sequelize');
const LeaveType = require('../models/LeaveType');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveBalance = require('../models/LeaveBalance');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { readBrand, logoDataUri, esc } = require('./attendanceReport.service');

const SIGN_OFF = 'I kindly request you to approve my leave.';
const DEFAULT_TYPES = [
  {
    code: 'sick', name: 'Sick Leave', days_per_year: 11, is_paid: true, color: '#D92D20', category: 'annual', requires_proof: false, sort_order: 1,
    description: 'Part of the 21 days annual leave. For illness or a medical appointment.',
    template: `I am writing to inform you that I am unwell and unable to attend the office. I therefore request {days} day(s) of sick leave from {from} to {to}.\n\n[Briefly describe the illness or the doctor's advice.]\n\nI will hand over my pending work and will be reachable by phone for anything urgent. I will submit a medical certificate if required.\n\n${SIGN_OFF}`,
  },
  {
    code: 'casual', name: 'Casual Leave', days_per_year: 10, is_paid: true, color: '#1570EF', category: 'annual', requires_proof: false, sort_order: 2,
    description: 'Part of the 21 days annual leave. For personal or family matters.',
    template: `I request {days} day(s) of casual leave from {from} to {to} for [personal / family reason].\n\nI have arranged for my work to be covered while I am away and will be reachable by phone if needed.\n\n${SIGN_OFF}`,
  },
  {
    code: 'weekend', name: 'Weekend Leave', days_per_year: 0, is_paid: true, color: '#7A5AF8', category: 'weekend', requires_proof: true, sort_order: 3,
    description: 'One day off for each weekly day off worked. The worked day and proof are required.',
    template: `I worked on {worked_date}, which was my weekly day off, to [describe the work, e.g. client site visit / office duty].\n\nIn return, I request {days} day of weekend leave on {from}. The proof of my weekend work is given below.\n\n${SIGN_OFF}`,
  },
];
const ANNUAL_DAYS = DEFAULT_TYPES.filter((t) => t.category === 'annual').reduce((s, t) => s + t.days_per_year, 0); // 21

const OPEN = ['pending', 'approved'];
const validDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const dateOnly = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);
const dhakaToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const countDays = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000) + 1;
const fmtDate = (ymd) => (ymd ? new Date(`${dateOnly(ymd)}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '');
const calendar = () => require('./officeCalendar.service');

/** Working days of a leave for that staff member's office: the range minus the office's closed days. */
async function leaveDays(userId, start, end) {
  const span = countDays(start, end);
  const u = await User.findByPk(userId, { attributes: ['branch_id'] });
  const closedMap = await calendar().closedDays(start, end, u ? u.branch_id : null);
  const closed = [...closedMap.entries()].map(([ymd, c]) => ({ ymd, ...c })).sort((a, b) => (a.ymd < b.ymd ? -1 : 1));
  return { days: span - closed.length, span, closed };
}

const reference = (r) => `LV-${dateOnly(r.created_at || r.createdAt || new Date()).slice(0, 4)}-${String(r.id).padStart(4, '0')}`;

async function ensureDefaultLeaveTypes() {
  for (const def of DEFAULT_TYPES) {
    // eslint-disable-next-line no-await-in-loop
    const byCode = await LeaveType.findOne({ where: { code: def.code } });
    if (byCode) continue;
    // eslint-disable-next-line no-await-in-loop
    const all = await LeaveType.findAll({ where: { code: null } });
    const byName = all.find((t) => String(t.name).trim().toLowerCase() === def.name.toLowerCase());
    // eslint-disable-next-line no-await-in-loop
    if (byName) await byName.update({ code: def.code, category: def.category, requires_proof: def.requires_proof, template: byName.template || def.template, description: byName.description || def.description, sort_order: def.sort_order });
    // eslint-disable-next-line no-await-in-loop
    else await LeaveType.create(def);
  }
}

const listTypes = ({ activeOnly = false } = {}) => LeaveType.findAll({
  where: activeOnly ? { is_active: true } : {},
  order: [['sort_order', 'ASC'], ['id', 'ASC']],
});

async function balances(userId, year = Number(dhakaToday().slice(0, 4))) {
  const types = await listTypes({ activeOnly: true });
  const rows = await LeaveRequest.findAll({
    where: { user_id: userId, status: OPEN, start_date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] } },
    attributes: ['leave_type_id', 'status', 'total_days'],
    raw: true,
  });
  const sum = (typeId, status) => rows.filter((r) => r.leave_type_id === typeId && r.status === status).reduce((s, r) => s + Number(r.total_days), 0);
  const list = types.map((t) => {
    const capped = t.category !== 'weekend' && Number(t.days_per_year) > 0;
    const used = sum(t.id, 'approved');
    const pending = sum(t.id, 'pending');
    return {
      leave_type_id: t.id, code: t.code, name: t.name, color: t.color, category: t.category,
      entitled: capped ? Number(t.days_per_year) : null, used, pending,
      remaining: capped ? Math.max(0, Number(t.days_per_year) - used - pending) : null,
    };
  });
  const annual = list.filter((b) => b.category === 'annual' && b.entitled !== null);
  return {
    year,
    types: list,
    annual: {
      entitled: annual.reduce((s, b) => s + b.entitled, 0),
      used: annual.reduce((s, b) => s + b.used, 0),
      pending: annual.reduce((s, b) => s + b.pending, 0),
      remaining: annual.reduce((s, b) => s + b.remaining, 0),
    },
  };
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** -> { error, field } or { data } (ready for LeaveRequest.create, without user/branch). */
async function validate(userId, body = {}, { excludeId = null } = {}) {
  const bad = (error, field) => ({ error, field });
  const typeId = Number(body.leave_type_id);
  const type = Number.isInteger(typeId) && typeId > 0 ? await LeaveType.findByPk(typeId) : null;
  if (!type || type.is_active === false) return bad('Choose a leave type', 'leave_type_id');
  const { start_date: start, end_date: end } = body;
  if (!validDate(start)) return bad('Choose the first day of leave', 'start_date');
  if (!validDate(end)) return bad('Choose the last day of leave', 'end_date');
  if (end < start) return bad('The last day is before the first day', 'end_date');
  if (countDays(start, end) > 60) return bad('A leave request can be at most 60 days', 'end_date');
  const { days, closed } = await leaveDays(userId, start, end);
  if (days < 1) return bad('The office is closed on all of these days: no leave is needed', 'start_date');
  const reason = str(body.reason, 4000);
  if (reason.length < 10) return bad('Write the application (at least a sentence)', 'reason');
  if (/\[[^\]]+\]/.test(reason)) return bad('Fill in or remove the [ ] parts of the application', 'reason');

  const overlap = await LeaveRequest.findOne({
    where: {
      user_id: userId, status: OPEN, start_date: { [Op.lte]: end }, end_date: { [Op.gte]: start },
      ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}),
    },
    attributes: ['id'],
  });
  if (overlap) return bad('You already have a leave request for some of these days', 'start_date');

  const data = {
    leave_type_id: type.id, start_date: start, end_date: end, total_days: days, reason,
    handover_note: str(body.handover_note, 500) || null, worked_date: null, proof_note: null,
  };

  if (type.category === 'weekend' || type.requires_proof) {
    const worked = body.worked_date;
    if (!validDate(worked)) return bad('Choose the weekend day you worked', 'worked_date');
    if (worked > dhakaToday()) return bad('The worked day cannot be in the future', 'worked_date');
    if (worked >= start) return bad('The leave must come after the weekend day you worked', 'start_date');
    if (type.category === 'weekend' && (start !== end || days !== 1)) return bad('Weekend leave is one working day for each weekend day worked', 'end_date');
    const u = await User.findByPk(userId, { attributes: ['branch_id'] });
    if (type.category === 'weekend' && !(await calendar().closedOn(worked, u ? u.branch_id : null))) {
      return bad('That day was a working day: weekend leave is for work done on an office closed day', 'worked_date');
    }
    const proof = str(body.proof_note, 2000);
    if (proof.length < 10) return bad('Write what proves the weekend work (who asked, the work done, the client or site)', 'proof_note');
    const used = await LeaveRequest.findOne({
      where: { user_id: userId, leave_type_id: type.id, worked_date: worked, status: OPEN, ...(excludeId ? { id: { [Op.ne]: excludeId } } : {}) },
      attributes: ['id'],
    });
    if (used) return bad('A weekend leave was already requested for that worked day', 'worked_date');
    data.worked_date = worked;
    data.proof_note = proof;
  }

  if (type.category !== 'weekend' && Number(type.days_per_year) > 0) {
    const b = (await balances(userId, Number(start.slice(0, 4)))).types.find((x) => x.leave_type_id === type.id);
    const left = b ? b.remaining : 0;
    if (days > left) return bad(`Only ${left} day(s) of ${type.name} left for ${start.slice(0, 4)} (pending requests included)`, 'end_date');
  }
  return { data, type, closed };
}

/** On approval: 'on_leave' attendance for each leave day that has no attendance record yet. */
async function markAttendance(request) {
  const start = dateOnly(request.start_date);
  const days = countDays(start, dateOnly(request.end_date));
  const dates = Array.from({ length: days }, (_, i) => new Date(Date.parse(`${start}T00:00:00Z`) + i * 86400000).toISOString().slice(0, 10));
  const existing = new Set((await StaffAttendance.findAll({ where: { user_id: request.user_id, date: dates }, attributes: ['date'], raw: true })).map((r) => dateOnly(r.date)));
  // The office is closed on those days anyway (officeCalendar.service): nothing to mark.
  const closed = await require('./officeCalendar.service').closedDays(dates[0], dates[dates.length - 1], request.branch_id || null);
  const missing = dates.filter((d) => !existing.has(d) && !closed.has(d));
  if (missing.length) {
    await StaffAttendance.bulkCreate(missing.map((date) => ({
      user_id: request.user_id, branch_id: request.branch_id, date, status: 'on_leave', notes: `Approved leave ${reference(request)}`,
    })));
  }
  return missing.length;
}

/** Keeps the legacy leave_balances table in step (used on approval). */
async function bumpLegacyBalance(request) {
  const year = Number(dateOnly(request.start_date).slice(0, 4));
  const type = await LeaveType.findByPk(request.leave_type_id, { attributes: ['days_per_year'] });
  const [row] = await LeaveBalance.findOrCreate({
    where: { user_id: request.user_id, leave_type_id: request.leave_type_id, year },
    defaults: { entitled: type ? type.days_per_year : 0, used: 0, carried_over: 0 },
  });
  await row.update({ used: Number(row.used) + Number(request.total_days) });
}

const fullInclude = () => [
  { model: User, as: 'Employee', attributes: ['id', 'name', 'email', 'role'], include: [{ model: StaffProfile, required: false, attributes: ['employee_id', 'designation', 'department', 'phone'] }] },
  { model: User, as: 'Approver', attributes: ['id', 'name'] },
  { model: LeaveType },
  { model: Branch, attributes: ['id', 'name'] },
];

/** JSON for the lists: the request plus its reference and (weekend leave) the attendance of the worked day. */
async function present(request) {
  const r = request.toJSON ? request.toJSON() : request;
  let worked_attendance = null;
  if (r.worked_date) {
    const a = await StaffAttendance.findOne({ where: { user_id: r.user_id, date: dateOnly(r.worked_date) }, attributes: ['status', 'check_in', 'check_out'], raw: true });
    worked_attendance = a || null;
  }
  return { ...r, reference: reference(r), worked_attendance };
}

/* ───────────────────────── the application letter ───────────────────────── */
const STATUS = { pending: 'Pending', approved: 'Approved', rejected: 'Not approved', cancelled: 'Cancelled' };

async function renderPrint(request, { autoPrint = false } = {}) {
  const r = await present(request);
  const brand = await readBrand();
  const company = brand.BRAND_NAME || 'Seventh Sky Property Care';
  const logo = /^https:\/\//i.test(brand.BRAND_LOGO_URL || '') ? brand.BRAND_LOGO_URL : logoDataUri();
  const emp = r.Employee || {};
  const sp = emp.StaffProfile || {};
  const type = r.LeaveType || {};
  const office = r.Branch ? r.Branch.name : '';
  const bal = (await balances(r.user_id, Number(dateOnly(r.start_date).slice(0, 4)))).types.find((b) => b.leave_type_id === r.leave_type_id);
  const days = Number(r.total_days);
  const span = await leaveDays(r.user_id, dateOnly(r.start_date), dateOnly(r.end_date));
  const para = (text) => esc(text).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  const row = (k, v) => (v ? `<tr><th>${esc(k)}</th><td>${v}</td></tr>` : '');
  const att = r.worked_attendance ? `${esc(({ present: 'Present', late: 'Late', half_day: 'Half day', absent: 'Absent', on_leave: 'On leave' })[r.worked_attendance.status] || r.worked_attendance.status)}${r.worked_attendance.check_in ? ` (in ${esc(String(r.worked_attendance.check_in).slice(0, 5))}${r.worked_attendance.check_out ? `, out ${esc(String(r.worked_attendance.check_out).slice(0, 5))}` : ''})` : ''}` : 'No attendance record';
  const decidedOn = r.approved_at ? fmtDate(dateOnly(new Date(new Date(r.approved_at).getTime() + 6 * 3600000).toISOString())) : '';
  const title = `${reference(r)} Leave Application`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --ink:#0F172A; --muted:#64748B; --line:#E2E8F0; --brand:#0D1638; --tint:#EEF2FA; --accent:${esc(type.color || '#156B3D')}; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #EEF1F5; color: var(--ink); }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Nirmala UI', system-ui, sans-serif; font-size: 13.5px; line-height: 1.55; }
  .bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 12px 16px; background: #0D1638; color: #fff; }
  .bar button { font: inherit; font-weight: 700; font-size: 15px; border: 0; border-radius: 10px; padding: 10px 18px; background: #1CC4FA; color: #0D1638; cursor: pointer; min-height: 44px; }
  .bar span { font-size: 13px; opacity: .85; }
  .page { width: 210mm; min-height: 297mm; margin: 16px auto; background: #fff; padding: 14mm 16mm 12mm; box-shadow: 0 4px 24px rgba(0,0,0,.12); display: flex; flex-direction: column; }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 10px; border-bottom: 3px solid var(--brand); }
  header img { height: 52px; width: auto; }
  .co { flex: 1; min-width: 0; } .co__name { font-size: 18px; font-weight: 700; margin: 0; } .co__sub { margin: 2px 0 0; color: var(--muted); font-size: 12px; }
  .meta { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin: 16px 0 10px; }
  .meta h1 { margin: 0; font-size: 21px; color: var(--brand); letter-spacing: .3px; }
  .meta h1 small { display: block; font-size: 13px; color: var(--muted); font-weight: 500; letter-spacing: 0; }
  .meta dl { margin: 0; display: grid; grid-template-columns: auto auto; gap: 1px 10px; font-size: 12.5px; text-align: right; }
  .meta dt { color: var(--muted); } .meta dd { margin: 0; font-weight: 700; }
  .stamp { display: inline-block; padding: 2px 10px; border-radius: 999px; border: 1.5px solid currentColor; font-size: 12px; font-weight: 700; }
  .stamp--pending { color: #9A6700; } .stamp--approved { color: #156B3D; } .stamp--rejected, .stamp--cancelled { color: #B42318; }
  .to { margin: 6px 0 12px; } .to p { margin: 0; }
  .subject { margin: 0 0 12px; font-weight: 700; } .subject span { border-bottom: 1.5px solid var(--ink); }
  .letter p { margin: 0 0 10px; white-space: normal; }
  .sig { margin: 16px 0 14px; } .sig p { margin: 0; } .sig .line { width: 60mm; border-top: 1.2px solid var(--ink); margin: 28px 0 4px; }
  h2 { font-size: 12.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--brand); margin: 6px 0 6px; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 12px; }
  th, td { text-align: left; vertical-align: top; padding: 6px 10px; border: 1px solid var(--line); font-size: 12.5px; }
  th { width: 34%; color: var(--muted); font-weight: 500; background: #FAFBFA; }
  td { font-weight: 600; }
  .type { display: inline-block; padding: 1px 8px; border-radius: 4px; color: #fff; background: var(--accent); font-weight: 700; }
  .proof { border-left: 4px solid var(--accent); background: var(--tint); padding: 8px 12px; border-radius: 0 8px 8px 0; margin: 0 0 12px; }
  .proof p { margin: 2px 0; }
  .office { border: 1.5px dashed var(--muted); border-radius: 8px; padding: 10px 12px; margin-top: auto; }
  .office h2 { margin-top: 0; color: var(--ink); }
  .signs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; padding-top: 30px; }
  .signs div { border-top: 1.2px solid var(--ink); padding-top: 4px; font-size: 11.5px; font-weight: 600; }
  footer { margin-top: 10px; padding-top: 6px; border-top: 1px solid var(--line); font-size: 10.5px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px; }
  @media screen and (max-width: 820px) { .page { width: auto; min-height: 0; margin: 0; padding: 18px 16px; box-shadow: none; } .meta { flex-direction: column; } .meta dl { text-align: left; } }
  @page { size: A4; margin: 0; }
  @media print { html, body { background: #fff; } .bar { display: none; } .page { margin: 0; box-shadow: none; min-height: 297mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="bar" role="toolbar">
  <button type="button" onclick="window.print()">Download PDF</button>
  <span>In the print window choose "Save as PDF"</span>
</div>
<main class="page">
  <header>
    ${logo ? `<img src="${esc(logo)}" alt="${esc(company)}">` : ''}
    <div class="co">
      <p class="co__name">${esc(company)}</p>
      <p class="co__sub">${esc([office, brand.CONTACT_ADDRESS, brand.CONTACT_PHONE_PRIMARY].filter(Boolean).join(' · '))}</p>
    </div>
  </header>
  <div class="meta">
    <h1>Leave Application<small>${esc(type.name || 'Leave')}</small></h1>
    <dl>
      <dt>Reference</dt><dd>${esc(reference(r))}</dd>
      <dt>Date</dt><dd>${esc(fmtDate(dateOnly(new Date(new Date(r.created_at || r.createdAt).getTime() + 6 * 3600000).toISOString())))}</dd>
      <dt>Status</dt><dd><span class="stamp stamp--${esc(r.status)}">${esc(STATUS[r.status] || r.status)}</span></dd>
    </dl>
  </div>
  <div class="to"><p>To</p><p>The HR Department</p><p>${esc(company)}</p>${office ? `<p>${esc(office)}</p>` : ''}</div>
  <p class="subject">Subject: <span>Application for ${esc(type.name || 'leave')} (${esc(days)} day${days === 1 ? '' : 's'})</span></p>
  <div class="letter">
    <p>Dear Sir/Madam,</p>
    ${para(r.reason || '')}
  </div>
  <div class="sig">
    <p>Yours sincerely,</p>
    <div class="line"></div>
    <p><strong>${esc(emp.name || '')}</strong></p>
    <p>${esc([sp.designation, sp.department].filter(Boolean).join(', '))}</p>
    <p>${esc([sp.employee_id ? `Employee ID ${sp.employee_id}` : '', sp.phone].filter(Boolean).join(' · '))}</p>
  </div>

  <h2>Leave details</h2>
  <table><tbody>
    ${row('Leave type', `<span class="type">${esc(type.name || '')}</span>${type.is_paid === false ? ' (unpaid)' : ''}`)}
    ${row('From', esc(fmtDate(r.start_date)))}
    ${row('To', esc(fmtDate(r.end_date)))}
    ${row('Number of days', esc(`${days} working day${days === 1 ? '' : 's'}`) + (span.closed.length ? `<span style="display:block;font-weight:400;color:var(--muted);font-size:12px">Not counted (office closed): ${span.closed.map((c) => esc(`${fmtDate(c.ymd)} ${c.kind === 'weekly' ? '(weekly off)' : `(${c.name})`}`)).join(', ')}</span>` : ''))}
    ${bal && bal.entitled !== null ? row(`${type.name} this year`, esc(`${bal.entitled} days · ${bal.used} taken · ${bal.pending} pending · ${bal.remaining} left`)) : ''}
    ${row('Work covered by', r.handover_note ? esc(r.handover_note) : '')}
  </tbody></table>

  ${r.worked_date ? `<div class="proof">
    <h2>Proof of weekend work</h2>
    <p><strong>Weekend day worked:</strong> ${esc(fmtDate(r.worked_date))}</p>
    <p><strong>Attendance that day:</strong> ${att}</p>
    <p><strong>Proof:</strong> ${esc(r.proof_note || '')}</p>
  </div>` : ''}

  <section class="office">
    <h2>For office use</h2>
    <table><tbody>
      ${row('Decision', `<span class="stamp stamp--${esc(r.status)}">${esc(STATUS[r.status] || r.status)}</span>`)}
      ${row('Decided by', r.Approver ? esc(r.Approver.name) : '&nbsp;')}
      ${row('Date', decidedOn ? esc(decidedOn) : '&nbsp;')}
      ${row('Remarks', r.rejection_note ? esc(r.rejection_note) : '&nbsp;')}
    </tbody></table>
    <div class="signs"><div>Applicant</div><div>Line manager / HR</div><div>Approved by</div></div>
  </section>
  <footer><span>${esc(company)}</span><span>${esc(reference(r))} · Printed ${esc(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span></footer>
</main>
${autoPrint ? '<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>' : ''}
</body>
</html>`;
}

async function sendPrint(res, request, opts) {
  const html = await renderPrint(request, opts);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  res.send(html);
}

module.exports = {
  DEFAULT_TYPES, ANNUAL_DAYS, ensureDefaultLeaveTypes, leaveDays, listTypes, balances, validate, markAttendance, bumpLegacyBalance,
  fullInclude, present, reference, renderPrint, sendPrint, countDays,
};
