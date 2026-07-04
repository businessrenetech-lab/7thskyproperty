/**
 * publicParty.controller.js
 * ------------------------------------------------------------------
 * Public, token-gated (no login) pages for external parties:
 *
 *   OWNER APPROVAL — the owner receives a link to approve/reject a tenant
 *   application without logging in:
 *     GET  /api/public-party/owner-approval/:token         → application summary
 *     POST /api/public-party/owner-approval/:token/decide  → { decision, note }
 *
 *   ROLE REGISTRATION — a prospective vendor/buyer/supplier/landlord receives
 *   a link to submit KYC + documents:
 *     GET  /api/public-party/register/:token          → form config + prefill
 *     POST /api/public-party/register/:token          → KYC fields + documents
 *
 * Staff-side link generators live in tenantApplication / partyRoleProfile
 * controllers.
 */
const { TenantApplication, TenantVerification, TenantOccupant } = require('../models/TenantApplication');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const Contact = require('../models/Contact');
const Property = require('../models/Property');
const PropertyDocument = require('../models/PropertyDocument');
const Communication = require('../models/Communication');
const { asyncHandler, pick } = require('../utils/controllerHelpers');

const num = (v) => Number(v || 0);
const tokenAlive = (row, tokenField, expiryField) =>
  row && row[tokenField] && (!row[expiryField] || new Date(row[expiryField]) > new Date());

// ═══ OWNER APPROVAL ══════════════════════════════════════════════════════════

async function loadApplicationByToken(token) {
  const app = await TenantApplication.findOne({
    where: { owner_approval_token: token },
    include: [
      { model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'address', 'area', 'district', 'approved_monthly_rent'] },
      { model: TenantVerification, as: 'verifications', separate: true, order: [['sort_order', 'ASC']] },
      { model: TenantOccupant, as: 'occupants', separate: true },
    ],
  });
  if (!tokenAlive(app, 'owner_approval_token', 'owner_approval_expires_at')) return null;
  return app;
}

exports.viewOwnerApproval = asyncHandler(async (req, res) => {
  const app = await loadApplicationByToken(req.params.token);
  if (!app) return res.status(404).json({ error: 'This approval link is invalid or has expired. Contact Seventh Sky for a new link.' });

  const verifications = app.verifications || [];
  const passed = verifications.filter((v) => v.status === 'passed' || v.status === 'na').length;

  // Only the decision-relevant summary — no sensitive documents.
  res.json({
    data: {
      application_code: app.application_code,
      status: app.status,
      owner_decision: app.owner_decision,
      property: app.property,
      applicant: {
        name: app.applicant_name,
        occupation: app.occupation,
        employer: app.employer,
        monthly_income: num(app.monthly_income),
        preferred_move_in: app.preferred_move_in,
        lease_period: app.lease_period,
        occupancy_requirement: app.occupancy_requirement,
      },
      proposed_rent: num(app.approved_rent || app.property?.approved_monthly_rent),
      lease_start_target: app.lease_start_target,
      occupants: (app.occupants || []).map((o) => ({ name: o.name, relationship: o.relationship, id_received: o.id_received })),
      verification: { passed, total: verifications.length, items: verifications.map((v) => ({ item: v.item, status: v.status })) },
      recommendation: app.recommendation,
      screening_notes: app.screening_notes,
      already_decided: !!app.owner_decided_at,
    },
  });
});

