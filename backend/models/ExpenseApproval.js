const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Property = require('./Property');
const Contact = require('./Contact');
const WorkOrder = require('./WorkOrder');

const ExpenseApproval = sequelize.define('ExpenseApproval', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  expense_code: { type: DataTypes.STRING(40), unique: true },
  property_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  work_order_id: DataTypes.INTEGER,
  landlord_bill_id: DataTypes.INTEGER,
  expense_type: DataTypes.STRING(80),
  description: DataTypes.TEXT,
  estimated_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  approved_amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  owner_approval_required: { type: DataTypes.BOOLEAN, defaultValue: true },
  approval_method: DataTypes.STRING(80),
  approved_by: DataTypes.STRING,
  approval_date: DataTypes.DATEONLY,
  invoice_received: { type: DataTypes.BOOLEAN, defaultValue: false },
  deduct_from_rent: { type: DataTypes.BOOLEAN, defaultValue: true },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'invoice_received', 'deducted', 'closed'), defaultValue: 'pending' },
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'expense_approvals', underscored: true });

ExpenseApproval.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
ExpenseApproval.belongsTo(Contact, { as: 'owner', foreignKey: 'owner_contact_id' });
ExpenseApproval.belongsTo(WorkOrder, { as: 'workOrder', foreignKey: 'work_order_id' });

module.exports = ExpenseApproval;
