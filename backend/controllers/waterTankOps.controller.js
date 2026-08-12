/**
 * waterTankOps.controller.js — Water Tank Services operations pipeline.
 * Generic list/detail/create/update per entity + a dashboard aggregate.
 * Entity slugs map to the Figma screens (clients, service-requests, site-assessments,
 * quotations, work-orders, projects, providers, amc, invoices, complaints, comms).
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const identity = require('../services/wtIdentity.service');

const ENTITIES = {
  'clients': { model: M.WtClient, prefix: 'WTCM-C', pad: 4, start: 1, search: ['name', 'mobile', 'email', 'district', 'property_type'] },
  'service-requests': { model: M.WtServiceRequest, prefix: 'SR-', pad: 4, start: 1095, search: ['client_name', 'category', 'specific_service'] },
  'site-assessments': { model: M.WtSiteAssessment, prefix: 'SA-', pad: 4, start: 402, search: ['client_name', 'provider', 'contamination'] },
  'quotations': { model: M.WtQuotation, prefix: 'Q-', pad: 4, start: 1049, search: ['client_name', 'project_id'] },
  'work-orders': { model: M.WtWorkOrder, prefix: 'WO-', pad: 4, start: 482, search: ['client_name', 'provider_name', 'project_id', 'category'] },
  'projects': { model: M.WtProject, prefix: 'WTCM-P', pad: 4, start: 1, search: ['name', 'client_name', 'assigned_provider'] },
  'providers': { model: M.WtProvider, prefix: 'SP-', pad: 4, start: 12, search: ['business_name', 'contact_person', 'coverage'] },
  'amc': { model: M.WtAmcContract, prefix: 'AMC-', pad: 4, start: 1, search: ['client_name', 'package'] },
  'invoices': { model: M.WtInvoice, prefix: 'INV-', pad: 4, start: 482, search: ['client_name', 'project_id', 'inv_type'] },
  'complaints': { model: M.WtComplaint, prefix: 'COMP-', pad: 3, start: 11, search: ['client_name', 'incident_type'] },
  'warranties': { model: M.WtWarranty, prefix: 'WTY-', pad: 4, start: 1, search: ['client_name', 'warranty_type', 'work_order_code', 'provider_name'] },
  'incidents': { model: M.WtIncident, prefix: 'INC-', pad: 4, start: 1, search: ['client_name', 'incident_type', 'location', 'provider_name'] },
  'comms': { model: M.WtCommLog, prefix: null, search: ['client_name', 'summary', 'ref_code'] },
};

function getEntity(req, res) {
  const e = ENTITIES[req.params.entity];
  if (!e) { res.status(404).json({ error: `Unknown entity "${req.params.entity}"` }); return null; }
  return e;
}

async function nextCode(e, branchId) {
  if (!e.prefix) return null;
  const rows = await e.model.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true });
  let max = e.start - 1;
  for (const r of rows) {
    const n = parseInt(String(r.code || '').replace(e.prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return e.prefix + String(max + 1).padStart(e.pad, '0');
}

exports.list = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.q && e.search?.length) where[Op.or] = e.search.map((c) => ({ [c]: { [Op.like]: `%${req.query.q}%` } }));
  const rows = await e.model.findAll({ where, order: [['id', 'DESC']], limit: Math.min(Number(req.query.limit) || 300, 500) });
  res.json(rows);
});

exports.detail = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  // allow lookup by numeric id or by code
  const key = req.params.id;
  const where = { ...branchScope(req), [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] };
  const row = await e.model.findOne({ where });
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

exports.create = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  const branchId = resolveBranchId(req);
  let body = { ...req.body, branch_id: branchId };
  delete body.id; delete body.createdAt; delete body.updatedAt;
  if (e.prefix && !body.code) body.code = await nextCode(e, branchId);
  // Client ID / Project ID are never left blank — the client and project are
  // created here if this is the first record that names them.
  body = await identity.attachIdentifiers(req.params.entity, body, branchId);
  const row = await e.model.create(body);
  res.status(201).json(row);
});

exports.update = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  const row = await e.model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Not found' });
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.code; delete body.createdAt; delete body.updatedAt;

  const wasCompleted = String(row.status || '').toLowerCase() === 'completed';
  // an edit is also a chance to fill in identifiers the record never had
  const merged = await identity.attachIdentifiers(
    req.params.entity,
    { ...row.get({ plain: true }), ...body },
    resolveBranchId(req),
  );
  const link = identity.LINKS[req.params.entity];
  if (link) {
    if (link.client && !row[link.client] && merged[link.client]) body[link.client] = merged[link.client];
    if (link.project && !row[link.project] && merged[link.project]) body[link.project] = merged[link.project];
  }
  await row.update(body);

  // SOP-02 Sec. 9 Step 12 + Sec. 12: completing a work order registers the warranty and
  // starts the 24-month protected-client clock on that provider.
  if (req.params.entity === 'work-orders' && !wasCompleted && String(row.status || '').toLowerCase() === 'completed') {
    await onWorkOrderCompleted(req, row);
  }

  res.json(row);
});

/**
 * Completion side-effects for a work order, per SSPC-WTCM-SOP-02:
 *   Sec. 9 Step 12 — register the warranty (period recorded, CRM updated)
 *   Sec. 12        — start the 24-month non-circumvention protection on the client
 * Both are idempotent: re-completing a job will not duplicate either record.
 */
