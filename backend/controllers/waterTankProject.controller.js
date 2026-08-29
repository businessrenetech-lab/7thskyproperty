/**
 * waterTankProject.controller.js — the Water Tank project file API.
 *
 * SSPC-WTCM-SOP-01 §4 makes the project the spine: the wizard opens it and every
 * downstream record hangs off its code. The logic lives in
 * services/wtProject.service.js; this layer is transport, scoping and validation.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, pick, serviceScope, resolveServiceLine, catalogueVertical, serviceUi } = require('../utils/controllerHelpers');
// Branch + service scope for wt_*; Contact/Property lookups keep plain branchScope.
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const Property = require('../models/Property');
const ServiceItem = require('../models/ServiceItem');
const svc = require('../services/wtProject.service');

const { num, eq, asArray, today } = svc;
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';
const ctxOf = (req) => ({
  branchId: resolveBranchId(req), actor: actorOf(req), userId: req.user?.id || null,
});
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);

/* Columns a client may set directly. Everything derived (code, progress from the
   stage, financial rollups) is deliberately absent. */
const EDITABLE = [
  'name', 'status', 'health_index', 'priority', 'notes',
  'client_phone', 'client_email', 'client_type',
  'agreement_code', 'agreement_envelope_id', 'agreement_status', 'agreement_signed_at',
  'site_address', 'area', 'city', 'district', 'property_type',
  'site_contact_name', 'site_contact_phone', 'access_notes',
  'project_type', 'service_category', 'services', 'scope_summary',
  'tank_type', 'tanks_count', 'tank_capacity', 'water_source',
  'enquiry_code', 'request_code', 'assessment_code', 'quotation_code', 'work_order_code',
  'needs_assessment', 'needs_quotation',
  'under_amc', 'amc_code', 'amc_package', 'amc_frequency', 'amc_visit_no', 'amc_next_visit',
  'provider_code', 'provider_id', 'assigned_provider', 'assigned_officer', 'ops_manager',
  'start_date', 'scheduled_date', 'target_completion', 'actual_start', 'actual_completion',
  'contract_value', 'provider_cost', 'deposit_required', 'deposit_amount',
  'deposit_received_at', 'payment_terms',
  'handover_at', 'warranty_code', 'warranty_period', 'satisfaction_score',
  'milestones', 'risk_flags', 'cancel_reason',
];

