/**
 * rptm.controller.js — Residential Property Tenancy Management Service Agreement.
 * Catalog (Schedule C), builder metadata, live preview, and agreement → tenant eSign.
 */
const crypto = require('crypto');
const { asyncHandler, branchScope, resolveBranchId } = require('../utils/controllerHelpers');
const svc = require('../services/rptmAgreement.service');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const WorkOrder = require('../models/WorkOrder');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const { generateCode } = require('../utils/codeGenerator');
const { buildSignerDefs, persistSigners, dispatchEnvelope, emailFirstSigner } = require('../services/agreementSigners.service');
const sequelize = require('../config/db.config');

async function resolveRptmDefaults(body, user) {
  const b = { ...(body.schedule_b || {}) };
  if (!b.work_order_no) {
    b.work_order_no = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  }
  if (!b.tenancy_ref_no) {
    if (body.property_id) {
      const ten = await Tenancy.findOne({
        where: { property_id: body.property_id },
        order: [['id', 'DESC']],
      });
      if (ten?.tenancy_code) b.tenancy_ref_no = ten.tenancy_code;
    }
    if (!b.tenancy_ref_no) {
      b.tenancy_ref_no = await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-');
    }
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
  res.json(await svc.getRptmCatalog(branchScope(req).branch_id));
});
exports.getMeta = asyncHandler(async (req, res) => {
  const nextWo = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const nextTn = await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-');
  res.json({
    service_groups: svc.SERVICE_GROUPS,
    checklist_groups: svc.CHECKLIST_GROUPS,
    defaults: {
      work_order_no: nextWo,
      tenancy_ref_no: nextTn,
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
  const ten = await Tenancy.findOne({ where: { property_id: propertyId }, order: [['id', 'DESC']] });
  const nextWo = await generateCode(WorkOrder, 'work_order_code', 'SSPC-WO-');
  const tenancyRef = ten?.tenancy_code || await generateCode(Tenancy, 'tenancy_code', 'SSPC-TN-');
  res.json({
    work_order_no: nextWo,
    tenancy_ref_no: tenancyRef,
    property_type: prop?.property_type || '',
    property_address: prop?.address || '',
    monthly_rent: ten?.monthly_rent || prop?.approved_monthly_rent || '',
    security_deposit: ten?.security_deposit || '',
    commencement_date: ten?.lease_start || '',
    expiry_date: ten?.lease_end || '',
    rent_due_date: ten?.rent_due_day ? `${ten.rent_due_day}th of each month` : '',
  });
});

exports.preview = asyncHandler(async (req, res) => {
  const branchId = branchScope(req).branch_id;
  const body = req.body || {};
  const { schedule_b, org } = await resolveRptmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildTenancyMgmtAgreement({ ...body, schedule_b, org, pricing });
  res.json({ ...built, pricing, schedule_b, org });
});

exports.createAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const body = req.body || {};
  const client = body.client || {};
  const asDraft = !!body.save_as_draft;
  if (!client.full_name) return res.status(400).json({ error: 'Tenant full name is required.' });
  if (!asDraft && !client.email) return res.status(400).json({ error: 'Tenant email is required to send for signature.' });

  const { schedule_b, org } = await resolveRptmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildTenancyMgmtAgreement({ ...body, schedule_b, org, pricing });
  const expires = new Date(Date.now() + 30 * 864e5);

  const out = await sequelize.transaction(async (t) => {
    const env = await SigningEnvelope.create({
      branch_id: branchId,
      envelope_code: `ENV-RPTM-${Date.now().toString().slice(-6)}`,
      title: `${built.title} — ${client.full_name}`,
      document_html: built.html,
      related_type: 'tenancy_management_agreement',
      related_id: body.property_id || null,
      status: 'draft', expires_at: expires,
      signing_order_enforced: true, kyc_role: 'tenant', terms: built.terms,
      created_by: req.user?.id || null,
    }, { transaction: t });

    // Multi-party signers with labels matching the document anchors
    // ("Client"/"Seventh Sky"/"Witness N") so the captured signatures render.
    await persistSigners(env, buildSignerDefs({
      client: { ...client, contact_id: body.client_contact_id || null },
      org, witnesses: body.witnesses, user: req.user || {}, clientRole: 'tenant',
    }), t);
    if (asDraft) return { env, links: [] };
    const links = await dispatchEnvelope(env, t);
    return { env, links };
  });

  if (!asDraft) await emailFirstSigner(out.env, out.links, req);
  const clientLink = out.links.find((l) => l.role === 'tenant');
  res.status(201).json({
    id: out.env.id, envelope_code: out.env.envelope_code, status: out.env.status,
    signing_token: clientLink?.token || null, signing_path: clientLink ? `/admin/sign/${clientLink.token}` : null,
  });
});

// Rebuild a DRAFT in place from an edited body.
exports.updateAgreement = asyncHandler(async (req, res) => {
  const branchId = resolveBranchId(req);
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: 'tenancy_management_agreement' } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: 'Only a draft agreement can be edited. Use "Edit & reissue" for a sent one.' });
  const body = req.body || {}; const client = body.client || {};
  if (!client.full_name) return res.status(400).json({ error: 'Tenant full name is required.' });
  const { schedule_b, org } = await resolveRptmDefaults(body, req.user);
  const pricing = await svc.computePricing(body.pricing_input || {}, branchId);
  const built = svc.buildTenancyMgmtAgreement({ ...body, schedule_b, org, pricing });
  await sequelize.transaction(async (t) => {
    await SignatureField.destroy({ where: { envelope_id: env.id }, transaction: t });
    await EnvelopeSigner.destroy({ where: { envelope_id: env.id }, transaction: t });
    await env.update({ title: `${built.title} — ${client.full_name}`, document_html: built.html, terms: built.terms, related_id: body.property_id || env.related_id }, { transaction: t });
    await persistSigners(env, buildSignerDefs({
      client: { ...client, contact_id: body.client_contact_id || null },
      org, witnesses: body.witnesses, user: req.user || {}, clientRole: 'tenant',
    }), t);
  });
  res.json({ id: env.id, status: env.status, message: 'Draft updated.' });
});

// Send / re-send a draft.
exports.sendAgreement = asyncHandler(async (req, res) => {
  const env = await SigningEnvelope.findOne({ where: { id: req.params.id, ...branchScope(req), related_type: 'tenancy_management_agreement' } });
  if (!env) return res.status(404).json({ error: 'Agreement not found.' });
  if (env.status !== 'draft') return res.status(409).json({ error: `Cannot send an agreement in '${env.status}' state.` });
  const tenant = await EnvelopeSigner.findOne({ where: { envelope_id: env.id, role: 'tenant' } });
  if (!tenant?.email) return res.status(400).json({ error: 'Tenant email is required to send for signature.' });
  const links = await sequelize.transaction(async (t) => dispatchEnvelope(env, t));
  await emailFirstSigner(env, links, req);
  res.json({ id: env.id, status: 'sent', links: links.map((l) => ({ name: l.name, role: l.role, order: l.order })) });
});

exports.listAgreements = asyncHandler(async (req, res) => {
  const rows = await SigningEnvelope.findAll({
    where: { ...branchScope(req), related_type: 'tenancy_management_agreement' },
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