async function onWorkOrderCompleted(req, wo) {
  const branchId = resolveBranchId(req);
  const scope = branchScope(req);
  const P = require('../models/waterTankProviders');
  const addMonths = (n) => { const x = new Date(); x.setMonth(x.getMonth() + n); return x.toISOString().slice(0, 10); };

  // Sec. 9 Step 12 — warranty registration
  const existingWarranty = await M.WtWarranty.findOne({ where: { ...scope, work_order_code: wo.code } });
  if (!existingWarranty) {
    await M.WtWarranty.create({
      branch_id: branchId,
      code: await nextCode(ENTITIES.warranties, branchId),
      client_name: wo.client_name,
      project_id: wo.project_id,
      work_order_code: wo.code,
      provider_name: wo.provider_name,
      warranty_type: wo.category || 'Water Tank Service',
      coverage: wo.warranty || wo.scope || null,
      start_date: today(),
      expiry_date: addMonths(12),
      status: 'Active',
    });
  }

  // Sec. 12 — protected client register
  if (wo.provider_name) {
    const provider = await M.WtProvider.findOne({ where: { ...scope, business_name: wo.provider_name } });
    const already = await P.WtProtectedClient.findOne({
      where: { ...scope, client_name: wo.client_name, provider_name: wo.provider_name, status: 'Protected' },
    });
    if (!already) {
      await P.WtProtectedClient.create({
        branch_id: branchId,
        code: await nextCode({ model: P.WtProtectedClient, prefix: 'PC-', pad: 4, start: 1 }, branchId),
        client_name: wo.client_name,
        provider_id: provider?.id || null,
        provider_name: wo.provider_name,
        project_id: wo.project_id,
        work_order_code: wo.code,
        trigger_event: 'Project Completion',
        protection_start: today(),
        protection_end: addMonths(24),
        status: 'Protected',
      });
    }
  }
}

// Shared so the work-order controller can trigger the same Sec. 9 Step 12 +
// Sec. 12 side-effects when it completes a job on its own screen.
exports.onWorkOrderCompletedPublic = (req, wo) => onWorkOrderCompleted(req, wo);

exports.remove = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  const row = await e.model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Not found' });
  await row.destroy();
  res.json({ ok: true });
});

const num = (v) => Number(v || 0);

/**
 * What is still owed on an invoice. `outstanding` is authoritative when SET,
 * including when it is zero — only a null/blank column means "derive it".
 * Writing `num(outstanding) || (amount - paid)` treats a settled invoice's
 * legitimate zero as unknown and reports the whole amount as still due.
 */
const outstandingOf = (i) => (i.outstanding != null && i.outstanding !== ''
  ? num(i.outstanding)
  : num(i.amount) - num(i.paid_amount));
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

/* ─────────────────────────────────────────────────────────────
   PIPELINE — the water-tank service operation, end to end.
   Request → Assessment → Quotation → Work Order → Invoice.
   Each hop creates the downstream record, keeps the project file
   in step, and writes an audit line to the communication log so
   the whole journey is reconstructable from any record.
   ───────────────────────────────────────────────────────────── */
