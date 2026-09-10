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

/* ────────────────────────────────────────────────────────────────────────────
 * Bulk Rent Collection (Phase 1). A single "Collect Rent" run for the whole
 * portfolio: see every active tenancy's due for a month (arrears-aware), then
 * record many payments in one pass. Money flows ONLY through the existing
 * raise-invoice + recordPayment endpoints (called internally with the caller's
 * auth), so the owner-fee cascade, folio allocation and receipts behave exactly
 * as a single payment does — no parallel money path.
 * ──────────────────────────────────────────────────────────────────────────── */
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// GET /api/tenancies/collect-rent-data?month=YYYY-MM&owner_id=&property_id=&status=&q=
exports.collectRentData = asyncHandler(async (req, res) => {
  const month = req.query.month || monthKey();
  const where = { ...branchScope(req), status: 'active' };
  if (req.query.owner_id) where.owner_contact_id = Number(req.query.owner_id);
  if (req.query.property_id) where.property_id = Number(req.query.property_id);
  const tenancies = await Tenancy.findAll({ where, include: [propInc, ownerInc, tenantInc], order: [['id', 'ASC']] });

  const q = String(req.query.q || '').trim().toLowerCase();
  const statusFilter = String(req.query.status || '').toLowerCase(); // due | partial | paid | not_raised

  const rows = [];
  for (const t of tenancies) {
    const j = t.toJSON();
    const rent = Number(t.monthly_rent || 0);
    const service = Number(t.service_charge || 0);
    const monthCharge = rent + service;

    const [[led]] = await sequelize.query(
      'SELECT id, invoice_id, rent_due, rent_received, status FROM rental_ledger WHERE property_id = :pid AND period_label = :m LIMIT 1',
      { replacements: { pid: t.property_id || 0, m: month } },
    );
    const raised = !!led;
    const monthDue = raised ? Number(led.rent_due || 0) : monthCharge;
    const monthReceived = raised ? Number(led.rent_received || 0) : 0;
    const monthOutstanding = Math.max(0, monthDue - monthReceived);
    let status = 'due';
    if (raised) status = monthReceived >= monthDue ? 'paid' : (monthReceived > 0 ? 'partial' : 'due');

    const [[arr]] = await sequelize.query(
      'SELECT COALESCE(SUM(rent_due - rent_received),0) AS arrears FROM rental_ledger WHERE property_id = :pid AND period_label < :m AND status IN ("due","partial","overdue","arrears")',
      { replacements: { pid: t.property_id || 0, m: month } },
    );
    const arrears = Number(arr?.arrears || 0);

    const prop = j.Property || {};
    const row = {
      tenancy_id: t.id, tenancy_code: t.tenancy_code,
      tenant_name: j.tenant?.full_name || '—', tenant_phone: j.tenant?.primary_phone || '',
      property_id: t.property_id, property_code: prop.property_code, property_title: prop.title,
      unit: prop.area || prop.address || '', owner_contact_id: t.owner_contact_id, owner_name: j.owner?.full_name || '—',
      monthly_rent: rent, service_charge: service, month_charge: monthCharge,
      month_invoice_id: raised ? led.invoice_id : null, raised,
      month_outstanding: monthOutstanding, month_received: monthReceived,
      arrears, status,
      // What we suggest collecting: this month's outstanding (operator can bump to add arrears).
      suggested_amount: monthOutstanding || monthCharge,
      rent_due_day: t.rent_due_day || 1,
    };
    if (statusFilter && status !== statusFilter) continue;
    if (q && ![row.tenant_name, row.tenant_phone, row.property_title, row.property_code, row.unit, row.tenancy_code, row.owner_name]
      .some((v) => String(v || '').toLowerCase().includes(q))) continue;
    rows.push(row);
  }

  const summary = {
    tenancies: rows.length,
    due_count: rows.filter((r) => r.status !== 'paid').length,
    total_due: rows.reduce((s, r) => s + r.month_outstanding, 0),
    total_arrears: rows.reduce((s, r) => s + r.arrears, 0),
  };
  res.json({ month, data: rows, summary });
});

