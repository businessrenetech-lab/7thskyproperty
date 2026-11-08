/**
 * The admin Dashboard: one read of every business line, so the landing page
 * makes a single request. GET /api/dashboard/overview?period=month|quarter|year|12m
 *
 * Rules: an invoice counts as revenue once issued (not Draft/Cancelled), on its
 * issue date; a service-line invoice is re-totalled through wtInvoice.service
 * (its stored amount drifts); cash is what was received, on the day it was
 * received (rent payments, and paid service-line invoices); invoices are the
 * source of truth for rent; an enquiry's furthest stage drives the funnel.
 * Read-only.
 */
const sequelize = require('../config/db.config');
const { Op } = require('sequelize');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const { SERVICE_LINES } = require('../config/serviceLines');
const M = require('../models/waterTankOps');
const invoiceSvc = require('../services/wtInvoice.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;
const lc = (v) => String(v || '').toLowerCase();
// YYYY-MM-DD, or '' for no date. MySQL zero dates are no date, never "oldest".
const day = (d) => {
  const s = d ? (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10) : '';
  return /^[1-9]\d{3}-\d\d-\d\d$/.test(s) ? s : '';
};
const iso = (d) => d.toISOString().slice(0, 10);
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

/* ── Business lines, in sidebar order ─────────────────────────────────────
 * `area` is the revenue family the hero chart stacks by. Property lines read
 * the properties family of tables by category; service lines read the shared
 * service-line (wt_*) tables by service_line.                               */
const BR_LINE = 'business_registration';
const childrenOf = (parent) => Object.entries(SERVICE_LINES).filter(([, v]) => v.parent?.key === parent).map(([k]) => k);
const LINES = [
  { key: 'residential', label: 'Residential', area: 'property', to: '/property-management', category: 'residential' },
  { key: 'commercial', label: 'Commercial', area: 'property', to: '/commercial/rent', category: 'commercial' },
  { key: 'business', label: 'Business', area: 'property', to: '/business/sell', category: 'business' },
  { key: 'rural', label: 'Rural', area: 'property', to: '/rural/rent', category: 'rural' },
  { key: 'interior', label: 'Interior Design', area: 'interior', to: '/residential-interior-design', service: childrenOf('interior_design') },
  { key: 'air_conditioning', label: 'Air Conditioning', area: 'services', to: '/air-conditioning', service: ['air_conditioning'] },
  { key: 'water_tank', label: 'Water Tank Cleaning', area: 'services', to: '/water-tank', service: ['water_tank'] },
  { key: 'doc_verification', label: 'Doc Verification & Transfer', area: 'advisory', to: '/land-property-assessment', service: childrenOf('doc_verification_transfer') },
  { key: 'business_registration', label: 'Business Registration', area: 'advisory', to: '/business-registration', service: [BR_LINE] },
  { key: 'property_care_concierge', label: 'Property Care & Concierge', area: 'services', to: '/property-care-concierge', service: ['property_care_concierge'] },
  { key: 'removal_relocation', label: 'Removal & Relocation', area: 'services', to: '/removal-relocation', service: ['removal_relocation'] },
];
const AREAS = [
  { key: 'property', label: 'Property' }, { key: 'services', label: 'Services' },
  { key: 'interior', label: 'Interior' }, { key: 'advisory', label: 'Advisory' },
];
const lineForService = Object.fromEntries(LINES.flatMap((l) => (l.service || []).map((s) => [s, l.key])));
const lineForCategory = Object.fromEntries(LINES.filter((l) => l.category).map((l) => [l.category, l.key]));
const LINE = Object.fromEntries(LINES.map((l) => [l.key, l]));

/* ── Funnel: every source's stages mapped onto one ladder ─────────────── */
const FUNNEL = ['New', 'Contacted', 'Viewing or site visit', 'Offer or quotation', 'Won'];
const RANK = {
  sales: { new: 0, contacted: 1, viewing_scheduled: 2, viewed: 2, offer_made: 3, converted: 4, rejected: 1 },
  rental: { new: 0, contacted: 1, viewing_scheduled: 2, viewed: 2, application_requested: 3, application_received: 3, shortlisted: 3, converted: 4, rejected: 1 },
  stay: { new: 0, contacted: 1, quoted: 3, converted: 4, closed: 1 },
  business: { new: 0, contacted: 1, viewing: 2, inspection: 2, offer: 3, negotiation: 3, converted: 4, won: 4, rejected: 1, lost: 1, closed: 1 },
  service: { new: 0, assigned: 1, 'assessment scheduled': 2, 'in progress': 2, 'quotation sent': 3, 'assigned to project': 4, converted: 4, completed: 4, cancelled: 1, declined: 1, rejected: 1, lost: 1, closed: 1 },
};
const rankOf = (src, stage) => RANK[src][lc(stage)] ?? 1;

const PERIODS = {
  month: { months: 1, trend: 6, label: 'this month', prevLabel: 'last month' },
  quarter: { months: 3, trend: 6, label: 'this quarter', prevLabel: 'last quarter' },
  year: { months: 12, trend: 12, label: 'this year', prevLabel: 'last year', calendarYear: true },
  '12m': { months: 12, trend: 12, label: 'the last 12 months', prevLabel: 'the 12 months before' },
};

function periodWindow(periodKey, now = new Date()) {
  const p = PERIODS[periodKey] || PERIODS.month;
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  let start;
  if (p.calendarYear) start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  else if (p.months === 3) start = new Date(Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1));
  else start = addMonths(thisMonth, 1 - p.months);
  const end = iso(now);
  const prevStart = addMonths(start, -p.months);
  // The previous window runs the same number of days, so a part-finished
  // month is compared with the same part of the month before.
  const elapsed = Math.round((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - start.getTime()) / 864e5);
  const prevEnd = iso(new Date(prevStart.getTime() + elapsed * 864e5));
  const months = Array.from({ length: p.trend }, (_, i) => iso(addMonths(thisMonth, i - p.trend + 1)).slice(0, 7));
  return { key: PERIODS[periodKey] ? periodKey : 'month', ...p, start: iso(start), end, prevStart: iso(prevStart), prevEnd, months };
}