const PIPELINE = {
  'service-requests': {
    to: 'site-assessments',
    label: 'Schedule Assessment',
    stage: 'Assessment',
    source: { status: 'Assessment Scheduled' },
    build: (s, x) => ({
      client_name: s.client_name,
      provider: x.provider || s.provider_name || null,
      assessed_date: x.assessed_date || s.preferred_date || addDays(2),
      status: 'Scheduled',
      findings: s.description || null,
      checklist: {}, photos: [], photos_count: 0,
    }),
  },
  'site-assessments': {
    to: 'quotations',
    label: 'Build Quotation',
    stage: 'Quotation',
    source: { status: 'Completed' },
    build: (s, x) => {
      const service = num(x.service_charges);
      const alloc = num(x.provider_allocation_fee);
      const vat = Math.round((service + alloc) * 0.05);
      return {
        client_name: s.client_name,
        lines: x.lines || [],
        service_charges: service, provider_allocation_fee: alloc, vat,
        total: service + alloc + vat,
        validity: x.validity || '15 Days',
        decision: 'Pending',
      };
    },
  },
  'quotations': {
    to: 'work-orders',
    label: 'Issue Work Order',
    stage: 'Agreement',
    source: { decision: 'Approved' },
    build: (s, x) => ({
      client_name: s.client_name,
      provider_name: x.provider_name || null,
      category: x.category || null,
      target_date: x.target_date || addDays(7),
      status: 'Issued',
      provider_fee: num(x.provider_fee ?? s.service_charges),
      ss_fee: num(s.provider_allocation_fee),
      total_contract: num(s.total),
      scope: x.scope || null,
      special_conditions: x.special_conditions || null,
      warranty: x.warranty || null,
    }),
  },
  'work-orders': {
    to: 'invoices',
    label: 'Raise Invoice',
    stage: 'Completion',
    source: { status: 'Completed' },
    build: (s, x) => {
      const amount = num(x.amount ?? s.total_contract);
      return {
        client_name: s.client_name,
        inv_type: x.inv_type || 'Final Settlement',
        amount, outstanding: amount,
        due_date: x.due_date || addDays(15),
        status: 'Sent',
        provider_payout: 'Not Due',
      };
    },
  },
};

exports.pipeline = (req, res) => res.json(
  Object.entries(PIPELINE).map(([from, p]) => ({ from, to: p.to, label: p.label, stage: p.stage }))
);

/* ─────────────────────────────────────────────────────────────
   SITE ASSESSMENT reference data — Sec. 8 Step 8.
   Checklist templates per tank type, so an assessor starts from
   the right pre-list instead of a blank form. Assessors can add
   their own items on top; those live in custom_checks.
   ───────────────────────────────────────────────────────────── */
const STANDARD_CHECKS = [
  { key: 'tank_access_safe', label: 'Tank access safe (secure ladder, clear hatch)', group: 'Access & Safety' },
  { key: 'confined_space', label: 'Confined space risk verified (air / gas clearance)', group: 'Access & Safety' },
  { key: 'isolation_possible', label: 'Supply can be isolated during works', group: 'Access & Safety' },
  { key: 'ppe_available', label: 'PPE and confined-space equipment on site', group: 'Access & Safety' },
  { key: 'contamination_indicators', label: 'Contamination indicators verified (algae, sludge)', group: 'Condition' },
  { key: 'leakage_detected', label: 'Leakage detected (joints, pipes)', group: 'Condition' },
  { key: 'structural_approved', label: 'Structural condition approved', group: 'Condition' },
  { key: 'overflow_secure', label: 'Overflow screen secure & sealed', group: 'Condition' },
  { key: 'pump_functional', label: 'Pump system functional test pass', group: 'Systems' },
];

const CHECK_TEMPLATES = {
  standard: { label: 'Standard (all tanks)', extra: [] },
  overhead: {
    label: 'Overhead / rooftop tank',
    extra: [
      { key: 'roof_access_guard', label: 'Roof edge protection / guardrail in place', group: 'Access & Safety' },
      { key: 'lid_lockable', label: 'Tank lid lockable and vermin-proof', group: 'Condition' },
      { key: 'support_structure', label: 'Support structure / platform sound', group: 'Condition' },
    ],
  },
  underground: {
    label: 'Underground tank',
    extra: [
      { key: 'gas_test_done', label: 'Atmospheric gas test completed before entry', group: 'Access & Safety' },
      { key: 'ventilation_forced', label: 'Forced ventilation available', group: 'Access & Safety' },
      { key: 'standby_person', label: 'Standby person / rescue plan in place', group: 'Access & Safety' },
      { key: 'ingress_check', label: 'Groundwater ingress checked', group: 'Condition' },
    ],
  },
  commercial: {
    label: 'Commercial / industrial',
    extra: [
      { key: 'permit_to_work', label: 'Permit to work issued by site management', group: 'Access & Safety' },
      { key: 'shutdown_window', label: 'Shutdown window agreed with the client', group: 'Access & Safety' },
      { key: 'backup_supply', label: 'Backup supply available during works', group: 'Systems' },
      { key: 'booster_pump', label: 'Booster pump / pressure system inspected', group: 'Systems' },
    ],
  },
  repair: {
    label: 'Repair / waterproofing',
    extra: [
      { key: 'crack_mapped', label: 'Cracks mapped and measured', group: 'Condition' },
      { key: 'substrate_dry', label: 'Substrate can be dried for treatment', group: 'Condition' },
      { key: 'cure_time_agreed', label: 'Cure / downtime agreed with the client', group: 'Systems' },
    ],
  },
};

