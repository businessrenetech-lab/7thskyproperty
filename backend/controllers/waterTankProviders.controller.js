/**
 * waterTankProviders.controller.js
 * SSPC-WTCM-SOP-02 — Third-Party Service Provider Management.
 *
 * The SOP Sec. 4 workflow is the spine of this module:
 *   Application → Capability Assessment → Compliance Verification →
 *   Insurance Verification → Agreement Signing → Territory Briefing → Approved
 *   → (operational) Work Order Assignment → Service Delivery →
 *   Performance Review → Renewal / Suspension / Termination
 *
 * A provider cannot be approved with unverified compliance/insurance, an
 * unsigned master agreement or an undelivered Cumilla briefing — Sec. 6 Step 4
 * requires the agreement "before any client assignment".
 */
const crypto = require('crypto');
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const identity = require('../services/wtIdentity.service');

const num = (v) => Number(v || 0);
const asList = (value) => {
  let out = value;
  for (let i = 0; i < 3 && typeof out === 'string'; i++) { try { out = JSON.parse(out); } catch { return []; } }
  return Array.isArray(out) ? out : [];
};
const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = d ? new Date(d) : new Date(); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';

// ── SOP reference data (single source of truth, served to the UI) ──
const STAGES = [
  'Application', 'Capability Assessment', 'Compliance Verification',
  'Insurance Verification', 'Agreement Signing', 'Territory Briefing', 'Approved',
];
// Sec. 2 Scope
const SERVICE_CATEGORIES = [
  'Tank Cleaning Contractor', 'Tank Maintenance Contractor', 'Repair Contractor',
  'Waterproofing Contractor', 'Plumbing Contractor', 'Water Testing Laboratory',
  'Water Treatment Specialist', 'Pump Service Technician', 'AMC Provider',
];
// Sec. 5 Step 2
const COMPLIANCE_DOCS = [
  { type: 'Trade Licence', required: true },
  { type: 'Company Registration', required: true },
  { type: 'TIN', required: true },
  { type: 'BIN', required: true },
  { type: 'Safety Certification', required: true },
  { type: 'Water Quality Certification', required: false, note: 'If applicable' },
  { type: 'Environmental Approval', required: false, note: 'If applicable' },
];
// Sec. 5 Step 3
const INSURANCE_DOCS = [
  { type: 'Public Liability Insurance', required: true },
  { type: 'Workers Compensation', required: true },
  { type: 'Contractor Insurance', required: true },
  { type: 'Vehicle Insurance', required: true },
  { type: 'Environmental Liability Insurance', required: false, note: 'If applicable' },
];
// Sec. 14
const AUDIT_TYPES = ['Annual Compliance Audit', 'Insurance Audit', 'Safety Audit', 'Service Quality Audit'];
// Sec. 8 Step 10
const REPORT_TYPES = ['Site Assessment', 'Cleaning', 'Inspection', 'Testing', 'Repair', 'AMC'];
// Sec. 10
const INCIDENT_TYPES = ['Property Damage', 'Water Contamination', 'Safety Incident', 'Environmental Incident', 'Regulatory Investigation'];
const PROTECTION_MONTHS = 24; // Sec. 12

exports.reference = (req, res) => res.json({
  stages: STAGES,
  service_categories: SERVICE_CATEGORIES,
  compliance_docs: COMPLIANCE_DOCS,
  insurance_docs: INSURANCE_DOCS,
  audit_types: AUDIT_TYPES,
  report_types: REPORT_TYPES,
  incident_types: INCIDENT_TYPES,
  protection_months: PROTECTION_MONTHS,
});

const PROFILE_FIELDS = [
  'business_name', 'legal_name', 'business_type', 'registration_no', 'contact_person',
  'contact_email', 'contact_phone', 'website', 'address', 'district', 'specialty',
  'years_experience', 'team_size', 'capacity_per_week', 'equipment_summary',
  'service_categories', 'approved_services', 'coverage_areas', 'coverage',
  'cumilla_exclusive', 'bank_details', 'proposed_rates', 'availability_notes',
  'onboarding_last_step', 'onboarding_submission_status', 'notes',
];

/** Search before creation so the Water Tank provider book is not duplicated. */
exports.lookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const like = `%${q}%`;
  const rows = await M.WtProvider.findAll({
    where: {
      ...branchScope(req),
      [Op.or]: [
        { code: { [Op.like]: like } }, { business_name: { [Op.like]: like } },
        { legal_name: { [Op.like]: like } }, { registration_no: { [Op.like]: like } },
        { contact_email: { [Op.like]: like } }, { contact_phone: { [Op.like]: like } },
      ],
    },
    attributes: ['id', 'code', 'business_name', 'legal_name', 'registration_no', 'contact_person', 'contact_email', 'contact_phone', 'status', 'onboarding_stage'],
    order: [['id', 'DESC']], limit: 20,
  });
  res.json(rows);
});

/** Dedicated onboarding create path. The code is minted centrally. */
exports.create = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = pick(req.body || {}, PROFILE_FIELDS);
  const name = String(body.business_name || '').trim();
  if (!name) return res.status(400).json({ error: 'Business name is required.' });
  const duplicateWhere = [{ business_name: name }];
  if (body.registration_no) duplicateWhere.push({ registration_no: body.registration_no });
  if (body.contact_email) duplicateWhere.push({ contact_email: body.contact_email });
  const duplicate = await M.WtProvider.findOne({ where: { branch_id: branchId, [Op.or]: duplicateWhere } });
  if (duplicate) return res.status(409).json({ error: 'A matching provider already exists.', provider: { id: duplicate.id, code: duplicate.code, business_name: duplicate.business_name } });

  const provider = await M.WtProvider.create({
    ...body, branch_id: branchId, code: await identity.nextCode('providers', branchId),
    application_date: req.body.application_date || today(), status: 'Pending',
    onboarding_stage: 'Application', stage_updated_at: new Date(),
    onboarding_submission_status: body.onboarding_submission_status || 'Staff Draft',
  });
  await logEvent(branchId, provider.id, 'application', 'Provider application created', 'Started by Seventh Sky staff.', actorOf(req));
  res.status(201).json(provider);
});

