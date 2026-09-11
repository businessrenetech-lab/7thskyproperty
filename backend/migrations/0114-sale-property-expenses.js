'use strict';
// Lightweight per-property sales expenses (marketing / advertising / other) — the
// company Expense ledger has no property_id, so sales keeps its own per-property store.
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('sale_property_expenses').catch(() => null)) return;
    await q.createTable('sale_property_expenses', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false },
      property_id: { type: S.INTEGER, allowNull: false },
      category: { type: S.ENUM('marketing', 'advertising', 'staging', 'photography', 'other'), defaultValue: 'other' },
      amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      spent_on: { type: S.DATEONLY, allowNull: true },
      description: { type: S.STRING, allowNull: true },
      created_by: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('sale_property_expenses', ['branch_id', 'property_id']);
  },
  down: async (q) => { await q.dropTable('sale_property_expenses').catch(() => {}); },
};
