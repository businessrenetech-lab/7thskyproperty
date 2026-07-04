'use strict';

/**
 * 0020 — Maintenance workflow (extend work_orders + quotes sub-table).
 *
 * WorkOrder lifecycle:
 *   submitted → triaged → pending_owner_approval → approved → scheduled →
 *   in_progress → completed → invoiced → closed
 *
 * Auto-flows:
 *   completed + actual_cost > 0 → auto-create landlord bill (provider invoice)
 *   tenant_recharge = true → auto-create tenant invoice for the same amount
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, ENUM, BOOLEAN, TEXT, DECIMAL, DATE, DATEONLY, JSON: JSONT } = Sequelize;
    const stamps = {
      created_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    };
    const qi = queryInterface;
    const addCol = async (t, c, spec) => {
      const desc = await qi.describeTable(t).catch(() => ({}));
      if (!desc[c]) await qi.addColumn(t, c, spec);
    };
    const createTable = async (name, cols) => {
      try { await qi.describeTable(name); } catch { await qi.createTable(name, cols); }
    };

    // 1. Extend work_orders with maintenance lifecycle fields
    await addCol('work_orders', 'reported_by_type',       { type: ENUM('tenant', 'staff', 'inspector', 'owner', 'system'), defaultValue: 'staff' });
    await addCol('work_orders', 'reported_by_contact_id', { type: INTEGER });
    await addCol('work_orders', 'severity',               { type: ENUM('emergency', 'urgent', 'normal', 'cosmetic'), defaultValue: 'normal' });
    await addCol('work_orders', 'category',               { type: ENUM('plumbing', 'electrical', 'ac', 'appliance', 'structural', 'cleaning', 'security', 'general'), defaultValue: 'general' });
    await addCol('work_orders', 'approval_status',        { type: ENUM('not_required', 'pending_owner', 'approved', 'rejected'), defaultValue: 'not_required' });
    await addCol('work_orders', 'approval_threshold',     { type: DECIMAL(15, 2), defaultValue: 5000 });
    await addCol('work_orders', 'owner_decision_at',      { type: DATE });
    await addCol('work_orders', 'owner_decision_note',    { type: TEXT });
    await addCol('work_orders', 'tenant_visible_status',  { type: ENUM('submitted', 'triaged', 'approved', 'scheduled', 'in_progress', 'completed', 'cancelled'), defaultValue: 'submitted' });
    await addCol('work_orders', 'sla_due_at',             { type: DATE });
    await addCol('work_orders', 'triaged_at',             { type: DATE });
    await addCol('work_orders', 'triaged_by',             { type: INTEGER });
    await addCol('work_orders', 'started_at',             { type: DATE });
    await addCol('work_orders', 'estimated_cost',         { type: DECIMAL(15, 2) });
    await addCol('work_orders', 'actual_cost',            { type: DECIMAL(15, 2) });
    await addCol('work_orders', 'tenant_recharge',        { type: BOOLEAN, defaultValue: false });
    await addCol('work_orders', 'tenant_recharge_amount', { type: DECIMAL(15, 2) });
    await addCol('work_orders', 'landlord_bill_id',       { type: INTEGER });
    await addCol('work_orders', 'tenant_recharge_invoice_id', { type: INTEGER });
    await addCol('work_orders', 'category_notes',         { type: TEXT });

    // 2. Provider quotes sub-table
    await createTable('work_order_quotes', {
      id: { type: INTEGER, autoIncrement: true, primaryKey: true },
      work_order_id: { type: INTEGER, allowNull: false, references: { model: 'work_orders', key: 'id' }, onDelete: 'CASCADE' },
      provider_id: { type: INTEGER },
      provider_name: { type: STRING },
      quote_amount: { type: DECIMAL(15, 2), allowNull: false },
      quoted_at: { type: DATEONLY },
      notes: { type: TEXT },
      is_selected: { type: BOOLEAN, defaultValue: false },
      created_by: { type: INTEGER },
      ...stamps,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('work_order_quotes').catch(() => {});
    const cols = ['reported_by_type', 'reported_by_contact_id', 'severity', 'category', 'approval_status',
      'approval_threshold', 'owner_decision_at', 'owner_decision_note', 'tenant_visible_status', 'sla_due_at',
      'triaged_at', 'triaged_by', 'started_at', 'estimated_cost', 'actual_cost', 'tenant_recharge',
      'tenant_recharge_amount', 'landlord_bill_id', 'tenant_recharge_invoice_id', 'category_notes'];
    for (const c of cols) await queryInterface.removeColumn('work_orders', c).catch(() => {});
  },
};
