'use strict';

/**
 * Migration 0099: wt_beneficiaries — the Beneficiary / Heirs Register for the
 * Property Will & Succession Support line (workbook Sheet 3 Beneficiaries + Sheet 7
 * Beneficiary Documents). Additive and idempotent; new table. createdAt/updatedAt
 * to match the other wt_* tables.
 */
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('wt_beneficiaries').catch(() => null)) return;
    await q.createTable('wt_beneficiaries', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'property_will_succession' },
      code: { type: S.STRING(30), allowNull: false },
      client_id: { type: S.INTEGER, allowNull: false },
      client_code: S.STRING(40),
      client_name: S.STRING(200),
      project_id: S.STRING(40),
      beneficiary_name: { type: S.STRING(200), allowNull: false },
      relationship: S.STRING(60),
      nid_passport: S.STRING(120),
      contact: S.STRING(120),
      share_percent: { type: S.DECIMAL(6, 3), allowNull: true },
      entitlement: S.TEXT,
      status: { type: S.STRING(40), allowNull: false, defaultValue: 'Identified' },
      notes: S.TEXT,
      created_by: S.STRING(120),
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wt_beneficiaries', ['branch_id', 'service_line'], { name: 'wt_beneficiaries_service_line' }).catch(() => {});
    await q.addIndex('wt_beneficiaries', ['client_id'], { name: 'wt_beneficiaries_client' }).catch(() => {});
  },
  down: async (q) => { await q.dropTable('wt_beneficiaries').catch(() => {}); },
};
