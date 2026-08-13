/**
 * waterTankWorkOrder.controller.js
 * The work order dashboard and its lifecycle actions.
 *
 * Raised automatically when the Customer Service Agreement is signed, then
 * driven through: assign provider (Sec. 8 Step 7) → provider accepts →
 * schedule → attend → deliver → reports → verify completion (Sec. 9 Step 9)
 * → invoice.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const svc = require('../services/wtWorkOrder.service');
const identity = require('../services/wtIdentity.service');
const commercial = require('../services/wtProviderCommercial.service');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const byKey = (k) => ({ [Op.or]: [{ id: Number.isNaN(Number(k)) ? -1 : Number(k) }, { code: k }] });

async function load(req, res) {
  const wo = await M.WtWorkOrder.findOne({ where: { ...branchScope(req), ...byKey(req.params.id) } });
  if (!wo) { res.status(404).json({ error: 'Work order not found' }); return null; }
  return wo;
}

const logEvent = (req, wo, title, detail) => M.WtCommLog.create({
  branch_id: resolveBranchId(req), client_name: wo.client_name,
  channel: 'note', direction: 'outbound',
  summary: `${wo.code}: ${title}${detail ? ` — ${detail}` : ''}`,
  ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
}).catch(() => {});

/* ═══ REFERENCE ═══════════════════════════════════════════════ */

/**
 * GET /wt-work-orders/reference — stage definitions plus the providers that may
 * actually be assigned. SOP-02 Sec. 6 Step 4: approved AND a signed master
 * agreement, or no client work may be given to them.
 */
exports.reference = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [providers, docs, workOrders] = await Promise.all([
    M.WtProvider.findAll({ where: scope, order: [['rank', 'ASC'], ['business_name', 'ASC']], raw: true }),
    P.WtProviderDocument.findAll({ where: scope, raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
  ]);
  const requiredCompliance = ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Safety Certification'];
  const requiredInsurance = ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance', 'Vehicle Insurance'];
  const shaped = await Promise.all(providers.map(async (p) => {
    const approved = String(p.status || '').toLowerCase() === 'approved';
    const active = await commercial.getActiveAgreement(p);
    const mine = docs.filter((d) => d.provider_id === p.id);
    const docOk = (type, category) => mine.some((d) => d.category === category && d.doc_type === type && d.verified
      && (!d.expiry_date || new Date(d.expiry_date) >= new Date(today())));
    const complianceOk = requiredCompliance.every((type) => docOk(type, 'compliance'));
    const insuranceOk = requiredInsurance.every((type) => docOk(type, 'insurance'));
    const activeJobs = workOrders.filter((w) => w.provider_id === p.id && ['issued', 'accepted', 'in progress'].includes(String(w.status || '').toLowerCase())).length;
    const blocking = [];
    if (!approved) blocking.push(`Provider status is ${p.status || 'Pending'}`);
    if (!active) blocking.push('No current completed master agreement (Sec. 6 Step 4)');
    if (!complianceOk) blocking.push('Required compliance evidence is incomplete or expired');
    if (!insuranceOk) blocking.push('Required insurance is incomplete or expired');
    if (!p.payment_verified) blocking.push('Payment account is not verified');
    if (!p.cumilla_briefed) blocking.push('Territory briefing is not acknowledged');
    if (num(p.capacity_per_week) > 0 && activeJobs >= num(p.capacity_per_week)) blocking.push('Weekly capacity is fully allocated');
    return {
      id: p.id, code: p.code, business_name: p.business_name, specialty: p.specialty,
      rating: num(p.rating), rank: p.rank, completion_rate: num(p.completion_rate),
      jobs_completed: num(p.jobs_completed), coverage: p.coverage,
      coverage_areas: svc.asArray(p.coverage_areas),
      service_categories: svc.asArray(p.service_categories),
      status: p.status, agreement_status: p.agreement_status,
      agreement_code: active?.agreement?.code || null,
      agreement_expiry_date: active?.agreement?.expiry_date || null,
      commission_pct: num(active?.agreement?.commission_pct),
      rate_count: active?.rates?.length || 0, active_jobs: activeJobs,
      assignable: blocking.length === 0,
      blocked_reason: blocking[0] || null, blocking,
    };
  }));
  res.json({
    stages: svc.STAGES,
    providers: shaped,
    assignable_providers: shaped.filter((p) => p.assignable),
    statuses: ['Draft', 'Issued', 'Accepted', 'In Progress', 'Completed', 'Cancelled'],
  });
});

/* ═══ DASHBOARD ═══════════════════════════════════════════════ */

