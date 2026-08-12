const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');

const User = sequelize.define('User', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'unassigned',
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active',
  },
  tfa_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  tfa_secret: {
    type: DataTypes.STRING,
  },
  // ── portal accounts (migration 0085) ──
  // A password an administrator generated is one the holder never chose, so the
  // first sign-in must replace it.
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  password_changed_at: DataTypes.DATE,
  last_login_at: DataTypes.DATE,
  // Only the hash of a reset token is stored.
  reset_token_hash: DataTypes.STRING(128),
  reset_token_expires_at: DataTypes.DATE,
}, {
  tableName: 'users',
  underscored: true,
});

User.belongsTo(Branch, { foreignKey: 'branch_id' });
Branch.hasMany(User, { foreignKey: 'branch_id' });
Branch.belongsTo(User, { as: 'Manager', foreignKey: 'manager_id', constraints: false });

module.exports = User;
