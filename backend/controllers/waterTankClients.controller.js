/**
 * waterTankClients.controller.js
 * SSPC-WTCM-SOP-01 — Client / End User Management.
 *
 * Sec. 4 workflow is the spine:
 *   Lead Enquiry → Needs Assessment → Site Assessment → Quotation →
 *   Agreement Signing → Deposit Collection → Provider Assignment →
 *   Service Delivery → Inspection & Reporting → Completion → AMC / Ongoing Support
 *
 * Sec. 7 Step 6 requires a signed Customer Service Agreement BEFORE commencement,
 * so the API refuses to move a client to Provider Assignment without one.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, serviceScope, resolveServiceLine } = require('../utils/controllerHelpers');
// Branch + service-line scope for wt_* reads (Contact queries keep plain branchScope).
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const actorOf = (req) => req.user?.name || req.user?.email || 'Client Service';

// ── Sec. 4 workflow ──
const STAGES = [
  'Lead Enquiry', 'Needs Assessment', 'Site Assessment', 'Quotation', 'Agreement Signing',
  'Deposit Collection', 'Provider Assignment', 'Service Delivery', 'Inspection & Reporting',
  'Completion', 'AMC / Ongoing Support',
];
// The phase each stage belongs to, so the UI can group them (Sec. 5–Sec. 10).
const STAGE_PHASE = {
  'Lead Enquiry': 'Phase 1 — Client Enquiry (Sec. 5)',
  'Needs Assessment': 'Phase 1 — Client Enquiry (Sec. 5)',
  'Site Assessment': 'Phase 2 — Site Assessment (Sec. 6)',
  Quotation: 'Phase 3 — Quotation & Agreement (Sec. 7)',
  'Agreement Signing': 'Phase 3 — Quotation & Agreement (Sec. 7)',
  'Deposit Collection': 'Phase 3 — Quotation & Agreement (Sec. 7)',
  'Provider Assignment': 'Phase 4 — Project Delivery (Sec. 8)',
  'Service Delivery': 'Phase 4 — Project Delivery (Sec. 8)',
  'Inspection & Reporting': 'Phase 5 — Inspection & Reporting (Sec. 9)',
  Completion: 'Phase 5 — Inspection & Reporting (Sec. 9)',
  'AMC / Ongoing Support': 'Phase 6 — AMC Management (Sec. 10)',
};

// ── Sec. 2 Scope: the service catalogue clients actually pick from ──
const SERVICE_CATALOGUE = {
  Residential: [
    'Rooftop Water Tank Cleaning', 'Underground Water Tank Cleaning', 'Apartment Water Tank Cleaning',
    'House Water Tank Cleaning', 'Tank Sanitisation', 'Bacteria & Algae Treatment',
    'Water Tank Inspection', 'Tank Maintenance',
  ],
  Commercial: [
    'Commercial Buildings', 'Hotels', 'Restaurants', 'Schools', 'Hospitals', 'Factories', 'Warehouses',
  ],
  Repair: [
    'Crack Repair', 'Leakage Repair', 'Valve Replacement', 'Pipe Repair',
    'Waterproofing', 'Structural Reinforcement',
  ],
  'Water Quality': ['Water Testing', 'Water Treatment', 'Filtration Systems', 'Water Purification'],
  AMC: ['Residential AMC', 'Commercial AMC'],
};
const PROPERTY_TYPES = ['Apartment', 'House', 'Duplex', 'Commercial Building', 'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Mosque', 'Other'];
const TANK_TYPES = ['Overhead', 'Underground', 'Rooftop', 'Ground Level', 'Sectional', 'Pressure Vessel'];
const ENQUIRY_CHANNELS = ['Phone Call', 'Website', 'WhatsApp', 'Facebook', 'Walk-in', 'Referral', 'Existing Client', 'Field Agent'];
// Sec. 12 project closure
const CLOSURE_CHECKLIST = [
  { key: 'final_payment', label: 'Final payment confirmed' },
  { key: 'satisfaction_survey', label: 'Client satisfaction survey completed' },
  { key: 'reports_issued', label: 'All reports issued to client' },
  { key: 'warranty_issued', label: 'Warranty information handed over' },
  { key: 'site_cleaned', label: 'Site left clean and clear' },
  { key: 'files_archived', label: 'Project file archived' },
];
// Sec. 9 Step 10 handover pack
const HANDOVER_DOCS = ['Cleaning Report', 'Inspection Report', 'Water Testing Results', 'Warranty Information', 'Maintenance Recommendations'];

exports.reference = (req, res) => res.json({
  stages: STAGES,
  stage_phase: STAGE_PHASE,
  service_catalogue: SERVICE_CATALOGUE,
  property_types: PROPERTY_TYPES,
  tank_types: TANK_TYPES,
  enquiry_channels: ENQUIRY_CHANNELS,
  closure_checklist: CLOSURE_CHECKLIST,
  handover_docs: HANDOVER_DOCS,
});

const logEvent = (branchId, clientId, event_type, title, detail, actor) =>
  M.WtClientEvent.create({ branch_id: branchId, client_id: clientId, event_type, title, detail, actor, occurred_at: new Date() });

/**
 * Gate evaluation for one client — which SOP phases are satisfied.
 * Mirrors the provider-side gates so both journeys read the same way.
 */
