const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const PropertyInvoice = require('./PropertyInvoice');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  payment_code: { type: DataTypes.STRING(40), unique: true },
  invoice_id: DataTypes.INTEGER,
  client_id: DataTypes.INTEGER,
  direction: { type: DataTypes.ENUM('incoming', 'outgoing'), defaultValue: 'incoming' },
  amount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  method: { type: DataTypes.ENUM('cash', 'bank_transfer', 'bkash', 'nagad', 'card', 'cheque', 'sslcommerz', 'other'), defaultValue: 'cash' },
  reference: DataTypes.STRING,
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'completed' },
  paid_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  recorded_by: DataTypes.INTEGER,
}, { tableName: 'payments', underscored: true });

PropertyInvoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Payment.belongsTo(PropertyInvoice, { foreignKey: 'invoice_id' });

module.exports = Payment;
