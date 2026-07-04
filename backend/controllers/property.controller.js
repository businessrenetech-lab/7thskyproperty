const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const PropertyDocument = require('../models/PropertyDocument');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const OwnerFeeSchedule = require('../models/OwnerFeeSchedule');
const Tenancy = require('../models/Tenancy');
const Contact = require('../models/Contact');
const PropertyInvoice = require('../models/PropertyInvoice');
const Payment = require('../models/Payment');
const RentalLedger = require('../models/RentalLedger');
const { Inspection } = require('../models/Inspection');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const Communication = require('../models/Communication');
const RegisterEntry = require('../models/RegisterEntry');
const PropertyDeal = require('../models/PropertyDeal');
const User = require('../models/User');
const Client = require('../models/Client');
const AccountCategory = require('../models/AccountCategory');
const { ensureFoliosForTenancy, postFolioTransaction } = require('../services/folio.service');
const { computePropertyState } = require('../services/propertyState.service');
const AuditLog = require('../models/AuditLog');
const UtilityBill = require('../models/UtilityBill');
const TenantRequest = require('../models/TenantRequest');
const ArrearsAction = require('../models/ArrearsAction');
const MarketingActivity = require('../models/MarketingActivity');
const ExpenseApproval = require('../models/ExpenseApproval');
const PropertyRisk = require('../models/PropertyRisk');
const MoveInChecklistItem = require('../models/MoveInChecklistItem');

const FIELDS = [
  'title', 'slug', 'category', 'property_type', 'listing_type', 'status', 'price', 'price_unit', 'currency', 'is_negotiable',
  'address', 'area', 'city', 'district', 'postal_code', 'country', 'latitude', 'longitude', 'map_url', 'nearby_places',
  'bedrooms', 'bathrooms', 'parking', 'land_size', 'building_size', 'floor_number', 'total_floors', 'year_built',
  'furnishing', 'features', 'description', 'featured_image_url', 'video_tour_url', 'drone_video_url', 'floor_plan_url',
  'virtual_tour_url', 'owner_contact_id', 'tenant_contact_id', 'listing_agent_id', 'manager_id', 'is_published', 'is_featured',
  'seo_title', 'seo_description',
  // Rental management (Property Master Register)
  'occupancy_status', 'utilities_active', 'market_rent_min', 'market_rent_max', 'approved_monthly_rent', 'rent_due_day',
  'management_fee_pct', 'lease_min_period_months', 'property_condition', 'access_contact', 'remarks',
  'pm_status', 'rental_readiness_status', 'listing_status',
];
const { createLeasingProject, seedOwnerOnboardingItems } = require('../services/rentalWorkflow.service');
const Project = require('../models/Project');
const ProjectStage = require('../models/ProjectStage');
const OwnerOnboardingItem = require('../models/OwnerOnboardingItem');
const contactAttrs = ['id', 'full_name', 'primary_phone', 'email'];
const ownerInc = { model: Contact, as: 'owner', attributes: contactAttrs };
const tenantInc = { model: Contact, as: 'tenant', attributes: contactAttrs };
const managerInc = { model: Contact, as: 'manager', attributes: contactAttrs };
const num = (v) => Number(v || 0);

// ─── HELPERS ────────────────────────────────────────────────────────────────

/** Build tab-specific WHERE clause overlay. */
async function tabFilter(tab, branchWhere) {
  if (!tab || tab === 'all') return {};
  if (tab === 'active') return { status: { [Op.in]: ['available', 'occupied', 'rented'] } };
  if (tab === 'rentals') return { listing_type: 'rent', tenant_contact_id: { [Op.not]: null } };
  if (tab === 'sales') return { listing_type: 'sale' };
  if (tab === 'vacancies') return { listing_type: 'rent', status: 'available' };
  if (tab === 'archived') return { status: 'inactive' };
  if (tab === 'arrears') {
    const [rows] = await sequelize.query(
      `SELECT DISTINCT rl.property_id FROM rental_ledger rl WHERE rl.status IN ('due','partial','overdue','arrears') AND (rl.rent_due - rl.rent_received) > 0`
    );
    const ids = rows.map((r) => r.property_id).filter(Boolean);
    return ids.length ? { id: { [Op.in]: ids } } : { id: 0 };
  }
  if (tab === 'expiring') {
    const soon = new Date(); soon.setDate(soon.getDate() + 60);
    const [rows] = await sequelize.query(
      `SELECT DISTINCT t.property_id FROM tenancies t WHERE t.status = 'active' AND t.lease_end IS NOT NULL AND t.lease_end <= :soon`,
      { replacements: { soon: soon.toISOString().slice(0, 10) } }
    );
    const ids = rows.map((r) => r.property_id).filter(Boolean);
    return ids.length ? { id: { [Op.in]: ids } } : { id: 0 };
  }
  return {};
}

