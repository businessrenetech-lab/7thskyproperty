const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const AccountCategory = require('../models/AccountCategory');
const Contact = require('../models/Contact');
const Folio = require('../models/Folio');
const InvoiceItem = require('../models/InvoiceItem');
const LandlordBill = require('../models/LandlordBill');
const Payment = require('../models/Payment');
const Property = require('../models/Property');
const PropertyInvoice = require('../models/PropertyInvoice');
const RentalReceipt = require('../models/RentalReceipt');
const ServiceProvider = require('../models/ServiceProvider');
const Tenancy = require('../models/Tenancy');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, getPagination, resolveBranchId } = require('../utils/controllerHelpers');
const { ensureFoliosForTenancy, findBestLandlordFolio, postFolioTransaction } = require('../services/folio.service');

const num = (v) => Number(v || 0);
const contactAttrs = ['id', 'full_name', 'primary_phone', 'email'];
const providerInc = { model: ServiceProvider, as: 'provider', attributes: ['id', 'company_name'] };
const categoryInc = { model: AccountCategory, as: 'category', attributes: ['id', 'name', 'code', 'default_tax_rate'] };
const payableName = (inv) => inv.contact?.full_name || inv.provider?.company_name || '—';

function taxFromIncluded(amount, rate) {
  const pct = num(rate);
  if (pct <= 0) return 0;
  return amount - (amount / (1 + pct / 100));
}

async function createTenantInvoice({ req, tx, tenancy, accountCategory, provider_id, description, amount, vat_included, due_date, uploaded_invoice_url, source_bill_id, source_receipt_id }) {
  if (!tenancy?.tenant_contact_id) throw new Error('Selected tenancy has no tenant.');
  const folios = await ensureFoliosForTenancy(tenancy, { transaction: tx });
  const taxRate = vat_included ? num(accountCategory?.default_tax_rate) : 0;
  const taxAmount = vat_included ? taxFromIncluded(num(amount), taxRate) : 0;
  const invoice = await PropertyInvoice.create({
    branch_id: tenancy.branch_id,
    invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
    invoice_kind: 'client',
    invoice_type: source_receipt_id ? 'rental_receipt' : 'tenant_invoice',
    contact_id: tenancy.tenant_contact_id,
    property_id: tenancy.property_id,
    tenancy_id: tenancy.id,
    folio_id: folios.tenantFolio?.id || null,
    account_category_id: accountCategory?.id || null,
    provider_id: provider_id || null,
    billed_to_type: 'tenant',
    service_for: 'tenant',
    title: description,
    subtotal: num(amount) - taxAmount,
    tax: taxAmount,
    tax_enabled: !!vat_included,
    tax_included: !!vat_included,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total: num(amount),
    amount_paid: 0,
    balance: num(amount),
    status: 'sent',
    issue_date: new Date(),
    due_date,
    notes: description,
    uploaded_invoice_url: uploaded_invoice_url || null,
    source_bill_id: source_bill_id || null,
    source_receipt_id: source_receipt_id || null,
    created_by: req.user?.id || null,
  }, { transaction: tx });

  await InvoiceItem.create({
    invoice_id: invoice.id,
    description,
    quantity: 1,
    unit_price: num(amount),
    amount: num(amount),
    account_category_id: accountCategory?.id || null,
    provider_id: provider_id || null,
    property_id: tenancy.property_id,
    tenancy_id: tenancy.id,
    tax_enabled: !!vat_included,
    tax_included: !!vat_included,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    billable_to_tenant: true,
  }, { transaction: tx });

  if (folios.tenantFolio) {
    await postFolioTransaction({
      folio_id: folios.tenantFolio.id,
      transaction_type: 'invoice',
      bucket: source_receipt_id ? 'rent' : 'adjustment',
      account_category_id: accountCategory?.id || null,
      invoice_id: invoice.id,
      provider_id: provider_id || null,
      property_id: tenancy.property_id,
      tenancy_id: tenancy.id,
      description,
      debit: num(amount),
      created_by: req.user?.id || null,
    }, { transaction: tx });
  }

  return { invoice, folios };
}

