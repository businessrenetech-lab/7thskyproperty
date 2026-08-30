/**
 * waterTankAmc.controller.js — Annual Maintenance Contracts (SOP-01 §10).
 * Logic lives in services/wtAmc.service.js; this layer is transport and scoping.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick, serviceScope, resolveServiceLine, catalogueVertical } = require('../utils/controllerHelpers');
// Branch + service scope for wt_*; reference() ServiceItem query keeps plain branchScope.
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const Property = require('../models/Property');
const ServiceItem = require('../models/ServiceItem');
const svc = require('../services/wtAmc.service');

const { num, eq, asArray, today } = svc;
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const ctxOf = (req) => ({ branchId: resolveBranchId(req), actor: actorOf(req), userId: req.user?.id || null, serviceLine: resolveServiceLine(req) });
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

const loadAmc = async (req, res) => {
  const key = req.params.code;
  const amc = await M.WtAmcContract.findOne({
    where: {
      ...scoped(req),
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
  if (!amc) { res.status(404).json({ error: 'AMC contract not found.' }); return null; }
  return amc;
};

/* ── reference for the wizard ── */
exports.reference = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const branchId = resolveBranchId(req);
  const [providers, catalogRows, agreements, projects] = await Promise.all([
    M.WtProvider.findAll({ where: scope, order: [['business_name', 'ASC']], raw: true }),
    // ServiceItem is keyed by `vertical`, not service_line — scope by branch + vertical only.
    ServiceItem.findAll({ where: { ...branchScope(req), vertical: catalogueVertical(req), is_active: true }, order: [['sort_order', 'ASC']], raw: true }).catch(() => []),
    M.WtClient.findAll({ where: { ...scope, agreement_status: 'Signed' }, attributes: ['code', 'name', 'agreement_code'], raw: true }).catch(() => []),
    M.WtProject.findAll({ where: scope, attributes: ['code', 'name', 'client_name'], order: [['id', 'DESC']], limit: 50, raw: true }).catch(() => []),
  ]);

  const catalog = catalogRows.map((i) => {
    let tags = i.tags; if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    return { code: i.code, name: i.name, unit: i.unit, standard_price: num(i.base_price), group: (tags || {}).group || 'service' };
  });

  res.json({
    next_code: await svc.nextAmcCode(branchId),
    packages: svc.PACKAGES,
    visit_types: svc.VISIT_TYPES,
    payment_frequencies: svc.PAYMENT_FREQUENCIES,
    statuses: svc.AMC_STATUSES,
    frequencies: ['Monthly', 'Quarterly', 'Half Yearly', 'Annual'],
    tank_types: ['Rooftop', 'Underground', 'Overhead', 'Ground Level', 'Apartment Common', 'Industrial'],
    // AMC-eligible catalogue lines, so the operator can price from the schedule
    catalog: catalog.filter((c) => /amc|maintenance|clean|inspect|test|pump/i.test(c.name)),
    providers: providers.map((p) => ({
      id: p.id, code: p.code, business_name: p.business_name, specialty: p.specialty,
      assignable: eq(p.status, 'approved') && eq(p.agreement_status, 'signed'),
    })),
    clients_with_agreement: agreements,
    projects,
  });
});

/* ── preview the plan + money before saving ── */
exports.preview = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const pkg = svc.packageByKey(b.package_tier) || {};
  const mix = b.visit_mix && Object.keys(b.visit_mix).length ? b.visit_mix : (pkg.visits || {});
  const months = Number(b.duration_months) || 12;
  const start = b.start_date || today();
  const plan = svc.generateVisitPlan(mix, { startDate: start, durationMonths: months });
  res.json({
    plan,
    end_date: b.end_date || svc.addMonths(start, months),
    renewal_due_at: svc.addDays(b.end_date || svc.addMonths(start, months), -(Number(b.renewal_notice_days) || 30)),
    billing: svc.computeBilling({ ...b, duration_months: months, visits_planned: plan.length }),
  });
});

/* ── list + overview ── */
exports.list = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const { q, status, tier, renewal } = req.query;
  const where = { ...scope };
  if (status) where.status = status;
  if (tier) where.package_tier = tier;
  if (q && String(q).trim()) {
    const like = { [Op.like]: `%${String(q).trim()}%` };
    where[Op.or] = [{ code: like }, { client_name: like }, { package: like }, { site_address: like }];
  }

  const rows = await M.WtAmcContract.findAll({ where, order: [['id', 'DESC']], raw: true });
  const codes = rows.map((r) => r.code);
  const visits = codes.length
    ? await M.WtAmcVisit.findAll({ where: { ...scope, amc_code: { [Op.in]: codes } }, raw: true })
    : [];
  const byAmc = visits.reduce((acc, v) => { (acc[v.amc_code] = acc[v.amc_code] || []).push(v); return acc; }, {});

  let out = rows.map((r) => {
    const vs = byAmc[r.code] || [];
    const done = vs.filter((v) => eq(v.status, 'completed')).length;
    const over = vs.filter((v) => !eq(v.status, 'completed') && !eq(v.status, 'cancelled') && v.due_date && v.due_date < today()).length;
    const next = vs.filter((v) => !eq(v.status, 'completed') && v.due_date && v.due_date >= today())
      .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0] || null;
    const dte = daysTo(r.end_date);
    return {
      ...r,
      visits_total: vs.length, visits_done: done, visits_overdue: over,
      completion_pct: vs.length ? Math.round((done / vs.length) * 100) : 0,
      next_visit_date: next?.due_date || null, next_visit_type: next?.visit_type || null,
      days_to_expiry: dte,
      renewal_due: dte != null && dte >= 0 && dte <= (r.renewal_notice_days || 30),
      expired: dte != null && dte < 0,
    };
  });
  if (renewal === 'true') out = out.filter((r) => r.renewal_due || r.expired);
  res.json(out);
});