const EQUIPMENT_OPTIONS = [
  'Vacuum unit', 'Pressure washer', 'Submersible pump', 'Confined-space harness',
  'Gas detector', 'Forced-air blower', 'Ladder / scaffold', 'Water testing kit',
  'Disinfection dosing kit', 'Generator', 'Lighting rig', 'PPE set',
];
const COMMENT_CATEGORIES = ['Note', 'Observation', 'Risk', 'Client Request', 'Follow-up'];

exports.assessmentReference = (req, res) => res.json({
  standard_checks: STANDARD_CHECKS,
  templates: Object.entries(CHECK_TEMPLATES).map(([key, t]) => ({ key, label: t.label, extra: t.extra })),
  equipment_options: EQUIPMENT_OPTIONS,
  comment_categories: COMMENT_CATEGORIES,
  risk_levels: ['Low', 'Medium', 'High', 'Critical'],
  tank_types: ['Overhead', 'Underground', 'Rooftop', 'Ground Level', 'Sectional', 'Pressure Vessel'],
  materials: ['Concrete', 'PVC / Plastic', 'Stainless Steel', 'Mild Steel', 'Fibreglass (GRP)', 'Brick / Masonry'],
  water_sources: ['WASA Supply', 'Deep Tube Well', 'Shallow Tube Well', 'Surface Water', 'Rainwater Harvesting', 'Tanker Delivery'],
  recommended_services: [
    'Tank Cleaning', 'Disinfection', 'Sterilisation', 'Bacteria & Algae Treatment',
    'Leak Detection', 'Crack Repair', 'Waterproofing', 'Valve Replacement',
    'Pipe Connection Repair', 'Pump Maintenance', 'Water Quality Testing', 'AMC Enrolment',
  ],
});

/* ── running commentary on any record ── */

// which entities accept comments, and how to resolve the record they hang off
const COMMENTABLE = {
  'site-assessments': M.WtSiteAssessment,
  quotations: M.WtQuotation,
  'work-orders': M.WtWorkOrder,
  invoices: M.WtInvoice,
  complaints: M.WtComplaint,
};

exports.listComments = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  if (!COMMENTABLE[entityType]) return res.status(404).json({ error: `"${entityType}" does not take comments.` });
  const rows = await M.WtRecordComment.findAll({
    where: { ...branchScope(req), entity_type: entityType, entity_id: id },
    order: [['pinned', 'DESC'], ['id', 'DESC']],
  });
  res.json(rows);
});

exports.addComment = asyncHandler(async (req, res) => {
  const { entityType, id } = req.params;
  const model = COMMENTABLE[entityType];
  if (!model) return res.status(404).json({ error: `"${entityType}" does not take comments.` });
  if (!req.body.body || !String(req.body.body).trim()) return res.status(400).json({ error: 'Write something first.' });

  const record = await model.findOne({ where: { id, ...branchScope(req) } });
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const row = await M.WtRecordComment.create({
    branch_id: resolveBranchId(req),
    entity_type: entityType,
    entity_id: record.id,
    entity_code: record.code,
    body: String(req.body.body).trim(),
    category: req.body.category || 'Note',
    attachment_url: req.body.attachment_url || null,
    pinned: !!req.body.pinned,
    author: req.user?.name || req.user?.email || 'Operations',
  });
  res.status(201).json(row);
});

exports.updateComment = asyncHandler(async (req, res) => {
  const row = await M.WtRecordComment.findOne({ where: { id: req.params.commentId, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Comment not found' });
  const body = { ...req.body };
  delete body.id; delete body.branch_id; delete body.entity_type; delete body.entity_id;
  await row.update(body);
  res.json(row);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const row = await M.WtRecordComment.findOne({ where: { id: req.params.commentId, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Comment not found' });
  await row.destroy();
  res.json({ ok: true });
});

/* Resolve (or open) the project file a record belongs to. */
async function resolveProject(src, branchId, stage) {
  let project = null;
  if (src.project_id) project = await M.WtProject.findOne({ where: { branch_id: branchId, code: src.project_id } });
  if (!project) project = await M.WtProject.findOne({ where: { branch_id: branchId, client_name: src.client_name, status: 'Open' } });
  if (!project) {
    const code = await nextCode(ENTITIES.projects, branchId);
    project = await M.WtProject.create({
      branch_id: branchId, code,
      name: `${src.client_name} — Water Tank Service`,
      client_name: src.client_name,
      assigned_provider: src.provider_name || src.provider || null,
      start_date: today(), stage, status: 'Open',
      timeline: [], linked: {}, milestones: [],
    });
  }
  return project;
}

const STAGE_ORDER = ['Lead', 'Assessment', 'Quotation', 'Agreement', 'Delivery', 'Inspection', 'Completion'];
const asArray = (v) => (Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } })() : []));
const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return p && typeof p === 'object' ? p : {}; } catch { return {}; } })() : {}));