/** GET /wt-work-orders/:id — everything the work order dashboard shows. */
exports.detail = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const w = wo.toJSON();
  const scope = branchScope(req);

  const [client, provider, quotation, invoices, reports, project, comms] = await Promise.all([
    w.client_code
      ? M.WtClient.findOne({ where: { ...scope, code: w.client_code }, raw: true })
      : M.WtClient.findOne({ where: { ...scope, name: w.client_name }, raw: true }),
    w.provider_id
      ? M.WtProvider.findOne({ where: { ...scope, id: w.provider_id }, raw: true })
      : (w.provider_name ? M.WtProvider.findOne({ where: { ...scope, business_name: w.provider_name }, raw: true }) : null),
    w.source_quotation ? M.WtQuotation.findOne({ where: { ...scope, code: w.source_quotation }, raw: true }) : null,
    M.WtInvoice.findAll({ where: { ...scope, client_name: w.client_name }, order: [['id', 'DESC']], raw: true }),
    P.WtServiceReport.findAll({ where: { ...scope, work_order_code: w.code }, order: [['id', 'DESC']], raw: true }),
    w.project_id ? M.WtProject.findOne({ where: { ...scope, code: w.project_id }, raw: true }) : null,
    M.WtCommLog.findAll({ where: { ...scope, ref_code: w.code }, order: [['id', 'DESC']], limit: 40, raw: true }),
  ]);

  const stages = svc.deriveStages(w);
  const progress = svc.computeProgress(stages);
  const paid = num(w.provider_paid_amount);
  const fee = num(w.provider_fee);

  // what the operator should do next, in SOP order
  const nextAction = (() => {
    if (String(w.status).toLowerCase() === 'cancelled') return null;
    if (!stages.assigned) return { key: 'assign', label: 'Assign a provider', sop: 'Sec. 8 Step 7' };
    if (!stages.accepted) return { key: 'accept', label: 'Record provider acceptance', sop: 'Sec. 7 Step 7' };
    if (!stages.scheduled) return { key: 'schedule', label: 'Schedule the visit', sop: 'Sec. 8 Step 8' };
    if (!stages.attended) return { key: 'start', label: 'Mark crew attended', sop: 'Sec. 8 Step 8' };
    if (!stages.work_done) return { key: 'complete', label: 'Mark work completed', sop: 'Sec. 8 Step 8' };
    if (!stages.reports) return { key: 'reports', label: 'Collect reports & photos', sop: 'Sec. 8 Step 10' };
    if (!stages.verified) return { key: 'verify', label: 'Verify completion', sop: 'Sec. 9 Step 9' };
    if (!stages.invoiced) return { key: 'invoice', label: 'Raise the invoice', sop: 'Sec. 9' };
    return null;
  })();

  res.json({
    work_order: { ...w, stages, progress },
    stage_defs: svc.STAGES,
    next_action: nextAction,
    client: client || null,
    provider: provider || null,
    quotation: quotation || null,
    project: project || null,
    invoices: invoices.filter((i) => !w.project_id || i.project_id === w.project_id),
    reports,
    comms,
    money: {
      contract: num(w.total_contract),
      provider_fee: fee,
      ss_fee: num(w.ss_fee),
      provider_paid: paid,
      provider_due: Math.max(0, fee - paid),
      margin: num(w.total_contract) - fee,
    },
  });
});

/* ═══ LIFECYCLE ACTIONS ═══════════════════════════════════════ */