// POST /api/tenancies/collect-rent  { month, entries: [{ tenancy_id, amount, method, paid_at, reference, notes }] }
exports.collectRent = asyncHandler(async (req, res) => {
  const month = req.body.month || monthKey();
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!entries.length) return res.status(400).json({ error: 'No entries to collect.' });

  const base = `http://127.0.0.1:${process.env.PORT || 50001}`;
  const auth = req.headers.authorization;
  const branch = req.headers['x-branch-id'] || String(resolveBranchId(req) || '');
  const H = { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}), ...(branch ? { 'X-Branch-Id': branch } : {}) };
  const call = async (method, path, body) => {
    const r = await fetch(base + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    let data = {}; try { data = await r.json(); } catch { /* non-json */ }
    return { status: r.status, ok: r.ok, data };
  };

  const results = [];
  let paid = 0; let skipped = 0; let failed = 0; let collected = 0;

  for (const e of entries) {
    const amount = Number(e.amount || 0);
    const out = { tenancy_id: e.tenancy_id, amount };
    try {
      if (!e.tenancy_id || amount <= 0) { out.status = 'skipped'; out.reason = 'no amount'; skipped += 1; results.push(out); continue; }
      const t = await Tenancy.findOne({ where: { id: e.tenancy_id, ...branchScope(req) } });
      if (!t) { out.status = 'failed'; out.error = 'tenancy not found'; failed += 1; results.push(out); continue; }

      // Locate (or raise) the month's rent invoice via the rental-ledger key (property_id, period).
      let led = (await sequelize.query(
        'SELECT id, invoice_id FROM rental_ledger WHERE property_id = :pid AND period_label = :m LIMIT 1',
        { replacements: { pid: t.property_id || 0, m: month } },
      ))[0][0];
      let invoiceId = led && led.invoice_id;
      if (!invoiceId) {
        const raised = await call('POST', `/api/tenancies/${t.id}/raise-invoice`, { period_label: month });
        if (raised.ok) {
          invoiceId = raised.data && raised.data.data && raised.data.data.invoice && raised.data.data.invoice.id;
        } else if (raised.status === 409) {
          led = (await sequelize.query(
            'SELECT id, invoice_id FROM rental_ledger WHERE property_id = :pid AND period_label = :m LIMIT 1',
            { replacements: { pid: t.property_id || 0, m: month } },
          ))[0][0];
          invoiceId = led && led.invoice_id;
        }
        if (!invoiceId) { out.status = 'failed'; out.error = (raised.data && raised.data.error) || `could not raise invoice (${raised.status})`; failed += 1; results.push(out); continue; }
      }

      const pay = await call('POST', `/api/invoices/${invoiceId}/payments`, {
        amount, method: e.method || 'cash', reference: e.reference || null, paid_at: e.paid_at || undefined, notes: e.notes || `Bulk rent collection ${month}`,
      });
      if (pay.ok) {
        paid += 1; collected += amount;
        out.status = 'paid'; out.invoice_id = invoiceId;
        const p = pay.data && pay.data.data;
        out.payment_code = (p && p.payment && p.payment.payment_code) || (p && p.payment_code) || null;
      } else {
        out.status = 'failed'; out.error = (pay.data && pay.data.error) || `payment failed (${pay.status})`; failed += 1;
      }
    } catch (err) {
      out.status = 'failed'; out.error = err.message; failed += 1;
    }
    results.push(out);
  }

  res.json({ month, results, summary: { paid, skipped, failed, total_collected: collected } });
});

/* ────────────────────────────────────────────────────────────────────────────
 * Bulk Rent Reminders (PM Phase 4). List every overdue tenancy and send staged
 * arrears reminders in one pass. Reuses services/arrearsReminder.scheduler
 * (overdueByTenancy + remindTenancy), so the escalation buckets, email/logging
 * and reminder-stage advance behave exactly as the daily scheduler and the
 * single "send reminder now" button. Reminders touch NO money.
 * ──────────────────────────────────────────────────────────────────────────── */

