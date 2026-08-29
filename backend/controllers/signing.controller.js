const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/db.config');
const DocumentTemplate = require('../models/DocumentTemplate');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const SigningAuditLog = require('../models/SigningAuditLog');
const Agreement = require('../models/Agreement');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const { handleEnvelopeCompleted } = require('../services/partyRoleActivation.service');
const { generateCode } = require('../utils/codeGenerator');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const audit = (envelope_id, event, req, signer_id = null, actor_email = null, meta = {}, transaction = undefined) =>
  SigningAuditLog.create({
    envelope_id, signer_id, event, actor_email,
    ip_address: req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || null,
    user_agent: req?.headers?.['user-agent'] || null, meta,
  }, { transaction });

const envelopeIncludes = [
  // NEVER serialize the signing secrets: access_token is bearer authority to sign
  // as that party, and otp_code is their second factor. Read-level roles must not
  // be able to read them out of an envelope detail.
  { model: EnvelopeSigner, as: 'signers', attributes: { exclude: ['access_token', 'otp_code'] } },
  { model: SignatureField, as: 'fields' },
  { model: SigningAuditLog, as: 'audit_logs' },
];

/* ── Templates ─────────────────────────────────────────────── */
exports.listTemplates = asyncHandler(async (req, res) => {
  const rows = await DocumentTemplate.findAll({ where: { is_active: true }, order: [['name', 'ASC']] });
  res.json({ data: rows });
});
exports.createTemplate = asyncHandler(async (req, res) => {
  const t = await DocumentTemplate.create({
    ...pick(req.body, ['name', 'category', 'vertical_key', 'description', 'body_html', 'placeholders', 'default_signers', 'field_layout']),
    branch_id: resolveBranchId(req, req.body.branch_id), created_by: req.user?.id || null,
  });
  res.status(201).json({ data: t });
});

/* ── Envelopes (admin) ─────────────────────────────────────── */
exports.listEnvelopes = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) where[Op.or] = [{ title: { [Op.like]: `%${req.query.search}%` } }, { envelope_code: { [Op.like]: `%${req.query.search}%` } }];
  const { rows, count } = await SigningEnvelope.findAndCountAll({
    where, limit, offset, order: [['created_at', 'DESC']],
    include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'name', 'role', 'status'] }],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getEnvelope = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: envelopeIncludes });
  if (!env) return res.status(404).json({ error: 'Envelope not found.' });
  res.json({ data: env });
});

exports.createEnvelope = asyncHandler(async (req, res) => {
  const { title, template_id, agreement_id, related_type, related_id, message, signing_order_enforced = true, signers = [], fields = [] } = req.body;
  if (!title || !signers.length) return res.status(400).json({ error: 'title and at least one signer are required.' });

  let document_html = req.body.document_html || '';
  if (!document_html && template_id) document_html = (await DocumentTemplate.findByPk(template_id))?.body_html || '';
  if (!document_html && agreement_id) {
    const a = await Agreement.findByPk(agreement_id);
    document_html = `<h2>${a?.title || 'Agreement'}</h2><p>Refer to attached document ${a?.agreement_code} (v${a?.current_version}).</p>`;
  }

  const result = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: resolveBranchId(req, req.body.branch_id),
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
      template_id: template_id || null, agreement_id: agreement_id || null, title, document_html, message: message || null,
      related_type: related_type || null, related_id: related_id || null,
      signing_order_enforced, status: 'draft', created_by: req.user?.id || null,
    }, { transaction: t });

    const createdSigners = [];
    for (let i = 0; i < signers.length; i++) {
      const s = signers[i];
      createdSigners.push(await EnvelopeSigner.create({
        envelope_id: env.id, signer_order: s.signer_order ?? i + 1, role: s.role || 'client',
        name: s.name, email: s.email, phone: s.phone || null, contact_id: s.contact_id || null,
        otp_required: !!s.otp_required, status: 'pending',
      }, { transaction: t }));
    }
    for (const f of fields) {
      const signer = createdSigners[f.signer_index ?? 0] || createdSigners[0];
      await SignatureField.create({
        envelope_id: env.id, signer_id: signer?.id || null,
        ...pick(f, ['field_type', 'page', 'pos_x', 'pos_y', 'width', 'height', 'required', 'label']),
      }, { transaction: t });
    }
    await audit(env.id, 'created', req, null, req.user?.email, {}, t);
    return env;
  });

  const fresh = await SigningEnvelope.findByPk(result.id, { include: envelopeIncludes });
  res.status(201).json({ data: fresh, message: 'Envelope created.' });
});

