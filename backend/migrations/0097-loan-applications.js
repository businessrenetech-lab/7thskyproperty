'use strict';

/**
 * Migration 0097: wt_loan_applications — the Loan Application Tracker for the Loan
 * & Financial Support service line (workbook Sheet 8 + Sheet 10 Banking Liaison).
 * Additive and idempotent; new table. Timestamps use createdAt/updatedAt to match
 * the other wt_* tables.
 */
module.exports = {
  up: async (q, S) => {
    if (await q.describeTable('wt_loan_applications').catch(() => null)) return;
    await q.createTable('wt_loan_applications', {
      id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
      branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
      service_line: { type: S.STRING(40), allowNull: false, defaultValue: 'loan_financial_support' },
      code: { type: S.STRING(30), allowNull: false },
      client_id: { type: S.INTEGER, allowNull: false },
      client_code: S.STRING(40),
      client_name: S.STRING(200),
      project_id: S.STRING(40),
      work_order_code: S.STRING(40),
      lender: S.STRING(160),
      relationship_manager: S.STRING(160),
      loan_type: S.STRING(80),
      purpose: S.STRING(120),
      loan_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      approved_amount: { type: S.DECIMAL(15, 2), defaultValue: 0 },
      interest_rate: { type: S.DECIMAL(6, 3), allowNull: true },
      application_date: S.DATEONLY,
      decision_date: S.DATEONLY,
      status: { type: S.STRING(40), allowNull: false, defaultValue: 'Enquiry' },
      outcome: S.STRING(255),
      notes: S.TEXT,
      created_by: S.STRING(120),
      createdAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: S.DATE, allowNull: false, defaultValue: S.literal('CURRENT_TIMESTAMP') },
    });
    await q.addIndex('wt_loan_applications', ['branch_id', 'service_line'], { name: 'wt_loan_applications_service_line' }).catch(() => {});
    await q.addIndex('wt_loan_applications', ['client_id'], { name: 'wt_loan_applications_client' }).catch(() => {});
  },
  down: async (q) => { await q.dropTable('wt_loan_applications').catch(() => {}); },
};
