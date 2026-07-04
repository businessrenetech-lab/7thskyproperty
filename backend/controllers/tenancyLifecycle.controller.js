/**
 * tenancyLifecycle.controller.js
 * ------------------------------------------------------------------
 * Staff-side endpoints for the renewal, vacancy-notice, and deposit-
 * settlement workflows. Portal-scoped variants live in landlord/tenant
 * controllers.
 */
const { Op } = require('sequelize');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const VacancyNotice = require('../models/VacancyNotice');
const DepositSettlement = require('../models/DepositSettlement');
const lifecycle = require('../services/tenancyLifecycle.service');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const propInc = { model: Property, attributes: ['id', 'property_code', 'title', 'area', 'district'] };
const propIncNotice = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] };

// ═══ TENANCY AGREEMENT — generate prefilled doc, send for signing ═══════════
// POST /api/tenancies/:id/send-agreement
//   body: { signer_mode?: 'sspc'|'owner'|'three_party', terms?: {...overrides},
//           cc_emails?: [..], message?: string }
// Creates a signing envelope (related_type='tenancy') with a real prefilled
// tenancy agreement. On completion the activation hook makes the tenancy live.
const crypto = require('crypto');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const { TenantApplication } = require('../models/TenantApplication');
const Communication = require('../models/Communication');
const { buildTenancyAgreement } = require('../services/agreementTemplates.service');
const { generateCode } = require('../utils/codeGenerator');

exports.sendTenancyAgreement = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (t.lease_status === 'active') return res.status(400).json({ error: 'This tenancy is already active — agreement already executed.' });

  const [property, owner, tenant, application] = await Promise.all([
    t.property_id ? Property.findByPk(t.property_id) : null,
    t.owner_contact_id ? Contact.findByPk(t.owner_contact_id) : null,
    t.tenant_contact_id ? Contact.findByPk(t.tenant_contact_id) : null,
    t.application_id ? TenantApplication.findByPk(t.application_id) : null,
  ]);
  if (!tenant) return res.status(400).json({ error: 'Tenancy has no tenant contact — link a tenant first.' });
  if (!tenant.email) return res.status(400).json({ error: `Tenant ${tenant.full_name} has no email on file. Add an email to their contact before sending.` });

  // 1. Build the prefilled agreement + structured terms
  const doc = buildTenancyAgreement({ tenancy: t, property, owner, tenant, application, overrides: req.body.terms || {} });

  // 2. Signers — default: tenant + Seventh Sky; owner CC'd.
  const mode = req.body.signer_mode || 'sspc';
  const signers = [{ name: tenant.full_name, email: tenant.email, role: 'tenant', contact_id: tenant.id, signer_order: 1 }];
  if (mode === 'owner' || mode === 'three_party') {
    if (!owner?.email) return res.status(400).json({ error: 'signer_mode requires the owner to sign, but the owner has no email on file.' });
    signers.push({ name: owner.full_name, email: owner.email, role: 'landlord', contact_id: owner.id, signer_order: 2 });
  }
  if (mode === 'sspc' || mode === 'three_party') {
    signers.push({ name: req.user?.name || 'Seventh Sky Property Care', email: req.user?.email, role: 'staff_countersign', user_id: req.user?.id || null, signer_order: signers.length + 1 });
  }

  // Owner is CC'd whenever they are not themselves a signer.
  const cc = new Set(Array.isArray(req.body.cc_emails) ? req.body.cc_emails : []);
  if (owner?.email && mode === 'sspc') cc.add(owner.email);

  // 3. Create envelope + signers + fields + send — one transaction.
  const expires = new Date(Date.now() + 14 * 86400000);
  const result = await sequelize.transaction(async (tx) => {
    const env = await SigningEnvelope.create({
      branch_id: t.branch_id,
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
      title: doc.title,
      document_html: doc.html,
      message: req.body.message || `Please review and sign the tenancy agreement for ${property?.title || 'the property'}.`,
      related_type: 'tenancy',
      related_id: t.id,
      terms: doc.terms,
      cc_emails: [...cc],
      signing_order_enforced: true,
      status: 'sent',
      sent_at: new Date(),
      expires_at: expires,
      created_by: req.user?.id || null,
    }, { transaction: tx });

    const links = [];
    for (let i = 0; i < signers.length; i++) {
      const token = crypto.randomBytes(24).toString('hex');
      const signer = await EnvelopeSigner.create({
        envelope_id: env.id, ...signers[i],
        access_token: token, token_expires_at: expires,
        status: signers[i].signer_order === 1 ? 'sent' : 'pending',
      }, { transaction: tx });
      await SignatureField.bulkCreate([
        { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
        { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
      ], { transaction: tx });
      links.push({ name: signer.name, email: signer.email, order: signer.signer_order, token });
    }

    await t.update({ lease_status: 'sent_for_signature', agreement_sent_date: new Date().toISOString().slice(0, 10) }, { transaction: tx });

    // Keep the tenant role profile in lockstep
    const [profile] = await PartyRoleProfile.findOrCreate({
      where: { contact_id: tenant.id, role_type: 'tenant', tenancy_id: t.id },
      defaults: {
        branch_id: t.branch_id,
        profile_code: await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-'),
        property_id: t.property_id, application_id: t.application_id,
        status: 'signing_sent', next_action: 'Waiting for signatures',
        created_by: req.user?.id || null,
      },
      transaction: tx,
    });
    await profile.update({ envelope_id: env.id, status: 'signing_sent', next_action: 'Waiting for signatures' }, { transaction: tx });

    return { env, links };
  });

  // 4. Email signing links + CC notification (best-effort, never blocks)
  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try {
    const { sendEmail } = require('../services/communication.service');
    for (const l of result.links) {
      if (!l.email) continue;
      await sendEmail(l.email, `Please sign: ${doc.title}`,
        `<p>Dear ${l.name},</p><p>Please review and sign the tenancy agreement:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p><p>This link expires in 14 days.</p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
    for (const ccEmail of cc) {
      await sendEmail(ccEmail, `Tenancy agreement sent for signing — ${property?.title || ''}`,
        `<p>The tenancy agreement <b>${doc.title}</b> has been sent for signing. You will be notified when it completes.</p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
  } catch { /* mail is best-effort */ }

  // 5. Property timeline entry
  if (t.property_id) {
    await Communication.create({
      branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id,
      channel: 'email', direction: 'outbound',
      subject: `Tenancy agreement sent — ${result.env.envelope_code}`,
      body: `Signers: ${result.links.map((l) => `${l.name} <${l.email}>`).join(', ')}${cc.size ? ` · CC: ${[...cc].join(', ')}` : ''}`,
      user_id: req.user?.id || null,
    }).catch(() => {});
  }

  res.status(201).json({
    data: { envelope: result.env, links: result.links.map((l) => ({ ...l, link: `${base}/${l.token}` })) },
    message: `Tenancy agreement sent — ${result.links.length} signer(s)${cc.size ? `, owner CC'd (${[...cc].join(', ')})` : ''}. Tenancy activates automatically on completion.`,
  });
});
const tenantInc = { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] };
const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] };

