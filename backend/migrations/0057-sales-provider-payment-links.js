'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const add = async (table, column, definition) => {
      const description = await queryInterface.describeTable(table);
      if (!description[column]) await queryInterface.addColumn(table, column, definition);
    };
    await add('sale_payments', 'funding_request_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'sale_funding_requests', key: 'id' }, onDelete: 'SET NULL' });
    await add('sale_disbursements', 'source_payment_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'sale_payments', key: 'id' }, onDelete: 'SET NULL' });
    const paymentIndexes = await queryInterface.showIndex('sale_payments');
    if (!paymentIndexes.some((index) => index.name === 'idx_sale_payments_funding_request')) await queryInterface.addIndex('sale_payments', ['funding_request_id'], { name: 'idx_sale_payments_funding_request' });
    const payoutIndexes = await queryInterface.showIndex('sale_disbursements');
    if (!payoutIndexes.some((index) => index.name === 'idx_sale_disbursements_source_payment')) await queryInterface.addIndex('sale_disbursements', ['source_payment_id'], { name: 'idx_sale_disbursements_source_payment' });
  },
  async down() {},
};
