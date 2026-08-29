/**
 * wtAmc.service.js — Annual Maintenance Contracts.
 *
 * An AMC is not a status field on a client; it is a term contract that promises a
 * SCHEDULE OF VISITS at a price, and it is judged on whether those visits actually
 * happened. So this module's centre of gravity is the visit plan.
 *
 * Sources:
 *   SOP-01 §10 (Phase 6 — AMC Management)
 *     schedule : cleaning visits · inspection visits · water testing · pump inspections
 *     monitor  : visit completion · renewal dates · client satisfaction
 *   SOP-01 §13 KPI: AMC Renewal Rate
 *   Customer Service Agreement
 *     Clause 2 : the AMC runs for the duration in the approved Work Order
 *     Clause 9 : payment Monthly / Quarterly / Half-Yearly / Annually
 *     Schedule A: the seven package tiers below
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);
const eq = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};
const addMonths = (dateStr, months) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + Number(months || 0));
  // clamp when the target month is shorter (31 Jan + 1 month → 28/29 Feb)
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};
const addDays = (dateStr, days) => new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + days * 864e5)
  .toISOString().slice(0, 10);

/* ────────────────────────────────────────────────────────────────────────────
 * Package tiers — Customer Service Agreement, Schedule A
 * `visits` is the default annual visit mix; the operator can override any of it.
 * ──────────────────────────────────────────────────────────────────────────── */
const PACKAGES = [
  {
    key: 'residential_basic', label: 'Residential Basic', client_type: 'Residential',
    blurb: 'Two cleans a year with a basic inspection. Suited to a single household tank.',
    visits: { Cleaning: 2, Inspection: 1, 'Water Testing': 0, 'Pump Inspection': 0 },
    response_hours: 48, water_testing_included: false, emergency_callouts_included: 0,
  },
  {
    key: 'residential_standard', label: 'Residential Standard', client_type: 'Residential',
    blurb: 'Quarterly cleaning with inspection and one annual water test.',
    visits: { Cleaning: 4, Inspection: 2, 'Water Testing': 1, 'Pump Inspection': 1 },
    response_hours: 24, water_testing_included: true, emergency_callouts_included: 1,
  },
  {
    key: 'residential_premium', label: 'Residential Premium', client_type: 'Residential',
    blurb: 'Full quarterly programme with testing, pump servicing and emergency cover.',
    visits: { Cleaning: 4, Inspection: 4, 'Water Testing': 2, 'Pump Inspection': 2 },
    response_hours: 12, water_testing_included: true, emergency_callouts_included: 3,
  },
  {
    key: 'commercial_building', label: 'Commercial Building', client_type: 'Commercial',
    blurb: 'Multi-tank commercial estate on a quarterly cycle with testing.',
    visits: { Cleaning: 4, Inspection: 4, 'Water Testing': 2, 'Pump Inspection': 2 },
    response_hours: 12, water_testing_included: true, emergency_callouts_included: 2,
  },
  {
    key: 'hotel_restaurant', label: 'Hotel & Restaurant', client_type: 'Commercial',
    blurb: 'Hospitality: potable-water critical, six cleans and quarterly testing.',
    visits: { Cleaning: 6, Inspection: 6, 'Water Testing': 4, 'Pump Inspection': 2 },
    response_hours: 8, water_testing_included: true, emergency_callouts_included: 4,
  },
  {
    key: 'school_hospital', label: 'School & Hospital', client_type: 'Institutional',
    blurb: 'Public-health critical: highest testing frequency and fastest response.',
    visits: { Cleaning: 6, Inspection: 6, 'Water Testing': 6, 'Pump Inspection': 3 },
    response_hours: 6, water_testing_included: true, emergency_callouts_included: 6,
  },
  {
    key: 'industrial_facility', label: 'Industrial Facility', client_type: 'Industrial',
    blurb: 'Large-capacity industrial storage with pump and pipeline servicing.',
    visits: { Cleaning: 4, Inspection: 6, 'Water Testing': 4, 'Pump Inspection': 4 },
    response_hours: 12, water_testing_included: true, emergency_callouts_included: 4,
  },
];
const packageByKey = (key) => PACKAGES.find((p) => p.key === key || eq(p.label, key)) || null;

/* SOP §10 names exactly these four visit activities. */
const VISIT_TYPES = [
  { key: 'Cleaning', label: 'Cleaning visit', sop: 'Sec. 10' },
  { key: 'Inspection', label: 'Inspection visit', sop: 'Sec. 10' },
  { key: 'Water Testing', label: 'Water testing', sop: 'Sec. 10' },
  { key: 'Pump Inspection', label: 'Pump inspection', sop: 'Sec. 10' },
];

