/**
 * intake.controller.js — the unified Smart Agreement + KYC intake flow.
 *
 * One public token (the envelope signer's access_token) drives the whole
 * journey: view the agreement → upload the role's KYC documents → sign.
 * KYC is stored privately against the envelope's related entity and gated by
 * the envelope's kyc_policy (strict / flexible / none).
 *
 * Signing itself is DELEGATED to signing.controller.signByToken so we reuse
 * the existing order-enforcement, audit, completion + activation hooks.
 */
const path = require('path');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const KycDocument = require('../models/KycDocument');
const AgreementTemplate = require('../models/AgreementTemplate');
const signing = require('./signing.controller');
const { merge } = require('../services/docTemplate.service');
const { requirementsFor, evaluate } = require('../services/kycRequirements.service');
const { asyncHandler } = require('../utils/controllerHelpers');

// Fields the signer completes on the intake page (e.g. provider bank account).
async function signerFillFields(env) {
  if (!env.agreement_template_id) return [];
  const tpl = await AgreementTemplate.findByPk(env.agreement_template_id);
  return (tpl?.fields || []).filter((f) => f.signer_fill);
}
const termsOf = (env) => { const t = env.terms; if (!t) return {}; if (typeof t === 'string') { try { return JSON.parse(t); } catch { return {}; } } return t; };

const loadByToken = (token) => EnvelopeSigner.findOne({ where: { access_token: token } });

// Where a KYC document is filed for an envelope. Prefer the linked role entity
// so activation automation (party_role / service_provider) fires; else the envelope.
function kycTargetFor(env, signer) {
  if (env.related_type === 'short_stay_management' && signer?.contact_id) {
    return { related_type: 'short_stay_owner', related_id: signer.contact_id };
  }
  if (env.related_type && env.related_id) return { related_type: env.related_type, related_id: env.related_id };
  return { related_type: 'envelope', related_id: env.id };
}
const roleFor = (env, signer) => env.kyc_role || signer.role || 'tenant';

async function loadIntake(token) {
  const signer = await loadByToken(token);
  if (!signer) return { error: 404, message: 'Invalid or expired link.' };
  if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) return { error: 410, message: 'This link has expired.' };
  const env = await SigningEnvelope.findByPk(signer.envelope_id);
  if (!env || ['voided', 'declined'].includes(env.status)) return { error: 410, message: 'This agreement is no longer available.' };
  return { signer, env };
}

