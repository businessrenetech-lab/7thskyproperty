/**
 * waterTankAgreementHub.controller.js — one register for every Water Tank
 * agreement, whoever it is with.
 *
 * Three document families run through the same signing engine but were only
 * visible from three different screens, so nobody could answer "what is out for
 * signature right now, and who are we waiting on?" without checking each in turn:
 *
 *   client    water_tank_customer_agreement   — Customer Service Agreement
 *   provider  water_tank_provider_agreement   — Master Service Delivery Provider Agreement
 *   work_order water_tank_work_order          — Project Work Order (two-party)
 *
 * Everything here is read from SigningEnvelope + EnvelopeSigner, so the register
 * cannot drift from the signing engine's own state.
 */
const { Op } = require('sequelize');
const crypto = require('crypto');
const { asyncHandler, branchScope } = require('../utils/controllerHelpers');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const signedDoc = require('../services/wtSignedDocument.service');

const FAMILIES = {
  client: { related_type: 'water_tank_customer_agreement', label: 'Client Agreement', doc: 'Customer Service Agreement' },
  provider: { related_type: 'water_tank_provider_agreement', label: 'Provider Agreement', doc: 'Master Service Delivery Provider Agreement' },
  work_order: { related_type: 'water_tank_work_order', label: 'Work Order Agreement', doc: 'Project Work Order' },
};
const RELATED_TYPES = Object.values(FAMILIES).map((f) => f.related_type);
const familyOf = (relatedType) => Object.entries(FAMILIES)
  .find(([, f]) => f.related_type === relatedType)?.[0] || 'other';

const eq = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const actorOf = (req) => req.user?.name || req.user?.email || 'Operations';

/** One register row: who signs, who has, who has not. */
function shapeEnvelope(env) {
  const signers = (env.signers || [])
    .slice()
    .sort((a, b) => (a.signer_order || 0) - (b.signer_order || 0))
    .map((s) => ({
      id: s.id, order: s.signer_order, role: s.role, name: s.name, email: s.email,
      status: s.status, signed_at: s.signed_at,
      declined_reason: s.declined_reason || null,
      // Whose turn it is: the first unsigned signer in an ordered envelope.
      signing_path: `/admin/sign/${s.access_token}`,
    }));

  const signed = signers.filter((s) => eq(s.status, 'signed'));
  const declined = signers.filter((s) => eq(s.status, 'declined'));
  const pending = signers.filter((s) => !eq(s.status, 'signed') && !eq(s.status, 'declined'));
  const complete = signers.length > 0 && signed.length === signers.length;
  const expiresIn = daysTo(env.expires_at);

  return {
    id: env.id,
    envelope_code: env.envelope_code,
    family: familyOf(env.related_type),
    family_label: FAMILIES[familyOf(env.related_type)]?.label || 'Agreement',
    document: FAMILIES[familyOf(env.related_type)]?.doc || env.title,
    title: env.title,
    status: env.status,
    related_id: env.related_id,
    created_at: env.createdAt,
    sent_at: env.sent_at,
    completed_at: env.completed_at,
    expires_at: env.expires_at,
    expires_in_days: expiresIn,
    expiring_soon: !complete && expiresIn != null && expiresIn >= 0 && expiresIn <= 7,
    expired: !complete && expiresIn != null && expiresIn < 0,
    content_hash: env.content_hash || null,
    // the headline the user asked for
    signers,
    signed_count: signed.length,
    total_signers: signers.length,
    pending_count: pending.length,
    declined_count: declined.length,
    fully_signed: complete,
    // whose signature is actually being waited on right now
    awaiting: pending[0] ? { name: pending[0].name, email: pending[0].email, role: pending[0].role, order: pending[0].order } : null,
    progress_pct: signers.length ? Math.round((signed.length / signers.length) * 100) : 0,
    can_resend: !complete && !eq(env.status, 'voided') && !eq(env.status, 'declined') && pending.length > 0,
    can_void: !eq(env.status, 'voided'),
    // only a fully executed document is worth calling "the signed agreement"
    can_download_signed: complete,
  };
}

const loadEnvelope = async (req, res) => {
  const key = req.params.id;
  const env = await SigningEnvelope.findOne({
    where: {
      ...branchScope(req),
      related_type: { [Op.in]: RELATED_TYPES },
      [Op.or]: [{ id: Number.isNaN(Number(key)) ? -1 : Number(key) }, { envelope_code: String(key) }],
    },
    include: [{ model: EnvelopeSigner, as: 'signers' }],
  });
  if (!env) { res.status(404).json({ error: 'Agreement not found.' }); return null; }
  return env;
};

/* ── the register ── */
exports.list = asyncHandler(async (req, res) => {
  const { family, status, q, awaiting } = req.query;
  const where = { ...branchScope(req) };
  where.related_type = family && FAMILIES[family]
    ? FAMILIES[family].related_type
    : { [Op.in]: RELATED_TYPES };
  if (status) where.status = status;
  if (q && String(q).trim()) {
    const like = { [Op.like]: `%${String(q).trim()}%` };
    where[Op.or] = [{ envelope_code: like }, { title: like }];
  }

  const rows = await SigningEnvelope.findAll({
    where,
    include: [{ model: EnvelopeSigner, as: 'signers' }],
    order: [['id', 'DESC']],
  });

  let out = rows.map((r) => shapeEnvelope(r.get({ plain: true })));
  // "show me only what is waiting on someone"
  if (awaiting === 'true') out = out.filter((r) => !r.fully_signed && r.pending_count > 0);
  res.json(out);
});