exports.createTenantInvoice = asyncHandler(async (req, res) => {
  const { tenancy_id, invoice_account_id, provider_id, description, amount, vat_included, due_date, uploaded_invoice_url } = req.body;
  if (!tenancy_id) return res.status(400).json({ error: 'Select tenant is required.' });
  if (!invoice_account_id) return res.status(400).json({ error: 'Invoice account is required.' });
  if (!description) return res.status(400).json({ error: 'Description is required.' });
  if (num(amount) <= 0) return res.status(400).json({ error: 'Invoice amount must be greater than zero.' });

  const result = await sequelize.transaction(async (tx) => {
    const tenancy = await Tenancy.findOne({ where: { id: tenancy_id, ...branchScope(req) }, transaction: tx });
    if (!tenancy) throw new Error('Tenancy not found.');
    const accountCategory = await AccountCategory.findByPk(invoice_account_id, { transaction: tx });
    if (!accountCategory) throw new Error('Invoice account not found.');
    return createTenantInvoice({ req, tx, tenancy, accountCategory, provider_id, description, amount, vat_included, due_date, uploaded_invoice_url });
  });
  res.status(201).json({ data: result.invoice, message: 'Tenant invoice created.' });
});

exports.listTenantInvoices = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req), invoice_type: { [Op.in]: ['tenant_invoice', 'rental_receipt'] } };
  const { rows, count } = await PropertyInvoice.findAndCountAll({
    where,
    include: [{ model: Contact, as: 'contact', attributes: contactAttrs }, providerInc, categoryInc],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  res.json({ data: rows.map((r) => ({ ...r.toJSON(), payable_name: payableName(r) })), pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.createLandlordBill = asyncHandler(async (req, res) => {
  const { landlord_folio_id, bill_account_id, provider_id, description, full_bill_amount, tenant_pays_part, tenant_tenancy_id, tenant_amount, tenant_due_date, tenant_invoice_account_id, tenant_invoice_description, due_date, uploaded_bill_url } = req.body;
  if (!landlord_folio_id) return res.status(400).json({ error: 'Select landlord is required.' });
  if (!bill_account_id) return res.status(400).json({ error: 'Bill account is required.' });
  if (!provider_id) return res.status(400).json({ error: 'Provider is required.' });
  if (!description) return res.status(400).json({ error: 'Description is required.' });
  if (num(full_bill_amount) <= 0) return res.status(400).json({ error: 'Full bill amount must be greater than zero.' });

  const result = await sequelize.transaction(async (tx) => {
    const landlordFolio = await Folio.findOne({ where: { id: landlord_folio_id, folio_type: 'landlord', ...branchScope(req) }, transaction: tx });
    if (!landlordFolio) throw new Error('Landlord folio not found.');
    const bill = await LandlordBill.create({
      branch_id: landlordFolio.branch_id,
      bill_code: await generateCode(LandlordBill, 'bill_code', 'SSPC-BL-'),
      landlord_contact_id: landlordFolio.contact_id,
      landlord_folio_id: landlordFolio.id,
      property_id: landlordFolio.property_id || req.body.property_id || null,
      bill_account_id,
      provider_id,
      description,
      full_bill_amount: num(full_bill_amount),
      tenant_pays_part: !!tenant_pays_part,
      tenant_tenancy_id: tenant_tenancy_id || null,
      tenant_amount: tenant_pays_part ? num(tenant_amount) : 0,
      tenant_invoice_account_id: tenant_invoice_account_id || null,
      tenant_invoice_description: tenant_invoice_description || null,
      due_date,
      uploaded_bill_url: uploaded_bill_url || null,
      created_by: req.user?.id || null,
    }, { transaction: tx });

    await postFolioTransaction({
      folio_id: landlordFolio.id,
      transaction_type: 'supplier_bill',
      bucket: 'supplier_bill',
      account_category_id: bill_account_id,
      provider_id,
      property_id: bill.property_id,
      description,
      credit: num(full_bill_amount),
      created_by: req.user?.id || null,
    }, { transaction: tx });

    if (tenant_pays_part && num(tenant_amount) > 0) {
      if (!tenant_tenancy_id || !tenant_invoice_account_id) throw new Error('Tenant, tenant amount, due date and invoice account are required when tenant pays part.');
      const tenancy = await Tenancy.findByPk(tenant_tenancy_id, { transaction: tx });
      if (!tenancy) throw new Error('Tenant tenancy not found.');
      const accountCategory = await AccountCategory.findByPk(tenant_invoice_account_id, { transaction: tx });
      if (!accountCategory) throw new Error('Tenant invoice account not found.');
      const tenantInvoice = await createTenantInvoice({
        req,
        tx,
        tenancy,
        accountCategory,
        provider_id,
        description: tenant_invoice_description || description,
        amount: tenant_amount,
        vat_included: false,
        due_date: tenant_due_date || due_date,
        source_bill_id: bill.id,
      });
      await bill.update({ tenant_contact_id: tenancy.tenant_contact_id, tenant_invoice_id: tenantInvoice.invoice.id }, { transaction: tx });
    }

    return bill;
  });
  res.status(201).json({ data: result, message: 'Landlord bill created.' });
});

exports.listLandlordBills = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  const { rows, count } = await LandlordBill.findAndCountAll({
    where,
    include: [
      { model: Contact, as: 'landlord', attributes: contactAttrs },
      { model: Contact, as: 'tenant', attributes: contactAttrs },
      { model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] },
      { model: AccountCategory, as: 'billAccount', attributes: ['id', 'name', 'code'] },
      providerInc,
    ],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.generateRentalReceipts = asyncHandler(async (req, res) => {
  const now = new Date();
  const period = req.body.period_label || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const receiptDay = Number(req.body.receipt_day || 5);
  const rentCategory = await AccountCategory.findOne({ where: { code: 'RENT' } });
  const tenancies = await Tenancy.findAll({ where: { status: 'active', ...branchScope(req) } });
  let created = 0;
  let skipped = 0;

  for (const tenancy of tenancies) {
    const existing = await RentalReceipt.findOne({ where: { tenancy_id: tenancy.id, period_label: period } });
    if (existing || !tenancy.tenant_contact_id) { skipped++; continue; }
    const total = num(tenancy.monthly_rent) + num(tenancy.service_charge);
    if (total <= 0) { skipped++; continue; }
    await sequelize.transaction(async (tx) => {
      const folios = await ensureFoliosForTenancy(tenancy, { transaction: tx });
      const landlordFolio = await findBestLandlordFolio(tenancy.owner_contact_id, tenancy.property_id, { transaction: tx });
      const receipt = await RentalReceipt.create({
        branch_id: tenancy.branch_id,
        receipt_code: await generateCode(RentalReceipt, 'receipt_code', 'SSPC-RR-'),
        period_label: period,
        tenancy_id: tenancy.id,
        tenant_contact_id: tenancy.tenant_contact_id,
        landlord_contact_id: tenancy.owner_contact_id,
        property_id: tenancy.property_id,
        tenant_folio_id: folios.tenantFolio?.id || null,
        landlord_folio_id: landlordFolio?.id || null,
        rent_amount: num(tenancy.monthly_rent),
        service_charge: num(tenancy.service_charge),
        total_amount: total,
        balance: total,
        due_date: `${period}-${String(receiptDay).padStart(2, '0')}`,
        created_by: req.user?.id || null,
      }, { transaction: tx });
      const tenantInvoice = await createTenantInvoice({
        req,
        tx,
        tenancy,
        accountCategory: rentCategory,
        description: `Rental receipt ${period}`,
        amount: total,
        vat_included: false,
        due_date: receipt.due_date,
        source_receipt_id: receipt.id,
      });
      await receipt.update({ invoice_id: tenantInvoice.invoice.id }, { transaction: tx });
    });
    created++;
  }
  res.json({ message: `Rental receipts generated for ${period}. Created: ${created}, skipped: ${skipped}.`, created, skipped });
});

exports.listRentalReceipts = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.period_label) where.period_label = req.query.period_label;
  const { rows, count } = await RentalReceipt.findAndCountAll({
    where,
    include: [
      { model: Contact, as: 'tenant', attributes: contactAttrs },
      { model: Contact, as: 'landlord', attributes: contactAttrs },
      { model: Property, as: 'property', attributes: ['id', 'title', 'property_code'] },
    ],
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.recordRentalReceiptPayment = asyncHandler(async (req, res) => {
  const receipt = await RentalReceipt.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!receipt) return res.status(404).json({ error: 'Rental receipt not found.' });
  if (!receipt.invoice_id) return res.status(400).json({ error: 'Rental receipt has no linked tenant invoice.' });
  req.params.id = receipt.invoice_id;
  return require('./invoicing.controller').recordPayment(req, res);
});

// POST /api/billing/rental-receipts/:id/email — email a branded rent receipt to the tenant.
const Communication = require('../models/Communication');
exports.emailRentalReceipt = asyncHandler(async (req, res) => {
  const receipt = await RentalReceipt.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!receipt) return res.status(404).json({ error: 'Rental receipt not found.' });
  const [tenancy, tenant, property] = await Promise.all([
    receipt.tenancy_id ? Tenancy.findByPk(receipt.tenancy_id) : null,
    receipt.tenant_contact_id ? Contact.findByPk(receipt.tenant_contact_id) : null,
    receipt.property_id ? Property.findByPk(receipt.property_id) : null,
  ]);
  if (!tenant?.email) return res.status(400).json({ error: `Tenant ${tenant?.full_name || ''} has no email on file.` });

  const bdt = (v) => '৳' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const paidBadge = receipt.status === 'paid' ? '<span style="background:#dcfce7;color:#15803d;padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px;">PAID</span>'
    : Number(receipt.amount_paid) > 0 ? '<span style="background:#fef3c7;color:#b45309;padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px;">PARTIAL</span>'
    : '<span style="background:#fee2e2;color:#b91c1c;padding:2px 10px;border-radius:6px;font-weight:700;font-size:12px;">DUE</span>';
  const html = `
    <div style="font-family:Arial;max-width:560px;">
      <div style="display:flex;align-items:center;gap:10px;border-bottom:4px solid #12b6f3;padding-bottom:10px;">
        <div style="width:40px;height:40px;border-radius:9px;background:linear-gradient(135deg,#003768,#12b6f3);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;">7S</div>
        <div><div style="font-weight:800;color:#003768;">Seventh Sky Property Care</div><div style="font-size:11px;color:#64748b;">Rent receipt</div></div>
        <div style="margin-left:auto;text-align:right;"><div style="font-weight:800;color:#003768;">${receipt.receipt_code || ''}</div><div style="font-size:11px;color:#64748b;">${receipt.period_label || ''}</div></div>
      </div>
      <p style="font-size:13px;">Dear ${tenant.full_name || 'Tenant'},</p>
      <p style="font-size:13px;">This is your rent receipt for <b>${property?.title || 'your property'}</b> — period <b>${receipt.period_label || ''}</b> ${paidBadge}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:8px 0;">
        <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;">Monthly rent</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${bdt(receipt.rent_amount)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;">Service charge</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${bdt(receipt.service_charge)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:700;">Total</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;font-weight:700;">${bdt(receipt.total_amount)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;color:#15803d;">Amount paid</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#15803d;">${bdt(receipt.amount_paid)}</td></tr>
        <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;color:${Number(receipt.balance) > 0 ? '#b91c1c' : '#64748b'};">Balance</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:${Number(receipt.balance) > 0 ? '#b91c1c' : '#64748b'};">${bdt(receipt.balance)}</td></tr>
      </table>
      ${Number(receipt.balance) > 0 ? `<p style="font-size:12.5px;color:#b45309;">A balance of ${bdt(receipt.balance)} remains due${receipt.due_date ? ` (due ${receipt.due_date})` : ''}.</p>` : '<p style="font-size:12.5px;color:#15803d;">Thank you — this period is fully paid.</p>'}
      <p style="font-size:12.5px;margin-top:18px;">— Seventh Sky Property Care</p>
    </div>`;

  let emailed = false;
  try { const { sendEmail } = require('../services/communication.service'); await sendEmail(tenant.email, `Rent receipt ${receipt.receipt_code || ''} — ${receipt.period_label || ''}`, html); emailed = true; } catch { /* best-effort */ }
  if (property?.id) {
    await Communication.create({ branch_id: receipt.branch_id, entity_type: 'property', entity_id: property.id, channel: 'email', direction: 'outbound', subject: `Rent receipt emailed — ${receipt.receipt_code}`, body: `Receipt for ${receipt.period_label} emailed to ${tenant.email}.`, user_id: req.user?.id || null }).catch(() => {});
  }
  res.json({ data: { emailed, to: tenant.email }, message: emailed ? `Receipt emailed to ${tenant.email}.` : 'Receipt prepared (email not configured).' });
});
