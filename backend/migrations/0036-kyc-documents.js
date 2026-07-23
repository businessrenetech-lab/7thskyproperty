'use strict';

/**
 * 0036 — unified KYC documents (Smart Agreement + KYC system).
 * One polymorphic table for every role's KYC/verification documents, with the
 * rich lifecycle (submitted → verified / rejected / needs_resubmission / expired).
 * Plus final PDF + certificate URLs and KYC policy on the signing envelope.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, ENUM } = Sequelize;
    const qi = queryInterface;
    const has = async (t) => { try { await qi.describeTable(t); return true; } catch { return false; } };
    const addCol = async (t, c, spec) => { const d = await qi.describeTable(t).catch(() => ({})); if (!d[c]) await qi.addColumn(t, c, spec); };

    if (!(await has('kyc_documents'))) {
      await qi.createTable('kyc_documents', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER },
        // polymorphic owner: party_role | service_provider | tenant_application | contact | agreement | property
        related_type: { type: STRING(60), allowNull: false },
        related_id: { type: INTEGER, allowNull: false },
        party_role_profile_id: { type: INTEGER },
        agreement_id: { type: INTEGER },   // signing_envelope id
        role: { type: STRING(40) },        // tenant / landlord / buyer / vendor / provider / witness
        document_type: { type: STRING(60), allowNull: false },
        title: { type: STRING },
        file_url: { type: STRING },        // front / main
        file_url_back: { type: STRING },   // back (front/back docs)
        reference_no: { type: STRING },
        issue_date: { type: DATEONLY },
        expiry_date: { type: DATEONLY },
        status: { type: ENUM('missing', 'submitted', 'verified', 'rejected', 'needs_resubmission', 'expired'), defaultValue: 'submitted' },
        is_required: { type: BOOLEAN, defaultValue: true },
        uploaded_by: { type: INTEGER },
        uploaded_by_role: { type: STRING(20), defaultValue: 'admin' }, // admin | signer
        verified_by: { type: INTEGER },
        verified_at: { type: DATE },
        rejection_reason: { type: TEXT },
        reviewer_notes: { type: TEXT },
        created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      });
      await qi.addIndex('kyc_documents', ['related_type', 'related_id'], { name: 'idx_kyc_owner' });
      await qi.addIndex('kyc_documents', ['status'], { name: 'idx_kyc_status' });
      await qi.addIndex('kyc_documents', ['role'], { name: 'idx_kyc_role' });
    }

    // Agreement instance (= signing envelope) extensions.
    await addCol('signing_envelopes', 'final_pdf_url', { type: STRING });
    await addCol('signing_envelopes', 'certificate_url', { type: STRING });
    await addCol('signing_envelopes', 'kyc_role', { type: STRING(40) });
    await addCol('signing_envelopes', 'kyc_policy', { type: ENUM('strict', 'flexible', 'none'), defaultValue: 'flexible' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kyc_documents').catch(() => {});
  },
};