/** POST /wt-work-orders/:id/assign — Sec. 8 Step 7. */
exports.assign = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const provider = await M.WtProvider.findOne({
    where: { ...branchScope(req), ...byKey(String(req.body.provider_id || req.body.provider_code || '')) },
  });
  if (!provider) return res.status(404).json({ error: 'Provider not found' });

  // the SOP gate — refuse rather than warn
  const approved = String(provider.status || '').toLowerCase() === 'approved';
  const activeAgreement = await commercial.getActiveAgreement(provider);
  const providerDocs = await P.WtProviderDocument.findAll({ where: { ...branchScope(req), provider_id: provider.id }, raw: true });
  const required = {
    compliance: ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Safety Certification'],
    insurance: ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance', 'Vehicle Insurance'],
  };
  const docOk = (type, category) => providerDocs.some((d) => d.category === category && d.doc_type === type && d.verified
    && (!d.expiry_date || new Date(d.expiry_date) >= new Date(today())));
  const operationalBlocking = [];
  if (!approved) operationalBlocking.push(`Provider status is ${provider.status || 'Pending'} — only approved providers may be assigned`);
  if (!activeAgreement) operationalBlocking.push('No active completed Master Service Delivery Provider Agreement (Sec. 6 Step 4)');
  if (!required.compliance.every((type) => docOk(type, 'compliance'))) operationalBlocking.push('Required compliance evidence is incomplete or expired');
  if (!required.insurance.every((type) => docOk(type, 'insurance'))) operationalBlocking.push('Required insurance is incomplete or expired');
  if (!provider.payment_verified) operationalBlocking.push('Payment account is not verified');
  if (!provider.cumilla_briefed) operationalBlocking.push('Territory briefing is not acknowledged');
  if (operationalBlocking.length) {
    return res.status(400).json({
      error: `${provider.business_name} cannot be assigned client work.`,
      blocking: operationalBlocking,
    });
  }

  let fees;
  try {
    fees = await commercial.calculateWorkOrderFees(provider, wo);
  } catch (error) {
    const canOverride = ['super_admin', 'branch_admin'].includes(req.user?.role)
      && ['UNMATCHED_RATES', 'NO_CODED_LINES'].includes(error.code)
      && req.body.fee_override_reason && num(req.body.provider_fee) > 0;
    if (!canOverride) {
      return res.status(400).json({
        error: error.message,
        blocking: error.unmatched?.map((line) => `${line.code || 'CUSTOM'} — ${line.name}`) || [],
        override_allowed: ['UNMATCHED_RATES', 'NO_CODED_LINES'].includes(error.code),
      });
    }
    fees = {
      agreement: activeAgreement.agreement,
      snapshot: [{ override: true, reason: req.body.fee_override_reason }],
      gross_provider_charge: num(req.body.provider_fee), commission_pct: 0,
      commission_amount: 0, net_provider_payable: num(req.body.provider_fee),
      override_reason: req.body.fee_override_reason,
    };
  }

  // Seed the SSPC-WTCM-PWO-01 document from the source quotation the first time a
  // provider is assigned — the priced selections carry across but stay editable,
  // since the agreed price may differ from the quoted price (Pricing Note 2).
  let docSeed = {};
  try {
    const key = wo.quotation_no || wo.source_quotation;
    const quotation = key
      ? await M.WtQuotation.findOne({ where: { ...branchScope(req), ...byKey(String(key)) }, raw: true })
      : null;
    const doc = require('../services/wtWorkOrderDoc.service');
    docSeed = doc.hydrateFromQuotation(wo.get({ plain: true }), quotation, null);
    if (!wo.date_issued) docSeed.date_issued = today();
    if (!wo.project_manager) docSeed.project_manager = actorOf(req);
    if (!wo.agreement_reference) docSeed.agreement_reference = activeAgreement?.agreement?.code || null;
  } catch { /* the document can always be completed by hand */ }

  await svc.refreshProgress(wo, {
    ...docSeed,
    provider_id: provider.id,
    provider_name: provider.business_name,
    provider_agreement_id: fees.agreement.id,
    provider_rate_snapshot: fees.snapshot,
    provider_gross_charge: fees.gross_provider_charge,
    provider_commission_pct: fees.commission_pct,
    provider_commission_amount: fees.commission_amount,
    provider_net_payable: fees.net_provider_payable,
    provider_fee: fees.net_provider_payable,
    ss_fee: Math.max(0, num(wo.total_contract) - fees.net_provider_payable),
    fee_override_reason: fees.override_reason || null,
    fee_override_by: fees.override_reason ? actorOf(req) : null,
    assigned_at: new Date(),
    assigned_by: actorOf(req),
    status: ['Draft'].includes(wo.status) ? 'Issued' : wo.status,
  });
  await logEvent(req, wo, 'provider assigned', provider.business_name);

  // Tell the provider. Previously an assignment sat in the system until someone
  // telephoned them, which is the delay the portal was built to remove.
  const notify = require('../services/wtNotify.service');
  const mail = await notify.onWorkOrderAssigned(wo.toJSON());

  res.json({ work_order: wo, provider_notified: mail.sent, fees: {
    agreement_code: fees.agreement.code, gross: fees.gross_provider_charge,
    commission_pct: fees.commission_pct, commission: fees.commission_amount,
    net_payable: fees.net_provider_payable, overridden: !!fees.override_reason,
  } });
});

/** POST /wt-work-orders/:id/accept — provider confirms availability and price. */
exports.accept = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (!wo.provider_name) return res.status(400).json({ error: 'Assign a provider before recording acceptance.' });
  await svc.refreshProgress(wo, {
    accepted_at: new Date(),
    accepted_by: req.body.accepted_by || wo.provider_name,
    status: 'Accepted',
    declined_reason: null,
  });
  await logEvent(req, wo, 'provider accepted the work order', req.body.accepted_by || wo.provider_name);
  res.json(wo);
});

