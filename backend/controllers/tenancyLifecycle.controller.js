/**
 * tenancyLifecycle.controller.js
 * ------------------------------------------------------------------
 * Staff-side endpoints for the renewal, vacancy-notice, and deposit-
 * settlement workflows. Portal-scoped variants live in landlord/tenant
 * controllers.
 */
const { Op } = require('sequelize');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const VacancyNotice = require('../models/VacancyNotice');
const DepositSettlement = require('../models/DepositSettlement');
const lifecycle = require('../services/tenancyLifecycle.service');
const { asyncHandler, branchScope, resolveBranchId, getPagination, pick } = require('../utils/controllerHelpers');

const propInc = { model: Property, attributes: ['id', 'property_code', 'title', 'area', 'district'] };
const propIncNotice = { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] };

// ═══ TENANCY AGREEMENT — generate prefilled doc, send for signing ═══════════
// POST /api/tenancies/:id/send-agreement
//   body: { signer_mode?: 'sspc'|'owner'|'three_party', terms?: {...overrides},
//           cc_emails?: [..], message?: string }
// Creates a signing envelope (related_type='tenancy') with a real prefilled
// tenancy agreement. On completion the activation hook makes the tenancy live.
const crypto = require('crypto');
const sequelize = require('../config/db.config');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const SignatureField = require('../models/SignatureField');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const { TenantApplication } = require('../models/TenantApplication');
const Communication = require('../models/Communication');
const { buildTenancyAgreement } = require('../services/agreementTemplates.service');
const { generateCode } = require('../utils/codeGenerator');

