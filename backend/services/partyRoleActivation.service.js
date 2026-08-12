/**
 * partyRoleActivation.service.js
 * ------------------------------------------------------------------
 * The automation bridge between signing and operations.
 *
 * When a signing envelope completes:
 *   1. TERMS SYNC — the structured `terms` captured at agreement generation
 *      are written into the operational records, so nothing agreed on paper
 *      needs to be typed into the system again:
 *        · tenancy_agreement      → tenancy rent/deposit/advance/due-day/dates
 *        · management_agreement   → property.management_fee_pct, owner fee
 *                                   schedule, owner profile bank details + KYC
 *                                   flags + agreement_status = 'signed'
 *        · sales_agency_agreement → property listing price
 *   2. ACTIVATION — the tenancy goes live (folios, occupancy) and/or the
 *      party role profile flips to 'active'.
 *   3. NOTIFICATION — cc_emails (e.g. the owner on a tenancy agreement)
 *      receive a completion email; a Communication is logged on the property.
 */
const sequelize = require('../config/db.config');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const SigningEnvelope = require('../models/SigningEnvelope');
const EnvelopeSigner = require('../models/EnvelopeSigner');
const KycDocument = require('../models/KycDocument');
const { evaluate } = require('./kycRequirements.service');
const Tenancy = require('../models/Tenancy');
const Property = require('../models/Property');
const PropertyOwnerProfile = require('../models/PropertyOwnerProfile');
const OwnerFeeSchedule = require('../models/OwnerFeeSchedule');
const Communication = require('../models/Communication');
const { ensureFoliosForTenancy } = require('./folio.service');

const num = (v) => (v == null || v === '' ? null : Number(v));
const parseTerms = (envelope) => {
  const t = envelope?.terms;
  if (!t) return {};
  if (typeof t === 'string') { try { return JSON.parse(t); } catch { return {}; } }
  return t;
};

async function shortStayOwnerKycVerified(envelope, transaction) {
  const ownerSigners = await EnvelopeSigner.findAll({
    where: { envelope_id: envelope.id, role: 'landlord' },
    transaction,
  });
  if (!ownerSigners.length) return false;
  for (const signer of ownerSigners) {
    if (!signer.contact_id) return false;
    const docs = await KycDocument.findAll({
      where: { related_type: 'short_stay_owner', related_id: signer.contact_id, role: 'sts_owner' },
      raw: true,
      transaction,
    });
    if (!evaluate('sts_owner', docs).all_verified) return false;
  }
  return true;
}

async function activatePartyRole(profile, options = {}) {
  if (!profile || profile.status === 'active') return profile;
  return profile.update({
    status: 'active',
    activated_at: new Date(),
    next_action: null,
  }, { transaction: options.transaction });
}

