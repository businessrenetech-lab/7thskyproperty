/**
 * careWorkOrder.controller.js — Property Care service work orders.
 * Auto-prices from the catalog fee split, matches verified providers by
 * capability + territory, and tracks the job through delivery → invoice.
 */
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const CareWorkOrder = require('../models/CareWorkOrder');
const CareEnquiry = require('../models/CareEnquiry');
const ServiceItem = require('../models/ServiceItem');
const ServiceProvider = require('../models/ServiceProvider');
const ProviderCapability = require('../models/ProviderCapability');
const Contact = require('../models/Contact');
const PropertyInvoice = require('../models/PropertyInvoice');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const FIELDS = ['vertical', 'service_id', 'category_id', 'service_name', 'customer_contact_id', 'customer_name', 'customer_phone',
  'site_address', 'district', 'city', 'property_id', 'tenancy_id', 'source_type', 'enquiry_id', 'scope', 'requested_date',
  'scheduled_date', 'delivery_mode', 'assigned_provider_id', 'service_value', 'materials_cost', 'notes'];

// Compute Seventh Sky fee + provider charge from a service's fee split.
function priceFrom(service, serviceValue, materialsCost = 0) {
  const sv = num(serviceValue);
  const fee = service.sspc_fee_type === 'percentage' ? (sv * num(service.sspc_fee_value)) / 100 : num(service.sspc_fee_value);
  let provider;
  if (service.provider_pay_type === 'percentage') provider = (sv * num(service.provider_pay_value)) / 100;
  else if (service.provider_pay_type === 'fixed') provider = num(service.provider_pay_value);
  else provider = Math.max(0, sv - fee - num(materialsCost)); // remainder
  return { sspc_fee: Math.round(fee * 100) / 100, provider_charge: Math.round(provider * 100) / 100 };
}

const inc = [
  { model: Contact, as: 'customer', attributes: ['id', 'full_name', 'primary_phone'] },
  { model: ServiceItem, as: 'service', attributes: ['id', 'name', 'fee_model', 'unit'] },
  { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name', 'folio_id'] },
];

// ─── LIST ───────────────────────────────────────────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.assigned_provider_id) where.assigned_provider_id = req.query.assigned_provider_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.payment_status) where.payment_status = req.query.payment_status;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ work_order_code: { [Op.like]: s } }, { customer_name: { [Op.like]: s } }, { service_name: { [Op.like]: s } }];
  }
  const { rows, count } = await CareWorkOrder.findAndCountAll({ where, include: inc, limit, offset, order: [['created_at', 'DESC']] });
  // status counts
  const grp = await CareWorkOrder.findAll({ where: branchScope(req), attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['status'], raw: true });
  const status_counts = grp.reduce((a, r) => { a[r.status] = Number(r.c); return a; }, {});
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, status_counts });
});

exports.getOne = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: inc });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  res.json({ data: wo });
});

// ─── CREATE (auto-price) ────────────────────────────────────────────────────
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.work_order_code = await generateCode(CareWorkOrder, 'work_order_code', 'SSPC-SWO-');
  data.requested_date = data.requested_date || new Date().toISOString().slice(0, 10);

  if (data.service_id) {
    const service = await ServiceItem.findByPk(data.service_id);
    if (service) {
      data.service_name = data.service_name || service.name;
      data.category_id = data.category_id || service.category_id;
      data.vertical = data.vertical || service.vertical;
      if (!data.service_value && num(service.base_price) > 0) data.service_value = num(service.base_price);
      const p = priceFrom(service, data.service_value, data.materials_cost);
      data.sspc_fee = p.sspc_fee; data.provider_charge = p.provider_charge;
      data.status = num(data.service_value) > 0 ? 'priced' : 'draft';
    }
  }
  const wo = await CareWorkOrder.create(data);
  const fresh = await CareWorkOrder.findByPk(wo.id, { include: inc });
  res.status(201).json({ data: fresh, message: `Work order ${wo.work_order_code} created.` });
});

