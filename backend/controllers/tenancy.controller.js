const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { ensureFoliosForTenancy, ensureTenantFolio, postFolioTransaction } = require('../services/folio.service');
const AccountCategory = require('../models/AccountCategory');
const Agreement = require('../models/Agreement');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const PartyRoleProfile = require('../models/PartyRoleProfile');

const FIELDS = ['property_id', 'owner_contact_id', 'tenant_contact_id', 'lease_start', 'move_in_date', 'lease_end',
  'move_out_date', 'security_deposit', 'monthly_rent', 'service_charge', 'rent_due_day', 'payment_frequency', 'status', 'lease_status', 'notes'];
const propInc = { model: Property, attributes: ['id', 'property_code', 'title', 'address', 'area', 'district', 'category'] };
const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] };
const tenantInc = { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] };

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await Tenancy.findAndCountAll({ where, include: [propInc, ownerInc, tenantInc], limit, offset, order: [['created_at', 'DESC']] });

  // Attach outstanding (arrears) from rental_ledger per property
  const data = await Promise.all(rows.map(async (t) => {
    const json = t.toJSON();
    const [[agg]] = await sequelize.query(
      'SELECT COALESCE(SUM(rent_due - rent_received),0) AS outstanding FROM rental_ledger WHERE property_id = :pid AND status IN ("due","partial","overdue","arrears")',
      { replacements: { pid: t.property_id || 0 } }
    );
    json.outstanding = Number(agg?.outstanding || 0);
    return json;
  }));
  res.json({ data, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc, ownerInc, tenantInc] });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const [ledger] = await sequelize.query(
    'SELECT * FROM rental_ledger WHERE property_id = :pid ORDER BY period_label DESC LIMIT 36',
    { replacements: { pid: t.property_id || 0 } }
  );
  const folios = await ensureFoliosForTenancy(t);
  res.json({ data: t, ledger, folios });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.tenancy_code = await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-');
  const result = await sequelize.transaction(async (tx) => {
    const t = await Tenancy.create(data, { transaction: tx });
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

exports.update = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  await t.update(pick(req.body, FIELDS));
  res.json({ data: t, message: 'Tenancy updated.' });
});

exports.startAgreement = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propInc, ownerInc, tenantInc] });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (!t.tenant?.email) return res.status(400).json({ error: 'Tenant email is required before sending a tenancy agreement.' });
  const agreement = req.body.agreement_id ? await Agreement.findByPk(req.body.agreement_id) : null;

  const env = await sequelize.transaction(async (tx) => {
    const envelope = await SigningEnvelope.create({
      branch_id: t.branch_id,
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
      agreement_id: agreement?.id || null,
      title: req.body.title || `Tenancy Agreement — ${t.Property?.title || t.tenancy_code}`,
      document_html: req.body.document_html || `<h2>Tenancy Agreement</h2><p>Property: ${t.Property?.title || ''}</p><p>Tenant: ${t.tenant?.full_name || ''}</p><p>Monthly rent: ${t.monthly_rent || 0}</p><p>Lease: ${t.lease_start || 'TBD'} to ${t.lease_end || 'TBD'}</p>`,
      message: req.body.message || 'Please review and sign the tenancy agreement.',
      related_type: 'tenancy',
      related_id: t.id,
      signing_order_enforced: true,
      status: 'draft',
      created_by: req.user?.id || null,
    }, { transaction: tx });

    const signers = [
      { signer_order: 1, role: 'tenant', name: t.tenant.full_name, email: t.tenant.email, contact_id: t.tenant_contact_id },
    ];
    const ownerMustSign = req.body.owner_signs === true;
    if (ownerMustSign && t.owner?.email) signers.push({ signer_order: 2, role: 'landlord', name: t.owner.full_name, email: t.owner.email, contact_id: t.owner_contact_id });
    signers.push({ signer_order: signers.length + 1, role: 'staff_countersign', name: req.body.countersigner_name || req.user?.name || 'Seventh Sky', email: req.body.countersigner_email || req.user?.email });

    for (const signerInput of signers.filter((s) => s.email)) {
      const signer = await EnvelopeSigner.create({ envelope_id: envelope.id, status: 'pending', ...signerInput }, { transaction: tx });
      await SignatureField.bulkCreate([
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
        { envelope_id: envelope.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
      ], { transaction: tx });
    }

    await t.update({ lease_status: 'sent_for_signature', status: t.status === 'active' ? 'active' : 'upcoming', agreement_sent_date: new Date().toISOString().slice(0, 10) }, { transaction: tx });
    const [role, roleCreated] = await PartyRoleProfile.findOrCreate({
      where: { contact_id: t.tenant_contact_id, role_type: 'tenant', tenancy_id: t.id },
      defaults: {
        branch_id: t.branch_id,
        profile_code: await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-'),
        contact_id: t.tenant_contact_id,
        role_type: 'tenant',
        status: 'agreement_pending',
        property_id: t.property_id,
        tenancy_id: t.id,
        agreement_id: agreement?.id || null,
        envelope_id: envelope.id,
        approval_status: 'approved',
        next_action: 'Send tenancy agreement for signing',
        created_by: req.user?.id || null,
      },
      transaction: tx,
    });
    // A returning tenant's verified KYC carries over from their previous
    // tenancy — this agreement still has to be signed for the new property.
    if (roleCreated) { try { await require('../services/kycReuse.service').applyKycReuse(role, { transaction: tx, actorId: req.user?.id }); } catch { /* non-fatal */ } }
    await role.update({ agreement_id: agreement?.id || role.agreement_id, envelope_id: envelope.id, status: 'agreement_pending', next_action: 'Send tenancy agreement for signing' }, { transaction: tx });
    return envelope;
  });

  res.status(201).json({ data: env, message: 'Tenancy agreement envelope drafted.' });
});

