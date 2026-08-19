/**
 * kycAutomation.service.js — when a KYC document's status changes, roll the
 * result up to the linked role profile / provider and gate activation.
 */
const KycDocument = require('../models/KycDocument');
const { evaluate } = require('./kycRequirements.service');

async function onKycChange(doc) {
  if (!doc?.related_type || !doc.related_id) return;
  const docs = await KycDocument.findAll({ where: { related_type: doc.related_type, related_id: doc.related_id }, raw: true });
  const result = evaluate(doc.role, docs);

  if (doc.related_type === 'party_role') {
    const PartyRoleProfile = require('../models/PartyRoleProfile');
    const p = await PartyRoleProfile.findByPk(doc.related_id);
    if (p) {
      // PartyRoleProfile uses the compact enum not_started|pending|complete.
      // Document collection and staff verification are separate milestones.
      await p.update({
        documents_status: result.all_submitted ? 'complete' : 'pending',
        kyc_status: result.all_verified ? 'complete' : 'pending',
        next_action: result.all_verified
          ? (p.envelope_id ? p.next_action : 'Generate and send the agreement')
          : result.all_submitted ? 'Review and verify KYC documents' : 'Collect required KYC documents',
      });
      // KYC just completed → finish any activation that was held pending verification.
      if (result.all_verified) {
        try { await require('./partyRoleActivation.service').activatePartyRoleAfterKyc(p.id); } catch (e) { /* non-fatal */ }
      }
    }
  }

  if (doc.related_type === 'service_provider') {
    const ServiceProvider = require('../models/ServiceProvider');
    const p = await ServiceProvider.findByPk(doc.related_id);
    if (p) {
      const patch = { kyc_verified: result.all_verified };
      if (result.all_verified) {
        // The unified provider KYC set (trade licence, insurance, TIN/BIN, bank,
        // capability, coverage) covers the legacy per-category verification flags.
        patch.compliance_verified = true; patch.insurance_verified = true;
        patch.capability_verified = true; patch.payment_verified = true;
        if (p.agreement_status === 'signed' && !['active', 'suspended', 'terminated'].includes(p.onboarding_stage)) {
          patch.onboarding_stage = 'active'; patch.status = 'approved';
          if (!p.verified_at) patch.verified_at = new Date();
        } else if (!['active', 'suspended', 'terminated'].includes(p.onboarding_stage)) {
          patch.onboarding_stage = 'agreement_pending';
        }
      }
      await p.update(patch);
    }
  }

  if (doc.related_type === 'short_stay_owner') {
    const EnvelopeSigner = require('../models/EnvelopeSigner');
    const SigningEnvelope = require('../models/SigningEnvelope');
    const ShortStayOwnerManagement = require('../models/ShortStayOwnerManagement');
    const ShortStayPropertyProfile = require('../models/ShortStayPropertyProfile');
    const signers = await EnvelopeSigner.findAll({ where: { contact_id: doc.related_id, role: 'landlord' } });
    for (const signer of signers) {
      const envelope = await SigningEnvelope.findOne({
        where: { id: signer.envelope_id, related_type: 'short_stay_management', branch_id: doc.branch_id, status: 'completed' },
      });
      if (envelope) {
        if (result.all_verified) {
          try { await require('./partyRoleActivation.service').activateShortStayManagementAfterKyc(envelope.id); } catch (e) { /* non-fatal */ }
        } else {
          const management = await ShortStayOwnerManagement.findOne({ where: { property_id: envelope.related_id, branch_id: envelope.branch_id } });
          if (management?.status === 'active') await management.update({ status: 'pending_signature' });
          const profile = await ShortStayPropertyProfile.findOne({ where: { property_id: envelope.related_id, branch_id: envelope.branch_id } });
          if (profile && ['ready', 'active'].includes(profile.status)) await profile.update({ status: 'readiness_pending', is_website_listed: false });
        }
      }
    }
  }

  if (doc.related_type === 'short_stay_booking') {
    const ShortStayBooking = require('../models/ShortStayBooking');
    const SigningEnvelope = require('../models/SigningEnvelope');
    const booking = await ShortStayBooking.findOne({ where: { id: doc.related_id, branch_id: doc.branch_id } });
    if (booking?.agreement_envelope_id) {
      const envelope = await SigningEnvelope.findOne({ where: { id: booking.agreement_envelope_id, branch_id: booking.branch_id, status: 'completed' } });
      if (envelope && result.all_verified && booking.status === 'pending_verification') await booking.update({ status: 'pending_payment' });
      if (envelope && !result.all_verified && ['pending_payment', 'confirmed', 'ready_checkin'].includes(booking.status)) await booking.update({ status: 'pending_verification' });
    }
  }
  return result;
}

module.exports = { onKycChange };
