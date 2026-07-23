'use strict';
/** Bank reconciliation evidence on sale payments.
 *  A receipt is reconciled against an uploaded bank statement: who matched it,
 *  when, the statement file, and a note. Shown on the settlement statement for
 *  audit transparency. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const payments = await queryInterface.describeTable('sale_payments');
    const add = async (col, spec) => { if (!payments[col]) await queryInterface.addColumn('sale_payments', col, spec); };
    await add('reconciled_by', { type: Sequelize.INTEGER, allowNull: true });
    await add('reconciled_at', { type: Sequelize.DATE, allowNull: true });
    await add('reconciliation_note', { type: Sequelize.TEXT, allowNull: true });
    await add('statement_url', { type: Sequelize.STRING, allowNull: true });
  },

  async down(queryInterface) {
    for (const column of ['statement_url', 'reconciliation_note', 'reconciled_at', 'reconciled_by']) {
      await queryInterface.removeColumn('sale_payments', column).catch(() => {});
    }
  },
};
