const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const { TenantApplication, TenantApplicationDocument, TenantVerification, TenantOccupant } = require('../models/TenantApplication');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const Tenancy = require('../models/Tenancy');
const BondDepositRecord = require('../models/BondDepositRecord');
const MoveInChecklistItem = require('../models/MoveInChecklistItem');
const AccountCategory = require('../models/AccountCategory');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');
const { VERIFICATION_ITEMS } = require('../services/rentalWorkflow.service');
const { ensureFoliosForTenancy, postFolioTransaction } = require('../services/folio.service');

const MOVE_IN_ITEMS = [
  ['Signed tenancy agreement received', 'Signed agreement'],
  ['Advance rent received', 'Receipt'],
  ['Security deposit/bond received', 'Receipt'],
  ['Entry inspection completed', 'Entry inspection report/photos'],
  ['Keys/access handover recorded', 'Key handover form'],
  ['Utility responsibility explained', 'Tenant acknowledgement'],
  ['Occupant declaration completed', 'Occupant list/IDs'],
];

const nextCodesFrom = (baseCode, count) => {
  const match = String(baseCode).match(/^(.*?)(\d+)$/);
  if (!match) return Array.from({ length: count }, (_, i) => `${baseCode}-${i + 1}`);
  const [, prefix, num] = match;
  const start = Number(num);
  return Array.from({ length: count }, (_, i) => `${prefix}${String(start + i).padStart(num.length, '0')}`);
};

const FIELDS = [
  'property_id', 'tenant_contact_id', 'enquiry_id', 'applicant_name', 'mobile', 'email', 'occupation', 'employer',
  'monthly_income', 'application_date', 'preferred_move_in', 'lease_period', 'occupancy_requirement', 'budget', 'source',
  'id_received', 'employment_verified', 'income_verified', 'references_checked', 'background_check_status', 'status',
  'recommendation', 'owner_approval_required', 'owner_decision', 'approved_rent', 'lease_start_target', 'risk_level',
  'screening_notes', 'assigned_officer_id', 'notes',
];
const propInc = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'address', 'area', 'district', 'approved_monthly_rent', 'owner_contact_id'] };
const tenantInc = { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] };

// ─── LIST (global + per-property, with filters) ─────────────────────────────
exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.status) where.status = req.query.status;
  if (req.query.recommendation) where.recommendation = req.query.recommendation;
  if (req.query.assigned_officer_id) where.assigned_officer_id = req.query.assigned_officer_id;
  if (req.query.from || req.query.to) {
    where.application_date = {};
    if (req.query.from) where.application_date[Op.gte] = req.query.from;
    if (req.query.to) where.application_date[Op.lte] = req.query.to;
  }
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ applicant_name: { [Op.like]: s } }, { application_code: { [Op.like]: s } }, { mobile: { [Op.like]: s } }, { email: { [Op.like]: s } }];
  }
  const { rows, count } = await TenantApplication.findAndCountAll({
    where, include: [propInc, tenantInc], limit, offset, order: [['created_at', 'DESC']],
  });

  // Lightweight status counts for the global view tabs
  let status_counts;
  if (req.query.include_counts === 'true') {
    const base = { ...branchScope(req) };
    if (req.query.property_id) base.property_id = req.query.property_id;
    const grp = await TenantApplication.findAll({
      where: base, attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'c']], group: ['status'], raw: true,
    });
    status_counts = grp.reduce((a, r) => { a[r.status] = Number(r.c); return a; }, {});
    status_counts.all = Object.values(status_counts).reduce((a, b) => a + b, 0);
  }
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }, status_counts });
});

// ─── GET ONE (with verifications + occupants + documents) ───────────────────
exports.getOne = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [
      propInc, tenantInc,
      { model: TenantVerification, as: 'verifications', separate: true, order: [['sort_order', 'ASC']] },
      { model: TenantOccupant, as: 'occupants', separate: true, order: [['id', 'ASC']] },
      { model: TenantApplicationDocument, as: 'documents', separate: true, order: [['created_at', 'DESC']] },
    ],
  });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  res.json({ data: app });
});

