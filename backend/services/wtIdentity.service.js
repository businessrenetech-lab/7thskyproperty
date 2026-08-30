/**
 * wtIdentity.service.js — one place that mints and attaches every water-tank
 * identifier, so no record is ever saved with a blank Client ID or Project ID.
 *
 * The rule: a record that names a client always gets that client's code, and
 * anything that belongs to a job always gets that job's project code. If the
 * client or project does not exist yet, it is created rather than left dangling.
 */
const M = require('./../models/waterTankOps');

const today = () => new Date().toISOString().slice(0, 10);

// Placeholder names that earlier imports left behind. These are not real
// clients, so we never mint a Client ID for them — the record keeps its blank
// and the gap stays visible instead of being papered over with a fake client.
const PLACEHOLDER = /^(unknown|unknown client|n\/a|na|none|test|tbd|-{1,})$/i;
const isRealName = (n) => {
  const v = String(n || '').trim();
  return v.length > 1 && !PLACEHOLDER.test(v);
};

// code shape per entity, kept here so every path mints identically
const CODES = {
  clients: { model: () => M.WtClient, prefix: 'WTCM-C', pad: 4, start: 1 },
  projects: { model: () => M.WtProject, prefix: 'WTCM-P', pad: 4, start: 1 },
  'service-requests': { model: () => M.WtServiceRequest, prefix: 'SR-', pad: 4, start: 1095 },
  'site-assessments': { model: () => M.WtSiteAssessment, prefix: 'SA-', pad: 4, start: 402 },
  quotations: { model: () => M.WtQuotation, prefix: 'Q-', pad: 4, start: 1049 },
  'work-orders': { model: () => M.WtWorkOrder, prefix: 'WO-', pad: 4, start: 482 },
  providers: { model: () => M.WtProvider, prefix: 'SP-', pad: 4, start: 12 },
  amc: { model: () => M.WtAmcContract, prefix: 'AMC-', pad: 4, start: 1 },
  invoices: { model: () => M.WtInvoice, prefix: 'INV-', pad: 4, start: 482 },
  complaints: { model: () => M.WtComplaint, prefix: 'COMP-', pad: 3, start: 11 },
  warranties: { model: () => M.WtWarranty, prefix: 'WTY-', pad: 4, start: 1 },
  incidents: { model: () => M.WtIncident, prefix: 'INC-', pad: 4, start: 1 },
  enquiries: { model: () => M.WtEnquiry, prefix: 'ENQ-', pad: 4, start: 1 },
};

// Which CODES entity maps to which manifest code_prefix kind.
const PREFIX_KIND = {
  clients: 'client', projects: 'project', 'service-requests': 'request',
  'site-assessments': 'assessment', quotations: 'quotation', 'work-orders': 'work_order',
  providers: 'provider', invoices: 'invoice',
};
const { codePrefix, getServiceLine } = require('../config/serviceLines');
const serviceLabel = (sl) => (getServiceLine(sl).ui || {}).full_label || getServiceLine(sl).label || 'Service';

/**
 * Next free code for an entity, scoped to the branch and service line. Air
 * Conditioning gets its own prefix (ACCM-C…, ACR-…) and numbers from 1; Water
 * Tank keeps its prefix and continuation start. The prefix scan naturally
 * isolates each service line's series.
 */
