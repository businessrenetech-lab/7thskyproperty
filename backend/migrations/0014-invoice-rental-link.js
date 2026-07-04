'use strict';

/**
 * 0014 — Link invoices to tenancies + rental ledger so "Raise invoice" from a
 * rental can auto-populate the ledger and keep arrears in sync on payment.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER } = Sequelize;
    await queryInterface.addColumn('invoices', 'tenancy_id', {
      type: INTEGER, allowNull: true, references: { model: 'tenancies', key: 'id' }, onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('invoices', 'rental_ledger_id', {
      type: INTEGER, allowNull: true, references: { model: 'rental_ledger', key: 'id' }, onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('rental_ledger', 'invoice_id', {
      type: INTEGER, allowNull: true, references: { model: 'invoices', key: 'id' }, onDelete: 'SET NULL',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('rental_ledger', 'invoice_id');
    await queryInterface.removeColumn('invoices', 'rental_ledger_id');
    await queryInterface.removeColumn('invoices', 'tenancy_id');
  },
};
