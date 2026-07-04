const { Op } = require('sequelize');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const Agreement = require('../models/Agreement');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = [
  'contact_id', 'role_type', 'status', 'property_id', 'application_id', 'tenancy_id', 'agreement_id', 'envelope_id',
  'kyc_status', 'documents_status', 'approval_status', 'next_action', 'notes', 'approved_by', 'approved_at',
];

const include = [
  { model: Contact, as: 'contact', attributes: ['id', 'full_name', 'primary_phone', 'email', 'contact_type', 'company_name'] },
  { model: Property, as: 'property', attributes: ['id', 'property_code', 'title'] },
  { model: Agreement, as: 'agreement', attributes: ['id', 'agreement_code', 'title', 'current_version'] },
  { model: SigningEnvelope, as: 'envelope', attributes: ['id', 'envelope_code', 'title', 'status'] },
];

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
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) }, include });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  res.json({ data: row });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.contact_id) return res.status(400).json({ error: 'contact_id is required.' });
  if (!data.role_type) return res.status(400).json({ error: 'role_type is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.profile_code = await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-');
  if (!data.status) data.status = data.agreement_id ? 'agreement_pending' : 'draft';
  if (!data.next_action) data.next_action = data.agreement_id ? 'Send agreement for signing' : 'Select required agreement';
  const row = await PartyRoleProfile.create(data);
  const fresh = await PartyRoleProfile.findByPk(row.id, { include });
  res.status(201).json({ data: fresh, message: `${data.role_type} role profile created.` });
});

exports.update = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  await row.update(pick(req.body, FIELDS));
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

exports.startSigning = asyncHandler(async (req, res) => {
  const row = await PartyRoleProfile.findOne({ where: { id: req.params.id, ...branchScope(req) }, include });
  if (!row) return res.status(404).json({ error: 'Role profile not found.' });
  if (!row.contact?.email) return res.status(400).json({ error: `${row.contact?.full_name || 'Contact'} has no email on file. Add an email before sending an agreement.` });
  if (row.role_type === 'tenant' && row.tenancy_id) {
    return res.status(400).json({ error: 'Tenant agreements are sent from the tenancy: use POST /api/tenancies/:id/send-agreement.' });
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
  const send = req.body.send !== false;

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

  const signers = [
    { name: row.contact.full_name, email: row.contact.email, role: signerRoleFor(row.role_type), contact_id: row.contact_id, signer_order: 1 },
  ];
  if (req.body.countersigner_email || req.user?.email) {
    signers.push({ name: req.body.countersigner_name || req.user?.name || 'Seventh Sky', email: req.body.countersigner_email || req.user.email, role: 'staff_countersign', signer_order: 2 });
  }
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

  const fresh = await PartyRoleProfile.findByPk(row.id, { include });
  res.status(201).json({
    data: fresh,
    envelope: env,
    links: links.map((l) => ({ ...l, link: `${base}/${l.token}` })),
    message: send
      ? `Prefilled ${row.role_type} agreement sent for signing. Role activates automatically on completion.`
      : 'Prefilled agreement drafted — send when ready.',
  });
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
