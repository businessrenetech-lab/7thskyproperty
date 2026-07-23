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
const KycDocument = require('../models/KycDocument');
const Communication = require('../models/Communication');
const { asyncHandler, pick } = require('../utils/controllerHelpers');
const { requirementsFor } = require('../services/kycRequirements.service');

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
    required_documents: ['NID front', 'NID back', 'Ownership deed', 'Khazna / mutation', 'Tax / holding receipt', 'Recent utility bill'],
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
      document_requirements: requirementsFor(profile.role_type),
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
  if (profile.role_type === 'landlord' && profile.property_id) {
    const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
    const Property = require('../models/Property');
    const [op] = await PropertyOwnerProfile.findOrCreate({
      where: { property_id: profile.property_id },
      defaults: { property_id: profile.property_id, contact_id: profile.contact_id },
    });
    await op.update({
      ...bank,
      contact_id: profile.contact_id,
      nid_number: kycPatch.national_id || op.nid_number,
      passport_number: kycPatch.passport_no || op.passport_number,
      tin_number: kycPatch.tin || op.tin_number,
      current_address: kycPatch.address_line1 || op.current_address,
      bank_details_collected: !!bank.bank_account_number || op.bank_details_collected,
    });
    await Property.update({ owner_contact_id: profile.contact_id }, { where: { id: profile.property_id, branch_id: profile.branch_id } });
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

    // Mirror the archive copy into the unified KYC store. Staff verification,
    // role completion and sales blockers are driven from KycDocument.
    if (d.document_type || d.doc_type) {
      const documentType = d.document_type || d.doc_type;
      const [kyc, created] = await KycDocument.findOrCreate({
        where: {
          related_type: 'party_role', related_id: profile.id,
          role: profile.role_type, document_type: documentType,
        },
        defaults: {
          branch_id: profile.branch_id,
          party_role_profile_id: profile.id,
          title: d.title || documentType,
          file_url: d.file_url,
          file_url_back: d.file_url_back || null,
          reference_no: d.reference_no || null,
          is_required: d.is_required !== false,
          status: 'submitted',
          uploaded_by_role: 'public',
        },
      });
      if (!created) await kyc.update({
        title: d.title || kyc.title,
        file_url: d.file_url,
        file_url_back: d.file_url_back || kyc.file_url_back,
        reference_no: d.reference_no || kyc.reference_no,
        status: 'submitted',
        rejection_reason: null,
      });
    }
  }

  // 4. Advance the role profile
  await profile.update({
    kyc_status: 'pending',
    documents_status: 'pending',
    status: 'agreement_pending',
    next_action: 'Review registration, then generate & send the agreement',
    registration_submitted_at: new Date(),
    source: 'website',
    notes: [profile.notes, req.body.notes && `Registrant note: ${req.body.notes}`].filter(Boolean).join('\n'),
  });
  const submittedKyc = await KycDocument.findOne({ where: { related_type: 'party_role', related_id: profile.id } });
  if (submittedKyc) await require('../services/kycAutomation.service').onKycChange(submittedKyc);

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

// ═══ PUBLIC TENANT APPLICATION (/apply/:token) ═══════════════════════════════
const crypto = require('crypto');

const DECLARATION_TEXT = 'I hereby declare that all information provided in this application is true, complete and correct to the best of my knowledge. I authorise Seventh Sky Property Care to verify the information provided, including contacting my employer and previous landlord, and I understand that any false statement may result in the rejection of this application or termination of any resulting tenancy.';

const loadApplyByToken = async (token) => {
  const app = await TenantApplication.findOne({ where: { application_token: token } });
  if (!app) return { error: 404, message: 'Invalid application link.' };
  if (app.application_token_expires_at && new Date(app.application_token_expires_at) < new Date()) return { error: 410, message: 'This application link has expired. Please ask Seventh Sky for a new one.' };
  return { app };
};