/** POST /wt-work-orders/:id/decline — provider turns it down; frees reassignment. */
exports.decline = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (!req.body.reason) return res.status(400).json({ error: 'Record why the provider declined.' });
  await svc.refreshProgress(wo, {
    declined_reason: req.body.reason,
    accepted_at: null,
    provider_id: null, provider_name: null,
    assigned_at: null, assigned_by: null,
    provider_agreement_id: null, provider_rate_snapshot: null,
    provider_gross_charge: 0, provider_commission_pct: 0,
    provider_commission_amount: 0, provider_net_payable: 0,
    provider_fee: 0, fee_override_reason: null, fee_override_by: null,
    status: 'Draft',
  });
  await logEvent(req, wo, 'provider declined', req.body.reason);
  res.json(wo);
});

/** POST /wt-work-orders/:id/schedule — Sec. 8 Step 8. */
exports.schedule = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (!req.body.scheduled_date) return res.status(400).json({ error: 'Pick a date for the visit.' });
  await svc.refreshProgress(wo, {
    scheduled_date: req.body.scheduled_date,
    target_date: req.body.target_date || req.body.scheduled_date,
    crew_size: req.body.crew_size != null ? num(req.body.crew_size) : wo.crew_size,
  });
  await logEvent(req, wo, 'visit scheduled', req.body.scheduled_date);
  res.json(wo);
});

/** POST /wt-work-orders/:id/start — crew attended. */
exports.start = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const attendance = svc.asArray(wo.attendance);
  attendance.push({
    at: new Date().toISOString(),
    crew: req.body.crew || null,
    crew_size: num(req.body.crew_size) || num(wo.crew_size),
    note: req.body.note || null,
  });
  await svc.refreshProgress(wo, {
    started_at: wo.started_at || new Date(),
    attendance,
    crew_size: num(req.body.crew_size) || num(wo.crew_size),
    status: 'In Progress',
  });
  await logEvent(req, wo, 'crew attended site', req.body.crew || null);
  res.json(wo);
});

/** POST /wt-work-orders/:id/complete — work delivered. */
exports.complete = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  await svc.refreshProgress(wo, {
    status: 'Completed',
    completed_at: wo.completed_at || new Date(),
    started_at: wo.started_at || new Date(),
    completion_notes: req.body.completion_notes ?? wo.completion_notes,
  });
  await logEvent(req, wo, 'work completed');
  // warranty + protected client are raised by the shared completion hook
  const ops = require('./waterTankOps.controller');
  if (typeof ops.onWorkOrderCompletedPublic === 'function') {
    await ops.onWorkOrderCompletedPublic(req, wo).catch(() => {});
  }
  res.json(wo);
});

/** POST /wt-work-orders/:id/verify — Sec. 9 Step 9 completion review. */
exports.verify = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const patch = {
    site_cleaned: !!req.body.site_cleaned,
    reports_submitted: !!req.body.reports_submitted,
    photos_collected: !!req.body.photos_collected,
    client_satisfied: !!req.body.client_satisfied,
    completion_notes: req.body.completion_notes ?? wo.completion_notes,
  };
  const allDone = patch.site_cleaned && patch.reports_submitted && patch.photos_collected && patch.client_satisfied;
  if (allDone) { patch.verified_at = new Date(); patch.verified_by = actorOf(req); }
  else { patch.verified_at = null; patch.verified_by = null; }

  await svc.refreshProgress(wo, patch);
  await logEvent(req, wo, allDone ? 'completion verified' : 'completion checklist updated');
  res.json(wo);
});

/** PATCH /wt-work-orders/:id — edit, keeping the progress bar honest. */
exports.update = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.code;
  delete body.progress; delete body.stages; // derived, never set directly
  for (const key of ['provider_fee', 'ss_fee', 'total_contract', 'provider_agreement_id', 'provider_rate_snapshot',
    'provider_gross_charge', 'provider_commission_pct', 'provider_commission_amount',
    'provider_net_payable', 'fee_override_reason', 'fee_override_by']) delete body[key];

  // fill in Client ID / Project ID if this record never had them
  const merged = await identity.attachIdentifiers(
    'work-orders', { ...wo.get({ plain: true }), ...body }, resolveBranchId(req),
  );
  if (!wo.client_code && merged.client_code) body.client_code = merged.client_code;
  if (!wo.project_id && merged.project_id) body.project_id = merged.project_id;

  await svc.refreshProgress(wo, body);
  res.json(wo);
});