exports.decideOwnerApproval = asyncHandler(async (req, res) => {
  const app = await loadApplicationByToken(req.params.token);
  if (!app) return res.status(404).json({ error: 'This approval link is invalid or has expired.' });
  if (app.owner_decided_at) return res.status(409).json({ error: 'A decision has already been recorded for this application.' });

  const { decision, note } = req.body || {};
  if (!['approved', 'rejected', 'hold'].includes(decision)) return res.status(400).json({ error: 'decision must be approved | rejected | hold' });

  const status = decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : 'awaiting_owner_approval';
  await app.update({
    owner_decision: decision,
    owner_decided_at: decision === 'hold' ? null : new Date(),
    owner_decision_note: note || null,
    status,
  });

  // Property timeline entry so staff see the owner's decision immediately.
  if (app.property_id) {
    await Communication.create({
      branch_id: app.branch_id, entity_type: 'property', entity_id: app.property_id,
      channel: 'note', direction: 'inbound',
      subject: `Owner ${decision} tenant application ${app.application_code}`,
      body: `Applicant: ${app.applicant_name}${note ? `\nOwner note: ${note}` : ''}`,
    }).catch(() => {});
  }

  res.json({
    message: decision === 'approved'
      ? 'Thank you — the tenant is approved. Seventh Sky will prepare the tenancy agreement.'
      : decision === 'rejected'
        ? 'Decision recorded. Seventh Sky will continue the tenant search.'
        : 'Noted — Seventh Sky will contact you with more information.',
    decision,
  });
});

// ═══ ROLE REGISTRATION ═══════════════════════════════════════════════════════

// Role → which KYC fields + documents the public form asks for.
const REGISTRATION_CONFIG = {
  landlord: {
    title: 'Landlord / Property Owner Registration',
    kyc_fields: ['full_name', 'primary_phone', 'email', 'national_id', 'passport_no', 'tin', 'address_line1', 'city', 'district', 'is_nrb'],
    bank_fields: ['bank_name', 'bank_branch', 'bank_account_name', 'bank_account_number', 'bank_routing_number', 'bkash_number', 'nagad_number'],
    required_documents: ['NID front', 'NID back', 'Ownership deed', 'Recent utility bill'],
  },
  vendor: {
    title: 'Vendor / Seller Registration',
    kyc_fields: ['full_name', 'primary_phone', 'email', 'national_id', 'passport_no', 'tin', 'company_name', 'company_reg_no', 'address_line1', 'city', 'district'],
    bank_fields: [],
    required_documents: ['NID front', 'NID back', 'Ownership deed', 'Mutation / khatian', 'Tax receipt'],
  },
  buyer: {
    title: 'Buyer Registration',
    kyc_fields: ['full_name', 'primary_phone', 'email', 'national_id', 'passport_no', 'tin', 'address_line1', 'city', 'district'],
    bank_fields: [],
    required_documents: ['NID front', 'NID back', 'Proof of funds / bank statement'],
  },
  supplier: {
    title: 'Supplier / Service Provider Registration',
    kyc_fields: ['full_name', 'company_name', 'primary_phone', 'email', 'trade_licence_no', 'company_reg_no', 'tin', 'address_line1', 'city', 'district'],
    bank_fields: ['bank_name', 'bank_account_name', 'bank_account_number'],
    required_documents: ['Trade licence', 'Company registration', 'NID of proprietor'],
  },
  third_party: {
    title: 'Partner Registration',
    kyc_fields: ['full_name', 'company_name', 'primary_phone', 'email', 'company_reg_no', 'address_line1', 'city', 'district'],
    bank_fields: [],
    required_documents: ['Company registration'],
  },
  tenant: {
    title: 'Tenant Registration',
    kyc_fields: ['full_name', 'primary_phone', 'email', 'national_id', 'address_line1', 'city', 'district'],
    bank_fields: [],
    required_documents: ['NID front', 'NID back', 'Income proof'],
  },
};

async function loadProfileByToken(token) {
  const profile = await PartyRoleProfile.findOne({
    where: { registration_token: token },
    include: [
      { model: Contact, as: 'contact' },
      { model: Property, as: 'property', attributes: ['id', 'title', 'property_code', 'area', 'district'] },
    ],
  });
  if (!tokenAlive(profile, 'registration_token', 'registration_expires_at')) return null;
  return profile;
}

