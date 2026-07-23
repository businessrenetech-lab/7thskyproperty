const crypto = require('crypto');
const { Op } = require('sequelize');
const ServiceProvider = require('../models/ServiceProvider');
const ProviderCompliance = require('../models/ProviderCompliance');
const ProviderCapability = require('../models/ProviderCapability');
const ServiceCategory = require('../models/ServiceCategory');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['contact_id', 'company_name', 'contact_person', 'phone', 'email', 'address', 'specialisations',
  'service_categories', 'coverage_areas', 'availability', 'rate_card', 'bank_details', 'rating', 'internal_notes',
  'non_circumvention_agreed', 'status',
  // Phase 2 profile
  'provider_type', 'vertical', 'trade_licence_no', 'company_reg_no', 'tin', 'bin', 'account_manager_id',
  'onboarding_stage', 'districts', 'cities', 'cumilla_restricted', 'exclusive_territory', 'preferred_payment'];

const capInclude = { model: ProviderCapability, as: 'capabilities', include: [{ model: ServiceCategory, as: 'category', attributes: ['id', 'name', 'vertical'] }] };

const computeStatus = (expiry) => {
  if (!expiry) return 'valid';
  const days = (new Date(expiry) - new Date()) / 86400000;
  if (days < 0) return 'expired';
  if (days < 30) return 'expiring';
  return 'valid';
};

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    const s = `%${req.query.search}%`;
    where[Op.or] = [{ company_name: { [Op.like]: s } }, { provider_code: { [Op.like]: s } }, { phone: { [Op.like]: s } }, { email: { [Op.like]: s } }];
  }
  const { rows, count } = await ServiceProvider.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']],
    include: [{ model: ProviderCompliance, as: 'compliance', attributes: ['id', 'expiry_date', 'status'] }],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

// Verification checklist derived from the provider's current state.
function checklist(p) {
  const docs = p.compliance || [];
  const byCat = (c) => docs.filter((d) => d.doc_category === c);
  return [
    { key: 'kyc', label: 'KYC & identity', done: !!p.kyc_verified, count: byCat('kyc').length },
    { key: 'compliance', label: 'Licensing & compliance', done: !!p.compliance_verified, count: byCat('compliance').length },
    { key: 'insurance', label: 'Insurance', done: !!p.insurance_verified, count: byCat('insurance').length },
    { key: 'capability', label: 'Capability assessment', done: !!p.capability_verified, count: (p.capabilities || []).length },
    { key: 'payment', label: 'Payment details', done: !!p.payment_verified, count: p.bank_details && Object.keys(p.bank_details).length ? 1 : 0 },
    { key: 'agreement', label: 'Master agreement signed', done: p.agreement_status === 'signed', count: 0 },
  ];
}

exports.getOne = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({
    where: { id: req.params.id, ...branchScope(req) },
    include: [{ model: ProviderCompliance, as: 'compliance' }, capInclude],
  });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const out = p.toJSON();
  out.checklist = checklist(p);
  out.ready_to_activate = out.checklist.filter((c) => c.key !== 'agreement').every((c) => c.done);
  res.json({ data: out });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.company_name) return res.status(400).json({ error: 'company_name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  data.provider_code = await generateCode(ServiceProvider, 'provider_code', 'SSPC-SP-');
  if (data.status === 'approved') data.onboarded_at = new Date();
  const p = await ServiceProvider.create(data);
  res.status(201).json({ data: p, message: 'Provider created.' });
});

exports.update = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const data = pick(req.body, FIELDS);
  if (data.status === 'approved' && !p.onboarded_at) data.onboarded_at = new Date();
  await p.update(data);
  res.json({ data: p, message: 'Provider updated.' });
});

exports.addCompliance = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const body = pick(req.body, ['doc_type', 'title', 'reference_no', 'file_url', 'issued_date', 'expiry_date']);
  body.status = computeStatus(body.expiry_date);
  const c = await ProviderCompliance.create({ provider_id: p.id, ...body, uploaded_by: req.user?.id || null });
  res.status(201).json({ data: c });
});

