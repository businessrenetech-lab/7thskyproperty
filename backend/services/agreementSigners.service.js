// backend/services/agreementSigners.service.js
//
// Shared multi-party signer construction for the service agreements whose
// documents render four signature anchors — data-sign-party "Client",
// "Seventh Sky", "Witness 1", "Witness 2" (sales RPPS/RPSS, rental RPRM,
// tenancy RPTM). The signature-field LABELS must match those anchor party
// names or wtSignedDocument.applySignatures cannot place the captured
// signatures onto the document. Order is enforced: Client → Seventh Sky
// countersigns → witnesses attest.
const crypto = require('crypto');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');

/**
 * defs for the signer set. `clientRole` is the EnvelopeSigner.role for the
 * primary party ('client' | 'landlord' | 'tenant'); its LABEL is always
 * "Client" so it matches the document anchor. Seventh Sky countersigns;
 * witnesses (with a name) attest.
 */
function buildSignerDefs({ client = {}, org = {}, witnesses = [], user = {}, clientRole = 'client' }) {
  const defs = [{ role: clientRole, order: 1, label: 'Client', name: client.full_name, email: client.email, phone: client.phone || null, contact_id: client.contact_id || null }];
  defs.push({ role: 'staff_countersign', order: 2, label: 'Seventh Sky', name: org.represented_by || user.name || 'Seventh Sky', email: org.email || user.email || null, user_id: user.id || null });
  (witnesses || []).slice(0, 2).forEach((w, i) => {
    if (!w || !w.name) return;
    defs.push({ role: 'witness', order: defs.length + 1, label: `Witness ${i + 1}`, name: w.name, email: w.email || null });
  });
  return defs;
}

// Create every signer + its signature/date fields (labels matching the anchors).
async function persistSigners(env, defs, t) {
  for (const def of defs) {
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, signer_order: def.order, role: def.role,
      name: def.name, email: def.email, phone: def.phone || null,
      contact_id: def.contact_id || null, user_id: def.user_id || null, status: 'pending',
    }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: `${def.label} signature` }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: `${def.label} — date signed` }, { transaction: t });
  }
}

// Mint tokens, activate only the first signer (order enforced), mark the
// envelope sent. Returns [{ name, email, role, order, token, active }].
async function dispatchEnvelope(env, t, days = 30) {
  const expires = new Date(Date.now() + days * 864e5);
  const signers = await EnvelopeSigner.findAll({ where: { envelope_id: env.id }, order: [['signer_order', 'ASC']], transaction: t });
  const firstOrder = signers[0]?.signer_order;
  const links = [];
  for (const s of signers) {
    const token = crypto.randomBytes(24).toString('hex');
    const active = s.signer_order === firstOrder;
    await s.update({ access_token: token, token_expires_at: expires, status: active ? 'sent' : 'pending' }, { transaction: t });
    links.push({ name: s.name, email: s.email, role: s.role, order: s.signer_order, token, active });
  }
  await env.update({ status: 'sent', sent_at: new Date(), expires_at: expires }, { transaction: t });
  return links;
}

// Email the active (first) signer their signing link. Best-effort.
async function emailFirstSigner(env, links, req) {
  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try {
    const { sendEmail } = require('./communication.service');
    for (const l of links.filter((x) => x.active && x.email)) {
      await sendEmail(l.email, `Please sign: ${env.title}`,
        `<p>Dear ${l.name},</p><p>Please review and sign the agreement:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p><p>This link expires in 30 days.</p><p>— Seventh Sky Property Care</p>`).catch(() => {});
    }
  } catch { /* best-effort */ }
}

module.exports = { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner };
