'use strict';

/**
 * Migration 0139: Business Registration — invoices (SOP Phase 3 quotation +
 * Phase 9 final invoice/payment). Deposit / progress / final / provider invoices
 * against a registration project, with line items + payments (JSON), derived
 * totals and a payment-driven status.
 * Idempotent: skips creation when the table already exists.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const S = Sequelize;
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (!existing.includes('business_registration_invoices')) {
      await queryInterface.createTable('business_registration_invoices', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        invoice_code: { type: S.STRING(40), unique: true }, // SSPC-BRI-000001
        project_id: { type: S.INTEGER, allowNull: false },
        client_contact_id: S.INTEGER,
        client_name: S.STRING,
        invoice_type: { type: S.STRING(20), defaultValue: 'deposit' }, // deposit / progress / final / provider
        line_items: { type: S.JSON, allowNull: true }, // [{ description, qty, unit_price, amount }]
        subtotal: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        discount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        vat_percent: { type: S.DECIMAL(6, 2), defaultValue: 0 },
        vat_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        total_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        paid_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        payments: { type: S.JSON, allowNull: true }, // [{ amount, date, method, ref }]
        status: { type: S.STRING(20), defaultValue: 'draft' }, // draft / sent / partial / paid / void
        issue_date: S.DATEONLY,
        due_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_registration_invoices', ['branch_id']);
      await queryInterface.addIndex('business_registration_invoices', ['project_id']);
      await queryInterface.addIndex('business_registration_invoices', ['status']);
    }
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('business_registration_invoices').catch(() => {});
  },
};
