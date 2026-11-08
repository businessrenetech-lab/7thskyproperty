const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

/**
 * HRM change requests and the permanent history log (migration 0165). JSON columns come back as strings in
 * this database, so each has a getter that parses defensively. hr_history rows are only ever inserted.
 */
const json = (name, fallback) => ({
  type: DataTypes.JSON,
  get() {
    const v = this.getDataValue(name);
    if (v == null) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch { return fallback; }
  },
});

const HrChangeRequest = sequelize.define('HrChangeRequest', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  kind: { type: DataTypes.STRING(40), allowNull: false },
  entity_type: { type: DataTypes.STRING(40), allowNull: false },
  entity_id: DataTypes.INTEGER,
  payload: json('payload', {}),
  before: json('before', {}),
  reason: DataTypes.TEXT,
  chain: json('chain', []),
  step: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  requested_by: DataTypes.INTEGER,
}, { tableName: 'hr_change_requests', underscored: true, timestamps: true });

const HrHistory = sequelize.define('HrHistory', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: DataTypes.INTEGER,
  entity_type: { type: DataTypes.STRING(40), allowNull: false },
  entity_id: { type: DataTypes.INTEGER, allowNull: false },
  field: { type: DataTypes.STRING(80), allowNull: false },
  old_value: DataTypes.TEXT,
  new_value: DataTypes.TEXT,
  change_request_id: DataTypes.INTEGER,
  actor_id: DataTypes.INTEGER,
  at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'hr_history', underscored: true, timestamps: false });

module.exports = { HrChangeRequest, HrHistory };
