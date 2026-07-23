const { Op } = require('sequelize');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const Agreement = require('../models/Agreement');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const SigningAuditLog = require('../models/SigningAuditLog');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const User = require('../models/User');
const FIELDS = [
  'contact_id', 'role_type', 'status', 'property_id', 'application_id', 'tenancy_id', 'agreement_id', 'envelope_id',
  'kyc_status', 'documents_status', 'approval_status', 'next_action', 'notes', 'approved_by', 'approved_at', 'source',
];

const include = [
  { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email', 'contact_type', 'company_name', 'national_id', 'passport_no', 'tin'] },
  { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] },
  { model: Agreement, as: 'agreement', attributes: ['id', 'agreement_code', 'title', 'current_version'] },
  { model: SigningEnvelope, as: 'envelope', attributes: ['id', 'envelope_code', 'title', 'status'] },
];
const detailInclude = include.map((item) => item.as === 'envelope' ? {
  ...item,
  attributes: ['id', 'envelope_code', 'title', 'status', 'terms', 'cc_emails', 'message', 'sent_at', 'expires_at', 'completed_at'],
  include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'signer_order', 'role', 'name', 'email', 'phone', 'contact_id', 'status', 'viewed_at', 'signed_at'] }],
} : item);

const signerRoleFor = (roleType) => {
  if (roleType === 'landlord' || roleType === 'tenant') return roleType;
  if (roleType === 'supplier' || roleType === 'third_party') return 'provider';
  return 'client';
};

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.role_type) where.role_type = req.query.role_type;
  if (req.query.status) where.status = req.query.status;
  if (req.query.contact_id) where.contact_id = req.query.contact_id;
  if (req.query.property_id) where.property_id = req.query.property_id;
  if (req.query.tenancy_id) where.tenancy_id = req.query.tenancy_id;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ profile_code: { [Op.like]: s } }, { next_action: { [Op.like]: s } }];
  }
  const { rows, count } = await PartyRoleProfile.findAndCountAll({ where, include, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: detailInclude });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  let ownerCandidates = [];
  if (row.property_id && row.role_type === 'vendor') {
    const { SaleParty } = require('../models/SalesModels');
    const [roleOwners, saleOwners] = await Promise.all([
      PartyRoleProfile.findAll({
        where: { property_id: row.property_id, branch_id: row.branch_id, role_type: 'vendor', status: { [Op.notIn]: ['voided', 'rejected'] } },
        include: [{ model: Contact, as: 'contact', attributes: ['id', 'full_name', 'email', 'primary_phone'] }],
      }),
      SaleParty.findAll({
        where: { property_id: row.property_id, branch_id: row.branch_id, role: 'vendor', status: 'active' },
        include: [{ model: Contact, attributes: ['id', 'full_name', 'email', 'primary_phone'] }],
      }),
    ]);
    const byContact = new Map();
    for (const owner of roleOwners) if (owner.contact) byContact.set(Number(owner.contact.id), owner.contact.get({ plain: true }));
    for (const owner of saleOwners) if (owner.Contact) byContact.set(Number(owner.Contact.id), owner.Contact.get({ plain: true }));
    ownerCandidates = [...byContact.values()];
  }
  res.json({ data: { ...row.get({ plain: true }), owner_candidates: ownerCandidates } });
});

