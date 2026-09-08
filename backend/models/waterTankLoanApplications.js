/**
 * waterTankLoanApplications.js — the Loan Application Tracker for the Loan &
 * Financial Support service line (manifest `loan_tracker: true`).
 *
 * The loan service's workbook (Sheet 8 Loan Application Tracker + Sheet 10 Banking
 * Liaison) tracks each application to a lender through to its outcome — something
 * the shared project/work-order spine doesn't model. One table, created by
 * migration 0097, service_line-tagged like every other wt_* table so it stays
 * isolated to this line.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const WtLoanApplication = sequelize.define('WtLoanApplication', {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'loan_financial_support' },
  code: { type: D.STRING(30), allowNull: false },
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  client_name: D.STRING(200),
  project_id: D.STRING(40),
  work_order_code: D.STRING(40),
  // Banking liaison (workbook Sheet 10 folded in).
  lender: D.STRING(160),
  relationship_manager: D.STRING(160),
  loan_type: D.STRING(80),
  purpose: D.STRING(120),
  loan_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  approved_amount: { type: D.DECIMAL(15, 2), defaultValue: 0 },
  interest_rate: { type: D.DECIMAL(6, 3), allowNull: true },
  application_date: D.DATEONLY,
  decision_date: D.DATEONLY,
  // Enquiry | Preparing | Submitted | Under Review | Approved | Declined | Disbursed | Withdrawn
  status: { type: D.STRING(40), allowNull: false, defaultValue: 'Enquiry' },
  outcome: D.STRING(255),
  notes: D.TEXT,
  created_by: D.STRING(120),
}, { tableName: 'wt_loan_applications' });

module.exports = { WtLoanApplication };