// ─── LIST (with tabs + tab_counts) ──────────────────────────────────────────

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const branchWhere = branchScope(req);
  const where = { ...branchWhere };

  // Search
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ title: { [Op.like]: s } }, { property_code: { [Op.like]: s } }, { area: { [Op.like]: s } }, { district: { [Op.like]: s } }];
  }
  // Category filter (for deals pages)
  if (req.query.category) where.category = req.query.category;
  if (req.query.listing_type) where.listing_type = req.query.listing_type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.owner_contact_id) where.owner_contact_id = req.query.owner_contact_id;
  if (req.query.tenant_contact_id) where.tenant_contact_id = req.query.tenant_contact_id;

  // Tab filter
  const tabWhere = await tabFilter(req.query.tab, branchWhere);
  Object.assign(where, tabWhere);

  const { rows, count } = await Property.findAndCountAll({
    where, include: [ownerInc, tenantInc, managerInc], limit, offset,
    order: [['created_at', 'DESC']],
  });

  // Tab counts (lightweight)
  let tab_counts = undefined;
  if (req.query.include_counts === 'true') {
    const base = { ...branchWhere };
    const [activeC, rentalsC, salesC, vacanciesC, archivedC] = await Promise.all([
      Property.count({ where: { ...base, status: { [Op.in]: ['available', 'occupied', 'rented'] } } }),
      Property.count({ where: { ...base, listing_type: 'rent', tenant_contact_id: { [Op.not]: null } } }),
      Property.count({ where: { ...base, listing_type: 'sale' } }),
      Property.count({ where: { ...base, listing_type: 'rent', status: 'available' } }),
      Property.count({ where: { ...base, status: 'inactive' } }),
    ]);
    // Arrears + expiring counts via raw queries (same logic as tabFilter)
    const [arrRows] = await sequelize.query(`SELECT COUNT(DISTINCT rl.property_id) AS c FROM rental_ledger rl WHERE rl.status IN ('due','partial','overdue','arrears') AND (rl.rent_due - rl.rent_received) > 0`);
    const soon = new Date(); soon.setDate(soon.getDate() + 60);
    const [expRows] = await sequelize.query(`SELECT COUNT(DISTINCT t.property_id) AS c FROM tenancies t WHERE t.status = 'active' AND t.lease_end IS NOT NULL AND t.lease_end <= :soon`, { replacements: { soon: soon.toISOString().slice(0, 10) } });
    tab_counts = { active: activeC, rentals: rentalsC, sales: salesC, vacancies: vacanciesC, archived: archivedC, arrears: num(arrRows[0]?.c), expiring: num(expRows[0]?.c) };
  }

  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, tab_counts });
});

// ─── GET ONE (full property detail) ─────────────────────────────────────────