// ─── CREATE (seeds verification checklist + optional occupants) ─────────────
exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.applicant_name) return res.status(400).json({ error: 'applicant_name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.application_date = data.application_date || new Date().toISOString().slice(0, 10);
  if (!data.status) data.status = 'submitted';
  data.application_code = await generateCode(TenantApplication, 'application_code', 'SSPC-APP-');

  const result = await sequelize.transaction(async (tx) => {
    const app = await TenantApplication.create(data, { transaction: tx });

    // Seed the SOP verification checklist
    await TenantVerification.bulkCreate(
      VERIFICATION_ITEMS.map((v, i) => ({
        application_id: app.id, item: v.item, required: true, status: 'pending',
        evidence_required: v.evidence_required, sort_order: i,
      })), { transaction: tx }
    );

    // Optional occupants passed in on create
    if (Array.isArray(req.body.occupants) && req.body.occupants.length) {
      await TenantOccupant.bulkCreate(
        req.body.occupants.filter((o) => o.name).map((o) => ({
          application_id: app.id, property_id: app.property_id,
          name: o.name, relationship: o.relationship || null, id_received: !!o.id_received,
          contact: o.contact || null, occupation: o.occupation || null,
          approved: !!o.approved, subletting_concern: !!o.subletting_concern, notes: o.notes || null,
        })), { transaction: tx }
      );
    }
    return app;
  });

  const fresh = await TenantApplication.findByPk(result.id, {
    include: [propInc, tenantInc, { model: TenantVerification, as: 'verifications', separate: true, order: [['sort_order', 'ASC']] }, { model: TenantOccupant, as: 'occupants', separate: true }],
  });
  res.status(201).json({ data: fresh, message: `Application ${result.application_code} created.` });
});

// ─── UPDATE ─────────────────────────────────────────────────────────────────
exports.update = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  await app.update(pick(req.body, FIELDS));
  res.json({ data: app, message: 'Application updated.' });
});

// ─── VERIFICATION ITEMS ─────────────────────────────────────────────────────
exports.updateVerification = asyncHandler(async (req, res) => {
  const v = await TenantVerification.findOne({ where: { id: req.params.vid, application_id: req.params.id } });
  if (!v) return res.status(404).json({ error: 'Verification item not found.' });
  const patch = pick(req.body, ['status', 'evidence_url', 'responsible_id', 'notes', 'required']);
  if (patch.status && ['passed', 'failed', 'na'].includes(patch.status) && !v.completed_at) patch.completed_at = new Date();
  await v.update(patch);

  // Roll up convenience booleans on the application from the checklist
  const all = await TenantVerification.findAll({ where: { application_id: req.params.id } });
  const passed = (kw) => all.some((x) => x.item.toLowerCase().includes(kw) && x.status === 'passed');
  const app = await TenantApplication.findByPk(req.params.id);
  if (app) {
    await app.update({
      id_received: passed('identity') || app.id_received,
      employment_verified: passed('employment'),
      income_verified: passed('income'),
      references_checked: passed('reference'),
    });
  }
  res.json({ data: v });
});

// ─── OCCUPANTS ──────────────────────────────────────────────────────────────
exports.addOccupant = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  const o = await TenantOccupant.create({
    application_id: app.id, property_id: app.property_id,
    ...pick(req.body, ['name', 'relationship', 'id_received', 'contact', 'occupation', 'approved', 'subletting_concern', 'notes']),
  });
  res.status(201).json({ data: o, message: 'Occupant added.' });
});
exports.updateOccupant = asyncHandler(async (req, res) => {
  const o = await TenantOccupant.findOne({ where: { id: req.params.oid, application_id: req.params.id } });
  if (!o) return res.status(404).json({ error: 'Occupant not found.' });
  await o.update(pick(req.body, ['name', 'relationship', 'id_received', 'contact', 'occupation', 'approved', 'subletting_concern', 'notes']));
  res.json({ data: o });
});
exports.removeOccupant = asyncHandler(async (req, res) => {
  const o = await TenantOccupant.findOne({ where: { id: req.params.oid, application_id: req.params.id } });
  if (!o) return res.status(404).json({ error: 'Occupant not found.' });
  await o.destroy();
  res.json({ message: 'Occupant removed.' });
});