/**
 * POST /wt-ops/:entity/:id/advance
 * Move a record to the next stage of the service operation.
 * Body: any field overrides for the record being created.
 */
exports.advance = asyncHandler(async (req, res) => {
  const e = getEntity(req, res); if (!e) return;
  const step = PIPELINE[req.params.entity];
  if (!step) return res.status(400).json({ error: `"${req.params.entity}" has no next stage.` });

  const branchId = resolveBranchId(req);
  const src = await e.model.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!src) return res.status(404).json({ error: 'Not found' });

  const target = ENTITIES[step.to];
  const project = await resolveProject(src, branchId, step.stage);

  const created = await target.model.create({
    ...step.build(src.toJSON(), req.body || {}),
    branch_id: branchId,
    project_id: project.code,
    code: await nextCode(target, branchId),
  });

  // keep the source record and its project file in step
  await src.update({ ...step.source, ...(src.project_id ? {} : { project_id: project.code }) });

  const timeline = asArray(project.timeline);
  timeline.push({
    title: step.label,
    detail: `${src.code} → ${created.code}`,
    at: new Date().toISOString(),
    by: req.user?.name || req.user?.email || 'Operations',
  });
  const linked = asObject(project.linked);
  linked[step.to] = { code: created.code, title: step.label, status: created.status || created.decision || 'Open' };
  const nextStage = STAGE_ORDER.indexOf(step.stage) > STAGE_ORDER.indexOf(project.stage) ? step.stage : project.stage;
  await project.update({ timeline, linked, stage: nextStage });

  await M.WtCommLog.create({
    branch_id: branchId, client_name: src.client_name, channel: 'note', direction: 'outbound',
    summary: `${step.label}: ${src.code} advanced to ${created.code}`,
    ref_type: step.to, ref_code: created.code, logged_at: new Date(),
  });

  res.status(201).json({ created, project: { code: project.code, stage: nextStage }, source: src });
});

/* ─────────────────────────────────────────────────────────────
   MONEY — both sides of a water-tank job.
   Client pays Seventh Sky (wt_invoices); Seventh Sky pays the
   third-party provider its charge (wt_work_orders payout fields).
   Seventh Sky's margin is what's left.
   ───────────────────────────────────────────────────────────── */
exports.payments = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [invoices, workOrders, agreements] = await Promise.all([
    M.WtInvoice.findAll({ where: scope, order: [['id', 'DESC']], raw: true }),
    M.WtWorkOrder.findAll({ where: scope, order: [['id', 'DESC']], raw: true }),
    P.WtProviderAgreement.findAll({ where: scope, raw: true }),
  ]);
  const eq = (v, s) => String(v || '').toLowerCase() === s;

  const receivable = invoices
    .map((i) => ({ ...i, due: Math.max(0, outstandingOf(i)) }))
    .filter((i) => i.due > 0.01 && !eq(i.status, 'cancelled') && !eq(i.status, 'draft'));

  const agreementById = Object.fromEntries(agreements.map((agreement) => [agreement.id, agreement]));
  const payoutState = (workOrder) => {
    const agreement = agreementById[workOrder.provider_agreement_id];
    if (!agreement) return { eligible: false, blocked_reason: 'No signed provider agreement snapshot' };
    const projectInvoices = invoices.filter((invoice) => workOrder.project_id && invoice.project_id === workOrder.project_id);
    const clientPaid = projectInvoices.length > 0 && projectInvoices.every((invoice) => eq(invoice.status, 'paid') || num(invoice.paid_amount) >= num(invoice.amount));
    let triggerAt = null;
    let blockedReason = null;
    if (agreement.payout_trigger === 'Client Payment Received') {
      if (clientPaid) triggerAt = projectInvoices.map((invoice) => invoice.updatedAt || invoice.updated_at || invoice.createdAt || invoice.created_at).filter(Boolean).sort().pop() || new Date();
      else blockedReason = 'Waiting for client payment';
    } else if (agreement.payout_trigger === 'Approved Milestone') {
      if (workOrder.verified_at) triggerAt = workOrder.verified_at;
      else blockedReason = 'Waiting for an approved completion milestone';
    } else if (workOrder.verified_at) triggerAt = workOrder.verified_at;
    else blockedReason = 'Waiting for completion verification';
    const dueAt = triggerAt ? new Date(new Date(triggerAt).getTime() + num(agreement.payment_due_days) * 864e5).toISOString().slice(0, 10) : null;
    return { eligible: !!triggerAt, blocked_reason: blockedReason, payout_trigger: agreement.payout_trigger, payment_due_days: num(agreement.payment_due_days), due_at: dueAt, agreement_code: agreement.code };
  };

  // Payout eligibility follows the signed agreement's structured trigger.
  const payable = workOrders
    .map((w) => ({ ...w, remaining: Math.max(0, num(w.provider_fee) - num(w.provider_paid_amount)), ...payoutState(w) }))
    .filter((w) => w.provider_name && w.remaining > 0.01 && w.eligible);
  const payoutBlocked = workOrders
    .map((w) => ({ ...w, remaining: Math.max(0, num(w.provider_fee) - num(w.provider_paid_amount)), ...payoutState(w) }))
    .filter((w) => w.provider_name && w.remaining > 0.01 && !w.eligible);

  const settled = workOrders.filter((w) => num(w.provider_paid_amount) > 0);

  const collected = invoices.reduce((s, i) => s + (num(i.paid_amount) || (eq(i.status, 'paid') ? num(i.amount) : 0)), 0);
  const disbursed = workOrders.reduce((s, w) => s + num(w.provider_paid_amount), 0);

  res.json({
    totals: {
      receivable: receivable.reduce((s, i) => s + i.due, 0),
      receivable_count: receivable.length,
      payable: payable.reduce((s, w) => s + w.remaining, 0),
      payable_count: payable.length,
      collected,
      disbursed,
      margin: collected - disbursed,
      ss_fees: workOrders.reduce((s, w) => s + num(w.ss_fee), 0),
    },
    receivable, payable, payout_blocked: payoutBlocked, settled,
  });
});

