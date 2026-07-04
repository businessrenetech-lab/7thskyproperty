const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const RentalLedger = sequelize.define('RentalLedger', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  property_id: DataTypes.INTEGER,
  tenant_contact_id: DataTypes.INTEGER,
  owner_contact_id: DataTypes.INTEGER,
  period_label: DataTypes.STRING(20),
  rent_due: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  rent_received: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  due_date: DataTypes.DATEONLY,
  received_date: DataTypes.DATEONLY,
  status: { type: DataTypes.ENUM('due', 'partial', 'paid', 'overdue', 'arrears'), defaultValue: 'due' },
  notes: DataTypes.TEXT,
  invoice_id: DataTypes.INTEGER,
}, { tableName: 'rental_ledger', underscored: true });

module.exports = RentalLedger;
