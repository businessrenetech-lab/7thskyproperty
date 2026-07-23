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

/** Master hook — called by signing.controller when an envelope completes. */
async function handleEnvelopeCompleted(envelope, options = {}) {
  if (!envelope) return;
  const terms = parseTerms(envelope);

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
  });

  // Notifications outside the transaction — must never roll back activation.
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

module.exports = {
  activatePartyRole,
  activateTenancyFromSignedAgreement,
  activatePartyRoleAfterKyc,
  handleEnvelopeCompleted,
};
