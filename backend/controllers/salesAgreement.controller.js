// backend/controllers/salesAgreement.controller.js
//
// Two residential sales service agreements behind one controller (kind =
// purchase | sale). Mirrors rprm.controller: catalog / meta / preview /
// list / create → SigningEnvelope + EnvelopeSigner + SignatureField (existing
// eSign flow). Purchase signs with the Buyer, Sale with the Seller.
const crypto = require('crypto');
const { Op } = require('sequelize');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const rpps = require('../services/rppsAgreement.service');
const rpss = require('../services/rpssAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const sequelize = require('../config/db.config');

const KIND = {
  purchase: { svc: rpps, build: 'buildRppsAgreement', related_type: 'sale_purchase_agreement', signer: 'buyer', party: 'Buyer', code: 'RPPS' },
  sale: { svc: rpss, build: 'buildRpssAgreement', related_type: 'sale_sale_agreement', signer: 'seller', party: 'Seller', code: 'RPSS' },
};
const K = (req) => KIND[req.params.kind] || null;

// ── Contracts hub (sub-project B): buckets over the sales agreement envelopes ──
const SALE_RELATED = ['sale_purchase_agreement', 'sale_sale_agreement'];
const kindOf = (rt) => (rt === 'sale_sale_agreement' ? 'sale' : 'purchase');
const DAY = 86400000;

exports.contracts = asyncHandler(async (req, res) => {
  const where = { ...branchScope(req), related_type: { [Op.in]: SALE_RELATED } };
  if (req.query.kind === 'purchase') where.related_type = 'sale_purchase_agreement';
  if (req.query.kind === 'sale') where.related_type = 'sale_sale_agreement';
  if (req.query.search) where[Op.or] = [{ title: { [Op.like]: `%${req.query.search}%` } }, { envelope_code: { [Op.like]: `%${req.query.search}%` } }];
  const rows = await SigningEnvelope.findAll({ where, include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'contact_id', 'name', 'email', 'role', 'status'] }], order: [['created_at', 'DESC']] });
  const now = Date.now();
  const buckets = { awaiting_signature: [], expiring_soon: [], expired: [], completed: [], declined_voided: [] };
  for (const e of rows) {
    const s = (e.signers || [])[0] || {};
    const days = e.expires_at ? Math.ceil((new Date(e.expires_at).getTime() - now) / DAY) : null;
    const item = {
      id: e.id, envelope_code: e.envelope_code, kind: kindOf(e.related_type), title: e.title,
      party_name: s.name || null, party_email: s.email || null, party_contact_id: s.contact_id || null, status: e.status,
      sent_at: e.sent_at, expires_at: e.expires_at, completed_at: e.completed_at,
      days_to_expiry: days, signer_status: s.status || null, voided_reason: e.voided_reason || null,
      final_pdf_url: e.final_pdf_url || null, certificate_url: e.certificate_url || null,
    };
    const open = ['sent', 'viewed', 'partially_signed'].includes(e.status);
    if (e.status === 'completed') buckets.completed.push(item);
    else if (['declined', 'voided'].includes(e.status)) buckets.declined_voided.push(item);
    else if (open && days != null && days < 0) buckets.expired.push(item);
    else if (open && days != null && days <= 7) buckets.expiring_soon.push(item);
    else buckets.awaiting_signature.push(item);
  }
  const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
  res.json({ buckets, counts });
});

exports.createVariation = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: { [Op.in]: SALE_RELATED } } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  // A completed agreement can't be casually superseded (would need a tracked
  // supersedes chain — deferred). An OPEN agreement is voided as it's replaced.
  // A terminal declined/voided one needs no void — just start fresh from its terms.
  if (env.status === 'completed') return res.status(409).json({ error: 'A completed agreement cannot be varied here; issue a new agreement instead.' });
  if (['draft', 'pending_approval', 'sent', 'viewed', 'partially_signed'].includes(env.status)) {
    await env.update({ status: 'voided', voided_reason: `Superseded by variation (${env.envelope_code})` });
  }
  const t = env.terms || {};
  const prefill = {
    services: t.selected_services || [],
    pricing_input: { selected: (t.agreed_lines || []).map((l) => ({ code: l.code, agreed_price: l.agreed_price })), discount: 0, vat_percent: 0 },
    schedule_b: t.schedule_b || {},
    supersedes: env.envelope_code,
  };
  res.json({ kind: kindOf(env.related_type), prefill });
});

exports.getCatalog = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  res.json(await k.svc.getCatalog(branchScope(req).branch_id));
});

