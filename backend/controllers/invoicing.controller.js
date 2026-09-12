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
  if (req.query.invoice_type) where.invoice_type = req.query.invoice_type.includes(',') ? { [Op.in]: req.query.invoice_type.split(',') } : req.query.invoice_type;
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
    include: [
      clientInc, contactInc, providerInc, categoryInc, folioInc,
      // Fetch items separately so their own category/provider includes don't
      // collide with the invoice-level ones ("Not unique table/alias").
      { model: InvoiceItem, as: 'items', separate: true, include: [{ model: AccountCategory, as: 'category', attributes: ['id', 'name', 'code'] }, { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name'] }] },
      { model: Payment, as: 'payments', separate: true },
    ],
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

// PUT /api/invoices/:id — edit header + replace line items (draft/unpaid only),
// recompute totals. If items are omitted the existing lines are kept.
const EDITABLE = ['title', 'discount', 'due_date', 'notes', 'account_category_id', 'service_period_start', 'service_period_end'];
exports.update = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  if (num(inv.amount_paid) > 0 || ['paid', 'cancelled'].includes(inv.status)) {
    return res.status(409).json({ error: 'A paid or cancelled invoice can no longer be edited.' });
  }
  const meta = pick(req.body, EDITABLE);
  const items = Array.isArray(req.body.items) ? req.body.items : null;
  await sequelize.transaction(async (t) => {
    if (items) {
      await InvoiceItem.destroy({ where: { invoice_id: inv.id }, transaction: t });
      for (let i = 0; i < items.length; i++) {
        const it = items[i]; const calc = itemTax(it);
        await InvoiceItem.create({
          invoice_id: inv.id, description: it.description, quantity: num(it.quantity) || 1, unit: it.unit || null,
          unit_price: num(it.unit_price), amount: calc.amount, tax_enabled: !!it.tax_enabled, tax_included: !!it.tax_included,
          tax_rate: num(it.tax_rate), tax_amount: calc.tax, property_id: it.property_id || inv.property_id || null, sort_order: i,
        }, { transaction: t });
      }
    }
    const rows = await InvoiceItem.findAll({ where: { invoice_id: inv.id }, transaction: t });
    const { subtotal, tax_amount, total } = recomputeTotals({ ...inv.toJSON(), ...meta }, rows.map((r) => r.toJSON()));
    await inv.update({ ...meta, subtotal, tax: tax_amount, tax_amount, total, balance: total - num(inv.amount_paid) }, { transaction: t });
  });
  const fresh = await PropertyInvoice.findByPk(inv.id, { include: [{ model: InvoiceItem, as: 'items' }] });
  res.json({ data: { ...fresh.toJSON() }, message: 'Invoice updated.' });
});

// A print-quality invoice document (company header, bill-to, line items, totals).
function renderInvoiceHtml(inv, items) {
  const bdt = (v) => '৳' + num(v).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const to = inv.contact?.full_name || inv.client?.Contact?.full_name || inv.provider?.company_name || '—';
  const rows = (items || []).map((it) => `<tr>
    <td style="padding:7px 10px;border-bottom:1px solid #e5e9f0;">${esc(it.description || '')}</td>
    <td style="padding:7px 10px;border-bottom:1px solid #e5e9f0;text-align:right;">${num(it.quantity || 1)}</td>
    <td style="padding:7px 10px;border-bottom:1px solid #e5e9f0;text-align:right;">${bdt(it.unit_price)}</td>
    <td style="padding:7px 10px;border-bottom:1px solid #e5e9f0;text-align:right;">${bdt(it.amount)}</td></tr>`).join('');
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:800px;margin:0 auto;color:#1f2430;padding:24px;">
    <div style="display:flex;justify-content:space-between;border-bottom:3px double #003768;padding-bottom:12px;">
      <div><div style="font-size:20px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
        <div style="font-size:12px;color:#6b7280;">Residential Property Services</div></div>
      <div style="text-align:right;"><div style="font-size:16px;font-weight:bold;">INVOICE</div>
        <div style="font-size:12px;color:#6b7280;">${esc(inv.invoice_code)}</div>
        <div style="font-size:12px;color:#6b7280;">${esc((inv.invoice_type || '').replace(/_/g, ' '))}</div></div>
    </div>
    <table style="width:100%;margin:14px 0;font-size:12.5px;"><tr>
      <td style="vertical-align:top;"><b>Bill to</b><br/>${esc(to)}</td>
      <td style="vertical-align:top;text-align:right;">Issue date: ${inv.issue_date ? String(inv.issue_date).slice(0, 10) : '—'}<br/>Due date: ${inv.due_date ? String(inv.due_date).slice(0, 10) : '—'}<br/>Status: ${esc(inv.status)}</td>
    </tr></table>
    <div style="font-size:14px;font-weight:bold;margin:6px 0;">${esc(inv.title || 'Invoice')}</div>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
      <thead><tr style="background:#eef3f8;"><th style="padding:7px 10px;text-align:left;">Description</th><th style="padding:7px 10px;text-align:right;">Qty</th><th style="padding:7px 10px;text-align:right;">Unit</th><th style="padding:7px 10px;text-align:right;">Amount</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="padding:12px;text-align:center;color:#9aa4b2;">No line items.</td></tr>'}</tbody>
    </table>
    <table style="width:100%;margin-top:10px;font-size:13px;"><tr><td></td><td style="width:240px;">
      <table style="width:100%;"><tr><td style="padding:4px 10px;">Subtotal</td><td style="padding:4px 10px;text-align:right;">${bdt(inv.subtotal)}</td></tr>
      ${num(inv.discount) ? `<tr><td style="padding:4px 10px;">Discount</td><td style="padding:4px 10px;text-align:right;">– ${bdt(inv.discount)}</td></tr>` : ''}
      ${num(inv.tax_amount) ? `<tr><td style="padding:4px 10px;">Tax</td><td style="padding:4px 10px;text-align:right;">${bdt(inv.tax_amount)}</td></tr>` : ''}
      <tr style="font-weight:bold;background:#003768;color:#fff;"><td style="padding:6px 10px;">TOTAL</td><td style="padding:6px 10px;text-align:right;">${bdt(inv.total)}</td></tr>
      <tr><td style="padding:4px 10px;">Paid</td><td style="padding:4px 10px;text-align:right;">${bdt(inv.amount_paid)}</td></tr>
      <tr style="font-weight:bold;"><td style="padding:4px 10px;">Balance due</td><td style="padding:4px 10px;text-align:right;">${bdt(inv.balance)}</td></tr>
      </table></td></tr></table>
    ${inv.notes ? `<div style="margin-top:14px;font-size:12px;color:#4b5563;"><b>Notes:</b> ${esc(inv.notes)}</div>` : ''}
  </div>`;
}

// GET /api/invoices/:id/document?format=pdf|html — download / print the invoice.
exports.document = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: Contact, as: 'contact', attributes: ['id', 'full_name'] }, clientInc, providerInc, { model: InvoiceItem, as: 'items' }],
  });
  if (!inv) return res.status(404).send('Invoice not found.');
  const html = renderInvoiceHtml(inv, inv.items || []);
  const { htmlToPdf, pdfAvailable } = require('../services/htmlToPdf.service');
  if (req.query.format === 'pdf' && pdfAvailable()) {
    try {
      const pdf = await htmlToPdf(html);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${inv.invoice_code}.pdf"`);
      return res.send(pdf);
    } catch { /* fall through to HTML */ }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// POST /api/invoices/:id/send — email the invoice (PDF attached when available).
