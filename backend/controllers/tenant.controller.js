/**
 * tenant.controller.js
 * ------------------------------------------------------------------
 * Tenant portal endpoints under /api/tenant/*.
 * Every response is strictly scoped to the logged-in tenant — they can
 * only see their own tenancy, invoices, receipts, work orders, docs.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const PropertyDocument = require('../models/PropertyDocument');
const Tenancy = require('../models/Tenancy');
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const Payment = require('../models/Payment');
const RentalLedger = require('../models/RentalLedger');
const Folio = require('../models/Folio');
const WorkOrder = require('../models/WorkOrder');
const Communication = require('../models/Communication');
const BondDepositRecord = require('../models/BondDepositRecord');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);

async function resolveTenantContactId(user) {
  const client = await Client.findOne({ where: { portal_user_id: user.id } });
  return client?.contact_id || null;
}

/** Guard middleware — role='tenant' AND linked contact required. */
const requireTenant = asyncHandler(async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'tenant') return res.status(403).json({ error: 'Tenant access only' });
  const tenantContactId = await resolveTenantContactId(req.user);
  if (!tenantContactId) return res.status(403).json({ error: 'Portal not linked to a tenant record. Contact Seventh Sky to enable your account.' });
  req.tenantContactId = tenantContactId;
  next();
});
exports.requireTenant = requireTenant;

/** Resolve the tenant's current (or most recent) tenancy. Returns null if none. */
async function findMyTenancy(tenantContactId, { activeOnly = false } = {}) {
  const where = { tenant_contact_id: tenantContactId };
  if (activeOnly) where.status = 'active';
  return Tenancy.findOne({ where, order: [['status', 'ASC'], ['lease_start', 'DESC'], ['created_at', 'DESC']] });
}

// ─── GET /api/tenant/me — profile + metrics ─────────────────────────────────
exports.me = asyncHandler(async (req, res) => {
  const contact = await Contact.findByPk(req.tenantContactId, { attributes: ['id', 'full_name', 'primary_phone', 'email'] });
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  const property = tenancy?.property_id ? await Property.findByPk(tenancy.property_id, { attributes: ['id', 'title', 'property_code', 'address', 'area', 'district'] }) : null;

  // Metrics: outstanding balance + next rent due + deposit + open WOs
  const [[out]] = await sequelize.query(
    `SELECT COALESCE(SUM(balance),0) AS b FROM invoices WHERE contact_id = :c AND invoice_kind = 'client' AND status NOT IN ('paid','cancelled','voided')`,
    { replacements: { c: req.tenantContactId } }
  );
  const [[nextRent]] = tenancy ? await sequelize.query(
    `SELECT due_date, (rent_due - rent_received) AS outstanding, period_label
       FROM rental_ledger WHERE tenant_contact_id = :c AND (rent_due - rent_received) > 0
       ORDER BY due_date ASC LIMIT 1`,
    { replacements: { c: req.tenantContactId } }
  ) : [[]];
  const [[deposit]] = tenancy ? await sequelize.query(
    `SELECT COALESCE(SUM(security_deposit_received + advance_rent_received),0) AS d
       FROM bond_deposit_records WHERE tenancy_id = :t`,
    { replacements: { t: tenancy.id } }
  ) : [[]];
  const openWos = tenancy ? await WorkOrder.count({ where: { property_id: tenancy.property_id, status: ['draft', 'issued', 'accepted', 'in_progress'] } }) : 0;

  res.json({
    data: {
      contact,
      active_tenancy: tenancy,
      property,
      metrics: {
        outstanding: num(out?.b),
        next_rent_due: nextRent || null,
        deposit_held: num(deposit?.d || tenancy?.security_deposit),
        open_work_orders: openWos,
        lease_end: tenancy?.lease_end || null,
      },
    },
  });
});

// ─── GET /api/tenant/tenancy — current tenancy full detail ──────────────────
exports.myTenancy = asyncHandler(async (req, res) => {
  const t = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!t) return res.json({ data: null });
  const property = await Property.findByPk(t.property_id, { attributes: ['id', 'title', 'property_code', 'address', 'area', 'district', 'bedrooms', 'bathrooms', 'access_contact', 'featured_image_url'] });
  const bond = await BondDepositRecord.findOne({ where: { tenancy_id: t.id } });
  res.json({ data: { tenancy: t, property, bond } });
});

// ─── GET /api/tenant/invoices ───────────────────────────────────────────────
exports.invoices = asyncHandler(async (req, res) => {
  const rows = await PropertyInvoice.findAll({
    where: { contact_id: req.tenantContactId, invoice_kind: 'client' },
    order: [['due_date', 'ASC'], ['created_at', 'DESC']],
    limit: 200,
  });
  res.json({ data: rows });
});