exports.overview = asyncHandler(async (req, res) => {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: { [Op.in]: RELATED_TYPES } },
    include: [{ model: EnvelopeSigner, as: 'signers' }],
  });
  const all = rows.map((r) => shapeEnvelope(r.get({ plain: true })));
  const live = all.filter((a) => !eq(a.status, 'voided'));

  const byFamily = Object.keys(FAMILIES).map((key) => {
    const set = all.filter((a) => a.family === key);
    return {
      family: key,
      label: FAMILIES[key].label,
      total: set.length,
      fully_signed: set.filter((a) => a.fully_signed).length,
      awaiting: set.filter((a) => !a.fully_signed && a.pending_count > 0 && !eq(a.status, 'voided')).length,
    };
  });

  res.json({
    total: all.length,
    fully_signed: all.filter((a) => a.fully_signed).length,
    awaiting: live.filter((a) => !a.fully_signed && a.pending_count > 0).length,
    // the number that actually matters operationally: individual signatures owed
    signatures_outstanding: live.reduce((s, a) => s + (a.fully_signed ? 0 : a.pending_count), 0),
    declined: all.filter((a) => a.declined_count > 0).length,
    expiring_soon: live.filter((a) => a.expiring_soon).length,
    expired: live.filter((a) => a.expired).length,
    voided: all.filter((a) => eq(a.status, 'voided')).length,
    by_family: byFamily,
  });
});

exports.detail = asyncHandler(async (req, res) => {
  const env = await loadEnvelope(req, res); if (!env) return;
  const plain = env.get({ plain: true });
  const shaped = shapeEnvelope(plain);

  const [fields, audit] = await Promise.all([
    SignatureField.findAll({ where: { envelope_id: env.id }, raw: true }),
    (async () => {
      try {
        const AuditLog = require('../models/SigningAuditLog');
        return await AuditLog.findAll({ where: { envelope_id: env.id }, order: [['id', 'ASC']], raw: true });
      } catch { return []; }
    })(),
  ]);

  res.json({
    agreement: shaped,
    // the document as it stands, signatures rendered in where they exist
    document_html: (await signedDoc.buildSignedDocument(plain)).html,
    fields: fields.map((f) => ({
      id: f.id, signer_id: f.signer_id, type: f.field_type, label: f.label,
      filled: !!(f.value && String(f.value).trim()),
    })),
    audit,
  });
});

/* ── the signed copy ── */
exports.signedDocument = asyncHandler(async (req, res) => {
  const env = await loadEnvelope(req, res); if (!env) return;
  const built = await signedDoc.buildSignedDocument(env.get({ plain: true }));

  if (!built.complete && req.query.force !== 'true') {
    return res.status(409).json({
      error: 'This agreement is not fully signed yet.',
      signed_count: built.signed_count,
      total_signers: built.total_signers,
      unsigned_parties: built.unsigned_parties,
      hint: 'Add ?force=true to download the partially-signed copy.',
    });
  }

  if (req.query.download === 'true') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition',
      `attachment; filename="${env.envelope_code}${built.complete ? '-signed' : '-partial'}.html"`);
    return res.send(built.html);
  }
  res.json({
    envelope_code: env.envelope_code,
    complete: built.complete,
    signed_count: built.signed_count,
    total_signers: built.total_signers,
    signatures_applied: built.signatures_applied,
    unsigned_parties: built.unsigned_parties,
    html: built.html,
  });
});

/* ── resend ── */
exports.resend = asyncHandler(async (req, res) => {
  const env = await loadEnvelope(req, res); if (!env) return;
  if (eq(env.status, 'voided') || eq(env.status, 'completed')) {
    return res.status(409).json({ error: `This agreement is ${env.status} and cannot be resent.` });
  }

  const signers = await EnvelopeSigner.findAll({
    where: { envelope_id: env.id }, order: [['signer_order', 'ASC']],
  });
  const target = req.body?.signer_id
    ? signers.find((s) => s.id === Number(req.body.signer_id))
    : signers.find((s) => !eq(s.status, 'signed') && !eq(s.status, 'declined'));

  if (!target) return res.status(409).json({ error: 'Every party has already signed.' });
  if (eq(target.status, 'signed')) return res.status(409).json({ error: `${target.name} has already signed.` });

  /*
   * A resend issues a FRESH token and extends the expiry. Reusing the old token
   * would mean a link forwarded to the wrong person stays live forever; rotating
   * it makes the resend the only way in.
   */
  const expires = new Date(Date.now() + 30 * 864e5);
  const token = crypto.randomBytes(24).toString('hex');
  await target.update({
    access_token: token,
    token_expires_at: expires,
    status: eq(target.status, 'pending') ? 'pending' : 'sent',
    reminded_at: new Date(),
  }).catch(async () => {
    // reminded_at may not exist on older schemas — the token rotation matters more
    await target.update({ access_token: token, token_expires_at: expires });
  });
  await env.update({ expires_at: expires });

  res.json({
    ok: true,
    signer: { id: target.id, name: target.name, email: target.email, role: target.role },
    signing_path: `/admin/sign/${token}`,
    note: 'A fresh signing link has been issued; the previous link for this party no longer works.',
  });
});

/* ── void ── */
exports.void = asyncHandler(async (req, res) => {
  const env = await loadEnvelope(req, res); if (!env) return;
  if (eq(env.status, 'completed')) {
    return res.status(409).json({ error: 'This agreement is fully executed and cannot be voided.' });
  }
  await env.update({ status: 'voided', void_reason: req.body?.reason || null });
  await EnvelopeSigner.update({ status: 'voided' }, {
    where: { envelope_id: env.id, status: { [Op.ne]: 'signed' } },
  }).catch(() => {});
  res.json({ ok: true, envelope_code: env.envelope_code, voided_by: actorOf(req) });
});
