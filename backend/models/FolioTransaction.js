const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Folio = require('./Folio');
const AccountCategory = require('./AccountCategory');
const ServiceProvider = require('./ServiceProvider');

const FolioTransaction = sequelize.define('FolioTransaction', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  folio_id: { type: DataTypes.INTEGER, allowNull: false },
  transaction_type: { type: DataTypes.ENUM('charge', 'payment', 'credit', 'adjustment', 'invoice', 'supplier_bill', 'owner_payout'), allowNull: false },
  bucket: { type: DataTypes.ENUM('rent', 'service_charge', 'utility', 'maintenance', 'deposit', 'deposit_deduction', 'landlord_fee', 'supplier_bill', 'owner_payout', 'adjustment'), defaultValue: 'adjustment' },
  account_category_id: DataTypes.INTEGER,
  invoice_id: DataTypes.INTEGER,
  payment_id: DataTypes.INTEGER,
  provider_id: DataTypes.INTEGER,
  property_id: DataTypes.INTEGER,
  tenancy_id: DataTypes.INTEGER,
  description: DataTypes.STRING,
  debit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  credit: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  balance_after: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  transaction_date: DataTypes.DATEONLY,
  created_by: DataTypes.INTEGER,
}, { tableName: 'folio_transactions', underscored: true });

Folio.hasMany(FolioTransaction, { as: 'transactions', foreignKey: 'folio_id' });
FolioTransaction.belongsTo(Folio, { as: 'folio', foreignKey: 'folio_id' });
FolioTransaction.belongsTo(AccountCategory, { as: 'category', foreignKey: 'account_category_id' });
FolioTransaction.belongsTo(ServiceProvider, { as: 'provider', foreignKey: 'provider_id' });

module.exports = FolioTransaction;