function buildGates(client, ctx) {
  const has = (v) => v != null && v !== '' && v !== 0;
  const agreementOk = String(client.agreement_status || '').toLowerCase() === 'signed';
  const depositOk = !client.deposit_required || num(client.deposit_paid_amount) >= num(client.deposit_amount);

  const gates = [
    { key: 'registered', stage: 'Lead Enquiry', sop: 'Sec. 5 Step 1', label: 'Client registered with contact and service address',
      ok: !!(client.name && client.mobile && client.service_address) },
    { key: 'consultation', stage: 'Needs Assessment', sop: 'Sec. 5 Step 2', label: 'Initial consultation — tank type, capacity, issues captured',
      ok: !!(client.tank_type && has(client.tanks_count)) },
    { key: 'assessment', stage: 'Site Assessment', sop: 'Sec. 6 Steps 3–4', label: 'Site assessment completed and documented',
      ok: ctx.assessments.some((a) => String(a.status || '').toLowerCase() === 'completed') },
    { key: 'quotation', stage: 'Quotation', sop: 'Sec. 7 Step 5', label: 'Quotation prepared and approved',
      ok: ctx.quotations.some((q) => String(q.decision || '').toLowerCase() === 'approved') },
    { key: 'agreement', stage: 'Agreement Signing', sop: 'Sec. 7 Step 6', label: 'Customer Service Agreement signed before commencement',
      ok: agreementOk },
    { key: 'deposit', stage: 'Deposit Collection', sop: 'Sec. 4', label: client.deposit_required ? 'Deposit collected' : 'No deposit required',
      ok: depositOk },
    { key: 'provider', stage: 'Provider Assignment', sop: 'Sec. 8 Step 7', label: 'Approved provider assigned and work order issued',
      ok: ctx.workOrders.length > 0 },
    { key: 'delivery', stage: 'Service Delivery', sop: 'Sec. 8 Step 8', label: 'Service delivered',
      ok: ctx.workOrders.some((w) => String(w.status || '').toLowerCase() === 'completed') },
    { key: 'reporting', stage: 'Inspection & Reporting', sop: 'Sec. 9 Step 9', label: 'Completion verified and reports issued',
      ok: ctx.reports.some((r) => String(r.status || '').toLowerCase() === 'accepted') },
    { key: 'handover', stage: 'Completion', sop: 'Sec. 9 Step 10', label: 'Client handover pack delivered',
      ok: !!client.handover_date },
    { key: 'closure', stage: 'Completion', sop: 'Sec. 12', label: 'Project closed — payment, survey, archive',
      ok: !!client.closed_date },
  ];

  return {
    gates,
    blocking: gates.filter((g) => !g.ok),
    // Sec. 7 Step 6 — nothing may commence without the signed agreement
    can_commence: agreementOk,
    agreement_ok: agreementOk,
    deposit_ok: depositOk,
  };
}

/* ═══ DIRECTORY ═══════════════════════════════════════════════ */

/**
 * GET /wt-clients/directory — the client book with Sec. 4 stage, value and risk.
 */
