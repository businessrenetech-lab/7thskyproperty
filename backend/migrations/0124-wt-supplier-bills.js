'use strict';
// Supplier bills (accounts payable): what we OWE a supplier, per project + cost
// category. Paying a bill creates a wt_project_disbursements row (money OUT) and
// reduces the balance. Scoped by service_line.
module.exports = {
  up: async (q, S) => {
    const exists = await q.describeTable('wt_supplier_bills').catch(() => null);
    if (exists) return;
    await q.createTable('wt_supplier_bills', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'water_tank' },
      bill_code: { type: S.STRING(30), allowNull: false, unique: true },
      supplier_id: { type: S.INTEGER, allowNull: false },
      supplier_name: { type: S.STRING(200), allowNull: true },
      project_code: { type: S.STRING(30), allowNull: true },
      category: { type: S.STRING(60), allowNull: false, defaultValue: 'Materials' },
      description: { type: S.TEXT, allowNull: true },
      bill_date: { type: S.DATEONLY, allowNull: true },
      due_date: { type: S.DATEONLY, allowNull: true },
      total: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      amount_paid: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      balance: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: S.ENUM('unpaid', 'partial', 'paid', 'void'), allowNull: false, defaultValue: 'unpaid' },
      bill_url: { type: S.STRING(500), allowNull: true },
      notes: { type: S.TEXT, allowNull: true },
      created_by: { type: S.INTEGER, allowNull: true },
      created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wt_supplier_bills', ['branch_id', 'service_line'], { name: 'idx_wtsb_branch_line' });
    await q.addIndex('wt_supplier_bills', ['supplier_id'], { name: 'idx_wtsb_supplier' });
    await q.addIndex('wt_supplier_bills', ['project_code'], { name: 'idx_wtsb_project' });
  },
  down: async (q) => { await q.dropTable('wt_supplier_bills').catch(() => {}); },
};
