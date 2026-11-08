/**
 * Monthly staff attendance (owner request 2026-10-14: "showing removed staff ... does not show full month's
 * dates ... not properly branded ... unorganised").
 *
 *   monthReport({ branchId, month, year }) -> { month, year, label, days, rows, totals }
 *     Roster = the office's staff (clients / guardians never), not just people who have a record:
 *       - active logins, unless they joined after the month ended;
 *       - former staff (offboarded: users.status 'inactive') ONLY when they left during or after the month
 *         (StaffProfile.exit_date >= the 1st), so a removed employee drops out from the next month on.
 *         A deactivated login with no exit date is treated as removed.
 *     Days before joining / after leaving are 'out' (shown blank, not counted).
 *     worked = present + late + ½ half day.  not_marked = days in range with no record (future days excluded).
 *   renderPrint(report, { company, logo, office, autoPrint }) -> A4 landscape HTML (every day of the month on
 *     one page width); the browser's Save as PDF makes the file, as for the site-visit request.
 */
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const User = require('../models/User');
const StaffProfile = require('../models/StaffProfile');
const StaffAttendance = require('../models/StaffAttendance');
const SystemSetting = require('../models/SystemSetting');

const { NON_STAFF } = require('../utils/hrRoles');
const WORKED = ['present', 'late', 'half_day'];
const calendar = require('./officeCalendar.service');
const CODES = { present: 'P', late: 'L', half_day: 'H', absent: 'A', on_leave: 'V' };
const pad = (n) => String(n).padStart(2, '0');
const ymdOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const dateOnly = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);
const dhakaToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function parseMonth(month, year) {
  const now = dhakaToday();
  const y = Number.parseInt(year, 10) || Number(now.slice(0, 4));
  const m = Number.parseInt(month, 10) || Number(now.slice(5, 7));
  if (m < 1 || m > 12 || y < 2000 || y > 2100) return null;
  return { y, m };
}

async function monthReport({ branchId, month, year, today = dhakaToday() }) {
  const p = parseMonth(month, year);
  if (!p) throw Object.assign(new Error('Pick a valid month and year'), { status: 400 });
  const { y, m } = p;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = ymdOf(y, m, 1);
  const last = ymdOf(y, m, count);
  // Closed days (weekly day off, public holidays, other closures): not working days (officeCalendar.service).
  const closedMap = await calendar.closedDays(first, last, branchId || null);
  const days = Array.from({ length: count }, (_, i) => {
    const ymd = ymdOf(y, m, i + 1);
    return { d: i + 1, ymd, dow: new Date(`${ymd}T00:00:00Z`).getUTCDay(), future: ymd > today, closed: closedMap.get(ymd) || null };
  });

  const where = { role: { [Op.notIn]: NON_STAFF } };
  if (branchId) where.branch_id = branchId;
  const users = await User.findAll({
    where,
    attributes: ['id', 'name', 'role', 'status'],
    include: [{ model: StaffProfile, required: false, attributes: ['employee_id', 'designation', 'department', 'joining_date', 'exit_date', 'employment_status'] }],
    order: [['name', 'ASC']],
  });

  const records = users.length ? await StaffAttendance.findAll({
    where: { user_id: users.map((u) => u.id), date: { [Op.between]: [first, last] } },
    attributes: ['user_id', 'date', 'status', 'check_in', 'check_out', 'notes'],
    raw: true,
  }) : [];
  const byUser = new Map();
  records.forEach((r) => {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, {});
    byUser.get(r.user_id)[Number(dateOnly(r.date).slice(8, 10))] = { status: r.status, check_in: r.check_in, check_out: r.check_out, notes: r.notes };
  });

  const rows = [];
  for (const u of users) {
    const sp = u.StaffProfile || {};
    const joined = dateOnly(sp.joining_date);
    const left = dateOnly(sp.exit_date);
    const former = u.status === 'inactive';
    if (former && !(left && left >= first)) continue; // removed before this month (or no exit date)
    if (joined && joined > last) continue; // joined after this month
    const entries = byUser.get(u.id) || {};
    const counts = { present: 0, late: 0, half_day: 0, absent: 0, on_leave: 0 };
    let notMarked = 0;
    const cells = days.map((day) => {
      const out = (joined && day.ymd < joined) || (former && left && day.ymd > left);
      const e = entries[day.d];
      // Office closed: nothing is expected. Work done that day still counts; absent / leave / no record do not.
      if (day.closed && !(e && WORKED.includes(e.status))) return out ? 'out' : 'closed';
      if (e && counts[e.status] !== undefined) counts[e.status] += 1;
      if (!e && !out && !day.future) notMarked += 1;
      return out && !e ? 'out' : (e ? e.status : (day.future ? 'future' : 'none'));
    });
    rows.push({
      user: { id: u.id, name: u.name, role: u.role, StaffProfile: { employee_id: sp.employee_id || null } },
      employee_id: sp.employee_id || null,
      designation: sp.designation || null,
      department: sp.department || null,
      former,
      exit_date: former ? left : null,
      joining_date: joined,
      entries,
      cells,
      ...counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      worked: counts.present + counts.late + counts.half_day / 2,
      not_marked: notMarked,
      worked_closed: days.filter((day) => day.closed && entries[day.d] && WORKED.includes(entries[day.d].status)).length,
    });
  }
  // Current staff first (A-Z), former staff at the end.
  rows.sort((a, b) => (a.former - b.former) || a.user.name.localeCompare(b.user.name));

  const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
  return {
    month: m, year: y, first, last,
    label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }),
    days, rows,
    working_days: days.filter((d) => !d.closed).length,
    closed_days: days.filter((d) => d.closed).map((d) => ({ ymd: d.ymd, ...d.closed })),
    totals: {
      staff: rows.length, present: sum('present'), late: sum('late'), half_day: sum('half_day'),
      absent: sum('absent'), on_leave: sum('on_leave'), worked: sum('worked'), not_marked: sum('not_marked'),
    },
  };
}