// GET /landlord-prefill?contact_id=  → owner-wizard-shaped prefill from a pulled
// landlord's contact KYC + their most recent owner profile (bank / disbursement).
exports.landlordPrefill = asyncHandler(async (req, res) => {
  const contact_id = req.query.contact_id;
  if (!contact_id) return res.status(400).json({ error: 'contact_id is required.' });
  const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
  const c = await Contact.findOne({ where: { id: contact_id, ...branchScope(req) } });
  if (!c) return res.status(404).json({ error: 'Contact not found.' });
  const last = await PropertyOwnerProfile.findOne({ where: { contact_id }, order: [['created_at', 'DESC']] });

  const prefill = {
    contact_id: c.id,
    nid_number: c.national_id || '', tin_number: c.tin || '', passport_number: c.passport_no || '',
    current_address: [c.area, c.city, c.district].filter(Boolean).join(', '),
  };
  if (last) {
    for (const k of ['ownership_status', 'nid_front_url', 'nid_back_url', 'bank_name', 'bank_branch',
      'bank_account_name', 'bank_account_number', 'bank_routing_number', 'bkash_number', 'nagad_number',
      'preferred_payment', 'disbursement_frequency', 'disbursement_day', 'management_commission',
      'joint_owner_name', 'joint_owner_phone', 'joint_owner_email', 'joint_owner_nid']) {
      if (last[k] != null && last[k] !== '') prefill[k] = last[k];
    }
  }
  res.json({ data: prefill });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.contact_id) return res.status(400).json({ error: 'contact_id is required.' });
  if (!data.role_type) return res.status(400).json({ error: 'role_type is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  const [contact, property] = await Promise.all([
    Contact.findOne({ where: { id: data.contact_id, ...branchScope(req) } }),
    data.property_id ? Property.findOne({ where: { id: data.property_id, ...branchScope(req) } }) : null,
  ]);
  if (!contact) return res.status(400).json({ error: 'Contact not found in this branch.' });
  if (data.property_id && !property) return res.status(400).json({ error: 'Property not found in this branch.' });
  data.created_by = req.user?.id || null;
  data.profile_code = await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-');
  if (!data.status) data.status = data.agreement_id ? 'agreement_pending' : 'draft';
  if (!data.next_action) data.next_action = data.agreement_id ? 'Send agreement for signing' : 'Select required agreement';
  const row = await PartyRoleProfile.create(data);
  // Carry over the contact's previously verified KYC (identity docs from any
  // role, role docs from the same role) — the agreement still must be signed.
  let reuse = { reused: 0 };
  try { reuse = await require('../services/kycReuse.service').applyKycReuse(row, { actorId: req.user?.id }); } catch { /* non-fatal */ }
  const fresh = await PartyRoleProfile.findByPk(row.id, { include });
  res.status(201).json({
    data: fresh,
    kyc_reused: reuse.reused || 0,
    message: reuse.reused
      ? `${data.role_type} role profile created — ${reuse.reused} verified KYC document${reuse.reused === 1 ? '' : 's'} reused from previous onboarding.`
      : `${data.role_type} role profile created.`,
  });
});

// POST /:id/kyc-reuse — manually pull the contact's previously verified KYC
// into this profile (for profiles created before reuse existed).
exports.reuseKyc = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  if (['active', 'signed', 'voided', 'rejected'].includes(row.status)) return res.status(409).json({ error: `KYC reuse is not applicable to a ${row.status} profile.` });
  const result = await require('../services/kycReuse.service').applyKycReuse(row, { actorId: req.user?.id });
  const fresh = await PartyRoleProfile.findByPk(row.id, { include });
  res.json({
    data: fresh,
    kyc_reused: result.reused || 0,
    reused_types: result.reused_types || [],
    message: result.reused
      ? `${result.reused} verified document${result.reused === 1 ? '' : 's'} reused — ${fresh.kyc_status === 'complete' ? 'KYC is complete; only the agreement remains.' : 'submit the remaining documents.'}`
      : result.reason === 'no_prior_profiles'
        ? 'This contact has no previous role profiles to reuse KYC from.'
        : 'No reusable verified documents were found (property-specific documents are never reused).',
  });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  const data = pick(req.body, FIELDS);
  if (data.contact_id) {
    const contact = await Contact.findOne({ where: { id: data.contact_id, ...branchScope(req) } });
    if (!contact) return res.status(400).json({ error: 'Contact not found in this branch.' });
  }
  if (data.property_id) {
    const property = await Property.findOne({ where: { id: data.property_id, ...branchScope(req) } });
    if (!property) return res.status(400).json({ error: 'Property not found in this branch.' });
  }
  await row.update(data);
  const fresh = await PartyRoleProfile.findByPk(row.id, { include });
  res.json({ data: fresh, message: 'Role profile updated.' });
});