// ═══ RENEWALS ═══════════════════════════════════════════════════════════════

// GET /api/property-management/renewals — dashboard bucketed by 30/60/90 days
exports.renewalsDashboard = asyncHandler(async (req, res) => {
  const bw = branchScope(req);
  const where = { status: 'active', ...bw };
  const buckets = { d30: [], d60: [], d90: [], in_flight: [] };

  const in_flight = await Tenancy.findAll({
    where: { ...bw, renewal_status: { [Op.in]: ['proposed', 'owner_approved', 'tenant_accepted'] } },
    include: [propInc, tenantInc],
    order: [['renewal_proposed_at', 'DESC']],
  });
  buckets.in_flight = in_flight;

  // Expiring buckets — only for tenancies not already in a renewal flow
  const now = new Date();
  const plus = (days) => {
    const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
  };
  const nowIso = now.toISOString().slice(0, 10);

  const inflightIds = in_flight.map((t) => t.id);
  const commonWhere = {
    ...where,
    renewal_status: 'none',
    ...(inflightIds.length ? { id: { [Op.notIn]: inflightIds } } : {}),
  };
  buckets.d30 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.between]: [nowIso, plus(30)] } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });
  buckets.d60 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.gt]: plus(30), [Op.lte]: plus(60) } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });
  buckets.d90 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.gt]: plus(60), [Op.lte]: plus(90) } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });

  res.json({
    data: buckets,
    counts: { d30: buckets.d30.length, d60: buckets.d60.length, d90: buckets.d90.length, in_flight: buckets.in_flight.length },
  });
});