/* ───────────────────────── print page ("PDF") ───────────────────────── */
const LOGO = path.join(__dirname, '..', '..', 'website', 'public', 'logo.png');
let logoUri;
function logoDataUri() {
  if (logoUri !== undefined) return logoUri;
  try { logoUri = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`; } catch { logoUri = null; }
  return logoUri;
}

async function readBrand() {
  // Seventh Sky: the company identity comes from Settings (services/wtBranding.service), as on every other document.
  const b = await require('./wtBranding.service').getBranding().catch(() => ({}));
  return { BRAND_NAME: b.name || '', BRAND_LOGO_URL: b.logo_url || '', CONTACT_ADDRESS: b.address || '', CONTACT_PHONE_PRIMARY: b.phone || '' };
}

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const fmtDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' }) : '');
const num = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function renderPrint(report, { brand = {}, office = '', autoPrint = false } = {}) {
  const company = brand.BRAND_NAME || 'Seventh Sky Property Care';
  const logo = /^https:\/\//i.test(brand.BRAND_LOGO_URL || '') ? brand.BRAND_LOGO_URL : logoDataUri();
  const t = report.totals;
  const printed = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const head = report.days.map((d) => `<th class="d${d.closed ? ' fri' : ''}"${d.closed ? ` title="${esc(d.closed.name)}"` : ''}><span>${d.d}</span><small>${d.closed && d.closed.kind !== 'weekly' ? 'H' : DOW[d.dow]}</small></th>`).join('');
  const body = report.rows.map((r, i) => {
    const cells = r.cells.map((c, k) => {
      const fri = report.days[k].closed ? ' fri' : '';
      const e = r.entries[k + 1];
      const note = e && e.notes ? ` title="${esc(e.notes)}"` : '';
      if (CODES[c]) return `<td class="c c--${c}${fri}${note ? ' note' : ''}"${note}>${CODES[c]}</td>`;
      if (c === 'out') return `<td class="c c--out${fri}"></td>`;
      if (c === 'closed') return `<td class="c c--closed fri"></td>`;
      if (c === 'future') return `<td class="c${fri}"></td>`;
      return `<td class="c c--none${fri}">·</td>`;
    }).join('');
    const sub = [r.employee_id, r.designation].filter(Boolean).join(' · ');
    const tag = r.former ? `<em class="tag">Left ${esc(fmtDate(r.exit_date))}</em>` : '';
    return `<tr class="${r.former ? 'former' : ''}${i % 2 ? ' alt' : ''}">
      <th scope="row" class="who"><strong>${esc(r.user.name)}</strong>${tag}${sub ? `<small>${esc(sub)}</small>` : ''}</th>
      ${cells}
      <td class="t">${r.present}</td><td class="t">${r.late}</td><td class="t">${r.half_day}</td><td class="t">${r.absent}</td><td class="t">${r.on_leave}</td>
      <td class="t t--worked">${num(r.worked)}</td><td class="t t--nm">${r.not_marked || ''}</td>
    </tr>`;
  }).join('');
  const holidayList = report.closed_days.filter((c) => c.kind !== 'weekly');
  const empty = report.rows.length ? '' : `<tr><td colspan="${report.days.length + 8}" class="empty">No staff for this month.</td></tr>`;
  const title = `Attendance ${report.label}`;

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
  :root { --ink:#0F172A; --muted:#64748B; --line:#E2E8F0; --brand:#0D1638; --tint:#EEF2FA; --fri:#F3F4F1;
          --p:#156B3D; --l:#9A6700; --h:#C2410C; --a:#B42318; --v:#6941C6; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #EEF1F5; color: var(--ink); }
  body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Nirmala UI', system-ui, sans-serif; font-size: 12px; line-height: 1.35; }
  .bar { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 12px 16px; background: #0D1638; color: #fff; }
  .bar button { font: inherit; font-weight: 700; font-size: 15px; border: 0; border-radius: 10px; padding: 10px 18px; background: #1CC4FA; color: #0D1638; cursor: pointer; min-height: 44px; }
  .bar span { font-size: 13px; opacity: .85; }
  .page { width: 297mm; min-height: 210mm; margin: 16px auto; background: #fff; padding: 10mm 10mm 8mm; box-shadow: 0 4px 24px rgba(0,0,0,.12); }
  header { display: flex; align-items: center; gap: 14px; padding-bottom: 8px; border-bottom: 3px solid var(--brand); }
  header img { height: 44px; width: auto; }
  .co { flex: 1; min-width: 0; }
  .co__name { font-size: 16px; font-weight: 700; margin: 0; }
  .co__sub { margin: 1px 0 0; color: var(--muted); font-size: 11px; }
  .doc { text-align: right; }
  .doc h1 { margin: 0; font-size: 18px; color: var(--brand); }
  .doc p { margin: 0; font-size: 12px; font-weight: 600; }
  .stats { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .stat { flex: 1 1 0; min-width: 70px; border: 1px solid var(--line); border-radius: 8px; padding: 4px 8px; }
  .stat b { display: block; font-size: 15px; } .stat span { color: var(--muted); font-size: 10.5px; }
  .grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .grid th, .grid td { border: 1px solid var(--line); padding: 0; text-align: center; vertical-align: middle; }
  .grid thead th { background: var(--brand); color: #fff; font-weight: 600; font-size: 10px; padding: 3px 0; }
  .grid thead th.fri { background: #0B4426; }
  .grid thead th small { display: block; font-size: 8px; opacity: .8; font-weight: 500; }
  .grid thead th.who { text-align: left; padding-left: 6px; }
  .grid thead th.t { background: #0F5530; }
  col.who { width: 44mm; } col.t { width: 7.5mm; } col.tw { width: 9.5mm; }
  .grid th.who { text-align: left; padding: 3px 6px; font-weight: 400; overflow: hidden; }
  .who strong { display: block; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .who small { display: block; color: var(--muted); font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tag { font-style: normal; font-size: 8.5px; color: var(--a); font-weight: 600; }
  tr.alt th.who, tr.alt td { background-color: #FAFBFA; }
  .c { font-weight: 700; font-size: 10px; height: 26px; }
  .grid tbody .fri { background-color: var(--fri) !important; }
  .c--present { color: var(--p); } .c--late { color: var(--l); } .c--half_day { color: var(--h); }
  .c--absent { color: #fff; background-color: var(--a) !important; } .c--on_leave { color: var(--v); }
  .c--none { color: #B8BFB9; } .c--out { background: repeating-linear-gradient(135deg, #fff 0 3px, #ECEEEC 3px 5px) !important; }
  .note { box-shadow: inset 0 -2px 0 var(--brand); }
  .t { font-weight: 600; font-size: 10.5px; }
  .t--worked { font-weight: 700; color: var(--brand); background: var(--tint); }
  .t--nm { color: var(--muted); }
  tr.former .who strong { color: var(--muted); }
  .empty { padding: 20px !important; color: var(--muted); }
  .legend { display: flex; flex-wrap: wrap; gap: 4px 14px; margin: 8px 0 0; font-size: 10.5px; color: var(--muted); }
  .legend b { display: inline-block; min-width: 16px; text-align: center; border-radius: 3px; margin-right: 3px; }
  .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 36px; padding-top: 30px; }
  .sign div { border-top: 1.2px solid var(--ink); padding-top: 4px; font-size: 11px; font-weight: 600; }
  footer { margin-top: 10px; padding-top: 5px; border-top: 1px solid var(--line); font-size: 10px; color: var(--muted); display: flex; justify-content: space-between; gap: 12px; }
  @page { size: A4 landscape; margin: 0; }
  @media print {
    html, body { background: #fff; }
    .bar { display: none; }
    .page { margin: 0; box-shadow: none; min-height: 0; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { display: table-header-group; } tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="bar" role="toolbar">
  <button type="button" onclick="window.print()">Download PDF</button>
  <span>In the print window choose "Save as PDF" · Landscape · A4</span>
</div>
<main class="page">
  <header>
    ${logo ? `<img src="${esc(logo)}" alt="${esc(company)}">` : ''}
    <div class="co">
      <p class="co__name">${esc(company)}</p>
      <p class="co__sub">${esc([office, brand.CONTACT_ADDRESS, brand.CONTACT_PHONE_PRIMARY].filter(Boolean).join(' · '))}</p>
    </div>
    <div class="doc"><h1>Monthly Attendance</h1><p>${esc(report.label)}</p></div>
  </header>
  <div class="stats">
    <div class="stat"><b>${t.staff}</b><span>Staff</span></div>
    <div class="stat"><b>${report.working_days}</b><span>Working days (of ${report.days.length})</span></div>
    <div class="stat"><b>${num(t.worked)}</b><span>Days worked (all staff)</span></div>
    <div class="stat"><b>${t.late}</b><span>Late</span></div>
    <div class="stat"><b>${t.absent}</b><span>Absent</span></div>
    <div class="stat"><b>${t.on_leave}</b><span>On leave</span></div>
    <div class="stat"><b>${t.not_marked}</b><span>Not marked</span></div>
  </div>
  <table class="grid">
    <colgroup><col class="who">${report.days.map(() => '<col>').join('')}<col class="t"><col class="t"><col class="t"><col class="t"><col class="t"><col class="tw"><col class="tw"></colgroup>
    <thead><tr><th class="who" scope="col">Staff</th>${head}<th class="t" title="Present">P</th><th class="t" title="Late">L</th><th class="t" title="Half day">H</th><th class="t" title="Absent">A</th><th class="t" title="On leave">V</th><th class="t" title="Days worked">Worked</th><th class="t" title="Not marked">Not marked</th></tr></thead>
    <tbody>${body}${empty}</tbody>
  </table>
  <p class="legend">
    <span><b style="color:var(--p)">P</b>Present</span><span><b style="color:var(--l)">L</b>Late</span><span><b style="color:var(--h)">H</b>Half day</span>
    <span><b style="color:#fff;background:var(--a)">A</b>Absent</span><span><b style="color:var(--v)">V</b>On leave</span><span><b style="color:#B8BFB9">·</b>Not marked</span>
    <span>Striped: before joining / after leaving</span><span>Shaded columns: office closed (weekly off; H = holiday), not counted</span><span>Underlined: has a note</span>
    <span>Worked = P + L + ½ H</span>
  </p>
  ${holidayList.length ? `<p class="legend"><strong style="color:var(--ink)">Holidays and closures:</strong> ${holidayList.map((h) => `<span>${esc(fmtDate(h.ymd))}: ${esc(h.name)}</span>`).join('')}</p>` : ''}
  <div class="sign"><div>Prepared by (HR)</div><div>Checked by</div><div>Approved by</div></div>
  <footer><span>${esc(company)}${office ? ` · ${esc(office)}` : ''}</span><span>Monthly Attendance · ${esc(report.label)} · Printed ${esc(printed)}</span></footer>
</main>
${autoPrint ? '<script>window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 400); });</script>' : ''}
</body>
</html>`;
}

async function sendPrint(res, report, opts) {
  const html = renderPrint(report, { ...opts, brand: await readBrand() });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: https:; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
  res.send(html);
}

module.exports = { monthReport, renderPrint, sendPrint, CODES, readBrand, logoDataUri, esc };