// GET /api/tenancies/overdue-reminders?owner_id=&min_days=
exports.overdueReminders = asyncHandler(async (req, res) => {
  const { overdueByTenancy } = require('../services/arrearsReminder.scheduler');
  const scope = branchScope(req);
  let overdue = await overdueByTenancy();
  if (scope.branch_id) overdue = overdue.filter((r) => Number(r.branch_id) === Number(scope.branch_id));
  const minDays = Number(req.query.min_days || 0);
  if (minDays > 0) overdue = overdue.filter((r) => r.days_overdue >= minDays);

  // Enrich with tenant + property + last reminder in as few queries as possible.
  const tenancyIds = overdue.map((r) => r.tenancy_id);
  const propertyIds = [...new Set(overdue.map((r) => r.property_id).filter(Boolean))];
  const tenancies = tenancyIds.length
    ? await Tenancy.findAll({ where: { id: { [Op.in]: tenancyIds } }, include: [propInc, ownerInc, tenantInc] })
    : [];
  const byId = new Map(tenancies.map((t) => [t.id, t.toJSON()]));

  // Last arrears reminder per property (subject marker), one grouped query.
  let lastByProp = {};
  if (propertyIds.length) {
    const [lr] = await sequelize.query(
      `SELECT entity_id AS property_id, MAX(created_at) AS last_at
         FROM communications
        WHERE entity_type = 'property' AND subject LIKE '%arrears-reminder%' AND entity_id IN (:pids)
        GROUP BY entity_id`,
      { replacements: { pids: propertyIds } },
    );
    lastByProp = lr.reduce((a, r) => { a[r.property_id] = r.last_at; return a; }, {});
  }

  let ownerFilter = req.query.owner_id ? Number(req.query.owner_id) : null;
  const rows = [];
  for (const r of overdue) {
    const t = byId.get(r.tenancy_id) || {};
    if (ownerFilter && Number(t.owner_contact_id) !== ownerFilter) continue;
    const prop = t.Property || {};
    rows.push({
      tenancy_id: r.tenancy_id, tenancy_code: t.tenancy_code,
      tenant_name: t.tenant?.full_name || '—', tenant_email: t.tenant?.email || '', has_email: !!t.tenant?.email,
      property_id: r.property_id, property_title: prop.title, property_code: prop.property_code, unit: prop.area || prop.address || '',
      owner_contact_id: t.owner_contact_id, owner_name: t.owner?.full_name || '—',
      amount_due: r.amount_due, days_overdue: r.days_overdue, oldest_due: r.oldest_due, invoice_count: Number(r.invoice_count || 0),
      last_reminder_at: lastByProp[r.property_id] || null,
    });
  }
  rows.sort((a, b) => b.days_overdue - a.days_overdue);
  const summary = {
    overdue: rows.length,
    total_overdue: rows.reduce((s, r) => s + Number(r.amount_due || 0), 0),
    no_email: rows.filter((r) => !r.has_email).length,
  };
  res.json({ data: rows, summary });
});

// POST /api/tenancies/send-reminders  { tenancy_ids?: [], force?: bool }
exports.sendReminders = asyncHandler(async (req, res) => {
  const { overdueByTenancy, remindTenancy } = require('../services/arrearsReminder.scheduler');
  const scope = branchScope(req);
  const force = req.body.force === true;
  const wanted = Array.isArray(req.body.tenancy_ids) ? req.body.tenancy_ids.map(Number) : null;

  let overdue = await overdueByTenancy();
  if (scope.branch_id) overdue = overdue.filter((r) => Number(r.branch_id) === Number(scope.branch_id));
  if (wanted && wanted.length) overdue = overdue.filter((r) => wanted.includes(Number(r.tenancy_id)));
  if (!overdue.length) return res.json({ results: [], summary: { sent: 0, skipped: 0, no_email: 0, failed: 0 } });

  const results = [];
  let sent = 0; let skipped = 0; let noEmail = 0; let failed = 0;
  for (const row of overdue) {
    const out = { tenancy_id: row.tenancy_id, days_overdue: row.days_overdue, amount_due: row.amount_due };
    try {
      const r = await remindTenancy(row, { force, user_id: req.user?.id || null });
      if (r.skipped) { out.status = 'skipped'; out.reason = 'already reminded this stage'; skipped += 1; }
      else if (r.emailed) { out.status = 'sent'; sent += 1; }
      else { out.status = 'logged'; out.reason = 'no email on file — logged only'; noEmail += 1; }
    } catch (err) { out.status = 'failed'; out.error = err.message; failed += 1; }
    results.push(out);
  }
  res.json({ results, summary: { sent, skipped, no_email: noEmail, failed } });
});