exports.directory = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const [clients, workOrders, invoices, complaints, amc, quotations] = await Promise.all([
    M.WtClient.findAll({ where: scope, order: [['id', 'DESC']], raw: true }),
    M.WtWorkOrder.findAll({ where: scope, raw: true }),
    M.WtInvoice.findAll({ where: scope, raw: true }),
    M.WtComplaint.findAll({ where: scope, raw: true }),
    M.WtAmcContract.findAll({ where: scope, raw: true }),
    M.WtQuotation.findAll({ where: scope, raw: true }),
  ]);
  const eq = (v, s) => String(v || '').toLowerCase() === s;

  const rows = clients.map((c) => {
    const jobs = workOrders.filter((w) => w.client_name === c.name);
    const inv = invoices.filter((i) => i.client_name === c.name);
    const open = complaints.filter((x) => x.client_name === c.name && !['resolved', 'closed'].includes(String(x.status || '').toLowerCase()));
    const contract = amc.find((a) => a.client_name === c.name && eq(a.status, 'active'));
    return {
      ...c,
      jobs_total: jobs.length,
      jobs_active: jobs.filter((w) => ['issued', 'accepted', 'in progress'].includes(String(w.status || '').toLowerCase())).length,
      lifetime_value: inv.reduce((s, i) => s + num(i.amount), 0),
      outstanding: inv.reduce((s, i) => s + num(i.outstanding), 0),
      open_complaints: open.length,
      amc_active: !!contract,
      amc_expiry: contract?.end_date || null,
      agreement_ok: eq(c.agreement_status, 'signed'),
    };
  });

  // Sec. 13 KPI measures
  const converted = clients.filter((c) => c.converted || workOrders.some((w) => w.client_name === c.name));
  const resolved = complaints.filter((x) => num(x.resolution_hours) > 0);
  const rated = clients.filter((c) => num(c.satisfaction_score) > 0);
  const repeat = clients.filter((c) => workOrders.filter((w) => w.client_name === c.name).length > 1);
  const finishedJobs = workOrders.filter((w) => ['completed', 'cancelled'].includes(String(w.status || '').toLowerCase()));
  const amcActive = amc.filter((a) => eq(a.status, 'active')).length;
  const amcExpired = amc.filter((a) => eq(a.status, 'expired')).length;

  res.json({
    clients: rows,
    stages: STAGES,
    stage_phase: STAGE_PHASE,
    funnel: STAGES.map((s) => ({ stage: s, count: rows.filter((c) => c.workflow_stage === s).length })),
    summary: {
      total: rows.length,
      active: rows.filter((c) => c.jobs_active > 0).length,
      amc: rows.filter((c) => c.amc_active).length,
      open_complaints: rows.reduce((s, c) => s + c.open_complaints, 0),
      outstanding: rows.reduce((s, c) => s + c.outstanding, 0),
      lifetime_value: rows.reduce((s, c) => s + c.lifetime_value, 0),
      unsigned_agreements: rows.filter((c) => !c.agreement_ok && c.workflow_stage !== 'Lead Enquiry').length,
    },
    kpis: {
      lead_conversion_rate: clients.length ? Math.round((converted.length / clients.length) * 1000) / 10 : null,
      service_completion_rate: finishedJobs.length
        ? Math.round((finishedJobs.filter((w) => eq(w.status, 'completed')).length / finishedJobs.length) * 1000) / 10 : null,
      customer_satisfaction: rated.length
        ? Math.round((rated.reduce((s, c) => s + num(c.satisfaction_score), 0) / rated.length) * 10) / 10 : null,
      satisfaction_responses: rated.length,
      complaint_resolution_hours: resolved.length
        ? Math.round((resolved.reduce((s, x) => s + num(x.resolution_hours), 0) / resolved.length) * 10) / 10 : null,
      amc_renewal_rate: amcActive + amcExpired ? Math.round((amcActive / (amcActive + amcExpired)) * 1000) / 10 : null,
      repeat_client_rate: clients.length ? Math.round((repeat.length / clients.length) * 1000) / 10 : null,
    },
  });
});

/**
 * GET /wt-clients/lookup?q= — find an existing client before creating a new one,
 * across both the water-tank book and the wider Seventh Sky contact directory.
 */
