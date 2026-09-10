'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = {
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    };
    const dealCols = {
      contract_status: { type: S.ENUM('none', 'drafted', 'sent', 'signed'), allowNull: false, defaultValue: 'none' },
      settlement_status: { type: S.ENUM('not_started', 'in_progress', 'settled'), allowNull: false, defaultValue: 'not_started' },
      payment_status: { type: S.ENUM('unpaid', 'partial', 'received'), allowNull: false, defaultValue: 'unpaid' },
      disbursement_status: { type: S.ENUM('none', 'pending', 'partial', 'disbursed'), allowNull: false, defaultValue: 'none' },
      expected_fee: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      expected_commission: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      deductions_total: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      settlement_approved_by: S.INTEGER,
      settlement_approved_at: S.DATE,
    };
    const d = await q.describeTable('property_deals').catch(() => null);
    if (d) for (const [c, def] of Object.entries(dealCols)) {
      if (!d[c]) await q.addColumn('property_deals', c, def).catch((e) => console.warn(`[0103] property_deals.${c}:`, e.message));
    }
    if (!(await q.describeTable('deal_disbursements').catch(() => null))) {
      await q.createTable('deal_disbursements', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        disbursement_code: { type: S.STRING(40), allowNull: false },
        deal_id: { type: S.INTEGER, allowNull: false },
        payee_type: { type: S.ENUM('agent', 'vendor', 'client_refund', 'expense', 'other'), allowNull: false, defaultValue: 'other' },
        payee_contact_id: S.INTEGER, payee_name: S.STRING(160),
        description: S.STRING(255), amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        method: { type: S.STRING(40), defaultValue: 'bank_transfer' }, reference: S.STRING(120),
        status: { type: S.ENUM('draft', 'approved', 'paid', 'void'), allowNull: false, defaultValue: 'draft' },
        source_hash: S.STRING(80), approved_by: S.INTEGER, approved_at: S.DATE, paid_at: S.DATE,
        created_by: S.INTEGER, ...ts,
      });
      await q.addIndex('deal_disbursements', ['deal_id'], { name: 'deal_disb_deal' }).catch(() => {});
      await q.addIndex('deal_disbursements', ['source_hash'], { name: 'deal_disb_hash' }).catch(() => {});
    }
    if (!(await q.describeTable('deal_events').catch(() => null))) {
      await q.createTable('deal_events', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        deal_id: { type: S.INTEGER, allowNull: false },
        event_type: { type: S.STRING(60), allowNull: false },
        detail: S.TEXT, amount: S.DECIMAL(15, 2),
        actor_user_id: S.INTEGER, occurred_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('deal_events', ['deal_id'], { name: 'deal_events_deal' }).catch(() => {});
    }
  },
  down: async (q) => {
    await q.dropTable('deal_events').catch(() => {});
    await q.dropTable('deal_disbursements').catch(() => {});
    for (const c of ['contract_status', 'settlement_status', 'payment_status', 'disbursement_status', 'expected_fee', 'expected_commission', 'deductions_total', 'settlement_approved_by', 'settlement_approved_at']) {
      await q.removeColumn('property_deals', c).catch(() => {});
    }
  },
};
