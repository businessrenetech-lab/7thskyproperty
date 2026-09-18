/**
 * rprm.controller.js — Residential Property Rental Management Service Agreement.
 * Catalog (Schedule C standard prices), builder metadata, live preview, and
 * agreement creation → landlord eSign (reuses SigningEnvelope / EnvelopeSigner).
 */
const crypto = require('crypto');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const svc = require('../services/rprmAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const OwnerFeeSchedule = require('../models/OwnerFeeSchedule');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const WorkOrder = require('../models/WorkOrder');
const CareQuotation = require('../models/CareQuotation');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner } = require('../services/agreementSigners.service');
const sequelize = require('../config/db.config');

// Residential vs commercial rental-management agreements run through the same
// controller and render service, differing only by category (?category=).
function ctx(req) {
  const category = String(req.query.category || req.body?.category || 'residential').toLowerCase() === 'commercial'
    ? 'commercial' : 'residential';
  const pack = svc.packFor(category);
  return {
    category,
    vertical: pack.catalog_vertical,
    related_type: pack.related_type,
    build: category === 'commercial' ? svc.buildCommercialPMAgreement : svc.buildResidentialPMAgreement,
    codePrefix: category === 'commercial' ? 'ENV-CPRM-' : 'ENV-RPRM-',
    mgmtCode: category === 'commercial' ? 'CPRM-018' : 'RPRM-018',
    serviceGroups: pack.service_groups,
    checklistGroups: pack.checklist_groups,
  };
}

async function resolveRprmDefaults(body, user) {
  const b = { ...(body.schedule_b || {}) };
  if (!b.work_order_no) {
    b.work_order_no = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  }
  if (!b.quotation_no) {
    b.quotation_no = await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-');
  }

  const org = {
    name: 'Seventh Sky Property Care',
    represented_by: body.org?.represented_by || user?.name || 'Authorized Signatory',
    position: body.org?.position || (user?.role === 'super_admin' ? 'Managing Director' : 'Property Management Director'),
    email: body.org?.email || user?.email || 'pm@seventhskyproperty.com',
    phone: body.org?.phone || user?.phone || '+880 1700-000000',
    ...(body.org || {}),
  };

  return { schedule_b: b, org };
}

// Editable Schedule C standard price catalog
exports.getCatalog = asyncHandler(async (req, res) => {
  res.json(await svc.getRprmCatalog(branchScope(req).branch_id, ctx(req).vertical));
});

// Builder metadata: Schedule A service groups + Schedule D checklist groups
exports.getMeta = asyncHandler(async (req, res) => {
  const nextWo = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const nextQt = await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-');
  const { serviceGroups, checklistGroups } = ctx(req);
  res.json({
    service_groups: serviceGroups,
    checklist_groups: checklistGroups,
    defaults: {
      work_order_no: nextWo,
      quotation_no: nextQt,
      org: {
        name: 'Seventh Sky Property Care',
        represented_by: req.user?.name || 'Authorized Signatory',
        position: req.user?.role === 'super_admin' ? 'Managing Director' : 'Property Management Director',
        email: req.user?.email || 'pm@seventhskyproperty.com',
        phone: req.user?.phone || '+880 1700-000000',
      },
    },
  });
});

exports.getPropertyDefaults = asyncHandler(async (req, res) => {
  const propertyId = req.params.propertyId;
  const prop = await Property.findByPk(propertyId);
  const nextWo = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const nextQt = await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-');
  res.json({
    work_order_no: nextWo,
    quotation_no: nextQt,
    property_type: prop?.property_type || '',
    property_address: prop?.address || '',
    expected_rent: prop?.approved_monthly_rent || prop?.market_rent_min || '',
    security_deposit: prop?.approved_monthly_rent ? prop.approved_monthly_rent * 2 : '',
  });
});

// Live preview — compute pricing then render the full agreement HTML from builder inputs
exports.preview = asyncHandler(async (req, res) => {
  const branchId = branchScope(req).branch_id;
  const body = req.body || {};
  const { vertical, build } = ctx(req);
  const { schedule_b, org } = await resolveRprmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId, vertical);
  const built = build({ ...body, schedule_b, org, pricing });
  res.json({ ...built, pricing, schedule_b, org });
});

// Persist the recurring management fee so it is actually charged: the owner-fee
// engine (applyOwnerFeesOnRent) reads schedules by owner_profile_id with a
// rental_receipt trigger, so the fee must be attached to the property's owner
// profile — not just the property. Idempotent: one active management fee per
// owner profile. Best-effort (never blocks agreement creation).
async function syncRecurringFee(env, pricing, propertyId, contactId, t, mgmtCode = 'RPRM-018') {
  const mgmt = pricing.lines.find((l) => l.code === mgmtCode);
  if (!propertyId || !mgmt) return;
  try {
    const [profile] = await PropertyOwnerProfile.findOrCreate({
      where: { property_id: propertyId },
      defaults: { property_id: propertyId, contact_id: contactId || null },
      transaction: t,
    });
    if (!profile.contact_id && contactId) await profile.update({ contact_id: contactId }, { transaction: t });
    // Replace any prior management-fee schedule for this owner profile (avoid dupes).
    await OwnerFeeSchedule.destroy({ where: { owner_profile_id: profile.id, fee_category: 'management' }, transaction: t });
    await OwnerFeeSchedule.create({
      property_id: propertyId, owner_profile_id: profile.id,
      fee_name: 'Property Management Fee', fee_category: 'management',
      fee_trigger: 'rental_receipt',
      amount_type: mgmt.price_type === 'percent_of_rent' ? 'percentage' : 'fixed',
      amount_value: mgmt.price_type === 'percent_of_rent' ? (mgmt.percent || 5) : mgmt.agreed_price,
      notes: `From ${env.envelope_code} (min ${mgmt.min || 0})`, is_active: true,
    }, { transaction: t });
  } catch (e) { console.warn('[rprm] syncRecurringFee:', e.message); }
}