/** Sync landlord (management agreement) terms into property + owner profile + fee schedule. */
async function syncLandlordTerms(profile, terms, tx) {
  if (!profile?.property_id) return;
  const property = await Property.findByPk(profile.property_id, { transaction: tx });
  if (!property) return;

  // 1. Management fee % onto the property
  if (num(terms.management_fee_pct) != null) {
    await property.update({ management_fee_pct: num(terms.management_fee_pct) }, { transaction: tx });
  }
  if (num(terms.rent_due_day) != null) {
    await property.update({ rent_due_day: num(terms.rent_due_day) }, { transaction: tx });
  }

  // 2. Owner profile — agreement signed + bank/KYC sync
  let ownerProfile = await PropertyOwnerProfile.findOne({ where: { property_id: property.id }, transaction: tx });
  if (!ownerProfile && profile.contact_id) {
    ownerProfile = await PropertyOwnerProfile.create({
      property_id: property.id, contact_id: profile.contact_id,
    }, { transaction: tx });
  }
  if (ownerProfile) {
    const patch = { agreement_status: 'signed', onboarding_status: 'completed' };
    if (num(terms.management_fee_pct) != null) patch.management_commission = num(terms.management_fee_pct);
    if (num(terms.onboarding_fee) != null) patch.onboarding_fee = num(terms.onboarding_fee);
    if (terms.disbursement_frequency) patch.disbursement_frequency = terms.disbursement_frequency;
    // Bank details from the agreement — the "typed once" sync the business asked for.
    for (const f of ['bank_name', 'bank_branch', 'bank_account_name', 'bank_account_number', 'bank_routing_number', 'bkash_number', 'nagad_number', 'preferred_payment']) {
      if (terms[f]) patch[f] = terms[f];
    }
    if (terms.bank_account_number || ownerProfile.bank_account_number) patch.bank_details_collected = true;
    await ownerProfile.update(patch, { transaction: tx });

    // 3. Fee schedule — keep the Management Fee row in lockstep with the agreement
    if (num(terms.management_fee_pct) != null) {
      const existing = await OwnerFeeSchedule.findOne({
        where: { owner_profile_id: ownerProfile.id, fee_trigger: 'rental_receipt' },
        transaction: tx,
      });
      if (existing) {
        await existing.update({ amount_type: 'percentage', amount_value: num(terms.management_fee_pct), is_active: true }, { transaction: tx });
      } else {
        await OwnerFeeSchedule.create({
          property_id: property.id, owner_profile_id: ownerProfile.id,
          fee_name: 'Management Fee', fee_category: 'Management fee',
          fee_trigger: 'rental_receipt', amount_type: 'percentage',
          amount_value: num(terms.management_fee_pct), is_active: true,
          notes: 'Synced from signed management agreement',
        }, { transaction: tx });
      }
    }
  }

  // Property enters managed lifecycle if it was not yet
  if (property.pm_status === 'not_managed') {
    await property.update({ pm_status: 'onboarding' }, { transaction: tx });
  }
}

/** Sync vendor (sales agency) terms into the property listing. */
async function syncVendorTerms(profile, terms, tx) {
  if (!profile?.property_id) return;
  const { SaleProfile } = require('../models/SalesModels');
  const saleProfile = await SaleProfile.findOne({
    where: { property_id: profile.property_id, branch_id: profile.branch_id },
    transaction: tx,
  });
  if (saleProfile) {
    const patch = { agreement_status: 'signed' };
    if (num(terms.listing_price) != null && num(terms.listing_price) > 0) {
      patch.asking_price = num(terms.listing_price);
    }
    if (num(terms.commission_pct) != null) {
      patch.commission_percent = num(terms.commission_pct);
    }
    await saleProfile.update(patch, { transaction: tx });
  }
  if (num(terms.listing_price) != null && num(terms.listing_price) > 0) {
    await Property.update({ price: num(terms.listing_price) }, { where: { id: profile.property_id }, transaction: tx });
  }
}

/** Activate a signed tenancy: apply terms, go live, folios, occupancy. */
async function activateTenancyFromSignedAgreement(tenancyId, terms = {}, options = {}) {
  if (!tenancyId) return null;
  const tx = options.transaction;
  const tenancy = await Tenancy.findByPk(tenancyId, { transaction: tx });
  if (!tenancy) return null;

  // 1. Terms sync — whatever was agreed in the signed document wins.
  const patch = {
    lease_status: 'active',
    status: 'active',
    signed_date: new Date().toISOString().slice(0, 10),
  };
  if (num(terms.monthly_rent) != null && num(terms.monthly_rent) > 0) patch.monthly_rent = num(terms.monthly_rent);
  if (num(terms.service_charge) != null) patch.service_charge = num(terms.service_charge);
  if (num(terms.security_deposit) != null) patch.security_deposit = num(terms.security_deposit);
  if (num(terms.advance_rent) != null) patch.advance_rent = num(terms.advance_rent);
  if (num(terms.rent_due_day) != null) patch.rent_due_day = num(terms.rent_due_day);
  if (terms.lease_start) patch.lease_start = terms.lease_start;
  if (terms.lease_end) patch.lease_end = terms.lease_end;
  if (num(terms.minimum_lease_period_months) != null) patch.minimum_lease_period_months = num(terms.minimum_lease_period_months);
  // Renewal: the new terms are now live — close out the renewal cycle.
  if (terms.renewal) { patch.renewal_status = 'none'; patch.renewal_activated_at = new Date(); }
  await tenancy.update(patch, { transaction: tx });

  // 2. Folios + property occupancy
  await ensureFoliosForTenancy(tenancy, { transaction: tx });
  if (tenancy.property_id) {
    await Property.update({
      tenant_contact_id: tenancy.tenant_contact_id,
      status: 'occupied',
      occupancy_status: 'occupied',
      pm_status: 'tenanted',
      listing_status: 'let',
    }, { where: { id: tenancy.property_id }, transaction: tx });
  }

  // 3. Tenant role profile goes active
  const tenantRole = await PartyRoleProfile.findOne({
    where: { tenancy_id: tenancy.id, role_type: 'tenant' },
    transaction: tx,
  });
  if (tenantRole) await activatePartyRole(tenantRole, { transaction: tx });

  // 4. Progressive SOP: a signed tenancy unlocks the move-in + ongoing phases.
  if (tenancy.property_id) {
    try { await require('./progressiveSop.service').unlockForEvent(tenancy.property_id, 'tenancy_signed', { transaction: tx }); } catch (e) { /* non-fatal */ }
  }

  return tenancy;
}

