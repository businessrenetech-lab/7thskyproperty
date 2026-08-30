const crypto = require('crypto');
const path = require('path');
const { Op } = require('sequelize');
const { asyncHandler, pick } = require('../utils/controllerHelpers');
const M = require('../models/waterTankOps');
const P = require('../models/waterTankProviders');
const providerAgreement = require('../services/wtProviderAgreement.service');
const { getServiceLine } = require('../config/serviceLines');

const PROFILE_FIELDS = [
  'legal_name', 'business_type', 'registration_no', 'contact_person', 'contact_email',
  'contact_phone', 'website', 'address', 'district', 'years_experience', 'team_size',
  'capacity_per_week', 'equipment_summary', 'service_categories', 'coverage_areas',
  'cumilla_exclusive', 'bank_details', 'proposed_rates', 'availability_notes',
  'onboarding_last_step',
];
const hash = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const safeArray = (value) => {
  let out = value;
  for (let i = 0; i < 3 && typeof out === 'string'; i++) { try { out = JSON.parse(out); } catch { return []; } }
  return Array.isArray(out) ? out : [];
};

async function load(token) {
  const provider = await M.WtProvider.findOne({ where: { onboarding_token_hash: hash(token) } });
  if (!provider) return { status: 404, error: 'This onboarding link is invalid.' };
  if (provider.onboarding_token_expires_at && new Date(provider.onboarding_token_expires_at) < new Date()) {
    return { status: 410, error: 'This onboarding link has expired. Ask Seventh Sky to issue a new one.' };
  }
  if (String(provider.status).toLowerCase() === 'terminated') return { status: 410, error: 'This provider application is closed.' };
  return { provider };
}

exports.view = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.provider) return res.status(ctx.status).json({ error: ctx.error });
  const provider = ctx.provider.get({ plain: true });
  // The provider belongs to a service line; drive the onboarding vocabulary from
  // its manifest so an Air Conditioning provider never sees Water Tank categories.
  const sl = getServiceLine(provider.service_line || 'water_tank');
  const [documents, catalog] = await Promise.all([
    P.WtProviderDocument.findAll({ where: { branch_id: provider.branch_id, provider_id: provider.id }, order: [['category', 'ASC'], ['doc_type', 'ASC']], raw: true }),
    providerAgreement.getCatalog(provider.branch_id, { vertical: sl.catalogue_vertical }),
  ]);
  res.json({
    service_line: provider.service_line || 'water_tank',
    service_label: sl.ui?.full_label || sl.label,
    provider: pick(provider, ['code', 'business_name', ...PROFILE_FIELDS, 'onboarding_submission_status', 'onboarding_stage']),
    documents: documents.map((d) => ({ id: d.id, category: d.category, doc_type: d.doc_type, doc_number: d.doc_number, issuer: d.issuer, issue_date: d.issue_date, expiry_date: d.expiry_date, file_url: d.file_url, status: d.status, verified: d.verified, notes: d.notes })),
    catalog,
    reference: {
      service_categories: sl.service_categories,
      districts: ['Dhaka', 'Cumilla', 'Chattogram', 'Sylhet', 'Rajshahi', 'Khulna', 'Barishal', 'Rangpur', 'Mymensingh', 'Gazipur', 'Narayanganj', "Cox's Bazar"],
      compliance_docs: sl.required_docs?.compliance || ['Trade Licence', 'Company Registration', 'TIN', 'BIN', 'Safety Certification'],
      insurance_docs: sl.required_docs?.insurance || ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance', 'Vehicle Insurance'],
    },
  });
});

exports.save = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.provider) return res.status(ctx.status).json({ error: ctx.error });
  const body = pick(req.body || {}, PROFILE_FIELDS);
  if (body.coverage_areas) body.coverage = safeArray(body.coverage_areas).join(', ');
  if (body.service_categories) body.approved_services = safeArray(body.service_categories);
  body.onboarding_submission_status = 'Provider In Progress';
  body.stage_updated_at = new Date();
  await ctx.provider.update(body);
  res.json({ ok: true, last_step: ctx.provider.onboarding_last_step, status: ctx.provider.onboarding_submission_status });
});

exports.upload = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.provider) return res.status(ctx.status).json({ error: ctx.error });
  if (!req.file) return res.status(400).json({ error: 'Choose a document to upload.' });
  const category = ['compliance', 'insurance'].includes(req.body.category) ? req.body.category : 'compliance';
  const docType = String(req.body.doc_type || '').trim();
  if (!docType) return res.status(400).json({ error: 'Document type is required.' });
  const fileUrl = `/uploads/documents/${path.basename(req.file.path)}`;
  const where = { branch_id: ctx.provider.branch_id, provider_id: ctx.provider.id, category, doc_type: docType };
  const current = await P.WtProviderDocument.findOne({ where });
  const values = {
    ...where, doc_number: req.body.doc_number || null, issuer: req.body.issuer || null,
    issue_date: req.body.issue_date || null, expiry_date: req.body.expiry_date || null,
    sum_insured: req.body.sum_insured ? Number(req.body.sum_insured) || 0 : 0,
    file_url: fileUrl, verified: false, status: 'Pending', notes: null,
  };
  const document = current ? await current.update(values) : await P.WtProviderDocument.create(values);
  res.status(201).json({ id: document.id, file_url: document.file_url, status: document.status });
});

exports.removeDocument = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.provider) return res.status(ctx.status).json({ error: ctx.error });
  const document = await P.WtProviderDocument.findOne({ where: { id: req.params.id, provider_id: ctx.provider.id, branch_id: ctx.provider.branch_id } });
  if (!document) return res.status(404).json({ error: 'Document not found.' });
  if (document.verified) return res.status(409).json({ error: 'A verified document cannot be removed.' });
  await document.destroy();
  res.json({ ok: true });
});

exports.submit = asyncHandler(async (req, res) => {
  const ctx = await load(req.params.token);
  if (!ctx.provider) return res.status(ctx.status).json({ error: ctx.error });
  const categories = safeArray(ctx.provider.service_categories);
  const coverage = safeArray(ctx.provider.coverage_areas);
  if (!ctx.provider.contact_person || !ctx.provider.contact_email || !categories.length || !coverage.length) {
    return res.status(422).json({ error: 'Complete the representative, email, service categories and coverage before submitting.' });
  }
  await ctx.provider.update({ onboarding_submission_status: 'Submitted', onboarding_last_step: 6, stage_updated_at: new Date() });
  await P.WtProviderEvent.create({
    branch_id: ctx.provider.branch_id, provider_id: ctx.provider.id, event_type: 'submission',
    title: 'Provider submitted onboarding details', detail: 'Business, compliance, payment and proposed-rate details are ready for Seventh Sky review.',
    actor: ctx.provider.contact_person || ctx.provider.business_name, occurred_at: new Date(),
  });
  res.json({ ok: true, status: 'Submitted', message: 'Your onboarding details have been submitted to Seventh Sky for review.' });
});
