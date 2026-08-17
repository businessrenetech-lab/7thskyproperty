const { DataTypes: D } = require('sequelize');
const sequelize = require('../config/db.config');

/*
 * The Short Term Stay money models.
 *
 * `StsMoneyEvent` is append-only — `timestamps` is off apart from `created_at`
 * for exactly that reason: there is nothing to update. A correction is a new row
 * with a negative amount pointing at what it reverses, so an auditor sees the
 * mistake AND the fix. An edited row shows neither.
 */

const StsMoneyEvent = sequelize.define('StsMoneyEvent', {
  branch_id: { type: D.INTEGER, allowNull: false },
  event_type: { type: D.STRING(40), allowNull: false },
  direction: { type: D.STRING(4), allowNull: false },
  subject_type: { type: D.STRING(20), allowNull: false },
  subject_id: { type: D.INTEGER, allowNull: false },
  subject_code: D.STRING(40),
  amount: { type: D.DECIMAL(15, 2), allowNull: false },
  currency: { type: D.STRING(8), defaultValue: 'BDT' },
  method: D.STRING(40),
  reference: D.STRING(120),
  received_on: D.DATEONLY,
  idempotency_key: { type: D.STRING(120), allowNull: false },
  reverses_event_id: D.INTEGER,
  reversal_reason: D.STRING(255),
  batch_ref: D.STRING(40),
  owner_contact_id: D.INTEGER,
  owner_name: D.STRING(200),
  property_id: D.INTEGER,
  note: D.TEXT,
  origin: { type: D.STRING(40), defaultValue: 'api' },
  actor: D.STRING(120),
  actor_id: D.INTEGER,
  created_at: { type: D.DATE, defaultValue: D.NOW },
}, { tableName: 'sts_money_events', timestamps: false });

const StsOwnerDisbursement = sequelize.define('StsOwnerDisbursement', {
  branch_id: { type: D.INTEGER, allowNull: false },
  code: { type: D.STRING(30), allowNull: false, unique: true },
  voucher_no: D.STRING(30),
  batch_ref: D.STRING(40),
  statement_id: D.INTEGER,
  statement_code: D.STRING(40),
  owner_contact_id: { type: D.INTEGER, allowNull: false },
  owner_name: D.STRING(200),
  property_id: D.INTEGER,
  property_label: D.STRING(255),
  period_label: D.STRING(60),
  description: D.TEXT,
  amount: { type: D.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
  method: D.STRING(40),
  reference: D.STRING(120),
  paid_on: D.DATEONLY,
  status: { type: D.STRING(30), defaultValue: 'Paid' },
  money_event_id: D.INTEGER,
  paid_by: D.STRING(120),
  approved_by: D.STRING(120),
  voucher_issued_at: D.DATE,
  notes: D.TEXT,
  created_at: { type: D.DATE, defaultValue: D.NOW },
  updated_at: { type: D.DATE, defaultValue: D.NOW },
}, { tableName: 'sts_owner_disbursements', timestamps: false });

module.exports = { StsMoneyEvent, StsOwnerDisbursement };
