const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BankAccount = sequelize.define('BankAccount', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    account_name: { type: DataTypes.STRING, allowNull: false },
    account_number: { type: DataTypes.STRING, allowNull: false },
    bank_name: { type: DataTypes.STRING, allowNull: false },
    routing_number: DataTypes.STRING(40),
    account_type: { type: DataTypes.ENUM('trust', 'operating', 'other'), defaultValue: 'other' },
    currency: { type: DataTypes.STRING(3), defaultValue: 'BDT' },
    balance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0.00 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'bank_accounts',
    underscored: true
});

module.exports = BankAccount;
