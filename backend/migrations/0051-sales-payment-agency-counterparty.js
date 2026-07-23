'use strict';
/** Payment kinds and counterparties.
 *  - 'agency_fee': money transferred to the agency for its commission +
 *    marketing fees (pairs with disbursement payee_type 'agency').
 *  - counterparty_name / counterparty_phone: who a third-party payment
 *    actually went to — shown on the trust statement for audit. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const payments = await queryInterface.describeTable('sale_payments');
    const kindType = String(payments.payment_kind?.type || '');
    if (kindType.toLowerCase().includes('enum') && !kindType.includes('agency_fee')) {
      const members = [...kindType.matchAll(/'([^']+)'/g)].map((match) => match[1]);
      if (!members.includes('agency_fee')) members.push('agency_fee');
      const list = members.map((member) => `'${member}'`).join(',');
      const nullable = payments.payment_kind.allowNull ? 'NULL' : 'NOT NULL';
      await queryInterface.sequelize.query(`ALTER TABLE sale_payments MODIFY COLUMN payment_kind ENUM(${list}) ${nullable}`);
    }
    if (!payments.counterparty_name) await queryInterface.addColumn('sale_payments', 'counterparty_name', { type: Sequelize.STRING, allowNull: true });
    if (!payments.counterparty_phone) await queryInterface.addColumn('sale_payments', 'counterparty_phone', { type: Sequelize.STRING(40), allowNull: true });
  },

  async down(queryInterface) {
    for (const column of ['counterparty_phone', 'counterparty_name']) {
      await queryInterface.removeColumn('sale_payments', column).catch(() => {});
    }
  },
};
