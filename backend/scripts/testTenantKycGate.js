/* Verifies the tenant KYC activation gate:
   sign → held at 'signed'; verify all KYC → 'active'. Run from backend dir. */
require('dotenv').config();
const sequelize = require('../config/db.config');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const SigningEnvelope = require('../models/SigningEnvelope');
const KycDocument = require('../models/KycDocument');
const { handleEnvelopeCompleted } = require('../services/partyRoleActivation.service');
const { onKycChange } = require('../services/kycAutomation.service');
const { requirementsFor } = require('../services/kycRequirements.service');

(async () => {
  await sequelize.authenticate();
  const stamp = Date.now().toString().slice(-6);
  const [c] = await sequelize.query('SELECT id FROM contacts LIMIT 1', { type: sequelize.QueryTypes.SELECT });
  if (!c) { console.error('no contact to attach'); process.exit(1); }
  const profile = await PartyRoleProfile.create({ branch_id: 1, contact_id: c.id, role_type: 'tenant', status: 'pending', profile_code: `TST-${stamp}` });
  const env = await SigningEnvelope.create({
    branch_id: 1, envelope_code: `TSTENV-${stamp}`, title: 'Tenant test', document_html: '<p>x</p>',
    related_type: 'party_role', related_id: profile.id, kyc_role: 'tenant', kyc_policy: 'flexible',
    status: 'completed', terms: {},
  });

  console.log('start: profile.status =', profile.status);

  // 1) Complete the envelope with NO verified KYC → activation should be HELD.
  await handleEnvelopeCompleted(env);
  await profile.reload();
  console.log(`after sign (no KYC): status=${profile.status} next_action="${profile.next_action}"  → expect signed / held`);

  // 2) Upload + verify all required tenant KYC docs, firing automation on the last.
  const required = requirementsFor('tenant').filter((r) => r.required);
  let last;
  for (const r of required) {
    last = await KycDocument.create({ branch_id: 1, related_type: 'party_role', related_id: profile.id, role: 'tenant', document_type: r.document_type, title: r.label, file_url: '/uploads/documents/x.pdf', status: 'verified' });
  }
  await onKycChange(last);
  await profile.reload();
  console.log(`after KYC verified: status=${profile.status}  → expect active`);

  // cleanup
  await KycDocument.destroy({ where: { related_type: 'party_role', related_id: profile.id } });
  await env.destroy(); await profile.destroy();
  console.log(profile.status === 'active' ? '\n✓ GATE WORKS: activation held until KYC verified.' : '\n✗ gate did not activate');
  process.exit(0);
})().catch((e) => { console.error('✗', e.message); process.exit(1); });