exports.invoiceDetail = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({
    where: { id: req.params.id, contact_id: req.tenantContactId, invoice_kind: 'client' },
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found or not yours.' });
  const items = await InvoiceItem.findAll({ where: { invoice_id: inv.id }, order: [['sort_order', 'ASC']] });
  const payments = await Payment.findAll({ where: { invoice_id: inv.id }, order: [['paid_at', 'DESC']] });
  res.json({ data: { invoice: inv, items, payments } });
});

// ─── GET /api/tenant/receipts — payments I've made ──────────────────────────
exports.receipts = asyncHandler(async (req, res) => {
  const [rows] = await sequelize.query(
    `SELECT py.id, py.payment_code, py.amount, py.method, py.reference, py.paid_at, py.status,
            inv.invoice_code, inv.title AS invoice_title
       FROM payments py
       JOIN invoices inv ON py.invoice_id = inv.id
      WHERE inv.contact_id = :c AND inv.invoice_kind = 'client'
      ORDER BY py.paid_at DESC LIMIT 200`,
    { replacements: { c: req.tenantContactId } }
  );
  res.json({ data: rows });
});

// ─── POST /api/tenant/payment-proof ─────────────────────────────────────────
// Records a tenant-submitted proof of payment. Staff must reconcile before it
// becomes a real Payment (Phase 8 will formalise). For now: logged as a
// Communication + optional file_url so it shows in the property manager's inbox.
exports.submitPaymentProof = asyncHandler(async (req, res) => {
  const { amount, method, reference, paid_at, notes, evidence_url, invoice_ids } = req.body || {};
  if (!amount || !method) return res.status(400).json({ error: 'amount and method required.' });
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.status(400).json({ error: 'No active tenancy on file.' });

  const body = [
    `Amount: BDT ${Number(amount).toLocaleString()}`,
    `Method: ${method}`,
    reference ? `Reference: ${reference}` : null,
    paid_at ? `Paid at: ${paid_at}` : null,
    Array.isArray(invoice_ids) && invoice_ids.length ? `Invoice(s): ${invoice_ids.join(', ')}` : null,
    notes ? `Notes: ${notes}` : null,
    evidence_url ? `Evidence: ${evidence_url}` : null,
  ].filter(Boolean).join('\n');

  const comm = await Communication.create({
    branch_id: tenancy.branch_id,
    entity_type: 'property',
    entity_id: tenancy.property_id,
    channel: 'note',
    direction: 'inbound',
    subject: `Payment proof from tenant · BDT ${Number(amount).toLocaleString()}`,
    body,
    user_id: req.user.id,
  });
  res.status(201).json({ data: comm, message: 'Payment proof submitted. Your property manager will review and reconcile it.' });
});

// ─── WORK ORDERS (maintenance requests) ─────────────────────────────────────
exports.myWorkOrders = asyncHandler(async (req, res) => {
  const tenancy = await findMyTenancy(req.tenantContactId);
  if (!tenancy) return res.json({ data: [] });
  const rows = await WorkOrder.findAll({
    where: { property_id: tenancy.property_id },
    order: [['created_at', 'DESC']],
    limit: 100,
  });
  res.json({ data: rows });
});

exports.submitWorkOrder = asyncHandler(async (req, res) => {
  const { title, scope, before_photos, severity, category } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title required.' });
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.status(400).json({ error: 'No active tenancy on file.' });
  const wo = await WorkOrder.create({
    branch_id: tenancy.branch_id,
    work_order_code: await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-'),
    property_id: tenancy.property_id,
    title,
    scope: scope || null,
    status: 'draft',
    severity: severity || 'normal',
    category: category || 'general',
    reported_by_type: 'tenant',
    reported_by_contact_id: req.tenantContactId,
    tenant_visible_status: 'submitted',
    before_photos: Array.isArray(before_photos) ? before_photos : [],
    notes: `Submitted by tenant #${req.tenantContactId} via portal.`,
    created_by: req.user.id,
  });
  // Log a Communication so the manager sees it in the property timeline
  await Communication.create({
    branch_id: tenancy.branch_id,
    entity_type: 'property', entity_id: tenancy.property_id,
    channel: 'note', direction: 'inbound',
    subject: `Maintenance request: ${title} · ${severity || 'normal'}`,
    body: scope || 'See work order.',
    user_id: req.user.id,
  });
  res.status(201).json({ data: wo, message: 'Maintenance request submitted. Your property manager will triage it.' });
});

