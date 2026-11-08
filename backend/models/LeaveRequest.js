const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const User = require('./User');
const Branch = require('./Branch');
const LeaveType = require('./LeaveType');

const LeaveRequest = sequelize.define('LeaveRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: User, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  leave_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: LeaveType, key: 'id' },
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  total_days: {
    type: DataTypes.DECIMAL(4, 1),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
  },
  // Weekend leave: the weekly day off the staff member worked, and what proves it (owner request 2026-10-14).
  worked_date: { type: DataTypes.DATEONLY, allowNull: true },
  proof_note: { type: DataTypes.TEXT, allowNull: true },
  // Who covers the work while away (optional, printed on the application).
  handover_note: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
  },
  approved_by: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
  },
  approved_at: {
    type: DataTypes.DATE,
  },
  rejection_note: {
    type: DataTypes.TEXT,
  },
}, {
  tableName: 'leave_requests',
  underscored: true,
});

LeaveRequest.belongsTo(User, { foreignKey: 'user_id', as: 'Employee' });
LeaveRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'Approver' });
LeaveRequest.belongsTo(Branch, { foreignKey: 'branch_id' });
LeaveRequest.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });

module.exports = LeaveRequest;