exports.removeCompliance = asyncHandler(async (req, res) => {
  const c = await ProviderCompliance.findByPk(req.params.complianceId);
  if (!c) return res.status(404).json({ error: 'Record not found.' });
  await c.destroy();
  res.json({ message: 'Compliance record removed.' });
});

// ─── DOCUMENTS (KYC / compliance / insurance / certification) ───────────────
exports.addDocument = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const body = pick(req.body, ['doc_type', 'doc_category', 'title', 'reference_no', 'file_url', 'issued_date', 'expiry_date']);
  if (!body.file_url && !body.reference_no) return res.status(400).json({ error: 'Attach a file or a reference number.' });
  body.status = computeStatus(body.expiry_date);
  const c = await ProviderCompliance.create({ provider_id: p.id, ...body, uploaded_by: req.user?.id || null });
  res.status(201).json({ data: c, message: 'Document added.' });
});

exports.verifyDocument = asyncHandler(async (req, res) => {
  const c = await ProviderCompliance.findByPk(req.params.docId);
  if (!c) return res.status(404).json({ error: 'Document not found.' });
  await c.update({ verified: req.body.verified !== false });
  res.json({ data: c, message: 'Document updated.' });
});

// ─── CAPABILITY MATRIX ──────────────────────────────────────────────────────
// PUT /api/providers/:id/capabilities  { category_ids: [1,2,3] }
exports.setCapabilities = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const ids = Array.isArray(req.body.category_ids) ? req.body.category_ids : [];
  await ProviderCapability.destroy({ where: { provider_id: p.id } });
  if (ids.length) await ProviderCapability.bulkCreate(ids.map((cid) => ({ provider_id: p.id, category_id: cid, is_capable: true })));
  res.json({ message: `${ids.length} capabilities saved.` });
});

// ─── VERIFICATION ───────────────────────────────────────────────────────────
// PATCH /api/providers/:id/verify  { aspect: 'kyc'|'compliance'|'insurance'|'capability'|'payment', value }
exports.verify = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const map = { kyc: 'kyc_verified', compliance: 'compliance_verified', insurance: 'insurance_verified', capability: 'capability_verified', payment: 'payment_verified' };
  const col = map[req.body.aspect];
  if (!col) return res.status(400).json({ error: 'Invalid aspect.' });
  await p.update({ [col]: req.body.value !== false });
  // Advance stage when all pre-agreement checks pass.
  const fresh = await ServiceProvider.findByPk(p.id);
  const allChecked = fresh.kyc_verified && fresh.compliance_verified && fresh.insurance_verified && fresh.capability_verified && fresh.payment_verified;
  if (allChecked && ['applied', 'kyc_submitted', 'verifying'].includes(fresh.onboarding_stage)) {
    await fresh.update({ onboarding_stage: 'agreement_pending' });
  }
  res.json({ data: fresh, message: 'Verification updated.' });
});

// ─── ACTIVATE (creates the provider's own folio) ────────────────────────────
// POST /api/providers/:id/activate
exports.activate = asyncHandler(async (req, res) => {
  const Folio = require('../models/Folio');
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });

  let folioId = p.folio_id;
  if (!folioId) {
    const folio = await Folio.create({
      branch_id: p.branch_id,
      folio_code: await generateCode(Folio, 'folio_code', 'SSPC-PF-'),
      folio_type: 'provider', folio_scope: 'provider',
      contact_id: p.contact_id || null, provider_id: p.id,
      status: 'active',
    });
    folioId = folio.id;
  }
  await p.update({ status: 'approved', onboarding_stage: 'active', verified_at: new Date(), onboarded_at: p.onboarded_at || new Date(), folio_id: folioId });
  res.json({ data: p, message: 'Provider activated — a provider folio was created for payouts.' });
});