// ─── DOCUMENTS shared with tenant ───────────────────────────────────────────
exports.documents = asyncHandler(async (req, res) => {
  const tenancy = await findMyTenancy(req.tenantContactId);
  if (!tenancy) return res.json({ data: [] });
  const docs = await PropertyDocument.findAll({
    where: { property_id: tenancy.property_id, is_private: false },
    order: [['created_at', 'DESC']],
  });
  res.json({ data: docs });
});

// ─── VACANCY NOTICE — real VacancyNotice + property timeline log ────────────
const { submitVacancyNotice: submitVN } = require('../services/tenancyLifecycle.service');
exports.submitVacancyNotice = asyncHandler(async (req, res) => {
  const { intended_vacate_date, reason, notes } = req.body || {};
  if (!intended_vacate_date) return res.status(400).json({ error: 'intended_vacate_date required.' });
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.status(400).json({ error: 'No active tenancy on file.' });

  const vn = await submitVN({
    tenancy_id: tenancy.id, intended_vacate_date, reason, notes,
    submitted_by_type: 'tenant', user_id: req.user.id,
  });

  // Also log a Communication for the property timeline
  await Communication.create({
    branch_id: tenancy.branch_id,
    entity_type: 'property', entity_id: tenancy.property_id,
    channel: 'note', direction: 'inbound',
    subject: `NOTICE TO VACATE — ${intended_vacate_date} (${vn.notice_code})`,
    body: [
      `Intended vacate date: ${intended_vacate_date}`,
      `Notice period: ${vn.notice_period_days} days · Required period met: ${vn.notice_period_met ? 'yes' : 'no'}`,
      reason ? `Reason: ${reason}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean).join('\n'),
    user_id: req.user.id,
  });

  res.status(201).json({ data: vn, message: `Notice to vacate ${vn.notice_code} submitted. Your property manager will confirm the exit inspection date.` });
});

// Tenant sees renewal offer (owner_approved state means it's now waiting on tenant)
exports.myRenewalOffer = asyncHandler(async (req, res) => {
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.json({ data: null });
  if (!['proposed', 'owner_approved', 'tenant_accepted', 'activated'].includes(tenancy.renewal_status)) {
    return res.json({ data: null });
  }
  res.json({
    data: {
      tenancy_id: tenancy.id,
      current_rent: Number(tenancy.monthly_rent),
      current_service: Number(tenancy.service_charge),
      current_lease_end: tenancy.lease_end,
      offer_rent: Number(tenancy.renewal_offer_rent),
      offer_service: Number(tenancy.renewal_offer_service),
      offer_lease_end: tenancy.renewal_offer_lease_end,
      status: tenancy.renewal_status,
      notes: tenancy.renewal_notes,
      proposed_at: tenancy.renewal_proposed_at,
      owner_approved_at: tenancy.renewal_owner_approved_at,
      tenant_accepted_at: tenancy.renewal_tenant_accepted_at,
    },
  });
});

// Tenant accepts the offer
const { tenantAcceptRenewal } = require('../services/tenancyLifecycle.service');
exports.acceptRenewal = asyncHandler(async (req, res) => {
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.status(400).json({ error: 'No active tenancy.' });
  try {
    const updated = await tenantAcceptRenewal(tenancy.id, { note: req.body?.note });
    res.json({ data: updated, message: 'Renewal accepted. Your property manager will finalise the paperwork.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── MESSAGES ───────────────────────────────────────────────────────────────
exports.messages = asyncHandler(async (req, res) => {
  const tenancy = await findMyTenancy(req.tenantContactId);
  if (!tenancy) return res.json({ data: [] });
  const rows = await Communication.findAll({
    where: { entity_type: 'property', entity_id: tenancy.property_id },
    order: [['occurred_at', 'DESC']],
    limit: 100,
  });
  res.json({ data: rows });
});

exports.sendMessage = asyncHandler(async (req, res) => {
  const { subject, body } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body required.' });
  const tenancy = await findMyTenancy(req.tenantContactId, { activeOnly: true });
  if (!tenancy) return res.status(400).json({ error: 'No active tenancy on file.' });
  const comm = await Communication.create({
    branch_id: tenancy.branch_id,
    entity_type: 'property', entity_id: tenancy.property_id,
    channel: 'note', direction: 'inbound',
    subject: subject || 'Message from tenant',
    body,
    user_id: req.user.id,
  });
  res.status(201).json({ data: comm, message: 'Message sent to your property manager.' });
});
