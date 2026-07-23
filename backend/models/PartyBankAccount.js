const crypto = require('crypto');
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');

const normalizeAccountNumber = (value) => String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const accountNumberHash = (value) => crypto.createHash('sha256').update(normalizeAccountNumber(value)).digest('hex');
const maskAccountNumber = (value) => {
  const normalized = normalizeAccountNumber(value);
  return normalized ? `${'*'.repeat(Math.max(normalized.length - 4, 4))}${normalized.slice(-4)}` : '';
};

const PartyBankAccount = sequelize.define('PartyBankAccount', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: false },
  role_type: { type: DataTypes.ENUM('vendor', 'buyer', 'third_party'), allowNull: false },
  bank_name: { type: DataTypes.STRING, allowNull: false },
  bank_branch: DataTypes.STRING,
  account_name: { type: DataTypes.STRING, allowNull: false },
  account_number: { type: DataTypes.STRING(80), allowNull: false },
  account_number_hash: { type: DataTypes.STRING(64), allowNull: false },
  routing_number: DataTypes.STRING(40),
  status: { type: DataTypes.ENUM('pending', 'verified', 'rejected'), defaultValue: 'pending' },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
  verification_note: DataTypes.TEXT,
  verified_by: DataTypes.INTEGER,
  verified_at: DataTypes.DATE,
  created_by: DataTypes.INTEGER,
}, { tableName: 'party_bank_accounts', underscored: true });

PartyBankAccount.belongsTo(Contact, { foreignKey: 'contact_id' });

function publicBankAccount(row, reveal = false) {
  const value = row?.get ? row.get({ plain: true }) : { ...(row || {}) };
  if (!value.id) return value;
  value.masked_account_number = maskAccountNumber(value.account_number);
  if (!reveal) delete value.account_number;
  delete value.account_number_hash;
  return value;
}

module.exports = { PartyBankAccount, normalizeAccountNumber, accountNumberHash, maskAccountNumber, publicBankAccount };