exports.getOne = asyncHandler(async (req, res) => {
  const p = await Property.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [ownerInc, tenantInc, managerInc, { model: PropertyMedia, as: 'media' }, { model: PropertyDocument, as: 'documents' }],
  });
  if (!p) return res.status(404).json({ error: 'Property not found.' });

  // Tenancies
  const tenancies = await Tenancy.findAll({
    where: { property_id: p.id },
    include: [
      { model: Contact, as: 'owner', attributes: contactAttrs },
      { model: Contact, as: 'tenant', attributes: contactAttrs },
    ],
    order: [['created_at', 'DESC']],
  });
  // Attach outstanding per tenancy
  const tenancyData = await Promise.all(tenancies.map(async (t) => {
    const json = t.toJSON();
    const [[agg]] = await sequelize.query(
      'SELECT COALESCE(SUM(rent_due - rent_received),0) AS outstanding FROM rental_ledger WHERE property_id = :pid AND status IN ("due","partial","overdue","arrears")',
      { replacements: { pid: t.property_id || 0 } }
    );
    json.outstanding = num(agg?.outstanding || 0);
    return json;
  }));

  // Owner profile + fees
  const ownerProfile = await PropertyOwnerProfile.findOne({
    where: { property_id: p.id },
    include: [{ model: Contact, as: 'contact', attributes: contactAttrs }],
  });
  const fees = ownerProfile
    ? await OwnerFeeSchedule.findAll({ where: { owner_profile_id: ownerProfile.id }, order: [['id', 'ASC']] })
    : [];

  // Owner financials
  const pid = p.id;
  const [[finIn]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS total FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'incoming' AND py.status = 'completed'`, { replacements: { pid } });
  const [[finOut]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS total FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'outgoing' AND py.status = 'completed'`, { replacements: { pid } });
  const [[billsPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS total FROM invoices WHERE property_id = :pid AND invoice_kind = 'provider' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
  const [[invPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS total FROM invoices WHERE property_id = :pid AND invoice_kind = 'client' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
  const financials = {
    money_in: num(finIn?.total), money_out: num(finOut?.total),
    bills_pending: num(billsPend?.total), invoices_pending: num(invPend?.total),
    balance: num(finIn?.total) - num(finOut?.total) - num(billsPend?.total),
  };

  // Recent activity (last 20 events)
  const [activity] = await sequelize.query(`
    (SELECT 'invoice' AS type, invoice_code AS code, title, status, created_at AS date FROM invoices WHERE property_id = :pid ORDER BY created_at DESC LIMIT 10)
    UNION ALL
    (SELECT 'payment' AS type, py.payment_code AS code, inv.title, py.status, py.paid_at AS date FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid ORDER BY py.paid_at DESC LIMIT 5)
    UNION ALL
    (SELECT 'inspection' AS type, inspection_code AS code, summary AS title, status, scheduled_date AS date FROM inspections WHERE property_id = :pid ORDER BY scheduled_date DESC LIMIT 5)
    ORDER BY date DESC LIMIT 20
  `, { replacements: { pid } });

  const communications = await Communication.findAll({
    where: { entity_type: 'property', entity_id: p.id },
    order: [['created_at', 'DESC']],
  });

  const registerEntries = await RegisterEntry.findAll({
    where: { property_id: p.id },
    order: [['created_at', 'DESC']],
  });

  const deals = await PropertyDeal.findAll({
    where: { property_id: p.id },
    include: [
      { model: Contact, as: 'owner', attributes: contactAttrs },
      { model: Contact, as: 'seller', attributes: contactAttrs },
      { model: Client, as: 'buyer', include: [{ model: Contact, attributes: contactAttrs }] },
    ],
    order: [['created_at', 'DESC']],
  });

  const [utilityBills, tenantRequests, arrearsActions, marketingActivities, expenseApprovals, propertyRisks, moveInChecklist] = await Promise.all([
    UtilityBill.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }).catch(() => []),
    TenantRequest.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }).catch(() => []),
    ArrearsAction.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }).catch(() => []),
    MarketingActivity.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }).catch(() => []),
    ExpenseApproval.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] }).catch(() => []),
    PropertyRisk.findAll({ where: { property_id: pid }, order: [['review_date', 'ASC'], ['created_at', 'DESC']] }).catch(() => []),
    MoveInChecklistItem.findAll({ where: { property_id: pid }, order: [['sort_order', 'ASC'], ['created_at', 'ASC']] }).catch(() => []),
  ]);

  // Lifecycle state + next-action + blockers + financial strip (Phase 2)
  let state = null;
  try { state = await computePropertyState(pid); } catch (e) { /* non-fatal */ }

  // Audit log for this property (last 20 changes across property + its tenancies)
  let auditLog = [];
  try {
    const tenancyIds = tenancies.map((t) => t.id).filter(Boolean);
    const ors = [{ entity: 'property', entity_id: pid }];
    if (tenancyIds.length) ors.push({ entity: 'tenancy', entity_id: { [Op.in]: tenancyIds } });
    auditLog = await AuditLog.findAll({
      where: { [Op.or]: ors },
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: 20,
    });
  } catch { /* audit optional — table may be missing */ }

  res.json({
    data: p, tenancies: tenancyData, ownerProfile, fees, financials, activity,
    communications, registerEntries, deals,
    utilityBills, tenantRequests, arrearsActions, marketingActivities, expenseApprovals, propertyRisks, moveInChecklist,
    state, auditLog,
  });
});

