/**
 * waterTankVerifications.js — the Verification Register for the Property
 * Documentation & Verification service line (manifest `verification_register: true`).
 *
 * The service's workbook has a Government Search Register (Sheet 8: registry / land
 * office / mutation / encumbrance searches) and a Verification Findings Register
 * (Sheet 9: issue / risk level / action). This one table captures both — each
 * verification check with its search authority, finding and risk rating — which the
 * shared project/work-order spine doesn't model. Created by migration 0098.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const WtVerificationCheck = sequelize.define('WtVerificationCheck', {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'property_documentation_verification' },
  code: { type: D.STRING(30), allowNull: false },
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  client_name: D.STRING(200),
  project_id: D.STRING(40),
  work_order_code: D.STRING(40),
  // Deed Verification | Chain of Ownership | Title Review | Registry Search |
  // Land Office Search | Mutation Search | Encumbrance Search | Government Record |
  // Due Diligence | Conveyancing | Other
  check_type: { type: D.STRING(80), allowNull: false },
  authority: D.STRING(160),      // Sub-Registry / AC Land Office / Court, etc.
  reference_no: D.STRING(120),   // search ref / case no.
  // Pending | In Progress | Completed | Blocked
  status: { type: D.STRING(40), allowNull: false, defaultValue: 'Pending' },
  finding: D.TEXT,
  // Clear | Low | Medium | High | Critical
  risk_level: { type: D.STRING(20), allowNull: false, defaultValue: 'Clear' },
  recommended_action: D.TEXT,
  verified_by: D.STRING(120),
  verified_date: D.DATEONLY,
  notes: D.TEXT,
  created_by: D.STRING(120),
}, { tableName: 'wt_verification_checks' });

module.exports = { WtVerificationCheck };
