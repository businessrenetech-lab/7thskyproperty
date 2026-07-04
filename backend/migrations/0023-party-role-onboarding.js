'use strict';

/**
 * 0023 — Party role onboarding.
 *
 * Contacts stay as identity records until KYC, documents, agreements and signing
 * activate a specific business role: landlord, tenant, vendor, buyer, supplier,
 * or third party.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, ENUM, TEXT, DATE } = Sequelize;
    const qi = queryInterface;
    const now = Sequelize.literal('CURRENT_TIMESTAMP');
    const onUpdate = Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    const tableExists = async (name) => {
      try { await qi.describeTable(name); return true; } catch { return false; }
    };
    const addCol = async (table, col, spec) => {
      const desc = await qi.describeTable(table).catch(() => ({}));
      if (!desc[col]) await qi.addColumn(table, col, spec);
    };

    if (!(await tableExists('party_role_profiles'))) {
      await qi.createTable('party_role_profiles', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER, allowNull: false },
        profile_code: { type: STRING(40), unique: true },
        contact_id: { type: INTEGER, allowNull: false, references: { model: 'contacts', key: 'id' }, onDelete: 'CASCADE' },
        role_type: { type: ENUM('landlord', 'tenant', 'vendor', 'buyer', 'supplier', 'third_party'), allowNull: false },
        status: { type: ENUM('draft', 'kyc_pending', 'documents_pending', 'agreement_pending', 'signing_sent', 'partially_signed', 'signed', 'approval_pending', 'active', 'rejected', 'declined', 'expired', 'voided'), defaultValue: 'draft' },
        property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'SET NULL' },
        application_id: { type: INTEGER },
        tenancy_id: { type: INTEGER, references: { model: 'tenancies', key: 'id' }, onDelete: 'SET NULL' },
        agreement_id: { type: INTEGER, references: { model: 'agreements', key: 'id' }, onDelete: 'SET NULL' },
        envelope_id: { type: INTEGER, references: { model: 'signing_envelopes', key: 'id' }, onDelete: 'SET NULL' },
        kyc_status: { type: ENUM('not_started', 'pending', 'complete'), defaultValue: 'not_started' },
        documents_status: { type: ENUM('not_started', 'pending', 'complete'), defaultValue: 'not_started' },
        approval_status: { type: ENUM('not_required', 'pending', 'approved', 'rejected'), defaultValue: 'not_required' },
        next_action: { type: STRING },
        notes: { type: TEXT },
        activated_at: { type: DATE },
        approved_by: { type: INTEGER },
        approved_at: { type: DATE },
        created_by: { type: INTEGER },
        created_at: { type: DATE, defaultValue: now },
        updated_at: { type: DATE, defaultValue: onUpdate },
      });
      await qi.addIndex('party_role_profiles', ['contact_id', 'role_type'], { name: 'idx_party_role_contact_type' }).catch(() => {});
      await qi.addIndex('party_role_profiles', ['status'], { name: 'idx_party_role_status' }).catch(() => {});
      await qi.addIndex('party_role_profiles', ['property_id'], { name: 'idx_party_role_property' }).catch(() => {});
      await qi.addIndex('party_role_profiles', ['tenancy_id'], { name: 'idx_party_role_tenancy' }).catch(() => {});
    }

    await addCol('signing_envelopes', 'agreement_id', { type: INTEGER, references: { model: 'agreements', key: 'id' }, onDelete: 'SET NULL' });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('signing_envelopes', 'agreement_id').catch(() => {});
    await queryInterface.dropTable('party_role_profiles').catch(() => {});
  },
};