// Create the agreement — save as a draft, or send it to the landlord for signing.
exports.createAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const client = body.client || {};
  const asDraft = !!body.save_as_draft;
  if (!client.full_name) return res.status(400).json({ error: 'Landlord full name is required.' });
  if (!asDraft && !client.email) return res.status(400).json({ error: 'Landlord email is required to send for signature.' });

  const { vertical, related_type, build, codePrefix, mgmtCode } = ctx(req);
  const { schedule_b, org } = await resolveRprmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId, vertical);
  const built = build({ ...body, schedule_b, org, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);

  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId,
      envelope_code: `${codePrefix}${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`,
      document_html: built.html,
      related_type,
      related_id: body.property_id || null,
      status: 'draft', expires_at: expires,
      signing_order_enforced: true, // Client → Seventh Sky countersign → witnesses
      kyc_role: 'landlord',
      terms: built.terms,
      created_by: req.user?.id || null,
    }, { transaction: t });

    // Multi-party signers with labels matching the document anchors
    // ("Client"/"Seventh Sky"/"Witness N"), so the captured signatures render.
    await persistSigners(env, buildSignerDefs({
      client: { ...client, contact_id: body.client_contact_id || null },
      org, witnesses: body.witnesses, user: req.user || {}, clientRole: 'landlord',
    }), t);
    await syncRecurringFee(env, pricing, body.property_id, body.client_contact_id || null, t, mgmtCode);
    if (asDraft) return { env, links: [] };
    const links = await dispatchEnvelope(env, t);
    return { env, links };
  });

  if (!asDraft) await emailFirstSigner(out.env, out.links, req);
  const clientLink = out.links.find((l) => l.role === 'landlord');
  res.status(201).json({
    id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status,
    signing_token: clientLink?.token || null, signing_path: clientLink ? `/admin/sign/${clientLink.token}` : null,
  });
});

// Rebuild a DRAFT in place from an edited body (services, pricing, witnesses, …).
exports.updateAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const { vertical, related_type, build } = ctx(req);
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: 'Only a draft agreement can be edited. Use "Edit & reissue" for a sent one.' });
  const body = req.body || {}; const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: 'Landlord full name is required.' });
  const { schedule_b, org } = await resolveRprmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId, vertical);
  const built = build({ ...body, schedule_b, org, pricing });
  await sequelize.transaction(async (t) => {
    await SignatureField.destroy({ where: { envelope_id: env.id }, transaction: t });
    await EnvelopeSigner.destroy({ where: { envelope_id: env.id }, transaction: t });
    await env.update({ title: `${built.title} — ${client.full_name}`, document_html: built.html, terms: built.terms, related_id: body.property_id || env.related_id }, { transaction: t });
    await persistSigners(env, buildSignerDefs({
      client: { ...client, contact_id: body.client_contact_id || null },
      org, witnesses: body.witnesses, user: req.user || {}, clientRole: 'landlord',
    }), t);
  });
  res.json({ id: env.id, status: env.status, message: 'Draft updated.' });
});

// Send a draft (or re-send an edited draft): mint tokens + email the first signer.
exports.sendAgreement = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: ctx(req).related_type } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: `Cannot send an agreement in '${env.status}' state.` });
  const landlord = await EnvelopeSigner.findOne({ where: { envelope_id: env.id, role: 'landlord' } });
  if (!landlord?.email) return res.status(400).json({ error: 'Landlord email is required to send for signature.' });
  const links = await sequelize.transaction(async (t) => dispatchEnvelope(env, t));
  await emailFirstSigner(env, links, req);
  res.json({ id: env.id, status: 'sent', links: links.map((l) => ({ name: l.name, role: l.role, order: l.order })) });
});

// List RPRM agreements (envelopes) with their landlord signer + status.
exports.listAgreements = asyncHandler(async (req, res) => {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: ctx(req).related_type },
    include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'signer_order', 'name', 'email', 'role', 'status', 'signed_at'] }],
    order: [['id', 'DESC']],
  });
  res.json(rows.map((r) => {
    const e = r.get({ plain: true });
    let terms = e.terms; if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = {}; } }
    const signers = (e.signers || []).slice().sort((a, b) => (a.signer_order || 0) - (b.signer_order || 0)).map((s) => ({
      id: s.id, order: s.signer_order, role: s.role, name: s.name, email: s.email, status: s.status, signed_at: s.signed_at,
    }));
    const primary = signers.find((s) => s.role === 'client' || s.role === 'landlord') || signers[0] || null;
    return {
      id: e.id, envelope_code: e.envelope_code, title: e.title, status: e.status,
      property_id: e.related_id, created_at: e.createdAt, sent_at: e.sent_at, completed_at: e.completed_at,
      expires_at: e.expires_at, content_hash: e.content_hash,
      signers,
      signer: primary,
      client_name: primary?.name || terms?.client?.full_name || null,
      client_email: primary?.email || terms?.client?.email || null,
      terms,
      total_contract_value: terms?.pricing_summary?.total_contract_value || null,
    };
  }));
});