/** Notify CC recipients + log a Communication after completion. Never throws. */
async function notifyCompletion(envelope, contextLabel) {
  try {
    const ccList = Array.isArray(envelope.cc_emails)
      ? envelope.cc_emails
      : (() => { try { return JSON.parse(envelope.cc_emails || '[]'); } catch { return []; } })();
    if (ccList.length) {
      const { sendEmail } = require('./communication.service');
      const html = `
        <p>Dear recipient,</p>
        <p>The following agreement has been <b>fully signed and completed</b>:</p>
        <p><b>${envelope.title}</b><br/>Reference: ${envelope.envelope_code}<br/>Completed: ${new Date().toLocaleString()}</p>
        <p>${contextLabel || ''}</p>
        <p>— Seventh Sky Property Care</p>`;
      for (const cc of ccList) {
        await sendEmail(cc, `Agreement completed — ${envelope.title}`, html).catch(() => {});
      }
    }
  } catch (e) { console.warn('[roleActivation] CC notify failed:', e.message); }
}

async function logPropertyEvent(propertyId, branchId, subject, body) {
  if (!propertyId) return;
  try {
    await Communication.create({
      branch_id: branchId, entity_type: 'property', entity_id: propertyId,
      channel: 'note', direction: 'internal', subject, body,
    });
  } catch { /* non-fatal */ }
}

/* ── SSPC-WTCM-PWO-01 post-execution notifications ─────────────────────
 * Runs after the signing transaction commits. Two audiences:
 *   Client   — who is coming, when, and how to reach them.
 *   Provider — the branded Project Work Order PDF and the execution certificate.
 * Every step is individually guarded: a failed email must never cost the
 * signature, and one failed recipient must not stop the other.
 */
