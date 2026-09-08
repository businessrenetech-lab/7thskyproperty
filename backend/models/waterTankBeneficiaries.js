/**
 * waterTankBeneficiaries.js — the Beneficiary / Heirs Register for the Property
 * Will & Succession Support line (manifest `beneficiary_register: true`).
 *
 * A will/succession engagement centres on who the beneficiaries / legal heirs are
 * and their entitlements (workbook Sheet 3 Beneficiaries + Sheet 7 Beneficiary
 * Documents + beneficiary-dispute risk) — something the shared project/work-order
 * spine doesn't model. Created by migration 0099; service_line-tagged.
 */
const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

const WtBeneficiary = sequelize.define('WtBeneficiary', {
  id: { type: D.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
  service_line: { type: D.STRING(40), allowNull: false, defaultValue: 'property_will_succession' },
  code: { type: D.STRING(30), allowNull: false },
  // The engaging client (testator / applicant / estate holder).
  client_id: { type: D.INTEGER, allowNull: false },
  client_code: D.STRING(40),
  client_name: D.STRING(200),
  project_id: D.STRING(40),
  beneficiary_name: { type: D.STRING(200), allowNull: false },
  relationship: D.STRING(60),   // Spouse, Son, Daughter, Father, Mother, Brother, Sister, Other
  nid_passport: D.STRING(120),
  contact: D.STRING(120),
  share_percent: { type: D.DECIMAL(6, 3), allowNull: true },
  entitlement: D.TEXT,          // property / assets / share description
  // Identified | Documented | Consented | Disputed | Settled
  status: { type: D.STRING(40), allowNull: false, defaultValue: 'Identified' },
  notes: D.TEXT,
  created_by: D.STRING(120),
}, { tableName: 'wt_beneficiaries' });

module.exports = { WtBeneficiary };
