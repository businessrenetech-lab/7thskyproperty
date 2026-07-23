/**
 * KYC reuse end-to-end: a contact verified once must not be asked again —
 * identity docs reuse across roles, role docs reuse across properties for the
 * same role, property docs never reuse, agreements always per property.
 * Creates throwaway rows, asserts, then deletes them.
 */
const assert = require('assert');
const sequelize = require('../config/db.config');
const Contact = require('../models/Contact');
const PartyRoleProfile = require('../models/PartyRoleProfile');
const KycDocument = require('../models/KycDocument');
const { applyKycReuse } = require('../services/kycReuse.service');
const { docScope } = require('../services/kycRequirements.service');

(async () => {
  const stamp = Date.now();
  const cleanup = { profiles: [], docs: [], contact: null };
  try {
    assert.strictEqual(docScope('nid_passport'), 'identity');
    assert.strictEqual(docScope('proof_of_funds'), 'role');
    assert.strictEqual(docScope('ownership_deed'), 'property');

    const contact = await Contact.create({ branch_id: 1, contact_type: 'individual', first_name: 'Reuse', last_name: `Test${stamp}`, full_name: `Reuse Test${stamp}`, primary_phone: `01${String(stamp).slice(-9)}` });
    cleanup.contact = contact;

    // Profile A: buyer on property 1, fully verified KYC.
    const profileA = await PartyRoleProfile.create({ branch_id: 1, contact_id: contact.id, role_type: 'buyer', property_id: 1, profile_code: `TSTA-${stamp}`, status: 'active', kyc_status: 'complete', documents_status: 'complete' });
    cleanup.profiles.push(profileA);
    for (const type of ['nid_passport', 'proof_of_funds', 'bank_details', 'address_proof', 'source_of_funds']) {
      cleanup.docs.push(await KycDocument.create({ branch_id: 1, related_type: 'party_role', related_id: profileA.id, party_role_profile_id: profileA.id, role: 'buyer', document_type: type, title: type, file_url: `/uploads/test-${type}.pdf`, status: 'verified', verified_at: new Date() }));
    }

    // Case 1: same contact buys ANOTHER property → full KYC reuse, agreement pending.
    const profileB = await PartyRoleProfile.create({ branch_id: 1, contact_id: contact.id, role_type: 'buyer', property_id: 2, profile_code: `TSTB-${stamp}`, status: 'kyc_pending', kyc_status: 'pending', documents_status: 'pending' });
    cleanup.profiles.push(profileB);
    const resultB = await applyKycReuse(profileB);
    assert.strictEqual(resultB.reused, 5, `buyer→buyer should reuse all 5 docs, got ${resultB.reused}`);
    await profileB.reload();
    assert.strictEqual(profileB.kyc_status, 'complete');
    assert.strictEqual(profileB.status, 'agreement_pending', 'repeat buyer must land on agreement signing, not KYC');

    // Case 2: same contact becomes a VENDOR → identity docs reuse, vendor-role
    // and property docs (deed, mutation) must still be requested.
    const profileC = await PartyRoleProfile.create({ branch_id: 1, contact_id: contact.id, role_type: 'vendor', property_id: 3, profile_code: `TSTC-${stamp}`, status: 'kyc_pending', kyc_status: 'pending', documents_status: 'pending' });
    cleanup.profiles.push(profileC);
    const resultC = await applyKycReuse(profileC);
    // vendor requirements: nid_passport (identity → reused). bank_details is
    // role-scope: buyer's bank details must NOT satisfy the vendor role.
    assert.strictEqual(resultC.reused, 1, `buyer→vendor should reuse only identity docs, got ${resultC.reused} (${(resultC.reused_types || []).join(',')})`);
    assert.deepStrictEqual(resultC.reused_types, ['nid_passport']);
    await profileC.reload();
    assert.strictEqual(profileC.kyc_status, 'pending', 'vendor role still needs vendor-specific + property docs');

    // Case 3: reused docs carry provenance.
    const copied = await KycDocument.findAll({ where: { related_type: 'party_role', related_id: profileB.id }, raw: true });
    cleanup.docs.push(...copied.map((d) => ({ id: d.id })));
    assert.ok(copied.every((d) => d.reused_from_document_id), 'every reused doc must record its source document');
    const copiedC = await KycDocument.findAll({ where: { related_type: 'party_role', related_id: profileC.id }, raw: true });
    cleanup.docs.push(...copiedC.map((d) => ({ id: d.id })));

    // Case 4: idempotent — running reuse again copies nothing new.
    const again = await applyKycReuse(profileB);
    assert.strictEqual(again.reused, 0, 'reuse must be idempotent');

    console.log('kyc reuse: PASS');
  } finally {
    for (const doc of cleanup.docs) await KycDocument.destroy({ where: { id: doc.id } }).catch(() => {});
    for (const profile of cleanup.profiles) {
      await KycDocument.destroy({ where: { related_type: 'party_role', related_id: profile.id } }).catch(() => {});
      await profile.destroy().catch(() => {});
    }
    if (cleanup.contact) await cleanup.contact.destroy().catch(() => {});
    await sequelize.close().catch(() => {});
  }
})().catch((error) => { console.error('kyc reuse: FAIL', error.message); process.exit(1); });