/**
 * POST /wt-ops/work-orders/:id/pay-provider — record a full or partial payout.
 */
exports.payProvider = asyncHandler(async (req, res) => {
  const wo = await M.WtWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found' });
  const agreement = wo.provider_agreement_id
    ? await P.WtProviderAgreement.findOne({ where: { id: wo.provider_agreement_id, ...branchScope(req) } })
    : null;
  if (!agreement) return res.status(400).json({ error: 'This payout has no signed provider agreement snapshot.' });
  const projectInvoices = wo.project_id ? await M.WtInvoice.findAll({ where: { ...branchScope(req), project_id: wo.project_id }, raw: true }) : [];
  const clientPaid = projectInvoices.length > 0 && projectInvoices.every((invoice) => String(invoice.status || '').toLowerCase() === 'paid' || num(invoice.paid_amount) >= num(invoice.amount));
  if (agreement.payout_trigger === 'Client Payment Received' && !clientPaid) return res.status(400).json({ error: 'The signed agreement requires client payment before provider payout.' });
  if (agreement.payout_trigger === 'Approved Milestone' && !wo.verified_at) return res.status(400).json({ error: 'The signed agreement requires an approved completion milestone before provider payout.' });
  if (agreement.payout_trigger === 'Completion Verified' && !wo.verified_at) return res.status(400).json({ error: 'Completion must be verified before provider payout.' });

  const fee = num(wo.provider_fee);
  const already = num(wo.provider_paid_amount);
  const remaining = Math.round((fee - already) * 100) / 100;
  const amount = Math.round(num(req.body.amount) * 100) / 100;

  if (!(amount > 0)) return res.status(400).json({ error: 'Enter a payout amount greater than zero.' });
  if (amount > remaining) return res.status(400).json({ error: `Payout exceeds the remaining balance of ${remaining}.` });

  const paid = Math.round((already + amount) * 100) / 100;
  await wo.update({
    provider_paid_amount: paid,
    payout_status: paid >= fee - 0.01 ? 'Cleared' : 'Partially Paid',
    payout_date: today(),
    payout_method: req.body.method || wo.payout_method,
    payout_reference: req.body.reference || wo.payout_reference,
  });

  // mirror onto the project's invoice payout flag so both screens agree
  if (wo.project_id && paid >= fee - 0.01) {
    await M.WtInvoice.update({ provider_payout: 'Cleared' }, { where: { ...branchScope(req), project_id: wo.project_id } });
  }

  await M.WtCommLog.create({
    branch_id: resolveBranchId(req), client_name: wo.client_name, channel: 'note', direction: 'outbound',
    summary: `Provider payout ${amount} to ${wo.provider_name || 'provider'} on ${wo.code}${req.body.reference ? ` (ref ${req.body.reference})` : ''}`,
    ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
  });

  res.json({ workOrder: wo, paid, remaining: Math.round((fee - paid) * 100) / 100 });
});

/**
 * POST /wt-ops/invoices/:id/record-payment — record a client receipt.
 */
