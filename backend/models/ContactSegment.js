const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const User = require('./User');

const ContactSegment = sequelize.define('ContactSegment', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  name: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  filter_criteria: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const v = this.getDataValue('filter_criteria');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
      return v || {};
    }
  },
  contact_ids: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const v = this.getDataValue('contact_ids');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
      return v || [];
    }
  },
  member_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'contact_segments',
  underscored: true,
});

ContactSegment.belongsTo(Branch, { foreignKey: 'branch_id' });
ContactSegment.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });

module.exports = ContactSegment;