/* ═══ LIST ════════════════════════════════════════════════════ */

/** GET /wt-work-orders — the register, each row carrying its progress. */
exports.list = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const rows = await M.WtWorkOrder.findAll({ where: scope, order: [['id', 'DESC']], limit: 300, raw: true });

  const shaped = rows.map((w) => {
    const stages = svc.deriveStages(w);
    return {
      ...w,
      stages,
      progress: svc.computeProgress(stages),
      provider_due: Math.max(0, num(w.provider_fee) - num(w.provider_paid_amount)),
      awaiting_assignment: !w.provider_name && String(w.status || '').toLowerCase() !== 'cancelled',
      awaiting_acceptance: !!w.provider_name && !w.accepted_at && String(w.status || '').toLowerCase() !== 'cancelled',
    };
  });

  const is = (w, s) => String(w.status || '').toLowerCase() === s;
  res.json({
    rows: shaped,
    summary: {
      total: shaped.length,
      awaiting_assignment: shaped.filter((w) => w.awaiting_assignment).length,
      awaiting_acceptance: shaped.filter((w) => w.awaiting_acceptance).length,
      in_progress: shaped.filter((w) => is(w, 'in progress')).length,
      completed: shaped.filter((w) => is(w, 'completed')).length,
      contract_value: shaped.reduce((s, w) => s + num(w.total_contract), 0),
      provider_due: shaped.reduce((s, w) => s + w.provider_due, 0),
      avg_progress: shaped.length ? Math.round(shaped.reduce((s, w) => s + w.progress, 0) / shaped.length) : 0,
      from_agreements: shaped.filter((w) => w.source_agreement).length,
    },
  });
});

/* ═══ PROJECT WORK ORDER DOCUMENT (SSPC-WTCM-PWO-01) ══════════ */

const crypto = require('crypto');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const { generateCode } = require('../utils/codeGenerator');
const woDoc = require('../services/wtWorkOrderDoc.service');
const woPdf = require('../services/wtWorkOrderPdf.service');

/** Fields an operator may edit on the work-order document. */
const DOC_FIELDS = [
  'quotation_no', 'agreement_reference', 'date_issued', 'project_manager',
  'client_company', 'client_contact_person', 'client_phone', 'client_email', 'site_address', 'property_type',
  'service_selections', 'tank_details', 'scope', 'deliverables',
  'materials_required', 'chemicals_required', 'equipment_required', 'timeline_dates',
  'lines', 'material_lines', 'labour_lines', 'cost_summary', 'payment_schedule', 'payment_method', 'pricing_notes',
  'warranty_terms', 'project_checklist',
];

const partiesFor = async (req, wo) => {
  const provider = wo.provider_id
    ? await M.WtProvider.findOne({ where: { ...branchScope(req), id: wo.provider_id }, raw: true })
    : (wo.provider_name ? await M.WtProvider.findOne({ where: { ...branchScope(req), business_name: wo.provider_name }, raw: true }) : null);
  return {
    provider: provider || {},
    org: { represented_by: wo.project_manager || req.user?.name || '', position: 'Project Manager', email: req.user?.email || '' },
  };
};

/** GET /wt-work-orders/document/reference — the document's own vocabulary. */
exports.documentReference = asyncHandler(async (req, res) => {
  res.json({
    property_types: woDoc.PROPERTY_TYPES,
    service_groups: woDoc.SERVICE_GROUPS,
    tank_fields: woDoc.TANK_FIELDS,
    timeline_fields: woDoc.TIMELINE_FIELDS,
    amc_fields: woDoc.AMC_FIELDS,
    cost_rows: woDoc.COST_ROWS,
    payment_methods: woDoc.PAYMENT_METHODS,
    warranty_rows: woDoc.WARRANTY_ROWS,
    checklist_groups: woDoc.CHECKLIST_GROUPS,
    default_payment_schedule: woDoc.DEFAULT_PAYMENT_SCHEDULE,
    catalog: await woDoc.getCatalog(resolveBranchId(req)),
  });
});

