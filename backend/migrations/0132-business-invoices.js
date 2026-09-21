'use strict';

/**
 * Migration 0132: Business Sale module — Phase 4 (financials).
 *   - business_invoices : service-fee + commission invoices for a business sale
 *     (SOP Step 8 fees + Step 24 commission), isolated to the business module.
 *     Line items and payments are JSON; paid_amount + status are derived.
 * Idempotent: guarded by table existence.
 */
module.exports = {
  up: async (queryInterface, S) => {
    const existing = (await queryInterface.showAllTables()).map((t) => (typeof t === 'string' ? t : t.tableName).toLowerCase());
    if (!existing.includes('business_invoices')) {
      await queryInterface.createTable('business_invoices', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false },
        invoice_code: { type: S.STRING(40), unique: true },
        business_listing_id: { type: S.INTEGER, allowNull: false },
        settlement_id: S.INTEGER,
        client_contact_id: S.INTEGER,
        client_name: S.STRING,
        invoice_type: { type: S.STRING(20), defaultValue: 'service_fee' }, // service_fee / commission / mixed
        line_items: { type: S.JSON, defaultValue: null }, // [{ code, description, qty, unit_price, amount }]
        subtotal: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        discount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        vat_percent: { type: S.DECIMAL(6, 3), defaultValue: 0 },
        vat_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        total_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        paid_amount: { type: S.DECIMAL(16, 2), defaultValue: 0 },
        payments: { type: S.JSON, defaultValue: null }, // [{ amount, date, method, ref }]
        status: { type: S.STRING(20), defaultValue: 'draft' }, // draft / sent / partial / paid / overdue / void
        issue_date: S.DATEONLY,
        due_date: S.DATEONLY,
        notes: S.TEXT,
        created_by: S.INTEGER,
        created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('business_invoices', ['business_listing_id']);
      await queryInterface.addIndex('business_invoices', ['branch_id']);
      await queryInterface.addIndex('business_invoices', ['status']);
    }
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('business_invoices').catch(() => {});
  },
};