exports.lookup = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ water_tank: [], contacts: [] });
  const like = { [Op.like]: `%${q}%` };

  const water_tank = await M.WtClient.findAll({
    where: { ...scoped(req), [Op.or]: [{ name: like }, { mobile: like }, { email: like }, { code: like }, { service_address: like }] },
    limit: 8, order: [['id', 'DESC']], raw: true,
  });

  // the shared contact directory, so a client known elsewhere isn't retyped
  let contacts = [];
  try {
    const Contact = require('../models/Contact');
    contacts = await Contact.findAll({
      where: { ...branchScope(req), [Op.or]: [{ full_name: like }, { primary_phone: like }, { email: like }] },
      limit: 8, order: [['id', 'DESC']], raw: true,
    });
  } catch { contacts = []; }

  const existingNames = new Set(water_tank.map((c) => String(c.name || '').toLowerCase()));
  res.json({
    water_tank,
    contacts: contacts
      .filter((c) => !existingNames.has(String(c.full_name || '').toLowerCase()))
      .map((c) => ({
        id: c.id, name: c.full_name, mobile: c.primary_phone, email: c.email,
        address: c.address || c.present_address || null,
      })),
  });
});

/* ═══ ONE CLIENT: the client's own dashboard ══════════════════ */

exports.detail = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const key = req.params.id;
  const found = await M.WtClient.findOne({
    where: { ...scope, [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { code: key }] },
  });
  if (!found) return res.status(404).json({ error: 'Client not found' });
  const c = found.toJSON();
  const mine = { ...scope, client_name: c.name };

  const [requests, assessments, quotations, workOrders, invoices, complaints, amc, warranties, projects, comms, events, reports] = await Promise.all([
    M.WtServiceRequest.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtSiteAssessment.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtQuotation.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtWorkOrder.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtInvoice.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtComplaint.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtAmcContract.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtWarranty.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtProject.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
    M.WtCommLog.findAll({ where: mine, order: [['id', 'DESC']], limit: 50, raw: true }),
    M.WtClientEvent.findAll({ where: { ...scope, client_id: c.id }, order: [['occurred_at', 'DESC']], limit: 60, raw: true }),
    P.WtServiceReport.findAll({ where: mine, order: [['id', 'DESC']], raw: true }),
  ]);

  const ctx = { requests, assessments, quotations, workOrders, invoices, complaints, amc, warranties, reports };
  const gateInfo = buildGates(c, ctx);
  const eq = (v, s) => String(v || '').toLowerCase() === s;

  // Signed customer agreements for this client, for the Documents tab. Linked via
  // the 'client' signer name on the envelope. A completed one exposes its signed
  // PDF (saved on completion) so it can be downloaded straight from the tab.
  let agreements = [];
  try {
    const SigningEnvelope = require('../models/SigningEnvelope');
    const EnvelopeSigner = require('../models/EnvelopeSigner');
    const signerRows = await EnvelopeSigner.findAll({
      where: { role: 'client', name: c.name }, attributes: ['envelope_id'], raw: true,
    });
    const envIds = [...new Set(signerRows.map((s) => s.envelope_id))];
    if (envIds.length) {
      const envs = await SigningEnvelope.findAll({
        where: { id: envIds, related_type: 'water_tank_customer_agreement' },
        order: [['id', 'DESC']], raw: true,
      });
      agreements = envs.map((e) => ({
        code: e.envelope_code, title: e.title, status: e.status, completed_at: e.completed_at,
        signed_pdf_url: eq(e.status, 'completed')
          ? `/uploads/documents/${String(e.envelope_code).replace(/[^A-Za-z0-9_-]/g, '')}-signed.pdf` : null,
      }));
    }
  } catch { /* non-fatal: the tab still shows quotations & reports */ }

  const activeAmc = amc.find((a) => eq(a.status, 'active'));
  const finished = workOrders.filter((w) => ['completed', 'cancelled'].includes(String(w.status || '').toLowerCase()));
  const resolvedComplaints = complaints.filter((x) => num(x.resolution_hours) > 0);

  res.json({
    client: c,
    ...gateInfo,
    stages: STAGES,
    stage_phase: STAGE_PHASE,
    reference: { closure_checklist: CLOSURE_CHECKLIST, handover_docs: HANDOVER_DOCS, service_catalogue: SERVICE_CATALOGUE },
    account: {
      lifetime_value: invoices.reduce((s, i) => s + num(i.amount), 0),
      collected: invoices.reduce((s, i) => s + (num(i.paid_amount) || (eq(i.status, 'paid') ? num(i.amount) : 0)), 0),
      outstanding: invoices.reduce((s, i) => s + num(i.outstanding), 0),
      overdue: invoices.filter((i) => eq(i.status, 'overdue')).reduce((s, i) => s + num(i.outstanding), 0),
      deposit_due: Math.max(0, num(c.deposit_amount) - num(c.deposit_paid_amount)),
      jobs_total: workOrders.length,
      jobs_active: workOrders.filter((w) => ['issued', 'accepted', 'in progress'].includes(String(w.status || '').toLowerCase())).length,
      jobs_completed: workOrders.filter((w) => eq(w.status, 'completed')).length,
      completion_rate: finished.length ? Math.round((finished.filter((w) => eq(w.status, 'completed')).length / finished.length) * 1000) / 10 : null,
      open_complaints: complaints.filter((x) => !['resolved', 'closed'].includes(String(x.status || '').toLowerCase())).length,
      avg_resolution_hours: resolvedComplaints.length
        ? Math.round((resolvedComplaints.reduce((s, x) => s + num(x.resolution_hours), 0) / resolvedComplaints.length) * 10) / 10 : null,
      active_warranties: warranties.filter((w) => eq(w.status, 'active')).length,
      amc_active: !!activeAmc,
      amc_package: activeAmc?.package || c.amc_package || null,
      amc_value: num(activeAmc?.annual_value || c.amc_annual_value),
      amc_next_visit: activeAmc?.next_visit || null,
      amc_expiry: activeAmc?.end_date || null,
      amc_days_to_expiry: daysTo(activeAmc?.end_date),
      satisfaction_score: num(c.satisfaction_score) || null,
    },
    requests, assessments, quotations, work_orders: workOrders, invoices,
    complaints, amc, warranties, projects, comms, events, reports, agreements,
  });
});

