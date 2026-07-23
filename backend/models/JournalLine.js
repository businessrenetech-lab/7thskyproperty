const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const JournalEntry = require('./JournalEntry');
const Account = require('./Account');

const JournalLine = sequelize.define('JournalLine', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  journal_entry_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: JournalEntry,
      key: 'id',
    },
  },
  account_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Account,
      key: 'id',
    },
  },
  debit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  credit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  notes: {
    type: DataTypes.STRING,
  },
}, {
  tableName: 'journal_lines',
  underscored: true,
});

JournalLine.belongsTo(JournalEntry, { foreignKey: 'journal_entry_id' });
JournalLine.belongsTo(Account, { foreignKey: 'account_id' });

module.exports = JournalLine;
