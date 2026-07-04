const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const Payment = require('../models/Payment');
const Client = require('../models/Client');
const Contact = require('../models/Contact');
const ServiceProvider = require('../models/ServiceProvider');
const AccountCategory = require('../models/AccountCategory');
const Folio = require('../models/Folio');
const RentalReceipt = require('../models/RentalReceipt');
const Tenancy = require('../models/Tenancy');
const { findBestLandlordFolio, postFolioTransaction } = require('../services/folio.service');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const clientInc = { model: Client, as: 'client', include: [{ model: Contact, attributes: ['id', 'full_name'] }] };
const contactInc = { model: Contact, as: 'contact', attributes: ['id', 'full_name'] };
const providerInc = { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name'] };
const categoryInc = { model: AccountCategory, as: 'category', attributes: ['id', 'name', 'code'] };
const folioInc = { model: Folio, as: 'folio', attributes: ['id', 'folio_code', 'folio_type'] };

const itemTax = (it) => {
  const base = num(it.quantity || 1) * num(it.unit_price);
  if (!it.tax_enabled || num(it.tax_rate) <= 0) return { base, tax: 0, amount: base };
  const rate = num(it.tax_rate) / 100;
  if (it.tax_included) {
    const net = base / (1 + rate);
    return { base: net, tax: base - net, amount: base };
  }
  const tax = base * rate;
  return { base, tax, amount: base + tax };
};
const recomputeTotals = (inv, items) => {
  const lines = items.map(itemTax);
  const subtotal = lines.reduce((a, it) => a + it.base, 0);
  const tax_amount = lines.reduce((a, it) => a + it.tax, 0);
  const total = lines.reduce((a, it) => a + it.amount, 0) - num(inv.discount);
  return { subtotal, tax_amount, total };
};
const payableName = (inv) => inv.client?.Contact?.full_name || inv.contact?.full_name || inv.provider?.company_name || '—';
const bucketForCategory = (cat, fallback = 'adjustment') => {
  const value = `${cat?.code || ''} ${cat?.name || ''}`.toLowerCase();
  if (value.includes('rent')) return 'rent';
  if (value.includes('service')) return 'service_charge';
  if (value.includes('water') || value.includes('utility') || value.includes('gas') || value.includes('internet')) return 'utility';
  if (value.includes('deposit')) return 'deposit';
  if (value.includes('management') || value.includes('fee')) return 'landlord_fee';
  if (value.includes('maintenance') || value.includes('electrical') || value.includes('plumbing')) return 'maintenance';
  return fallback;
};

// GET /api/invoices
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.kind) where.invoice_kind = req.query.kind;
  if (req.query.status) where.status = req.query.status;
  if (req.query.tenancy_id) where.tenancy_id = req.query.tenancy_id;
  if (req.query.contact_id) where.contact_id = req.query.contact_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.search) where[Op.or] = [{ invoice_code: { [Op.like]: `%${req.query.search}%` } }, { title: { [Op.like]: `%${req.query.search}%` } }];
  const { rows, count } = await PropertyInvoice.findAndCountAll({ where, include: [clientInc, contactInc, providerInc, categoryInc, folioInc], limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows.map((r) => ({ ...r.toJSON(), payable_name: payableName(r) })), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// GET /api/invoices/:id
exports.getOne = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [clientInc, contactInc, providerInc, categoryInc, folioInc, { model: InvoiceItem, as: 'items', include: [categoryInc, providerInc] }, { model: Payment, as: 'payments' }],
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  res.json({ data: { ...inv.toJSON(), payable_name: payableName(inv) } });
});

// POST /api/invoices
exports.create = asyncHandler(async (req, res) => {
  const meta = pick(req.body, ['invoice_kind', 'client_id', 'contact_id', 'provider_id', 'project_id', 'work_order_id', 'property_id', 'tenancy_id', 'folio_id', 'account_category_id', 'billed_to_type', 'service_for', 'service_period_start', 'service_period_end', 'title', 'discount', 'tax_enabled', 'tax_included', 'tax_rate', 'issue_date', 'due_date', 'notes']);
  const items = Array.isArray(req.body.items) ? req.body.items : [];

  const inv = await sequelize.transaction(async (t) => {
    const { subtotal, tax_amount, total } = recomputeTotals(meta, items);
    const created = await PropertyInvoice.create({
      ...meta,
      branch_id: resolveBranchId(req, req.body.branch_id),
      invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      subtotal, tax: tax_amount, tax_amount, total, balance: total, amount_paid: 0,
      issue_date: meta.issue_date || new Date(),
      status: req.body.status || 'draft', created_by: req.user?.id || null,
    }, { transaction: t });
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const calc = itemTax(it);
      await InvoiceItem.create({
        invoice_id: created.id, description: it.description, quantity: num(it.quantity) || 1,
        unit: it.unit || null, unit_price: num(it.unit_price), amount: calc.amount,
        account_category_id: it.account_category_id || meta.account_category_id || null,
        provider_id: it.provider_id || meta.provider_id || null,
        property_id: it.property_id || meta.property_id || null,
        tenancy_id: it.tenancy_id || meta.tenancy_id || null,
        tax_enabled: !!it.tax_enabled,
        tax_included: !!it.tax_included,
        tax_rate: num(it.tax_rate),
        tax_amount: calc.tax,
        billable_to_tenant: !!it.billable_to_tenant,
        deductible_from_landlord: !!it.deductible_from_landlord,
        sort_order: i,
      }, { transaction: t });

      if (created.folio_id) {
        const category = it.account_category_id ? await AccountCategory.findByPk(it.account_category_id, { transaction: t }) : null;
        await postFolioTransaction({
          folio_id: created.folio_id,
          transaction_type: created.invoice_kind === 'provider' ? 'supplier_bill' : 'invoice',
          bucket: bucketForCategory(category, created.invoice_kind === 'provider' ? 'supplier_bill' : 'adjustment'),
          account_category_id: it.account_category_id || meta.account_category_id || null,
          invoice_id: created.id,
          provider_id: it.provider_id || meta.provider_id || null,
          property_id: it.property_id || meta.property_id || null,
          tenancy_id: it.tenancy_id || meta.tenancy_id || null,
          description: it.description || created.title,
          debit: calc.amount,
          created_by: req.user?.id || null,
        }, { transaction: t });
      }
    }
    return created;
  });
  const fresh = await PropertyInvoice.findByPk(inv.id, { include: [{ model: InvoiceItem, as: 'items' }] });
  res.status(201).json({ data: fresh, message: 'Invoice created.' });
});