/* ═══ LIFECYCLE ACTIONS ═══════════════════════════════════════ */

async function loadClient(req, res) {
  const c = await M.WtClient.findOne({ where: { id: req.params.id, ...scoped(req) } });
  if (!c) { res.status(404).json({ error: 'Client not found' }); return null; }
  return c;
}

/** POST /wt-clients/:id/stage — advance along the Sec. 4 workflow. */
exports.setStage = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const { stage } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ error: `"${stage}" is not a workflow stage.` });

  // Sec. 7 Step 6 — the agreement must be signed before commencement
  const commencementStages = ['Provider Assignment', 'Service Delivery'];
  if (commencementStages.includes(stage) && String(c.agreement_status || '').toLowerCase() !== 'signed') {
    return res.status(400).json({
      error: 'Cannot commence without a signed Customer Service Agreement.',
      blocking: ['Water Tank Cleaning & Maintenance Customer Service Agreement must be signed first (Sec. 7 Step 6)'],
    });
  }

  const from = c.workflow_stage;
  const patch = { workflow_stage: stage, stage_updated_at: new Date() };
  if (stage === 'Provider Assignment' && !c.converted) { patch.converted = true; patch.converted_date = today(); }
  if (stage === 'AMC / Ongoing Support') patch.current_status = 'Active (AMC)';
  await c.update(patch);
  await logEvent(resolveBranchId(req), c.id, 'stage', `Stage: ${from} → ${stage}`, req.body.note || STAGE_PHASE[stage], actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/consultation — Sec. 5 Step 2 initial consultation. */
exports.consultation = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  await c.update({
    tank_type: req.body.tank_type ?? c.tank_type,
    tank_capacity: req.body.tank_capacity ?? c.tank_capacity,
    tanks_count: req.body.tanks_count ?? c.tanks_count,
    key_issues: req.body.key_issues ?? c.key_issues,
    water_quality_concerns: req.body.water_quality_concerns ?? c.water_quality_concerns,
    amc_required: req.body.amc_required ?? c.amc_required,
    last_cleaning: req.body.last_cleaning ?? c.last_cleaning,
    consultation_date: req.body.consultation_date || today(),
    consultation_by: req.body.consultation_by || actorOf(req),
    consultation_notes: req.body.consultation_notes ?? c.consultation_notes,
    workflow_stage: c.workflow_stage === 'Lead Enquiry' ? 'Needs Assessment' : c.workflow_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), c.id, 'consultation', 'Initial consultation recorded (Sec. 5 Step 2)',
    [c.tank_type, c.tank_capacity, req.body.amc_required ? 'AMC required' : null].filter(Boolean).join(' · '), actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/agreement — Sec. 7 Step 6. */
exports.agreement = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const status = req.body.agreement_status || 'Signed';
  await c.update({
    agreement_status: status,
    agreement_code: req.body.agreement_code ?? c.agreement_code,
    agreement_envelope_id: req.body.agreement_envelope_id ?? c.agreement_envelope_id,
    agreement_signed_date: req.body.agreement_signed_date || (status === 'Signed' ? today() : c.agreement_signed_date),
    workflow_stage: status === 'Signed' && ['Lead Enquiry', 'Needs Assessment', 'Site Assessment', 'Quotation'].includes(c.workflow_stage)
      ? 'Agreement Signing' : c.workflow_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), c.id, 'agreement', `Customer Service Agreement ${status.toLowerCase()}`, req.body.agreement_code || null, actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/deposit — deposit collection. */
exports.deposit = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const amount = num(req.body.amount);
  if (!(amount > 0)) return res.status(400).json({ error: 'Enter a deposit amount greater than zero.' });
  const paid = num(c.deposit_paid_amount) + amount;
  await c.update({
    deposit_required: true,
    deposit_amount: num(req.body.deposit_amount) || num(c.deposit_amount) || amount,
    deposit_paid_amount: paid,
    deposit_date: req.body.deposit_date || today(),
    workflow_stage: c.workflow_stage === 'Agreement Signing' ? 'Deposit Collection' : c.workflow_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), c.id, 'deposit', `Deposit received: ${amount}`, req.body.reference || null, actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/handover — Sec. 9 Step 10 client handover. */
exports.handover = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const docs = Array.isArray(req.body.handover_docs) ? req.body.handover_docs : [];
  await c.update({
    handover_date: req.body.handover_date || today(),
    handover_docs: docs,
    maintenance_recommendations: req.body.maintenance_recommendations ?? c.maintenance_recommendations,
    workflow_stage: ['Service Delivery', 'Inspection & Reporting'].includes(c.workflow_stage) ? 'Completion' : c.workflow_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), c.id, 'handover', 'Client handover completed (Sec. 9 Step 10)',
    docs.length ? `Handed over: ${docs.join(', ')}` : null, actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/closure — Sec. 12 project closure. */
exports.closure = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const checklist = req.body.closure_checklist || {};
  const complete = CLOSURE_CHECKLIST.every((i) => checklist[i.key]);
  await c.update({
    closure_checklist: checklist,
    final_payment_confirmed: !!checklist.final_payment,
    satisfaction_score: req.body.satisfaction_score != null ? num(req.body.satisfaction_score) : c.satisfaction_score,
    satisfaction_date: req.body.satisfaction_score != null ? today() : c.satisfaction_date,
    satisfaction_notes: req.body.satisfaction_notes ?? c.satisfaction_notes,
    closed_date: complete ? (req.body.closed_date || today()) : null,
    archived: !!checklist.files_archived,
    current_status: complete ? 'Completed' : c.current_status,
    workflow_stage: complete && c.amc_required ? 'AMC / Ongoing Support' : c.workflow_stage,
    stage_updated_at: new Date(),
  });
  await logEvent(resolveBranchId(req), c.id, 'closure',
    complete ? 'Project closed (Sec. 12)' : 'Closure checklist updated',
    `${CLOSURE_CHECKLIST.filter((i) => checklist[i.key]).length}/${CLOSURE_CHECKLIST.length} items complete`, actorOf(req));
  res.json(c);
});

/** POST /wt-clients/:id/note — log a client interaction into the CRM. */
exports.note = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  if (!req.body.summary) return res.status(400).json({ error: 'Write a summary of the interaction.' });
  const branchId = resolveBranchId(req);
  await M.WtCommLog.create({
    branch_id: branchId, client_name: c.name,
    channel: req.body.channel || 'call', direction: req.body.direction || 'outbound',
    summary: req.body.summary, ref_type: req.body.ref_type || null, ref_code: req.body.ref_code || null,
    logged_at: new Date(),
  });
  await logEvent(branchId, c.id, 'note', `${req.body.channel || 'call'} logged`, req.body.summary, actorOf(req));
  res.json({ ok: true });
});

/**
 * POST /wt-clients — register a Water Tank client (Sec. 5 Step 1).
 * The specialist create: generic writes to "clients" are blocked because they
 * bypass code generation, de-duplication and the workflow defaults below.
 */
const CLIENT_FIELDS = [
  'name', 'client_type', 'mobile', 'email', 'district', 'property_type',
  'service_address', 'lead_source', 'assigned_officer', 'tanks_count', 'tank_type',
  'tank_capacity', 'key_issues', 'last_cleaning', 'notes', 'workflow_stage',
  'enquiry_date', 'enquiry_channel', 'requested_service', 'service_category',
  'alt_contact_name', 'alt_contact_phone', 'water_quality_concerns', 'amc_required',
  'consultation_notes', 'current_status',
];
exports.create = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const name = String(body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Client name is required.' });

  // Reuse an existing client rather than raise a duplicate (matches intake).
  const dupWhere = [{ name }];
  if (body.mobile) dupWhere.push({ mobile: String(body.mobile).trim() });
  if (body.email) dupWhere.push({ email: String(body.email).trim() });
  const existing = await M.WtClient.findOne({ where: { ...scoped(req), [Op.or]: dupWhere } });
  if (existing) return res.status(200).json(existing);

  const rows = await M.WtClient.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true });
  let max = 0;
  rows.forEach((r) => { const n = parseInt(String(r.code || '').replace('WTCM-C', ''), 10); if (!Number.isNaN(n) && n > max) max = n; });

  const payload = {};
  CLIENT_FIELDS.forEach((k) => { if (body[k] !== undefined) payload[k] = body[k]; });
  const client = await M.WtClient.create({
    ...payload,
    branch_id: branchId, service_line: resolveServiceLine(req),
    code: `WTCM-C${String(max + 1).padStart(4, '0')}`,
    name,
    tanks_count: Number(body.tanks_count) || 0,
    current_status: body.current_status || 'New Lead',
    workflow_stage: body.workflow_stage || 'Lead Enquiry',
    stage_updated_at: new Date(),
  });
  await logEvent(branchId, client.id, 'client', `Client ${client.code} registered (Sec. 5 Step 1)`, client.name, actorOf(req));
  res.status(201).json(client);
});