const loadProject = async (req, res) => {
  const key = req.params.code;
  const project = await M.WtProject.findOne({
    where: {
      ...scoped(req),
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
  if (!project) { res.status(404).json({ error: 'Project not found.' }); return null; }
  return project;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Reference — everything the wizard needs, in one call
 * ──────────────────────────────────────────────────────────────────────────── */
exports.reference = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const branchId = resolveBranchId(req);

  const [catalogRows, providers, amcs, requests, assessments, quotations, enquiries] = await Promise.all([
    ServiceItem.findAll({ where: { ...scope, vertical: catalogueVertical(req), is_active: true }, order: [['sort_order', 'ASC']], raw: true }).catch(() => []),
    M.WtProvider.findAll({ where: scope, order: [['rank', 'ASC'], ['business_name', 'ASC']], raw: true }),
    M.WtAmcContract.findAll({ where: scope, order: [['id', 'DESC']], raw: true }).catch(() => []),
    M.WtServiceRequest.findAll({ where: { ...scope, [Op.or]: [{ project_id: null }, { project_id: '' }] }, order: [['id', 'DESC']], limit: 50, raw: true }),
    M.WtSiteAssessment.findAll({ where: { ...scope, [Op.or]: [{ project_id: null }, { project_id: '' }] }, order: [['id', 'DESC']], limit: 50, raw: true }),
    M.WtQuotation.findAll({ where: { ...scope, [Op.or]: [{ project_id: null }, { project_id: '' }] }, order: [['id', 'DESC']], limit: 50, raw: true }),
    M.WtEnquiry.findAll({ where: scope, order: [['id', 'DESC']], limit: 30, raw: true }).catch(() => []),
  ]);

  const GROUP_LABEL = { service: 'Services', material: 'Materials', labour: 'Labour' };
  const catalog = catalogRows.map((i) => {
    let tags = i.tags;
    if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    const g = (tags || {}).group || 'service';
    return {
      id: i.id, code: i.code, name: i.name, unit: i.unit || null,
      standard_price: num(i.base_price), group: GROUP_LABEL[g] || 'Services', group_key: g,
      description: i.description || null,
    };
  });

  // Same SOP gate the intake wizard applies: no client work without an executed
  // master agreement (SOP-02 Sec. 6 Step 4).
  const eligible = providers.map((p) => {
    const approved = eq(p.status, 'approved');
    const signed = eq(p.agreement_status, 'signed');
    return {
      id: p.id, code: p.code, business_name: p.business_name, specialty: p.specialty,
      rating: num(p.rating), status: p.status, agreement_status: p.agreement_status,
      coverage: p.coverage || null,
      assignable: approved && signed,
      blocked_reason: approved
        ? (signed ? null : 'No signed master agreement (SOP-02 Sec. 6 Step 4)')
        : `Provider status is ${p.status || 'Pending'}`,
    };
  });

  const ui = serviceUi(req);
  res.json({
    next_code: await svc.nextProjectCode(branchId),
    stages: svc.STAGES,
    // Vocabulary from the active service line (never Water Tank in the AC console).
    project_types: ui.project_types || svc.PROJECT_TYPES,
    disbursement_categories: svc.DISBURSEMENT_CATEGORIES,
    closure_checklist: svc.CLOSURE_CHECKLIST,
    categories: ui.categories || ['Cleaning', 'Disinfection', 'Repairs', 'Water Quality', 'Maintenance', 'AMC', 'Inspection'],
    priorities: ['Low', 'Medium', 'High', 'Urgent'],
    tank_types: ui.equipment?.type_options || ['Rooftop', 'Underground', 'Overhead', 'Ground Level', 'Apartment Common', 'Industrial'],
    equipment: ui.equipment || null,
    property_types: ui.property_types || null,
    service_label: ui.full_label || null,
    catalog,
    groups: [...new Set(catalog.map((c) => c.group))],
    providers: eligible,
    assignable_providers: eligible.filter((p) => p.assignable),
    amc_contracts: amcs.map((a) => ({
      id: a.id, code: a.code, client_name: a.client_name, package: a.package,
      frequency: a.frequency, status: a.status, next_visit: a.next_visit,
      start_date: a.start_date, end_date: a.end_date, annual_value: num(a.annual_value),
    })),
    unlinked: {
      requests: requests.map((r) => ({ code: r.code, client_name: r.client_name, category: r.category, status: r.status, request_date: r.request_date })),
      assessments: assessments.map((a) => ({ code: a.code, client_name: a.client_name, status: a.status, assessed_date: a.assessed_date })),
      quotations: quotations.map((q) => ({ code: q.code, client_name: q.client_name, total: num(q.total), decision: q.decision })),
      enquiries: enquiries.map((e) => ({ code: e.code, client_name: e.client_name, phone: e.phone, site_address: e.site_address, status: e.status })),
    },
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Lookups
 * ──────────────────────────────────────────────────────────────────────────── */

/** Water-tank clients + the shared contact directory, so a known client is never retyped. */
exports.clientLookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ water_tank: [], contacts: [] });
  const like = { [Op.like]: `%${q}%` };

  const water_tank = await M.WtClient.findAll({
    where: { ...scoped(req), [Op.or]: [{ name: like }, { mobile: like }, { email: like }, { code: like }, { service_address: like }] },
    limit: 8, order: [['id', 'DESC']], raw: true,
  });

  let contacts = [];
  try {
    const Contact = require('../models/Contact');
    contacts = await Contact.findAll({
      where: { ...branchScope(req), [Op.or]: [{ full_name: like }, { primary_phone: like }, { email: like }] },
      limit: 8, order: [['id', 'DESC']], raw: true,
    });
  } catch { contacts = []; }

  const known = new Set(water_tank.map((c) => String(c.name || '').toLowerCase()));
  res.json({
    water_tank,
    contacts: contacts
      .filter((c) => !known.has(String(c.full_name || '').toLowerCase()))
      .map((c) => ({ id: c.id, name: c.full_name, mobile: c.primary_phone, email: c.email, address: c.address || c.present_address || null })),
  });
});

/**
 * The shared property register. Queried straight off the model rather than
 * through /api/properties so the water-tank console is not subject to the sales
 * role gate on that route.
 */
exports.propertyLookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const like = { [Op.like]: `%${q}%` };
  const rows = await Property.findAll({
    where: {
      ...branchScope(req),
      [Op.or]: [{ property_code: like }, { title: like }, { address: like }, { area: like }, { district: like }],
    },
    attributes: ['id', 'property_code', 'title', 'property_type', 'category', 'address', 'area', 'city', 'district', 'total_floors', 'total_units', 'status'],
    limit: 10, order: [['id', 'DESC']], raw: true,
  });
  res.json(rows);
});