exports.sendInvoice = asyncHandler(async (req, res) => {
  const inv = await PropertyInvoice.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: Contact, as: 'contact', attributes: ['id', 'full_name', 'email'] }, { model: Client, as: 'client', include: [{ model: Contact, attributes: ['id', 'full_name', 'email'] }] }, { model: InvoiceItem, as: 'items' }],
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found.' });
  const to = req.body?.email || inv.contact?.email || inv.client?.Contact?.email;
  if (!to) return res.status(400).json({ error: 'No client email address to send this invoice to.' });
  const html = renderInvoiceHtml(inv, inv.items || []);
  let pdf = null;
  try { const { htmlToPdf, pdfAvailable } = require('../services/htmlToPdf.service'); if (pdfAvailable()) pdf = await htmlToPdf(html); } catch { pdf = null; }
  const { sendEmail } = require('../services/communication.service');
  const attachments = pdf ? [{ filename: `${inv.invoice_code}.pdf`, content: pdf, contentType: 'application/pdf' }] : [];
  const body = `<p>Dear ${inv.contact?.full_name || 'Sir/Madam'},</p>
    <p>Please find your invoice <strong>${inv.invoice_code}</strong>${inv.title ? ` for ${inv.title}` : ''}. Balance due: ৳${num(inv.balance).toLocaleString('en-BD')}.</p>
    ${pdf ? '<p>The invoice PDF is attached.</p>' : `<div style="border:1px solid #e5e9f0;border-radius:8px;padding:8px 12px;">${html}</div>`}
    <p>— Seventh Sky Property Care</p>`;
  const result = await sendEmail(to, `Invoice ${inv.invoice_code} — Seventh Sky Property Care`, body, attachments).catch((e) => ({ success: false, error: e.message }));
  if (inv.status === 'draft') await inv.update({ status: 'sent' });
  res.json({ data: { to, emailed: !!(result && result.success), simulated: !!(result && result.simulated), has_pdf: !!pdf }, message: result?.simulated ? `Invoice recorded (email simulated) for ${to}` : `Invoice ${inv.invoice_code} sent to ${to}` });
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
      // Allocate across the tenant folio's outstanding buckets (rent → service →
      // utility → remainder) so bucket balances reconcile with current_balance.
      // This keeps the 3-way outstanding split accurate.
      const { allocatePaymentToBuckets } = require('../services/folio.service');
      await allocatePaymentToBuckets(inv.folio_id, amount, {
        payment_id: payment.id, invoice_id: inv.id,
        property_id: inv.property_id, tenancy_id: inv.tenancy_id,
        description: `Payment for ${inv.invoice_code}`, created_by: req.user?.id || null,
      }, { transaction: t });
    }
    // Resolve the rent period once (PropertyInvoice has no period_label column).
    let rentPeriod = null;
    if (inv.tenancy_id) {
      if (inv.rental_ledger_id) {
        const RL = require('../models/RentalLedger');
        const led = await RL.findByPk(inv.rental_ledger_id, { transaction: t });
        rentPeriod = led?.period_label || null;
      }
      if (!rentPeriod && inv.issue_date) rentPeriod = String(inv.issue_date).slice(0, 7);
    }

    if (inv.invoice_kind === 'client' && inv.tenancy_id) {
      const tenancy = await Tenancy.findByPk(inv.tenancy_id, { transaction: t });
      const landlordFolio = tenancy ? await findBestLandlordFolio(tenancy.owner_contact_id, tenancy.property_id, { transaction: t }) : null;
      // Rent-type receipts credit the landlord folio as 'rent' so owner statements
      // classify them correctly; other tenant invoices post as 'adjustment'.
      const isRent = inv.invoice_type === 'rental_receipt' || inv.source_receipt_id || inv.service_for === 'tenancy';
      if (landlordFolio) {
        await postFolioTransaction({
          folio_id: landlordFolio.id,
          transaction_type: 'payment',
          bucket: isRent ? 'rent' : 'adjustment',
          payment_id: payment.id,
          invoice_id: inv.id,
          property_id: inv.property_id,
          tenancy_id: inv.tenancy_id,
          description: `Tenant payment received: ${inv.invoice_code}`,
          debit: amount,
          created_by: req.user?.id || null,
        }, { transaction: t });
      }
      // Seventh Sky earns its fees the moment rent is received: deduct from the
      // owner balance + book our income. Only for rent-type receipts.
      if (tenancy && isRent) {
        try {
          const { applyOwnerFeesOnRent } = require('../services/ownerFees.service');
          await applyOwnerFeesOnRent({
            tenancy, rentReceived: amount, period_label: rentPeriod,
            source_id: payment.id, source_type: 'rent_receipt', user_id: req.user?.id || null,
          }, { transaction: t });
        } catch (e) { console.warn('[ownerFees] apply failed:', e.message); }
      }
    }
    // Reconcile the rental receipt for this rent — whether the invoice was
    // created by the monthly scheduler (source_receipt_id) OR by the rent
    // collection form (rental_ledger_id / same tenancy+period). This fixes the
    // "receipt still shows outstanding after rent collected" bug.
    let receipt = null;
    if (inv.source_receipt_id) {
      receipt = await RentalReceipt.findByPk(inv.source_receipt_id, { transaction: t });
    } else if (inv.tenancy_id && rentPeriod) {
      receipt = await RentalReceipt.findOne({ where: { tenancy_id: inv.tenancy_id, period_label: rentPeriod }, transaction: t });
      // Link the invoice to the receipt so future payments reconcile directly.
      if (receipt) await inv.update({ source_receipt_id: receipt.id }, { transaction: t });
    }
    if (receipt) {
      const rAmountPaid = num(receipt.amount_paid) + amount;
      const rBalance = num(receipt.total_amount) - rAmountPaid;
      await receipt.update({ amount_paid: rAmountPaid, balance: rBalance, status: rBalance <= 0 ? 'paid' : 'partial' }, { transaction: t });
    }

    // Property Care billing automation: a paid SERVICE invoice books our fee as
    // income and accrues the provider's charge to their folio.
    if (inv.invoice_type === 'service') {
      try {
        const CareWorkOrder = require('../models/CareWorkOrder');
        const { onClientPayment } = require('../services/careBilling.service');
        const wo = await CareWorkOrder.findOne({ where: { invoice_id: inv.id }, transaction: t });
        if (wo) await onClientPayment(wo, amount_paid, { transaction: t, user_id: req.user?.id });
      } catch (e) { console.warn('[careBilling] service settlement:', e.message); }
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