/** GET /wt-work-orders/:id/document — the rendered work order plus live totals. */
exports.document = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const parties = await partiesFor(req, wo);
  const plain = wo.get({ plain: true });
  const built = woDoc.buildWorkOrderDocument(plain, parties);
  const envelope = wo.wo_envelope_id
    ? await SigningEnvelope.findByPk(wo.wo_envelope_id, { include: [{ model: EnvelopeSigner, as: 'signers' }] })
    : null;
  res.json({
    work_order: plain,
    provider: parties.provider,
    // once executed the stored copy is the legal record and must not re-render
    html: wo.wo_signed_document_html || envelope?.document_html || built.html,
    draft_html: built.html,
    summary: built.summary,
    payment_schedule: built.payment_schedule,
    envelope: envelope ? {
      id: envelope.id, envelope_code: envelope.envelope_code, status: envelope.status,
      sent_at: envelope.sent_at, completed_at: envelope.completed_at,
      signers: (envelope.signers || []).sort((a, b) => a.signer_order - b.signer_order).map((s) => ({
        id: s.id, order: s.signer_order, role: s.role, name: s.name, email: s.email,
        // The token is the signature authority; it is never returned in a
        // routine payload. Issue it through the agreement hub's audited
        // POST /:id/signing-link/:signerId instead.
        status: s.status, signed_at: s.signed_at,
        has_live_link: !['signed', 'declined'].includes(String(s.status || '').toLowerCase()),
      })),
    } : null,
    locked: !!wo.wo_signed_at || ['sent', 'partially_signed'].includes(String(wo.wo_doc_status || '').toLowerCase()),
  });
});

/** PATCH /wt-work-orders/:id/document — save the ten sections. */
exports.saveDocument = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (wo.wo_signed_at) return res.status(409).json({ error: 'This work order has been executed by both parties and can no longer be edited. Void and reissue it to make changes.' });
  if (['sent', 'partially_signed'].includes(String(wo.wo_doc_status || '').toLowerCase())) {
    return res.status(409).json({ error: 'This work order is out for signature. Void the envelope before editing it.' });
  }
  const patch = {};
  for (const key of DOC_FIELDS) if (key in req.body) patch[key] = req.body[key];
  if (!Object.keys(patch).length) return res.status(400).json({ error: 'Nothing to save.' });

  // keep the headline contract value in step with Section 8
  const merged = { ...wo.get({ plain: true }), ...patch };
  patch.total_contract = woDoc.computeTotals(merged).total;
  await svc.refreshProgress(wo, patch);
  const parties = await partiesFor(req, wo);
  const built = woDoc.buildWorkOrderDocument(wo.get({ plain: true }), parties);
  res.json({ work_order: wo, html: built.html, summary: built.summary, payment_schedule: built.payment_schedule });
});

/** POST /wt-work-orders/:id/document/sync-quotation — pull the priced selections across. */
exports.syncQuotation = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (wo.wo_signed_at) return res.status(409).json({ error: 'Executed work orders cannot be re-synced.' });
  const key = wo.quotation_no || wo.source_quotation;
  if (!key) return res.status(400).json({ error: 'This work order is not linked to a quotation.' });
  const quotation = await M.WtQuotation.findOne({ where: { ...branchScope(req), ...byKey(String(key)) }, raw: true });
  if (!quotation) return res.status(404).json({ error: `Quotation ${key} was not found.` });

  const plain = wo.get({ plain: true });
  // force=true re-seeds even where the operator already has values
  const target = req.body.force ? { ...plain, lines: null, material_lines: null, labour_lines: null, cost_summary: null } : plain;
  const patch = woDoc.hydrateFromQuotation(target, quotation, null);
  if (!Object.keys(patch).length) return res.json({ work_order: wo, applied: [], message: 'Everything already matches the quotation.' });
  patch.total_contract = woDoc.computeTotals({ ...plain, ...patch }).total;
  await svc.refreshProgress(wo, patch);
  await logEvent(req, wo, 'pricing synced from quotation', quotation.code);
  res.json({ work_order: wo, applied: Object.keys(patch) });
});

/** GET /wt-work-orders/:id/document/pdf — branded PDF of the work order. */
exports.documentPdf = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const parties = await partiesFor(req, wo);
  const pdf = await woPdf.buildWorkOrderPdf(wo.get({ plain: true }), parties);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${wo.code}-project-work-order.pdf"`);
  res.send(pdf);
});

/**
 * POST /wt-work-orders/:id/document/send — issue the work order for two-party
 * signature. The provider signs first (they are accepting the job), Seventh Sky
 * countersigns. Completion is handled by partyRoleActivation.
 */