/* ────────────────────────────────────────────────────────────────────────────
 * List + overview
 * ──────────────────────────────────────────────────────────────────────────── */
exports.list = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const { q, stage, status, provider, amc } = req.query;

  const where = { ...scope };
  if (status) where.status = status;
  if (provider) where.assigned_provider = provider;
  if (amc === 'true') where.under_amc = true;
  if (q && String(q).trim().length) {
    const like = { [Op.like]: `%${String(q).trim()}%` };
    where[Op.or] = [{ code: like }, { name: like }, { client_name: like }, { site_address: like }, { assigned_provider: like }];
  }

  const projects = await M.WtProject.findAll({ where, order: [['id', 'DESC']], raw: true });
  const codes = projects.map((p) => p.code);

  // One query each for the rollups rather than N per project.
  const [invoices, workOrders, disbursements] = codes.length ? await Promise.all([
    M.WtInvoice.findAll({ where: { ...scope, project_id: { [Op.in]: codes } }, raw: true }),
    M.WtWorkOrder.findAll({ where: { ...scope, project_id: { [Op.in]: codes } }, raw: true }),
    M.WtProjectDisbursement.findAll({ where: { ...scope, project_code: { [Op.in]: codes } }, raw: true }),
  ]) : [[], [], []];

  const byProject = (rows, key) => rows.reduce((acc, r) => {
    const k = r[key]; if (!k) return acc; (acc[k] = acc[k] || []).push(r); return acc;
  }, {});
  const inv = byProject(invoices, 'project_id');
  const wo = byProject(workOrders, 'project_id');
  const db = byProject(disbursements, 'project_code');

  let rows = projects.map((p) => {
    const stageLabel = svc.normaliseStage(p.stage);
    const f = svc.computeFinancials(p, inv[p.code] || [], wo[p.code] || [], db[p.code] || []);
    const due = daysTo(p.target_completion);
    const open = !eq(p.status, 'completed') && !eq(p.status, 'cancelled');
    return {
      ...p,
      stage: stageLabel,
      stage_index: svc.stageIndex(stageLabel),
      progress_pct: p.progress_pct != null ? p.progress_pct : svc.stageMeta(stageLabel).pct,
      work_order_count: (wo[p.code] || []).length,
      days_to_target: due,
      overdue: open && due != null && due < 0,
      at_risk: open && due != null && due >= 0 && due <= 3,
      financials: f,
    };
  });
  if (stage) rows = rows.filter((r) => eq(r.stage, stage));

  res.json(rows);
});