async function notifyWorkOrderExecuted(envelopeId, workOrderId, branchId) {
  const M = require('../models/waterTankOps');
  const woPdf = require('../services/wtWorkOrderPdf.service');
  const branding = require('../services/wtBranding.service');
  const { sendEmail } = require('../services/communication.service');

  const [envelope, wo] = await Promise.all([
    SigningEnvelope.findByPk(envelopeId, { include: [{ model: EnvelopeSigner, as: 'signers' }] }),
    M.WtWorkOrder.findOne({ where: { id: workOrderId, branch_id: branchId } }),
  ]);
  if (!wo) return;

  const provider = wo.provider_id
    ? await M.WtProvider.findOne({ where: { id: wo.provider_id, branch_id: branchId }, raw: true })
    : null;

  let brand = { contact_lines: [] };
  try { brand = await branding.getBranding(branchId); } catch { /* defaults */ }
  const contactBlock = (brand.contact_lines || []).length
    ? `<p style="color:#6b7280;font-size:12px;margin-top:18px;">${brand.contact_lines.map((l) => String(l)).join('<br/>')}</p>`
    : '';

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null);
  const timeline = (() => {
    const raw = wo.timeline_dates;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw) || {}; } catch { return {}; }
  })();
  const scheduledFor = fmt(wo.scheduled_date || timeline.commencement || timeline.site_inspection);

  const shell = (title, body) => `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2430;line-height:1.6;max-width:640px;">
      <div style="border-bottom:3px double #003768;padding-bottom:10px;text-align:center;">
        <div style="font-size:18px;font-weight:bold;color:#003768;">Seventh Sky Property Care</div>
        <div style="font-size:11px;color:#12b6f3;font-weight:bold;letter-spacing:.04em;">WATER TANK CLEANING &amp; MAINTENANCE</div>
      </div>
      <h2 style="font-size:16px;color:#003768;margin:18px 0 8px;">${title}</h2>
      ${body}
      ${contactBlock}
    </div>`;

  /* ── the client: who is coming ── */
  if (wo.client_email) {
    const rows = [
      ['Work Order No.', wo.code],
      ['Project No.', wo.project_id],
      ['Service Address', wo.site_address],
      ['Assigned Service Provider', provider?.business_name || wo.provider_name],
      ['Provider Contact', provider?.contact_person],
      ['Provider Phone', provider?.contact_phone],
      ['Provider Email', provider?.contact_email],
      ['Scheduled', scheduledFor],
    ].filter(([, v]) => v != null && v !== '');
    const table = `<table style="width:100%;border-collapse:collapse;margin:10px 0;">${rows.map(([k, v]) => `
      <tr><td style="padding:6px 10px;border:1px solid #d9dee6;background:#f6f8fb;width:42%;font-weight:600;font-size:13px;">${k}</td>
      <td style="padding:6px 10px;border:1px solid #d9dee6;font-size:13px;">${String(v)}</td></tr>`).join('')}</table>`;

    await sendEmail(
      wo.client_email,
      `Your water tank service is confirmed — Work Order ${wo.code}`,
      shell('Your service provider has been confirmed', `
        <p>Dear ${wo.client_contact_person || wo.client_name || 'Customer'},</p>
        <p>Your Project Work Order has been finalised and the assigned service provider has formally accepted the work. Their details are below so you know exactly who to expect on site.</p>
        ${table}
        <p style="font-size:13px;">Our provider carries Seventh Sky identification. If anyone attends who is not from the company named above, please contact us before allowing access.</p>
        <p style="font-size:13px;">We will be in touch to confirm the attendance window.</p>`),
    ).then(() => wo.update({ client_notified_at: new Date() }))
      .catch((e) => console.error('[work order] client email failed:', e.message));

    await M.WtCommLog.create({
      branch_id: branchId, client_name: wo.client_name, channel: 'email', direction: 'outbound',
      summary: `${wo.code}: provider confirmation sent to client — ${provider?.business_name || wo.provider_name || 'provider'}`,
      ref_type: 'work-orders', ref_code: wo.code, logged_at: new Date(),
    }).catch(() => {});
  }

  /* ── the provider: branded work order + execution certificate ── */
  const providerEmail = provider?.contact_email;
  if (providerEmail) {
    const attachments = [];
    try {
      const pdf = await woPdf.buildWorkOrderPdf(wo.get({ plain: true }), { provider: provider || {}, org: {} });
      attachments.push({ filename: `${wo.code}-project-work-order.pdf`, content: pdf, contentType: 'application/pdf' });
    } catch (e) { console.error('[work order] provider PDF failed:', e.message); }
    if (envelope) {
      try {
        const cert = await woPdf.buildExecutionPdf(envelope, envelope.signers || [], wo.get({ plain: true }));
        attachments.push({ filename: `${wo.code}-signed-agreement.pdf`, content: cert, contentType: 'application/pdf' });
      } catch (e) { console.error('[work order] execution certificate failed:', e.message); }
    }

    await sendEmail(
      providerEmail,
      `Work Order ${wo.code} executed — you are onboarded to this project`,
      shell('You are onboarded to this project', `
        <p>Dear ${provider.contact_person || provider.business_name},</p>
        <p>Project Work Order <b>${wo.code}</b> for <b>${wo.client_name || 'the client'}</b> has been signed by both parties and is now in force under your Master Service Delivery Provider Agreement.</p>
        <p>Attached you will find:</p>
        <ul style="font-size:13px;">
          <li>The branded Project Work Order (Sections 1–10, including the agreed pricing schedule)</li>
          <li>The certificate of execution recording both signatures</li>
        </ul>
        <p style="font-size:13px;">Please review the timeline and warranty terms and confirm your attendance. Your payout of <b>BDT ${Number(wo.provider_net_payable || wo.provider_fee || 0).toLocaleString('en-BD')}</b> becomes payable per the trigger set in your master agreement.</p>`),
      attachments,
    ).catch((e) => console.error('[work order] provider email failed:', e.message));
  }
}