/* Clause 9. `per_year` drives the instalment split. */
const PAYMENT_FREQUENCIES = [
  { key: 'Monthly', per_year: 12 },
  { key: 'Quarterly', per_year: 4 },
  { key: 'Half-Yearly', per_year: 2 },
  { key: 'Annually', per_year: 1 },
];
const AMC_STATUSES = ['Draft', 'Active', 'Suspended', 'Expired', 'Cancelled', 'Renewed'];

/* ────────────────────────────────────────────────────────────────────────────
 * The visit plan
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Spread each visit type evenly across the contract term.
 *
 * Evenly is the point: four cleans in a twelve-month contract means one per
 * quarter, not four in the last week because nobody scheduled them. Each type is
 * spaced independently, so a 4-clean / 2-test contract puts tests at months 0
 * and 6 while cleans fall at 0, 3, 6, 9.
 *
 * visitMix: { Cleaning: 4, Inspection: 2, ... } counts PER YEAR.
 */
function generateVisitPlan(visitMix = {}, { startDate, durationMonths = 12 } = {}) {
  const start = startDate || today();
  const months = Math.max(1, Number(durationMonths) || 12);
  const plan = [];

  for (const { key } of VISIT_TYPES) {
    const perYear = Math.max(0, Number(visitMix[key]) || 0);
    if (!perYear) continue;
    // scale the annual rate to the actual term
    const count = Math.max(1, Math.round((perYear * months) / 12));
    const gap = months / count;
    for (let i = 0; i < count; i++) {
      plan.push({
        visit_type: key,
        due_date: addMonths(start, Math.round(gap * i)),
      });
    }
  }

  // chronological, then numbered — the client reads one list, not four
  plan.sort((a, b) => (a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0));
  return plan.map((v, i) => ({ ...v, visit_no: i + 1, status: 'Planned' }));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Billing — derived, never stored as a second source of truth
 * ──────────────────────────────────────────────────────────────────────────── */
function computeBilling(input = {}) {
  const gross = num(input.annual_value);
  const discount = num(input.discount);
  const net = Math.max(0, gross - discount);
  const vatPct = num(input.vat_percent);
  const vat = round2((net * vatPct) / 100);
  const total = round2(net + vat);

  const freq = PAYMENT_FREQUENCIES.find((f) => eq(f.key, input.payment_frequency))
    || PAYMENT_FREQUENCIES[3];
  const months = Math.max(1, Number(input.duration_months) || 12);
  // instalments across the whole term, not just one year
  const instalments = Math.max(1, Math.round((freq.per_year * months) / 12));
  const instalment = round2(total / instalments);

  const visits = Math.max(0, Number(input.visits_planned) || 0);
  const advance = Math.max(0, Math.min(num(input.advance_amount), total));

  return {
    annual_value: round2(gross),
    discount: round2(discount),
    vat_percent: vatPct,
    vat,
    contract_value: total,
    payment_frequency: freq.key,
    instalments,
    instalment_amount: instalment,
    advance_amount: advance,
    balance: round2(total - advance),
    per_visit_value: visits ? round2(total / visits) : 0,
    visits_planned: visits,
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Create
 * ──────────────────────────────────────────────────────────────────────────── */

async function nextAmcCode(branchId, transaction) {
  const rows = await M.WtAmcContract.findAll({
    where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction,
  });
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.code || '').replace(/^AMC-/i, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `AMC-${String(max + 1).padStart(4, '0')}`;
}

/**
 * Create the contract and materialise its visit plan in one transaction. The
 * client is resolved or created the same way a project resolves one, so an AMC
 * raised for a new client does not create a second client record.
 */
async function createAmc(payload, ctx) {
  const { branchId, actor } = ctx;
  const sl = ctx.serviceLine || 'water_tank';
  const p = payload || {};

  return sequelize.transaction(async (transaction) => {
    // ── client ──
    const cIn = p.client || {};
    let client = null;
    if (cIn.id || cIn.code) {
      client = await M.WtClient.findOne({
        where: { branch_id: branchId, [Op.or]: [{ id: Number(cIn.id) || -1 }, { code: cIn.code || ' ' }] },
        transaction,
      });
    }
    if (!client && cIn.name) {
      client = await M.WtClient.findOne({
        where: { branch_id: branchId, name: cIn.name, ...(cIn.phone ? { mobile: cIn.phone } : {}) },
        transaction,
      });
    }
    if (!client) {
      if (!cIn.name) { const e = new Error('A client is required for an AMC.'); e.status = 400; throw e; }
      const rows = await M.WtClient.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction });
      let max = 0;
      rows.forEach((r) => { const n = parseInt(String(r.code || '').replace('WTCM-C', ''), 10); if (!Number.isNaN(n) && n > max) max = n; });
      client = await M.WtClient.create({
        branch_id: branchId, service_line: sl, code: `WTCM-C${String(max + 1).padStart(4, '0')}`,
        name: cIn.name, client_type: cIn.client_type || 'Residential',
        mobile: cIn.phone || null, email: cIn.email || null,
        service_address: cIn.address || null, district: cIn.district || null,
        current_status: 'AMC Client', workflow_stage: 'AMC / Ongoing Support',
        enquiry_date: today(),
      }, { transaction });
    }

    // ── site ──
    const prIn = p.property || {};
    let property = null;
    if (prIn.mode === 'existing' && prIn.id) {
      property = await Property.findOne({ where: { id: prIn.id, branch_id: branchId }, transaction });
    } else if (prIn.mode === 'new' && prIn.title) {
      property = await Property.create({
        branch_id: branchId,
        property_code: await generateCode(Property, 'property_code', 'SSPC-PR-'),
        title: prIn.title, category: prIn.category || 'residential',
        property_type: prIn.property_type || null, listing_type: 'rent',
        status: 'inactive', is_published: false,
        address: prIn.address || null, area: prIn.area || null,
        city: prIn.city || null, district: prIn.district || null,
        created_by: ctx.userId || null,
      }, { transaction });
    }

    // ── term, plan and money ──
    const pkg = packageByKey(p.package_tier) || {};
    const startDate = p.start_date || today();
    const months = Number(p.duration_months) || 12;
    const endDate = p.end_date || addMonths(startDate, months);
    const visitMix = p.visit_mix && Object.keys(p.visit_mix).length ? p.visit_mix : (pkg.visits || {});
    const plan = generateVisitPlan(visitMix, { startDate, durationMonths: months });
    const billing = computeBilling({ ...p, duration_months: months, visits_planned: plan.length });

    const code = await nextAmcCode(branchId, transaction);
    const amc = await M.WtAmcContract.create({
      branch_id: branchId, service_line: sl, code,
      client_name: client.name, client_code: client.code, client_id: client.id,
      client_type: p.client_type || client.client_type || 'Residential',
      contact_person: p.contact_person || null,
      phone: cIn.phone || client.mobile, email: cIn.email || client.email,

      property_id: property?.id || null,
      property_code: property?.property_code || null,
      site_address: prIn.address || property?.address || client.service_address || null,
      area: prIn.area || property?.area || null,
      district: prIn.district || property?.district || client.district || null,
      site_contact_name: p.site_contact_name || null,
      site_contact_phone: p.site_contact_phone || null,
      access_notes: p.access_notes || null,

      tank_type: p.tank_type || client.tank_type || null,
      tanks_count: Number(p.tanks_count) || 0,
      tank_capacity: p.tank_capacity || client.tank_capacity || null,
      water_source: p.water_source || null,

      package: pkg.label || p.package || null,
      package_tier: pkg.key || p.package_tier || null,
      included_services: asArray(p.included_services),
      inclusions: p.inclusions || pkg.blurb || null,
      exclusions: p.exclusions || null,

      frequency: p.frequency || 'Quarterly',
      start_date: startDate, end_date: endDate, duration_months: months,
      auto_renew: !!p.auto_renew,
      renewal_notice_days: Number(p.renewal_notice_days) || 30,
      renewal_decision: 'Pending',
      renewal_due_at: addDays(endDate, -(Number(p.renewal_notice_days) || 30)),

      visits_per_year: Object.values(visitMix).reduce((s, n) => s + (Number(n) || 0), 0),
      visit_types: Object.entries(visitMix).map(([key, per_year]) => ({ key, per_year: Number(per_year) || 0 })),
      visits_planned: plan.length,
      visits_completed: 0,
      first_visit_date: plan[0]?.due_date || null,
      last_visit_date: plan[plan.length - 1]?.due_date || null,
      next_visit: plan[0]?.due_date || null,

      annual_value: billing.annual_value,
      discount: billing.discount, vat_percent: billing.vat_percent,
      contract_value: billing.contract_value,
      payment_frequency: billing.payment_frequency,
      instalment_amount: billing.instalment_amount,
      advance_amount: billing.advance_amount,
      per_visit_value: billing.per_visit_value,
      payment_terms: p.payment_terms || null,

      response_hours: Number(p.response_hours) || pkg.response_hours || 24,
      emergency_included: p.emergency_included != null ? !!p.emergency_included : (pkg.emergency_callouts_included || 0) > 0,
      emergency_callouts_included: Number(p.emergency_callouts_included) || pkg.emergency_callouts_included || 0,
      water_testing_included: p.water_testing_included != null ? !!p.water_testing_included : !!pkg.water_testing_included,
      reports_included: p.reports_included != null ? !!p.reports_included : true,

      agreement_code: p.agreement_code || null,
      agreement_status: p.agreement_code ? 'Linked' : 'Not Started',
      project_code: p.project_code || null, quotation_code: p.quotation_code || null,
      provider_code: p.provider_code || null, provider_id: Number(p.provider_id) || null,
      provider_name: p.provider_name || null,
      assigned_officer: p.assigned_officer || null,

      status: p.status || 'Active',
      notes: p.notes || null,
      timeline: [{
        title: 'AMC created',
        detail: `${code} — ${pkg.label || 'AMC'} · ${plan.length} visit(s) planned to ${endDate}`,
        at: new Date().toISOString(), by: actor,
      }],
    }, { transaction });

    // ── materialise the visits ──
    const startNo = await (async () => {
      const rows = await M.WtAmcVisit.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction });
      let max = 0;
      rows.forEach((r) => { const n = parseInt(String(r.code || '').replace(/^AMCV-/i, ''), 10); if (!Number.isNaN(n) && n > max) max = n; });
      return max;
    })();

    const visits = await M.WtAmcVisit.bulkCreate(plan.map((v, i) => ({
      branch_id: branchId,
      code: `AMCV-${String(startNo + i + 1).padStart(5, '0')}`,
      amc_code: code, client_name: client.name,
      visit_no: v.visit_no, visit_type: v.visit_type,
      due_date: v.due_date, status: 'Planned',
      provider_name: p.provider_name || null,
    })), { transaction });

    // keep the client file honest about its AMC
    await client.update({
      amc_package: pkg.label || client.amc_package,
      amc_annual_value: billing.contract_value,
      amc_status: 'Active',
      amc_required: true,
    }, { transaction });

    return { amc, client, property, visits };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Read
 * ──────────────────────────────────────────────────────────────────────────── */
async function amcDossier(key, scope) {
  const amc = await M.WtAmcContract.findOne({
    where: {
      ...scope,
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
  if (!amc) return null;
  const a = amc.toJSON();

  const [visits, client, invoices] = await Promise.all([
    M.WtAmcVisit.findAll({ where: { ...scope, amc_code: a.code }, order: [['visit_no', 'ASC']], raw: true }),
    a.client_code ? M.WtClient.findOne({ where: { ...scope, code: a.client_code }, raw: true }).catch(() => null) : null,
    M.WtInvoice.findAll({ where: { ...scope, client_name: a.client_name }, order: [['id', 'DESC']], raw: true }).catch(() => []),
  ]);

  const completed = visits.filter((v) => eq(v.status, 'completed'));
  const overdue = visits.filter((v) => !eq(v.status, 'completed') && !eq(v.status, 'cancelled')
    && v.due_date && v.due_date < today());
  const upcoming = visits.filter((v) => !eq(v.status, 'completed') && !eq(v.status, 'cancelled')
    && v.due_date && v.due_date >= today());

  const daysToExpiry = a.end_date
    ? Math.ceil((new Date(a.end_date) - Date.now()) / 864e5) : null;

  return {
    amc: a,
    client,
    visits,
    stats: {
      planned: visits.length,
      completed: completed.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      completion_pct: visits.length ? Math.round((completed.length / visits.length) * 100) : 0,
      next_visit: upcoming[0] || null,
      days_to_expiry: daysToExpiry,
      // §10 "monitor renewal dates" — the window opens at renewal_notice_days out
      renewal_due: daysToExpiry != null && daysToExpiry <= (a.renewal_notice_days || 30),
      expired: daysToExpiry != null && daysToExpiry < 0,
      avg_satisfaction: completed.filter((v) => v.satisfaction_score).length
        ? Math.round((completed.reduce((s, v) => s + num(v.satisfaction_score), 0)
          / completed.filter((v) => v.satisfaction_score).length) * 10) / 10
        : null,
    },
    billing: computeBilling({ ...a, visits_planned: visits.length }),
    invoices,
  };
}

module.exports = {
  PACKAGES, VISIT_TYPES, PAYMENT_FREQUENCIES, AMC_STATUSES,
  packageByKey, generateVisitPlan, computeBilling, nextAmcCode,
  createAmc, amcDossier,
  addMonths, addDays, today, num, eq, asArray,
};