// ─── DOCUMENTS ──────────────────────────────────────────────────────────────
exports.addDocument = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  if (!req.body.file_url) return res.status(400).json({ error: 'file_url is required.' });
  const doc = await TenantApplicationDocument.create({
    application_id: app.id, title: req.body.title || req.body.file_name || 'Document',
    doc_type: req.body.doc_type || 'other', file_url: req.body.file_url, file_name: req.body.file_name || null,
    uploaded_by: req.user?.id || null,
  });
  res.status(201).json({ data: doc, message: 'Document added.' });
});

// ─── CONVERT APPROVED APPLICATION → TENANCY ─────────────────────────────────
exports.convertToTenancy = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({
    where: { id: req.params.id, ...branchScope(req) }, include: [propInc],
  });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  if (app.converted_tenancy_id) return res.status(409).json({ error: 'This application is already converted to a tenancy.' });
  if (app.status !== 'approved') return res.status(400).json({ error: 'Only approved applications can be converted to a tenancy.' });
  if (!app.property_id) return res.status(400).json({ error: 'Application has no property assigned.' });
  if (!app.tenant_contact_id) return res.status(400).json({ error: 'Link a tenant contact before converting (set tenant_contact_id).' });

  const b = req.body || {};
  const monthlyRent = Number(b.monthly_rent ?? app.approved_rent ?? app.property?.approved_monthly_rent ?? 0);
  const result = await sequelize.transaction(async (tx) => {
    const t = await Tenancy.create({
      branch_id: app.branch_id, tenancy_code: await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-'),
      property_id: app.property_id, owner_contact_id: app.property?.owner_contact_id || null,
      tenant_contact_id: app.tenant_contact_id, application_id: app.id,
      lease_start: b.lease_start || app.lease_start_target || null,
      move_in_date: b.move_in_date || app.preferred_move_in || null,
      lease_end: b.lease_end || null,
      monthly_rent: monthlyRent,
      service_charge: Number(b.service_charge || 0),
      advance_rent: Number(b.advance_rent || monthlyRent),
      security_deposit: Number(b.security_deposit || monthlyRent * 2),
      rent_due_day: Number(b.rent_due_day || app.property?.rent_due_day || 5),
      payment_frequency: b.payment_frequency || 'monthly',
      lease_status: 'draft', status: 'upcoming', created_by: req.user?.id || null,
    }, { transaction: tx });

    // Copy approved occupants onto the tenancy
    const occupants = await TenantOccupant.findAll({ where: { application_id: app.id }, transaction: tx });
    for (const o of occupants) await o.update({ tenancy_id: t.id }, { transaction: tx });

    // Bond & deposit record
    await BondDepositRecord.create({
      branch_id: app.branch_id, bond_code: await generateCode(BondDepositRecord, 'bond_code', 'SSPC-BD-'),
      tenancy_id: t.id, application_id: app.id, property_id: app.property_id, tenant_contact_id: app.tenant_contact_id,
      monthly_rent: monthlyRent, advance_rent_required: Number(t.advance_rent || 0),
      security_deposit_required: Number(t.security_deposit || 0), bond_status: 'pending_collection',
      created_by: req.user?.id || null,
    }, { transaction: tx });

    const firstMoveInCode = await generateCode(MoveInChecklistItem, 'checklist_code', 'SSPC-MI-');
    const moveInCodes = nextCodesFrom(firstMoveInCode, MOVE_IN_ITEMS.length);
    await MoveInChecklistItem.bulkCreate(MOVE_IN_ITEMS.map(([item, evidence], i) => ({
      branch_id: app.branch_id,
      checklist_code: moveInCodes[i],
      tenancy_id: t.id,
      property_id: app.property_id,
      tenant_contact_id: app.tenant_contact_id,
      checklist_item: item,
      evidence_required: evidence,
      sort_order: i,
      created_by: req.user?.id || null,
    })), { transaction: tx });

    // Folios + held deposit posting
    const folios = await ensureFoliosForTenancy(t, { transaction: tx });
    if (folios.tenantFolio && Number(t.security_deposit || 0) > 0) {
      const depositCategory = await AccountCategory.findOne({ where: { code: 'DEPOSIT' }, transaction: tx });
      await postFolioTransaction({
        folio_id: folios.tenantFolio.id, transaction_type: 'charge', bucket: 'deposit',
        account_category_id: depositCategory?.id || null, property_id: t.property_id, tenancy_id: t.id,
        description: 'Security deposit held', debit: Number(t.security_deposit || 0), created_by: req.user?.id || null,
      }, { transaction: tx });
    }

    await app.update({ status: 'converted', converted_tenancy_id: t.id, owner_decision: 'approved' }, { transaction: tx });
    await PartyRoleProfile.findOrCreate({
      where: { contact_id: app.tenant_contact_id, role_type: 'tenant', tenancy_id: t.id },
      defaults: {
        branch_id: app.branch_id,
        profile_code: await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-'),
        contact_id: app.tenant_contact_id,
        role_type: 'tenant',
        status: 'agreement_pending',
        property_id: app.property_id,
        application_id: app.id,
        tenancy_id: t.id,
        kyc_status: 'complete',
        documents_status: 'pending',
        approval_status: 'approved',
        next_action: 'Generate tenancy agreement',
        created_by: req.user?.id || null,
      },
      transaction: tx,
    });
    return t;
  });

  res.status(201).json({ data: result, message: `Tenancy ${result.tenancy_code} created from application.` });
});

