'use strict';
// Supplier register for project costing / accounts payable. Scoped by service_line
// like the other shared operations tables. Running balance is derived (bills − payments).
module.exports = {
  up: async (q, S) => {
    const exists = await q.describeTable('wt_suppliers').catch(() => null);
    if (exists) return;
    await q.createTable('wt_suppliers', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'water_tank' },
      code: { type: S.STRING(30), allowNull: false, unique: true },
      name: { type: S.STRING(200), allowNull: false },
      category: { type: S.STRING(80), allowNull: true },
      contact_person: { type: S.STRING(120), allowNull: true },
      phone: { type: S.STRING(40), allowNull: true },
      email: { type: S.STRING(160), allowNull: true },
      address: { type: S.STRING(255), allowNull: true },
      bank_details: { type: S.JSON, allowNull: true },
      opening_balance: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      notes: { type: S.TEXT, allowNull: true },
      is_active: { type: S.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wt_suppliers', ['branch_id', 'service_line'], { name: 'idx_wtsup_branch_line' });
  },
  down: async (q) => { await q.dropTable('wt_suppliers').catch(() => {}); },
};