exports.overview = asyncHandler(async (req, res) => {
  // A super admin may narrow to one branch with ?branch=; everyone else is
  // held to theirs by branchScope. `<=>` keeps a null branch meaning "no
  // branch", as Sequelize's IS NULL does.
  const scope = req.user?.role === 'super_admin' && req.query.branch && req.query.branch !== 'all'
    ? { branch_id: Number(req.query.branch) } : branchScope(req);
  const b = (alias) => ('branch_id' in scope ? ` AND ${alias}.branch_id <=> :branch` : '');
  const run = (sql) => sequelize.query(sql, { replacements: { branch: scope.branch_id ?? null }, type: sequelize.QueryTypes.SELECT });
  const W = periodWindow(req.query.period);
  const today = W.end;

  const [
    salesEnq, rentalEnq, stayEnq, bizEnq, brEnq, rentInv, bizInv, brInv, payments,
    tenancies, rentals, endingSoon, wtInvoices, wtRequests, wtOrders, branchList,
  ] = await Promise.all([
    run(`SELECT e.created_at at, e.stage, p.category, e.enquirer_name who, p.title what FROM sales_enquiries e
         JOIN properties p ON p.id = e.property_id WHERE 1=1${b('e')}`),
    run(`SELECT e.created_at at, e.stage, COALESCE(e.category,'residential') category, e.enquirer_name who FROM rental_enquiries e WHERE 1=1${b('e')}`),
    run(`SELECT e.created_at at, e.status stage, e.guest_name who FROM short_stay_enquiries e WHERE 1=1${b('e')}`),
    run(`SELECT e.created_at at, e.stage, COALESCE(e.enquirer_name, e.company_name) who FROM business_enquiries e WHERE 1=1${b('e')}`),
    run(`SELECT e.created_at at, e.stage, COALESCE(e.enquirer_name, e.company_name) who FROM business_registration_enquiries e WHERE 1=1${b('e')}`),
    run(`SELECT i.invoice_code code, i.title, i.status, i.total, i.balance, i.issue_date, i.due_date, p.category
         FROM invoices i LEFT JOIN properties p ON p.id = i.property_id
         WHERE i.status NOT IN ('draft','cancelled','rejected')${b('i')}`),
    run(`SELECT x.status, x.total_amount, x.paid_amount, x.issue_date, x.due_date FROM business_invoices x
         WHERE x.status NOT IN ('draft','cancelled','void')${b('x')}`),
    run(`SELECT x.status, x.total_amount, x.paid_amount, x.issue_date, x.due_date FROM business_registration_invoices x
         WHERE x.status NOT IN ('draft','cancelled','void')${b('x')}`),
    run(`SELECT y.amount, y.paid_at at, i.invoice_code code, p.category FROM payments y
         JOIN invoices i ON i.id = y.invoice_id LEFT JOIN properties p ON p.id = i.property_id
         WHERE y.status = 'completed' AND y.direction = 'incoming'${b('y')}`),
    run(`SELECT t.property_id, t.signed_date, p.category, p.title FROM tenancies t JOIN properties p ON p.id = t.property_id
         WHERE t.status = 'active'${b('t')}`),
    run(`SELECT p.id, p.category FROM properties p WHERE p.listing_type = 'rent' AND COALESCE(p.status,'') <> 'inactive'${b('p')}`),
    run(`SELECT COUNT(*) n FROM tenancies t WHERE t.status = 'active'
           AND t.lease_end BETWEEN CURDATE() AND CURDATE() + INTERVAL 30 DAY
           AND COALESCE(t.renewal_status,'none') IN ('none','declined')${b('t')}`),
    M.WtInvoice.findAll({ where: { ...scope, status: { [Op.notIn]: ['Draft', 'Cancelled', 'Void'] } }, raw: true }),
    M.WtServiceRequest.findAll({ where: scope, attributes: ['service_line', 'status', 'createdAt', 'client_name'], raw: true }),
    M.WtWorkOrder.findAll({ where: scope, attributes: ['code', 'client_name', 'service_line', 'status', 'target_date', 'completed_at'], raw: true }),
    // The branch picker's choices, for the only role that may switch. Read
    // here because /api/branches does not mount in this app.
    req.user?.role === 'super_admin' ? run('SELECT id, name FROM branches ORDER BY name') : [],
  ]);

  const inWin = (d, s = W.start, e = W.end) => { const x = day(d); return !!x && x >= s && x <= e; };
  const inPrev = (d) => inWin(d, W.prevStart, W.prevEnd);
  const monthOf = (d) => day(d).slice(0, 7);
  const zeros = () => W.months.map(() => 0);
  const bump = (arr, d, v = 1) => { const i = W.months.indexOf(monthOf(d)); if (i >= 0) arr[i] += v; };

  /* ── Money in one shape: { line, area, date, amount, owed, due } ───── */
  const billed = [];
  for (const i of rentInv) {
    const line = lineForCategory[i.category] || 'residential';
    billed.push({ line, date: i.issue_date, amount: num(i.total), owed: Math.max(0, num(i.balance)), due: i.due_date });
  }
  for (const i of bizInv) billed.push({ line: 'business', date: i.issue_date, amount: num(i.total_amount), owed: Math.max(0, num(i.total_amount) - num(i.paid_amount)), due: i.due_date });
  for (const i of brInv) billed.push({ line: BR_LINE, date: i.issue_date, amount: num(i.total_amount), owed: Math.max(0, num(i.total_amount) - num(i.paid_amount)), due: i.due_date });
  const cash = payments.map((p) => ({ line: lineForCategory[p.category] || 'residential', date: p.at, amount: num(p.amount), code: p.code }));
  for (const i of wtInvoices) {
    const t = invoiceSvc.computeTotals(i);
    const line = lineForService[i.service_line];
    if (!line) continue;
    const owed = ['sent', 'part paid', 'overdue'].includes(lc(i.status)) ? Math.max(0, num(t.outstanding)) : 0;
    billed.push({ line, date: i.issue_date, amount: num(t.amount), owed, due: i.due_date, overdue: lc(i.status) === 'overdue' });
    if (i.paid_at && num(i.paid_amount) > 0) cash.push({ line, date: i.paid_at, amount: num(i.paid_amount), code: i.code, wt: true, client: i.client_name });
  }
  const areaOf = (line) => LINE[line]?.area;
  const sum = (rows, f = (r) => r.amount) => round2(rows.reduce((s, r) => s + f(r), 0));

  /* ── Enquiries in one shape: { line, src, at, stage, who } ───────────── */
  const enquiries = [
    ...salesEnq.map((e) => ({ line: lineForCategory[e.category] || 'residential', src: 'sales', ...e })),
    ...rentalEnq.map((e) => ({ line: lineForCategory[e.category] || 'residential', src: 'rental', ...e })),
    ...stayEnq.map((e) => ({ line: 'residential', src: 'stay', ...e })),
    ...bizEnq.map((e) => ({ line: 'business', src: 'business', ...e })),
    ...brEnq.map((e) => ({ line: BR_LINE, src: 'business', ...e })),
    ...wtRequests.filter((r) => lineForService[r.service_line] && r.service_line !== BR_LINE)
      .map((r) => ({ line: lineForService[r.service_line], src: 'service', at: r.createdAt, stage: r.status, who: r.client_name })),
    ...wtRequests.filter((r) => r.service_line === BR_LINE)
      .map((r) => ({ line: BR_LINE, src: 'service', at: r.createdAt, stage: r.status, who: r.client_name })),
  ];

  /* ── Jobs ───────────────────────────────────────────────────────────── */
  const jobStage = (w) => (lc(w.status) === 'completed' ? 'completed' : lc(w.status) === 'in progress' ? 'in_progress' : lc(w.status) === 'issued' ? 'scheduled' : null);
  const liveJobs = wtOrders.filter((w) => ['scheduled', 'in_progress'].includes(jobStage(w)));
  const doneIn = (w, f) => jobStage(w) === 'completed' && f(w.completed_at);

  /* ── KPIs with their previous period and a monthly sparkline ───────── */
  const series = (rows, f = (r) => r.amount, dateKey = 'date') => { const a = zeros(); rows.forEach((r) => bump(a, r[dateKey], f(r))); return a.map(round2); };
  const kpi = (cur, prev, spark) => ({ value: cur, previous: prev, spark });
  const kpis = {
    revenue: kpi(sum(billed.filter((r) => inWin(r.date))), sum(billed.filter((r) => inPrev(r.date))), series(billed)),
    collected: kpi(sum(cash.filter((r) => inWin(r.date))), sum(cash.filter((r) => inPrev(r.date))), series(cash)),
    enquiries: kpi(enquiries.filter((e) => inWin(e.at)).length, enquiries.filter((e) => inPrev(e.at)).length, series(enquiries, () => 1, 'at')),
    jobs_completed: kpi(wtOrders.filter((w) => doneIn(w, inWin)).length, wtOrders.filter((w) => doneIn(w, inPrev)).length,
      series(wtOrders.filter((w) => jobStage(w) === 'completed'), () => 1, 'completed_at')),
  };

  /* ── Charts ─────────────────────────────────────────────────────────── */
  const revenueByArea = {
    months: W.months,
    areas: AREAS.map((a) => ({ ...a, values: series(billed.filter((r) => areaOf(r.line) === a.key)) })),
  };
  const cohort = enquiries.filter((e) => inWin(e.at));
  const funnel = FUNNEL.map((label, k) => ({ label, count: cohort.filter((e) => rankOf(e.src, e.stage) >= k).length }));

  const letIds = new Set(tenancies.map((t) => t.property_id));
  const occupancy = ['residential', 'business', 'commercial', 'rural'].map((cat) => {
    const units = rentals.filter((p) => p.category === cat);
    return { key: cat, label: LINE[cat].label, let: units.filter((p) => letIds.has(p.id)).length, total: units.length };
  });

  const jobs = LINES.filter((l) => l.service && l.key !== BR_LINE).map((l) => {
    const mine = wtOrders.filter((w) => l.service.includes(w.service_line));
    return {
      key: l.key, label: l.label, to: l.to,
      scheduled: mine.filter((w) => jobStage(w) === 'scheduled').length,
      in_progress: mine.filter((w) => jobStage(w) === 'in_progress').length,
      completed: mine.filter((w) => doneIn(w, inWin)).length,
    };
  });

  /* ── Business lines table ───────────────────────────────────────────── */
  const activeOf = (l) => {
    if (l.category) {
      const n = tenancies.filter((t) => t.category === l.category).length;
      return { count: n, unit: n === 1 ? 'tenancy' : 'tenancies' };
    }
    const n = liveJobs.filter((w) => l.service.includes(w.service_line)).length;
    return { count: n, unit: n === 1 ? 'job' : 'jobs' };
  };
  const lines = LINES.map((l) => ({
    key: l.key, label: l.label, area: l.area, to: l.to,
    enquiries: enquiries.filter((e) => e.line === l.key && inWin(e.at)).length,
    active: activeOf(l),
    revenue: sum(billed.filter((r) => r.line === l.key && inWin(r.date))),
    trend: series(billed.filter((r) => r.line === l.key)),
  })).sort((x, y) => y.revenue - x.revenue || y.enquiries - x.enquiries);

  /* ── Recent activity ────────────────────────────────────────────────── */
  const activity = [
    ...enquiries.map((e) => ({ kind: 'enquiry', at: e.at, line: e.line, title: `New enquiry${e.who ? ` from ${e.who}` : ''}` })),
    ...cash.map((c) => ({ kind: 'payment', at: c.date, line: c.line, title: `Payment received on ${c.code}`, amount: round2(c.amount) })),
    ...wtOrders.filter((w) => jobStage(w) === 'completed' && w.completed_at)
      .map((w) => ({ kind: 'job', at: w.completed_at, line: lineForService[w.service_line], title: `Job ${w.code} completed${w.client_name ? ` for ${w.client_name}` : ''}` })),
    ...tenancies.filter((t) => day(t.signed_date))
      .map((t) => ({ kind: 'lease', at: t.signed_date, line: lineForCategory[t.category] || 'residential', title: `Lease signed${t.title ? `, ${t.title}` : ''}` })),
  ].filter((a) => a.line && day(a.at) && day(a.at) <= today)
    .sort((x, y) => String(y.at).localeCompare(String(x.at)))
    .slice(0, 8)
    .map((a) => ({ ...a, at: a.at instanceof Date ? a.at.toISOString() : String(a.at), line_label: LINE[a.line].label, area: LINE[a.line].area }));

  /* ── What needs someone today (counts only; each opens its list) ────── */
  const overdue = billed.filter((r) => r.owed > 0.005 && (r.overdue || (day(r.due) && day(r.due) < today)));
  const attention = {
    overdue_invoices: overdue.length,
    overdue_amount: sum(overdue, (r) => r.owed),
    leases_ending: num(endingSoon[0]?.n),
    jobs_late: liveJobs.filter((w) => day(w.target_date) && day(w.target_date) < today).length,
  };

  res.json({
    generated_at: new Date().toISOString(),
    period: { key: W.key, label: W.label, previous_label: W.prevLabel, start: W.start, end: W.end, previous_start: W.prevStart, previous_end: W.prevEnd },
    kpis, revenue_by_area: revenueByArea, funnel, enquiries_trend: { months: W.months, values: kpis.enquiries.spark },
    occupancy, jobs, lines, activity, attention, branches: branchList,
  });
});

// Exposed for tests.
exports._window = periodWindow;
