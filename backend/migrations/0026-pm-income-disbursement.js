'use strict';

/**
 * 0026 — Property-management income ledger + owner disbursements + folio memos.
 *
 *  1. pm_income_entries   — every fee Seventh Sky EARNS (management fee, letting,
 *     renewal, maintenance admin, statement fee…). Posted the moment rent is
 *     received. This is "our income" for the property-management business, kept
 *     separate from the legacy education-app journal so it stays clean + reportable.
 *
 *  2. owner_disbursements — each payout to an owner: gross collected − fees −
 *     approved expenses = net paid. Records the folio balance before/after so the
 *     owner dashboard always reconciles.
 *
 *  3. folio_transactions.is_memo / memo_amount — for "tenant paid a supplier
 *     personally": recorded on the tenant folio + reports for visibility, but
 *     never moves the balance (not tenant outstanding, not owner balance).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DECIMAL, ENUM, TEXT, DATE, DATEONLY, BOOLEAN, JSON: JSONT } = Sequelize;
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const qi = queryInterface;
    const hasTable = async (n) => { try { await qi.describeTable(n); return true; } catch { return false; } };
    const addCol = async (t, c, spec) => { const d = await qi.describeTable(t).catch(() => ({})); if (!d[c]) await qi.addColumn(t, c, spec); };

    if (!(await hasTable('pm_income_entries'))) {
      await qi.createTable('pm_income_entries', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER, allowNull: false },
        entry_code: { type: STRING(40), unique: true },
        category: { type: ENUM('management_fee', 'letting_fee', 'renewal_fee', 'maintenance_admin', 'statement_fee', 'advertising_fee', 'other'), defaultValue: 'management_fee' },
        source_type: { type: ENUM('rent_receipt', 'invoice', 'disbursement', 'manual'), defaultValue: 'rent_receipt' },
        source_id: { type: INTEGER },
        property_id: { type: INTEGER },
        owner_contact_id: { type: INTEGER },
        tenancy_id: { type: INTEGER },
        period_label: { type: STRING(20) },
        fee_name: { type: STRING },
        amount: { type: DECIMAL(15, 2), defaultValue: 0 },
        account_category_id: { type: INTEGER },
        landlord_folio_txn_id: { type: INTEGER },
        notes: { type: TEXT },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('pm_income_entries', ['period_label'], { name: 'idx_pm_income_period' });
      await qi.addIndex('pm_income_entries', ['property_id'], { name: 'idx_pm_income_property' });
      await qi.addIndex('pm_income_entries', ['category'], { name: 'idx_pm_income_category' });
    }

    if (!(await hasTable('owner_disbursements'))) {
      await qi.createTable('owner_disbursements', {
        id: { type: INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: INTEGER, allowNull: false },
        disbursement_code: { type: STRING(40), unique: true },
        owner_contact_id: { type: INTEGER, allowNull: false },
        landlord_folio_id: { type: INTEGER },
        property_id: { type: INTEGER },
        period_label: { type: STRING(20) },
        gross_collected: { type: DECIMAL(15, 2), defaultValue: 0 },
        fees_deducted: { type: DECIMAL(15, 2), defaultValue: 0 },
        expenses_deducted: { type: DECIMAL(15, 2), defaultValue: 0 },
        net_amount: { type: DECIMAL(15, 2), defaultValue: 0 },
        balance_before: { type: DECIMAL(15, 2), defaultValue: 0 },
        balance_after: { type: DECIMAL(15, 2), defaultValue: 0 },
        method: { type: STRING(40), defaultValue: 'bank_transfer' },
        reference: { type: STRING },
        bank_snapshot: { type: JSONT, defaultValue: null },
        status: { type: ENUM('draft', 'paid', 'void'), defaultValue: 'paid' },
        paid_at: { type: DATE },
        notes: { type: TEXT },
        folio_txn_id: { type: INTEGER },
        statement_id: { type: INTEGER },
        created_by: { type: INTEGER },
        ...stamps,
      });
      await qi.addIndex('owner_disbursements', ['owner_contact_id'], { name: 'idx_owner_disb_owner' });
      await qi.addIndex('owner_disbursements', ['period_label'], { name: 'idx_owner_disb_period' });
    }

    // Memo transactions on the tenant folio (tenant paid a supplier directly).
    await addCol('folio_transactions', 'is_memo', { type: BOOLEAN, defaultValue: false });
    await addCol('folio_transactions', 'memo_amount', { type: DECIMAL(15, 2), defaultValue: 0 });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pm_income_entries').catch(() => {});
    await queryInterface.dropTable('owner_disbursements').catch(() => {});
    await queryInterface.removeColumn('folio_transactions', 'is_memo').catch(() => {});
    await queryInterface.removeColumn('folio_transactions', 'memo_amount').catch(() => {});
  },
};