// ─── UPDATE (re-price on value/service change) ──────────────────────────────
exports.update = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const data = pick(req.body, FIELDS);
  const sid = data.service_id || wo.service_id;
  if (sid && (data.service_value != null || data.service_id || data.materials_cost != null)) {
    const service = await ServiceItem.findByPk(sid);
    if (service) {
      const p = priceFrom(service, data.service_value ?? wo.service_value, data.materials_cost ?? wo.materials_cost);
      data.sspc_fee = p.sspc_fee; data.provider_charge = p.provider_charge;
    }
  }
  await wo.update(data);
  const fresh = await CareWorkOrder.findByPk(wo.id, { include: inc });
  res.json({ data: fresh, message: 'Work order updated.' });
});

// ─── PROVIDER MATCHING ──────────────────────────────────────────────────────
// GET /api/care/work-orders/:id/matches   or   ?category_id=&district=
exports.matchProviders = asyncHandler(async (req, res) => {
  let categoryId = req.query.category_id;
  let district = req.query.district;
  if (req.params.id) {
    const wo = await CareWorkOrder.findByPk(req.params.id);
    if (!wo) return res.status(404).json({ error: 'Work order not found.' });
    categoryId = categoryId || wo.category_id;
    district = district || wo.district;
  }

  const providers = await ServiceProvider.findAll({
    where: {
      ...branchScope(req),
      onboarding_stage: 'active', agreement_status: 'signed',
    },
    include: [{ model: ProviderCapability, as: 'capabilities', attributes: ['category_id'] }],
    order: [['rating', 'DESC']],
  });

  const matches = providers.map((p) => {
    const caps = (p.capabilities || []).map((c) => c.category_id);
    const capable = !categoryId || caps.includes(Number(categoryId));
    const provDistricts = Array.isArray(p.districts) ? p.districts : [];
    const territoryOk = !district || !provDistricts.length || provDistricts.map((d) => String(d).toLowerCase()).includes(String(district).toLowerCase());
    const cumillaBlock = district && String(district).toLowerCase().includes('cumilla') && p.cumilla_restricted;
    return {
      id: p.id, company_name: p.company_name, contact_person: p.contact_person, phone: p.phone,
      rating: p.rating, provider_type: p.provider_type, folio_id: p.folio_id,
      capable, territory_ok: territoryOk && !cumillaBlock,
      eligible: capable && territoryOk && !cumillaBlock,
    };
  }).sort((a, b) => (b.eligible - a.eligible) || (num(b.rating) - num(a.rating)));

  res.json({ data: matches, eligible_count: matches.filter((m) => m.eligible).length });
});

// ─── ASSIGN provider ────────────────────────────────────────────────────────
exports.assign = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const providerId = req.body.assigned_provider_id;
  if (req.body.delivery_mode === 'internal') {
    await wo.update({ delivery_mode: 'internal', assigned_provider_id: null, status: wo.status === 'draft' ? wo.status : 'assigned' });
    return res.json({ data: wo, message: 'Assigned to internal team.' });
  }
  const provider = await ServiceProvider.findByPk(providerId);
  if (!provider) return res.status(404).json({ error: 'Provider not found.' });
  if (provider.onboarding_stage !== 'active' || provider.agreement_status !== 'signed') {
    return res.status(400).json({ error: 'Provider must be active with a signed agreement before assignment.' });
  }
  await wo.update({ assigned_provider_id: provider.id, delivery_mode: 'provider', status: 'assigned' });
  const fresh = await CareWorkOrder.findByPk(wo.id, { include: inc });
  res.json({ data: fresh, message: `Assigned to ${provider.company_name}.` });
});

// Create a client invoice for a work order (shared by manual + auto invoice).
async function raiseInvoiceForWO(wo, userId) {
  if (wo.invoice_id || num(wo.service_value) <= 0) return null;
  const invoice = await PropertyInvoice.create({
    branch_id: wo.branch_id,
    invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
    invoice_kind: 'client', invoice_type: 'service',
    contact_id: wo.customer_contact_id, property_id: wo.property_id,
    billed_to_type: 'tenant', service_for: 'property',
    title: `${wo.service_name || 'Service'} — ${wo.work_order_code}`,
    subtotal: num(wo.service_value), total: num(wo.service_value), balance: num(wo.service_value),
    amount_paid: 0, status: 'sent', issue_date: new Date(),
    notes: `Property Care service · ${wo.work_order_code}`, created_by: userId || null,
  });
  await wo.update({ invoice_id: invoice.id, status: wo.status === 'closed' ? wo.status : 'invoiced', payment_status: 'invoiced' });
  return invoice;
}

