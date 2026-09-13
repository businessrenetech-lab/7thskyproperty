/**
 * sts.controller.js — Short-Term Rental Management Service Agreement (SSPC-STRMS-01).
 * Catalog / meta / preview / create+list. On create, the chosen management-fee model
 * (fixed monthly / revenue share %) is persisted to ShortStayOwnerManagement so the
 * existing owner-statement & disbursement engine deducts Seventh Sky's fee.
 */
const crypto = require('crypto');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const svc = require('../services/stsAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
const WorkOrder = require('../models/WorkOrder');
const CareQuotation = require('../models/CareQuotation');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const sequelize = require('../config/db.config');

async function resolveStsDefaults(body, user) {
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

exports.getCatalog = asyncHandler(async (req, res) => {
  res.json(await svc.getStsCatalog(branchScope(req).branch_id));
});
exports.getMeta = asyncHandler(async (req, res) => {
  const nextWo = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const nextQt = await generateCode(CareQuotation, 'quote_code', 'SSPC-QT-');
  res.json({
    service_groups: svc.SERVICE_GROUPS,
    checklist_groups: svc.CHECKLIST_GROUPS,
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
  });
});

exports.preview = asyncHandler(async (req, res) => {
  const branchId = branchScope(req).branch_id;
  const body = req.body || {};
  const { schedule_b, org } = await resolveStsDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildStsAgreement({ ...body, schedule_b, org, pricing });
  res.json({ ...built, pricing, schedule_b, org });
});

exports.createAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: 'Owner full name is required.' });
  if (!client.email) return res.status(400).json({ error: 'Owner email is required to send for signature.' });

  const { schedule_b, org } = await resolveStsDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildStsAgreement({ ...body, schedule_b, org, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);

  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId,
      envelope_code: `ENV-STS-${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`,
      document_html: built.html,
      related_type: 'str_management_agreement',
      related_id: body.property_id || null,
      status: 'sent', sent_at: new Date(), expires_at: expires,
      signing_order_enforced: false, kyc_role: 'owner', terms: built.terms,
      created_by: req.user?.id || null,
    }, { transaction: t });

    const token = crypto.randomBytes(24).toString('hex');
    const signer = await EnvelopeSigner.create({
      envelope_id: env.id, signer_order: 1, role: 'owner',
      name: client.full_name, email: client.email, phone: client.phone || null,
      contact_id: body.client_contact_id || null,
      access_token: token, token_expires_at: expires, status: 'sent',
    }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'signature', page: 1, required: true, label: 'Owner signature' }, { transaction: t });
    await SignatureField.create({ envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', page: 1, required: true, label: 'Date' }, { transaction: t });

    // Persist the management-fee model so owner statements / disbursement deduct Seventh Sky's fee.
    if (body.property_id && body.client_contact_id) {
      const fee = pricing.fee || {};
      const [mgmt] = await ShortStayOwnerManagement.findOrCreate({
        where: { property_id: body.property_id },
        defaults: {
          branch_id: branchId, property_id: body.property_id, primary_owner_contact_id: body.client_contact_id,
          management_package: fee.model || 'full_management',
          fixed_monthly_fee: fee.fixed_monthly_fee || 0, revenue_share_percent: fee.revenue_share_percent || 0,
          commencement_date: body.schedule_b?.commencement_date || null,
          agreement_envelope_id: env.id, status: 'pending_signature',
        },
        transaction: t,
      });
      await mgmt.update({
        primary_owner_contact_id: body.client_contact_id,
        management_package: fee.model || mgmt.management_package,
        fixed_monthly_fee: fee.fixed_monthly_fee || 0, revenue_share_percent: fee.revenue_share_percent || 0,
        agreement_envelope_id: env.id, status: 'pending_signature',
      }, { transaction: t });
    }
    return { env, token };
  });

  res.status(201).json({
    id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status,
    signing_token: out.token, signing_path: `/admin/sign/${out.token}`,
  });
});

exports.listAgreements = asyncHandler(async (req, res) => {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: 'str_management_agreement' },
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
      fee: terms?.fee || null,
    };
  }));
});