// POST /api/tenancies/:id/renewal/propose
exports.proposeRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.proposeRenewal(t.id, { ...pick(req.body, ['new_rent', 'new_service_charge', 'new_lease_end', 'notes']), user_id: req.user?.id || null });
    res.json({ data: updated, message: 'Renewal proposed — sent to owner for approval.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/decide (staff-side; landlord uses portal)
exports.decideRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.decideRenewal(t.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Renewal ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/tenant-accept (staff can accept on tenant's behalf)
exports.tenantAcceptRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.tenantAcceptRenewal(t.id, { note: req.body?.note });
    res.json({ data: updated, message: 'Tenant accepted the renewal.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/activate — applies new terms
exports.activateRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.activateRenewal(t.id);
    res.json({ data: updated, message: 'Renewal activated — tenancy terms updated.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══ VACANCY NOTICES ═══════════════════════════════════════════════════════

exports.listVacancyNotices = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.property_id) where.property_id = req.query.property_id;
  const { rows, count } = await VacancyNotice.findAndCountAll({
    where, include: [propIncNotice, tenantInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getVacancyNotice = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propIncNotice, tenantInc] });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  res.json({ data: vn });
});

exports.createVacancyNotice = asyncHandler(async (req, res) => {
  const { tenancy_id, intended_vacate_date, reason, notes } = req.body || {};
  if (!tenancy_id || !intended_vacate_date) return res.status(400).json({ error: 'tenancy_id and intended_vacate_date required.' });
  try {
    const vn = await lifecycle.submitVacancyNotice({
      tenancy_id, intended_vacate_date, reason, notes,
      submitted_by_type: 'staff', user_id: req.user?.id || null,
    });
    res.status(201).json({ data: vn, message: `Vacancy notice ${vn.notice_code} created.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.updateVacancyNotice = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  await vn.update(pick(req.body, ['status', 'exit_inspection_date', 'exit_inspection_id', 'keys_returned_at', 'notes']));
  res.json({ data: vn });
});

exports.scheduleExit = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  try {
    const updated = await lifecycle.scheduleExit(vn.id, { ...pick(req.body, ['exit_inspection_date', 'inspection_id']), user_id: req.user?.id || null });
    res.json({ data: updated, message: 'Exit scheduled.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══ DEPOSIT SETTLEMENTS ═══════════════════════════════════════════════════

exports.listSettlements = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await DepositSettlement.findAndCountAll({
    where, include: [propIncNotice, tenantInc, ownerInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propIncNotice, tenantInc, ownerInc] });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  res.json({ data: s });
});

// POST /api/deposit-settlements/preview — compute without persisting
exports.previewSettlement = asyncHandler(async (req, res) => {
  const { tenancy_id, damages_lines, cleaning, utility_dues, other_deductions, other_lines } = req.body || {};
  if (!tenancy_id) return res.status(400).json({ error: 'tenancy_id required.' });
  const preview = await lifecycle.computeDeposit(tenancy_id, { damages_lines, cleaning, utility_dues, other_deductions, other_lines });
  res.json({ data: preview });
});

// POST /api/deposit-settlements — create + persist
exports.createSettlement = asyncHandler(async (req, res) => {
  const { tenancy_id } = req.body || {};
  if (!tenancy_id) return res.status(400).json({ error: 'tenancy_id required.' });
  try {
    const s = await lifecycle.createSettlement({
      ...pick(req.body, ['tenancy_id', 'vacancy_notice_id', 'damages_lines', 'cleaning', 'utility_dues', 'other_deductions', 'other_lines', 'notes']),
      branch_id: resolveBranchId(req, req.body.branch_id),
      user_id: req.user?.id || null,
    });
    res.status(201).json({ data: s, message: `Settlement ${s.settlement_code} created.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.recomputeSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.recomputeSettlement(s.id, pick(req.body, ['damages_lines', 'cleaning', 'utility_dues', 'other_deductions', 'other_lines']));
    res.json({ data: updated, message: 'Settlement recomputed.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.decideSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.decideSettlement(s.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Settlement ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.markRefunded = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.markRefunded(s.id, { ...pick(req.body, ['refund_method', 'refund_reference']), user_id: req.user?.id || null });
    res.json({ data: updated, message: `Refund recorded. Tenancy closed.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
