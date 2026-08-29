/**
 * waterTankIntake.controller.js
 * Where water-tank work comes from, and how it gets routed.
 *
 *   Website / phone enquiry  →  Service Request  →  either
 *      (a) Site Assessment first (Sec. 6), or
 *      (b) straight to a Quotation (Sec. 7 Step 5) when the job is well
 *          understood and no visit is needed.
 *
 * The public submit endpoint is unauthenticated — it is what the marketing site
 * posts to. It deliberately exposes no pricing.
 */
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId, serviceScope, resolveServiceLine, catalogueVertical, serviceUi } = require('../utils/controllerHelpers');
// Branch + service-line scope for wt_* reads (never spread onto ServiceItem, which
// is separated by `vertical`, not service_line).
const scoped = (req) => ({ ...branchScope(req), ...serviceScope(req) });
const M = require('../models/waterTankOps');
const ServiceItem = require('../models/ServiceItem');

const num = (v) => Number(v || 0);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const actorOf = (req) => req.user?.name || req.user?.email || 'Client Service';

async function nextCode(model, prefix, pad, start, branchId) {
  const rows = await model.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true });
  let max = start - 1;
  for (const r of rows) {
    const n = parseInt(String(r.code || '').replace(prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(pad, '0');
}

/* ═══ PUBLIC (website) ════════════════════════════════════════ */

/**
 * GET /public/water-tank/services — the service menu the website shows.
 * Names only. Pricing is deliberately withheld from the public site.
 */
exports.publicServices = asyncHandler(async (req, res) => {
  const rows = await ServiceItem.findAll({
    where: { vertical: catalogueVertical(req), is_active: true },
    order: [['sort_order', 'ASC']],
    raw: true,
  });
  // The catalogue carries no customer-facing category, so group by service
  // family read off the name — this is also how a visitor thinks about it.
  const FAMILY = [
    [/inspect/i, 'Inspection & Assessment'],
    [/clean|wash|scrub|evacuat/i, 'Tank Cleaning'],
    [/disinfect|steril|bacteria|algae|chlorin/i, 'Disinfection & Treatment'],
    [/test|quality|sample|report/i, 'Water Quality Testing'],
    [/leak|crack|repair|waterproof|valve|pipe|structur/i, 'Repairs & Waterproofing'],
    [/pump|pressure/i, 'Pump & Pressure Systems'],
    [/maintenance contract|amc|annual/i, 'Annual Maintenance Contracts'],
    [/maintenance|preventive|scheduled/i, 'Maintenance'],
    [/emergency|call-out|after hours/i, 'Emergency Call-Out'],
  ];
  const familyOf = (name) => (FAMILY.find(([re]) => re.test(name)) || [null, 'Other Services'])[1];

  const groups = {};
  rows.forEach((r) => {
    let tags = r.tags;
    if (typeof tags === 'string') { try { tags = JSON.parse(tags); } catch { tags = {}; } }
    // only customer-facing services; materials and labour rates are internal
    if (((tags || {}).group || 'service') !== 'service') return;
    const g = familyOf(r.name || '');
    (groups[g] = groups[g] || []).push({ code: r.code, name: r.name, unit: r.unit || null });
  });
  const ui0 = serviceUi(req);
  res.json({
    groups: Object.entries(groups).map(([label, services]) => ({ label, services })),
    property_types: ui0.property_types || ['Apartment', 'House', 'Duplex', 'Commercial Building', 'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Mosque', 'Other'],
    tank_types: ui0.equipment?.type_options || ['Overhead', 'Underground', 'Rooftop', 'Ground Level', 'Sectional', 'Not sure'],
    equipment: ui0.equipment || null,
    service_label: ui0.full_label || null,
    districts: ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj'],
  });
});

/**
 * POST /public/water-tank/enquiry — the website lead form.
 * Unauthenticated. A website lead is captured directly as a Service Request
 * (status New, untriaged) — the single intake for water-tank work. A coordinator
 * later triages it into an assessment or a quotation, which is when a client file
 * and project are created. Validates the minimum needed to call back.
 */
exports.publicEnquiry = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const name = String(b.client_name || '').trim();
  const phone = String(b.phone || '').trim();
  if (!name) return res.status(400).json({ error: 'Please tell us your name.' });
  if (!phone) return res.status(400).json({ error: 'Please give us a phone number so we can call you back.' });

  const branchId = num(b.branch_id) || 1;
  const services = Array.isArray(b.services_requested) ? b.services_requested : [];
  const row = await M.WtServiceRequest.create({
    branch_id: branchId,
    service_line: resolveServiceLine(req),
    code: await nextCode(M.WtServiceRequest, 'SR-', 4, 1095, branchId),
    request_date: today(),
    client_name: name,
    phone,
    email: String(b.email || '').trim() || null,
    address: b.site_address || b.address || null,
    district: b.district || null,
    property_type: b.property_type || null,
    services_requested: services,
    specific_service: services[0] || null,
    preferred_date: b.preferred_date || null,
    description: b.message || null,
    source: b.source || 'Website',
    needs_assessment: true,
    visit_required: true,
    status: 'New',
  });

  await M.WtCommLog.create({
    branch_id: branchId, service_line: resolveServiceLine(req), client_name: name, channel: 'note', direction: 'inbound',
    summary: `Website service request ${row.code} received from ${row.source}`,
    ref_type: 'service-requests', ref_code: row.code, logged_at: new Date(),
  }).catch(() => {});

  // never echo internal fields back to the public site
  res.status(201).json({
    ok: true,
    reference: row.code,
    message: 'Thank you — we have received your request and will call you shortly.',
  });
});