/** Master hook — called by signing.controller when an envelope completes. */
async function handleEnvelopeCompleted(envelope, options = {}) {
  if (!envelope) return;
  const terms = parseTerms(envelope);
  const deferred = [];   // post-commit side effects (email, PDF) — never inside the tx

  await sequelize.transaction(async (tx) => {
    if (envelope.related_type === 'tenancy') {
      const tenancy = await activateTenancyFromSignedAgreement(envelope.related_id, terms, { transaction: tx });
      if (tenancy) {
        await logPropertyEvent(tenancy.property_id, tenancy.branch_id,
          `Tenancy agreement signed — ${envelope.envelope_code}`,
          `Tenancy ${tenancy.tenancy_code} activated automatically. Rent ${tenancy.monthly_rent}, due day ${tenancy.rent_due_day}.`);
      }
    }

    if (envelope.related_type === 'care_quotation') {
      const CareQuotation = require('../models/CareQuotation');
      const { convertToWorkOrder } = require('../controllers/careQuotation.controller');
      const q = await CareQuotation.findByPk(envelope.related_id, { transaction: tx });
      if (q) {
        // Auto-raise the work order on the signed customer agreement (in-transaction).
        try { if (!q.work_order_id) await convertToWorkOrder(q, null, { transaction: tx }); } catch (e) { console.warn('[careQuotation] convert on sign:', e.message); }
        await q.update({ agreement_status: 'signed' }, { transaction: tx });
      }
    }

    // Water Tank customer agreement signed → raise the work order (SOP-01 Sec. 7
    // Step 6 into Sec. 8 Step 7). Idempotent inside the service.
    if (envelope.related_type === 'water_tank_customer_agreement') {
      const { createFromSignedAgreement } = require('./wtWorkOrder.service');
      try {
        await createFromSignedAgreement(envelope, { transaction: tx });
      } catch (e) {
        console.warn('[waterTank] work order on sign:', e.message);
      }

      /*
       * Invoicing. The client has just agreed to Schedule C, so the payment
       * stages in the agreement's own terms become DRAFT invoices — built from
       * those figures rather than retyped, so the invoice cannot drift from what
       * was signed. Deliberately drafts, never sends: an invoice is the one
       * thing you cannot un-send, so the operator reviews it first.
       * A failure here must not roll back a completed signature.
       */
      try {
        const invSvc = require('./wtInvoice.service');
        const drafted = await invSvc.createFromSignedAgreement(envelope, { transaction: tx });
        if (drafted.length) {
          console.log(`[waterTank] ${drafted.length} draft invoice(s) raised from ${envelope.envelope_code}: ${drafted.map((d) => d.code).join(', ')}`);
        }
      } catch (e) {
        console.warn('[waterTank] invoice draft on sign:', e.message);
      }
    }

    // Water Tank provider master agreement: both ordered signers have completed.
    // Activate the versioned commercial terms and effective-dated rate card; do
    // not auto-approve the provider because compliance, payment and territory
    // gates remain independently reviewable.
    if (envelope.related_type === 'water_tank_provider_agreement') {
      const M = require('../models/waterTankOps');
      const P = require('../models/waterTankProviders');
      const agreementId = terms.provider_agreement_id;
      const agreement = agreementId
        ? await P.WtProviderAgreement.findOne({ where: { id: agreementId, provider_id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx })
        : await P.WtProviderAgreement.findOne({ where: { envelope_id: envelope.id, provider_id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx });
      const provider = await M.WtProvider.findOne({ where: { id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx });
      if (agreement && provider) {
        if (provider.active_agreement_id && provider.active_agreement_id !== agreement.id) {
          await P.WtProviderAgreement.update({ status: 'Superseded' }, { where: { id: provider.active_agreement_id, branch_id: envelope.branch_id }, transaction: tx });
        }
        await agreement.update({ status: 'Completed', envelope_id: envelope.id, completed_at: envelope.completed_at || new Date() }, { transaction: tx });
        await P.WtProviderAgreementRate.update({
          effective_from: agreement.effective_date,
          effective_to: agreement.expiry_date,
          rate_status: 'Approved',
        }, { where: { agreement_id: agreement.id, branch_id: envelope.branch_id }, transaction: tx });
        await provider.update({
          active_agreement_id: agreement.id,
          agreement_status: 'Signed',
          agreement_envelope_id: envelope.id,
          agreement_code: agreement.code,
          agreement_signed_date: new Date(envelope.completed_at || Date.now()).toISOString().slice(0, 10),
          agreement_expiry_date: agreement.expiry_date,
          onboarding_stage: provider.cumilla_briefed ? 'Territory Briefing' : 'Agreement Signing',
          stage_updated_at: new Date(),
          bank_details: terms.bank_details || provider.bank_details,
          approved_services: terms.authorised_services || provider.approved_services,
          cumilla_exclusive: terms.cumilla_exclusive ?? provider.cumilla_exclusive,
        }, { transaction: tx });
        await P.WtProviderEvent.create({
          branch_id: envelope.branch_id, provider_id: provider.id, event_type: 'agreement',
          title: `Master agreement ${agreement.code} fully executed`,
          detail: `Version ${agreement.version_no}; effective ${agreement.effective_date}; expires ${agreement.expiry_date}; ${terms.agreed_lines?.length || 0} agreed rates activated.`,
          actor: 'eSign automation', occurred_at: new Date(),
        }, { transaction: tx });
      }
    }

    if (envelope.related_type === 'service_provider') {
      const ServiceProvider = require('../models/ServiceProvider');
      const ProviderCompliance = require('../models/ProviderCompliance');
      const provider = await ServiceProvider.findByPk(envelope.related_id, { transaction: tx });
      if (provider) {
        const patch = { agreement_status: 'signed', non_circumvention_agreed: true };
        // If verification already complete, the signed agreement completes onboarding.
        const allChecked = provider.kyc_verified && provider.compliance_verified && provider.insurance_verified && provider.capability_verified && provider.payment_verified;
        if (allChecked) { patch.onboarding_stage = 'active'; patch.status = 'approved'; if (!provider.verified_at) patch.verified_at = new Date(); }
        if (terms.commission_pct != null) {
          // rate_card can arrive double-encoded (stored as a JSON string). Parse
          // defensively and drop any junk numeric keys before writing.
          let rc = provider.rate_card;
          for (let i = 0; i < 3 && typeof rc === 'string'; i++) { try { rc = JSON.parse(rc); } catch { rc = {}; } }
          const clean = {};
          if (rc && typeof rc === 'object' && !Array.isArray(rc)) for (const k of Object.keys(rc)) if (!/^\d+$/.test(k)) clean[k] = rc[k];
          patch.rate_card = { ...clean, commission_pct: num(terms.commission_pct) };
        }
        await provider.update(patch, { transaction: tx });
        // File the executed agreement against the provider.
        await ProviderCompliance.create({
          provider_id: provider.id, doc_category: 'other', doc_type: 'Signed Master Agreement',
          title: envelope.title, reference_no: envelope.envelope_code, status: 'valid', verified: true,
        }, { transaction: tx }).catch(() => {});
        await logPropertyEvent(null, provider.branch_id, `Provider agreement signed — ${envelope.envelope_code}`, `${provider.company_name} master agreement executed.`);
      }
    }

    if (envelope.related_type === 'party_role') {
      const profile = await PartyRoleProfile.findByPk(envelope.related_id, { transaction: tx });
      if (profile) {
        // Terms sync per role BEFORE activation so activation sees final data.
        if (profile.role_type === 'landlord') await syncLandlordTerms(profile, terms, tx);
        if (profile.role_type === 'vendor') await syncVendorTerms(profile, terms, tx);
        await profile.update({ status: 'signed' }, { transaction: tx });

        // KYC gate: when this envelope collects KYC, hold activation until the
        // required documents are verified. kycAutomation completes it on verify.
        const gated = envelope.kyc_role && envelope.kyc_policy && envelope.kyc_policy !== 'none';
        let kycOk = true;
        if (gated) {
          const docs = await KycDocument.findAll({ where: { related_type: 'party_role', related_id: profile.id, role: envelope.kyc_role }, raw: true, transaction: tx });
          kycOk = evaluate(envelope.kyc_role, docs).all_verified;
        }
        if (kycOk) {
          await activatePartyRole(profile, { transaction: tx });
          if (profile.role_type === 'tenant' && profile.tenancy_id) {
            await activateTenancyFromSignedAgreement(profile.tenancy_id, terms, { transaction: tx });
          }
          await logPropertyEvent(profile.property_id, profile.branch_id,
            `${profile.role_type} agreement signed — ${envelope.envelope_code}`,
            `Role ${profile.profile_code} activated automatically.${profile.role_type === 'landlord' && terms.management_fee_pct != null ? ` Management fee ${terms.management_fee_pct}% synced to property + fee schedule.` : ''}`);
        } else {
          await profile.update({ next_action: 'Awaiting KYC verification' }, { transaction: tx });
          await logPropertyEvent(profile.property_id, profile.branch_id,
            `${profile.role_type} agreement signed — ${envelope.envelope_code}`,
            `Role ${profile.profile_code} signed. Activation held until KYC documents are verified.`);
        }
      }
    }

    if (envelope.related_type === 'short_stay_management') {
      const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
      const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
      const KycDocument = require('../models/KycDocument');
      const { evaluate } = require('./kycRequirements.service');
      // related_id is the property_id (see buildOwnerAgreement), not the management PK.
      const mgmt = await ShortStayOwnerManagement.findOne({ where: { property_id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx });
      if (mgmt) {
        const canActivate = envelope.kyc_policy === 'none' || await shortStayOwnerKycVerified(envelope, tx);
        await mgmt.update({ status: canActivate ? 'active' : 'pending_signature' }, { transaction: tx });
        const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: mgmt.property_id, branch_id: envelope.branch_id }, transaction: tx });
        if (profile && profile.status === 'draft') {
          await profile.update({ status: 'readiness_pending' }, { transaction: tx });
        }
        await logPropertyEvent(mgmt.property_id, mgmt.branch_id, `STS-Owner Agreement Signed — ${envelope.envelope_code}`, canActivate ? 'Short term management active.' : 'Activation held until owner KYC is verified.');
      }
    }

    if (envelope.related_type === 'short_stay_booking') {
      const ShortStayBooking = require('../models/ShortStayBooking');
      const KycDocument = require('../models/KycDocument');
      const { evaluate } = require('./kycRequirements.service');
      const booking = await ShortStayBooking.findOne({ where: { id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx });
      if (booking) {
        const docs = await KycDocument.findAll({ where: { related_type: 'short_stay_booking', related_id: booking.id, role: 'guest' }, raw: true, transaction: tx });
        const kyc = evaluate('guest', docs);
        const nextStatus = envelope.kyc_policy === 'none' || kyc.all_verified ? 'pending_payment' : 'pending_verification';
        await booking.update({ status: nextStatus }, { transaction: tx });
        await logPropertyEvent(booking.property_id, booking.branch_id, `Guest Agreement Signed — ${envelope.envelope_code}`, `Booking ${booking.booking_code} status updated to ${nextStatus}.`);
      }
    }

    /*
     * SSPC-WTCM-PWO-01 — both parties have signed the Project Work Order.
     * The provider is thereby onboarded to the project: the work order advances,
     * the client is told who is coming, and the provider receives the branded
     * work order and the execution certificate as PDFs.
     */
    if (envelope.related_type === 'water_tank_work_order') {
      const M = require('../models/waterTankOps');
      const wo = await M.WtWorkOrder.findOne({
        where: { id: envelope.related_id, branch_id: envelope.branch_id }, transaction: tx,
      });
      if (wo) {
        const signedAt = envelope.completed_at || new Date();
        await wo.update({
          wo_doc_status: 'Signed',
          wo_signed_at: signedAt,
          wo_envelope_id: envelope.id,
          wo_doc_code: envelope.envelope_code,
          // freeze the executed copy — the legal record must never re-render
          wo_signed_document_html: envelope.document_html,
          provider_onboarded_at: signedAt,
          accepted_at: wo.accepted_at || signedAt,
          status: ['Draft', 'Issued'].includes(String(wo.status)) ? 'Accepted' : wo.status,
        }, { transaction: tx });

        if (wo.provider_id) {
          await P.WtProviderEvent.create({
            branch_id: envelope.branch_id, provider_id: wo.provider_id, event_type: 'work order',
            title: `Project Work Order ${wo.code} executed`,
            detail: `Signed by both parties for ${wo.client_name || 'the client'}; provider onboarded to project ${wo.project_id || wo.code}.`,
            actor: 'eSign automation', occurred_at: signedAt,
          }, { transaction: tx }).catch(() => {});
        }

        // Notifications go out after the transaction commits, never inside it —
        // a slow SMTP server must not hold the signing transaction open, and a
        // failed send must not roll back a completed signature.
        deferred.push(() => notifyWorkOrderExecuted(envelope.id, wo.id, envelope.branch_id));
      }
    }

  });

  // Notifications outside the transaction — must never roll back activation.
  for (const job of deferred) {
    try { await job(); } catch (e) { console.error('[activation] post-commit job failed:', e.message); }
  }
  await notifyCompletion(envelope);
}

/**
 * Called by kycAutomation once a party role's KYC is fully verified. If the
 * agreement is already signed, this completes the previously-held activation
 * (role + linked tenancy), applying the signed envelope's terms.
 */
async function activatePartyRoleAfterKyc(profileId) {
  const profile = await PartyRoleProfile.findByPk(profileId);
  if (!profile || profile.status === 'active') return null;
  if (profile.status !== 'signed') return null; // only after the agreement is signed
  const env = profile.envelope_id ? await SigningEnvelope.findByPk(profile.envelope_id) : null;
  const terms = parseTerms(env || {});
  await sequelize.transaction(async (tx) => {
    if (profile.role_type === 'landlord') await syncLandlordTerms(profile, terms, tx);
    if (profile.role_type === 'vendor') await syncVendorTerms(profile, terms, tx);
    await activatePartyRole(profile, { transaction: tx });
    if (profile.role_type === 'tenant' && profile.tenancy_id) {
      await activateTenancyFromSignedAgreement(profile.tenancy_id, terms, { transaction: tx });
    }
  });
  await logPropertyEvent(profile.property_id, profile.branch_id,
    `${profile.role_type} KYC verified — role activated`,
    `Role ${profile.profile_code} activated after KYC verification.`);
  return profile;
}

async function activateShortStayManagementAfterKyc(envelopeId) {
  const envelope = await SigningEnvelope.findByPk(envelopeId);
  if (!envelope || envelope.related_type !== 'short_stay_management' || envelope.status !== 'completed') return null;
  const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
  const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
  const management = await ShortStayOwnerManagement.findOne({
    where: { property_id: envelope.related_id, branch_id: envelope.branch_id },
  });
  if (!management || management.status === 'active') return management;
  if (!await shortStayOwnerKycVerified(envelope)) return null;
  await management.update({ status: 'active' });
  const profile = await ShortStayPropertyProfile.findOne({
    where: { property_id: management.property_id, branch_id: management.branch_id },
  });
  if (profile && profile.status === 'draft') await profile.update({ status: 'readiness_pending' });
  return management;
}

module.exports = {
  activatePartyRole,
  activateTenancyFromSignedAgreement,
  activatePartyRoleAfterKyc,
  activateShortStayManagementAfterKyc,
  handleEnvelopeCompleted,
};
