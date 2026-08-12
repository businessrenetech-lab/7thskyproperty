/**
 * wtProject.service.js — the Water Tank project file.
 *
 * SSPC-WTCM-SOP-01 §4 makes the project the spine of the operation: the enquiry,
 * the service request, the site assessment, the quotation, the signed customer
 * agreement, the work order, the invoices, the warranty and the AMC visits all
 * hang off one project ID. This module owns that spine —  creating a project
 * (and the records the SOP says must exist alongside it), assembling the whole
 * dossier for the project dashboard, deriving its financial position, and moving
 * it through the eleven stages.
 *
 * Design note on money: every figure the dashboard shows is DERIVED from the
 * underlying invoices, work orders and disbursements on each read. Nothing is
 * cached on the project row. A stored total is a total that eventually disagrees
 * with the records beneath it — the same discipline wtWorkOrderDoc.service.js
 * applies in computeTotals().
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const customerSvc = require('./wtCustomerAgreement.service');

const num = (v) => Number(v || 0);
const round2 = (v) => Math.round(num(v) * 100) / 100;

/**
 * What is still owed on an invoice.
 *
 * `outstanding` is authoritative WHEN IT IS SET — including when it is zero.
 * The obvious `num(i.outstanding) || (amount - paid)` is wrong: a fully-paid
 * invoice legitimately has outstanding = 0, which is falsy, so it fell through
 * to `amount - paid_amount` and reported the whole invoice as still receivable.
 * A paid invoice showed up as fully outstanding. Only a null/blank column means
 * "not recorded, derive it".
 */
const outstandingOf = (i) => (i.outstanding != null && i.outstanding !== ''
  ? num(i.outstanding)
  : num(i.amount) - num(i.paid_amount));
const today = () => new Date().toISOString().slice(0, 10);
const eq = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
};

/* ────────────────────────────────────────────────────────────────────────────
 * The lifecycle — SOP-01 §4, verbatim.
 * `gate` names the precondition the SOP puts on entering that stage. It is
 * advisory: ops records what actually happened, and the API returns a warning
 * rather than refusing, because a project that has genuinely started must be
 * recordable even if the paperwork lagged.
 * ──────────────────────────────────────────────────────────────────────────── */
const STAGES = [
  { key: 'lead_enquiry', label: 'Lead Enquiry', sop: 'Sec. 5 Step 1', phase: 'Phase 1 — Client Enquiry', pct: 5 },
  { key: 'needs_assessment', label: 'Needs Assessment', sop: 'Sec. 5 Step 2', phase: 'Phase 1 — Client Enquiry', pct: 12 },
  { key: 'site_assessment', label: 'Site Assessment', sop: 'Sec. 6 Step 3–4', phase: 'Phase 2 — Site Assessment', pct: 22, gate: 'assessment' },
  { key: 'quotation', label: 'Quotation', sop: 'Sec. 7 Step 5', phase: 'Phase 3 — Quotation & Agreement', pct: 34, gate: 'quotation' },
  { key: 'agreement_signing', label: 'Agreement Signing', sop: 'Sec. 7 Step 6', phase: 'Phase 3 — Quotation & Agreement', pct: 45 },
  { key: 'deposit_collection', label: 'Deposit Collection', sop: 'Sec. 7', phase: 'Phase 3 — Quotation & Agreement', pct: 54, gate: 'agreement' },
  { key: 'provider_assignment', label: 'Provider Assignment', sop: 'Sec. 8 Step 7', phase: 'Phase 4 — Project Delivery', pct: 64, gate: 'agreement' },
  { key: 'service_delivery', label: 'Service Delivery', sop: 'Sec. 8 Step 8', phase: 'Phase 4 — Project Delivery', pct: 76, gate: 'provider' },
  { key: 'inspection_reporting', label: 'Inspection & Reporting', sop: 'Sec. 9 Step 9', phase: 'Phase 5 — Inspection & Reporting', pct: 88 },
  { key: 'completion', label: 'Completion', sop: 'Sec. 9 Step 10', phase: 'Phase 5 — Inspection & Reporting', pct: 96 },
  { key: 'amc_support', label: 'AMC / Ongoing Support', sop: 'Sec. 10', phase: 'Phase 6 — AMC Management', pct: 100 },
];
const STAGE_LABELS = STAGES.map((s) => s.label);

/* Migration 0065 shipped a seven-label stepper taken from the Figma frame. Those
   labels are folded onto the SOP stages on read so existing rows keep working. */
