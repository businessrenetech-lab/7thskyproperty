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
const sequelize = require('../config/db.config');

// Editable Schedule C standard price catalog
exports.getCatalog = asyncHandler(async (req, res) => {
  res.json(await svc.getRprmCatalog(branchScope(req).branch_id));
});

// Builder metadata: Schedule A service groups + Schedule D checklist groups
exports.getMeta = asyncHandler(async (req, res) => {
  res.json({ service_groups: svc.SERVICE_GROUPS, checklist_groups: svc.CHECKLIST_GROUPS });
});

// Live preview — compute pricing then render the full agreement HTML from builder inputs
exports.preview = asyncHandler(async (req, res) => {
  const branchId = branchScope(req).branch_id;
  const body = req.body || {};
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildResidentialPMAgreement({ ...body, pricing });
  res.json({ ...built, pricing });
});

// Create the agreement and send it to the landlord for KYC + eSignature.
exports.createAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: 'Landlord full name is required.' });
  if (!client.email) return res.status(400).json({ error: 'Landlord email is required to send for signature.' });

  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildResidentialPMAgreement({ ...body, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);

  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId,
      envelope_code: `ENV-RPRM-${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`,
      document_html: built.html,
      related_type: 'property_management_agreement',
      related_id: body.property_id || null,
      status: 'sent', sent_at: new Date(), expires_at: expires,
      signing_order_enforced: false,
      kyc_role: 'landlord',
      terms: built.terms,
      created_by: req.user?.id || null,
    }, { transaction: t });

    const token = crypto.randomBytes(24).toString('hex');
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, signer_order: 1, role: 'landlord',
      name: client.full_name, email: client.email, phone: client.phone || null,
      contact_id: body.client_contact_id || null,
      access_token: token, token_expires_at: expires, status: 'sent',
    }, { transaction: t });

    // Signature + date fields so the signing page shows the sign box
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: 'Landlord signature' }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: 'Date' }, { transaction: t });

    // Persist the recurring management fee to the owner fee schedule (best-effort)
    const mgmt = pricing.lines.find((l) => l.code === 'RPRM-018');
    if (body.property_id && mgmt) {
      await OwnerFeeSchedule.create({
        property_id: body.property_id, fee_name: 'Property Management Fee',
        fee_category: 'management', fee_trigger: 'monthly',
        amount_type: mgmt.price_type === 'percent_of_rent' ? 'percentage' : 'fixed',
        amount_value: mgmt.price_type === 'percent_of_rent' ? (mgmt.percent || 5) : mgmt.agreed_price,
        notes: `From ${env.envelope_code} (min ${mgmt.min || 0})`, is_active: true,
      }, { transaction: t }).catch(() => {});
    }
    return { env, token };
  });

  res.status(201).json({
    id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status,
    signing_token: out.token, signing_path: `/admin/sign/${out.token}`,
  });
});

// List RPRM agreements (envelopes) with their landlord signer + status.
exports.listAgreements = asyncHandler(async (req, res) => {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: 'property_management_agreement' },
    include: [{ model: EnvelopeSigner, as: 'signers', attributes: ['id', 'name', 'email', 'role', 'status', 'signed_at'] }],
    order: [['id', 'DESC']],
  });
  res.json(rows.map((r) => {
    const e = r.get({ plain: true });
    let terms = e.terms; if (typeof terms === 'string') { try { terms = JSON.parse(terms); } catch { terms = {}; } }
    return {
      id: e.id, envelope_code: e.envelope_code, title: e.title, status: e.status,
      property_id: e.related_id, created_at: e.createdAt, sent_at: e.sent_at, completed_at: e.completed_at,
      signer: (e.signers || [])[0] || null,
      total_contract_value: terms?.pricing_summary?.total_contract_value || null,
    };
  }));
});
