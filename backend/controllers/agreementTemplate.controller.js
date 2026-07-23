/**
 * agreementTemplate.controller.js — dynamic agreement templates.
 *   parse   : upload .docx → detect fillable fields + signers (not saved)
 *   CRUD    : save / list / edit reusable templates
 *   preview : merge field values into the template HTML
 *   prepare : merge + create an eSign envelope with signers → send for signing
 */
const crypto = require('crypto');
const AgreementTemplate = require('../models/AgreementTemplate');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const { parseDocx, merge } = require('../services/docTemplate.service');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const FIELDS = ['name', 'category', 'vertical', 'description', 'content_html', 'fields', 'signers', 'source_filename', 'status'];

// POST /api/agreement-templates/parse  (multipart: file=.docx)
exports.parse = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Upload a .docx file.' });
  if (!/\.docx?$/i.test(req.file.originalname)) return res.status(400).json({ error: 'Only Word (.docx) files can be parsed for fields.' });
  try {
    const result = await parseDocx({ path: req.file.path });
    res.json({ data: { ...result, source_filename: req.file.originalname }, message: `${result.fields.length} fields and ${result.signers.length} signers detected. Review, then save.` });
  } catch (e) {
    res.status(422).json({ error: 'Could not read that document. ' + e.message });
  }
});

exports.list = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.category) where.category = req.query.category;
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await AgreementTemplate.findAndCountAll({ where, attributes: { exclude: ['content_html'] }, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  res.json({ data: t });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  if (!data.name) return res.status(400).json({ error: 'Template name is required.' });
  data.branch_id = resolveBranchId(req, req.body.branch_id);
  data.created_by = req.user?.id || null;
  const t = await AgreementTemplate.create(data);
  res.status(201).json({ data: t, message: `Template "${t.name}" saved.` });
});

exports.update = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  await t.update(pick(req.body, FIELDS));
  res.json({ data: t, message: 'Template updated.' });
});

exports.remove = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  await t.update({ status: 'archived' });
  res.json({ message: 'Template archived.' });
});

// GET /:id/prefill?source_type=&source_id=  → field values auto-filled from a record
exports.prefill = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  const { source_type, source_id } = req.query;
  if (!source_type || !source_id) return res.status(400).json({ error: 'source_type and source_id are required.' });
  const { buildPrefill } = require('../services/prefill.service');
  const values = await buildPrefill(t, source_type, source_id);
  res.json({ data: { values, filled: Object.keys(values).length } });
});

// POST /:id/preview  { values } → merged HTML
exports.preview = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  res.json({ data: { html: merge(t.content_html || '', req.body.values || {}, { keepEmpty: true }) } });
});

// POST /:id/prepare  { values, signers:[{role,name,email}], related_type?, related_id?, cc_emails?, message?, send? }
exports.prepare = asyncHandler(async (req, res) => {
  const t = await AgreementTemplate.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Template not found.' });
  const values = req.body.values || {};
  const html = merge(t.content_html || '', values);
  const send = req.body.send !== false;
  const expires = new Date(Date.now() + 14 * 86400000);

  // Match provided signers to the template's roles; keep order.
  const provided = Array.isArray(req.body.signers) ? req.body.signers : [];
  const roleMeta = (t.signers || []);
  const signers = provided
    .filter((s) => s.email)
    .map((s) => { const meta = roleMeta.find((r) => r.role === s.role) || {}; return { name: s.name || meta.label || s.role, email: s.email, role: s.role || meta.role || 'signer', order: s.order ?? meta.order ?? 1 }; })
    .sort((a, b) => a.order - b.order);
  if (!signers.length) return res.status(400).json({ error: 'Add at least one signer with an email.' });

  // KYC intake: when a kyc_role is set (tenant/landlord/provider/…), the signer
  // links become intake links (info + KYC upload + review + sign).
  const kyc_role = req.body.kyc_role || null;
  const kyc_policy = req.body.kyc_policy || (kyc_role ? 'flexible' : 'none');

  const env = await SigningEnvelope.create({
    branch_id: t.branch_id || resolveBranchId(req), envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
    agreement_template_id: t.id,
    title: req.body.title || t.name, document_html: html, message: req.body.message || null,
    related_type: req.body.related_type || 'agreement_template', related_id: req.body.related_id || t.id,
    terms: values, cc_emails: Array.isArray(req.body.cc_emails) ? req.body.cc_emails : [],
    kyc_role, kyc_policy,
    signing_order_enforced: true, status: send ? 'sent' : 'draft', sent_at: send ? new Date() : null, expires_at: send ? expires : null,
    created_by: req.user?.id || null,
  });

  const links = [];
  for (let i = 0; i < signers.length; i++) {
    const s = signers[i];
    const token = send ? crypto.randomBytes(24).toString('hex') : null;
    const signer = await EnvelopeSigner.create({ envelope_id: env.id, name: s.name, email: s.email, role: s.role, signer_order: i + 1, access_token: token, token_expires_at: send ? expires : null, status: send ? (i === 0 ? 'sent' : 'pending') : 'pending' });
    await SignatureField.bulkCreate([
      { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
      { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
    ]);
    if (token) links.push({ name: s.name, email: s.email, order: i + 1, token });
  }

  // Intake links carry the signer through KYC + signing; plain sign links go straight to signing.
  const origin = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}/admin`;
  const pathFor = kyc_role ? 'intake' : 'sign';
  const base = kyc_role ? `${origin}/intake` : (process.env.SIGN_BASE_URL || `${origin}/sign`);
  if (send) {
    const verb = kyc_role ? 'Complete & sign' : 'Please sign';
    try { const { sendEmail } = require('../services/communication.service'); for (const l of links) if (l.email) await sendEmail(l.email, `${verb}: ${env.title}`, `<p>Dear ${l.name},</p><p>Please open your secure link to ${kyc_role ? 'submit your details, upload documents and sign' : 'review and sign'}:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p>`).catch(() => {}); } catch {}
  }
  res.status(201).json({ data: env, kyc_role, kyc_policy, flow: pathFor, links: links.map((l) => ({ ...l, link: `${base}/${l.token}` })), message: send ? `Agreement prepared and sent${kyc_role ? ' (KYC intake)' : ''}.` : 'Agreement drafted.' });
});
