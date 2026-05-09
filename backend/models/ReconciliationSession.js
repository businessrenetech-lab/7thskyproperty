const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const User = require('./User');

const ReconciliationSession = sequelize.define('ReconciliationSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  recon_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'reviewed', 'approved', 'locked'),
    defaultValue: 'draft',
  },
  total_inflows: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  total_outflows: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  total_ledger_net: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  total_variance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  tolerance_bdt: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.TEXT,
  },
  reopen_reason: {
    type: DataTypes.TEXT,
  },
  prepared_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  approved_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  locked_at: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'reconciliation_sessions',
  underscored: true,
  indexes: [{ unique: true, fields: ['branch_id', 'recon_date'], name: 'ux_reconciliation_sessions_branch_date' }],
});

ReconciliationSession.belongsTo(Branch, { foreignKey: 'branch_id' });
ReconciliationSession.belongsTo(User, { as: 'Preparer', foreignKey: 'prepared_by' });
ReconciliationSession.belongsTo(User, { as: 'Reviewer', foreignKey: 'reviewed_by' });
ReconciliationSession.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by' });

module.exports = ReconciliationSession;