exports.overview = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const [rows, visits] = await Promise.all([
    M.WtAmcContract.findAll({ where: scope, raw: true }),
    M.WtAmcVisit.findAll({ where: scope, raw: true }),
  ]);
  const active = rows.filter((r) => eq(r.status, 'active'));
  const dueRenewal = active.filter((r) => {
    const d = daysTo(r.end_date);
    return d != null && d >= 0 && d <= (r.renewal_notice_days || 30);
  });
  const done = visits.filter((v) => eq(v.status, 'completed'));
  const overdue = visits.filter((v) => !eq(v.status, 'completed') && !eq(v.status, 'cancelled')
    && v.due_date && v.due_date < today());
  // SOP §13 KPI — of the contracts that reached their end date, how many renewed
  const ended = rows.filter((r) => r.end_date && r.end_date < today());
  const renewed = ended.filter((r) => r.renewed_to || eq(r.renewal_decision, 'renewed'));

  res.json({
    total: rows.length,
    active: active.length,
    expired: rows.filter((r) => eq(r.status, 'expired')).length,
    due_renewal: dueRenewal.length,
    contract_value: rows.reduce((s, r) => s + num(r.contract_value || r.annual_value), 0),
    active_value: active.reduce((s, r) => s + num(r.contract_value || r.annual_value), 0),
    visits_planned: visits.length,
    visits_completed: done.length,
    visits_overdue: overdue.length,
    visit_completion_pct: visits.length ? Math.round((done.length / visits.length) * 100) : 0,
    renewal_rate_pct: ended.length ? Math.round((renewed.length / ended.length) * 100) : null,
    by_tier: svc.PACKAGES.map((p) => ({
      tier: p.key, label: p.label,
      count: rows.filter((r) => r.package_tier === p.key).length,
    })).filter((t) => t.count > 0),
  });
});

/* ── create / read / update ── */
exports.create = asyncHandler(async (req, res) => {
  const out = await svc.createAmc(req.body || {}, ctxOf(req));
  res.status(201).json({
    amc: out.amc, client: out.client, property: out.property,
    visits_created: out.visits.length,
  });
});

exports.detail = asyncHandler(async (req, res) => {
  const dossier = await svc.amcDossier(req.params.code, scoped(req));
  if (!dossier) return res.status(404).json({ error: 'AMC contract not found.' });
  res.json(dossier);
});

const EDITABLE = [
  'client_name', 'client_type', 'contact_person', 'phone', 'email',
  'site_address', 'area', 'district', 'site_contact_name', 'site_contact_phone', 'access_notes',
  'tank_type', 'tanks_count', 'tank_capacity', 'water_source',
  'package', 'package_tier', 'included_services', 'inclusions', 'exclusions',
  'frequency', 'start_date', 'end_date', 'duration_months', 'auto_renew',
  'renewal_notice_days', 'renewal_decision', 'renewal_due_at',
  'annual_value', 'discount', 'vat_percent', 'payment_frequency', 'advance_amount', 'payment_terms',
  'response_hours', 'emergency_included', 'emergency_callouts_included',
  'water_testing_included', 'reports_included',
  'agreement_code', 'project_code', 'quotation_code',
  'provider_code', 'provider_id', 'provider_name', 'assigned_officer',
  'status', 'satisfaction_score', 'notes', 'cancel_reason',
];

exports.update = asyncHandler(async (req, res) => {
  const amc = await loadAmc(req, res); if (!amc) return;
  const body = pick(req.body || {}, EDITABLE);
  // Keep the derived money in step with whatever changed.
  if (['annual_value', 'discount', 'vat_percent', 'payment_frequency', 'advance_amount', 'duration_months']
    .some((k) => body[k] !== undefined)) {
    const b = svc.computeBilling({ ...amc.toJSON(), ...body, visits_planned: amc.visits_planned });
    Object.assign(body, {
      contract_value: b.contract_value, instalment_amount: b.instalment_amount,
      per_visit_value: b.per_visit_value,
    });
  }
  if (eq(body.status, 'cancelled') && !amc.cancelled_at) body.cancelled_at = new Date();
  await amc.update(body);
  res.json(amc);
});