const LEGACY_STAGE_MAP = {
  lead: 'Lead Enquiry',
  assessment: 'Site Assessment',
  quotation: 'Quotation',
  agreement: 'Agreement Signing',
  delivery: 'Service Delivery',
  inspection: 'Inspection & Reporting',
  completion: 'Completion',
};
const normaliseStage = (stage) => {
  const raw = String(stage || '').trim();
  const exact = STAGE_LABELS.find((l) => eq(l, raw));
  if (exact) return exact;
  return LEGACY_STAGE_MAP[raw.toLowerCase()] || STAGE_LABELS[0];
};
const stageIndex = (stage) => STAGE_LABELS.indexOf(normaliseStage(stage));
const stageMeta = (stage) => STAGES[Math.max(0, stageIndex(stage))];

const PROJECT_TYPES = [
  'Cleaning & Maintenance', 'Tank Sanitisation', 'Repair & Waterproofing',
  'Water Quality & Testing', 'AMC Visit', 'Inspection Only', 'Mixed Scope',
];
const DISBURSEMENT_CATEGORIES = [
  'Provider Payout', 'Materials', 'Transport', 'Lab Testing',
  'Government Fee', 'Equipment Hire', 'Reimbursement', 'Other',
];
/* SOP §12 Project Closure. */
const CLOSURE_CHECKLIST = [
  { key: 'services_completed', label: 'All services completed and verified', sop: 'Sec. 9 Step 9' },
  { key: 'site_cleaned', label: 'Site cleaned and handed back', sop: 'Sec. 9 Step 9' },
  { key: 'reports_issued', label: 'Cleaning / inspection reports issued', sop: 'Sec. 9 Step 10' },
  { key: 'photos_collected', label: 'Before & after photos collected', sop: 'Sec. 9 Step 9' },
  { key: 'water_test', label: 'Water testing results provided (if applicable)', sop: 'Sec. 9 Step 10' },
  { key: 'warranty_issued', label: 'Warranty information issued and recorded', sop: 'Sec. 9 Step 10' },
  { key: 'final_payment', label: 'Final payment confirmed', sop: 'Sec. 12' },
  { key: 'satisfaction_survey', label: 'Client satisfaction survey completed', sop: 'Sec. 12' },
  { key: 'file_archived', label: 'Project file archived', sop: 'Sec. 12' },
];

/* ────────────────────────────────────────────────────────────────────────────
 * Code generation
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Next WTCM-P#### for a branch. Mirrors the generator in
 * waterTankClients.controller.js registerProject() so a project opened from the
 * client file and one opened from the wizard can never collide on a number.
 */