// POST /:id/start-signing
//   body: { terms?: {...overrides}, cc_emails?: [], message?: string, send?: bool (default true) }
// Generates a REAL prefilled agreement for the role (management / sales agency /
// buyer service / supplier), captures structured terms, and sends it for
// signing. On completion the activation hook syncs terms + activates the role.
const crypto = require('crypto');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const { ROLE_BUILDERS } = require('../services/agreementTemplates.service');

const normalizeAgreementSigners = (requested, row, req) => {
  const allowedRoles = new Set(['client', 'landlord', 'tenant', 'provider', 'staff_countersign', 'witness']);
  const supplied = Array.isArray(requested) ? requested : [];
  const signers = supplied
    .map((signer, index) => ({
      name: String(signer.name || '').trim(),
      email: String(signer.email || '').trim(),
      phone: signer.phone || null,
      contact_id: signer.contact_id || null,
      role: allowedRoles.has(signer.role) ? signer.role : signerRoleFor(row.role_type),
      signer_order: Number(signer.signer_order) || index + 1,
    }))
    .filter((signer) => signer.name && signer.email);
  if (!signers.length) signers.push({
    name: row.contact.full_name,
    email: row.contact.email,
    phone: row.contact.primary_phone || null,
    role: signerRoleFor(row.role_type),
    contact_id: row.contact_id,
    signer_order: 1,
  });
  if (!signers.some((signer) => signer.role === 'staff_countersign') && (req.body.countersigner_email || req.user?.email)) {
    signers.push({
      name: req.body.countersigner_name || req.user?.name || 'Seventh Sky',
      email: req.body.countersigner_email || req.user.email,
      role: 'staff_countersign',
      contact_id: null,
      signer_order: Math.max(...signers.map((signer) => signer.signer_order), 0) + 1,
    });
  }
  return signers
    .sort((a, b) => a.signer_order - b.signer_order)
    .map((signer, index) => ({ ...signer, signer_order: index + 1 }));
};

async function syncRoleAgreementStatus(row, agreementStatus, actorId = null, transaction = undefined) {
  if (row.role_type === 'landlord' && row.property_id) {
    await PropertyOwnerProfile.update({ agreement_status: agreementStatus }, { where: { property_id: row.property_id }, transaction });
  }
  if (row.role_type === 'vendor' && row.property_id) {
    const { SaleProfile } = require('../models/SalesModels');
    await SaleProfile.update(
      { agreement_status: agreementStatus, updated_by: actorId },
      { where: { property_id: row.property_id, branch_id: row.branch_id }, transaction },
    );
  }
}

