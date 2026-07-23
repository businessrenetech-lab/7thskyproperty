/**
 * kycReuse.service.js — "KYC follows the person, agreements follow the property."
 *
 * When a contact gets a new role profile, their previously VERIFIED documents
 * are reused instead of being requested again:
 *   identity-scope docs  → reused from any of the contact's role profiles.
 *   role-scope docs      → reused only from profiles of the SAME role.
 *   property-scope docs  → never reused (deeds/ownership are per property).
 * Expired documents are never reused. Each copy records its provenance
 * (reused_from_document_id + reviewer note) so the audit trail shows exactly
 * which verification it inherits. The agreement step is untouched: a fully
 * reused profile lands on 'agreement_pending', because every property still
 * needs its own signed agreement.
 */
const { Op } = require('sequelize');
const KycDocument = require('../models/KycDocument');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const { requirementsFor, evaluate, docScope } = require('./kycRequirements.service');

async function applyKycReuse(profileOrId, { transaction, actorId } = {}) {
  const profile = profileOrId && typeof profileOrId === 'object'
    ? profileOrId
    : await PartyRoleProfile.findByPk(profileOrId, { transaction });
  if (!profile) return { reused: 0, reason: 'profile_not_found' };
  const requirements = requirementsFor(profile.role_type);
  if (!requirements.length) return { reused: 0, reason: 'role_has_no_kyc' };

  const siblings = await PartyRoleProfile.findAll({
    where: { contact_id: profile.contact_id, branch_id: profile.branch_id, id: { [Op.ne]: profile.id } },
    attributes: ['id', 'role_type'],
    transaction,
    raw: true,
  });
  if (!siblings.length) return { reused: 0, reason: 'no_prior_profiles' };
  const roleOfProfile = new Map(siblings.map((row) => [Number(row.id), row.role_type]));

  const [existing, verified] = await Promise.all([
    KycDocument.findAll({ where: { related_type: 'party_role', related_id: profile.id }, attributes: ['document_type'], transaction, raw: true }),
    KycDocument.findAll({
      where: { related_type: 'party_role', related_id: { [Op.in]: siblings.map((row) => row.id) }, status: 'verified' },
      order: [['verified_at', 'DESC'], ['id', 'DESC']],
      transaction,
      raw: true,
    }),
  ]);
  const alreadyHas = new Set(existing.map((doc) => doc.document_type));

  let reused = 0;
  const reusedTypes = [];
  for (const requirement of requirements) {
    if (alreadyHas.has(requirement.document_type)) continue;
    const scope = docScope(requirement.document_type);
    if (scope === 'property') continue;
    const source = verified.find((doc) => doc.document_type === requirement.document_type
      && (scope === 'identity' || roleOfProfile.get(Number(doc.related_id)) === profile.role_type)
      && (!doc.expiry_date || new Date(doc.expiry_date) > new Date()));
    if (!source) continue;
    await KycDocument.create({
      branch_id: profile.branch_id,
      related_type: 'party_role',
      related_id: profile.id,
      party_role_profile_id: profile.id,
      role: profile.role_type,
      document_type: source.document_type,
      title: source.title,
      file_url: source.file_url,
      file_url_back: source.file_url_back,
      reference_no: source.reference_no,
      issue_date: source.issue_date,
      expiry_date: source.expiry_date,
      status: 'verified',
      is_required: requirement.required !== false,
      uploaded_by: actorId || source.uploaded_by,
      uploaded_by_role: 'system',
      verified_by: source.verified_by,
      verified_at: source.verified_at || new Date(),
      reviewer_notes: `Reused from verified KYC document #${source.id} (${scope} scope)`,
      reused_from_document_id: source.id,
    }, { transaction });
    reused += 1;
    reusedTypes.push(source.document_type);
  }

  if (reused) {
    const docs = await KycDocument.findAll({ where: { related_type: 'party_role', related_id: profile.id }, transaction, raw: true });
    const result = evaluate(profile.role_type, docs);
    const fullyVerified = result.all_verified;
    await profile.update({
      documents_status: result.all_submitted ? 'complete' : 'pending',
      kyc_status: fullyVerified ? 'complete' : 'pending',
      status: fullyVerified && ['draft', 'kyc_pending', 'documents_pending'].includes(profile.status) ? 'agreement_pending' : profile.status,
      next_action: fullyVerified
        ? 'KYC reused from previous verification — send the agreement for this property'
        : `Submit the remaining ${profile.role_type} documents (previously verified KYC was reused)`,
    }, { transaction });
  }
  return { reused, reused_types: reusedTypes };
}

module.exports = { applyKycReuse };
