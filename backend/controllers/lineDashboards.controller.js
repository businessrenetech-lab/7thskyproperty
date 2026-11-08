/**
 * lineDashboards.controller.js — the per-line console dashboards.
 *
 * Each service line opens on a dashboard shaped by how that business works:
 *
 *   jobs        field service, projects or cases — the shared wt_* engine, told
 *               apart by the X-Service-Line header (MODEL_OF picks the layout)
 *   rentals     tenancies and rent receipts, by property category
 *   sales       enquiries, offers, transactions and settlements, by category
 *   short-stay  bookings and blocks across serviced apartments
 *
 * Read-only and branch-scoped throughout. Every figure is computed from the
 * same rows the console's own list screens show; nothing here is estimated.
 *
 * `period` (month | quarter | year) sets the window the headline figures count
 * over, and how many months the monthly charts cover (6, 6, 12).
 */
const M = require('../models/waterTankOps');
const sequelize = require('../config/db.config');
const invoiceSvc = require('../services/wtInvoice.service');
const { asyncHandler, branchScope, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
const { getServiceLine } = require('../config/serviceLines');

const DAY = 864e5;
const num = (v) => Number(v || 0);
const lc = (v) => String(v || '').trim().toLowerCase();
const round = (v, dp = 0) => { const p = 10 ** dp; return Math.round(num(v) * p) / p; };
const pct = (a, b) => (b ? round((a / b) * 100) : null);
const date = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sum = (rows, f) => rows.reduce((s, r) => s + num(f(r)), 0);

const WINDOW = { month: 30, quarter: 91, year: 365 };
function periodOf(req) {
  const period = WINDOW[req.query.period] ? req.query.period : 'month';
  const now = new Date();
  const days = WINDOW[period];
  return {
    period, now,
    from: new Date(now - days * DAY),
    prevFrom: new Date(now - 2 * days * DAY),
    months: period === 'year' ? 12 : 6,
  };
}
const within = (d, a, b) => { const x = date(d); return !!x && x >= a && x < b; };

// Calendar months ending with the current one.
function monthBuckets(n, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end, label: start.toLocaleString('en-GB', { month: 'short' }) };
  });
}
// Monday-start weeks ending with the current one.
function weekBuckets(n, now = new Date()) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return Array.from({ length: n }, (_, i) => {
    const start = new Date(monday.getTime() - (n - 1 - i) * 7 * DAY);
    return { start, end: new Date(start.getTime() + 7 * DAY), label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  });
}
const bucketed = (buckets, rows, dateOf, valueOf = () => 1) => buckets.map((b) => round(sum(rows.filter((r) => within(dateOf(r), b.start, b.end)), valueOf), 2));
const labels = (buckets) => buckets.map((b) => b.label);

// A headline figure: this window against the one before it, plus a trend line.
const kpi = (key, label, value, extra = {}) => ({ key, label, value, ...extra });
const change = (cur, prev) => (prev ? round(((cur - prev) / prev) * 100) : null);

// SQL branch filter for raw queries: '' for super admin, else "AND <alias>.branch_id = :branch".
function sqlScope(req, alias) {
  const b = branchScope(req);
  return 'branch_id' in b ? { clause: ` AND ${alias}.branch_id = :branch`, branch: b.branch_id } : { clause: '', branch: null };
}
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

/* ────────────────────────────────────────────────────────────────────────────
 * Jobs — the wt_* engine
 * ──────────────────────────────────────────────────────────────────────────── */

const MODEL_OF = {
  water_tank: 'field', air_conditioning: 'field', removal_relocation: 'field', property_care_concierge: 'field',
  residential_interior_design: 'projects', fitness_room_interior_design: 'projects', commercial_interior_design: 'projects',
  custom_design_fitout: 'projects', furniture_styling_consultation: 'projects', prayer_room_interior_design: 'projects',
  space_planning_renovation: 'projects',
  business_registration: 'cases', land_property_assessment: 'cases', loan_financial_support: 'cases',
  property_documentation_verification: 'cases', property_will_succession: 'cases',
};

const isDone = (w) => lc(w.status) === 'completed' || !!w.completed_at;
const isVoid = (i) => lc(i.status) === 'void';
const isIssued = (i) => !['draft', 'void'].includes(lc(i.status));
const onTime = (w) => {
  const done = date(w.completed_at); const due = date(w.target_date);
  if (!done || !due) return null;
  return done <= new Date(due.getTime() + DAY); // the whole target day counts
};
const openProject = (p) => lc(p.status) === 'open';
const closedAt = (p) => date(p.closed_at) || date(p.actual_completion) || (lc(p.status) === 'completed' ? date(p.updatedAt) : null);

