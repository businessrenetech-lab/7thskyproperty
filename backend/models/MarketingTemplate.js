const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const User = require('./User');

const MarketingTemplate = sequelize.define('MarketingTemplate', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  template_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  category: {
    type: DataTypes.ENUM('new_listing', 'sales_update', 'sold_update', 'market_report', 'buyer_nurture', 'seller_engagement', 'general'),
    defaultValue: 'new_listing',
    allowNull: false
  },
  channel: {
    type: DataTypes.ENUM('email', 'sms', 'whatsapp', 'any'),
    defaultValue: 'email',
    allowNull: false
  },
  subject: { type: DataTypes.STRING(255), allowNull: true },
  preheader: { type: DataTypes.STRING(255), allowNull: true },
  headline: { type: DataTypes.STRING(255), allowNull: true },
  body_html: { type: DataTypes.TEXT('long'), allowNull: true },
  body_text: { type: DataTypes.TEXT, allowNull: true },
  thumbnail_url: { type: DataTypes.STRING(500), allowNull: true },
  variables: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const v = this.getDataValue('variables');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
      return v || [];
    }
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const v = this.getDataValue('tags');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
      return v || [];
    }
  },
  is_system: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'marketing_templates',
  underscored: true,
});

MarketingTemplate.belongsTo(Branch, { foreignKey: 'branch_id' });
MarketingTemplate.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });

module.exports = MarketingTemplate;