// POST /api/tenancies/:id/raise-invoice  { period_label?: 'YYYY-MM' }
// Creates a rental_ledger row + a client invoice (rent + service charge) for the period.
const PropertyInvoice = require('../models/PropertyInvoice');
const InvoiceItem = require('../models/InvoiceItem');
const RentalLedger = require('../models/RentalLedger');

exports.raiseInvoice = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (!t.tenant_contact_id) return res.status(400).json({ error: 'This tenancy has no tenant to invoice.' });

  const now = new Date();
  const period = req.body.period_label || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const existing = await RentalLedger.findOne({ where: { property_id: t.property_id, period_label: period } });
  if (existing) return res.status(409).json({ error: `An invoice/ledger entry already exists for ${period}.` });

  const rent = Number(t.monthly_rent || 0);
  const service = Number(t.service_charge || 0);
  const total = rent + service;
  const dueDate = `${period}-${String(t.rent_due_day || 1).padStart(2, '0')}`;

  const result = await sequelize.transaction(async (tx) => {
    const folio = await ensureTenantFolio(t, { transaction: tx });
    const rentCategory = await AccountCategory.findOne({ where: { code: 'RENT' }, transaction: tx });
    const serviceCategory = await AccountCategory.findOne({ where: { code: 'SERVICE' }, transaction: tx });

    const ledger = await RentalLedger.create({
      branch_id: t.branch_id, property_id: t.property_id, tenant_contact_id: t.tenant_contact_id,
      owner_contact_id: t.owner_contact_id, period_label: period, rent_due: total, rent_received: 0,
      due_date: dueDate, status: 'due',
    }, { transaction: tx });

    const invoice = await PropertyInvoice.create({
      branch_id: t.branch_id, invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
      invoice_kind: 'client', contact_id: t.tenant_contact_id, property_id: t.property_id,
      tenancy_id: t.id, rental_ledger_id: ledger.id, folio_id: folio?.id || null, billed_to_type: 'tenant', service_for: 'tenancy', title: `Rent — ${period}`,
      subtotal: total, total, balance: total, amount_paid: 0, status: 'sent',
      issue_date: now, due_date: dueDate, created_by: req.user?.id || null,
    }, { transaction: tx });

    await ledger.update({ invoice_id: invoice.id }, { transaction: tx });
    const items = [{ description: `Rent — ${period}`, quantity: 1, unit_price: rent, amount: rent, sort_order: 0, account_category_id: rentCategory?.id || null, property_id: t.property_id, tenancy_id: t.id, billable_to_tenant: true }];
    if (service > 0) items.push({ description: `Service charge — ${period}`, quantity: 1, unit_price: service, amount: service, sort_order: 1, account_category_id: serviceCategory?.id || null, property_id: t.property_id, tenancy_id: t.id, billable_to_tenant: true });
    for (const it of items) await InvoiceItem.create({ invoice_id: invoice.id, ...it }, { transaction: tx });

    if (folio) {
      await postFolioTransaction({ folio_id: folio.id, transaction_type: 'invoice', bucket: 'rent', account_category_id: rentCategory?.id || null, invoice_id: invoice.id, property_id: t.property_id, tenancy_id: t.id, description: `Rent invoice — ${period}`, debit: rent, created_by: req.user?.id || null }, { transaction: tx });
      if (service > 0) await postFolioTransaction({ folio_id: folio.id, transaction_type: 'invoice', bucket: 'service_charge', account_category_id: serviceCategory?.id || null, invoice_id: invoice.id, property_id: t.property_id, tenancy_id: t.id, description: `Service charge — ${period}`, debit: service, created_by: req.user?.id || null }, { transaction: tx });
    }

    return { invoice, ledger };
  });
  res.status(201).json({ data: result, message: `Invoice ${result.invoice.invoice_code} raised for ${period}.` });
});