exports.remove = asyncHandler(async (req, res) => {
  const amc = await loadAmc(req, res); if (!amc) return;
  await M.WtAmcVisit.destroy({ where: { ...scoped(req), amc_code: amc.code } });
  await amc.destroy();
  res.json({ ok: true });
});

/* ── visits (SOP §10 "monitor visit completion") ── */
exports.listVisits = asyncHandler(async (req, res) => {
  const amc = await loadAmc(req, res); if (!amc) return;
  const rows = await M.WtAmcVisit.findAll({
    where: { ...scoped(req), amc_code: amc.code }, order: [['visit_no', 'ASC']], raw: true,
  });
  res.json(rows);
});

exports.updateVisit = asyncHandler(async (req, res) => {
  const amc = await loadAmc(req, res); if (!amc) return;
  const visit = await M.WtAmcVisit.findOne({
    where: { ...scoped(req), id: req.params.visitId, amc_code: amc.code },
  });
  if (!visit) return res.status(404).json({ error: 'Visit not found.' });

  const body = pick(req.body || {}, [
    'visit_type', 'due_date', 'scheduled_date', 'completed_date', 'status',
    'provider_name', 'work_order_code', 'assessment_code', 'report_url',
    'findings', 'water_test_result', 'client_signed_off', 'satisfaction_score', 'notes',
  ]);
  if (eq(body.status, 'completed') && !body.completed_date && !visit.completed_date) {
    body.completed_date = today();
  }
  await visit.update(body);

  // Roll the contract's counters and next-visit pointer forward.
  const all = await M.WtAmcVisit.findAll({ where: { ...scoped(req), amc_code: amc.code }, raw: true });
  const done = all.filter((v) => eq(v.status, 'completed'));
  const next = all.filter((v) => !eq(v.status, 'completed') && !eq(v.status, 'cancelled') && v.due_date)
    .sort((a, b) => (a.due_date < b.due_date ? -1 : 1))[0] || null;
  await amc.update({
    visits_completed: done.length,
    next_visit: next?.due_date || null,
  });

  res.json({ visit, visits_completed: done.length, next_visit: next?.due_date || null });
});

/* ── renewal (SOP §10 "monitor renewal dates", §13 AMC Renewal Rate) ── */
exports.renew = asyncHandler(async (req, res) => {
  const amc = await loadAmc(req, res); if (!amc) return;
  const b = req.body || {};

  if (b.decision && !eq(b.decision, 'renew')) {
    await amc.update({
      renewal_decision: b.decision, status: eq(b.decision, 'declined') ? 'Expired' : amc.status,
      timeline: [...asArray(amc.timeline), {
        title: `Renewal ${b.decision}`, detail: b.reason || '',
        at: new Date().toISOString(), by: actorOf(req),
      }],
    });
    return res.json({ amc, renewed: null });
  }

  // A renewal is a NEW contract that supersedes this one, not an edited old one —
  // the expired term and its visit history stay intact as the record of what was
  // actually delivered.
  const src = amc.toJSON();
  const months = Number(b.duration_months) || src.duration_months || 12;
  const start = b.start_date || svc.addDays(src.end_date, 1);
  const out = await svc.createAmc({
    client: { id: src.client_id, code: src.client_code, name: src.client_name, phone: src.phone, email: src.email },
    property: src.property_id ? { mode: 'existing', id: src.property_id } : { mode: 'none', address: src.site_address },
    package_tier: src.package_tier, client_type: src.client_type,
    contact_person: src.contact_person,
    site_contact_name: src.site_contact_name, site_contact_phone: src.site_contact_phone,
    access_notes: src.access_notes,
    tank_type: src.tank_type, tanks_count: src.tanks_count, tank_capacity: src.tank_capacity,
    water_source: src.water_source,
    visit_mix: Object.fromEntries(asArray(src.visit_types).map((v) => [v.key, v.per_year])),
    frequency: src.frequency,
    start_date: start, duration_months: months,
    auto_renew: src.auto_renew, renewal_notice_days: src.renewal_notice_days,
    annual_value: b.annual_value != null ? b.annual_value : src.annual_value,
    discount: b.discount != null ? b.discount : 0,
    vat_percent: src.vat_percent, payment_frequency: src.payment_frequency,
    payment_terms: src.payment_terms,
    response_hours: src.response_hours, emergency_included: src.emergency_included,
    emergency_callouts_included: src.emergency_callouts_included,
    water_testing_included: src.water_testing_included, reports_included: src.reports_included,
    provider_code: src.provider_code, provider_id: src.provider_id, provider_name: src.provider_name,
    assigned_officer: src.assigned_officer,
    inclusions: src.inclusions, exclusions: src.exclusions,
    status: 'Active',
  }, ctxOf(req));

  await amc.update({
    status: 'Renewed', renewal_decision: 'Renewed', renewed_to: out.amc.code,
    timeline: [...asArray(amc.timeline), {
      title: 'Renewed', detail: `Superseded by ${out.amc.code} from ${start}`,
      at: new Date().toISOString(), by: actorOf(req),
    }],
  });
  await out.amc.update({ renewed_from: amc.code });

  res.status(201).json({ amc, renewed: out.amc, visits_created: out.visits.length });
});
