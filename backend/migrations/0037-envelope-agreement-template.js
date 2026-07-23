'use strict';
/** Link a signing envelope to the agreement_template it was generated from,
 *  so the intake flow can re-merge signer-provided field values. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('signing_envelopes');
    if (!table.agreement_template_id) {
      await queryInterface.addColumn('signing_envelopes', 'agreement_template_id', {
        type: Sequelize.INTEGER, allowNull: true,
      });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('signing_envelopes', 'agreement_template_id');
  },
};