// Dedicated endpoint: refresh property state after any child mutation.
exports.getState = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  const state = await computePropertyState(p.id);
  res.json({ data: state });
});

// ─── CREATE / UPDATE / DELETE ───────────────────────────────────────────────

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.title || !data.category || !data.listing_type) return res.status(400).json({ error: 'title, category and listing_type are required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.property_code = await generateCode(Property, 'property_code', 'SSPC-PR-');

  // For managed rental properties, auto-spin up the rental-management workflow.
  // Caller can force/skip with manage_workflow=true|false (default: on for rentals).
  const manage = req.body.manage_workflow === undefined
    ? data.listing_type === 'rent'
    : req.body.manage_workflow === true;

  const result = await sequelize.transaction(async (tx) => {
    if (manage && !data.pm_status) data.pm_status = 'onboarding';
    const p = await Property.create(data, { transaction: tx });

    let project = null;
    if (manage) {
      project = await createLeasingProject(p, req, { transaction: tx });
      await p.update({ pm_project_id: project.id }, { transaction: tx });
      await seedOwnerOnboardingItems(p, p.owner_contact_id, null, { transaction: tx });
    }
    return { property: p, project };
  });

  res.status(201).json({
    data: result.property,
    pm_project_id: result.project?.id || null,
    message: result.project
      ? 'Property created. Rental-management workflow & onboarding checklist generated.'
      : 'Property created.',
  });
});