exports.overview = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const [projects, invoices, workOrders, disbursements] = await Promise.all([
    M.WtProject.findAll({ where: scope, raw: true }),
    M.WtInvoice.findAll({ where: scope, raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
    M.WtProjectDisbursement.findAll({ where: scope, raw: true }),
  ]);

  const codes = new Set(projects.map((p) => p.code));
  const scoped = (rows, key) => rows.filter((r) => codes.has(r[key]));
  const projInv = scoped(invoices, 'project_id');
  const projWo = scoped(workOrders, 'project_id');
  const projDb = scoped(disbursements, 'project_code');

  const open = projects.filter((p) => !eq(p.status, 'completed') && !eq(p.status, 'cancelled'));
  const completed = projects.filter((p) => eq(p.status, 'completed'));
  const overdue = open.filter((p) => { const d = daysTo(p.target_completion); return d != null && d < 0; });
  const onTime = completed.filter((p) => !p.target_completion || !p.actual_completion
    || new Date(p.actual_completion) <= new Date(p.target_completion));

  const totals = svc.computeFinancials(
    { contract_value: projects.reduce((s, p) => s + num(p.contract_value), 0) },
    projInv, projWo, projDb,
  );

  const stageCounts = svc.STAGE_LABELS.map((label) => ({
    stage: label,
    count: projects.filter((p) => eq(svc.normaliseStage(p.stage), label)).length,
  }));

  res.json({
    total: projects.length,
    active: open.length,
    completed: completed.length,
    overdue: overdue.length,
    at_risk: open.filter((p) => { const d = daysTo(p.target_completion); return d != null && d >= 0 && d <= 3; }).length,
    under_amc: projects.filter((p) => p.under_amc).length,
    on_time_pct: completed.length ? Math.round((onTime.length / completed.length) * 100) : null,
    avg_progress: open.length
      ? Math.round(open.reduce((s, p) => s + (p.progress_pct != null ? p.progress_pct : svc.stageMeta(p.stage).pct), 0) / open.length)
      : 0,
    financials: totals,
    stage_counts: stageCounts,
  });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Create / read / update
 * ──────────────────────────────────────────────────────────────────────────── */
exports.create = asyncHandler(async (req, res) => {
  const out = await svc.createProject(req.body || {}, ctxOf(req));
  res.status(201).json({
    project: out.project,
    client: out.client,
    property: out.property,
    created: out.created,
  });
});

exports.detail = asyncHandler(async (req, res) => {
  const dossier = await svc.projectDossier(req.params.code, scoped(req));
  if (!dossier) return res.status(404).json({ error: 'Project not found.' });
  res.json(dossier);
});

exports.update = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;

  /*
   * Two shapes arrive here. The project form posts the SAME payload the entry
   * route produces — with `client` and `property` objects — and that goes through
   * updateProject so editing follows exactly the same client/site rules as
   * creating. Everything else (inline status changes, stage side-effects) posts
   * flat fields and takes the simple whitelisted path.
   */
  if (req.body?.client || req.body?.property) {
    const updated = await svc.updateProject(project, req.body, ctxOf(req));
    return res.json(updated);
  }

  const body = pick(req.body || {}, EDITABLE);

  // Keep the two representations of a provider in step, whichever one was sent.
  if (body.provider_code && !body.assigned_provider) {
    const p = await M.WtProvider.findOne({ where: { ...scoped(req), code: body.provider_code }, raw: true });
    if (p) { body.assigned_provider = p.business_name; body.provider_id = p.id; }
  }
  if (body.under_amc === false) {
    Object.assign(body, { amc_code: null, amc_package: null, amc_frequency: null, amc_visit_no: null, amc_next_visit: null });
  }
  if (body.services !== undefined && body.contract_value === undefined) {
    body.contract_value = asArray(body.services).reduce((s, l) => s + num(l.price) * (Number(l.qty) || 1), 0);
  }

  await project.update(body);
  res.json(project);
});

