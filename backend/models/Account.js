const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  branch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Branch,
      key: 'id',
    },
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('asset', 'liability', 'equity', 'revenue', 'expense'),
    allowNull: false,
  },
  sub_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  parent_id: {
    type: DataTypes.INTEGER,
    references: {
      model: 'accounts',
      key: 'id',
    },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'accounts',
  underscored: true,
});

Account.belongsTo(Branch, { foreignKey: 'branch_id' });
Account.belongsTo(Account, { as: 'Parent', foreignKey: 'parent_id' });

module.exports = Account;