/** Profile edits are whitelisted and cannot forge approval or agreement state. */
exports.updateProfile = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const body = pick(req.body || {}, PROFILE_FIELDS);
  if (body.coverage_areas) body.coverage = asList(body.coverage_areas).join(', ');
  if (body.service_categories) body.approved_services = asList(body.service_categories);
  await provider.update(body);
  await logEvent(resolveBranchId(req), provider.id, 'profile', 'Provider onboarding details updated', `Step ${body.onboarding_last_step ?? provider.onboarding_last_step}`, actorOf(req));
  res.json(provider);
});

/** Generate a revocable, hashed token for hybrid provider self-onboarding. */
exports.invite = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  if (!provider.contact_email) return res.status(400).json({ error: 'Add a provider email before sending an onboarding invitation.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 864e5);
  await provider.update({
    onboarding_token_hash: crypto.createHash('sha256').update(token).digest('hex'),
    onboarding_token_expires_at: expires, onboarding_submission_status: 'Invited',
  });
  await logEvent(resolveBranchId(req), provider.id, 'invitation', 'Provider onboarding invitation issued', `Expires ${expires.toISOString().slice(0, 10)}`, actorOf(req));
  const base = process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get('host')}/admin`;
  const link = `${base}/water-tank-provider-onboard/${token}`;
  try {
    const { sendEmail } = require('../services/communication.service');
    await sendEmail(provider.contact_email, 'Complete your Seventh Sky Water Tank provider onboarding', `<p>Dear ${provider.contact_person || provider.business_name},</p><p>Please complete your business, compliance, payment and proposed-rate details:</p><p><a href="${link}">${link}</a></p><p>This secure link expires in 30 days.</p>`).catch(() => {});
  } catch { /* best effort */ }
  res.json({ link, expires_at: expires, status: 'Invited' });
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const verified = req.body.verified !== false;
  await provider.update({ payment_verified: verified });
  await logEvent(resolveBranchId(req), provider.id, 'payment', `Payment account ${verified ? 'verified' : 'unverified'}`, req.body.note || null, actorOf(req));
  res.json(provider);
});

async function nextCode(model, prefix, pad, start, branchId) {
  const rows = await model.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true });
  let max = start - 1;
  for (const r of rows) {
    const n = parseInt(String(r.code || '').replace(prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(pad, '0');
}

const logEvent = (branchId, providerId, event_type, title, detail, actor) =>
  P.WtProviderEvent.create({ branch_id: branchId, provider_id: providerId, event_type, title, detail, actor, occurred_at: new Date() });

/**
 * Gate status for one provider: which SOP steps are satisfied and what still
 * blocks approval. Drives the readiness panel and the Approve button.
 */
function buildGates(provider, docs) {
  const byType = (cat) => docs.filter((d) => d.category === cat);
  const isGood = (d) => d.verified && String(d.status).toLowerCase() !== 'rejected'
    && (!d.expiry_date || new Date(d.expiry_date) >= new Date(today()));

  const compliance = COMPLIANCE_DOCS.map((spec) => {
    const doc = byType('compliance').find((d) => d.doc_type === spec.type);
    return { ...spec, doc: doc || null, satisfied: doc ? isGood(doc) : !spec.required };
  });
  const insurance = INSURANCE_DOCS.map((spec) => {
    const doc = byType('insurance').find((d) => d.doc_type === spec.type);
    return { ...spec, doc: doc || null, satisfied: doc ? isGood(doc) : !spec.required };
  });

  const complianceOk = compliance.filter((c) => c.required).every((c) => c.satisfied);
  const insuranceOk = insurance.filter((c) => c.required).every((c) => c.satisfied);
  const capabilityOk = num(provider.capability_score) > 0 && !!provider.assessed_date;
  const agreementOk = String(provider.agreement_status || '').toLowerCase() === 'signed'
    && (!provider.agreement_expiry_date || new Date(provider.agreement_expiry_date) >= new Date(today()));
  const territoryOk = !!provider.cumilla_briefed;
  const paymentOk = !!provider.payment_verified;
  const profileOk = !!(provider.business_name && asList(provider.service_categories).length);

  const gates = [
    { key: 'profile', stage: 'Application', label: 'Business profile & service categories captured', ok: profileOk, sop: 'Sec. 5 Step 1' },
    { key: 'capability', stage: 'Capability Assessment', label: 'Capability assessment completed', ok: capabilityOk, sop: 'Sec. 5 Step 1' },
    { key: 'compliance', stage: 'Compliance Verification', label: 'All required compliance documents verified', ok: complianceOk, sop: 'Sec. 5 Step 2' },
    { key: 'insurance', stage: 'Insurance Verification', label: 'All required insurance policies verified', ok: insuranceOk, sop: 'Sec. 5 Step 3' },
    { key: 'agreement', stage: 'Agreement Signing', label: 'Master Service Delivery Provider Agreement signed', ok: agreementOk, sop: 'Sec. 6 Step 4' },
    { key: 'payment', stage: 'Agreement Signing', label: 'Provider payment account verified', ok: paymentOk, sop: 'Clause 29' },
    { key: 'territory', stage: 'Territory Briefing', label: 'Cumilla territory & non-circumvention briefing acknowledged', ok: territoryOk, sop: 'Sec. 6 Step 5' },
  ];

  return {
    gates,
    compliance,
    insurance,
    blocking: gates.filter((g) => !g.ok),
    ready_to_approve: gates.every((g) => g.ok),
    // Sec. 6 Step 4 — nothing may be assigned before the agreement is executed
    assignable: gates.every((g) => g.ok) && String(provider.status || '').toLowerCase() === 'approved',
  };
}

/** Sec. 16 KPI measures, computed from operational records. */
function buildKpis(provider, workOrders, complaints, warranties, reports, protectedClients) {
  const mine = workOrders.filter((w) => w.provider_name === provider.business_name);
  const completed = mine.filter((w) => String(w.status || '').toLowerCase() === 'completed');
  const cancelled = mine.filter((w) => String(w.status || '').toLowerCase() === 'cancelled');
  const finished = completed.length + cancelled.length;
  const myComplaints = complaints.filter((c) => mine.some((w) => w.client_name === c.client_name));
  const myWarranties = warranties.filter((w) => w.provider_name === provider.business_name);
  const claimed = myWarranties.filter((w) => String(w.status || '').toLowerCase() === 'claimed');
  const clients = [...new Set(mine.map((w) => w.client_name).filter(Boolean))];
  const repeatClients = clients.filter((c) => mine.filter((w) => w.client_name === c).length > 1);

  return {
    response_time_hours: num(provider.response_time_hours),
    completion_rate: finished ? Math.round((completed.length / finished) * 1000) / 10 : null,
    complaint_rate: mine.length ? Math.round((myComplaints.length / mine.length) * 1000) / 10 : null,
    warranty_claim_rate: myWarranties.length ? Math.round((claimed.length / myWarranties.length) * 1000) / 10 : null,
    satisfaction_score: num(provider.rating) || num(provider.satisfaction_score) || null,
    territory_compliance_rate: mine.length
      ? Math.round(((mine.length - num(provider.territory_breaches)) / mine.length) * 1000) / 10 : null,
    non_circumvention_compliance: num(provider.circumvention_breaches) === 0,
    circumvention_breaches: num(provider.circumvention_breaches),
    territory_breaches: num(provider.territory_breaches),
    revenue_generated: mine.reduce((s, w) => s + num(w.total_contract), 0),
    provider_earnings: mine.reduce((s, w) => s + num(w.provider_fee), 0),
    repeat_project_rate: clients.length ? Math.round((repeatClients.length / clients.length) * 1000) / 10 : null,
    jobs_total: mine.length,
    jobs_completed: completed.length,
    jobs_active: mine.filter((w) => ['issued', 'accepted', 'in progress'].includes(String(w.status || '').toLowerCase())).length,
    reports_submitted: reports.length,
    reports_pending_review: reports.filter((r) => String(r.status || '').toLowerCase() === 'submitted').length,
    protected_clients: protectedClients.filter((p) => String(p.status || '').toLowerCase() === 'protected').length,
  };
}

/* ═══ DIRECTORY ═══════════════════════════════════════════════ */

/**
 * GET /wt-providers — directory with per-provider readiness + compliance alerts.
 */
exports.directory = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [providers, docs, audits, workOrders, agreements, rates] = await Promise.all([
    M.WtProvider.findAll({ where: scope, order: [['id', 'DESC']], raw: true }),
    P.WtProviderDocument.findAll({ where: scope, raw: true }),
    P.WtProviderAudit.findAll({ where: scope, raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
    P.WtProviderAgreement.findAll({ where: scope, order: [['version_no', 'DESC']], raw: true }),
    P.WtProviderAgreementRate.findAll({ where: { ...scope, rate_status: 'Approved' }, raw: true }),
  ]);

  const rows = providers.map((p) => {
    const mine = docs.filter((d) => d.provider_id === p.id);
    const { gates, blocking, ready_to_approve, assignable } = buildGates(p, mine);
    const expiring = mine.filter((d) => { const n = daysTo(d.expiry_date); return n != null && n >= 0 && n <= 30; });
    const expired = mine.filter((d) => { const n = daysTo(d.expiry_date); return n != null && n < 0; });
    const jobs = workOrders.filter((w) => w.provider_name === p.business_name);
    const openAudits = audits.filter((a) => a.provider_id === p.id && !a.closed);

    // commercial state — the agreement that actually prices this provider's work
    const mineAgreements = agreements.filter((a) => a.provider_id === p.id);
    const live = mineAgreements.find((a) => a.id === p.active_agreement_id)
      || mineAgreements.find((a) => String(a.status || '').toLowerCase() === 'completed')
      || null;
    const draft = mineAgreements.find((a) => ['draft', 'sent', 'partially_signed'].includes(String(a.status || '').toLowerCase())) || null;
    const liveRates = live ? rates.filter((r) => r.agreement_id === live.id) : [];
    const agreementDays = live ? daysTo(live.expiry_date) : null;

    // what this provider has actually earned and is still owed
    const earned = jobs.reduce((sum, w) => sum + num(w.provider_fee), 0);
    const paid = jobs.reduce((sum, w) => sum + num(w.provider_paid_amount), 0);

    return {
      ...p,
      // commercial
      agreement_id: live ? live.id : null,
      agreement_code: live ? live.code : null,
      agreement_version: live ? live.version_no : null,
      agreement_state: live ? 'Active' : draft ? String(draft.status) : 'None',
      draft_agreement_id: draft ? draft.id : null,
      commission_pct: live ? num(live.commission_pct) : null,
      payout_trigger: live ? live.payout_trigger : null,
      payment_due_days: live ? live.payment_due_days : null,
      priced_services: liveRates.length,
      agreement_expiry: live ? live.expiry_date : null,
      agreement_days_left: agreementDays,
      agreement_expiring: agreementDays != null && agreementDays >= 0 && agreementDays <= 60,
      agreement_expired: agreementDays != null && agreementDays < 0,
      // money
      earned_total: Math.round(earned * 100) / 100,
      paid_total: Math.round(paid * 100) / 100,
      owed_total: Math.round(Math.max(0, earned - paid) * 100) / 100,
      gates_passed: gates.filter((g) => g.ok).length,
      gates_total: gates.length,
      blocking_count: blocking.length,
      ready_to_approve,
      assignable,
      docs_expiring: expiring.length,
      docs_expired: expired.length,
      open_audits: openAudits.length,
      audit_overdue: !!(p.next_audit_date && daysTo(p.next_audit_date) < 0),
      active_jobs: jobs.filter((w) => ['issued', 'accepted', 'in progress'].includes(String(w.status || '').toLowerCase())).length,
      total_jobs: jobs.length,
    };
  });

  const eq = (p, s) => String(p.status || '').toLowerCase() === s;
  res.json({
    providers: rows,
    stages: STAGES,
    summary: {
      total: rows.length,
      approved: rows.filter((p) => eq(p, 'approved')).length,
      onboarding: rows.filter((p) => !['approved', 'suspended', 'terminated'].includes(String(p.status || '').toLowerCase())).length,
      conditional: rows.filter((p) => eq(p, 'conditional')).length,
      suspended: rows.filter((p) => eq(p, 'suspended')).length,
      terminated: rows.filter((p) => eq(p, 'terminated')).length,
      ready_to_approve: rows.filter((p) => p.ready_to_approve && !eq(p, 'approved')).length,
      docs_expiring: rows.reduce((s, p) => s + p.docs_expiring, 0),
      docs_expired: rows.reduce((s, p) => s + p.docs_expired, 0),
      audits_overdue: rows.filter((p) => p.audit_overdue).length,
      not_assignable: rows.filter((p) => eq(p, 'approved') && !p.assignable).length,
      // commercial roll-up
      with_agreement: rows.filter((p) => p.agreement_id).length,
      without_agreement: rows.filter((p) => !p.agreement_id && !eq(p, 'terminated')).length,
      agreements_in_draft: rows.filter((p) => p.draft_agreement_id).length,
      agreements_expiring: rows.filter((p) => p.agreement_expiring).length,
      priced_services: rows.reduce((s2, p) => s2 + p.priced_services, 0),
      avg_commission: (() => {
        const withPct = rows.filter((p) => p.commission_pct != null);
        return withPct.length
          ? Math.round((withPct.reduce((s2, p) => s2 + p.commission_pct, 0) / withPct.length) * 10) / 10
          : null;
      })(),
      owed_total: Math.round(rows.reduce((s2, p) => s2 + p.owed_total, 0) * 100) / 100,
      earned_total: Math.round(rows.reduce((s2, p) => s2 + p.earned_total, 0) * 100) / 100,
    },
    // stage funnel for the pipeline strip
    funnel: STAGES.map((s) => ({ stage: s, count: rows.filter((p) => p.onboarding_stage === s).length })),
  });
});

/* ═══ ONE PROVIDER: the provider's own dashboard ═══════════════ */

exports.detail = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const key = req.params.id;
  const provider = await M.WtProvider.findOne({
    where: { ...scope, [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] },
  });
  if (!provider) return res.status(404).json({ error: 'Provider not found' });
  const p = provider.toJSON();

  const [docs, audits, events, reports, protectedClients, workOrders, complaints, warranties, agreements, rates] = await Promise.all([
    P.WtProviderDocument.findAll({ where: { ...scope, provider_id: p.id }, order: [['category', 'ASC'], ['doc_type', 'ASC']], raw: true }),
    P.WtProviderAudit.findAll({ where: { ...scope, provider_id: p.id }, order: [['id', 'DESC']], raw: true }),
    P.WtProviderEvent.findAll({ where: { ...scope, provider_id: p.id }, order: [['occurred_at', 'DESC']], limit: 60, raw: true }),
    P.WtServiceReport.findAll({ where: { ...scope, provider_id: p.id }, order: [['id', 'DESC']], raw: true }),
    P.WtProtectedClient.findAll({ where: { ...scope, provider_id: p.id }, order: [['id', 'DESC']], raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
    M.WtComplaint.findAll({ where: scope, raw: true }),
    M.WtWarranty.findAll({ where: scope, raw: true }),
    P.WtProviderAgreement.findAll({ where: { ...scope, provider_id: p.id }, order: [['version_no', 'DESC']], raw: true }),
    P.WtProviderAgreementRate.findAll({ where: { ...scope, provider_id: p.id }, order: [['service_code', 'ASC']], raw: true }),
  ]);

  const gates = buildGates(p, docs);
  const kpis = buildKpis(p, workOrders, complaints, warranties, reports, protectedClients);
  const myWorkOrders = workOrders.filter((w) => w.provider_name === p.business_name);

  res.json({
    provider: p,
    ...gates,
    kpis,
    documents: docs,
    audits,
    events,
    reports,
    protected_clients: protectedClients,
    work_orders: myWorkOrders,
    warranties: warranties.filter((w) => w.provider_name === p.business_name),
    agreements,
    rates,
    stages: STAGES,
    reference: { compliance_docs: COMPLIANCE_DOCS, insurance_docs: INSURANCE_DOCS, audit_types: AUDIT_TYPES, service_categories: SERVICE_CATEGORIES },
  });
});

/* ═══ LIFECYCLE ACTIONS ═══════════════════════════════════════ */

async function loadProvider(req, res) {
  const key = req.params.id;
  const provider = await M.WtProvider.findOne({
    where: { ...branchScope(req), [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] },
  });
  if (!provider) { res.status(404).json({ error: 'Provider not found' }); return null; }
  return provider;
}

/** POST /wt-providers/:id/stage — move along the Sec. 4 workflow. */
exports.setStage = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const stage = req.body.stage;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `"${stage}" is not a workflow stage.` });

  // Sec. 6 Step 4 — approval requires every preceding gate
  if (stage === 'Approved') {
    const docs = await P.WtProviderDocument.findAll({ where: { ...branchScope(req), provider_id: provider.id }, raw: true });
    const { ready_to_approve, blocking } = buildGates(provider.toJSON(), docs);
    if (!ready_to_approve) {
      return res.status(400).json({
        error: 'Provider cannot be approved yet.',
        blocking: blocking.map((b) => `${b.label} (${b.sop})`),
      });
    }
  }

  const from = provider.onboarding_stage;
  const patch = { onboarding_stage: stage, stage_updated_at: new Date() };
  if (stage === 'Approved') {
    patch.status = 'Approved';
    patch.approved_date = today();
    patch.approved_by = actorOf(req);
    patch.next_audit_date = provider.next_audit_date || addMonths(null, 12);
    patch.next_renewal_date = provider.next_renewal_date || addMonths(null, 12);
  }
  await provider.update(patch);
  await logEvent(resolveBranchId(req), provider.id, 'stage', `Stage: ${from} → ${stage}`, req.body.note || null, actorOf(req));
  res.json(provider);
});

/** POST /wt-providers/:id/capability — Sec. 5 Step 1 capability assessment. */
exports.assessCapability = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const score = Math.max(0, Math.min(100, Math.round(num(req.body.capability_score))));
  if (!score) return res.status(400).json({ error: 'Give the capability assessment a score between 1 and 100.' });

  await provider.update({
    capability_score: score,
    capability_notes: req.body.capability_notes || provider.capability_notes,
    assessed_by: req.body.assessed_by || actorOf(req),
    assessed_date: req.body.assessed_date || today(),
    years_experience: req.body.years_experience ?? provider.years_experience,
    team_size: req.body.team_size ?? provider.team_size,
    equipment_summary: req.body.equipment_summary ?? provider.equipment_summary,
    capacity_per_week: req.body.capacity_per_week ?? provider.capacity_per_week,
    onboarding_stage: provider.onboarding_stage === 'Application' ? 'Capability Assessment' : provider.onboarding_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), provider.id, 'capability', `Capability assessed — ${score}/100`, req.body.capability_notes || null, actorOf(req));
  res.json(provider);
});

/** POST /wt-providers/:id/territory-briefing — Sec. 6 Step 5. */
exports.territoryBriefing = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  if (!req.body.acknowledged_by) return res.status(400).json({ error: 'Record who acknowledged the briefing on behalf of the provider.' });

  await provider.update({
    cumilla_briefed: true,
    cumilla_briefing_date: req.body.briefing_date || today(),
    cumilla_acknowledged_by: req.body.acknowledged_by,
    cumilla_exclusive: req.body.cumilla_exclusive ?? provider.cumilla_exclusive,
    onboarding_stage: provider.onboarding_stage === 'Agreement Signing' ? 'Territory Briefing' : provider.onboarding_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), provider.id, 'territory',
    'Cumilla territory & non-circumvention briefing delivered',
    `Acknowledged by ${req.body.acknowledged_by}. Protected-client rules, Cumilla exclusivity, non-circumvention obligations and referral requirements explained (Sec. 6 Step 5, Sec. 11, Sec. 12).`,
    actorOf(req));
  res.json(provider);
});

/** POST /wt-providers/:id/agreement — record the executed master agreement (Sec. 6 Step 4). */
exports.recordAgreement = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const status = req.body.agreement_status || 'Signed';
  await provider.update({
    agreement_status: status,
    agreement_code: req.body.agreement_code ?? provider.agreement_code,
    agreement_envelope_id: req.body.agreement_envelope_id ?? provider.agreement_envelope_id,
    agreement_signed_date: req.body.agreement_signed_date || (status === 'Signed' ? today() : provider.agreement_signed_date),
    agreement_expiry_date: req.body.agreement_expiry_date || provider.agreement_expiry_date || addMonths(null, 12),
    onboarding_stage: status === 'Signed' && ['Application', 'Capability Assessment', 'Compliance Verification', 'Insurance Verification'].includes(provider.onboarding_stage)
      ? 'Agreement Signing' : provider.onboarding_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), provider.id, 'agreement', `Master agreement ${status.toLowerCase()}`, req.body.agreement_code || null, actorOf(req));
  res.json(provider);
});

/** POST /wt-providers/:id/sanction — Sec. 15 suspend / terminate / reinstate. */
exports.sanction = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const action = String(req.body.action || '').toLowerCase();
  const reason = req.body.reason;
  if (!['suspend', 'terminate', 'reinstate'].includes(action)) return res.status(400).json({ error: 'Action must be suspend, terminate or reinstate.' });
  if (action !== 'reinstate' && !reason) return res.status(400).json({ error: 'A reason is required to suspend or terminate a provider.' });

  const patch = action === 'suspend'
    ? { status: 'Suspended', suspended_date: today(), suspension_reason: reason }
    : action === 'terminate'
      ? { status: 'Terminated', terminated_date: today(), termination_reason: reason }
      : { status: 'Approved', suspended_date: null, suspension_reason: null };

  await provider.update(patch);
  await logEvent(resolveBranchId(req), provider.id, 'sanction',
    action === 'reinstate' ? 'Provider reinstated' : `Provider ${action}d`, reason || null, actorOf(req));

  // Sec. 12 — termination starts the 24-month protection clock on their clients
  if (action === 'terminate') {
    const workOrders = await M.WtWorkOrder.findAll({ where: { ...branchScope(req), provider_name: provider.business_name }, raw: true });
    const clients = [...new Set(workOrders.map((w) => w.client_name).filter(Boolean))];
    const branchId = resolveBranchId(req);
    for (const client of clients) {
      const exists = await P.WtProtectedClient.findOne({ where: { ...branchScope(req), client_name: client, provider_id: provider.id, status: 'Protected' } });
      if (exists) continue;
      await P.WtProtectedClient.create({
        branch_id: branchId,
        code: await nextCode(P.WtProtectedClient, 'PC-', 4, 1, branchId),
        client_name: client,
        provider_id: provider.id,
        provider_name: provider.business_name,
        trigger_event: 'Provider Termination',
        protection_start: today(),
        protection_end: addMonths(null, PROTECTION_MONTHS),
        status: 'Protected',
      });
    }
  }

  res.json(provider);
});

/** POST /wt-providers/:id/renewal — Sec. 15 renewal review outcome. */
exports.renewal = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const decision = req.body.renewal_decision;
  if (!['Renew', 'Conditional Renewal', 'Suspend', 'Terminate'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be Renew, Conditional Renewal, Suspend or Terminate.' });
  }
  const patch = {
    renewal_decision: decision,
    renewal_date: today(),
    next_renewal_date: ['Renew', 'Conditional Renewal'].includes(decision) ? addMonths(null, 12) : null,
  };
  if (decision === 'Renew') patch.status = 'Approved';
  if (decision === 'Conditional Renewal') patch.status = 'Conditional';
  if (decision === 'Suspend') { patch.status = 'Suspended'; patch.suspended_date = today(); patch.suspension_reason = req.body.notes || 'Renewal review outcome'; }
  if (decision === 'Terminate') { patch.status = 'Terminated'; patch.terminated_date = today(); patch.termination_reason = req.body.notes || 'Renewal review outcome'; }

  await provider.update(patch);
  await logEvent(resolveBranchId(req), provider.id, 'renewal', `Renewal review: ${decision}`, req.body.notes || null, actorOf(req));
  res.json(provider);
});

/** POST /wt-providers/:id/breach — log a Sec. 11 territory or Sec. 12 circumvention breach. */
exports.logBreach = asyncHandler(async (req, res) => {
  const provider = await loadProvider(req, res); if (!provider) return;
  const kind = String(req.body.kind || '').toLowerCase();
  if (!['territory', 'circumvention'].includes(kind)) return res.status(400).json({ error: 'Breach kind must be territory or circumvention.' });
  if (!req.body.detail) return res.status(400).json({ error: 'Describe the breach.' });

  await provider.update(kind === 'territory'
    ? { territory_breaches: num(provider.territory_breaches) + 1 }
    : { circumvention_breaches: num(provider.circumvention_breaches) + 1 });

  await logEvent(resolveBranchId(req), provider.id, 'breach',
    kind === 'territory' ? 'Cumilla territory breach recorded (Sec. 11)' : 'Non-circumvention breach recorded (Sec. 12)',
    req.body.detail, actorOf(req));

  // mark the protected-client record if the breach names one
  if (kind === 'circumvention' && req.body.client_name) {
    const pc = await P.WtProtectedClient.findOne({ where: { ...branchScope(req), provider_id: provider.id, client_name: req.body.client_name } });
    if (pc) await pc.update({ status: 'Breached', breach_notes: req.body.detail, breach_reported_date: today() });
  }

  res.json(provider);
});

/* ═══ DOCUMENTS (Sec. 5 Steps 2 & 3) ══════════════════════════════ */

exports.listDocuments = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.provider_id) where.provider_id = req.query.provider_id;
  if (req.query.category) where.category = req.query.category;
  const rows = await P.WtProviderDocument.findAll({ where, order: [['expiry_date', 'ASC']] });
  res.json(rows);
});

exports.saveDocument = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = { ...req.body, branch_id: branchId };
  delete body.id; delete body.createdAt; delete body.updatedAt;
  if (!body.provider_id || !body.doc_type) return res.status(400).json({ error: 'provider_id and doc_type are required.' });

  // one row per (provider, category, doc_type) — re-saving updates in place
  const existing = await P.WtProviderDocument.findOne({
    where: { branch_id: branchId, provider_id: body.provider_id, category: body.category || 'compliance', doc_type: body.doc_type },
  });
  const row = existing ? await existing.update(body) : await P.WtProviderDocument.create(body);
  await logEvent(branchId, row.provider_id, 'document', `${existing ? 'Updated' : 'Added'} ${row.category} document: ${row.doc_type}`, row.doc_number || null, actorOf(req));
  res.status(existing ? 200 : 201).json(row);
});

exports.verifyDocument = asyncHandler(async (req, res) => {
  const row = await P.WtProviderDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found' });
  const verified = req.body.verified !== false;
  await row.update({
    verified,
    status: verified ? 'Verified' : (req.body.status || 'Rejected'),
    verified_by: verified ? (req.body.verified_by || actorOf(req)) : null,
    verified_date: verified ? today() : null,
    notes: req.body.notes ?? row.notes,
  });
  await logEvent(resolveBranchId(req), row.provider_id, 'document',
    `${row.doc_type} ${verified ? 'verified' : 'rejected'}`, req.body.notes || null, actorOf(req));
  res.json(row);
});

exports.deleteDocument = asyncHandler(async (req, res) => {
  const row = await P.WtProviderDocument.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Document not found' });
  await row.destroy();
  res.json({ ok: true });
});

/* ═══ AUDITS (Sec. 14) ════════════════════════════════════════════ */

exports.listAudits = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.provider_id) where.provider_id = req.query.provider_id;
  if (req.query.outcome) where.outcome = req.query.outcome;
  const rows = await P.WtProviderAudit.findAll({ where, order: [['id', 'DESC']] });
  res.json(rows);
});

exports.createAudit = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  if (!req.body.provider_id || !req.body.audit_type) return res.status(400).json({ error: 'provider_id and audit_type are required.' });
  const provider = await M.WtProvider.findOne({ where: { id: req.body.provider_id, ...branchScope(req) } });
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  const row = await P.WtProviderAudit.create({
    ...req.body,
    branch_id: branchId,
    provider_name: provider.business_name,
    code: await nextCode(P.WtProviderAudit, 'AUD-', 4, 1, branchId),
    outcome: req.body.outcome || 'Scheduled',
  });
  await logEvent(branchId, provider.id, 'audit', `${row.audit_type} scheduled`, row.scheduled_date || null, actorOf(req));
  res.status(201).json(row);
});

exports.updateAudit = asyncHandler(async (req, res) => {
  const row = await P.WtProviderAudit.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Audit not found' });
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.code;

  // completing an audit stamps the provider's audit dates
  const completing = body.outcome && body.outcome !== 'Scheduled' && row.outcome === 'Scheduled';
  if (completing && !body.conducted_date) body.conducted_date = today();
  if (completing && !body.next_due_date) body.next_due_date = addMonths(null, 12);

  await row.update(body);

  if (completing) {
    const provider = await M.WtProvider.findOne({ where: { id: row.provider_id, ...branchScope(req) } });
    if (provider) {
      await provider.update({ last_audit_date: row.conducted_date, next_audit_date: row.next_due_date });
      if (row.outcome === 'Failed') await provider.update({ status: 'Conditional' });
    }
    await logEvent(resolveBranchId(req), row.provider_id, 'audit', `${row.audit_type}: ${row.outcome}`, row.findings || null, actorOf(req));
  }
  res.json(row);
});

exports.deleteAudit = asyncHandler(async (req, res) => {
  const row = await P.WtProviderAudit.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Audit not found' });
  await row.destroy();
  res.json({ ok: true });
});

/* ═══ SERVICE REPORTS (Sec. 8 Step 10) ════════════════════════════ */

exports.listReports = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.provider_id) where.provider_id = req.query.provider_id;
  if (req.query.report_type) where.report_type = req.query.report_type;
  if (req.query.status) where.status = req.query.status;
  const rows = await P.WtServiceReport.findAll({ where, order: [['id', 'DESC']], limit: 300 });
  res.json(rows);
});

exports.createReport = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  if (!req.body.report_type) return res.status(400).json({ error: 'report_type is required.' });
  const row = await P.WtServiceReport.create({
    ...req.body,
    branch_id: branchId,
    code: await nextCode(P.WtServiceReport, 'RPT-', 4, 1, branchId),
    submitted_date: req.body.submitted_date || today(),
    status: req.body.status || 'Submitted',
  });
  if (row.provider_id) await logEvent(branchId, row.provider_id, 'report', `${row.report_type} report ${row.code} submitted`, row.work_order_code || null, actorOf(req));
  res.status(201).json(row);
});

exports.updateReport = asyncHandler(async (req, res) => {
  const row = await P.WtServiceReport.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Report not found' });
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.code;
  if (body.status && ['Accepted', 'Rework'].includes(body.status) && !body.reviewed_date) {
    body.reviewed_date = today();
    body.reviewed_by = body.reviewed_by || actorOf(req);
  }
  await row.update(body);
  res.json(row);
});

exports.deleteReport = asyncHandler(async (req, res) => {
  const row = await P.WtServiceReport.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Report not found' });
  await row.destroy();
  res.json({ ok: true });
});

/* ═══ PROTECTED CLIENTS (Sec. 12) ═════════════════════════════════ */

exports.listProtected = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req) };
  if (req.query.provider_id) where.provider_id = req.query.provider_id;
  const rows = await P.WtProtectedClient.findAll({ where, order: [['id', 'DESC']], raw: true });

  // lapse anything past its 24-month window on read, so the register self-maintains
  const lapsed = rows.filter((r) => r.status === 'Protected' && r.protection_end && daysTo(r.protection_end) < 0);
  if (lapsed.length) {
    await P.WtProtectedClient.update({ status: 'Expired' }, { where: { id: lapsed.map((r) => r.id) } });
    lapsed.forEach((r) => { r.status = 'Expired'; });
  }

  res.json({
    rows: rows.map((r) => ({ ...r, days_remaining: daysTo(r.protection_end) })),
    summary: {
      total: rows.length,
      protected: rows.filter((r) => r.status === 'Protected').length,
      expiring_soon: rows.filter((r) => r.status === 'Protected' && daysTo(r.protection_end) <= 90).length,
      breached: rows.filter((r) => r.status === 'Breached').length,
      expired: rows.filter((r) => r.status === 'Expired').length,
      protection_months: PROTECTION_MONTHS,
    },
  });
});

exports.createProtected = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  if (!req.body.client_name) return res.status(400).json({ error: 'client_name is required.' });
  const start = req.body.protection_start || today();
  const row = await P.WtProtectedClient.create({
    ...req.body,
    branch_id: branchId,
    code: await nextCode(P.WtProtectedClient, 'PC-', 4, 1, branchId),
    protection_start: start,
    protection_end: req.body.protection_end || addMonths(start, PROTECTION_MONTHS),
    status: req.body.status || 'Protected',
  });
  res.status(201).json(row);
});

exports.updateProtected = asyncHandler(async (req, res) => {
  const row = await P.WtProtectedClient.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Record not found' });
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.code;
  if (body.status === 'Breached' && !body.breach_reported_date) body.breach_reported_date = today();
  await row.update(body);
  res.json(row);
});

exports.deleteProtected = asyncHandler(async (req, res) => {
  const row = await P.WtProtectedClient.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Record not found' });
  await row.destroy();
  res.json({ ok: true });
});

/**
 * GET /wt-providers/protected/check?client_name= — is this client protected?
 * Used before assigning a provider, so Sec. 12 is enforced at the point of decision.
 */
exports.checkProtected = asyncHandler(async (req, res) => {
  const client = String(req.query.client_name || '').trim();
  if (!client) return res.json({ protected: false, records: [] });
  const rows = await P.WtProtectedClient.findAll({
    where: { ...branchScope(req), client_name: client, status: 'Protected' }, raw: true,
  });
  res.json({
    protected: rows.length > 0,
    records: rows.map((r) => ({ ...r, days_remaining: daysTo(r.protection_end) })),
  });
});

/* ═══ COMPLIANCE WATCHTOWER ═══════════════════════════════════ */

/**
 * GET /wt-providers/alerts — everything the SOP says should not be left alone:
 * lapsed documents, overdue audits, unsigned agreements, stalled onboarding,
 * unreviewed reports and breaches.
 */
exports.alerts = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [providers, docs, audits, reports, protectedClients] = await Promise.all([
    M.WtProvider.findAll({ where: scope, raw: true }),
    P.WtProviderDocument.findAll({ where: scope, raw: true }),
    P.WtProviderAudit.findAll({ where: scope, raw: true }),
    P.WtServiceReport.findAll({ where: scope, raw: true }),
    P.WtProtectedClient.findAll({ where: scope, raw: true }),
  ]);
  const nameOf = Object.fromEntries(providers.map((p) => [p.id, p.business_name]));
  const active = (p) => !['terminated'].includes(String(p.status || '').toLowerCase());
  const items = [];

  docs.forEach((d) => {
    const n = daysTo(d.expiry_date);
    if (n == null) return;
    if (n < 0) items.push({ severity: 'high', kind: 'document', sop: 'Sec. 5', provider_id: d.provider_id, provider_name: nameOf[d.provider_id], title: `${d.doc_type} expired`, detail: `Lapsed ${Math.abs(n)} days ago`, days: n });
    else if (n <= 30) items.push({ severity: 'medium', kind: 'document', sop: 'Sec. 5', provider_id: d.provider_id, provider_name: nameOf[d.provider_id], title: `${d.doc_type} expiring`, detail: `Expires in ${n} days`, days: n });
  });
  docs.filter((d) => !d.verified).forEach((d) => items.push({
    severity: 'medium', kind: 'document', sop: 'Sec. 5', provider_id: d.provider_id, provider_name: nameOf[d.provider_id],
    title: `${d.doc_type} awaiting verification`, detail: 'Uploaded but not yet verified',
  }));

  providers.filter(active).forEach((p) => {
    const n = daysTo(p.next_audit_date);
    if (p.next_audit_date && n < 0) items.push({ severity: 'high', kind: 'audit', sop: 'Sec. 14', provider_id: p.id, provider_name: p.business_name, title: 'Annual audit overdue', detail: `Due ${Math.abs(n)} days ago`, days: n });
    else if (p.next_audit_date && n <= 30) items.push({ severity: 'low', kind: 'audit', sop: 'Sec. 14', provider_id: p.id, provider_name: p.business_name, title: 'Audit due soon', detail: `Due in ${n} days`, days: n });

    if (String(p.status).toLowerCase() === 'approved' && String(p.agreement_status || '').toLowerCase() !== 'signed') {
      items.push({ severity: 'high', kind: 'agreement', sop: 'Sec. 6 Step 4', provider_id: p.id, provider_name: p.business_name, title: 'Approved without a signed agreement', detail: 'No client work may be assigned until the master agreement is executed' });
    }
    if (String(p.status).toLowerCase() === 'approved' && !p.cumilla_briefed) {
      items.push({ severity: 'medium', kind: 'territory', sop: 'Sec. 6 Step 5', provider_id: p.id, provider_name: p.business_name, title: 'Cumilla briefing not delivered', detail: 'Territory and non-circumvention obligations not acknowledged' });
    }
    if (num(p.territory_breaches) > 0) items.push({ severity: 'high', kind: 'breach', sop: 'Sec. 11', provider_id: p.id, provider_name: p.business_name, title: `${p.territory_breaches} territory breach(es)`, detail: 'Cumilla exclusivity compromised' });
    if (num(p.circumvention_breaches) > 0) items.push({ severity: 'high', kind: 'breach', sop: 'Sec. 12', provider_id: p.id, provider_name: p.business_name, title: `${p.circumvention_breaches} non-circumvention breach(es)`, detail: 'Provider bypassed Seventh Sky' });

    const stalled = p.stage_updated_at && String(p.status).toLowerCase() !== 'approved'
      && (Date.now() - new Date(p.stage_updated_at)) / 864e5 > 30;
    if (stalled) items.push({ severity: 'low', kind: 'onboarding', sop: 'Sec. 4', provider_id: p.id, provider_name: p.business_name, title: 'Onboarding stalled', detail: `No movement past "${p.onboarding_stage}" in over 30 days` });
  });

  audits.filter((a) => !a.closed && a.action_due_date && daysTo(a.action_due_date) < 0).forEach((a) => items.push({
    severity: 'high', kind: 'audit', sop: 'Sec. 14', provider_id: a.provider_id, provider_name: a.provider_name,
    title: 'Corrective actions overdue', detail: `${a.code} — ${a.audit_type}`,
  }));

  reports.filter((r) => String(r.status).toLowerCase() === 'submitted').forEach((r) => items.push({
    severity: 'low', kind: 'report', sop: 'Sec. 9 Step 11', provider_id: r.provider_id, provider_name: r.provider_name,
    title: `${r.report_type} report awaiting review`, detail: r.code,
  }));

  protectedClients.filter((r) => r.status === 'Breached').forEach((r) => items.push({
    severity: 'high', kind: 'breach', sop: 'Sec. 12', provider_id: r.provider_id, provider_name: r.provider_name,
    title: `Protected client breached: ${r.client_name}`, detail: r.breach_notes || 'Non-circumvention breach',
  }));

  const rank = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => rank[a.severity] - rank[b.severity]);
  res.json({
    items,
    summary: {
      total: items.length,
      high: items.filter((i) => i.severity === 'high').length,
      medium: items.filter((i) => i.severity === 'medium').length,
      low: items.filter((i) => i.severity === 'low').length,
    },
  });
});