exports.viewRegistration = asyncHandler(async (req, res) => {
  const profile = await loadProfileByToken(req.params.token);
  if (!profile) return res.status(404).json({ error: 'This registration link is invalid or has expired. Contact Seventh Sky for a new link.' });
  const cfg = REGISTRATION_CONFIG[profile.role_type] || REGISTRATION_CONFIG.third_party;

  const c = profile.contact || {};
  res.json({
    data: {
      role_type: profile.role_type,
      title: cfg.title,
      property: profile.property || null,
      already_submitted: !!profile.registration_submitted_at,
      kyc_fields: cfg.kyc_fields,
      bank_fields: cfg.bank_fields,
      required_documents: cfg.required_documents,
      prefill: pick(c.toJSON ? c.toJSON() : c, [...cfg.kyc_fields]),
    },
  });
});

exports.submitRegistration = asyncHandler(async (req, res) => {
  const profile = await loadProfileByToken(req.params.token);
  if (!profile) return res.status(404).json({ error: 'This registration link is invalid or has expired.' });
  if (profile.registration_submitted_at) return res.status(409).json({ error: 'This registration has already been submitted. Contact Seventh Sky to make changes.' });

  const cfg = REGISTRATION_CONFIG[profile.role_type] || REGISTRATION_CONFIG.third_party;
  const contact = await Contact.findByPk(profile.contact_id);
  if (!contact) return res.status(400).json({ error: 'Linked contact missing — contact Seventh Sky.' });

  // 1. KYC → Contact (whitelisted per role)
  const kycPatch = pick(req.body, cfg.kyc_fields);
  if (Object.keys(kycPatch).length) await contact.update(kycPatch);

  // 2. Bank details → stash in profile notes-safe way: for landlord they sync via
  //    the management agreement terms; here we store them on the role profile
  //    notes AND (for landlord with property) directly to the owner profile.
  const bank = pick(req.body, cfg.bank_fields);
  if (profile.role_type === 'landlord' && profile.property_id && Object.keys(bank).length) {
    const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
    const [op] = await PropertyOwnerProfile.findOrCreate({
      where: { property_id: profile.property_id },
      defaults: { property_id: profile.property_id, contact_id: profile.contact_id },
    });
    await op.update({ ...bank, bank_details_collected: !!bank.bank_account_number || op.bank_details_collected });
  }

  // 3. Documents → polymorphic document store, visible to staff for review
  const docs = Array.isArray(req.body.documents) ? req.body.documents.filter((d) => d.file_url) : [];
  for (const d of docs) {
    await PropertyDocument.create({
      property_id: profile.property_id || null,
      entity_type: profile.role_type === 'landlord' ? 'owner' : profile.role_type === 'tenant' ? 'tenant' : 'property',
      entity_id: profile.contact_id,
      doc_type: d.doc_type || d.title || 'kyc',
      title: d.title || d.doc_type || 'Registration document',
      file_url: d.file_url,
      file_name: d.file_name || null,
      visibility: 'staff',
      is_private: true,
      required_for: `${profile.role_type}_registration`,
      description: `Submitted via public registration ${profile.profile_code}`,
    }).catch(() => {});
  }

  // 4. Advance the role profile
  await profile.update({
    kyc_status: 'complete',
    documents_status: docs.length ? 'complete' : 'pending',
    status: 'agreement_pending',
    next_action: 'Review registration, then generate & send the agreement',
    registration_submitted_at: new Date(),
    notes: [profile.notes, req.body.notes && `Registrant note: ${req.body.notes}`].filter(Boolean).join('\n'),
  });

  // 5. Staff visibility — timeline entry
  if (profile.property_id) {
    await Communication.create({
      branch_id: profile.branch_id, entity_type: 'property', entity_id: profile.property_id,
      channel: 'note', direction: 'inbound',
      subject: `${profile.role_type} registration submitted — ${profile.profile_code}`,
      body: `${contact.full_name} completed KYC (${Object.keys(kycPatch).length} fields) + ${docs.length} document(s). Ready for agreement.`,
    }).catch(() => {});
  }

  res.json({
    message: 'Registration submitted. Seventh Sky will review your details and send your agreement for signing.',
    documents_received: docs.length,
  });
});
