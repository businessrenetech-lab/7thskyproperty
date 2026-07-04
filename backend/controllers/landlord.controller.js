/**
 * landlord.controller.js
 * ------------------------------------------------------------------
 * Landlord (property owner) portal endpoints under /api/landlord/*.
 * Every response is strictly scoped to the logged-in user's own
 * owner_contact_id — landlords can never see other landlords' data.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const PropertyMedia = require('../models/PropertyMedia');
const PropertyDocument = require('../models/PropertyDocument');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const Tenancy = require('../models/Tenancy');
const { TenantApplication } = require('../models/TenantApplication');
const WorkOrder = require('../models/WorkOrder');
const OwnerStatement = require('../models/OwnerStatement');
const Communication = require('../models/Communication');
const OwnerOnboardingItem = require('../models/OwnerOnboardingItem');
const { asyncHandler, pick } = require('../utils/controllerHelpers');
const { computePropertyState } = require('../services/propertyState.service');

const num = (v) => Number(v || 0);

/**
 * Resolve owner_contact_id for the logged-in user. Landlords authenticate
 * with role='owner' (or 'landlord'). Their Contact record is linked via a
 * Client row with portal_user_id = user.id.
 */
async function resolveOwnerContactId(user) {
  const client = await Client.findOne({ where: { portal_user_id: user.id } });
  return client?.contact_id || null;
}

/** Guard middleware — only owners with a linked contact may reach these routes. */
const requireLandlord = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const allowed = ['owner', 'landlord'];
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Landlord access only' });
  const ownerContactId = await resolveOwnerContactId(req.user);
  if (!ownerContactId) {
    return res.status(403).json({
      error: 'Portal not linked to an owner record. Contact Seventh Sky to enable your account.',
    });
  }
  req.ownerContactId = ownerContactId;
  next();
});

/** Confirm the owner actually owns the given property before returning any detail. */
async function assertOwnedProperty(propertyId, ownerContactId) {
  const p = await Property.findByPk(propertyId);
  if (!p) return null;
  if (p.owner_contact_id !== ownerContactId) return null;
  return p;
}

exports.requireLandlord = requireLandlord;