// Stage labels as people read them, in the order work moves.
const STAGE_ORDER = ['lead', 'assessment', 'quotation', 'agreement', 'documents', 'filed', 'design', 'execution', 'completion', 'handover', 'amc'];
function stageKey(s) {
  const v = lc(s);
  if (/lead|enquir|intake/.test(v)) return ['lead', 'Lead'];
  if (/assess/.test(v)) return ['assessment', 'Assessment'];
  if (/quot/.test(v)) return ['quotation', 'Quotation'];
  if (/agree/.test(v)) return ['agreement', 'Agreement'];
  if (/doc/.test(v)) return ['documents', 'Documents'];
  if (/fil|submit|authorit/.test(v)) return ['filed', 'Filed'];
  if (/design|concept/.test(v)) return ['design', 'Design'];
  if (/exec|progress|install|work/.test(v)) return ['execution', 'In progress'];
  if (/complet|clos/.test(v)) return ['completion', 'Completed'];
  if (/hand/.test(v)) return ['handover', 'Handover'];
  if (/amc|ongoing/.test(v)) return ['amc', 'Ongoing support'];
  return [v || 'other', s || 'Other'];
}
function stageCounts(projects) {
  const map = new Map();
  for (const p of projects) {
    const [k, label] = stageKey(p.stage);
    const e = map.get(k) || { key: k, label, count: 0 };
    e.count += 1; map.set(k, e);
  }
  const rank = (k) => { const i = STAGE_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  return [...map.values()].sort((a, b) => rank(a.key) - rank(b.key));
}

exports.jobs = asyncHandler(async (req, res) => {
  const line = resolveServiceLine(req);
  const model = MODEL_OF[line] || 'field';
  const where = { ...branchScope(req), ...serviceScope(req) };
  const P = periodOf(req);

  const [wos, projects, invoices, complaints, providers, requests] = await Promise.all([
    M.WtWorkOrder.findAll({ where, raw: true }),
    M.WtProject.findAll({ where, raw: true }),
    M.WtInvoice.findAll({ where, raw: true }),
    M.WtComplaint.findAll({ where, raw: true }),
    M.WtProvider.findAll({ where, raw: true }),
    M.WtServiceRequest.findAll({ where, raw: true }),
  ]);

  // Invoice money through the same computeTotals() the invoice screens use.
  const inv = invoices.filter((i) => !isVoid(i)).map((i) => {
    const t = invoiceSvc.computeTotals(i);
    return { ...i, total: num(t.amount), paid: num(t.paid_amount), outstanding: num(t.outstanding), issued_on: i.issue_date || i.sent_at || i.createdAt, paid_on: i.paid_at || (num(t.paid_amount) ? i.updatedAt : null) };
  });
  const issued = inv.filter(isIssued);
  const months = monthBuckets(P.months, P.now);

  const base = { model, line, line_label: getServiceLine(line)?.label || line, period: P.period, generated_at: P.now };

  if (model === 'field') return res.json({ ...base, ...fieldService(P, months, { wos, issued, complaints, providers, requests }) });
  if (model === 'projects') return res.json({ ...base, ...projectWork(P, months, { projects, inv, wos }) });
  return res.json({ ...base, ...caseWork(P, months, { projects, wos, issued, requests }) });
});

function fieldService(P, months, { wos, issued, complaints, providers, requests }) {
  const weeks = weekBuckets(12, P.now);
  const live = wos.filter((w) => lc(w.status) !== 'cancelled');
  const doneIn = (a, b) => live.filter((w) => isDone(w) && within(w.completed_at || w.updatedAt, a, b));
  const done = doneIn(P.from, P.now);
  const donePrev = doneIn(P.prevFrom, P.from);
  const inProgress = live.filter((w) => ['in progress', 'issued', 'accepted'].includes(lc(w.status)));
  const timed = done.map(onTime).filter((x) => x !== null);
  const timedAll = live.filter(isDone).map(onTime).filter((x) => x !== null);
  const onTimeRate = pct(timed.filter(Boolean).length, timed.length) ?? pct(timedAll.filter(Boolean).length, timedAll.length);
  const billed = sum(issued.filter((i) => within(i.issued_on, P.from, P.now)), (i) => i.total);
  const billedPrev = sum(issued.filter((i) => within(i.issued_on, P.prevFrom, P.from)), (i) => i.total);
  const openComplaints = complaints.filter((c) => !['resolved', 'closed'].includes(lc(c.status)));
  const overdueComplaints = openComplaints.filter((c) => date(c.sla_due) && date(c.sla_due) < P.now);

  // Each work order counted in the week it was raised, coloured by where it stands now.
  const weekly = [
    { key: 'not_started', label: 'Not started', values: bucketed(weeks, live.filter((w) => !isDone(w) && !inProgress.includes(w)), (w) => w.createdAt) },
    { key: 'in_progress', label: 'In progress', values: bucketed(weeks, inProgress, (w) => w.createdAt) },
    { key: 'completed', label: 'Completed', values: bucketed(weeks, live.filter(isDone), (w) => w.createdAt) },
  ];

  const rating = new Map(providers.map((p) => [lc(p.business_name), num(p.rating) || null]));
  const byProvider = new Map();
  for (const w of live) {
    const name = (w.provider_name || w.external_provider_name || '').trim();
    if (!name) continue;
    const e = byProvider.get(name) || { name, jobs: 0, done: 0, on_time: 0, timed: 0, payout_due: 0 };
    e.jobs += 1;
    if (isDone(w)) e.done += 1;
    const t = onTime(w); if (t !== null) { e.timed += 1; if (t) e.on_time += 1; }
    if (lc(w.payout_status) !== 'paid') e.payout_due += Math.max(0, num(w.provider_net_payable || w.provider_fee) - num(w.provider_paid_amount));
    byProvider.set(name, e);
  }
  const providerRows = [...byProvider.values()]
    .map((e) => ({ name: e.name, jobs: e.jobs, completed: e.done, on_time: pct(e.on_time, e.timed), rating: rating.get(lc(e.name)) ?? null, payout_due: round(e.payout_due) }))
    .sort((a, b) => b.jobs - a.jobs);
  const unassigned = live.filter((w) => !isDone(w) && !(w.provider_name || w.external_provider_name || '').trim()).length;

  const reasons = new Map();
  for (const c of complaints) {
    const label = (c.incident_type || 'Other').trim();
    const k = lc(label);
    const e = reasons.get(k) || { label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(), count: 0, open: 0 };
    e.count += 1; if (!['resolved', 'closed'].includes(lc(c.status))) e.open += 1;
    reasons.set(k, e);
  }
  const resolvedHours = complaints.map((c) => num(c.resolution_hours)).filter((h) => h > 0);
  const newRequests = requests.filter((r) => within(r.request_date || r.createdAt, P.from, P.now)).length;

  return {
    kpis: [
      kpi('completed', 'Jobs completed', done.length, { format: 'count', change: change(done.length, donePrev.length), spark: bucketed(weeks.slice(-8), live.filter(isDone), (w) => w.completed_at || w.updatedAt) }),
      kpi('in_progress', 'In progress', inProgress.length, { format: 'count', note: `${unassigned} without a provider`, tone: unassigned ? 'warn' : null }),
      kpi('on_time', 'On time', onTimeRate, { format: 'pct', note: 'target 90%', tone: onTimeRate !== null && onTimeRate < 90 ? 'down' : 'up' }),
      kpi('invoiced', 'Invoiced', billed, { format: 'money', change: change(billed, billedPrev), spark: bucketed(months, issued, (i) => i.issued_on, (i) => i.total) }),
      kpi('requests', 'New requests', newRequests, { format: 'count', spark: bucketed(weeks.slice(-8), requests, (r) => r.request_date || r.createdAt) }),
      kpi('complaints', 'Open complaints', openComplaints.length, { format: 'count', note: overdueComplaints.length ? `${overdueComplaints.length} past response time` : 'none overdue', tone: overdueComplaints.length ? 'down' : null }),
    ],
    weekly: { labels: labels(weeks), series: weekly },
    on_time: { rate: onTimeRate, target: 90, providers: providerRows.filter((p) => p.on_time !== null).slice(0, 5) },
    providers: providerRows.slice(0, 6),
    unassigned,
    revenue: { labels: labels(months), invoiced: bucketed(months, issued, (i) => i.issued_on, (i) => i.total), collected: bucketed(months, issued, (i) => i.paid_on, (i) => i.paid) },
    complaints: {
      reasons: [...reasons.values()].sort((a, b) => b.count - a.count).slice(0, 5),
      median_hours: median(resolvedHours) !== null ? round(median(resolvedHours), 1) : null,
      target_hours: 24,
      open: openComplaints.length,
      overdue: overdueComplaints.length,
    },
  };
}

function projectWork(P, months, { projects, inv, wos }) {
  // Invoices and work orders carry the project's code in project_id (older rows its id).
  const keyOf = new Map();
  for (const p of projects) { keyOf.set(String(p.id), p.code); keyOf.set(String(p.code), p.code); }
  const projectKey = (v) => keyOf.get(String(v ?? '')) || null;
  const byProject = new Map();
  const slot = (k) => { if (!byProject.has(k)) byProject.set(k, { scheduled: 0, invoiced: 0, collected: 0, contract: 0 }); return byProject.get(k); };
  for (const i of inv) {
    const k = projectKey(i.project_id); if (!k) continue;
    const e = slot(k);
    e.scheduled += i.total; if (isIssued(i)) e.invoiced += i.total; e.collected += i.paid;
  }
  for (const w of wos) { const k = projectKey(w.project_id); if (k && lc(w.status) !== 'cancelled') slot(k).contract += num(w.total_contract); }
  const money = (p) => byProject.get(p.code) || { scheduled: 0, invoiced: 0, collected: 0, contract: 0 };
  const valueOf = (p) => num(p.contract_value) || money(p).contract || money(p).scheduled;
  const active = projects.filter(openProject);
  const value = sum(active, valueOf);
  const collected = sum(active, (p) => money(p).collected);
  const soon = new Date(P.now.getTime() + 30 * DAY);
  const dueSoon = inv.filter((i) => i.outstanding > 0 && within(i.due_date, P.now, soon));
  const overBudget = active.filter((p) => num(p.cost_budget) > 0 && money(p).invoiced > num(p.cost_budget));
  const started = projects.filter((p) => within(p.createdAt, P.from, P.now)).length;

  const budget = active
    .map((p) => ({ code: p.code, name: p.name || p.client_name || p.code, value: round(valueOf(p)), invoiced: round(money(p).invoiced), collected: round(money(p).collected), budget: num(p.cost_budget) || null }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // The next eight weeks: anything planned to be on site, and every payment falling due.
  const horizon = new Date(P.now.getTime() + 56 * DAY);
  const timeline = active.map((p) => {
    const from = date(p.actual_start) || date(p.scheduled_date) || date(p.start_date);
    const to = date(p.target_completion) || date(p.actual_completion);
    const pays = inv.filter((i) => projectKey(i.project_id) === p.code && i.outstanding > 0 && within(i.due_date, P.now, horizon)).map((i) => ({ on: i.due_date, label: i.code, amount: round(i.outstanding) }));
    const bar = from && to && to >= P.now && from <= horizon ? { from: from < P.now ? P.now : from, to: to > horizon ? horizon : to, label: stageKey(p.stage)[1] } : null;
    return bar || pays.length ? { code: p.code, name: p.name || p.client_name || p.code, bar, payments: pays } : null;
  }).filter(Boolean).slice(0, 6);

  return {
    kpis: [
      kpi('active', 'Active projects', active.length, { format: 'count', note: `${started} started`, tone: 'up' }),
      kpi('value', 'Contract value', value, { format: 'money', note: `across ${active.length}` }),
      kpi('collected', 'Collected', collected, { format: 'money', note: value ? `${pct(collected, value)}% of value` : null, spark: bucketed(months, inv, (i) => i.paid_on, (i) => i.paid) }),
      kpi('due', 'Payments due', dueSoon.length, { format: 'count', note: `next 30 days, ${moneyText(sum(dueSoon, (i) => i.outstanding))}` }),
      kpi('over', 'Over budget', overBudget.length, { format: 'count', note: overBudget.length ? 'review costs' : 'all within budget', tone: overBudget.length ? 'down' : null }),
    ],
    phases: stageCounts(active),
    budget,
    milestones: { labels: labels(months), scheduled: bucketed(months, inv, (i) => i.due_date, (i) => i.total), collected: bucketed(months, inv, (i) => i.paid_on, (i) => i.paid) },
    timeline: { from: P.now, to: horizon, rows: timeline },
  };
}

function caseWork(P, months, { projects, wos, issued, requests }) {
  const open = projects.filter(openProject);
  const closed = projects.map((p) => ({ p, at: closedAt(p) })).filter((x) => x.at);
  const days = (x) => (x.at - date(x.p.createdAt)) / DAY;
  const closedIn = closed.filter((x) => x.at >= P.from);
  const turnaroundNow = median(closedIn.map(days)) ?? median(closed.map(days));
  const age = (p) => Math.floor((P.now - date(p.createdAt)) / DAY);
  const AGE = [['0–7 days', 0, 7], ['8–14', 8, 14], ['15–30', 15, 30], ['31–60', 31, 60], ['Over 60', 61, Infinity]];
  const fees = sum(issued.filter((i) => within(i.issued_on, P.from, P.now)), (i) => i.total);
  const newCases = projects.filter((p) => within(p.createdAt, P.from, P.now)).length;
  const newPrev = projects.filter((p) => within(p.createdAt, P.prevFrom, P.from)).length;
  const old = open.filter((p) => age(p) > 30);

  return {
    kpis: [
      kpi('open', 'Open cases', open.length, { format: 'count', note: `${newCases} new`, tone: 'up' }),
      kpi('new', 'New cases', newCases, { format: 'count', change: change(newCases, newPrev), spark: bucketed(months, projects, (p) => p.createdAt) }),
      kpi('turnaround', 'Median turnaround', turnaroundNow !== null ? round(turnaroundNow) : null, { format: 'days', note: closed.length ? `${closed.length} closed` : 'none closed yet' }),
      kpi('old', 'Open over 30 days', old.length, { format: 'count', tone: old.length ? 'down' : null, note: old.length ? 'needs a push' : 'none' }),
      kpi('fees', 'Fees invoiced', fees, { format: 'money', spark: bucketed(months, issued, (i) => i.issued_on, (i) => i.total) }),
    ],
    stages: stageCounts(open),
    ageing: AGE.map(([label, a, b]) => ({ label, count: open.filter((p) => age(p) >= a && age(p) <= b).length })),
    turnaround: { labels: labels(months), values: months.map((m) => { const v = median(closed.filter((x) => x.at >= m.start && x.at < m.end).map(days)); return v === null ? null : round(v, 1); }) },
    waiting: [...open].sort((a, b) => date(a.createdAt) - date(b.createdAt)).slice(0, 8)
      .map((p) => ({ code: p.code, client: p.client_name || '—', stage: stageKey(p.stage)[1], days: age(p), officer: p.assigned_officer || null })),
    requests_open: requests.filter((r) => !['converted', 'closed', 'completed'].includes(lc(r.status))).length,
  };
}

// Taka in lakh / crore, as the business reads it: Tk 9.6L, Tk 1.2Cr.
const moneyText = (v) => {
  const x = num(v); const a = Math.abs(x);
  const f = (d, s) => `Tk ${+(x / d).toFixed(a / d >= 10 ? 0 : 1)}${s}`;
  return a >= 1e7 ? f(1e7, 'Cr') : a >= 1e5 ? f(1e5, 'L') : a >= 1e3 ? f(1e3, 'k') : `Tk ${Math.round(x)}`;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Rentals — tenancies and rent receipts
 * ──────────────────────────────────────────────────────────────────────────── */

const CATEGORIES = ['residential', 'commercial', 'business', 'rural'];

exports.rentals = asyncHandler(async (req, res) => {
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : 'residential';
  const P = periodOf(req);
  const ps = sqlScope(req, 'p');
  const rs = sqlScope(req, 'r');
  const ts = sqlScope(req, 't');
  const rep = { category, branch: ps.branch };

  const [units, tenancies, receipts] = await Promise.all([
    q(`SELECT p.id, p.property_type, p.status FROM properties p
       WHERE p.listing_type = 'rent' AND p.category = :category AND COALESCE(p.status, '') NOT IN ('inactive', 'archived')${ps.clause}`, rep),
    q(`SELECT t.id, t.property_id, t.status, t.lease_end, t.monthly_rent, t.renewal_status, t.tenancy_code,
              COALESCE(NULLIF(c.full_name, ''), TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), c.company_name) AS tenant,
              p.title AS property, p.property_code
       FROM tenancies t JOIN properties p ON p.id = t.property_id
       LEFT JOIN contacts c ON c.id = t.tenant_contact_id
       WHERE p.category = :category${ts.clause}`, rep),
    q(`SELECT r.id, r.tenancy_id, r.property_id, r.total_amount, r.amount_paid, r.balance, r.due_date, r.status, r.updated_at,
              COALESCE(NULLIF(c.full_name, ''), TRIM(CONCAT_WS(' ', c.first_name, c.last_name)), c.company_name) AS tenant,
              p.title AS property, p.property_code
       FROM rental_receipts r JOIN properties p ON p.id = r.property_id
       LEFT JOIN contacts c ON c.id = r.tenant_contact_id
       WHERE p.category = :category${rs.clause}`, rep),
  ]);

  const active = tenancies.filter((t) => lc(t.status) === 'active');
  const occupiedIds = new Set(active.map((t) => t.property_id));
  const unitIds = new Set(units.map((u) => u.id));
  for (const id of occupiedIds) unitIds.add(id);
  const occupied = occupiedIds.size;
  const months12 = monthBuckets(P.period === 'month' ? 6 : 12, P.now);

  const owed = (r) => Math.max(0, num(r.total_amount) - num(r.amount_paid));
  const billedIn = (a, b) => receipts.filter((r) => within(r.due_date, a, b));
  const billed = billedIn(P.from, P.now);
  const billedAmt = sum(billed, (r) => r.total_amount);
  const collectedAmt = sum(billed, (r) => Math.min(num(r.amount_paid), num(r.total_amount)));
  const late = receipts.filter((r) => owed(r) > 0 && date(r.due_date) && date(r.due_date) < P.now);
  const lateDays = (r) => Math.floor((P.now - date(r.due_date)) / DAY);
  const tenantsLate = new Set(late.map((r) => r.tenancy_id || r.tenant)).size;
  const soon = new Date(P.now.getTime() + 90 * DAY);
  const ending = active.filter((t) => within(t.lease_end, P.now, soon));

  // Occupancy by property type.
  const types = new Map();
  for (const u of units) {
    const k = lc(u.property_type) || 'other';
    const e = types.get(k) || { label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '), total: 0, occupied: 0 };
    e.total += 1; if (occupiedIds.has(u.id)) e.occupied += 1;
    types.set(k, e);
  }

  // Overdue rent grouped per tenancy, oldest first.
  const perTenancy = new Map();
  for (const r of late) {
    const k = r.tenancy_id || `${r.tenant}-${r.property_id}`;
    const e = perTenancy.get(k) || { tenant: r.tenant || '—', property: [r.property_code, r.property].filter(Boolean).join(', '), owed: 0, days: 0, receipts: 0 };
    e.owed += owed(r); e.days = Math.max(e.days, lateDays(r)); e.receipts += 1;
    perTenancy.set(k, e);
  }
  const AGE = [['Under 30 days', 0, 30], ['31–60', 31, 60], ['61–90', 61, 90], ['Over 90', 91, Infinity]];

  const ahead = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(P.now.getFullYear(), P.now.getMonth() + i, 1);
    return { start, end: new Date(start.getFullYear(), start.getMonth() + 1, 1), label: start.toLocaleString('en-GB', { month: 'short' }) };
  });
  const renewing = (t) => /agreed|accepted|activated|approved|offer/.test(lc(t.renewal_status));

  res.json({
    model: 'rentals', category, period: P.period, generated_at: P.now,
    kpis: [
      kpi('occupancy', 'Occupancy', pct(occupied, unitIds.size), { format: 'pct', note: `${occupied} of ${unitIds.size} units` }),
      kpi('billed', 'Rent billed', billedAmt, { format: 'money', spark: bucketed(months12, receipts, (r) => r.due_date, (r) => r.total_amount) }),
      kpi('collected', 'Collected', collectedAmt, { format: 'money', note: billedAmt ? `${pct(collectedAmt, billedAmt)}% of billed` : null, tone: billedAmt && collectedAmt / billedAmt < 0.9 ? 'down' : 'up' }),
      kpi('arrears', 'Overdue rent', sum(late, owed), { format: 'money', note: `${tenantsLate} tenant${tenantsLate === 1 ? '' : 's'}`, tone: late.length ? 'down' : null }),
      kpi('ending', 'Leases ending', ending.length, { format: 'count', note: 'next 90 days' }),
    ],
    billing: { labels: labels(months12), billed: bucketed(months12, receipts, (r) => r.due_date, (r) => r.total_amount), collected: bucketed(months12, receipts, (r) => r.due_date, (r) => Math.min(num(r.amount_paid), num(r.total_amount))) },
    occupancy: [...types.values()].sort((a, b) => b.total - a.total).slice(0, 6),
    vacant: unitIds.size - occupied,
    arrears: {
      buckets: AGE.map(([label, a, b]) => ({ label, amount: round(sum(late.filter((r) => lateDays(r) >= a && lateDays(r) <= b), owed)) })),
      rows: [...perTenancy.values()].sort((a, b) => b.days - a.days).slice(0, 6).map((e) => ({ ...e, owed: round(e.owed) })),
    },
    leases: { labels: labels(ahead), renewing: ahead.map((m) => active.filter((t) => within(t.lease_end, m.start, m.end) && renewing(t)).length), not_started: ahead.map((m) => active.filter((t) => within(t.lease_end, m.start, m.end) && !renewing(t)).length) },
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Sales — enquiries → offers → transactions → settlements
 * ──────────────────────────────────────────────────────────────────────────── */

exports.sales = asyncHandler(async (req, res) => {
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : 'residential';
  const P = periodOf(req);
  const ps = sqlScope(req, 'p');
  const rep = { category, branch: ps.branch };

  const [listings, enquiries, offers, deals] = await Promise.all([
    q(`SELECT p.id, p.status, p.price, p.created_at FROM properties p WHERE p.listing_type = 'sale' AND p.category = :category${ps.clause}`, rep),
    q(`SELECT e.id, e.source, e.stage, e.created_at FROM sales_enquiries e JOIN properties p ON p.id = e.property_id WHERE p.category = :category${ps.clause}`, rep),
    q(`SELECT o.id, o.status, o.amount FROM sale_offers o JOIN properties p ON p.id = o.property_id WHERE p.category = :category${ps.clause}`, rep),
    q(`SELECT t.id, t.status, t.created_at, t.created_by, p.created_at AS listed_at, u.name AS agent,
              o.amount AS price, s.locked_at, s.status AS settlement_status,
              (SELECT COALESCE(SUM(l.amount), 0) FROM sale_settlement_lines l WHERE l.settlement_id = s.id AND l.line_type = 'commission') AS commission
       FROM sale_transactions t JOIN properties p ON p.id = t.property_id
       LEFT JOIN sale_offers o ON o.id = t.accepted_offer_id
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN sale_settlements s ON s.id = (SELECT MAX(s2.id) FROM sale_settlements s2 WHERE s2.transaction_id = t.id AND COALESCE(s2.settlement_type, 'completion') = 'completion')
       WHERE p.category = :category${ps.clause}`, rep),
  ]);

  const settledOn = (d) => d.locked_at || (lc(d.status) === 'completed' ? d.created_at : null);
  const settled = deals.filter((d) => lc(d.status) === 'completed');
  const openDeals = deals.filter((d) => ['active', 'settlement'].includes(lc(d.status)));
  const settledIn = (a, b) => settled.filter((d) => within(settledOn(d), a, b));
  const sNow = settledIn(P.from, P.now);
  const sPrev = settledIn(P.prevFrom, P.from);
  const commission = sum(sNow, (d) => d.commission);
  const value = sum(sNow, (d) => d.price);
  const enqNow = enquiries.filter((e) => within(e.created_at, P.from, P.now));
  const enqPrev = enquiries.filter((e) => within(e.created_at, P.prevFrom, P.from));
  const months = monthBuckets(P.months, P.now);
  const stageOf = (s) => lc(s);
  const viewing = enquiries.filter((e) => /view/.test(stageOf(e.stage)));
  const openEnq = enquiries.filter((e) => ['new', 'contacted'].includes(stageOf(e.stage)));
  const openOffers = offers.filter((o) => ['draft', 'submitted', 'countered'].includes(lc(o.status)));
  const available = listings.filter((l) => lc(l.status) === 'available');

  const sources = new Map();
  for (const e of enquiries) {
    const k = lc(e.source) || 'other';
    sources.set(k, (sources.get(k) || 0) + 1);
  }
  const nice = (k) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const domDays = settled.map((d) => (date(settledOn(d)) - date(d.listed_at)) / DAY).filter((x) => Number.isFinite(x) && x >= 0);
  const DOM = [['0–30', 0, 30], ['31–60', 31, 60], ['61–90', 61, 90], ['91–120', 91, 120], ['Over 120', 121, Infinity]];

  const agents = new Map();
  for (const d of deals) {
    const name = d.agent || 'Unassigned';
    const e = agents.get(name) || { name, open: 0, settled: 0, value: 0, commission: 0 };
    if (lc(d.status) === 'completed') { e.settled += 1; e.value += num(d.price); e.commission += num(d.commission); } else if (lc(d.status) !== 'cancelled') e.open += 1;
    agents.set(name, e);
  }
  const converted = enquiries.filter((e) => !['new', 'contacted', 'lost', 'closed'].includes(stageOf(e.stage))).length;

  res.json({
    model: 'sales', category, period: P.period, generated_at: P.now,
    kpis: [
      kpi('pipeline', 'Pipeline value', sum(openDeals, (d) => d.price) + sum(openOffers, (o) => o.amount), { format: 'money', note: `${openDeals.length + openOffers.length} open deals` }),
      kpi('settled', 'Settled', sNow.length, { format: 'count', note: moneyText(value), change: change(sNow.length, sPrev.length), spark: bucketed(months, settled, settledOn) }),
      kpi('commission', 'Commission earned', commission, { format: 'money', spark: bucketed(months, settled, settledOn, (d) => d.commission) }),
      kpi('enquiries', 'New enquiries', enqNow.length, { format: 'count', change: change(enqNow.length, enqPrev.length) }),
      kpi('listings', 'Listings available', available.length, { format: 'count', note: domDays.length ? `median ${round(median(domDays))} days to sell` : null }),
    ],
    pipeline: [
      { key: 'enquiry', label: 'Enquiry', count: openEnq.length, value: null },
      { key: 'viewing', label: 'Viewing', count: viewing.length, value: null },
      { key: 'offer', label: 'Offer', count: openOffers.length, value: round(sum(openOffers, (o) => o.amount)) },
      { key: 'contract', label: 'Under contract', count: openDeals.length, value: round(sum(openDeals, (d) => d.price)) },
      { key: 'settled', label: 'Settled', count: settled.length, value: round(sum(settled, (d) => d.price)) },
    ],
    commission: { labels: labels(months), values: bucketed(months, settled, settledOn, (d) => d.commission) },
    sources: [...sources.entries()].map(([k, n]) => ({ label: nice(k), count: n })).sort((a, b) => b.count - a.count).slice(0, 5),
    conversion: { enquiries: enquiries.length, progressed: converted, rate: pct(converted, enquiries.length) },
    days_on_market: DOM.map(([label, a, b]) => ({ label, count: domDays.filter((x) => x >= a && x <= b).length })),
    agents: [...agents.values()].sort((a, b) => b.settled - a.settled || b.open - a.open).slice(0, 6).map((a) => ({ ...a, value: round(a.value), commission: round(a.commission) })),
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Short stay — bookings across serviced apartments
 * ──────────────────────────────────────────────────────────────────────────── */

exports.shortStay = asyncHandler(async (req, res) => {
  const P = periodOf(req);
  const ps = sqlScope(req, 'sp');
  const rep = { branch: ps.branch };
  const [units, bookings, blocks] = await Promise.all([
    q(`SELECT sp.property_id AS id, COALESCE(p.title, p.property_code) AS name, sp.base_nightly_rate FROM short_stay_property_profiles sp
       JOIN properties p ON p.id = sp.property_id WHERE COALESCE(sp.status, 'active') <> 'archived'${ps.clause} ORDER BY name`, rep),
    q(`SELECT b.id, b.booking_code, b.property_id, b.booking_source, b.check_in_date, b.check_out_date, b.nights_count,
              b.total_accommodation_amount, b.total_booking_value, b.paid_amount, b.status, b.created_at,
              COALESCE(NULLIF(c.full_name, ''), TRIM(CONCAT_WS(' ', c.first_name, c.last_name))) AS guest
       FROM short_stay_bookings b LEFT JOIN contacts c ON c.id = b.lead_guest_contact_id
       WHERE 1 = 1${ps.clause.replace('sp.', 'b.')}`, rep),
    q(`SELECT a.property_id, a.start_date, a.end_date, a.block_type, a.booking_id FROM short_stay_availability_blocks a WHERE 1 = 1${ps.clause.replace('sp.', 'a.')}`, rep),
  ]);

  const live = bookings.filter((b) => lc(b.status) !== 'cancelled');
  const nightsBetween = (b, a, z) => {
    const s = date(b.check_in_date); const e = date(b.check_out_date);
    if (!s || !e) return 0;
    return Math.max(0, Math.round((Math.min(e, z) - Math.max(s, a)) / DAY));
  };
  const days = Math.round((P.now - P.from) / DAY);
  const booked = sum(live, (b) => nightsBetween(b, P.from, P.now));
  const bookedPrev = sum(live, (b) => nightsBetween(b, P.prevFrom, P.from));
  const inWin = live.filter((b) => within(b.check_in_date, P.from, P.now));
  const accom = sum(inWin, (b) => b.total_accommodation_amount);
  const nights = sum(inWin, (b) => b.nights_count);
  const revenue = sum(inWin, (b) => b.total_booking_value);
  const pending = live.filter((b) => lc(b.status) === 'pending_agreement');
  const months = monthBuckets(P.months, P.now);

  // Next 30 days, one row per unit.
  const today = new Date(P.now.getFullYear(), P.now.getMonth(), P.now.getDate());
  const end = new Date(today.getTime() + 30 * DAY);
  const iso = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const kindOf = (b) => (lc(b.status) === 'pending_agreement' ? 'pending' : 'booked');
  const calendar = units.map((u) => ({
    id: u.id, name: u.name,
    items: [
      ...live.filter((b) => b.property_id === u.id && date(b.check_out_date) > today && date(b.check_in_date) < end)
        .map((b) => ({ from: iso(b.check_in_date), to: iso(b.check_out_date), kind: kindOf(b), label: b.guest || b.booking_code })),
      ...blocks.filter((a) => a.property_id === u.id && !a.booking_id && date(a.end_date) > today && date(a.start_date) < end)
        .map((a) => ({ from: iso(a.start_date), to: iso(a.end_date), kind: 'blocked', label: a.block_type || 'Blocked' })),
    ],
  }));

  const channels = new Map();
  for (const b of live) { const k = lc(b.booking_source) || 'direct'; channels.set(k, (channels.get(k) || 0) + 1); }
  const lead = live.map((b) => (date(b.check_in_date) - date(b.created_at)) / DAY).filter((x) => Number.isFinite(x) && x >= 0);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const week = new Date(today.getTime() + 7 * DAY);
  const isDay = (d, day) => { const x = date(d); return !!x && iso(x) === iso(day); };
  const upcoming = [
    ...live.filter((b) => within(b.check_in_date, today, week) && lc(b.status) !== 'checked_in' && lc(b.status) !== 'checked_out').map((b) => ({ kind: 'in', on: iso(b.check_in_date), title: 'Check-in', unit: unitName.get(b.property_id), guest: b.guest, nights: num(b.nights_count), status: lc(b.status) === 'pending_agreement' ? 'Agreement not signed' : 'Confirmed', tone: lc(b.status) === 'pending_agreement' ? 'red' : 'green' })),
    ...live.filter((b) => within(b.check_out_date, today, week) && lc(b.status) !== 'checked_out').map((b) => ({ kind: 'out', on: iso(b.check_out_date), title: 'Check-out', unit: unitName.get(b.property_id), guest: b.guest, nights: num(b.nights_count), status: num(b.paid_amount) < num(b.total_booking_value) ? 'Balance due' : 'Paid', tone: num(b.paid_amount) < num(b.total_booking_value) ? 'amber' : 'green' })),
  ].sort((a, b) => a.on.localeCompare(b.on)).slice(0, 6);

  res.json({
    model: 'short-stay', period: P.period, generated_at: P.now,
    today: iso(today),
    kpis: [
      kpi('occupancy', 'Occupancy', units.length ? pct(booked, units.length * days) : null, { format: 'pct', note: `${units.length} units` }),
      kpi('nights', 'Nights booked', booked, { format: 'count', change: change(booked, bookedPrev) }),
      kpi('rate', 'Average nightly rate', nights ? round(accom / nights) : null, { format: 'money' }),
      kpi('revenue', 'Booking revenue', revenue, { format: 'money', spark: bucketed(months, live, (b) => b.check_in_date, (b) => b.total_booking_value) }),
      kpi('pending', 'Awaiting agreement', pending.length, { format: 'count', tone: pending.length ? 'warn' : null, note: pending.length ? 'bookings' : 'none' }),
    ],
    calendar: { from: iso(today), days: 30, units: calendar },
    revenue: { labels: labels(months), values: bucketed(months, live, (b) => b.check_in_date, (b) => b.total_booking_value) },
    channels: [...channels.entries()].map(([k, n]) => ({ label: k === 'booking_com' ? 'Booking.com' : k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()), count: n })).sort((a, b) => b.count - a.count),
    stay: { average_nights: live.length ? round(sum(live, (b) => b.nights_count) / live.length, 1) : null, lead_days: lead.length ? round(median(lead)) : null },
    upcoming,
    today_counts: { check_ins: live.filter((b) => isDay(b.check_in_date, today)).length, check_outs: live.filter((b) => isDay(b.check_out_date, today)).length },
  });
});
