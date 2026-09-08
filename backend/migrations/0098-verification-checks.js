'use strict';

/**
 * Migration 0098: wt_verification_checks — the Verification Register for the
 * Property Documentation & Verification service line (workbook Sheet 8 Government
 * Search Register + Sheet 9 Verification Findings Register). Additive and
 * idempotent; new table. createdAt/updatedAt to match the other wt_* tables.
 */
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('wt_verification_checks').catch(() => null)) return;
    await q.createTable('wt_verification_checks', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'property_documentation_verification' },
      code: { type: S.STRING(30), allowNull: false },
      client_id: { type: S.INTEGER, allowNull: false },
      client_code: S.STRING(40),
      client_name: S.STRING(200),
      project_id: S.STRING(40),
      work_order_code: S.STRING(40),
      check_type: { type: S.STRING(80), allowNull: false },
      authority: S.STRING(160),
      reference_no: S.STRING(120),
      status: { type: S.STRING(40), allowNull: false, defaultValue: 'Pending' },
      finding: S.TEXT,
      risk_level: { type: S.STRING(20), allowNull: false, defaultValue: 'Clear' },
      recommended_action: S.TEXT,
      verified_by: S.STRING(120),
      verified_date: S.DATEONLY,
      notes: S.TEXT,
      created_by: S.STRING(120),
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wt_verification_checks', ['branch_id', 'service_line'], { name: 'wt_verification_checks_service_line' }).catch(() => {});
    await q.addIndex('wt_verification_checks', ['client_id'], { name: 'wt_verification_checks_client' }).catch(() => {});
  },
  down: async (q) => { await q.dropTable('wt_verification_checks').catch(() => {}); },
};