// ─── PM WORKFLOW (leasing project + stages) for a property ──────────────────
const arr = (v) => { if (Array.isArray(v)) return v; try { return JSON.parse(v || '[]'); } catch { return []; } };
exports.getPmWorkflow = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  let project = null;
  if (p.pm_project_id) project = await Project.findByPk(p.pm_project_id, { include: [{ model: ProjectStage, as: 'stages' }], order: [[{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']] });
  if (!project) project = await Project.findOne({ where: { property_id: p.id, vertical_key: 'leasing' }, include: [{ model: ProjectStage, as: 'stages' }], order: [['created_at', 'DESC'], [{ model: ProjectStage, as: 'stages' }, 'sort_order', 'ASC']] });
  if (project) {
    const o = project.toJSON();
    o.stages = (o.stages || []).map((s) => ({ ...s, checklist: arr(s.checklist) }));
    return res.json({ data: o });
  }
  res.json({ data: null });
});

// Create the PM workflow on demand (for properties created before this feature).
exports.startPmWorkflow = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  if (p.pm_project_id) return res.status(409).json({ error: 'A rental-management workflow already exists for this property.' });
  const result = await sequelize.transaction(async (tx) => {
    const project = await createLeasingProject(p, req, { transaction: tx });
    await p.update({ pm_project_id: project.id, pm_status: p.pm_status === 'not_managed' ? 'onboarding' : p.pm_status }, { transaction: tx });
    const existing = await OwnerOnboardingItem.count({ where: { property_id: p.id }, transaction: tx });
    if (!existing) await seedOwnerOnboardingItems(p, p.owner_contact_id, null, { transaction: tx });
    return project;
  });
  res.status(201).json({ data: { project_id: result.id }, message: 'Rental-management workflow started.' });
});

// ─── OWNER ONBOARDING CHECKLIST ─────────────────────────────────────────────
exports.getOnboardingItems = asyncHandler(async (req, res) => {
  const rows = await OwnerOnboardingItem.findAll({ where: { property_id: req.params.id }, order: [['sort_order', 'ASC']] });
  res.json({ data: rows });
});
exports.updateOnboardingItem = asyncHandler(async (req, res) => {
  const it = await OwnerOnboardingItem.findOne({ where: { id: req.params.itemId, property_id: req.params.id } });
  if (!it) return res.status(404).json({ error: 'Onboarding item not found.' });
  const patch = pick(req.body, ['status', 'evidence_url', 'responsible_id', 'notes', 'required', 'action_required']);
  if (patch.status === 'done' && it.status !== 'done') patch.completed_at = new Date();
  await it.update(patch);
  res.json({ data: it });
});

exports.update = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  await p.update(pick(req.body, FIELDS));
  res.json({ data: p, message: 'Property updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  await p.destroy();
  res.json({ message: 'Property deleted.' });
});

// ─── PROPERTY TENANCIES ─────────────────────────────────────────────────────

exports.propertyTenancies = asyncHandler(async (req, res) => {
  const rows = await Tenancy.findAll({
    where: { property_id: req.params.id },
    include: [
      { model: Contact, as: 'owner', attributes: contactAttrs },
      { model: Contact, as: 'tenant', attributes: contactAttrs },
    ],
    order: [['created_at', 'DESC']],
  });
  const data = await Promise.all(rows.map(async (t) => {
    const json = t.toJSON();
    const [[agg]] = await sequelize.query(
      'SELECT COALESCE(SUM(rent_due - rent_received),0) AS outstanding FROM rental_ledger WHERE property_id = :pid AND status IN ("due","partial","overdue","arrears")',
      { replacements: { pid: t.property_id || 0 } }
    );
    json.outstanding = num(agg?.outstanding || 0);
    return json;
  }));
  res.json({ data });
});

exports.createPropertyTenancy = asyncHandler(async (req, res) => {
  const p = await Property.findByPk(req.params.id);
  if (!p) return res.status(404).json({ error: 'Property not found.' });
  const TFIELDS = ['owner_contact_id', 'tenant_contact_id', 'lease_start', 'move_in_date', 'lease_end',
    'move_out_date', 'security_deposit', 'monthly_rent', 'service_charge', 'rent_due_day', 'payment_frequency', 'status', 'notes'];
  const data = pick(req.body, TFIELDS);
  data.property_id = p.id;
  data.branch_id = p.branch_id;
  if (!data.owner_contact_id) data.owner_contact_id = p.owner_contact_id;
  data.created_by = req.user?.id || null;
  data.tenancy_code = await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-');
  const result = await sequelize.transaction(async (tx) => {
    const t = await Tenancy.create(data, { transaction: tx });
    
    // Update parent property with active tenant and set status to occupied
    await p.update({
      tenant_contact_id: t.tenant_contact_id,
      owner_contact_id: t.owner_contact_id || p.owner_contact_id,
      status: 'occupied'
    }, { transaction: tx });

    const folios = await ensureFoliosForTenancy(t, { transaction: tx });
    if (folios.tenantFolio && Number(t.security_deposit || 0) > 0) {
      const depositCategory = await AccountCategory.findOne({ where: { code: 'DEPOSIT' }, transaction: tx });
      await postFolioTransaction({
        folio_id: folios.tenantFolio.id,
        transaction_type: 'charge',
        bucket: 'deposit',
        account_category_id: depositCategory?.id || null,
        property_id: t.property_id,
        tenancy_id: t.id,
        description: 'Security deposit held',
        debit: Number(t.security_deposit || 0),
        created_by: req.user?.id || null,
      }, { transaction: tx });
    }
    return { tenancy: t, folios };
  });
  res.status(201).json({ data: result.tenancy, folios: result.folios, message: 'Tenancy created.' });
});

// ─── PROPERTY FINANCIALS ────────────────────────────────────────────────────

exports.propertyFinancials = asyncHandler(async (req, res) => {
  const pid = req.params.id;
  const [[finIn]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS total FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'incoming' AND py.status = 'completed'`, { replacements: { pid } });
  const [[finOut]] = await sequelize.query(`SELECT COALESCE(SUM(py.amount),0) AS total FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid AND py.direction = 'outgoing' AND py.status = 'completed'`, { replacements: { pid } });
  const [[billsPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS total FROM invoices WHERE property_id = :pid AND invoice_kind = 'provider' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
  const [[invPend]] = await sequelize.query(`SELECT COALESCE(SUM(balance),0) AS total FROM invoices WHERE property_id = :pid AND invoice_kind = 'client' AND status NOT IN ('paid','cancelled')`, { replacements: { pid } });
  res.json({
    data: {
      money_in: num(finIn?.total), money_out: num(finOut?.total),
      bills_pending: num(billsPend?.total), invoices_pending: num(invPend?.total),
      balance: num(finIn?.total) - num(finOut?.total) - num(billsPend?.total),
    },
  });
});

// ─── UNIFIED DOCUMENTS ──────────────────────────────────────────────────────

exports.propertyDocuments = asyncHandler(async (req, res) => {
  const pid = req.params.id;
  // 1. Uploaded property documents
  const uploads = await PropertyDocument.findAll({ where: { property_id: pid }, order: [['created_at', 'DESC']] });
  const docs = uploads.map((d) => ({
    id: d.id, source: 'upload', title: d.title || d.file_name, date: d.created_at,
    file_url: d.file_url, icon_type: 'file', doc_type: d.doc_type,
  }));
  // 2. Invoices for this property
  const [invoices] = await sequelize.query(
    `SELECT id, invoice_code, title, status, total, created_at FROM invoices WHERE property_id = :pid ORDER BY created_at DESC LIMIT 50`,
    { replacements: { pid } }
  );
  invoices.forEach((inv) => docs.push({
    id: `inv-${inv.id}`, source: 'invoice', title: `Invoice ${inv.invoice_code} — ${inv.title || ''}`,
    date: inv.created_at, file_url: null, icon_type: 'invoice', status: inv.status, amount: inv.total,
  }));
  // 3. Payments/receipts
  const [payments] = await sequelize.query(
    `SELECT py.id, py.payment_code, py.amount, py.method, py.paid_at, inv.title FROM payments py JOIN invoices inv ON py.invoice_id = inv.id WHERE inv.property_id = :pid ORDER BY py.paid_at DESC LIMIT 50`,
    { replacements: { pid } }
  );
  payments.forEach((py) => docs.push({
    id: `pay-${py.id}`, source: 'payment', title: `Receipt ${py.payment_code}`,
    date: py.paid_at, file_url: null, icon_type: 'receipt', amount: py.amount,
  }));
  // 4. Inspection reports
  const [inspections] = await sequelize.query(
    `SELECT id, inspection_code, summary, status, report_url, scheduled_date FROM inspections WHERE property_id = :pid AND report_url IS NOT NULL ORDER BY scheduled_date DESC LIMIT 20`,
    { replacements: { pid } }
  );
  inspections.forEach((ins) => docs.push({
    id: `ins-${ins.id}`, source: 'inspection', title: `Inspection ${ins.inspection_code}`,
    date: ins.scheduled_date, file_url: ins.report_url, icon_type: 'inspection',
  }));
  // Sort by date desc
  docs.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  res.json({ data: docs });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  // For now accept JSON body with file_url (actual multipart upload can be added later)
  const { title, file_url, file_name, doc_type, is_private } = req.body;
  if (!file_url) return res.status(400).json({ error: 'file_url is required.' });
  const doc = await PropertyDocument.create({
    property_id: req.params.id, doc_type: doc_type || 'other',
    title: title || file_name || 'Document', file_url, file_name: file_name || title,
    is_private: is_private !== false, uploaded_by: req.user?.id || null,
  });
  res.status(201).json({ data: doc, message: 'Document uploaded.' });
});

// ─── OWNER PROFILE (KYC + banking) ─────────────────────────────────────────

const PROFILE_FIELDS = [
  'contact_id', 'nid_number', 'tin_number', 'passport_number', 'nid_front_url', 'nid_back_url',
  'bank_name', 'bank_branch', 'bank_account_name', 'bank_account_number', 'bank_routing_number',
  'bkash_number', 'nagad_number', 'preferred_payment',
  'disbursement_frequency', 'disbursement_day', 'next_disbursement_date', 'opening_balance', 'notes',
  // Owner Master Register + SOP onboarding fields
  'owner_type', 'ownership_status', 'current_address', 'property_address', 'district',
  'bank_details_collected', 'lawful_authority_confirmed', 'joint_consent_collected', 'poa_verified',
  'tax_responsibility_ack', 'owner_obligations_accepted', 'indemnity_accepted', 'management_commission',
  'onboarding_fee', 'maintenance_responsibility', 'assigned_officer_id', 'next_action', 'next_follow_up',
  'agreement_status', 'onboarding_status',
];

exports.getOwnerProfile = asyncHandler(async (req, res) => {
  const profile = await PropertyOwnerProfile.findOne({
    where: { property_id: req.params.id },
    include: [{ model: Contact, as: 'contact', attributes: contactAttrs }],
  });
  const fees = profile
    ? await OwnerFeeSchedule.findAll({ where: { owner_profile_id: profile.id }, order: [['id', 'ASC']] })
    : [];
  res.json({ data: profile, fees });
});

exports.saveOwnerProfile = asyncHandler(async (req, res) => {
  const data = pick(req.body, PROFILE_FIELDS);
  data.property_id = parseInt(req.params.id, 10);
  if (!data.contact_id) return res.status(400).json({ error: 'contact_id is required.' });

  let profile = await PropertyOwnerProfile.findOne({ where: { property_id: data.property_id } });
  if (profile) {
    await profile.update(data);
  } else {
    profile = await PropertyOwnerProfile.create(data);
  }

  // Update parent property owner_contact_id
  const p = await Property.findByPk(data.property_id);
  if (p) {
    await p.update({ owner_contact_id: data.contact_id });
  }

  // Save fees if provided
  if (Array.isArray(req.body.fees)) {
    // Remove old fees and re-create (simple replace strategy)
    await OwnerFeeSchedule.destroy({ where: { owner_profile_id: profile.id } });
    for (const f of req.body.fees) {
      await OwnerFeeSchedule.create({
        property_id: data.property_id, owner_profile_id: profile.id,
        fee_name: f.fee_name, fee_category: f.fee_category || null,
        fee_trigger: f.fee_trigger || 'manual', amount_type: f.amount_type || 'percentage',
        amount_value: num(f.amount_value), notes: f.notes || null, is_active: f.is_active !== false,
      });
    }
  }

  const fresh = await PropertyOwnerProfile.findByPk(profile.id, { include: [{ model: Contact, as: 'contact', attributes: contactAttrs }] });
  const fees = await OwnerFeeSchedule.findAll({ where: { owner_profile_id: profile.id }, order: [['id', 'ASC']] });
  res.json({ data: fresh, fees, message: 'Owner profile saved.' });
});

// ─── FEE SCHEDULE ───────────────────────────────────────────────────────────

exports.addFee = asyncHandler(async (req, res) => {
  const profile = await PropertyOwnerProfile.findOne({ where: { property_id: req.params.id } });
  if (!profile) return res.status(400).json({ error: 'Create an owner profile first.' });
  const fee = await OwnerFeeSchedule.create({
    property_id: parseInt(req.params.id, 10), owner_profile_id: profile.id,
    fee_name: req.body.fee_name, fee_category: req.body.fee_category || null,
    fee_trigger: req.body.fee_trigger || 'manual', amount_type: req.body.amount_type || 'percentage',
    amount_value: num(req.body.amount_value), notes: req.body.notes || null,
  });
  res.status(201).json({ data: fee, message: 'Fee added.' });
});

exports.removeFee = asyncHandler(async (req, res) => {
  const fee = await OwnerFeeSchedule.findByPk(req.params.feeId);
  if (!fee) return res.status(404).json({ error: 'Fee not found.' });
  await fee.destroy();
  res.json({ message: 'Fee removed.' });
});

// ── PROPERTY COMMUNICATIONS ──────────────────────────────────────────────────
exports.propertyCommunications = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });

  const comms = await Communication.findAll({
    where: { entity_type: 'property', entity_id: p.id },
    order: [['created_at', 'DESC']],
  });
  res.json({ data: comms });
});

exports.createPropertyCommunication = asyncHandler(async (req, res) => {
  const p = await Property.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Property not found.' });

  const comm = await Communication.create({
    branch_id: p.branch_id,
    entity_type: 'property',
    entity_id: p.id,
    ...pick(req.body, ['channel', 'direction', 'subject', 'body', 'occurred_at', 'follow_up_at']),
    user_id: req.user?.id || null,
  });
  res.status(201).json({ data: comm, message: 'Communication logged.' });
});