exports.startSigning = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) }, include });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  if (!row.contact?.email) return res.status(400).json({ error: `${row.contact?.full_name || 'Contact'} has no email on file. Add an email before sending an agreement.` });
  const send = req.body.send !== false;
  if (send && row.role_type === 'landlord' && row.status !== 'active' && (row.kyc_status !== 'complete' || row.documents_status !== 'complete')) {
    return res.status(400).json({ error: 'Verify the owner KYC and required documents before sending the management agreement.' });
  }
  if (row.role_type === 'tenant' && row.tenancy_id) {
    return res.status(400).json({ error: 'Tenant agreements are sent from the tenancy: use POST /api/tenancies/:id/send-agreement.' });
  }
  if (row.envelope && row.envelope.status !== 'voided') {
    return res.status(409).json({
      error: row.envelope.status === 'draft'
        ? 'This agreement already has a draft. Edit and send the existing draft.'
        : 'This agreement has already been sent. Use Edit sent agreement when it has no signatures.',
    });
  }

  // 1. Build the prefilled document + terms for this role
  const builder = ROLE_BUILDERS[row.role_type];
  if (!builder) return res.status(400).json({ error: `No agreement template for role '${row.role_type}'.` });
  const fullContact = await Contact.findByPk(row.contact_id);
  const property = row.property_id ? await Property.findByPk(row.property_id) : null;
  const ownerProfile = (row.role_type === 'landlord' && row.property_id)
    ? await PropertyOwnerProfile.findOne({ where: { property_id: row.property_id } }) : null;

  const doc = builder({
    property, owner: fullContact, ownerProfile,
    vendor: fullContact, buyer: fullContact, supplier: fullContact,
    overrides: req.body.terms || {},
  });

  // 2. Envelope + signers (counterparty first, Seventh Sky countersign second) — sent immediately.
  const cc = new Set(Array.isArray(req.body.cc_emails) ? req.body.cc_emails : []);
  const expires = new Date(Date.now() + 14 * 86400000);

  const env = await SigningEnvelope.create({
    branch_id: row.branch_id,
    envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
    title: doc.title,
    document_html: doc.html,
    message: req.body.message || null,
    related_type: 'party_role',
    related_id: row.id,
    terms: doc.terms,
    cc_emails: [...cc],
    signing_order_enforced: true,
    status: send ? 'sent' : 'draft',
    sent_at: send ? new Date() : null,
    expires_at: send ? expires : null,
    created_by: req.user?.id || null,
  });

  const signers = normalizeAgreementSigners(req.body.signers, row, req);
  const links = [];
  for (let i = 0; i < signers.length; i++) {
    const token = send ? crypto.randomBytes(24).toString('hex') : null;
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, ...signers[i],
      access_token: token, token_expires_at: send ? expires : null,
      status: send ? (signers[i].signer_order === 1 ? 'sent' : 'pending') : 'pending',
    });
    await SignatureField.bulkCreate([
      { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
      { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
    ]);
    if (token) links.push({ name: signer.name, email: signer.email, order: signer.signer_order, token });
  }

  await row.update({
    envelope_id: env.id,
    status: send ? 'signing_sent' : 'agreement_pending',
    next_action: send ? 'Waiting for signatures' : 'Send agreement envelope',
  });
  await syncRoleAgreementStatus(row, send ? 'sent' : 'draft', req.user?.id || null);

  // 3. Email signing links (best-effort)
  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  if (send) {
    try {
      const { sendEmail } = require('../services/communication.service');
      for (const l of links) {
        if (!l.email) continue;
        await sendEmail(l.email, `Please sign: ${doc.title}`,
          `<p>Dear ${l.name},</p><p>Please review and sign:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p><p>This link expires in 14 days.</p><p>— Seventh Sky Property Care</p>`
        ).catch(() => {});
      }
    } catch { /* best-effort */ }
  }

  const fresh = await PartyRoleProfile.findByPk(row.id, { include: detailInclude });
  res.status(201).json({
    data: fresh,
    envelope: env,
    links: links.map((l) => ({ ...l, link: `${base}/${l.token}` })),
    message: send
      ? `Prefilled ${row.role_type} agreement sent for signing. Role activates automatically on completion.`
      : 'Prefilled agreement drafted — send when ready.',
  });
});

const loadAgreementProfile = (req) => PartyRoleProfile.findOne({
  where: { id: req.params.id, ...branchScope(req) },
  include: detailInclude,
});

const hasSignedAgreement = (row) => {
  const envelopeStatus = row.envelope?.status;
  return ['partially_signed', 'completed'].includes(envelopeStatus)
    || (row.envelope?.signers || []).some((signer) => signer.status === 'signed' || signer.signed_at);
};

