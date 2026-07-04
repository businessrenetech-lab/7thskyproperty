'use strict';

/**
 * 0017 — Simplified property-management billing rework.
 * Adds landlord bills, monthly rental receipts, upload links, and explicit
 * simplified invoice metadata while keeping existing invoice tables intact.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, ENUM, DECIMAL, DATE, DATEONLY } = Sequelize;
    const ts = {
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    };
    const nf = (table) => ({ type: INTEGER, allowNull: true, references: { model: table, key: 'id' }, onDelete: 'SET NULL' });
    const money = (def = 0) => ({ type: DECIMAL(15, 2), defaultValue: def });

    await queryInterface.addColumn('invoices', 'invoice_type', { type: STRING(40), allowNull: true });
    await queryInterface.addColumn('invoices', 'uploaded_invoice_url', { type: STRING, allowNull: true });
    await queryInterface.addColumn('invoices', 'source_bill_id', { type: INTEGER, allowNull: true });
    await queryInterface.addColumn('invoices', 'source_receipt_id', { type: INTEGER, allowNull: true });

    await queryInterface.createTable('landlord_bills', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      bill_code: { type: STRING(40), unique: true },
      landlord_contact_id: nf('contacts'),
      landlord_folio_id: nf('folios'),
      property_id: nf('properties'),
      bill_account_id: nf('account_categories'),
      provider_id: nf('service_providers'),
      description: { type: TEXT },
      full_bill_amount: money(0),
      tenant_pays_part: { type: BOOLEAN, defaultValue: false },
      tenant_contact_id: nf('contacts'),
      tenant_tenancy_id: nf('tenancies'),
      tenant_amount: money(0),
      tenant_invoice_id: nf('invoices'),
      tenant_invoice_account_id: nf('account_categories'),
      tenant_invoice_description: { type: TEXT },
      due_date: { type: DATEONLY },
      uploaded_bill_url: { type: STRING },
      status: { type: ENUM('draft', 'approved', 'pending', 'paid', 'cancelled'), defaultValue: 'pending' },
      created_by: nf('users'),
      ...ts,
    });

    await queryInterface.createTable('rental_receipts', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false, references: { model: 'branches', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      receipt_code: { type: STRING(40), unique: true },
      period_label: { type: STRING(20), allowNull: false },
      tenancy_id: nf('tenancies'),
      tenant_contact_id: nf('contacts'),
      landlord_contact_id: nf('contacts'),
      property_id: nf('properties'),
      tenant_folio_id: nf('folios'),
      landlord_folio_id: nf('folios'),
      invoice_id: nf('invoices'),
      rent_amount: money(0),
      service_charge: money(0),
      total_amount: money(0),
      amount_paid: money(0),
      balance: money(0),
      due_date: { type: DATEONLY },
      status: { type: ENUM('generated', 'sent', 'paid', 'partial', 'overdue', 'cancelled'), defaultValue: 'generated' },
      created_by: nf('users'),
      ...ts,
    });

    await queryInterface.addIndex('landlord_bills', ['branch_id', 'status']);
    await queryInterface.addIndex('landlord_bills', ['landlord_folio_id']);
    await queryInterface.addIndex('rental_receipts', ['branch_id', 'period_label']);
    await queryInterface.addIndex('rental_receipts', ['tenancy_id', 'period_label'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rental_receipts');
    await queryInterface.dropTable('landlord_bills');
    await queryInterface.removeColumn('invoices', 'source_receipt_id');
    await queryInterface.removeColumn('invoices', 'source_bill_id');
    await queryInterface.removeColumn('invoices', 'uploaded_invoice_url');
    await queryInterface.removeColumn('invoices', 'invoice_type');
  },
};