exports.sendEnvelope = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [{ model: EnvelopeSigner, as: 'signers' }] });
  if (!env) return res.status(404).json({ error: 'Envelope not found.' });
  if (!['draft', 'pending_approval'].includes(env.status)) return res.status(400).json({ error: `Cannot send an envelope in '${env.status}' state.` });
  if (env.related_type === 'party_role') {
    const role = await PartyRoleProfile.findOne({ where: { id: env.related_id, branch_id: env.branch_id } });
    if (!role) return res.status(400).json({ error: 'Linked role profile is missing or belongs to another branch.' });
    if (role.role_type === 'landlord' && role.status !== 'active' && (role.kyc_status !== 'complete' || role.documents_status !== 'complete')) {
      return res.status(400).json({ error: 'Verify the owner KYC and required documents before sending this agreement.' });
    }
  }
  const expires = new Date(Date.now() + 14 * 86400000);
  const ordered = [...env.signers].sort((a, b) => a.signer_order - b.signer_order);
  const firstOrder = ordered[0]?.signer_order;
  for (const s of ordered) {
    const token = crypto.randomBytes(24).toString('hex');
    const makeActive = env.signing_order_enforced ? s.signer_order === firstOrder : true;
    await s.update({ access_token: token, token_expires_at: expires, status: makeActive ? 'sent' : 'pending' });
  }
  await env.update({ status: 'sent', sent_at: new Date(), expires_at: expires });
  if (env.related_type === 'party_role') {
    await PartyRoleProfile.update({ status: 'signing_sent', envelope_id: env.id, next_action: 'Waiting for signatures' }, { where: { id: env.related_id } });
    const role = await PartyRoleProfile.findByPk(env.related_id);
    if (role?.role_type === 'landlord' && role.property_id) {
      const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
      await PropertyOwnerProfile.update({ agreement_status: 'sent' }, { where: { property_id: role.property_id } });
    }
    if (role?.role_type === 'vendor' && role.property_id) {
      const { SaleProfile } = require('../models/SalesModels');
      await SaleProfile.update(
        { agreement_status: 'sent', updated_by: req.user?.id || null },
        { where: { property_id: role.property_id, branch_id: role.branch_id } },
      );
    }
  }
  await audit(env.id, 'sent', req, null, req.user?.email, { signers: ordered.length });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  const links = ordered.map((s) => ({ name: s.name, email: s.email, order: s.signer_order, link: `${base}/${s.access_token}` }));
  try {
    const { sendEmail } = require('../services/communication.service');
    for (const link of links) {
      if (!link.email) continue;
      await sendEmail(link.email, `Please sign: ${env.title}`,
        `<p>Dear ${link.name},</p><p>Please review and sign:</p><p><a href="${link.link}">${link.link}</a></p><p>This link expires in 14 days.</p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
  } catch { /* best-effort */ }
  res.json({ message: 'Envelope sent.', links });
});

// Remind — re-notify outstanding signers of an already-sent envelope (keeps existing links).
exports.remindEnvelope = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [{ model: EnvelopeSigner, as: 'signers' }] });
  if (!env) return res.status(404).json({ error: 'Envelope not found.' });
  if (!['sent', 'viewed', 'partially_signed'].includes(env.status)) return res.status(400).json({ error: `Cannot remind on an envelope in '${env.status}' state.` });

  const expires = new Date(Date.now() + 14 * 86400000);
  const outstanding = [...env.signers].filter((s) => s.status !== 'signed').sort((a, b) => a.signer_order - b.signer_order);
  for (const s of outstanding) {
    if (!s.access_token || (s.token_expires_at && new Date(s.token_expires_at) < new Date())) {
      await s.update({ access_token: crypto.randomBytes(24).toString('hex'), token_expires_at: expires });
    }
  }
  await audit(env.id, 'reminded', req, null, req.user?.email, { signers: outstanding.length });

  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  const links = outstanding.map((s) => ({ name: s.name, email: s.email, order: s.signer_order, link: `${base}/${s.access_token}` }));
  try {
    const { sendEmail } = require('../services/communication.service');
    for (const link of links) {
      if (!link.email) continue;
      await sendEmail(link.email, `Reminder — please sign: ${env.title}`,
        `<p>Dear ${link.name},</p><p>A gentle reminder to review and sign:</p><p><a href="${link.link}">${link.link}</a></p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
  } catch { /* best-effort */ }
  res.json({ message: 'Reminder sent.', links });
});