const buildRoleAgreement = async (row, overrides) => {
  const builder = ROLE_BUILDERS[row.role_type];
  if (!builder) return null;
  const fullContact = await Contact.findByPk(row.contact_id);
  const property = row.property_id ? await Property.findByPk(row.property_id) : null;
  const ownerProfile = row.role_type === 'landlord' && row.property_id
    ? await PropertyOwnerProfile.findOne({ where: { property_id: row.property_id } })
    : null;
  return builder({
    property,
    owner: fullContact,
    ownerProfile,
    vendor: fullContact,
    buyer: fullContact,
    supplier: fullContact,
    overrides,
  });
};

// POST /:id/agreement/reopen
// An unsigned sent agreement may be withdrawn to draft without losing its terms
// or signer details. Once any party signs, the executed record is immutable.
exports.reopenAgreement = asyncHandler(async (req, res) => {
  const row = await loadAgreementProfile(req);
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  if (!row.envelope) return res.status(404).json({ error: 'No agreement envelope is linked to this role profile.' });
  if (hasSignedAgreement(row)) {
    return res.status(409).json({ error: 'This agreement cannot be edited because at least one signer has already signed it.' });
  }
  if (row.envelope.status === 'voided') {
    return res.status(409).json({ error: 'A voided agreement cannot be reopened. Create a new agreement instead.' });
  }

  const transaction = await PartyRoleProfile.sequelize.transaction();
  try {
    if (row.envelope.status !== 'draft') {
      await row.envelope.update({
        status: 'draft',
        sent_at: null,
        expires_at: null,
        completed_at: null,
        content_hash: null,
        voided_reason: null,
      }, { transaction });
      await EnvelopeSigner.update({
        status: 'pending',
        access_token: null,
        token_expires_at: null,
        otp_code: null,
        viewed_at: null,
        signed_at: null,
        declined_reason: null,
        ip_address: null,
        user_agent: null,
      }, { where: { envelope_id: row.envelope.id }, transaction });
      await SignatureField.update({ value: null }, { where: { envelope_id: row.envelope.id }, transaction });
      await SigningAuditLog.create({
        envelope_id: row.envelope.id,
        event: 'reopened_to_draft',
        actor_email: req.user?.email || null,
        ip_address: req.ip,
        user_agent: req.get('user-agent') || null,
        meta: { previous_status: row.envelope.status },
      }, { transaction });
    }
    await row.update({ status: 'agreement_pending', next_action: 'Review agreement details and resend' }, { transaction });
    await syncRoleAgreementStatus(row, 'draft', req.user?.id || null, transaction);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const fresh = await PartyRoleProfile.findByPk(row.id, { include: detailInclude });
  res.json({ data: fresh, message: 'Unsigned agreement returned to draft with all details preserved.' });
});

// PUT /:id/agreement/draft
// Rebuilds the document from edited structured terms and replaces unsigned
// signer rows. This endpoint deliberately refuses every non-draft envelope.
exports.updateAgreementDraft = asyncHandler(async (req, res) => {
  const row = await loadAgreementProfile(req);
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  if (!row.envelope) return res.status(404).json({ error: 'No agreement draft is linked to this role profile.' });
  if (hasSignedAgreement(row)) {
    return res.status(409).json({ error: 'This agreement cannot be edited because at least one signer has already signed it.' });
  }
  if (row.envelope.status !== 'draft') {
    return res.status(409).json({ error: 'Return this unsigned agreement to draft before editing it.' });
  }

  const requestedSigners = req.body.signers;
  if (requestedSigners != null && (!Array.isArray(requestedSigners) || requestedSigners.some((signer) => !String(signer?.name || '').trim() || !String(signer?.email || '').trim()))) {
    return res.status(400).json({ error: 'Every signer must have a name and email address.' });
  }
  let overrides = req.body.terms || {};
  if (typeof overrides === 'string') {
    try { overrides = JSON.parse(overrides); } catch { return res.status(400).json({ error: 'Agreement terms must be valid JSON.' }); }
  }
  if (!overrides || Array.isArray(overrides) || typeof overrides !== 'object') {
    return res.status(400).json({ error: 'Agreement terms must be an object.' });
  }

  const doc = await buildRoleAgreement(row, overrides);
  if (!doc) return res.status(400).json({ error: `No agreement template for role '${row.role_type}'.` });
  const signers = normalizeAgreementSigners(requestedSigners, row, req);
  const ccEmails = [...new Set((Array.isArray(req.body.cc_emails) ? req.body.cc_emails : []).map((email) => String(email).trim()).filter(Boolean))];
  const transaction = await PartyRoleProfile.sequelize.transaction();
  try {
    await row.envelope.update({
      title: doc.title,
      document_html: doc.html,
      terms: doc.terms,
      cc_emails: ccEmails,
      message: req.body.message || null,
      signing_order_enforced: req.body.signing_order_enforced !== false,
      content_hash: null,
    }, { transaction });
    await SignatureField.destroy({ where: { envelope_id: row.envelope.id }, transaction });
    await EnvelopeSigner.destroy({ where: { envelope_id: row.envelope.id }, transaction });
    for (const signerData of signers) {
      const signer = await EnvelopeSigner.create({
        envelope_id: row.envelope.id,
        ...signerData,
        status: 'pending',
        access_token: null,
        token_expires_at: null,
      }, { transaction });
      await SignatureField.bulkCreate([
        { envelope_id: row.envelope.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
        { envelope_id: row.envelope.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
      ], { transaction });
    }
    await row.update({ status: 'agreement_pending', next_action: 'Send agreement envelope' }, { transaction });
    await syncRoleAgreementStatus(row, 'draft', req.user?.id || null, transaction);
    await SigningAuditLog.create({
      envelope_id: row.envelope.id,
      event: 'draft_updated',
      actor_email: req.user?.email || null,
      ip_address: req.ip,
      user_agent: req.get('user-agent') || null,
      meta: { signers: signers.length, terms: Object.keys(doc.terms || {}) },
    }, { transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const fresh = await PartyRoleProfile.findByPk(row.id, { include: detailInclude });
  res.json({ data: fresh, message: 'Agreement draft updated. All entered details were preserved.' });
});

exports.archive = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  await row.update({ status: 'voided', next_action: 'Role onboarding voided' });
  res.json({ message: 'Role profile voided.' });
});

// POST /:id/registration-link — generate the public KYC intake link for this
// role (vendor/buyer/supplier/landlord). Emails it when the contact has email.
exports.registrationLink = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) }, include });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });

  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 30 * 86400000); // registration links live longer
  await row.update({
    registration_token: token,
    registration_expires_at: expires,
    registration_submitted_at: null,
    status: row.status === 'draft' ? 'kyc_pending' : row.status,
    next_action: 'Waiting for registrant to complete KYC form',
  });

  const base = process.env.REGISTER_BASE_URL || `${req.protocol}://${req.get('host')}/admin/register`;
  const link = `${base}/${token}`;

  let emailed = false;
  if (row.contact?.email) {
    try {
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(row.contact.email, `Complete your ${row.role_type} registration — Seventh Sky Property Care`,
        `<p>Dear ${row.contact.full_name},</p>
         <p>Please complete your ${String(row.role_type).replace(/_/g, ' ')} registration — KYC details and documents:</p>
         <p><a href="${link}">${link}</a></p>
         <p>The link is valid for 30 days. After review, we will send your agreement for electronic signing.</p>
         <p>— Seventh Sky Property Care</p>`);
      emailed = true;
    } catch { /* best-effort */ }
  }

  res.json({
    data: { link, expires_at: expires, emailed },
    message: emailed
      ? `Registration link emailed to ${row.contact.email}.`
      : 'Registration link generated — share it via WhatsApp/SMS/email.',
  });
});