exports.remove = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  // Detach rather than orphan: the downstream records outlive the project label.
  await Promise.all([
    M.WtServiceRequest.update({ project_id: null }, { where: { ...scoped(req), project_id: project.code } }),
    M.WtSiteAssessment.update({ project_id: null }, { where: { ...scoped(req), project_id: project.code } }),
    M.WtProjectDisbursement.destroy({ where: { ...scoped(req), project_code: project.code } }),
  ]);
  await project.destroy();
  res.json({ ok: true });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Hydration — the project feeding the documents raised from it
 * ──────────────────────────────────────────────────────────────────────────── */

/** Pre-built Customer Service Agreement payload for the agreement wizard. */
exports.agreementDraft = asyncHandler(async (req, res) => {
  const draft = await svc.agreementDraft(req.params.code, scoped(req));
  if (!draft) return res.status(404).json({ error: 'Project not found.' });
  res.json(draft);
});

/** Pre-built quotation payload for the quotation builder. */
exports.quotationDraft = asyncHandler(async (req, res) => {
  const draft = await svc.quotationDraft(req.params.code, scoped(req));
  if (!draft) return res.status(404).json({ error: 'Project not found.' });
  res.json(draft);
});

/**
 * Record the agreement raised from this project so the reference number flows
 * back onto the project file and the chain is traceable both ways.
 */
exports.linkAgreement = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const { envelope_id, envelope_code, status } = req.body || {};
  await project.update({
    agreement_envelope_id: envelope_id || project.agreement_envelope_id,
    agreement_code: envelope_code || project.agreement_code,
    agreement_status: status || 'Sent',
    timeline: [...asArray(project.timeline), {
      title: 'Customer Service Agreement raised',
      detail: `${envelope_code || 'Agreement'} sent for signature (Sec. 7 Step 6)`,
      at: new Date().toISOString(), by: actorOf(req),
    }],
  });
  res.json(project);
});

/* ────────────────────────────────────────────────────────────────────────────
 * Stage movement (SOP §4)
 * ──────────────────────────────────────────────────────────────────────────── */
exports.setStage = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const stage = svc.normaliseStage(req.body?.stage);
  const scope = scoped(req);

  const [assessments, quotations] = await Promise.all([
    M.WtSiteAssessment.findAll({ where: { ...scope, project_id: project.code }, raw: true }),
    M.WtQuotation.findAll({ where: { ...scope, project_id: project.code }, raw: true }),
  ]);
  const warning = svc.stageWarning(stage, { project: project.toJSON(), related: { assessments, quotations } });

  // Advisory, not blocking — ops must be able to record what actually happened.
  // `acknowledge` lets the UI confirm once the operator has seen the warning.
  if (warning && !req.body?.acknowledge) {
    return res.status(409).json({ error: warning, warning, stage, requires_acknowledgement: true });
  }

  await svc.advanceStage(project, stage, ctxOf(req));
  res.json({ project, warning: warning || null });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Closure (SOP §12)
 * ──────────────────────────────────────────────────────────────────────────── */
exports.closure = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const actor = actorOf(req);
  const incoming = asArray(req.body?.checklist);

  const merged = svc.mergeChecklist(project.closure_checklist).map((c) => {
    const hit = incoming.find((i) => i.key === c.key);
    if (!hit) return c;
    const done = !!hit.done;
    return { ...c, done, at: done ? (c.at || new Date().toISOString()) : null, by: done ? (c.by || actor) : null };
  });

  const patch = { closure_checklist: merged };
  if (req.body?.satisfaction_score != null) patch.satisfaction_score = Number(req.body.satisfaction_score) || null;
  if (req.body?.handover_at) patch.handover_at = req.body.handover_at;

  // Closing the file is deliberate — every item must be ticked first.
  if (req.body?.close) {
    const outstanding = merged.filter((c) => !c.done);
    if (outstanding.length) {
      return res.status(409).json({
        error: `${outstanding.length} closure item${outstanding.length === 1 ? '' : 's'} still outstanding.`,
        outstanding: outstanding.map((c) => c.label),
      });
    }
    Object.assign(patch, {
      status: 'Completed', closed_at: new Date(), stage: 'Completion',
      progress_pct: 100,
      actual_completion: project.actual_completion || today(),
      timeline: [...asArray(project.timeline), {
        title: 'Project closed', detail: 'Closure checklist complete (Sec. 12)',
        at: new Date().toISOString(), by: actor,
      }],
    });
  }
  if (req.body?.archive) {
    patch.archived_at = new Date();
    patch.timeline = [...asArray(patch.timeline || project.timeline), {
      title: 'Project archived', detail: 'File archived (Sec. 12)', at: new Date().toISOString(), by: actor,
    }];
  }

  await project.update(patch);
  res.json({ project, checklist: merged });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Disbursements — money out of the door on this project
 * ──────────────────────────────────────────────────────────────────────────── */