// PATCH /api/invoices/:id/status
exports.setStatus = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  await inv.update({ status: req.body.status });
  res.json({ data: inv });
});

// POST /api/invoices/:id/payments — record a payment
exports.recordPayment = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  const amount = num(req.body.amount);
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero.' });

  const result = await sequelize.transaction(async (t) => {
    const payment = await Payment.create({
      branch_id: inv.branch_id, payment_code: await generateCode(Payment, 'payment_code', 'SSPC-PY-'),
      invoice_id: inv.id, client_id: inv.client_id,
      direction: inv.invoice_kind === 'provider' ? 'outgoing' : 'incoming',
      amount, method: req.body.method || 'cash', reference: req.body.reference || null,
      status: 'completed', paid_at: req.body.paid_at || new Date(), notes: req.body.notes || null,
      recorded_by: req.user?.id || null,
    }, { transaction: t });
    const amount_paid = num(inv.amount_paid) + amount;
    const balance = num(inv.total) - amount_paid;
    const status = balance <= 0 ? 'paid' : 'partially_paid';
    await inv.update({ amount_paid, balance, status }, { transaction: t });

    // Keep the rental ledger in sync when this invoice came from a tenancy
    if (inv.rental_ledger_id) {
      const RentalLedger = require('../models/RentalLedger');
      const ledger = await RentalLedger.findByPk(inv.rental_ledger_id, { transaction: t });
      if (ledger) {
        const received = num(ledger.rent_received) + amount;
        const lstatus = received >= num(ledger.rent_due) ? 'paid' : 'partial';
        await ledger.update({ rent_received: received, status: lstatus, received_date: new Date() }, { transaction: t });
      }
    }
    if (inv.folio_id) {
      await postFolioTransaction({
        folio_id: inv.folio_id,
        transaction_type: 'payment',
        bucket: 'adjustment',
        payment_id: payment.id,
        invoice_id: inv.id,
        property_id: inv.property_id,
        tenancy_id: inv.tenancy_id,
        description: `Payment for ${inv.invoice_code}`,
        credit: amount,
        created_by: req.user?.id || null,
      }, { transaction: t });
    }
    if (inv.invoice_kind === 'client' && inv.tenancy_id) {
      const tenancy = await Tenancy.findByPk(inv.tenancy_id, { transaction: t });
      const landlordFolio = tenancy ? await findBestLandlordFolio(tenancy.owner_contact_id, tenancy.property_id, { transaction: t }) : null;
      if (landlordFolio) {
        await postFolioTransaction({
          folio_id: landlordFolio.id,
          transaction_type: 'payment',
          bucket: inv.source_receipt_id ? 'rent' : 'adjustment',
          payment_id: payment.id,
          invoice_id: inv.id,
          property_id: inv.property_id,
          tenancy_id: inv.tenancy_id,
          description: `Tenant payment received: ${inv.invoice_code}`,
          debit: amount,
          created_by: req.user?.id || null,
        }, { transaction: t });
      }
    }
    if (inv.source_receipt_id) {
      const receipt = await RentalReceipt.findByPk(inv.source_receipt_id, { transaction: t });
      if (receipt) {
        const amount_paid = num(receipt.amount_paid) + amount;
        const balance = num(receipt.total_amount) - amount_paid;
        await receipt.update({ amount_paid, balance, status: balance <= 0 ? 'paid' : 'partial' }, { transaction: t });
      }
    }
    return payment;
  });
  res.status(201).json({ data: result, message: 'Payment recorded.' });
});

// GET /api/payments — global payments list
exports.listPayments = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.direction) where.direction = req.query.direction;
  const { rows, count } = await Payment.findAndCountAll({
    where, limit, offset, order: [['paid_at', 'DESC']],
    include: [{ model: PropertyInvoice, as: 'PropertyInvoice', attributes: ['invoice_code', 'title'] }],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});