async function nextProjectCode(branchId, transaction) {
  const rows = await M.WtProject.findAll({
    where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction,
  });
  let max = 0;
  rows.forEach((r) => {
    const n = parseInt(String(r.code || '').replace(/^WTCM-P/i, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `WTCM-P${String(max + 1).padStart(4, '0')}`;
}

async function nextSeqCode(model, prefix, branchId, { pad = 4, start = 1, transaction } = {}) {
  const rows = await model.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction });
  let max = start - 1;
  rows.forEach((r) => {
    const n = parseInt(String(r.code || '').replace(prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  });
  return `${prefix}${String(max + 1).padStart(pad, '0')}`;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Create
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Resolve the water-tank client for a payload: an existing one by id/code, an
 * existing one matched on name+mobile (the shared contact directory feeds names
 * in from elsewhere, so a duplicate is easy to create by accident), or a new one.
 */
async function resolveClient(p, { branchId }, transaction) {
  const cIn = p.client || {};
  let client = null;
  if ((cIn.mode === 'existing' || cIn.id || cIn.code) && (cIn.id || cIn.code)) {
    client = await M.WtClient.findOne({
      where: { branch_id: branchId, [Op.or]: [{ id: Number(cIn.id) || -1 }, { code: cIn.code || ' ' }] },
      transaction,
    });
  }
  if (!client) {
    if (!cIn.name) { const e = new Error('A client name is required.'); e.status = 400; throw e; }
    client = await M.WtClient.findOne({
      where: { branch_id: branchId, name: cIn.name, ...(cIn.phone ? { mobile: cIn.phone } : {}) },
      transaction,
    });
  }
  if (!client) {
    client = await M.WtClient.create({
      branch_id: branchId,
      code: await nextSeqCode(M.WtClient, 'WTCM-C', branchId, { transaction }),
      name: cIn.name,
      client_type: cIn.client_type || 'Residential',
      mobile: cIn.phone || null, email: cIn.email || null,
      service_address: cIn.address || p.property?.address || null,
      district: cIn.district || p.property?.district || null,
      property_type: cIn.property_type || p.property?.property_type || null,
      lead_source: p.origin || 'Direct',
      current_status: 'New Lead',
      workflow_stage: 'Lead Enquiry',
      enquiry_date: today(),
      requested_service: p.project_type || null,
      assigned_officer: p.assigned_officer || null,
      tank_type: p.tank_type || null,
      tanks_count: Number(p.tanks_count) || 0,
      tank_capacity: p.tank_capacity || null,
    }, { transaction });
  }
  return client;
}

/**
 * Resolve the site against the SHARED property register — assign an existing
 * property or create one, exactly as Short Term Stay does. Returns null for
 * "address only", where the job has a service address but no property record.
 */
async function resolveProperty(prIn = {}, { branchId, userId }, transaction) {
  if (prIn.mode === 'existing' && prIn.id) {
    const property = await Property.findOne({ where: { id: prIn.id, branch_id: branchId }, transaction });
    if (!property) { const e = new Error('That property could not be found.'); e.status = 404; throw e; }
    return property;
  }
  if (prIn.mode === 'new') {
    if (!prIn.title) { const e = new Error('A property title is required to create one.'); e.status = 400; throw e; }
    return Property.create({
      branch_id: branchId,
      property_code: await generateCode(Property, 'property_code', 'SSPC-PR-'),
      title: prIn.title,
      category: prIn.category || 'residential',
      property_type: prIn.property_type || null,
      // A site registered for a service job is not a listing; keep it off the
      // market until someone deliberately lists it.
      listing_type: prIn.listing_type || 'rent',
      status: 'inactive',
      is_published: false,
      address: prIn.address || null,
      area: prIn.area || null,
      city: prIn.city || null,
      district: prIn.district || null,
      total_floors: prIn.total_floors || null,
      total_units: Number(prIn.total_units) || null,
      created_by: userId || null,
    }, { transaction });
  }
  return null;
}

/**
 * Update a project from the SAME wizard payload the entry route produces, so
 * editing a project is the same journey as creating one rather than a stripped
 * quick-edit form. Unlike create, this raises no downstream records — the
 * service request and assessment already exist — but it will re-link the client
 * and reassign or create the property when those change.
 */
async function updateProject(project, payload, ctx) {
  const { branchId, actor } = ctx;
  const p = payload || {};

  return sequelize.transaction(async (transaction) => {
    const patch = {};
    const changes = [];

    // ── client ──
    if (p.client && (p.client.name || p.client.code || p.client.id)) {
      const client = await resolveClient(p, { branchId }, transaction);
      if (client.code !== project.client_code) changes.push(`client → ${client.name} (${client.code})`);
      Object.assign(patch, {
        client_id: client.id, client_code: client.code, client_name: client.name,
        client_type: p.client.client_type || client.client_type,
        client_phone: p.client.phone ?? client.mobile,
        client_email: p.client.email ?? client.email,
      });
    }

    // ── property ──
    if (p.property && p.property.mode) {
      if (p.property.mode === 'none') {
        if (project.property_id) changes.push('property unassigned');
        Object.assign(patch, { property_id: null, property_code: null, property_title: null });
      } else {
        const property = await resolveProperty(p.property, { branchId, userId: ctx.userId }, transaction);
        if (property && property.id !== project.property_id) {
          changes.push(`site → ${property.property_code} ${property.title}`);
        }
        if (property) {
          Object.assign(patch, {
            property_id: property.id, property_code: property.property_code, property_title: property.title,
          });
        }
      }
      Object.assign(patch, {
        site_address: p.property.address ?? project.site_address,
        area: p.property.area ?? project.area,
        city: p.property.city ?? project.city,
        district: p.property.district ?? project.district,
        property_type: p.property.property_type ?? project.property_type,
      });
    }

    // ── plain fields, whitelisted ──
    const FIELDS = [
      'name', 'status', 'priority', 'health_index', 'notes',
      'site_contact_name', 'site_contact_phone', 'access_notes',
      'project_type', 'service_category', 'scope_summary',
      'tank_type', 'tanks_count', 'tank_capacity', 'water_source',
      'origin', 'enquiry_code', 'request_code', 'assessment_code', 'quotation_code',
      'under_amc', 'amc_code', 'amc_package', 'amc_frequency', 'amc_visit_no', 'amc_next_visit',
      'assigned_officer', 'ops_manager', 'provider_code', 'provider_id',
      'start_date', 'scheduled_date', 'target_completion',
      'provider_cost', 'deposit_required', 'deposit_amount', 'payment_terms',
      'warranty_period',
    ];
    FIELDS.forEach((k) => { if (p[k] !== undefined) patch[k] = p[k]; });

    if (p.provider_name !== undefined) patch.assigned_provider = p.provider_name;
    if (p.services !== undefined) {
      const services = asArray(p.services);
      patch.services = services;
      patch.contract_value = p.contract_value != null
        ? num(p.contract_value)
        : services.reduce((s, l) => s + num(l.price) * (Number(l.qty) || 1), 0);
      if (num(patch.contract_value) !== num(project.contract_value)) {
        changes.push(`contract value → ${num(patch.contract_value).toLocaleString('en-BD')}`);
      }
    }
    if (patch.under_amc === false) {
      Object.assign(patch, { amc_code: null, amc_package: null, amc_frequency: null, amc_visit_no: null, amc_next_visit: null });
    }

    patch.timeline = [...asArray(project.timeline), {
      title: 'Project details updated',
      detail: changes.length ? changes.join(' · ') : 'Edited from the project form',
      at: new Date().toISOString(), by: actor,
    }];

    await project.update(patch, { transaction });
    return project;
  });
}

/**
 * Create a project from the wizard payload, in one transaction:
 *   1. resolve or create the water-tank client
 *   2. resolve or create the property in the shared register
 *   3. create the project
 *   4. raise the service request the SOP requires (§5 Step 1 — a project must
 *      never exist without the request that justified it), and a site assessment
 *      when the operator asked for one
 *
 * payload.client  = { mode: 'existing'|'new', id?, code?, name, phone, email, ... }
 * payload.property = { mode: 'existing'|'new'|'none', id?, title?, address?, ... }
 */
async function createProject(payload, ctx) {
  const { branchId, actor } = ctx;
  const p = payload || {};

  return sequelize.transaction(async (transaction) => {
    // Client and site resolution is shared with updateProject, so editing a
    // project follows exactly the same rules as creating one.
    const client = await resolveClient(p, { branchId }, transaction);
    const property = await resolveProperty(p.property, { branchId, userId: ctx.userId }, transaction);

    // ── 3. the project ───────────────────────────────────────────────────
    const code = await nextProjectCode(branchId, transaction);
    const services = asArray(p.services);
    const contractValue = p.contract_value != null
      ? num(p.contract_value)
      : services.reduce((s, l) => s + num(l.price) * (Number(l.qty) || 1), 0);

    const stage = normaliseStage(p.stage || 'Lead Enquiry');
    const timeline = [{
      title: 'Project opened',
      detail: `${code} created${p.origin && p.origin !== 'Direct' ? ` from ${p.origin}` : ''}`,
      at: new Date().toISOString(), by: actor,
    }];

    const project = await M.WtProject.create({
      branch_id: branchId,
      code,
      name: p.name || `${client.name} — ${p.project_type || 'Water Tank Service'}`,
      status: 'Open',
      stage,
      progress_pct: stageMeta(stage).pct,
      health_index: 'Normal/Clear',

      client_id: client.id, client_code: client.code, client_name: client.name,
      client_type: client.client_type, client_phone: client.mobile, client_email: client.email,

      property_id: property?.id || null,
      property_code: property?.property_code || null,
      property_title: property?.title || null,
      property_type: prIn.property_type || client.property_type || null,
      site_address: prIn.address || property?.address || client.service_address || null,
      area: prIn.area || property?.area || null,
      city: prIn.city || property?.city || null,
      district: prIn.district || property?.district || client.district || null,
      site_contact_name: p.site_contact_name || null,
      site_contact_phone: p.site_contact_phone || null,
      access_notes: p.access_notes || null,

      project_type: p.project_type || 'Cleaning & Maintenance',
      service_category: p.service_category || null,
      services,
      tank_type: p.tank_type || null,
      tanks_count: Number(p.tanks_count) || 0,
      tank_capacity: p.tank_capacity || null,
      water_source: p.water_source || null,
      scope_summary: p.scope_summary || null,
      priority: p.priority || 'Medium',

      origin: p.origin || 'Direct',
      enquiry_code: p.enquiry_code || null,
      assessment_code: p.assessment_code || null,
      quotation_code: p.quotation_code || null,
      needs_assessment: !!p.needs_assessment,
      needs_quotation: !!p.needs_quotation,

      under_amc: !!p.under_amc,
      amc_code: p.under_amc ? (p.amc_code || null) : null,
      amc_package: p.under_amc ? (p.amc_package || null) : null,
      amc_frequency: p.under_amc ? (p.amc_frequency || null) : null,
      amc_visit_no: p.under_amc ? (Number(p.amc_visit_no) || null) : null,
      amc_next_visit: p.under_amc ? (p.amc_next_visit || null) : null,

      provider_code: p.provider_code || null,
      provider_id: Number(p.provider_id) || null,
      assigned_provider: p.provider_name || null,
      assigned_officer: p.assigned_officer || null,
      ops_manager: p.ops_manager || null,
      start_date: p.start_date || today(),
      scheduled_date: p.scheduled_date || null,
      target_completion: p.target_completion || null,

      contract_value: contractValue,
      provider_cost: num(p.provider_cost),
      deposit_required: !!p.deposit_required,
      deposit_amount: num(p.deposit_amount),
      payment_terms: p.payment_terms || null,

      closure_checklist: CLOSURE_CHECKLIST.map((c) => ({ ...c, done: false })),
      milestones: asArray(p.milestones),
      risk_flags: [],
      linked: {},
      timeline,
      notes: p.notes || null,
    }, { transaction });

    const created = { project: project.code };

    // ── 4. the records the SOP says must exist alongside it ──────────────
    // A project created directly still needs its service request: §5 Step 1 puts
    // the request at the head of the chain, and the ops console counts requests.
    let request = null;
    if (p.request_code) {
      request = await M.WtServiceRequest.findOne({ where: { branch_id: branchId, code: p.request_code }, transaction });
      if (request) await request.update({ project_id: project.code }, { transaction });
    }
    if (!request) {
      request = await M.WtServiceRequest.create({
        branch_id: branchId,
        code: await nextSeqCode(M.WtServiceRequest, 'SR-', branchId, { start: 1001, transaction }),
        request_date: today(),
        client_name: client.name, client_code: client.code,
        phone: client.mobile, email: client.email,
        category: p.service_category || p.project_type || null,
        specific_service: services[0]?.name || p.project_type || null,
        services_requested: services.map((s) => s.name).filter(Boolean),
        priority: p.priority || 'Medium',
        preferred_date: p.scheduled_date || null,
        visit_required: !!p.needs_assessment,
        needs_assessment: !!p.needs_assessment,
        deposit_required: !!p.deposit_required,
        provider_name: p.provider_name || null,
        assigned_officer: p.assigned_officer || null,
        address: project.site_address, district: project.district,
        property_type: project.property_type,
        description: p.scope_summary || null,
        status: 'Assigned to Project',
        source: p.origin || 'Direct',
        enquiry_code: p.enquiry_code || null,
        project_id: project.code,
      }, { transaction });
      created.request = request.code;
    }

    // Site assessment, when the operator said the job needs a visit first (§6).
    let assessment = null;
    if (p.assessment_code) {
      assessment = await M.WtSiteAssessment.findOne({ where: { branch_id: branchId, code: p.assessment_code }, transaction });
      if (assessment) await assessment.update({ project_id: project.code }, { transaction });
    } else if (p.needs_assessment) {
      assessment = await M.WtSiteAssessment.create({
        branch_id: branchId,
        code: await nextSeqCode(M.WtSiteAssessment, 'SA-', branchId, { start: 401, transaction }),
        project_id: project.code,
        client_name: client.name,
        provider: p.provider_name || null,
        assessed_date: p.assessment_date || p.scheduled_date || null,
        status: 'Scheduled',
        tank_type: p.tank_type || null,
        tank_capacity: p.tank_capacity || null,
        water_source: p.water_source || null,
        access_notes: p.access_notes || null,
        assessor: p.assigned_officer || null,
      }, { transaction });
      created.assessment = assessment.code;
    }

    const patch = {
      request_code: request?.code || null,
      assessment_code: assessment?.code || project.assessment_code,
      linked: {
        ...(request ? { request: { code: request.code, title: 'Service Request', status: request.status } } : {}),
        ...(assessment ? { assessment: { code: assessment.code, title: 'Site Assessment', status: assessment.status } } : {}),
        ...(project.quotation_code ? { quotation: { code: project.quotation_code, title: 'Quotation', status: 'Linked' } } : {}),
      },
      timeline: [
        ...timeline,
        ...(created.request ? [{ title: 'Service request raised', detail: `${created.request} opened automatically (Sec. 5 Step 1)`, at: new Date().toISOString(), by: actor }] : []),
        ...(created.assessment ? [{ title: 'Site assessment scheduled', detail: `${created.assessment} — visit required before quoting (Sec. 6)`, at: new Date().toISOString(), by: actor }] : []),
      ],
    };
    await project.update(patch, { transaction });

    // Keep the client file in step with the project it just spawned.
    await client.update({
      active_project_name: project.name,
      active_project_scope: p.scope_summary || null,
      active_project_progress: project.progress_pct,
      ...(p.under_amc ? { amc_package: p.amc_package || client.amc_package, amc_status: 'Active' } : {}),
    }, { transaction });

    try {
      await M.WtClientEvent.create({
        branch_id: branchId, client_id: client.id, event_type: 'project',
        title: `Project ${project.code} opened`, detail: project.name, actor,
      }, { transaction });
    } catch { /* the event log is a convenience, never a reason to fail the save */ }

    return { project: await project.reload({ transaction }), client, property, created };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Financials — derived on every read
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * The project's money position.
 *  in  : what the client owes and has paid (invoices)
 *  out : provider payouts (from the work orders) + the disbursement register
 * Provider payouts are read from wt_work_orders because the Payments screen owns
 * them; they are never duplicated into the disbursement table.
 */
function computeFinancials(project, invoices, workOrders, disbursements) {
  const invoiced = invoices.reduce((s, i) => s + num(i.amount), 0);
  const collected = invoices.reduce(
    (s, i) => s + (num(i.paid_amount) || (eq(i.status, 'paid') ? num(i.amount) : 0)), 0,
  );
  const receivable = invoices.reduce((s, i) => s + Math.max(0, outstandingOf(i)), 0);

  const providerPaid = workOrders.reduce((s, w) => s + num(w.provider_paid_amount), 0);
  const providerCommitted = workOrders.reduce((s, w) => s + num(w.provider_fee), 0);

  // Only money actually out of the door counts as disbursed; requested and
  // approved rows are shown separately so nothing is double-counted as spent.
  const registerPaid = disbursements
    .filter((d) => eq(d.status, 'paid')).reduce((s, d) => s + num(d.amount), 0);
  const registerPending = disbursements
    .filter((d) => !eq(d.status, 'paid') && !eq(d.status, 'rejected')).reduce((s, d) => s + num(d.amount), 0);

  const contractValue = num(project.contract_value) || invoiced;
  const disbursed = providerPaid + registerPaid;
  const committed = providerCommitted + registerPaid + registerPending;

  return {
    contract_value: round2(contractValue),
    invoiced: round2(invoiced),
    collected: round2(collected),
    receivable: round2(receivable),
    collection_pct: invoiced > 0 ? Math.round((collected / invoiced) * 100) : 0,
    provider_committed: round2(providerCommitted),
    provider_paid: round2(providerPaid),
    provider_outstanding: round2(Math.max(0, providerCommitted - providerPaid)),
    register_paid: round2(registerPaid),
    register_pending: round2(registerPending),
    disbursed: round2(disbursed),
    committed_cost: round2(committed),
    // Margin on what has been billed, against everything committed to spend.
    gross_margin: round2(contractValue - committed),
    margin_pct: contractValue > 0 ? Math.round(((contractValue - committed) / contractValue) * 100) : 0,
    net_position: round2(collected - disbursed),
    deposit_required: !!project.deposit_required,
    deposit_amount: round2(project.deposit_amount),
    deposit_received: !!project.deposit_received_at,
  };
}

/**
 * The unified outflow ledger the Billing tab shows: register rows the operator
 * controls, plus read-only rows synthesised from work-order payouts so the
 * picture is complete without duplicating the Payments screen's data.
 */
function buildDisbursementLedger(disbursements, workOrders) {
  const register = disbursements.map((d) => ({
    ...d, source: 'register', editable: true,
  }));
  const payouts = workOrders
    .filter((w) => num(w.provider_paid_amount) > 0)
    .map((w) => ({
      id: `wo-${w.id}`,
      code: w.payout_reference || w.code,
      project_code: w.project_id,
      category: 'Provider Payout',
      payee: w.provider_name,
      payee_type: 'Service Provider',
      work_order_code: w.code,
      description: `Provider payout against ${w.code}${w.category ? ` — ${w.category}` : ''}`,
      amount: num(w.provider_paid_amount),
      status: eq(w.payout_status, 'paid') || num(w.provider_paid_amount) >= num(w.provider_fee) ? 'Paid' : 'Part Paid',
      paid_on: w.payout_date,
      method: w.payout_method,
      reference: w.payout_reference,
      source: 'work_order',
      editable: false,
    }));
  return [...payouts, ...register].sort(
    (a, b) => String(b.paid_on || b.incurred_on || '').localeCompare(String(a.paid_on || a.incurred_on || '')),
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Read
 * ──────────────────────────────────────────────────────────────────────────── */

/** Everything the project dashboard needs, in one round trip. */
async function projectDossier(key, scope) {
  const project = await M.WtProject.findOne({
    where: {
      ...scope,
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: String(key) }],
    },
  });
  if (!project) return null;

  const p = project.toJSON();
  const byProject = { ...scope, project_id: p.code };

  const [workOrders, invoices, quotations, assessments, requests, disbursements, warranties, incidents] =
    await Promise.all([
      M.WtWorkOrder.findAll({ where: byProject, order: [['id', 'DESC']], raw: true }),
      M.WtInvoice.findAll({ where: byProject, order: [['id', 'DESC']], raw: true }),
      M.WtQuotation.findAll({ where: byProject, order: [['id', 'DESC']], raw: true }),
      M.WtSiteAssessment.findAll({ where: byProject, order: [['id', 'DESC']], raw: true }),
      M.WtServiceRequest.findAll({ where: byProject, order: [['id', 'DESC']], raw: true }),
      M.WtProjectDisbursement.findAll({ where: { ...scope, project_code: p.code }, order: [['id', 'DESC']], raw: true }),
      M.WtWarranty.findAll({ where: { ...scope, project_id: p.code }, order: [['id', 'DESC']], raw: true }).catch(() => []),
      M.WtIncident.findAll({ where: { ...scope, project_id: p.code }, order: [['id', 'DESC']], raw: true }).catch(() => []),
    ]);

  const [client, property, provider, amc, comms] = await Promise.all([
    p.client_code || p.client_id
      ? M.WtClient.findOne({ where: { ...scope, [Op.or]: [{ code: p.client_code || ' ' }, { id: p.client_id || -1 }] }, raw: true })
      : null,
    p.property_id ? Property.findOne({ where: { id: p.property_id }, raw: true }).catch(() => null) : null,
    p.provider_code || p.provider_id
      ? M.WtProvider.findOne({ where: { ...scope, [Op.or]: [{ code: p.provider_code || ' ' }, { id: p.provider_id || -1 }] }, raw: true })
      : null,
    p.amc_code ? M.WtAmcContract.findOne({ where: { ...scope, code: p.amc_code }, raw: true }).catch(() => null) : null,
    p.client_name
      ? M.WtCommLog.findAll({ where: { ...scope, client_name: p.client_name }, order: [['id', 'DESC']], limit: 25, raw: true }).catch(() => [])
      : [],
  ]);

  p.stage = normaliseStage(p.stage);
  const financials = computeFinancials(p, invoices, workOrders, disbursements);

  return {
    project: p,
    stage: { ...stageMeta(p.stage), index: stageIndex(p.stage), stages: STAGES },
    client, property, provider, amc,
    financials,
    disbursements: buildDisbursementLedger(disbursements, workOrders),
    related: { workOrders, invoices, quotations, assessments, requests, warranties, incidents, comms },
    closure_checklist: mergeChecklist(p.closure_checklist),
  };
}

/** Keep the stored checklist aligned with the SOP list as it evolves. */
function mergeChecklist(stored) {
  const saved = asArray(stored);
  return CLOSURE_CHECKLIST.map((c) => {
    const hit = saved.find((s) => s.key === c.key) || {};
    return { ...c, done: !!hit.done, at: hit.at || null, by: hit.by || null };
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Stage movement
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Check the SOP precondition for entering a stage. Returns a warning string or
 * null. Advisory only — see the module note.
 */
function stageWarning(stage, ctx) {
  const meta = STAGES.find((s) => eq(s.label, stage));
  if (!meta?.gate) return null;
  const { project, related } = ctx;
  switch (meta.gate) {
    case 'assessment':
      return related.assessments.length ? null
        : 'No site assessment exists on this project yet (Sec. 6 Step 3).';
    case 'quotation':
      return related.quotations.length ? null
        : 'No quotation has been prepared for this project (Sec. 7 Step 5).';
    case 'agreement':
      return eq(project.agreement_status, 'signed') || project.agreement_signed_at ? null
        : 'The Customer Service Agreement is not signed. Sec. 7 Step 6 requires it before commencement.';
    case 'provider':
      return project.provider_code || project.assigned_provider ? null
        : 'No provider has been assigned to this project (Sec. 8 Step 7).';
    default:
      return null;
  }
}

async function advanceStage(project, nextStage, ctx) {
  const stage = normaliseStage(nextStage);
  if (!STAGE_LABELS.includes(stage)) { const e = new Error('Unknown stage.'); e.status = 400; throw e; }

  const from = normaliseStage(project.stage);
  const meta = stageMeta(stage);
  const timeline = asArray(project.timeline);

  const patch = {
    stage,
    progress_pct: meta.pct,
    timeline: [...timeline, {
      title: `Stage moved to ${stage}`,
      detail: `${from} → ${stage} (${meta.sop})`,
      at: new Date().toISOString(),
      by: ctx.actor,
    }],
  };
  // Stamp the dates the stage implies, but never overwrite a real one.
  if (stage === 'Service Delivery' && !project.actual_start) patch.actual_start = today();
  if (stage === 'Completion') {
    if (!project.actual_completion) patch.actual_completion = today();
    patch.status = 'Completed';
  }
  if (stage === 'AMC / Ongoing Support' && !project.under_amc) patch.under_amc = true;

  await project.update(patch);
  return project;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Hydration — the project feeding the documents raised from it
 *
 * Everything captured while creating the project (client, site, tanks, scope,
 * priced services, dates, provider, AMC, deposit) belongs on the quotation and
 * the Customer Service Agreement. Retyping it is how the three end up
 * disagreeing, and Clause 4 makes Schedule B the record of the project, so it
 * has to BE the project. The reference numbers are system-generated and are
 * carried, never entered.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Advance payable on this project: the deposit if one was set, else nothing. */
function advanceOf(project, contractValue) {
  const total = num(contractValue);
  if (!project.deposit_required) return { advance_amount: null, advance_percent: 0 };
  const amount = Math.max(0, Math.min(num(project.deposit_amount), total));
  return {
    advance_amount: amount,
    advance_percent: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
  };
}

/**
 * A ready-to-send Customer Service Agreement payload built from the project.
 * Shape matches what wtCustomerAgreement.buildAgreement / the wizard expect.
 */
async function agreementDraft(key, scope) {
  const d = await projectDossier(key, scope);
  if (!d) return null;
  const { project: p, client, provider, related } = d;

  const services = asArray(p.services);
  const contractValue = num(p.contract_value)
    || services.reduce((s, l) => s + num(l.price) * (Number(l.qty) || 1), 0);
  const { advance_amount, advance_percent } = advanceOf(p, contractValue);

  // The most recent linked records supply the reference numbers.
  const workOrder = related.workOrders[0] || null;
  const quotation = related.quotations[0] || null;

  const materials = services.filter((l) => l.group === 'material').map((l) => l.name).join(', ');

  return {
    project_code: p.code,
    related_id: p.id,
    effective_date: today(),
    client: {
      full_name: p.client_name || client?.name || '',
      phone: p.client_phone || client?.mobile || '',
      email: p.client_email || client?.email || '',
      company: client?.client_type === 'Commercial' ? p.client_name : '',
      address: client?.service_address || p.site_address || '',
      service_address: p.site_address || client?.service_address || '',
      nid: client?.nid || '',
    },
    property_type: p.property_type || '',
    // Schedule B — every item Clause 4 (PROJECT DETAILS) requires
    schedule_b: {
      project_no: p.code,
      work_order_no: p.work_order_code || workOrder?.code || '',
      quotation_no: p.quotation_code || quotation?.code || '',
      property_address: p.site_address || '',
      property_type: p.property_type || '',
      tank_type: p.tank_type || '',
      tank_capacity: p.tank_capacity || '',
      tanks_count: p.tanks_count || '',
      water_source: p.water_source || '',
      scope: p.scope_summary || services.map((l) => l.name).join(', '),
      materials: materials || '',
      provider_name: p.assigned_provider || provider?.business_name || '',
      site_contact_name: p.site_contact_name || '',
      site_contact_phone: p.site_contact_phone || '',
      access_notes: p.access_notes || '',
      start_date: p.scheduled_date || p.start_date || '',
      completion_date: p.target_completion || '',
      amc_code: p.under_amc ? (p.amc_code || '') : '',
      amc_package: p.under_amc ? (p.amc_package || '') : '',
      amc_frequency: p.under_amc ? (p.amc_frequency || '') : '',
      warranty_period: p.warranty_period || '',
      special_conditions: p.notes || '',
    },
    // Schedule A ticks implied by the priced lines — see CODE_TO_SCHEDULE_A.
    services: customerSvc.scheduleAFromCodes(services.map((l) => l.code)),
    checklist: [],
    pricing_input: {
      selected: services.map((l) => ({ code: l.code, qty: Number(l.qty) || 1, agreed_price: num(l.price) })),
      discount: 0,
      vat_percent: 0,
      transport: 0,
      govt_fees: 0,
      advance_amount,
      advance_percent,
    },
    // context the wizard shows so the operator can see where this came from
    source: {
      project: { code: p.code, name: p.name, stage: p.stage, status: p.status },
      work_order: workOrder ? { code: workOrder.code, status: workOrder.status } : null,
      quotation: quotation ? { code: quotation.code, total: num(quotation.total), decision: quotation.decision } : null,
      contract_value: contractValue,
      service_count: services.length,
      deposit_required: !!p.deposit_required,
    },
  };
}

/** A ready-to-build quotation payload from the project. */
async function quotationDraft(key, scope) {
  const d = await projectDossier(key, scope);
  if (!d) return null;
  const { project: p, client } = d;

  const services = asArray(p.services);
  const contractValue = num(p.contract_value)
    || services.reduce((s, l) => s + num(l.price) * (Number(l.qty) || 1), 0);
  const { advance_amount, advance_percent } = advanceOf(p, contractValue);

  return {
    project_id: p.code,
    client_name: p.client_name,
    client_code: p.client_code,
    phone: p.client_phone || client?.mobile || '',
    email: p.client_email || client?.email || '',
    address: p.site_address || '',
    district: p.district || '',
    source_assessment: p.assessment_code || null,
    lines: services.map((l) => ({
      code: l.code, name: l.name, group: l.group, unit: l.unit,
      qty: Number(l.qty) || 1, price: num(l.price),
    })),
    tank_type: p.tank_type || '',
    tank_capacity: p.tank_capacity || '',
    tanks_count: p.tanks_count || 0,
    scope_summary: p.scope_summary || '',
    payment_terms: p.payment_terms || '',
    advance_amount, advance_percent,
    advance_basis: 'amount',
    validity: '15 Days',
    contract_value: contractValue,
  };
}

module.exports = {
  STAGES, STAGE_LABELS, PROJECT_TYPES, DISBURSEMENT_CATEGORIES, CLOSURE_CHECKLIST,
  agreementDraft, quotationDraft, advanceOf,
  resolveClient, resolveProperty, updateProject,
  normaliseStage, stageIndex, stageMeta, mergeChecklist,
  nextProjectCode, nextSeqCode,
  createProject, projectDossier, computeFinancials, buildDisbursementLedger,
  stageWarning, advanceStage,
  asArray, num, round2, eq, today,
};
