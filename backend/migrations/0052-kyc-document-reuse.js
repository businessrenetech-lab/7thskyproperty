'use strict';
/** KYC reuse provenance: a reused document records which verified document it
 *  was copied from, so the audit trail shows the original verification. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('kyc_documents');
    if (!table.reused_from_document_id) {
      await queryInterface.addColumn('kyc_documents', 'reused_from_document_id', { type: Sequelize.INTEGER, allowNull: true });
    }
    await queryInterface.addIndex('kyc_documents', ['related_type', 'related_id', 'status'], { name: 'idx_kyc_docs_related_status' }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('kyc_documents', 'idx_kyc_docs_related_status').catch(() => {});
    await queryInterface.removeColumn('kyc_documents', 'reused_from_document_id').catch(() => {});
  },
};