exports.sendDocument = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (wo.wo_signed_at) return res.status(409).json({ error: 'This work order has already been executed.' });
  if (['sent', 'partially_signed'].includes(String(wo.wo_doc_status || '').toLowerCase())) {
    return res.status(409).json({ error: 'This work order is already out for signature.' });
  }
  if (!wo.provider_id) return res.status(400).json({ error: 'Assign a service provider before issuing the work order for signature.' });

  const provider = await M.WtProvider.findOne({ where: { ...branchScope(req), id: wo.provider_id } });
  if (!provider) return res.status(404).json({ error: 'The assigned provider record could not be found.' });

  const blocking = [];
  if (!woDoc.computeTotals(wo.get({ plain: true })).total) blocking.push('Section 8 has no priced lines — the work order has no value');
  if (!provider.contact_email) blocking.push(`${provider.business_name} has no contact email address to sign with`);
  const staffEmail = req.body.countersigner_email || req.user?.email;
  if (!staffEmail) blocking.push('No Seventh Sky countersigner email address');
  if (!wo.client_name) blocking.push('The work order has no client name');
  if (blocking.length) return res.status(400).json({ error: 'This work order cannot be issued for signature yet.', blocking });

  const parties = await partiesFor(req, wo);
  const built = woDoc.buildWorkOrderDocument(wo.get({ plain: true }), parties);
  const expires = new Date(Date.now() + 30 * 864e5);

  const result = await sequelize.transaction(async (transaction) => {
    const envelope = await SigningEnvelope.create({
      branch_id: wo.branch_id,
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'ENV-WTPWO-', 6),
      title: `${built.title} — ${wo.client_name}`,
      document_html: built.html,
      related_type: 'water_tank_work_order', related_id: wo.id,
      status: 'sent', sent_at: new Date(), expires_at: expires, signing_order_enforced: true,
      kyc_role: 'provider', kyc_policy: 'none',
      terms: built.terms,
      created_by: req.user?.id || null,
    }, { transaction });

    // `label` is the PARTY, and it must match the data-sign-party anchors in the
    // work-order document — that pairing is how captured signatures find their
    // box. Labelling the field with the person's name instead left the executed
    // document blank.
    const signerDefs = [
      { role: 'provider', order: 1, label: 'Service Provider', name: provider.contact_person || provider.business_name, email: provider.contact_email },
      { role: 'staff_countersign', order: 2, label: 'Seventh Sky', name: req.body.countersigner_name || req.user?.name || 'Seventh Sky', email: staffEmail },
    ];
    const links = [];
    for (const def of signerDefs) {
      const token = crypto.randomBytes(24).toString('hex');
      const signer = await EnvelopeSigner.create({
        envelope_id: envelope.id, signer_order: def.order, role: def.role,
        name: def.name, email: def.email, access_token: token, token_expires_at: expires,
        status: def.order === 1 ? 'sent' : 'pending',
        user_id: def.role === 'staff_countersign' ? req.user?.id || null : null,
      }, { transaction });
      await SignatureField.bulkCreate([
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: `${def.label} signature` },
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: `${def.label} — date signed` },
      ], { transaction });
      links.push({ name: def.name, email: def.email, role: def.role, order: def.order, token });
    }

    await wo.update({
      wo_envelope_id: envelope.id, wo_doc_status: 'Sent', wo_sent_at: new Date(),
      wo_doc_code: envelope.envelope_code,
    }, { transaction });
    return { envelope, links };
  });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try {
    const { sendEmail } = require('../services/communication.service');
    const first = result.links[0];
    await sendEmail(first.email, `Please sign: Project Work Order ${wo.code}`,
      `<p>Dear ${first.name},</p><p>Seventh Sky Property Care has issued Project Work Order <b>${wo.code}</b> for <b>${wo.client_name}</b> under your Master Service Delivery Provider Agreement.</p>
       <p>Please review the scope, agreed pricing, timeline and warranty terms, then sign here:</p>
       <p><a href="${base}/${first.token}">${base}/${first.token}</a></p>
       <p>Once you have signed, Seventh Sky will countersign and you will be onboarded to the project.</p>`).catch(() => {});
  } catch { /* best effort — the links are returned either way */ }

  await logEvent(req, wo, 'work order issued for signature', provider.business_name);
  res.json({
    work_order: wo, envelope_id: result.envelope.id, envelope_code: result.envelope.envelope_code,
    links: result.links.map((l) => ({ ...l, signing_path: `/admin/sign/${l.token}` })),
  });
});

/** POST /wt-work-orders/:id/document/void — withdraw an unsigned work order. */
exports.voidDocument = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  if (!wo.wo_envelope_id) return res.status(400).json({ error: 'This work order has not been issued for signature.' });
  if (wo.wo_signed_at) return res.status(409).json({ error: 'An executed work order cannot be voided here — raise a variation instead.' });
  const envelope = await SigningEnvelope.findByPk(wo.wo_envelope_id);
  if (envelope) await envelope.update({ status: 'voided', voided_at: new Date(), void_reason: req.body.reason || 'Withdrawn by Seventh Sky' });
  await wo.update({ wo_doc_status: 'Voided', wo_envelope_id: null });
  await logEvent(req, wo, 'work order signature voided', req.body.reason || '');
  res.json({ work_order: wo });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Provider payouts
 *
 * These used to live on /wt-ops/work-orders/:id/pay-provider, alongside the
 * generic CRUD and with no role guard on the router at all. A payout is the
 * money side of THIS work order, so it belongs on the work order's own
 * controller behind canTransact, and the movement itself is written by
 * wtLedger.service — the single authority for Water Tank money.
 * ──────────────────────────────────────────────────────────────────────────── */

