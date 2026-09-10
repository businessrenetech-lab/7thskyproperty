'use strict';
module.exports = {
  up: async (q, S) => {
    const ts = { created_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } };
    const ts2 = { ...ts, updated_at: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') } };
    if (!(await q.describeTable('sale_offer_versions').catch(() => null))) {
      await q.createTable('sale_offer_versions', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        offer_id: { type: S.INTEGER, allowNull: false },
        version_no: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        side: { type: S.ENUM('buyer', 'seller'), allowNull: false, defaultValue: 'buyer' },
        amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        deposit_amount: { type: S.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        finance_status: S.STRING(40), conditions: S.JSON,
        expiry_date: S.DATEONLY, proposed_completion_date: S.DATEONLY,
        notes: S.TEXT, parties_snapshot: S.JSON, created_by: S.INTEGER, ...ts,
      });
    }
    if (!(await q.describeTable('sale_offer_approvals').catch(() => null))) {
      await q.createTable('sale_offer_approvals', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        offer_id: { type: S.INTEGER, allowNull: false },
        offer_version_id: { type: S.INTEGER, allowNull: false },
        approver_side: { type: S.ENUM('buyer', 'seller'), allowNull: false, defaultValue: 'seller' },
        decision: { type: S.ENUM('approved', 'rejected'), allowNull: false, defaultValue: 'approved' },
        note: S.TEXT, override_reason: S.TEXT, approved_by: S.INTEGER, approved_at: S.DATE, ...ts2,
      });
    }
  },
  down: async (q) => {
    await q.dropTable('sale_offer_approvals').catch(() => {});
    await q.dropTable('sale_offer_versions').catch(() => {});
  },
};