// ─── SEND MASTER AGREEMENT FOR SIGNING (Phase 3) ────────────────────────────
// POST /api/providers/:id/send-agreement  { commission_pct?, term_months?, countersigner_email?, message?, send? }
exports.sendAgreement = asyncHandler(async (req, res) => {
  const SigningEnvelope = require('../models/SigningEnvelope');
  const EnvelopeSigner = require('../models/EnvelopeSigner');
  const SignatureField = require('../models/SignatureField');
  const { buildProviderMasterAgreement } = require('../services/serviceAgreementTemplates.service');

  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [capInclude] });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  if (!p.email) return res.status(400).json({ error: 'Add a provider email before sending the agreement.' });

  const doc = buildProviderMasterAgreement({ provider: p.toJSON(), capabilities: p.capabilities || [], overrides: req.body.terms || req.body || {} });
  const send = req.body.send !== false;
  const expires = new Date(Date.now() + 14 * 86400000);

  const env = await SigningEnvelope.create({
    branch_id: p.branch_id,
    envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
    title: doc.title, document_html: doc.html, message: req.body.message || null,
    related_type: 'service_provider', related_id: p.id, terms: doc.terms,
    cc_emails: [], signing_order_enforced: true,
    status: send ? 'sent' : 'draft', sent_at: send ? new Date() : null, expires_at: send ? expires : null,
    created_by: req.user?.id || null,
  });

  const signers = [{ name: p.contact_person || p.company_name, email: p.email, role: 'service_provider', contact_id: p.contact_id, signer_order: 1 }];
  if (req.body.countersigner_email || req.user?.email) {
    signers.push({ name: req.body.countersigner_name || req.user?.name || 'Seventh Sky', email: req.body.countersigner_email || req.user.email, role: 'staff_countersign', signer_order: 2 });
  }
  const links = [];
  for (const s of signers) {
    const token = send ? crypto.randomBytes(24).toString('hex') : null;
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, ...s, access_token: token, token_expires_at: send ? expires : null,
      status: send ? (s.signer_order === 1 ? 'sent' : 'pending') : 'pending',
    });
    await SignatureField.bulkCreate([
      { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
      { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
    ]);
    if (token) links.push({ name: signer.name, email: signer.email, order: signer.signer_order, token });
  }

  await p.update({ agreement_status: 'sent', onboarding_stage: p.onboarding_stage === 'active' ? 'active' : 'agreement_pending' });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  if (send) {
    try {
      const { sendEmail } = require('../services/communication.service');
      for (const l of links) { if (l.email) await sendEmail(l.email, `Please sign: ${doc.title}`, `<p>Dear ${l.name},</p><p>Please review and sign your Seventh Sky service agreement:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p><p>This link expires in 14 days.</p>`).catch(() => {}); }
    } catch { /* best-effort */ }
  }
  res.status(201).json({ data: env, links: links.map((l) => ({ ...l, link: `${base}/${l.token}` })), message: send ? 'Master agreement sent for signing. The provider is verified on completion.' : 'Agreement drafted.' });
});

// ─── SELF-REGISTRATION LINK ─────────────────────────────────────────────────
// POST /api/providers/:id/registration-link
exports.registrationLink = asyncHandler(async (req, res) => {
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 30 * 86400000);
  await p.update({ registration_token: token, registration_expires_at: expires });
  const base = process.env.PUBLIC_APP_URL || '';
  const link = `${base}/provider-register/${token}`;
  // Email the provider if we have an address (simulated when SMTP unconfigured).
  if (p.email) {
    try {
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(p.email, 'Complete your Seventh Sky provider registration',
        `<p>Please complete your registration (KYC, licensing, insurance, payment details):</p><p><a href="${link}">${link}</a></p><p>This link expires in 30 days.</p>`);
    } catch { /* non-fatal */ }
  }
  res.json({ data: { token, link, expires_at: expires }, message: 'Registration link generated.' });
});

// POST /api/providers/:id/portal-access  { email, password, name? }
exports.enablePortal = asyncHandler(async (req, res) => {
  const bcrypt = require('bcryptjs');
  const User = require('../models/User');
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password are required.' });
  if (await User.findOne({ where: { email } })) return res.status(409).json({ error: 'A user with this email already exists.' });
  const user = await User.create({
    branch_id: p.branch_id, name: req.body.name || p.company_name || email,
    email, password: await bcrypt.hash(password, 12), role: 'supplier', status: 'active',
  });
  await p.update({ portal_user_id: user.id, portal_enabled: true });
  res.status(201).json({ message: 'Portal access enabled.', data: { user_id: user.id, email, role: 'supplier' } });
});