exports.bulkRaiseInvoices = asyncHandler(async (req, res) => {
  const now = new Date();
  const period = req.body.period_label || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const tenancies = await Tenancy.findAll({
    where: {
      status: 'active',
      ...branchScope(req)
    }
  });

  if (!tenancies.length) {
    return res.json({ message: 'No active tenancies found to invoice.', created: 0, skipped: 0 });
  }

  let created = 0;
  let skipped = 0;
  
  for (const t of tenancies) {
    if (!t.tenant_contact_id) {
      skipped++;
      continue;
    }
    
    const existing = await RentalLedger.findOne({ where: { property_id: t.property_id, period_label: period } });
    if (existing) {
      skipped++;
      continue;
    }

    const rent = Number(t.monthly_rent || 0);
    const service = Number(t.service_charge || 0);
    const total = rent + service;
    const dueDate = `${period}-${String(t.rent_due_day || 1).padStart(2, '0')}`;

    try {
      await sequelize.transaction(async (tx) => {
        const folio = await ensureTenantFolio(t, { transaction: tx });
        const rentCategory = await AccountCategory.findOne({ where: { code: 'RENT' }, transaction: tx });
        const serviceCategory = await AccountCategory.findOne({ where: { code: 'SERVICE' }, transaction: tx });
        const ledger = await RentalLedger.create({
          branch_id: t.branch_id, property_id: t.property_id, tenant_contact_id: t.tenant_contact_id,
          owner_contact_id: t.owner_contact_id, period_label: period, rent_due: total, rent_received: 0,
          due_date: dueDate, status: 'due',
        }, { transaction: tx });

        const invoice = await PropertyInvoice.create({
          branch_id: t.branch_id, invoice_code: await generateCode(PropertyInvoice, 'invoice_code', 'SSPC-IN-'),
          invoice_kind: 'client', contact_id: t.tenant_contact_id, property_id: t.property_id,
          tenancy_id: t.id, rental_ledger_id: ledger.id, folio_id: folio?.id || null, billed_to_type: 'tenant', service_for: 'tenancy', title: `Rent — ${period}`,
          subtotal: total, total, balance: total, amount_paid: 0, status: 'sent',
          issue_date: now, due_date: dueDate, created_by: req.user?.id || null,
        }, { transaction: tx });

        await ledger.update({ invoice_id: invoice.id }, { transaction: tx });
        const items = [{ description: `Rent — ${period}`, quantity: 1, unit_price: rent, amount: rent, sort_order: 0, account_category_id: rentCategory?.id || null, property_id: t.property_id, tenancy_id: t.id, billable_to_tenant: true }];
        if (service > 0) items.push({ description: `Service charge — ${period}`, quantity: 1, unit_price: service, amount: service, sort_order: 1, account_category_id: serviceCategory?.id || null, property_id: t.property_id, tenancy_id: t.id, billable_to_tenant: true });
        for (const it of items) await InvoiceItem.create({ invoice_id: invoice.id, ...it }, { transaction: tx });
        if (folio) {
          await postFolioTransaction({ folio_id: folio.id, transaction_type: 'invoice', bucket: 'rent', account_category_id: rentCategory?.id || null, invoice_id: invoice.id, property_id: t.property_id, tenancy_id: t.id, description: `Rent invoice — ${period}`, debit: rent, created_by: req.user?.id || null }, { transaction: tx });
          if (service > 0) await postFolioTransaction({ folio_id: folio.id, transaction_type: 'invoice', bucket: 'service_charge', account_category_id: serviceCategory?.id || null, invoice_id: invoice.id, property_id: t.property_id, tenancy_id: t.id, description: `Service charge — ${period}`, debit: service, created_by: req.user?.id || null }, { transaction: tx });
        }
      });
      created++;
    } catch (err) {
      console.error(`[Bulk Raise Error for tenancy ${t.id}]`, err);
      skipped++;
    }
  }

  res.json({ message: `Invoices raised for ${period}. Created: ${created}, Skipped/Existing: ${skipped}.`, created, skipped });
});

exports.globalInvoices = asyncHandler(async (req, res) => {
  const now = new Date();
  const period = req.body.period_label || req.query.period_label || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previewOnly = req.method === 'GET' || req.body.preview === true;
  const where = { status: 'active', ...branchScope(req) };
  if (req.body.property_id || req.query.property_id) where.property_id = req.body.property_id || req.query.property_id;

  const tenancies = await Tenancy.findAll({ where, include: [propInc, ownerInc, tenantInc], order: [['created_at', 'DESC']] });
  const preview = [];
  for (const t of tenancies) {
    const existing = await RentalLedger.findOne({ where: { property_id: t.property_id, period_label: period } });
    const rent = Number(t.monthly_rent || 0);
    const service = Number(t.service_charge || 0);
    preview.push({
      tenancy_id: t.id,
      tenancy_code: t.tenancy_code,
      property: t.Property,
      tenant: t.tenant,
      owner: t.owner,
      rent,
      service_charge: service,
      total: rent + service,
      due_date: `${period}-${String(t.rent_due_day || 1).padStart(2, '0')}`,
      status: !t.tenant_contact_id ? 'missing_tenant' : existing ? 'already_exists' : 'ready',
    });
  }

  if (previewOnly) {
    return res.json({ period_label: period, data: preview, ready: preview.filter((r) => r.status === 'ready').length });
  }

  req.body.period_label = period;
  return exports.bulkRaiseInvoices(req, res);
});
