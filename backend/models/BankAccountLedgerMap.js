const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const BankAccount = require('./BankAccount');
const Account = require('./Account');
const Branch = require('./Branch');

const BankAccountLedgerMap = sequelize.define('BankAccountLedgerMap', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  bank_account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: BankAccount, key: 'id' },
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Account, key: 'id' },
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: Branch, key: 'id' },
  },
  channel: {
    type: DataTypes.ENUM('cash', 'bank', 'bkash', 'nagad', 'card', 'bank_transfer', 'website'),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'bank_account_ledger_maps',
  underscored: true,
});

BankAccountLedgerMap.belongsTo(BankAccount, { foreignKey: 'bank_account_id' });
BankAccountLedgerMap.belongsTo(Account, { foreignKey: 'account_id' });
BankAccountLedgerMap.belongsTo(Branch, { foreignKey: 'branch_id' });

module.exports = BankAccountLedgerMap;