// ─── GET /api/landlord/me — profile + summary metrics ───────────────────────
exports.me = asyncHandler(async (req, res) => {
  const contact = await Contact.findByPk(req.ownerContactId, { attributes: ['id', 'full_name', 'primary_phone', 'email'] });
  const props = await Property.findAll({ where: { owner_contact_id: req.ownerContactId }, attributes: ['id', 'listing_type', 'status', 'pm_status', 'approved_monthly_rent'] });
  const propIds = props.map((p) => p.id);
  const activeTenancies = await Tenancy.count({ where: { owner_contact_id: req.ownerContactId, status: 'active' } });

  // Approvals waiting on me
  const [[appsWaiting]] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM tenant_applications
      WHERE property_id IN (:pids) AND status = 'awaiting_owner_approval'`,
    { replacements: { pids: propIds.length ? propIds : [0] } }
  );
  const [[unsentStmts]] = await sequelize.query(
    `SELECT COUNT(*) AS c FROM owner_statements WHERE owner_contact_id = :o AND status = 'ready' AND sent_at IS NULL`,
    { replacements: { o: req.ownerContactId } }
  );

  res.json({
    data: {
      contact,
      metrics: {
        total_properties: props.length,
        active_tenancies: activeTenancies,
        rental_properties: props.filter((p) => p.listing_type === 'rent').length,
        approvals_waiting: num(appsWaiting?.c),
        unsent_statements: num(unsentStmts?.c),
      },
    },
  });
});

// ─── GET /api/landlord/portfolio — property list with per-property KPIs ────
exports.portfolio = asyncHandler(async (req, res) => {
  const properties = await Property.findAll({
    where: { owner_contact_id: req.ownerContactId },
    attributes: ['id', 'property_code', 'title', 'address', 'area', 'district', 'listing_type', 'status', 'pm_status', 'rental_readiness_status', 'approved_monthly_rent', 'featured_image_url'],
  });
  const propIds = properties.map((p) => p.id);
  if (!propIds.length) return res.json({ data: [] });

  // Per-property KPIs computed in one query each — small property counts, few rows.
  const [tenancies] = await sequelize.query(
    `SELECT property_id, id, tenancy_code, status, monthly_rent, lease_end,
            (SELECT full_name FROM contacts WHERE id = tenancies.tenant_contact_id) AS tenant_name
       FROM tenancies WHERE property_id IN (:pids) AND status = 'active'`,
    { replacements: { pids: propIds } }
  );
  const [rentThisMonth] = await sequelize.query(
    `SELECT rl.property_id, COALESCE(SUM(rl.rent_received),0) AS collected,
            COALESCE(SUM(rl.rent_due - rl.rent_received),0) AS outstanding
       FROM rental_ledger rl
      WHERE rl.property_id IN (:pids)
        AND rl.period_label = DATE_FORMAT(CURDATE(), '%Y-%m')
      GROUP BY rl.property_id`,
    { replacements: { pids: propIds } }
  );
  const [openWos] = await sequelize.query(
    `SELECT property_id, COUNT(*) AS c FROM work_orders
      WHERE property_id IN (:pids) AND status IN ('draft','issued','accepted','in_progress')
      GROUP BY property_id`,
    { replacements: { pids: propIds } }
  );
  const [openApps] = await sequelize.query(
    `SELECT property_id, COUNT(*) AS c FROM tenant_applications
      WHERE property_id IN (:pids)
        AND status IN ('submitted','screening','verification','awaiting_documents','awaiting_owner_approval')
      GROUP BY property_id`,
    { replacements: { pids: propIds } }
  );

  const byId = (rows, key = 'property_id') => rows.reduce((a, r) => { a[r[key]] = r; return a; }, {});
  const tenById = byId(tenancies);
  const rentById = byId(rentThisMonth);
  const woById = byId(openWos);
  const appById = byId(openApps);

  const data = properties.map((p) => {
    const t = tenById[p.id];
    const r = rentById[p.id];
    return {
      ...p.toJSON(),
      active_tenant: t ? { tenant_name: t.tenant_name, monthly_rent: num(t.monthly_rent), lease_end: t.lease_end, tenancy_code: t.tenancy_code } : null,
      rent_this_month: {
        collected: num(r?.collected),
        outstanding: num(r?.outstanding),
      },
      open_work_orders: num(woById[p.id]?.c),
      open_applications: num(appById[p.id]?.c),
    };
  });
  res.json({ data });
});

// ─── GET /api/landlord/properties/:id — owner-scoped property detail ────────
exports.propertyDetail = asyncHandler(async (req, res) => {
  const p = await assertOwnedProperty(req.params.id, req.ownerContactId);
  if (!p) return res.status(404).json({ error: 'Property not found or not yours.' });

  const [tenancies, media, state] = await Promise.all([
    Tenancy.findAll({ where: { property_id: p.id }, include: [{ model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] }], order: [['created_at', 'DESC']] }),
    PropertyMedia.findAll({ where: { property_id: p.id }, limit: 20 }),
    computePropertyState(p.id).catch(() => null),
  ]);

  res.json({
    data: {
      property: p,
      tenancies,
      media,
      state,
    },
  });
});

// ─── GET /api/landlord/statements ───────────────────────────────────────────
exports.listStatements = asyncHandler(async (req, res) => {
  const where = { owner_contact_id: req.ownerContactId };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  const rows = await OwnerStatement.findAll({
    where,
    include: [
      { model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'area', 'district'] },
    ],
    order: [['period_label', 'DESC'], ['created_at', 'DESC']],
  });
  res.json({ data: rows });
});

exports.getStatement = asyncHandler(async (req, res) => {
  const s = await OwnerStatement.findOne({
    where: { id: req.params.id, owner_contact_id: req.ownerContactId },
    include: [{ model: Property, as: 'property' }],
  });
  if (!s) return res.status(404).json({ error: 'Statement not found or not yours.' });
  res.json({ data: s });
});

// The staff printable HTML endpoint already exists; we proxy it after scoping.
const statementCtrl = require('./ownerStatement.controller');
exports.statementPrintable = asyncHandler(async (req, res, next) => {
  const s = await OwnerStatement.findOne({ where: { id: req.params.id, owner_contact_id: req.ownerContactId } });
  if (!s) return res.status(404).send('Statement not found or not yours.');
  // Delegate to the shared printable renderer (which does its own scope check
  // that will pass for admins; here we've already confirmed owner-scope).
  return statementCtrl.printable(req, res, next);
});

// ─── GET /api/landlord/approvals — items waiting on this owner ──────────────
exports.approvals = asyncHandler(async (req, res) => {
  // Properties owned by this landlord
  const ownedProps = await Property.findAll({ where: { owner_contact_id: req.ownerContactId }, attributes: ['id'] });
  const propIds = ownedProps.map((p) => p.id);

  const Tenancy = require('../models/Tenancy');
  const DepositSettlement = require('../models/DepositSettlement');
  const [appsWaiting, hiWos, renewalsWaiting, settlementsWaiting] = await Promise.all([
    // Tenant applications awaiting owner approval
    TenantApplication.findAll({
      where: { property_id: propIds.length ? propIds : [0], status: 'awaiting_owner_approval' },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
      order: [['created_at', 'ASC']],
    }),
    // Work orders awaiting owner approval (maintenance workflow — Phase 6)
    WorkOrder.findAll({
      where: { property_id: propIds.length ? propIds : [0], approval_status: 'pending_owner' },
      include: [{ model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] }],
      order: [['severity', 'ASC'], ['created_at', 'ASC']],
    }),
    // Renewal proposals awaiting owner approval (Phase 7)
    Tenancy.findAll({
      where: { property_id: propIds.length ? propIds : [0], renewal_status: 'proposed' },
      include: [{ model: Property, attributes: ['id', 'title', 'property_code'] }, { model: Contact, as: 'tenant', attributes: ['id', 'full_name'] }],
      order: [['renewal_proposed_at', 'ASC']],
    }),
    // Deposit settlements awaiting owner approval (Phase 7)
    DepositSettlement.findAll({
      where: { owner_contact_id: req.ownerContactId, status: 'pending_owner' },
      order: [['created_at', 'ASC']],
    }),
  ]);

  res.json({
    data: {
      applications: appsWaiting,
      work_orders: hiWos,
      renewals: renewalsWaiting,
      settlements: settlementsWaiting,
      total: appsWaiting.length + hiWos.length + renewalsWaiting.length + settlementsWaiting.length,
    },
  });
});

// ─── POST /api/landlord/approvals/renewal/:tenancyId/decide ────────────────
const lifecycle = require('../services/tenancyLifecycle.service');
exports.decideRenewal = asyncHandler(async (req, res) => {
  const t = await require('../models/Tenancy').findByPk(req.params.tenancyId);
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const prop = await assertOwnedProperty(t.property_id, req.ownerContactId);
  if (!prop) return res.status(403).json({ error: 'Not your tenancy.' });
  try {
    const updated = await lifecycle.decideRenewal(t.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Renewal ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── POST /api/landlord/approvals/settlement/:id/decide ────────────────────
exports.decideSettlement = asyncHandler(async (req, res) => {
  const DepositSettlement = require('../models/DepositSettlement');
  const s = await DepositSettlement.findByPk(req.params.id);
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  if (s.owner_contact_id !== req.ownerContactId) return res.status(403).json({ error: 'Not your settlement.' });
  try {
    const updated = await lifecycle.decideSettlement(s.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Settlement ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── POST /api/landlord/approvals/work-order/:id/decide ─────────────────────
const maintenance = require('../services/maintenanceWorkflow.service');
exports.decideWorkOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, note } = req.body || {};
  const wo = await WorkOrder.findByPk(id);
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const prop = await assertOwnedProperty(wo.property_id, req.ownerContactId);
  if (!prop) return res.status(403).json({ error: 'Not your work order.' });
  try {
    const updated = await maintenance.decide(wo.id, { decision, note });
    res.json({ data: updated, message: `Work order ${decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── POST /api/landlord/approvals/application/:id/decide ────────────────────
exports.decideApplication = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected', 'hold'].includes(decision)) return res.status(400).json({ error: 'decision must be approved|rejected|hold' });

  const app = await TenantApplication.findByPk(id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  const prop = await assertOwnedProperty(app.property_id, req.ownerContactId);
  if (!prop) return res.status(403).json({ error: 'Not your application.' });

  const status = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'awaiting_owner_approval';
  await app.update({ owner_decision: decision, status, notes: [app.notes, note && `Owner: ${note}`].filter(Boolean).join('\n') });
  res.json({ data: app, message: `Application ${decision}.` });
});

// ─── GET /api/landlord/documents — documents visible to owner ───────────────
exports.documents = asyncHandler(async (req, res) => {
  const props = await Property.findAll({ where: { owner_contact_id: req.ownerContactId }, attributes: ['id'] });
  const propIds = props.map((p) => p.id);
  if (!propIds.length) return res.json({ data: [] });

  const docs = await PropertyDocument.findAll({
    where: { property_id: propIds, is_private: false },
    order: [['created_at', 'DESC']],
    limit: 200,
  });
  res.json({ data: docs });
});

// ─── GET /api/landlord/messages/:property_id? — comms for one property ──────
exports.messages = asyncHandler(async (req, res) => {
  let where = { entity_type: 'property' };
  if (req.params.property_id) {
    const prop = await assertOwnedProperty(req.params.property_id, req.ownerContactId);
    if (!prop) return res.status(403).json({ error: 'Not your property.' });
    where.entity_id = prop.id;
  } else {
    const props = await Property.findAll({ where: { owner_contact_id: req.ownerContactId }, attributes: ['id'] });
    where.entity_id = props.map((p) => p.id);
    if (!where.entity_id.length) return res.json({ data: [] });
  }
  const rows = await Communication.findAll({ where, order: [['occurred_at', 'DESC']], limit: 200 });
  res.json({ data: rows });
});

// ─── POST /api/landlord/messages — send a message to staff for a property ──
exports.sendMessage = asyncHandler(async (req, res) => {
  const { property_id, body, subject } = req.body || {};
  if (!property_id || !body) return res.status(400).json({ error: 'property_id and body required.' });
  const prop = await assertOwnedProperty(property_id, req.ownerContactId);
  if (!prop) return res.status(403).json({ error: 'Not your property.' });

  const c = await Communication.create({
    branch_id: prop.branch_id,
    entity_type: 'property',
    entity_id: prop.id,
    channel: 'note',
    direction: 'inbound',
    subject: subject || 'Message from owner',
    body,
    user_id: req.user.id,
  });
  res.status(201).json({ data: c, message: 'Message sent to your property manager.' });
});

// ─── GET /api/landlord/onboarding/:property_id — owner-scoped checklist ────
exports.onboarding = asyncHandler(async (req, res) => {
  const prop = await assertOwnedProperty(req.params.property_id, req.ownerContactId);
  if (!prop) return res.status(403).json({ error: 'Not your property.' });
  const items = await OwnerOnboardingItem.findAll({ where: { property_id: prop.id }, order: [['sort_order', 'ASC']] });
  res.json({ data: items });
});