/**
 * POST /wt-clients/:id/register — Sec. 5 Step 1 completion.
 * Creates the client's Project ID + CRM profile in one move, as the SOP asks.
 */
exports.registerProject = asyncHandler(async (req, res) => {
  const c = await loadClient(req, res); if (!c) return;
  const branchId = resolveBranchId(req);
  const existing = await M.WtProject.findOne({ where: { ...scoped(req), client_name: c.name, status: 'Open' } });
  if (existing) return res.json({ project: existing, created: false });

  const rows = await M.WtProject.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true });
  let max = 0;
  rows.forEach((r) => { const n = parseInt(String(r.code || '').replace('WTCM-P', ''), 10); if (!Number.isNaN(n) && n > max) max = n; });
  const project = await M.WtProject.create({
    branch_id: branchId, service_line: resolveServiceLine(req),
    code: `WTCM-P${String(max + 1).padStart(4, '0')}`,
    name: `${c.name} — ${c.requested_service || 'Water Tank Service'}`,
    client_name: c.name,
    start_date: today(),
    stage: 'Lead', status: 'Open',
    timeline: [{ title: 'Project opened', detail: `From client ${c.code}`, at: new Date().toISOString(), by: actorOf(req) }],
    linked: {}, milestones: [],
  });
  await logEvent(branchId, c.id, 'project', `Project ${project.code} opened (Sec. 5 Step 1)`, project.name, actorOf(req));
  res.status(201).json({ project, created: true });
});
