'use strict';
/** Landlord onboarding parity: profile source tracking + document verification. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const prp = await queryInterface.describeTable('party_role_profiles');
    if (!prp.source) {
      await queryInterface.addColumn('party_role_profiles', 'source', { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'staff' });
    }

    const pd = await queryInterface.describeTable('property_documents');
    if (!pd.verification_status) {
      await queryInterface.addColumn('property_documents', 'verification_status', { type: Sequelize.ENUM('pending', 'verified', 'rejected'), allowNull: false, defaultValue: 'pending' });
    }
    if (!pd.verified_by) await queryInterface.addColumn('property_documents', 'verified_by', { type: Sequelize.INTEGER, allowNull: true });
    if (!pd.verified_at) await queryInterface.addColumn('property_documents', 'verified_at', { type: Sequelize.DATE, allowNull: true });
    if (!pd.rejection_reason) await queryInterface.addColumn('property_documents', 'rejection_reason', { type: Sequelize.TEXT, allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('party_role_profiles', 'source').catch(() => {});
    for (const col of ['verification_status', 'verified_by', 'verified_at', 'rejection_reason']) {
      await queryInterface.removeColumn('property_documents', col).catch(() => {});
    }
  },
};