exports.recordPayment = asyncHandler(async (req, res) => {
  const inv = await M.WtInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });

  const total = num(inv.amount);
  const already = num(inv.paid_amount);
  // See outstandingOf: a settled invoice has outstanding = 0, and treating that
  // falsy zero as "unknown" would reopen a paid invoice for further payment.
  const due = Math.round(outstandingOf(inv) * 100) / 100;
  const amount = Math.round(num(req.body.amount) * 100) / 100;

  if (!(amount > 0)) return res.status(400).json({ error: 'Enter an amount greater than zero.' });
  if (amount > due) return res.status(400).json({ error: `Payment exceeds the outstanding balance of ${due}.` });

  const outstanding = Math.round((due - amount) * 100) / 100;
  const ledger = asArray(inv.payments);
  ledger.push({ amount, method: req.body.method || 'bank_transfer', reference: req.body.reference || null, at: new Date().toISOString() });

  await inv.update({
    paid_amount: Math.round((already + amount) * 100) / 100,
    outstanding,
    payments: ledger,
    status: outstanding <= 0.01 ? 'Paid' : (String(inv.status).toLowerCase() === 'draft' ? 'Sent' : inv.status),
    // once the client has paid, the provider payout falls due
    provider_payout: outstanding <= 0.01 && String(inv.provider_payout || '').toLowerCase() !== 'cleared' ? 'Pending' : inv.provider_payout,
  });

  await M.WtCommLog.create({
    branch_id: resolveBranchId(req), client_name: inv.client_name, channel: 'note', direction: 'inbound',
    summary: `Payment ${amount} received against ${inv.code}${req.body.reference ? ` (ref ${req.body.reference})` : ''}`,
    ref_type: 'invoices', ref_code: inv.code, logged_at: new Date(),
  });

  res.json({ invoice: inv, outstanding });
});

/**
 * GET /wt-ops/search?q= — one search box across the whole console.
 */
exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json([]);
  const scope = branchScope(req);
  const LABEL = { clients: 'name', providers: 'business_name', projects: 'name', comms: 'summary' };

  const hits = await Promise.all(Object.entries(ENTITIES).map(async ([slug, e]) => {
    const cols = [...(e.search || [])];
    if (e.prefix) cols.push('code');
    const rows = await e.model.findAll({
      where: { ...scope, [Op.or]: cols.map((c) => ({ [c]: { [Op.like]: `%${q}%` } })) },
      limit: 6, order: [['id', 'DESC']], raw: true,
    });
    return rows.map((r) => ({
      entity: slug, id: r.id, code: r.code || `#${r.id}`,
      title: r[LABEL[slug] || 'client_name'] || r.name || '—',
      subtitle: r.specific_service || r.category || r.package || r.incident_type || r.inv_type || r.specialty || r.property_type || '',
      status: r.status || r.decision || r.current_status || '',
    }));
  }));

  res.json(hits.flat());
});