exports.sendTenancyAgreement = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const isRenewal = req.body.renewal === true;
  if (!isRenewal && t.lease_status === 'active') return res.status(400).json({ error: 'This tenancy is already active — agreement already executed.' });

  const [property, owner, tenant, application] = await Promise.all([
    t.property_id ? Property.findByPk(t.property_id) : null,
    t.owner_contact_id ? Contact.findByPk(t.owner_contact_id) : null,
    t.tenant_contact_id ? Contact.findByPk(t.tenant_contact_id) : null,
    t.application_id ? TenantApplication.findByPk(t.application_id) : null,
  ]);
  if (!tenant) return res.status(400).json({ error: 'Tenancy has no tenant contact — link a tenant first.' });
  if (!owner || Number(property?.owner_contact_id) !== Number(owner.id)) return res.status(400).json({ error: 'Assign the property owner to this tenancy before sending an agreement.' });
  if (!tenant.email) return res.status(400).json({ error: `Tenant ${tenant.full_name} has no email on file. Add an email to their contact before sending.` });

  // 1. Build the prefilled agreement + structured terms. For a renewal, layer
  // the renewal offer over the current terms and advance the term start.
  let overrides = req.body.terms || {};
  if (isRenewal) {
    if (!['owner_approved', 'tenant_accepted'].includes(t.renewal_status)) {
      return res.status(400).json({ error: 'Approve the proposed renewal before sending its agreement.' });
    }
    overrides = {
      ...overrides,
      monthly_rent: t.renewal_offer_rent ?? t.monthly_rent,
      service_charge: t.renewal_offer_service ?? t.service_charge,
      lease_end: t.renewal_offer_lease_end ?? overrides.lease_end,
      lease_start: overrides.lease_start || t.renewal_effective_date || t.lease_end || new Date().toISOString().slice(0, 10),
      renewal: true,
    };
  }
  const doc = buildTenancyAgreement({ tenancy: t, property, owner, tenant, application, overrides });
  if (isRenewal) doc.terms = { ...doc.terms, renewal: true };

  // 2. Signers — default: tenant + Seventh Sky; owner CC'd.
  const mode = req.body.signer_mode || 'sspc';
  const signers = [{ name: tenant.full_name, email: tenant.email, role: 'tenant', contact_id: tenant.id, signer_order: 1 }];
  if (mode === 'owner' || mode === 'three_party') {
    if (!owner?.email) return res.status(400).json({ error: 'signer_mode requires the owner to sign, but the owner has no email on file.' });
    signers.push({ name: owner.full_name, email: owner.email, role: 'landlord', contact_id: owner.id, signer_order: 2 });
  }
  if (mode === 'sspc' || mode === 'three_party') {
    signers.push({ name: req.user?.name || 'Seventh Sky Property Care', email: req.user?.email, role: 'staff_countersign', user_id: req.user?.id || null, signer_order: signers.length + 1 });
  }

  // Owner is CC'd whenever they are not themselves a signer.
  const cc = new Set(Array.isArray(req.body.cc_emails) ? req.body.cc_emails : []);
  if (owner?.email && mode === 'sspc') cc.add(owner.email);

  // 3. Create envelope + signers + fields + send — one transaction.
  const expires = new Date(Date.now() + 14 * 86400000);
  const result = await sequelize.transaction(async (tx) => {
    await SigningEnvelope.update(
      { status: 'voided', voided_reason: 'Superseded by a newer tenancy agreement' },
      { where: { related_type: 'tenancy', related_id: t.id, status: { [Op.in]: ['draft', 'pending_approval', 'sent', 'viewed', 'partially_signed'] } }, transaction: tx }
    );
    const env = await SigningEnvelope.create({
      branch_id: t.branch_id,
      envelope_code: await generateCode(SigningEnvelope, 'envelope_code', 'SSPC-ENV-'),
      title: doc.title,
      document_html: doc.html,
      message: req.body.message || `Please review and sign the tenancy agreement for ${property?.title || 'the property'}.`,
      related_type: 'tenancy',
      related_id: t.id,
      terms: doc.terms,
      cc_emails: [...cc],
      signing_order_enforced: true,
      status: 'sent',
      sent_at: new Date(),
      expires_at: expires,
      created_by: req.user?.id || null,
    }, { transaction: tx });

    const links = [];
    for (let i = 0; i < signers.length; i++) {
      const token = crypto.randomBytes(24).toString('hex');
      const signer = await EnvelopeSigner.create({
        envelope_id: env.id, ...signers[i],
        access_token: token, token_expires_at: expires,
        status: signers[i].signer_order === 1 ? 'sent' : 'pending',
      }, { transaction: tx });
      await SignatureField.bulkCreate([
        { envelope_id: env.id, signer_id: signer.id, field_type: 'signature', label: 'Signature', required: true },
        { envelope_id: env.id, signer_id: signer.id, field_type: 'date_signed', label: 'Date', required: false },
      ], { transaction: tx });
      links.push({ name: signer.name, email: signer.email, order: signer.signer_order, token });
    }

    // Renewal keeps the live lease active; a fresh tenancy moves to sent_for_signature.
    await t.update(isRenewal
      ? { agreement_sent_date: new Date().toISOString().slice(0, 10) }
      : { lease_status: 'sent_for_signature', agreement_sent_date: new Date().toISOString().slice(0, 10) },
    { transaction: tx });

    // Keep the tenant role profile in lockstep
    const [profile, profileCreated] = await PartyRoleProfile.findOrCreate({
      where: { contact_id: tenant.id, role_type: 'tenant', tenancy_id: t.id },
      defaults: {
        branch_id: t.branch_id,
        profile_code: await generateCode(PartyRoleProfile, 'profile_code', 'SSPC-RP-'),
        property_id: t.property_id, application_id: t.application_id,
        status: 'signing_sent', next_action: 'Waiting for signatures',
        created_by: req.user?.id || null,
      },
      transaction: tx,
    });
    if (profileCreated) { try { await require('../services/kycReuse.service').applyKycReuse(profile, { transaction: tx, actorId: req.user?.id }); } catch { /* non-fatal */ } }
    await profile.update({ envelope_id: env.id, status: 'signing_sent', next_action: 'Waiting for signatures' }, { transaction: tx });

    return { env, links };
  });

  // 4. Email signing links + CC notification (best-effort, never blocks)
  const base = process.env.SIGN_BASE_URL || `${req.protocol}://${req.get('host')}/admin/sign`;
  try {
    const { sendEmail } = require('../services/communication.service');
    for (const l of result.links) {
      if (!l.email) continue;
      await sendEmail(l.email, `Please sign: ${doc.title}`,
        `<p>Dear ${l.name},</p><p>Please review and sign the tenancy agreement:</p><p><a href="${base}/${l.token}">${base}/${l.token}</a></p><p>This link expires in 14 days.</p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
    for (const ccEmail of cc) {
      await sendEmail(ccEmail, `Tenancy agreement sent for signing — ${property?.title || ''}`,
        `<p>The tenancy agreement <b>${doc.title}</b> has been sent for signing. You will be notified when it completes.</p><p>— Seventh Sky Property Care</p>`
      ).catch(() => {});
    }
  } catch { /* mail is best-effort */ }

  // 5. Property timeline entry
  if (t.property_id) {
    await Communication.create({
      branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id,
      channel: 'email', direction: 'outbound',
      subject: `Tenancy agreement sent — ${result.env.envelope_code}`,
      body: `Signers: ${result.links.map((l) => `${l.name} <${l.email}>`).join(', ')}${cc.size ? ` · CC: ${[...cc].join(', ')}` : ''}`,
      user_id: req.user?.id || null,
    }).catch(() => {});
  }

  res.status(201).json({
    data: { envelope: result.env, links: result.links.map((l) => ({ ...l, link: `${base}/${l.token}` })) },
    message: `Tenancy agreement sent — ${result.links.length} signer(s)${cc.size ? `, owner CC'd (${[...cc].join(', ')})` : ''}. Tenancy activates automatically on completion.`,
  });
});
const tenantInc = { model: Contact, as: 'tenant', attributes: ['id', 'full_name', 'primary_phone', 'email'] };
const ownerInc = { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] };

// ═══ RENEWALS ═══════════════════════════════════════════════════════════════

// GET /api/property-management/renewals — dashboard bucketed by 30/60/90 days
exports.renewalsDashboard = asyncHandler(async (req, res) => {
  const bw = branchScope(req);
  const where = { status: 'active', ...bw };
  const buckets = { d30: [], d60: [], d90: [], in_flight: [] };

  const in_flight = await Tenancy.findAll({
    where: { ...bw, renewal_status: { [Op.in]: ['proposed', 'owner_approved', 'tenant_accepted'] } },
    include: [propInc, tenantInc],
    order: [['renewal_proposed_at', 'DESC']],
  });
  buckets.in_flight = in_flight;

  // Expiring buckets — only for tenancies not already in a renewal flow
  const now = new Date();
  const plus = (days) => {
    const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
  };
  const nowIso = now.toISOString().slice(0, 10);

  const inflightIds = in_flight.map((t) => t.id);
  const commonWhere = {
    ...where,
    renewal_status: { [Op.in]: ['none', 'declined'] },
    ...(inflightIds.length ? { id: { [Op.notIn]: inflightIds } } : {}),
  };
  buckets.d30 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.between]: [nowIso, plus(30)] } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });
  buckets.d60 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.gt]: plus(30), [Op.lte]: plus(60) } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });
  buckets.d90 = await Tenancy.findAll({ where: { ...commonWhere, lease_end: { [Op.gt]: plus(60), [Op.lte]: plus(90) } }, include: [propInc, tenantInc], order: [['lease_end', 'ASC']] });

  res.json({
    data: buckets,
    counts: { d30: buckets.d30.length, d60: buckets.d60.length, d90: buckets.d90.length, in_flight: buckets.in_flight.length },
  });
});

// POST /api/tenancies/:id/renewal/quick — extend at same terms, no re-signing.
exports.quickRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.quickRenewal(t.id, pick(req.body, ['months', 'new_lease_end']));
    if (t.property_id) {
      await Communication.create({
        branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id,
        channel: 'note', direction: 'internal', subject: `Tenancy quick-renewed — ${t.tenancy_code}`,
        body: `Lease extended to ${updated.lease_end} at the same terms (rent ${updated.monthly_rent}).`,
        user_id: req.user?.id || null,
      }).catch(() => {});
    }
    res.json({ data: updated, message: `Lease extended to ${updated.lease_end} at the same terms.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Rent/service increment notice — logged + emailed to the tenant when a
// renewal proposal raises the rent or service charge.
async function issueIncrementNotice(t, req, { rent_from, rent_to, service_from, service_to, effective_date }) {
  const inc = { rent_from, rent_to, service_from, service_to, effective_date, has_increase: Number(rent_to) > Number(rent_from) || Number(service_to) > Number(service_from), emailed: false, email_reason: null };
  if (!inc.has_increase) return inc;
  const tenant = t.tenant_contact_id ? await Contact.findByPk(t.tenant_contact_id) : null;
  const lines = [];
  if (Number(rent_to) > Number(rent_from)) lines.push(`Monthly rent: ৳${Number(rent_from).toLocaleString()} → <b>৳${Number(rent_to).toLocaleString()}</b>`);
  if (Number(service_to) > Number(service_from)) lines.push(`Service charge: ৳${Number(service_from).toLocaleString()} → <b>৳${Number(service_to).toLocaleString()}</b>`);
  const html = `<p>Dear ${tenant?.full_name || 'Tenant'},</p>
    <p>This is a formal notice of a review to the terms of your tenancy, effective <b>${effective_date || 'the renewal date'}</b>:</p>
    <ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
    <p>A renewal agreement reflecting these terms will follow for your review and signature.</p>
    <p>— Seventh Sky Property Care</p>`;
  if (tenant?.email) {
    try {
      const { sendEmail } = require('../services/communication.service');
      await sendEmail(tenant.email, `Rent review notice — ${t.tenancy_code}`, html);
      inc.emailed = true;
    } catch { inc.email_reason = 'Email delivery failed; the notice remains in the property timeline.'; }
  } else inc.email_reason = 'Tenant has no email; download and deliver the notice manually.';
  if (t.property_id) {
    await Communication.create({
      branch_id: t.branch_id, entity_type: 'property', entity_id: t.property_id,
       channel: inc.emailed ? 'email' : 'note', direction: inc.emailed ? 'outbound' : 'internal', subject: `Rent/service increment notice — ${t.tenancy_code}`,
      body: lines.join(' · ').replace(/<[^>]+>/g, ''), user_id: req.user?.id || null,
    }).catch(() => {});
  }
  return inc;
}

// POST /api/tenancies/:id/renewal/propose
exports.proposeRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.proposeRenewal(t.id, { ...pick(req.body, ['new_rent', 'new_service_charge', 'new_lease_end', 'effective_date', 'notes']), user_id: req.user?.id || null });
    // Auto-issue the increment notice when the proposal raises rent/service.
    const increment = await issueIncrementNotice(t, req, {
      rent_from: t.monthly_rent, rent_to: updated.renewal_offer_rent,
      service_from: t.service_charge, service_to: updated.renewal_offer_service,
      effective_date: req.body.effective_date || updated.renewal_offer_lease_end,
    });
    const message = increment.has_increase
      ? (increment.emailed ? 'Renewal proposed — increment notice emailed to the tenant.' : 'Renewal proposed — increment notice logged for manual delivery.')
      : 'Renewal proposed.';
    res.json({ data: updated, increment, message });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/decide (staff-side; landlord uses portal)
exports.decideRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.decideRenewal(t.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Renewal ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/tenant-accept (staff can accept on tenant's behalf)
exports.tenantAcceptRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.tenantAcceptRenewal(t.id, { note: req.body?.note });
    res.json({ data: updated, message: 'Tenant accepted the renewal.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// POST /api/tenancies/:id/renewal/activate — applies new terms
exports.activateRenewal = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  try {
    const updated = await lifecycle.activateRenewal(t.id);
    res.json({ data: updated, message: 'Renewal activated — tenancy terms updated.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══ END / TERMINATE ═══════════════════════════════════════════════════════
// Both OPEN a settlement review (+ vacancy notice); they do NOT end the tenancy.
// The tenancy ends only when the settlement is finalised (markRefunded).
async function openEndFlow(t, req, { end_type, reason, effective_date, notice_date }) {
  await t.update({
    end_type,
    planned_move_out_date: effective_date || t.lease_end || new Date().toISOString().slice(0, 10),
    ...(end_type === 'termination' ? { termination_reason: reason || 'other', termination_effective_date: effective_date || null } : {}),
  });
  // Vacancy notice (idempotent-ish: reuse an open one if present).
  let vn = await VacancyNotice.findOne({ where: { tenancy_id: t.id, status: { [Op.notIn]: ['closed', 'cancelled'] } } });
  if (!vn) {
    try {
      vn = await lifecycle.submitVacancyNotice({
        tenancy_id: t.id, intended_vacate_date: effective_date || t.lease_end || new Date().toISOString().slice(0, 10),
        reason: reason || (end_type === 'expiry' ? 'Lease expiry' : 'Termination'),
        notes: notice_date ? `Notice date: ${notice_date}` : null, submitted_by_type: 'staff', user_id: req.user?.id || null,
      });
    } catch { /* notice is best-effort */ }
  }
  // Settlement (opens at pending_owner, reuses if present).
  const settlement = await lifecycle.createSettlement({
    tenancy_id: t.id, vacancy_notice_id: vn?.id || null,
    damages_lines: [], cleaning: 0, utility_dues: 0, other_deductions: 0, other_lines: [],
    branch_id: t.branch_id, user_id: req.user?.id || null,
  });
  return { vacancy_notice: vn, settlement };
}

// POST /api/tenancies/:id/end
exports.endTenancy = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (t.status !== 'active') return res.status(400).json({ error: 'Only an active tenancy can be ended.' });
  const out = await openEndFlow(t, req, { end_type: 'expiry', effective_date: req.body.effective_date });
  res.json({ data: out, message: 'End-of-tenancy settlement opened. Review dues and finalise to complete.' });
});

// POST /api/tenancies/:id/terminate  { reason, notice_date, effective_date }
exports.terminateTenancy = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  if (t.status !== 'active') return res.status(400).json({ error: 'Only an active tenancy can be terminated.' });
  const out = await openEndFlow(t, req, {
    end_type: 'termination', reason: req.body.reason, notice_date: req.body.notice_date, effective_date: req.body.effective_date,
  });
  res.json({ data: out, message: 'Termination settlement opened. Review dues and finalise to complete.' });
});

// POST /api/tenancies/:id/send-rent-reminder — email the tenant an overdue reminder now.
exports.sendRentReminder = asyncHandler(async (req, res) => {
  const t = await Tenancy.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!t) return res.status(404).json({ error: 'Tenancy not found.' });
  const { overdueForTenancy, remindTenancy } = require('../services/arrearsReminder.scheduler');
  const row = await overdueForTenancy(t.id);
  if (!row) return res.json({ data: { emailed: false, amount_due: 0 }, message: 'No overdue balance — nothing to remind.' });
  const r = await remindTenancy({ ...row, tenancy_id: t.id }, { force: true, user_id: req.user?.id || null });
  res.json({ data: r, message: r.emailed ? `Reminder sent — ${row.days_overdue} day(s) overdue.` : 'Reminder logged (email not configured).' });
});

// ═══ VACANCY NOTICES ═══════════════════════════════════════════════════════

exports.listVacancyNotices = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.property_id) where.property_id = req.query.property_id;
  const { rows, count } = await VacancyNotice.findAndCountAll({
    where, include: [propIncNotice, tenantInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getVacancyNotice = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propIncNotice, tenantInc] });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  res.json({ data: vn });
});

exports.createVacancyNotice = asyncHandler(async (req, res) => {
  const { tenancy_id, intended_vacate_date, reason, notes } = req.body || {};
  if (!tenancy_id || !intended_vacate_date) return res.status(400).json({ error: 'tenancy_id and intended_vacate_date required.' });
  try {
    const vn = await lifecycle.submitVacancyNotice({
      tenancy_id, intended_vacate_date, reason, notes,
      submitted_by_type: 'staff', user_id: req.user?.id || null,
    });
    res.status(201).json({ data: vn, message: `Vacancy notice ${vn.notice_code} created.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.updateVacancyNotice = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  await vn.update(pick(req.body, ['status', 'exit_inspection_date', 'exit_inspection_id', 'keys_returned_at', 'notes']));
  res.json({ data: vn });
});

exports.scheduleExit = asyncHandler(async (req, res) => {
  const vn = await VacancyNotice.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!vn) return res.status(404).json({ error: 'Vacancy notice not found.' });
  try {
    const updated = await lifecycle.scheduleExit(vn.id, { ...pick(req.body, ['exit_inspection_date', 'inspection_id']), user_id: req.user?.id || null });
    res.json({ data: updated, message: 'Exit scheduled.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══ DEPOSIT SETTLEMENTS ═══════════════════════════════════════════════════

exports.listSettlements = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req);
  const where = { ...branchScope(req) };
  if (req.query.status) where.status = req.query.status;
  const { rows, count } = await DepositSettlement.findAndCountAll({
    where, include: [propIncNotice, tenantInc, ownerInc], limit, offset, order: [['created_at', 'DESC']],
  });
  res.json({ data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } });
});

exports.getSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) }, include: [propIncNotice, tenantInc, ownerInc] });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  res.json({ data: s });
});

// POST /api/deposit-settlements/preview — compute without persisting
exports.previewSettlement = asyncHandler(async (req, res) => {
  const { tenancy_id, damages_lines, cleaning, utility_dues, other_deductions, other_lines } = req.body || {};
  if (!tenancy_id) return res.status(400).json({ error: 'tenancy_id required.' });
  const preview = await lifecycle.computeDeposit(tenancy_id, { damages_lines, cleaning, utility_dues, other_deductions, other_lines });
  res.json({ data: preview });
});

// POST /api/deposit-settlements — create + persist
exports.createSettlement = asyncHandler(async (req, res) => {
  const { tenancy_id } = req.body || {};
  if (!tenancy_id) return res.status(400).json({ error: 'tenancy_id required.' });
  try {
    const s = await lifecycle.createSettlement({
      ...pick(req.body, ['tenancy_id', 'vacancy_notice_id', 'damages_lines', 'cleaning', 'utility_dues', 'other_deductions', 'other_lines', 'notes']),
      branch_id: resolveBranchId(req, req.body.branch_id),
      user_id: req.user?.id || null,
    });
    res.status(201).json({ data: s, message: `Settlement ${s.settlement_code} created.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.recomputeSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.recomputeSettlement(s.id, pick(req.body, ['damages_lines', 'cleaning', 'utility_dues', 'other_deductions', 'other_lines']));
    res.json({ data: updated, message: 'Settlement recomputed.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// The three-step control. Each stage is a separate, recorded action by a
// separate person: submit → independent review → approval → final lock.
const settlementStage = (fn, message) => asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle[fn](s.id, {
      ...pick(req.body, ['notes', 'note', 'decision', 'override', 'override_reason', 'reason']),
      user_id: req.user?.id || null,
      role: req.user?.role || null,
    });
    res.json({ data: updated, message: typeof message === 'function' ? message(updated, req) : message });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.submitSettlement = settlementStage('submitSettlement', 'Submitted for independent review.');
exports.reviewSettlement = settlementStage('reviewSettlement', (u) =>
  (u.status === 'computing' ? 'Sent back to the preparer.' : 'Independent review recorded. Ready for approval.'));
exports.approveSettlement = settlementStage('approveSettlement', 'Settlement approved. Ready to finalise and lock.');
exports.reopenSettlement = settlementStage('reopenSettlement', 'Reopened for changes — it must be reviewed and approved again.');

exports.decideSettlement = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.decideSettlement(s.id, pick(req.body, ['decision', 'note']));
    res.json({ data: updated, message: `Settlement ${req.body.decision}.` });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

exports.markRefunded = asyncHandler(async (req, res) => {
  const s = await DepositSettlement.findOne({ where: { id: req.params.id, ...branchScope(req) } });
  if (!s) return res.status(404).json({ error: 'Settlement not found.' });
  try {
    const updated = await lifecycle.markRefunded(s.id, { ...pick(req.body, ['refund_method', 'refund_reference', 'collection_method', 'collection_reference']), user_id: req.user?.id || null });
    res.json({ data: updated, message: updated.settlement_direction === 'collect' ? 'Dues collected into owner balance. Tenancy closed.' : 'Refund recorded (funded from owner). Tenancy closed.' });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