// ─── OWNER APPROVAL LINK ────────────────────────────────────────────────────
// POST /api/tenant-applications/:id/send-owner-approval
// Generates a secure token link the owner opens (no login) to approve/reject
// the tenant. Emails the owner when they have an email on file.
const crypto = require('crypto');
exports.sendOwnerApproval = asyncHandler(async (req, res) => {
  const app = await TenantApplication.findOne({
    where: { id: req.params.id, ...branchScope(req) }, include: [propInc],
  });
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  if (!app.property_id) return res.status(400).json({ error: 'Link the application to a property first.' });

  const owner = app.property?.owner_contact_id ? await Contact.findByPk(app.property.owner_contact_id) : null;

  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 14 * 86400000);
  await app.update({
    owner_approval_token: token,
    owner_approval_expires_at: expires,
    owner_approval_sent_at: new Date(),
    owner_decided_at: null,
    status: 'awaiting_owner_approval',
    owner_decision: 'pending',
  });

  const base = process.env.APPROVE_BASE_URL || `${req.protocol}://${req.get('host')}/admin/approve`;
  const link = `${base}/${token}`;

  // Email the owner if possible (best-effort; the link is returned regardless
  // so staff can share it via WhatsApp/SMS).
  let emailed = false;
  if (owner?.email) {
    try {
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(owner.email, `Tenant approval needed — ${app.property?.title || 'your property'}`,
        `<p>Dear ${owner.full_name},</p>
         <p>A tenant application for <b>${app.property?.title}</b> is ready for your decision:</p>
         <p><b>${app.applicant_name}</b> · ${app.occupation || ''} ${app.employer ? 'at ' + app.employer : ''}</p>
         <p><a href="${link}">Review and approve / reject here</a> (no login needed — link valid 14 days)</p>
         <p>— Seventh Sky Property Care</p>`);
      emailed = true;
    } catch { /* best-effort */ }
  }

  res.json({
    data: { link, expires_at: expires, owner_email: owner?.email || null, emailed },
    message: emailed
      ? `Approval link emailed to ${owner.email}. You can also share the link directly.`
      : 'Approval link generated — share it with the owner via WhatsApp/SMS/email.',
  });
});