exports.viewApplication = asyncHandler(async (req, res) => {
  const ctx = await loadApplyByToken(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { app } = ctx;
  const property = app.property_id ? await Property.findByPk(app.property_id, { attributes: ['id', 'title', 'area', 'city', 'address', 'approved_monthly_rent', 'lease_min_period_months', 'bedrooms', 'bathrooms', 'property_type'] }) : null;
  res.json({ data: {
    already_submitted: !!app.submitted_at,
    property,
    prefill: { applicant_name: app.applicant_name === 'Pending applicant' ? '' : app.applicant_name, email: app.email, mobile: app.mobile },
    declaration_text: DECLARATION_TEXT,
  } });
});

// Whitelist of fields the APPLICANT may set (tokens/status excluded by design).
const PUBLIC_APPLY_FIELDS = [
  'applicant_name', 'mobile', 'email', 'occupation', 'employer', 'job_title', 'employment_duration', 'employment_type',
  'business_name', 'business_location', 'monthly_income', 'other_income', 'application_date',
  'photo_url', 'nid_number', 'nid_url', 'date_of_birth',
  'proposed_monthly_rent', 'preferred_move_in', 'lease_period', 'occupancy_requirement', 'notes',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'employer_ref_name', 'employer_ref_email', 'employer_ref_phone', 'employer_ref_role', 'employer_ref_company',
  'current_address', 'permanent_address', 'current_landlord_name', 'current_landlord_phone',
  'current_tenancy_address', 'current_tenancy_rent', 'current_tenancy_duration', 'reason_for_moving',
  'has_pets', 'pet_types',
];

exports.submitApplication = asyncHandler(async (req, res) => {
  const ctx = await loadApplyByToken(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { app } = ctx;
  if (app.submitted_at) return res.status(409).json({ error: 'This application has already been submitted. Contact Seventh Sky to make changes.' });
  if (req.body.declaration_accepted !== true) return res.status(400).json({ error: 'Please read and accept the declaration to submit your application.' });

  const data = pick(req.body, PUBLIC_APPLY_FIELDS);
  if (!data.applicant_name || !data.mobile) return res.status(400).json({ error: 'Your name and mobile number are required.' });
  data.declaration_accepted_at = new Date();
  data.submitted_at = new Date();
  data.status = 'submitted';
  data.application_date = data.application_date || new Date().toISOString().slice(0, 10);
  await app.update(data);

  // Occupants: replace with the submitted list [{name, phone}].
  if (Array.isArray(req.body.occupants)) {
    await TenantOccupant.destroy({ where: { application_id: app.id } });
    const occ = req.body.occupants.filter((o) => o && o.name).slice(0, 20);
    if (occ.length) {
      await TenantOccupant.bulkCreate(occ.map((o) => ({
        application_id: app.id, property_id: app.property_id,
        name: String(o.name).slice(0, 120), contact: o.phone ? String(o.phone).slice(0, 40) : null,
        relationship: o.relationship ? String(o.relationship).slice(0, 60) : null,
      })));
    }
  }

  // File the uploaded photo/NID as application documents.
  const { TenantApplicationDocument } = require('../models/TenantApplication');
  const docs = [];
  if (data.photo_url) docs.push({ application_id: app.id, doc_type: 'photo', title: 'Applicant photo', file_url: data.photo_url });
  if (data.nid_url) docs.push({ application_id: app.id, doc_type: 'nid', title: 'NID', file_url: data.nid_url });
  if (docs.length) await TenantApplicationDocument.bulkCreate(docs).catch(() => {});

  // Progressive SOP: an application arriving unlocks the tenant phase.
  if (app.property_id) {
    try { await require('../services/progressiveSop.service').unlockForEvent(app.property_id, 'application_created'); } catch { /* non-fatal */ }
  }

  // Auto-send the employer reference request when a contact was provided.
  let referenceSent = false;
  if (app.employer_ref_email && !app.employer_ref_token) {
    try {
      const token = crypto.randomBytes(24).toString('hex');
      await app.update({ employer_ref_token: token, employer_ref_sent_at: new Date() });
      const base = process.env.REFERENCE_BASE_URL || `${req.protocol}://${req.get('host')}/admin/reference`;
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(app.employer_ref_email, `Employment reference request — ${app.applicant_name}`,
        `<p>Dear ${app.employer_ref_name || 'Sir/Madam'},</p>
         <p><b>${app.applicant_name}</b> has applied for a rental property managed by <b>Seventh Sky Property Care</b> and has listed you as their employment reference at ${app.employer_ref_company || app.employer || 'your company'}.</p>
         <p>We would be grateful if you could take one minute to answer a few short questions. Your response strengthens the applicant's application; it is optional and treated confidentially.</p>
         <p><a href="${base}/${token}">${base}/${token}</a></p>
         <p>Thank you for your time.</p><p>— Seventh Sky Property Care</p>`).catch(() => {});
      referenceSent = true;
    } catch { /* non-fatal */ }
  }

  // Staff timeline note.
  try {
    await Communication.create({
      branch_id: app.branch_id, entity_type: 'property', entity_id: app.property_id,
      channel: 'note', direction: 'inbound', subject: `Tenant application submitted — ${app.application_code}`,
      body: `${app.applicant_name} submitted their application online.${referenceSent ? ' Employer reference request auto-sent.' : ''}`,
    });
  } catch { /* non-fatal */ }

  res.json({ message: 'Application submitted. Seventh Sky will review it and contact you shortly.', reference_sent: referenceSent });
});

// ═══ EMPLOYER REFERENCE (/reference/:token) ══════════════════════════════════

const REFERENCE_QUESTIONS = (app) => ([
  { key: 'works_at_company', label: `Does the applicant currently work at ${app.employer_ref_company || app.employer || 'your company'}?`, type: 'yes_no' },
  { key: 'role_correct', label: `Is "${app.job_title || app.occupation || 'the stated role'}" their job description?`, type: 'yes_no' },
  { key: 'employment_type', label: "What's their employment type?", type: 'choice', options: ['Permanent', 'Casual', 'Contractual'] },
  { key: 'start_period_correct', label: `Did they start working at ${app.employer_ref_company || app.employer || 'your company'} in ${app.employment_duration || 'the stated period'}?`, type: 'yes_no' },
  { key: 'salary_correct', label: `Is the applicant's monthly salary ${app.monthly_income ? '৳' + Number(app.monthly_income).toLocaleString() : 'as stated'} correct?`, type: 'yes_no_amount' },
  { key: 'role_ongoing', label: "Is the applicant's role likely to be ongoing?", type: 'yes_no' },
]);

const loadReferenceByToken = async (token) => {
  const app = await TenantApplication.findOne({ where: { employer_ref_token: token } });
  if (!app) return { error: 404, message: 'Invalid reference link.' };
  return { app };
};

exports.viewEmployerReference = asyncHandler(async (req, res) => {
  const ctx = await loadReferenceByToken(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { app } = ctx;
  res.json({ data: {
    already_submitted: !!app.employer_ref_submitted_at,
    applicant_name: app.applicant_name,
    company: app.employer_ref_company || app.employer || '',
    questions: REFERENCE_QUESTIONS(app),
  } });
});

exports.submitEmployerReference = asyncHandler(async (req, res) => {
  const ctx = await loadReferenceByToken(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { app } = ctx;
  if (app.employer_ref_submitted_at) return res.status(409).json({ error: 'This reference has already been submitted. Thank you.' });

  const a = req.body.answers || {};
  const response = {
    works_at_company: a.works_at_company === 'yes' ? 'yes' : 'no',
    role_correct: a.role_correct === 'yes' ? 'yes' : 'no',
    employment_type: ['Permanent', 'Casual', 'Contractual'].includes(a.employment_type) ? a.employment_type : null,
    start_period_correct: a.start_period_correct === 'yes' ? 'yes' : 'no',
    salary_correct: a.salary_correct === 'yes' ? 'yes' : 'no',
    salary_actual: a.salary_correct === 'no' && a.salary_actual ? Number(a.salary_actual) : null,
    role_ongoing: a.role_ongoing === 'yes' ? 'yes' : 'no',
    comments: a.comments ? String(a.comments).slice(0, 1000) : null,
  };
  await app.update({ employer_ref_response: response, employer_ref_submitted_at: new Date() });
  try {
    await Communication.create({
      branch_id: app.branch_id, entity_type: 'property', entity_id: app.property_id,
      channel: 'note', direction: 'inbound', subject: `Employer reference received — ${app.application_code}`,
      body: `Employer reference submitted for ${app.applicant_name}.`,
    });
  } catch { /* non-fatal */ }
  res.json({ message: 'Thank you — your reference has been recorded.' });
});