// GET /api/intake/:token — everything the intake page needs in one call.
exports.view = asyncHandler(async (req, res) => {
  const ctx = await loadIntake(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { signer, env } = ctx;
  const role = roleFor(env, signer);
  const target = kycTargetFor(env, signer);
  const policy = env.kyc_policy || 'flexible';

  const docs = await KycDocument.findAll({ where: { ...target, role }, raw: true });
  const kyc = evaluate(role, docs);
  // Attach the actual document rows to the checklist items for the UI.
  const byType = docs.reduce((a, d) => { (a[d.document_type] ||= []).push(d); return a; }, {});
  kyc.items = kyc.items.map((it) => ({ ...it, doc: (byType[it.document_type] || [])[0] || null }));

  // The signature/date fields this signer must complete (for the sign step).
  const fields = await SignatureField.findAll({ where: { envelope_id: env.id, signer_id: signer.id }, order: [['id', 'ASC']] });

  // Fields the signer fills themselves (e.g. their bank account) + current values.
  const terms = termsOf(env);
  const fillFields = (await signerFillFields(env)).map((f) => ({ key: f.key, label: f.label, type: f.type, group: f.group, value: terms[f.key] || '' }));

  res.json({ data: {
    envelope: { code: env.envelope_code, title: env.title, document_html: env.document_html, status: env.status, message: env.message, kyc_role: role, kyc_policy: policy },
    signer: { name: signer.name, email: signer.email, role: signer.role, status: signer.status },
    fields: fields.map((f) => ({ id: f.id, field_type: f.field_type, label: f.label, required: f.required })),
    fill_fields: fillFields,
    kyc: { policy, role, required_here: policy !== 'none' && requirementsFor(role).length > 0, ...kyc },
  } });
});

// POST /api/intake/:token/values  { values } — signer completes their own fields;
// re-merge the agreement so the review + signed copy reflect them.
exports.saveValues = asyncHandler(async (req, res) => {
  const ctx = await loadIntake(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { signer, env } = ctx;
  if (signer.status === 'signed') return res.status(409).json({ error: 'You have already signed.' });

  const allowed = await signerFillFields(env);
  if (!allowed.length) return res.status(400).json({ error: 'No fields to complete on this agreement.' });
  const allowedKeys = new Set(allowed.map((f) => f.key));
  const incoming = req.body.values || {};
  const terms = termsOf(env);
  for (const k of Object.keys(incoming)) if (allowedKeys.has(k)) terms[k] = incoming[k];

  // Re-merge the document from the template with the combined values.
  let document_html = env.document_html;
  if (env.agreement_template_id) {
    const tpl = await AgreementTemplate.findByPk(env.agreement_template_id);
    if (tpl?.content_html) document_html = merge(tpl.content_html, terms);
  }
  await env.update({ terms, document_html });
  res.json({ data: { document_html }, message: 'Details saved.' });
});

// POST /api/intake/:token/upload  (multipart: file, document_type, title?, reference_no?, issue_date?, expiry_date?, side?)
exports.upload = asyncHandler(async (req, res) => {
  const ctx = await loadIntake(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { signer, env } = ctx;
  if (!req.file) return res.status(400).json({ error: 'No file received.' });
  const document_type = req.body.document_type;
  if (!document_type) return res.status(400).json({ error: 'document_type is required.' });

  const role = roleFor(env, signer);
  const target = kycTargetFor(env, signer);
  const file_url = `/uploads/documents/${path.basename(req.file.path)}`;

  // Reuse an existing row for this doc type (re-upload / back side), else create.
  let row = await KycDocument.findOne({ where: { ...target, role, document_type } });
  const meta = requirementsFor(role).find((r) => r.document_type === document_type) || {};
  const patch = {
    title: req.body.title || meta.label || document_type,
    reference_no: req.body.reference_no || null,
    issue_date: req.body.issue_date || null,
    expiry_date: req.body.expiry_date || null,
    status: 'submitted', uploaded_by_role: 'signer', is_required: meta.required !== false,
  };
  if (req.body.side === 'back') patch.file_url_back = file_url; else patch.file_url = file_url;

  if (row) {
    // Don't silently blow away a verified doc — a re-upload reopens review.
    if (row.status === 'verified' && req.body.side !== 'back') patch.status = 'submitted';
    await row.update(patch);
  } else {
    row = await KycDocument.create({ ...target, role, document_type, branch_id: env.branch_id, agreement_id: env.id, ...patch, file_url: patch.file_url || file_url });
  }
  res.status(201).json({ data: { id: row.id, document_type, status: row.status, file_url: row.file_url, file_url_back: row.file_url_back }, message: 'Document uploaded.' });
});

// DELETE /api/intake/:token/document/:id — signer removes a doc they uploaded (before verify).
exports.removeDoc = asyncHandler(async (req, res) => {
  const ctx = await loadIntake(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { env, signer } = ctx;
  const target = kycTargetFor(env, signer);
  const row = await KycDocument.findOne({ where: { id: req.params.id, ...target } });
  if (!row) return res.status(404).json({ error: 'Document not found.' });
  if (row.status === 'verified') return res.status(409).json({ error: 'A verified document cannot be removed.' });
  await row.destroy();
  res.json({ message: 'Document removed.' });
});

// POST /api/intake/:token/sign — KYC policy gate, then delegate to the signer.
exports.sign = asyncHandler(async (req, res) => {
  const ctx = await loadIntake(req.params.token);
  if (ctx.error) return res.status(ctx.error).json({ error: ctx.message });
  const { signer, env } = ctx;
  const policy = env.kyc_policy || 'flexible';
  const role = roleFor(env, signer);

  if (policy === 'strict' && requirementsFor(role).length) {
    const docs = await KycDocument.findAll({ where: { ...kycTargetFor(env, signer), role }, raw: true });
    const kyc = evaluate(role, docs);
    if (!kyc.all_submitted) {
      const missing = kyc.items.filter((i) => i.required && !i.uploaded).map((i) => i.label);
      return res.status(422).json({ error: `Please upload all required documents before signing: ${missing.join(', ')}.`, missing });
    }
  }
  // Delegate to the existing signing flow (records signature, advances order, completion hooks).
  return signing.signByToken(req, res);
});
