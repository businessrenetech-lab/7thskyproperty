const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');

const BankStatementLine = sequelize.define('BankStatementLine', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    branch_id: { type: DataTypes.INTEGER, allowNull: false },
    bank_account_id: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    description: { type: DataTypes.STRING },
    reference: { type: DataTypes.STRING },
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false }, // Positive for credit, Negative for debit
    status: { type: DataTypes.ENUM('unmatched', 'matched', 'ignored'), defaultValue: 'unmatched' },
    matched_entity_type: DataTypes.STRING(40),
    matched_entity_id: DataTypes.INTEGER,
    matched_by: DataTypes.INTEGER,
    matched_at: DataTypes.DATE,
    import_key: DataTypes.STRING(120)
}, {
    tableName: 'bank_statement_lines',
    underscored: true
});

module.exports = BankStatementLine;
