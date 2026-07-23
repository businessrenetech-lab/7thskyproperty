'use strict';

/** Buyer/vendor-attributed payments and audited withdrawal settlements. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const settlements = await queryInterface.describeTable('sale_settlements');
    if (!settlements.settlement_type) await queryInterface.addColumn('sale_settlements', 'settlement_type', { type: Sequelize.ENUM('completion', 'withdrawal'), allowNull: false, defaultValue: 'completion' });
    if (!settlements.withdrawal_buyer_party_id) await queryInterface.addColumn('sale_settlements', 'withdrawal_buyer_party_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'sale_transaction_parties', key: 'id' }, onDelete: 'SET NULL' });
    if (!settlements.withdrawal_reason) await queryInterface.addColumn('sale_settlements', 'withdrawal_reason', { type: Sequelize.TEXT, allowNull: true });
    if (!settlements.withdrawal_date) await queryInterface.addColumn('sale_settlements', 'withdrawal_date', { type: Sequelize.DATEONLY, allowNull: true });

    const payments = await queryInterface.describeTable('sale_payments');
    if (!payments.transaction_party_id) await queryInterface.addColumn('sale_payments', 'transaction_party_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'sale_transaction_parties', key: 'id' }, onDelete: 'SET NULL' });
    if (!payments.payment_kind) await queryInterface.addColumn('sale_payments', 'payment_kind', { type: Sequelize.ENUM('buyer_receipt', 'buyer_refund', 'vendor_payout', 'third_party', 'adjustment'), allowNull: false, defaultValue: 'adjustment' });
    await queryInterface.addIndex('sale_payments', ['settlement_id', 'transaction_party_id', 'payment_kind'], { name: 'idx_sale_payments_party_kind' }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('sale_payments', 'idx_sale_payments_party_kind').catch(() => {});
    for (const column of ['payment_kind', 'transaction_party_id']) await queryInterface.removeColumn('sale_payments', column).catch(() => {});
    for (const column of ['withdrawal_date', 'withdrawal_reason', 'withdrawal_buyer_party_id', 'settlement_type']) await queryInterface.removeColumn('sale_settlements', column).catch(() => {});
  },
};