// Aggregate for the Operations Dashboard.
exports.dashboard = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [sr, amc, inv, providers, projects, quotes, wos, complaints, assessments] = await Promise.all([
    M.WtServiceRequest.findAll({ where: scope, raw: true }),
    M.WtAmcContract.findAll({ where: scope, raw: true }),
    M.WtInvoice.findAll({ where: scope, raw: true }),
    M.WtProvider.findAll({ where: scope, order: [['rank', 'ASC']], raw: true }),
    M.WtProject.findAll({ where: scope, raw: true }),
    M.WtQuotation.findAll({ where: scope, raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
    M.WtComplaint.findAll({ where: scope, raw: true }),
    M.WtSiteAssessment.findAll({ where: scope, raw: true }),
  ]);
  const eq = (v, s) => String(v || '').toLowerCase() === s;
  const amcActive = amc.filter((a) => eq(a.status, 'active'));
  const pendingInv = inv.filter((i) => ['overdue', 'sent'].includes(String(i.status || '').toLowerCase()));

  const funnel = [
    { key: 'lead', label: 'Lead Inbound', count: sr.filter((r) => eq(r.status, 'new')).length },
    { key: 'assessment', label: 'Site Assessment', count: sr.filter((r) => eq(r.status, 'assessment scheduled')).length },
    { key: 'quotation', label: 'Quotation Sent', count: quotes.filter((q) => !eq(q.decision, 'rejected')).length },
    { key: 'agreement', label: 'Agreement Signed', count: wos.filter((w) => !eq(w.status, 'draft')).length },
    { key: 'wo', label: 'WO Dispatched', count: wos.filter((w) => eq(w.status, 'in progress') || eq(w.status, 'issued')).length },
    { key: 'done', label: 'Completed/Disinfected', count: sr.filter((r) => eq(r.status, 'completed')).length + wos.filter((w) => eq(w.status, 'completed')).length },
  ];

  // ── real finance figures (no placeholders) ──
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const paid = inv.filter((i) => eq(i.status, 'paid'));
  const paidThisMonth = paid.filter((i) => new Date(i.updatedAt || i.createdAt) >= monthStart);
  const finance = {
    outstanding: pendingInv.reduce((s, i) => s + num(i.outstanding || i.amount), 0),
    outstanding_count: pendingInv.length,
    paid_this_month: paidThisMonth.reduce((s, i) => s + num(i.amount), 0),
    paid_this_month_count: paidThisMonth.length,
    overdue_count: inv.filter((i) => eq(i.status, 'overdue')).length,
    overdue_amount: inv.filter((i) => eq(i.status, 'overdue')).reduce((s, i) => s + num(i.outstanding || i.amount), 0),
    pending_payout: inv.filter((i) => eq(i.provider_payout, 'pending')).reduce((s, i) => s + num(i.amount), 0),
    pending_payout_count: inv.filter((i) => eq(i.provider_payout, 'pending')).length,
    invoiced_total: inv.reduce((s, i) => s + num(i.amount), 0),
  };

  // ── real complaint/SLA figures ──
  const resolved = complaints.filter((c) => num(c.resolution_hours) > 0);
  const avgResolution = resolved.length ? resolved.reduce((s, c) => s + num(c.resolution_hours), 0) / resolved.length : 0;
  const withinSla = resolved.filter((c) => num(c.resolution_hours) <= 24).length;
  const sla = {
    avg_resolution_hours: Math.round(avgResolution * 10) / 10,
    resolved_count: resolved.length,
    open_count: complaints.filter((c) => eq(c.status, 'open')).length,
    critical_count: complaints.filter((c) => eq(c.severity, 'high') && !['resolved', 'closed'].includes(String(c.status || '').toLowerCase())).length,
    compliance_rate: resolved.length ? Math.round((withinSla / resolved.length) * 1000) / 10 : null,
  };

  // ── real AMC figures ──
  const expired = amc.filter((a) => eq(a.status, 'expired')).length;
  const amcStats = {
    active_annual_value: amcActive.reduce((s, a) => s + num(a.annual_value), 0),
    active_count: amcActive.length,
    renewal_rate: amcActive.length + expired ? Math.round((amcActive.length / (amcActive.length + expired)) * 1000) / 10 : null,
    proposed_count: amc.filter((a) => eq(a.status, 'proposed')).length,
    due_soon: amc.filter((a) => a.end_date && (new Date(a.end_date) - Date.now()) / 864e5 <= 60 && new Date(a.end_date) >= Date.now()).length,
  };

  // ── action centre: what actually needs a human today ──
  const alerts = [
    { key: 'new_leads', label: 'New leads awaiting triage', count: sr.filter((r) => eq(r.status, 'new')).length, to: '/water-tank/service-requests', tone: 'blue' },
    { key: 'assessments_due', label: 'Assessments awaiting site visit', count: assessments.filter((a) => eq(a.status, 'scheduled')).length, to: '/water-tank/site-assessments', tone: 'amber' },
    { key: 'quotes_pending', label: 'Quotations awaiting decision', count: quotes.filter((q) => eq(q.decision, 'pending')).length, to: '/water-tank/quotations', tone: 'amber' },
    { key: 'wo_open', label: 'Work orders in progress', count: wos.filter((w) => eq(w.status, 'in progress') || eq(w.status, 'issued')).length, to: '/water-tank/work-orders', tone: 'cyan' },
    { key: 'invoices_overdue', label: 'Invoices overdue', count: finance.overdue_count, to: '/water-tank/invoices', tone: 'red' },
    { key: 'complaints_open', label: 'Complaints open', count: sla.open_count, to: '/water-tank/complaints', tone: 'red' },
    { key: 'amc_due', label: 'AMC contracts expiring in 60 days', count: amcStats.due_soon, to: '/water-tank/amc', tone: 'amber' },
  ].filter((a) => a.count > 0);

  res.json({
    kpis: {
      active_projects: projects.filter((p) => eq(p.status, 'open')).length || wos.filter((w) => ['in progress', 'issued', 'accepted'].includes(String(w.status || '').toLowerCase())).length,
      active_projects_sub: `${sr.filter((r) => /disinfect/i.test(r.category || r.specific_service || '')).length} in disinfection phase`,
      new_leads: sr.filter((r) => eq(r.status, 'new')).length,
      amc_active: amcActive.length,
      amc_annual_value: amcStats.active_annual_value,
      pending_invoice_amount: finance.outstanding,
      overdue_invoice_count: finance.overdue_count,
    },
    finance, sla, amc: amcStats, alerts,
    funnel,
    recent_requests: [...sr].sort((a, b) => b.id - a.id).slice(0, 6),
    upcoming_amc: amc.filter((a) => a.next_visit && !/none/i.test(a.next_visit)).slice(0, 5),
    top_providers: providers.filter((p) => p.rank).slice(0, 3),
  });
});