exports.voidEnvelope = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!env) return res.status(404).json({ error: 'Envelope not found.' });
  if (!['draft', 'pending_approval', 'sent', 'viewed', 'partially_signed'].includes(env.status)) return res.status(400).json({ error: `Cannot void an envelope in '${env.status}' state.` });
  await env.update({ status: 'voided', voided_reason: req.body.reason || 'Voided by admin' });
  if (env.related_type === 'party_role') {
    await PartyRoleProfile.update({ status: 'voided', next_action: 'Agreement envelope voided' }, { where: { id: env.related_id } });
    const role = await PartyRoleProfile.findByPk(env.related_id);
    if (role?.role_type === 'landlord' && role.property_id) {
      const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
      await PropertyOwnerProfile.update({ agreement_status: 'draft' }, { where: { property_id: role.property_id } });
    }
  }
  if (env.related_type === 'water_tank_provider_agreement') {
    const M = require('../models/waterTankOps');
    const P = require('../models/waterTankProviders');
    await P.WtProviderAgreement.update({ status: 'Voided' }, { where: { envelope_id: env.id, branch_id: env.branch_id } });
    await M.WtProvider.update({ agreement_status: 'Not Started', agreement_envelope_id: null }, { where: { id: env.related_id, branch_id: env.branch_id, agreement_envelope_id: env.id } });
  }
  await audit(env.id, 'voided', req, null, req.user?.email, { reason: req.body.reason });
  res.json({ message: 'Envelope voided.' });
});

/* ── Public signing (token-based, no auth) ─────────────────── */
const loadByToken = async (token) => EnvelopeSigner.findOne({ where: { access_token: token } });

exports.viewByToken = asyncHandler(async (req, res) => {
  const signer = await loadByToken(req.params.token);
  if (!signer) return res.status(404).json({ error: 'Invalid or expired signing link.' });
  if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) return res.status(410).json({ error: 'This signing link has expired.' });
  const env = await SigningEnvelope.findByPk(signer.envelope_id, { include: [{ model: SignatureField, as: 'fields', where: { signer_id: signer.id }, required: false }] });
  if (!env || ['voided', 'declined'].includes(env.status)) return res.status(410).json({ error: 'This document is no longer available for signing.' });

  // Enforce signing order
  if (env.signing_order_enforced) {
    const earlier = await EnvelopeSigner.findOne({ where: { envelope_id: env.id, signer_order: { [Op.lt]: signer.signer_order }, status: { [Op.ne]: 'signed' } } });
    if (earlier) return res.status(423).json({ error: 'Waiting for an earlier signer to complete first.' });
  }
  if (signer.status !== 'signed') await signer.update({ status: 'viewed', viewed_at: signer.viewed_at || new Date() });
  if (env.status === 'sent') await env.update({ status: 'viewed' });
  await audit(env.id, 'viewed', req, signer.id, signer.email);

  res.json({ data: {
    envelope: { code: env.envelope_code, title: env.title, document_html: env.document_html, status: env.status, message: env.message },
    signer: { name: signer.name, email: signer.email, role: signer.role, status: signer.status },
    fields: env.fields,
  } });
});