// ─── STATUS TRANSITION (auto-invoices on completion) ────────────────────────
exports.setStatus = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  const status = req.body.status;
  const patch = { status };
  if (status === 'completed') patch.completed_date = new Date().toISOString().slice(0, 10);
  if (status === 'scheduled' && req.body.scheduled_date) patch.scheduled_date = req.body.scheduled_date;
  await wo.update(patch);

  // Billing automation: auto-raise the client invoice on completion.
  let autoInvoiced = false;
  if (status === 'completed' && !wo.invoice_id && num(wo.service_value) > 0 && req.body.auto_invoice !== false) {
    const inv = await raiseInvoiceForWO(wo, req.user?.id);
    autoInvoiced = !!inv;
  }
  const fresh = await CareWorkOrder.findByPk(wo.id, { include: inc });
  res.json({ data: fresh, message: `Work order marked ${status.replace(/_/g, ' ')}.${autoInvoiced ? ' Invoice auto-raised.' : ''}` });
});

// ─── INVOICE THE CUSTOMER (client pays Seventh Sky) ─────────────────────────
exports.invoice = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  if (wo.invoice_id) return res.status(400).json({ error: 'Already invoiced.' });
  if (num(wo.service_value) <= 0) return res.status(400).json({ error: 'Set a service value before invoicing.' });
  const invoice = await raiseInvoiceForWO(wo, req.user?.id);
  res.status(201).json({ data: { invoice, work_order: wo }, message: `Invoice ${invoice.invoice_code} raised for ${wo.customer_name || 'customer'}.` });
});

// ─── PAY THE PROVIDER (disbursement to 3rd party, via provider folio) ────────
// POST /api/care/work-orders/:id/pay-provider  { method?, reference? }
exports.payProvider = asyncHandler(async (req, res) => {
  const wo = await CareWorkOrder.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!wo) return res.status(404).json({ error: 'Work order not found.' });
  if (wo.payment_status === 'provider_paid' || wo.payment_status === 'settled') return res.status(400).json({ error: 'Provider already paid.' });
  if (num(wo.provider_charge) <= 0 || !wo.assigned_provider_id) return res.status(400).json({ error: 'Assign a provider with a charge first.' });

  const provider = await ServiceProvider.findByPk(wo.assigned_provider_id);
  if (!provider?.folio_id) return res.status(400).json({ error: 'Provider has no folio — activate the provider first.' });

  const remaining = num(wo.provider_charge) - num(wo.provider_paid_amount);
  if (remaining <= 0) return res.status(400).json({ error: 'Provider already fully paid.' });
  const reqAmount = req.body?.amount;
  const amount = reqAmount != null ? Math.min(num(reqAmount), remaining) : remaining;
  if (amount <= 0) return res.status(400).json({ error: 'Enter a positive amount.' });

  const { postFolioTransaction } = require('../services/folio.service');
  const { settlementPatch } = require('../services/careBilling.service');
  await postFolioTransaction({
    folio_id: provider.folio_id, transaction_type: 'owner_payout', bucket: 'owner_payout',
    property_id: wo.property_id, description: `Provider payout · ${wo.work_order_code} (${wo.service_name || 'service'})${amount < remaining || num(wo.provider_paid_amount) > 0 ? ' [milestone]' : ''}`,
    credit: amount, created_by: req.user?.id || null,
  });
  await wo.update({ provider_paid_amount: num(wo.provider_paid_amount) + amount });
  await wo.reload();
  await wo.update(settlementPatch(wo));
  const paidTotal = num(wo.provider_paid_amount), fully = paidTotal >= num(wo.provider_charge) - 0.001;
  res.json({ data: wo, message: `Paid ${provider.company_name} ${amount.toLocaleString()} for ${wo.work_order_code}.${fully ? '' : ` Remaining ${(num(wo.provider_charge) - paidTotal).toLocaleString()}.`}` });
});