exports.getMeta = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const sched = require('../services/salesAgreementSchedules')[req.params.kind] || {};
  res.json({
    party: k.party, code: k.code, signer: k.signer,
    client_heading: sched.client_heading, commission_label: sched.commission_label,
    schedule_a: sched.schedule_a || [], schedule_d: sched.schedule_d || [],
    schedule_b_fields: sched.schedule_b_fields || [],
  });
});

exports.preview = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const branchId = resolveBranchId(req); const body = req.body || {};
  const pricing = await k.svc.computePricing(body.pricing_input || {}, branchId);
  res.json(k.svc[k.build]({ ...body, pricing }));
});

exports.listAgreements = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: k.related_type },
    include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'contact_id', 'name', 'email', 'role', 'status', 'signed_at'] }],
    order: [['created_at', 'DESC']],
  });
  res.json(rows);
});

// Multi-party signer construction is shared (Client + Seventh Sky countersign +
// witnesses, labels matching the document anchors, order enforced).
const { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner } = require('../services/agreementSigners.service');
const signerDefsFor = (body, org, req) => buildSignerDefs({
  client: { ...(body.client || {}), contact_id: body.client_contact_id || null },
  org, witnesses: body.witnesses, user: req.user || {}, clientRole: 'client',
});

exports.createAgreement = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const branchId = resolveBranchId(req); const body = req.body || {};
  const client = body.client || {};
  const asDraft = !!body.save_as_draft;
  if (!client.full_name) return res.status(400).json({ error: `${k.party} full name is required.` });
  if (!asDraft && !client.email) return res.status(400).json({ error: `${k.party} email is required to send for signature.` });

  const pricing = await k.svc.computePricing(body.pricing_input || {}, branchId);
  const built = k.svc[k.build]({ ...body, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);
  const org = body.org || {};

  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId, envelope_code: `ENV-${k.code}-${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`, document_html: built.html,
      related_type: k.related_type, related_id: body.property_id || null,
      status: 'draft', expires_at: expires, signing_order_enforced: true,
      kyc_role: k.signer, terms: built.terms, created_by: req.user?.id || null,
    }, { transaction: t });
    await persistSigners(env, signerDefsFor(body, org, req), t);
    if (asDraft) return { env, links: [] };
    const links = await dispatchEnvelope(env, t);
    return { env, links };
  });

  if (!asDraft) await emailFirstSigner(out.env, out.links, req);
  const clientLink = out.links.find((l) => l.role === 'client');
  res.status(201).json({
    id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status,
    signing_token: clientLink?.token || null,
    signing_path: clientLink ? `/admin/sign/${clientLink.token}` : null,
    links: out.links.map((l) => ({ name: l.name, role: l.role, order: l.order, email: l.email })),
  });
});

// Rebuild a DRAFT in place from an edited body (services, pricing, witnesses, …).
exports.updateAgreement = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: k.related_type } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: 'Only a draft agreement can be edited. Use "Edit & reissue" for a sent one.' });
  const body = req.body || {}; const org = body.org || {};
  const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: `${k.party} full name is required.` });
  const pricing = await k.svc.computePricing(body.pricing_input || {}, resolveBranchId(req));
  const built = k.svc[k.build]({ ...body, pricing });
  await sequelize.transaction(async (t) => {
    await SignatureField.destroy({ where: { envelope_id: env.id }, transaction: t });
    await EnvelopeSigner.destroy({ where: { envelope_id: env.id }, transaction: t });
    await env.update({ title: `${built.title} — ${client.full_name}`, document_html: built.html, terms: built.terms, related_id: body.property_id || env.related_id }, { transaction: t });
    await persistSigners(env, signerDefsFor(body, org, req), t);
  });
  res.json({ id: env.id, status: env.status, message: 'Draft updated.' });
});

// Send a draft (or re-send an edited draft): mint tokens + email the first signer.
exports.sendAgreement = asyncHandler(async (req, res) => {
  const k = K(req); if (!k) return res.status(404).json({ error: 'Unknown agreement kind' });
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: k.related_type } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: `Cannot send an agreement in '${env.status}' state.` });
  const clientSigner = await EnvelopeSigner.findOne({ where: { envelope_id: env.id, role: 'client' } });
  if (!clientSigner?.email) return res.status(400).json({ error: `${k.party} email is required to send for signature.` });
  const links = await sequelize.transaction(async (t) => dispatchEnvelope(env, t));
  await emailFirstSigner(env, links, req);
  res.json({ id: env.id, status: 'sent', links: links.map((l) => ({ name: l.name, role: l.role, order: l.order })) });
});