// Public: the fully-signed copy, served by the party's own token — used by the
// link in the completion email. Only available once the envelope is completed.
exports.signedByToken = asyncHandler(async (req, res) => {
  const signer = await loadByToken(req.params.token);
  if (!signer) return res.status(404).send('Invalid or expired link.');
  const env = await SigningEnvelope.findByPk(signer.envelope_id);
  if (!env) return res.status(404).send('Not found.');
  if (env.status !== 'completed') return res.status(409).send('This agreement is not fully signed yet.');
  const built = await require('../services/wtSignedDocument.service').buildSignedDocument(env.get({ plain: true }));
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(built.html);
});

exports.signByToken = asyncHandler(async (req, res) => {
  const signer = await loadByToken(req.params.token);
  if (!signer) return res.status(404).json({ error: 'Invalid signing link.' });
  if (signer.status === 'signed') return res.status(409).json({ error: 'You have already signed this document.' });
  if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) return res.status(410).json({ error: 'This signing link has expired.' });

  const env = await SigningEnvelope.findByPk(signer.envelope_id);
  if (!env || ['voided', 'declined', 'completed'].includes(env.status)) return res.status(410).json({ error: 'This document can no longer be signed.' });

  /*
   * Enforce signing order on SUBMIT, not just on view.
   *
   * viewByToken already refuses to render out of turn, but that only guards the
   * UI: a later signer holding their own valid token could POST straight to this
   * endpoint and sign ahead of everyone. That matters because the order is
   * legally meaningful — a witness attests a signature that has already been
   * made, and Seventh Sky countersigns after the client.
   */
  if (env.signing_order_enforced) {
    const earlier = await EnvelopeSigner.findOne({
      where: {
        envelope_id: env.id,
        signer_order: { [Op.lt]: signer.signer_order },
        status: { [Op.notIn]: ['signed', 'declined'] },
      },
      order: [['signer_order', 'ASC']],
    });
    if (earlier) {
      await audit(env.id, 'order_violation_blocked', req, signer.id, signer.email,
        { attempted_order: signer.signer_order, waiting_on: earlier.signer_order }).catch(() => {});
      return res.status(423).json({
        error: 'An earlier party has not signed yet. This document must be signed in order.',
        waiting_on: earlier.name || `Signer ${earlier.signer_order}`,
      });
    }
  }

  // Persist field values for this signer
  const values = req.body.fields || []; // [{id, value}]
  const myFields = await SignatureField.findAll({ where: { envelope_id: env.id, signer_id: signer.id } });
  for (const f of myFields) {
    const v = values.find((x) => x.id === f.id);
    let val = v ? v.value : undefined;
    if (f.field_type === 'date_signed' && (val == null || val === '')) val = new Date().toISOString().slice(0, 10);
    if (f.required && f.field_type !== 'date_signed' && !String(val || '').trim()) return res.status(400).json({ error: `Please complete the required field: ${f.label || f.field_type}.` });
    if (val !== undefined) await f.update({ value: String(val) });
  }
  await signer.update({
    status: 'signed', signed_at: new Date(),
    ip_address: req.headers['x-forwarded-for'] || req.socket?.remoteAddress, user_agent: req.headers['user-agent'],
  });
  await audit(env.id, 'signed', req, signer.id, signer.email);

  // Advance next signer (order enforced) and check completion
  const allSigners = await EnvelopeSigner.findAll({ where: { envelope_id: env.id }, order: [['signer_order', 'ASC']] });
  const remaining = allSigners.filter((s) => s.status !== 'signed');
  if (!remaining.length) {
    const signedData = JSON.stringify(allSigners.map((s) => ({ id: s.id, email: s.email, signed_at: s.signed_at })));
    // Tamper evidence must cover what was actually signed — include every captured
    // field value (the signatures and dates), not just the document + signer meta.
    // Without this, altering a signature would not change the hash.
    const allFields = await SignatureField.findAll({ where: { envelope_id: env.id }, order: [['id', 'ASC']], raw: true });
    const fieldData = JSON.stringify(allFields.map((f) => ({ id: f.id, signer_id: f.signer_id, type: f.field_type, value: f.value })));
    const hash = crypto.createHash('sha256').update((env.document_html || '') + signedData + fieldData).digest('hex');
    await env.update({ status: 'completed', completed_at: new Date(), content_hash: hash });
    await audit(env.id, 'completed', req, null, null, { content_hash: hash });
    await handleEnvelopeCompleted(env);
    // Water Tank agreements: email the party a link to the signed copy and file it.
    try {
      await require('../services/wtAgreementCompletion.service')
        .onCompleted(env, `${req.protocol}://${req.get('host')}`);
    } catch (e) { console.error('[wt-agreement-completion]', e.message); }
    return res.json({ message: 'Document fully signed and completed.', completed: true, content_hash: hash });
  }
  if (env.signing_order_enforced) {
    const next = remaining[0];
    if (next.status === 'pending') await next.update({ status: 'sent' });
  }
  await env.update({ status: 'partially_signed' });
  if (env.related_type === 'water_tank_provider_agreement') {
    const P = require('../models/waterTankProviders');
    await P.WtProviderAgreement.update({ status: 'Provider Signed' }, { where: { envelope_id: env.id, branch_id: env.branch_id } });
  }
  if (env.related_type === 'party_role') {
    await PartyRoleProfile.update({ status: 'partially_signed', next_action: 'Waiting for remaining signatures' }, { where: { id: env.related_id } });
  }
  res.json({ message: 'Thank you — your signature has been recorded.', completed: false });
});

exports.declineByToken = asyncHandler(async (req, res) => {
  const signer = await loadByToken(req.params.token);
  if (!signer) return res.status(404).json({ error: 'Invalid signing link.' });
  // A decline must be subject to the same gates as a signature: an expired link,
  // an already-signed/declined signer, or a finished envelope cannot be declined.
  if (signer.token_expires_at && new Date(signer.token_expires_at) < new Date()) {
    return res.status(410).json({ error: 'This signing link has expired.' });
  }
  if (signer.status === 'signed') return res.status(409).json({ error: 'You have already signed this document and cannot decline it.' });
  if (signer.status === 'declined') return res.status(409).json({ error: 'You have already declined this document.' });
  const env = await SigningEnvelope.findByPk(signer.envelope_id);
  if (!env) return res.status(404).json({ error: 'Document not found.' });
  if (['completed', 'voided', 'declined'].includes(env.status)) {
    return res.status(410).json({ error: `This document is already ${env.status} and can no longer be declined.` });
  }
  await signer.update({ status: 'declined', declined_reason: req.body.reason || null });
  await env.update({ status: 'declined' });
  if (env.related_type === 'party_role') {
    await PartyRoleProfile.update({ status: 'declined', next_action: 'Agreement declined' }, { where: { id: env.related_id } });
  }
  if (env.related_type === 'water_tank_provider_agreement') {
    const M = require('../models/waterTankOps');
    const P = require('../models/waterTankProviders');
    await P.WtProviderAgreement.update({ status: 'Declined' }, { where: { envelope_id: env.id, branch_id: env.branch_id } });
    await M.WtProvider.update({ agreement_status: 'Declined' }, { where: { id: env.related_id, branch_id: env.branch_id, agreement_envelope_id: env.id } });
  }
  await audit(env.id, 'declined', req, signer.id, signer.email, { reason: req.body.reason });
  res.json({ message: 'You have declined to sign. The sender has been notified.' });
});
