'use strict';

/**
 * 0019 — Owner Statements.
 *
 * Monthly (or per-owner-frequency) statement of what an owner earned, what
 * we deducted, and what was paid out for a single property (or portfolio-wide
 * when property_id IS NULL). Computed from folio_transactions, invoices,
 * payments and landlord bills for the period.
 *
 * status: draft → ready → sent → paid → closed
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, ENUM, TEXT, JSON: JSONT, DATEONLY, DATE } = Sequelize;
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const has = async (name) => { try { await queryInterface.describeTable(name); return true; } catch { return false; } };
    if (await has('owner_statements')) return;

    await queryInterface.createTable('owner_statements', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: INTEGER, allowNull: false },
      statement_code: { type: STRING(40), unique: true },
      owner_contact_id: { type: INTEGER, allowNull: false, references: { model: 'contacts', key: 'id' }, onDelete: 'CASCADE' },
      // Nullable when the statement covers an owner's whole portfolio.
      property_id: { type: INTEGER, references: { model: 'properties', key: 'id' }, onDelete: 'SET NULL' },
      folio_id: { type: INTEGER, references: { model: 'folios', key: 'id' }, onDelete: 'SET NULL' },

      // Period
      period_label: { type: STRING(20), allowNull: false },
      period_start: { type: DATEONLY, allowNull: false },
      period_end: { type: DATEONLY, allowNull: false },

      // Rollups
      opening_balance: { type: DECIMAL(15, 2), defaultValue: 0 },
      rent_collected: { type: DECIMAL(15, 2), defaultValue: 0 },
      service_charge_collected: { type: DECIMAL(15, 2), defaultValue: 0 },
      arrears_recovered: { type: DECIMAL(15, 2), defaultValue: 0 },
      other_credits: { type: DECIMAL(15, 2), defaultValue: 0 },
      total_credits: { type: DECIMAL(15, 2), defaultValue: 0 },

      management_fee: { type: DECIMAL(15, 2), defaultValue: 0 },
      maintenance_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      utility_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      landlord_bills_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      other_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },
      total_deductions: { type: DECIMAL(15, 2), defaultValue: 0 },

      net_disbursement: { type: DECIMAL(15, 2), defaultValue: 0 },
      disbursement_date: { type: DATEONLY },
      disbursement_reference: { type: STRING },
      disbursement_method: { type: STRING(40) },
      closing_balance: { type: DECIMAL(15, 2), defaultValue: 0 },

      // Detailed rows for the statement PDF (transactions, categories, notes)
      line_items: { type: JSONT, defaultValue: [] },

      // Lifecycle
      status: { type: ENUM('draft', 'ready', 'sent', 'paid', 'closed'), defaultValue: 'draft' },
      sent_at: { type: DATE },
      sent_channel: { type: STRING(20) },
      sent_evidence_url: { type: STRING },

      generated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      generated_by: { type: INTEGER },
      notes: { type: TEXT },
      ...stamps,
    });

    await queryInterface.addIndex('owner_statements', ['owner_contact_id', 'period_label'], { name: 'idx_owner_period' });
    await queryInterface.addIndex('owner_statements', ['property_id', 'period_label'], { name: 'idx_property_period' });
    await queryInterface.addIndex('owner_statements', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('owner_statements').catch(() => {});
  },
};