/** POST /wt-work-orders/:id/pay-provider — record a full or partial payout. */
exports.payProvider = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const ledger = require('../services/wtLedger.service');
  try {
    const out = await ledger.recordProviderPayout({
      branch_id: wo.branch_id,
      work_order_id: wo.id,
      amount: num(req.body?.amount),
      method: req.body?.method || null,
      reference: req.body?.reference || null,
      paid_on: req.body?.paid_on || today(),
      note: req.body?.note || null,
      idempotency_key: req.body?.idempotency_key || null,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });

    if (!out.duplicate) {
      await M.WtCommLog.create({
        branch_id: wo.branch_id, client_name: wo.client_name, channel: 'note', direction: 'outbound',
        summary: `Provider payout ${out.event.amount} to ${wo.provider_name || 'provider'} on ${wo.code}${req.body?.reference ? ` (ref ${req.body.reference})` : ''}`,
        ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
      }).catch(() => {});
    }

    await wo.reload();

    // Tell the provider their money moved. New postings only, for the same
    // reason as the client receipt above.
    let payoutMailed = false;
    if (!out.duplicate) {
      const notify = require('../services/wtNotify.service');
      const m = await notify.onProviderPaid(wo.toJSON(), out.event.amount);
      payoutMailed = m.sent;
    }

    res.json({
      work_order: wo,
      payout_emailed: payoutMailed,
      paid: out.standing.paid,
      remaining: out.standing.remaining,
      event: out.event,
      duplicate: out.duplicate,
      message: out.duplicate
        ? 'This payout was already recorded — nothing was paid twice.'
        : 'Provider payout recorded.',
    });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message, ...(e.remaining != null ? { remaining: e.remaining } : {}) });
    throw e;
  }
});

/** POST /wt-work-orders/:id/pay-provider/:eventId/reverse — undo a payout. */
exports.reversePayout = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const ledger = require('../services/wtLedger.service');
  try {
    const out = await ledger.reverse({
      branch_id: wo.branch_id,
      event_id: Number(req.params.eventId),
      reason: req.body?.reason,
      actor: actorOf(req),
      actor_id: req.user?.id || null,
    });
    await wo.reload();
    res.json({ work_order: wo, standing: out.standing, event: out.event, message: 'Payout reversed.' });
  } catch (e) {
    if (e instanceof ledger.LedgerError) return res.status(e.status).json({ error: e.message });
    throw e;
  }
});

/** GET /wt-work-orders/:id/payouts — the ledger rows behind this work order. */
exports.payoutHistory = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const ledger = require('../services/wtLedger.service');
  const subject = { branch_id: wo.branch_id, subject_type: 'work_order', subject_id: wo.id };
  const rows = await ledger.historyOf(subject);
  const paid = Math.abs(await ledger.balanceOf(subject));
  res.json({ rows, paid, fee: num(wo.provider_fee), remaining: ledger.round2(num(wo.provider_fee) - paid) });
});

/**
 * GET /wt-work-orders/:id/actions — the lifecycle, answered from one place.
 *
 * The work order screen previously decided for itself which buttons to show,
 * duplicating rules the endpoints enforce. Both now read wtStateMachine, so an
 * offered action is one the API will accept and a refused one carries its reason.
 */
exports.actions = asyncHandler(async (req, res) => {
  const wo = await load(req, res); if (!wo) return;
  const sm = require('../services/wtStateMachine.service');
  const ledger = require('../services/wtLedger.service');
  const paid = Math.abs(await ledger.balanceOf({ branch_id: wo.branch_id, subject_type: 'work_order', subject_id: wo.id }));
  const ctx = { payoutPaid: paid, payoutRemaining: ledger.round2(num(wo.provider_fee) - paid) };
  const row = wo.toJSON();
  res.json({
    state: sm.stateOf('work_order', row),
    states: sm.MACHINES.work_order.states,
    actions: sm.availableActions('work_order', row, ctx),
    next: sm.nextRecommended('work_order', row, ctx),
    payout: { fee: num(wo.provider_fee), paid, remaining: ctx.payoutRemaining },
  });
});