exports.listDisbursements = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const scope = scoped(req);
  const [rows, workOrders] = await Promise.all([
    M.WtProjectDisbursement.findAll({ where: { ...scope, project_code: project.code }, order: [['id', 'DESC']], raw: true }),
    M.WtWorkOrder.findAll({ where: { ...scope, project_id: project.code }, raw: true }),
  ]);
  res.json(svc.buildDisbursementLedger(rows, workOrders));
});

exports.addDisbursement = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const branchId = resolveBranchId(req);
  const b = req.body || {};

  if (!num(b.amount)) return res.status(400).json({ error: 'An amount is required.' });
  if (!b.payee) return res.status(400).json({ error: 'A payee is required.' });

  const row = await M.WtProjectDisbursement.create({
    branch_id: branchId,
    code: await svc.nextSeqCode(M.WtProjectDisbursement, 'DSB-', branchId, { start: 1 }),
    project_code: project.code,
    category: b.category || 'Other',
    payee: b.payee,
    payee_type: b.payee_type || 'Supplier',
    work_order_code: b.work_order_code || null,
    description: b.description || null,
    amount: num(b.amount),
    status: b.status || 'Requested',
    incurred_on: b.incurred_on || today(),
    paid_on: eq(b.status, 'paid') ? (b.paid_on || today()) : (b.paid_on || null),
    method: b.method || null,
    reference: b.reference || null,
    billable_to_client: !!b.billable_to_client,
    requested_by: actorOf(req),
    notes: b.notes || null,
  });

  await project.update({
    timeline: [...asArray(project.timeline), {
      title: `Disbursement ${row.code} logged`,
      detail: `${row.category} — ${row.payee} — ${num(row.amount).toLocaleString('en-BD')}`,
      at: new Date().toISOString(), by: actorOf(req),
    }],
  });

  res.status(201).json(row);
});

exports.updateDisbursement = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const row = await M.WtProjectDisbursement.findOne({
    where: { ...scoped(req), id: req.params.id, project_code: project.code },
  });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });

  const body = pick(req.body || {}, [
    'category', 'payee', 'payee_type', 'work_order_code', 'description', 'amount',
    'status', 'incurred_on', 'paid_on', 'method', 'reference', 'receipt_url',
    'billable_to_client', 'notes',
  ]);
  // Approving and paying stamp themselves so the audit trail is not hand-typed.
  if (body.status && eq(body.status, 'approved') && !row.approved_at) {
    body.approved_by = actorOf(req); body.approved_at = new Date();
  }
  if (body.status && eq(body.status, 'paid') && !body.paid_on && !row.paid_on) body.paid_on = today();

  await row.update(body);
  res.json(row);
});

exports.removeDisbursement = asyncHandler(async (req, res) => {
  const project = await loadProject(req, res); if (!project) return;
  const row = await M.WtProjectDisbursement.findOne({
    where: { ...scoped(req), id: req.params.id, project_code: project.code },
  });
  if (!row) return res.status(404).json({ error: 'Disbursement not found.' });
  await row.destroy();
  res.json({ ok: true });
});