// ─── PROVIDER ACCOUNT STATEMENT (folio ledger + payable balance) ────────────
// GET /api/providers/:id/statement
exports.statement = asyncHandler(async (req, res) => {
  const Folio = require('../models/Folio');
  const FolioTransaction = require('../models/FolioTransaction');
  const p = await ServiceProvider.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!p) return res.status(404).json({ error: 'Provider not found.' });
  if (!p.folio_id) return res.json({ data: { folio: null, balance: 0, transactions: [] } });
  const folio = await Folio.findByPk(p.folio_id);
  const txns = await FolioTransaction.findAll({ where: { folio_id: p.folio_id }, order: [['created_at', 'DESC']], limit: 100 });
  res.json({ data: { folio: { id: folio.id, code: folio.folio_code, balance: Number(folio.current_balance) }, balance: Number(folio.current_balance), transactions: txns } });
});

// ─── PUBLIC self-registration (no login, token-gated) ───────────────────────
const findByToken = (token) => ServiceProvider.findOne({
  where: { registration_token: token, registration_expires_at: { [Op.gt]: new Date() } },
});

// GET /api/public-provider/:token — form config + prefilled provider basics
exports.publicView = asyncHandler(async (req, res) => {
  const p = await findByToken(req.params.token);
  if (!p) return res.status(403).json({ error: 'This registration link is invalid or has expired.' });
  const cats = await ServiceCategory.findAll({ where: { parent_id: { [Op.not]: null } }, attributes: ['id', 'name', 'vertical'], order: [['sort_order', 'ASC']] });
  res.json({
    data: {
      company_name: p.company_name, contact_person: p.contact_person, phone: p.phone, email: p.email,
      submitted: !!p.registration_submitted_at,
      capability_categories: cats,
      required_documents: {
        kyc: ['Owner NID', 'Owner Photo'],
        compliance: ['Trade Licence', 'Company Registration', 'TIN Certificate', 'BIN Certificate', 'Safety Certification'],
        insurance: ['Public Liability Insurance', 'Workers Compensation', 'Contractor Insurance'],
      },
    },
  });
});

// POST /api/public-provider/:token — submit KYC + payment + docs + capabilities
exports.publicSubmit = asyncHandler(async (req, res) => {
  const p = await findByToken(req.params.token);
  if (!p) return res.status(403).json({ error: 'This registration link is invalid or has expired.' });
  const b = req.body || {};
  const profile = pick(b, ['company_name', 'contact_person', 'phone', 'email', 'address', 'trade_licence_no', 'company_reg_no', 'tin', 'bin']);
  profile.bank_details = b.bank_details || p.bank_details || {};
  if (b.districts) profile.districts = b.districts;
  if (b.cities) profile.cities = b.cities;
  profile.onboarding_stage = 'kyc_submitted';
  profile.registration_submitted_at = new Date();
  await p.update(profile);

  // Documents (each { doc_category, doc_type, title, file_url })
  if (Array.isArray(b.documents)) {
    for (const d of b.documents.filter((x) => x.file_url)) {
      await ProviderCompliance.create({
        provider_id: p.id, doc_category: d.doc_category || 'compliance',
        doc_type: d.doc_type || d.title || 'document', title: d.title || d.doc_type,
        file_url: d.file_url, status: 'valid',
      });
    }
  }
  // Capabilities (category ids)
  if (Array.isArray(b.category_ids) && b.category_ids.length) {
    await ProviderCapability.destroy({ where: { provider_id: p.id } });
    await ProviderCapability.bulkCreate(b.category_ids.map((cid) => ({ provider_id: p.id, category_id: cid, is_capable: true })));
  }
  res.json({ message: 'Registration submitted. Seventh Sky will verify your details and send your agreement.' });
});