/* ═══ ENQUIRIES (retired) ═════════════════════════════════════
 * The separate enquiry console has been retired — intake is standardised on the
 * Service Request. Website leads now arrive as Service Requests (publicEnquiry,
 * above); phone/walk-in leads are logged with the "New Service Request" wizard.
 * The WtEnquiry model is kept only so historical enquiry records remain readable. */

/* ═══ REQUEST WIZARD SUPPORT ══════════════════════════════════ */

/**
 * GET /wt-intake/request-reference
 * Everything the new-request wizard needs: the service menu with prices (this
 * is the console, not the website), and the providers who may actually be
 * assigned — SOP-02 Sec. 6 Step 4 permits assignment only to an approved
 * provider with a signed master agreement.
 */
exports.requestReference = asyncHandler(async (req, res) => {
  const scope = branchScope(req);
  const [catalogRows, providers] = await Promise.all([
    ServiceItem.findAll({ where: { ...scope, vertical: catalogueVertical(req), is_active: true }, order: [['sort_order', 'ASC']], raw: true }),
    M.WtProvider.findAll({ where: scope, order: [['rank', 'ASC'], ['business_name', 'ASC']], raw: true }),
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

  const eligible = providers.map((p) => {
    const approved = String(p.status || '').toLowerCase() === 'approved';
    const signed = String(p.agreement_status || '').toLowerCase() === 'signed';
    let areas = p.coverage_areas;
    if (typeof areas === 'string') { try { areas = JSON.parse(areas); } catch { areas = []; } }
    let cats = p.service_categories;
    if (typeof cats === 'string') { try { cats = JSON.parse(cats); } catch { cats = []; } }
    return {
      id: p.id, code: p.code, business_name: p.business_name,
      specialty: p.specialty, rating: num(p.rating), rank: p.rank,
      coverage_areas: Array.isArray(areas) ? areas : [],
      service_categories: Array.isArray(cats) ? cats : [],
      status: p.status, agreement_status: p.agreement_status,
      // the SOP gate: no client work without an executed master agreement
      assignable: approved && signed,
      blocked_reason: approved
        ? (signed ? null : 'No signed master agreement (Sec. 6 Step 4)')
        : `Provider status is ${p.status || 'Pending'}`,
    };
  });

  const ui = serviceUi(req);
  res.json({
    catalog,
    groups: [...new Set(catalog.map((c) => c.group))],
    providers: eligible,
    assignable_providers: eligible.filter((p) => p.assignable),
    categories: ui.categories || ['Cleaning', 'Disinfection', 'Repairs', 'Water Quality', 'Maintenance', 'AMC', 'Inspection'],
    priorities: ['High', 'Medium', 'Low'],
    districts: ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj'],
    property_types: ui.property_types || ['Apartment', 'House', 'Duplex', 'Commercial Building', 'Hotel', 'Restaurant', 'School', 'Hospital', 'Factory', 'Warehouse', 'Mosque', 'Other'],
    tank_types: ui.equipment?.type_options || ['Overhead', 'Underground', 'Rooftop', 'Ground Level', 'Sectional', 'Pressure Vessel'],
    equipment: ui.equipment || null,
    service_label: ui.full_label || null,
  });
});

/**
 * POST /wt-intake/requests
 * Creates the service request and routes it in one move:
 *   needs_assessment true  → schedules the site assessment on the chosen date
 *   needs_assessment false → raises the quotation from the selected services
 * Also creates the client and project file if they do not exist yet, and
 * closes off the originating enquiry.
 */
exports.createRequest = asyncHandler(async (req, res) => {
  const scope = scoped(req);
  const branchId = resolveBranchId(req);
  const b = req.body || {};

  if (!b.client_name) return res.status(400).json({ error: 'Client name is required.' });
  const needsAssessment = b.needs_assessment !== false;
  const lines = Array.isArray(b.lines) ? b.lines : [];
  if (!needsAssessment && !lines.length) {
    return res.status(400).json({ error: 'Select at least one service to quote, or choose a site assessment instead.' });
  }
  if (needsAssessment && !b.assessment_date) {
    return res.status(400).json({ error: 'Pick a date for the site assessment.' });
  }

  // ── client: reuse or register ──
  let client = b.client_code
    ? await M.WtClient.findOne({ where: { ...scope, code: b.client_code } })
    : await M.WtClient.findOne({ where: { ...scope, name: b.client_name } });
  if (!client) {
    client = await M.WtClient.create({
      branch_id: branchId,
      service_line: resolveServiceLine(req),
      code: await nextCode(M.WtClient, 'WTCM-C', 4, 1, branchId),
      name: b.client_name,
      client_type: b.client_type || 'Residential',
      mobile: b.phone || null, email: b.email || null,
      service_address: b.address || null, district: b.district || null,
      property_type: b.property_type || null,
      tank_type: b.tank_type || null, tanks_count: num(b.tanks_count),
      lead_source: b.source || 'Direct',
      current_status: 'New Lead',
      workflow_stage: 'Needs Assessment',
      stage_updated_at: new Date(),
      enquiry_date: today(),
      requested_service: b.specific_service || null,
      assigned_officer: b.assigned_officer || null,
    });
  }

  // ── project file ──
  // A project opens only when a quotation is approved, and every new engagement
  // gets its OWN project — so intake never attaches to a client's existing open
  // project (that would pool a new engagement's work orders under an old one).
  // The request/assessment/quotation live without a project until approval, which
  // opens a fresh one and back-fills the chain (see setDecision).
  const project = null;

  // ── the request itself ──
  const request = await M.WtServiceRequest.create({
    branch_id: branchId,
    service_line: resolveServiceLine(req),
    code: await nextCode(M.WtServiceRequest, 'SR-', 4, 1095, branchId),
    request_date: b.request_date || today(),
    client_name: client.name,
    client_code: client.code,
    email: b.email || client.email,
    phone: b.phone || client.mobile,
    address: b.address || client.service_address,
    district: b.district || client.district,
    property_type: b.property_type || client.property_type,
    category: b.category || null,
    specific_service: b.specific_service || null,
    services_requested: b.services_requested || lines.map((l) => l.name),
    priority: b.priority || 'Medium',
    preferred_date: b.preferred_date || null,
    visit_required: needsAssessment,
    deposit_required: !!b.deposit_required,
    provider_name: b.provider_name || null,
    assigned_officer: b.assigned_officer || null,
    description: b.description || null,
    needs_assessment: needsAssessment,
    assessment_date: needsAssessment ? b.assessment_date : null,
    project_id: project ? project.code : null,
    source: b.source || 'Direct',
    enquiry_code: b.enquiry_code || null,
    status: needsAssessment ? 'Assessment Scheduled' : 'In Progress',
  });

  const out = { request, client, project, assessment: null, quotation: null };

  // ── branch A: schedule the site assessment ──
  if (needsAssessment) {
    const assessment = await M.WtSiteAssessment.create({
      branch_id: branchId, service_line: resolveServiceLine(req),
      code: await nextCode(M.WtSiteAssessment, 'SA-', 4, 402, branchId),
      client_name: client.name,
      project_id: project ? project.code : null,
      provider: b.provider_name || null,
      assessed_date: b.assessment_date,
      status: 'Scheduled',
      tank_type: b.tank_type || client.tank_type || null,
      checklist: {}, photos: [], photos_after: [], risks: [], variations: [],
      recommended_services: b.services_requested || [],
      findings: b.description || null,
      assessor: b.assigned_officer || null,
      template_key: 'standard',
    });
    await request.update({ assessment_code: assessment.code });
    out.assessment = assessment;
  } else {
    // ── branch B: straight to a quotation ──
    const lineTotal = (l) => num(l.price) * (num(l.qty) || 1);
    const service_charges = lines.filter((l) => l.kind !== 'fee').reduce((s, l) => s + lineTotal(l), 0);
    const other_fees = lines.filter((l) => l.kind === 'fee').reduce((s, l) => s + lineTotal(l), 0);
    const alloc = num(b.provider_allocation_fee);
    const discount = num(b.discount);
    const net = Math.max(0, service_charges + other_fees + alloc - discount);
    const vat = b.vat_exempt ? 0 : Math.round(net * 0.05 * 100) / 100;

    const quotation = await M.WtQuotation.create({
      branch_id: branchId, service_line: resolveServiceLine(req),
      code: await nextCode(M.WtQuotation, 'Q-', 4, 1049, branchId),
      client_name: client.name,
      project_id: project ? project.code : null,
      lines,
      service_charges, other_fees, provider_allocation_fee: alloc, discount,
      vat_exempt: !!b.vat_exempt, vat,
      total: Math.round((net + vat) * 100) / 100,
      validity: b.validity || '15 Days',
      payment_terms: b.payment_terms || null,
      notes: b.notes || null,
      decision: 'Pending',
    });
    await request.update({ quotation_code: quotation.code });
    await client.update({ workflow_stage: 'Quotation', stage_updated_at: new Date() });
    out.quotation = quotation;
  }

  // ── project timeline (only if the client already had an open project) ──
  if (project) {
    const timeline = (() => { try { return JSON.parse(project.timeline) || []; } catch { return Array.isArray(project.timeline) ? project.timeline : []; } })();
    timeline.push({
      title: needsAssessment ? 'Site assessment scheduled' : 'Quotation raised',
      detail: needsAssessment
        ? `${request.code} → ${out.assessment.code} on ${b.assessment_date}`
        : `${request.code} → ${out.quotation.code}`,
      at: new Date().toISOString(), by: actorOf(req),
    });
    await project.update({ timeline, stage: needsAssessment ? 'Site Assessment' : 'Quotation' });
  }

  // ── close off the enquiry it came from ──
  if (b.enquiry_code) {
    const enq = await M.WtEnquiry.findOne({ where: { ...scope, code: b.enquiry_code } });
    if (enq) {
      await enq.update({
        status: 'Converted',
        converted_request_code: request.code,
        converted_client_code: client.code,
        converted_at: new Date(),
      });
    }
  }

  await M.WtCommLog.create({
    branch_id: branchId, service_line: resolveServiceLine(req), client_name: client.name, channel: 'note', direction: 'outbound',
    summary: needsAssessment
      ? `Service request ${request.code} raised — site assessment ${out.assessment.code} scheduled for ${b.assessment_date}`
      : `Service request ${request.code} raised — quotation ${out.quotation.code} prepared`,
    ref_type: 'service-requests', ref_code: request.code, logged_at: new Date(),
  });

  res.status(201).json(out);
});