async function nextCode(entity, branchId, transaction, serviceLine = 'water_tank') {
  const spec = CODES[entity];
  if (!spec) return null;
  const kind = PREFIX_KIND[entity];
  const prefix = kind ? codePrefix(serviceLine, kind) : spec.prefix;
  const start = serviceLine === 'water_tank' ? spec.start : 1;
  const model = spec.model();
  const rows = await model.findAll({ where: { branch_id: branchId }, attributes: ['code'], raw: true, transaction });
  let max = start - 1;
  for (const r of rows) {
    const n = parseInt(String(r.code || '').replace(prefix, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return prefix + String(max + 1).padStart(spec.pad, '0');
}

/**
 * Find the client by code or name; create them if they are new.
 * Returns null only when there is genuinely no client name to work with.
 */
async function ensureClient(branchId, { client_code, client_name, ...extra } = {}, transaction, dryRun = false) {
  // The owning service line comes in via extra.service_line (default water_tank),
  // so a client found/created here belongs to the caller's service, not shared.
  const sl = extra.service_line || 'water_tank';
  if (client_code) {
    const byCode = await M.WtClient.findOne({ where: { branch_id: branchId, service_line: sl, code: client_code }, transaction });
    if (byCode) return byCode;
  }
  const name = String(client_name || '').trim();
  if (!isRealName(name)) return null;

  const byName = await M.WtClient.findOne({ where: { branch_id: branchId, service_line: sl, name }, transaction });
  if (byName) return byName;
  // a read-only caller wants to know what WOULD be minted, without writing
  if (dryRun) return { code: '(new client)', name, __virtual: true };

  return M.WtClient.create({
    branch_id: branchId,
    service_line: sl,
    code: await nextCode('clients', branchId, transaction, sl),
    name,
    client_type: extra.client_type || 'Residential',
    mobile: extra.phone || extra.mobile || null,
    email: extra.email || null,
    service_address: extra.address || extra.service_address || extra.site_address || null,
    district: extra.district || null,
    property_type: extra.property_type || null,
    tank_type: extra.tank_type || null,
    current_status: 'New Lead',
    workflow_stage: 'Lead Enquiry',
    stage_updated_at: new Date(),
    enquiry_date: today(),
    lead_source: extra.source || 'System',
  }, { transaction });
}

/**
 * The open project for a client, created if there isn't one. Every job-bearing
 * record hangs off a project so the client file can assemble itself.
 */
async function ensureProject(branchId, client, hint = {}, transaction, dryRun = false) {
  if (!client) return null;
  // Owning service line (default water_tank) — a project stays within its service.
  const sl = hint.service_line || client.service_line || 'water_tank';

  // An explicit project link always wins — the record already belongs to a project.
  if (hint.project_id) {
    const byCode = await M.WtProject.findOne({ where: { branch_id: branchId, service_line: sl, code: hint.project_id }, transaction });
    if (byCode) return byCode;
  }

  // `forceNew` opens a fresh project even when the client has an open one, so a new
  // engagement (a newly approved quotation / new agreement) gets its own project and
  // its work orders do not pile up under an earlier engagement's project.
  if (!hint.forceNew) {
    const open = await M.WtProject.findOne({
      where: { branch_id: branchId, service_line: sl, client_name: client.name, status: 'Open' },
      order: [['id', 'DESC']],
      transaction,
    });
    if (open) return open;
  }
  if (dryRun || client.__virtual) return { code: '(new project)', client_name: client.name, __virtual: true };

  return M.WtProject.create({
    branch_id: branchId,
    service_line: sl,
    code: await nextCode('projects', branchId, transaction, sl),
    name: `${client.name} — ${hint.title || `${serviceLabel(sl)} Service`}`,
    client_name: client.name,
    // Carry the client's identity onto the project so the client file, invoice
    // client-lookup and project dashboard can all resolve the project to a client.
    client_code: client.code || null,
    client_id: client.id || null,
    client_type: client.client_type || 'Residential',
    client_phone: client.mobile || client.phone || null,
    client_email: client.email || null,
    assigned_provider: hint.provider_name || null,
    start_date: today(),
    stage: hint.stage || 'Lead',
    status: 'Open',
    timeline: [{ title: 'Project opened', detail: hint.detail || 'Created automatically with the first linked record.', at: new Date().toISOString(), by: 'System' }],
    linked: {}, milestones: [],
  }, { transaction });
}

// which fields each entity uses to carry its links
const LINKS = {
  'service-requests': { client: 'client_code', project: 'project_id', name: 'client_name' },
  'site-assessments': { project: 'project_id', name: 'client_name' },
  quotations: { project: 'project_id', name: 'client_name' },
  'work-orders': { client: 'client_code', project: 'project_id', name: 'client_name' },
  invoices: { project: 'project_id', name: 'client_name' },
  amc: { name: 'client_name' },
  complaints: { name: 'client_name' },
  warranties: { project: 'project_id', name: 'client_name' },
  incidents: { project: 'project_id', name: 'client_name' },
};

/**
 * Fill in whatever identifiers a record is missing, creating the client and
 * project if they do not exist. Safe to call on every create and update —
 * it only ever fills blanks, never overwrites what is already set.
 */
async function attachIdentifiers(entity, body, branchId, transaction, dryRun = false) {
  const link = LINKS[entity];
  if (!link) return body;

  const name = body[link.name];
  if (!isRealName(name)) return body;

  // The record's service_line (set by the controller from the request) flows into
  // the client/project it spawns, so they stay within the same service.
  const sl = body.service_line || 'water_tank';
  const client = await ensureClient(branchId, {
    client_code: body.client_code,
    client_name: name,
    service_line: sl,
    phone: body.phone || body.client_phone,
    email: body.email,
    address: body.address || body.site_address || body.service_address,
    district: body.district,
    property_type: body.property_type,
    tank_type: body.tank_type,
  }, transaction, dryRun);
  if (!client) return body;

  const out = { ...body };
  if (link.client && !out[link.client]) out[link.client] = client.code;

  // A project opens only when a quotation is approved, so a quotation or a site
  // assessment must not pull one into existence — it links to a project once one
  // exists. Everything else still opens/attaches its project as before.
  const defersProject = entity === 'quotations' || entity === 'site-assessments';
  if (link.project && !out[link.project] && !defersProject) {
    const project = await ensureProject(branchId, client, {
      project_id: body.project_id,
      service_line: sl,
      title: body.category || body.specific_service || body.warranty_type || undefined,
      provider_name: body.provider_name || body.provider,
      stage: entity === 'work-orders' ? 'Agreement' : 'Lead',
    }, transaction, dryRun);
    if (project) out[link.project] = project.code;
  }

  return out;
}

module.exports = { CODES, nextCode, ensureClient, ensureProject, attachIdentifiers, LINKS, isRealName };
