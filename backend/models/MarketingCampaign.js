const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Branch = require('./Branch');
const User = require('./User');
const Property = require('./Property');
const MarketingTemplate = require('./MarketingTemplate');

const MarketingCampaign = sequelize.define('MarketingCampaign', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  campaign_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  channel: {
    type: DataTypes.ENUM('email', 'sms', 'whatsapp', 'multi_channel'),
    defaultValue: 'email',
    allowNull: false
  },
  campaign_type: {
    type: DataTypes.ENUM('new_listing', 'sales_update', 'sold_update', 'market_report', 'buyer_nurture', 'seller_engagement', 'general'),
    defaultValue: 'new_listing',
    allowNull: false
  },
  template_id: { type: DataTypes.INTEGER, allowNull: true },
  property_id: { type: DataTypes.INTEGER, allowNull: true },
  subject: { type: DataTypes.STRING(255), allowNull: true },
  preheader: { type: DataTypes.STRING(255), allowNull: true },
  body_html: { type: DataTypes.TEXT('long'), allowNull: true },
  body_text: { type: DataTypes.TEXT, allowNull: true },
  target_type: {
    type: DataTypes.ENUM('all_contacts', 'selected_contacts', 'buyers', 'sellers', 'leads', 'nrb_investors', 'segment'),
    defaultValue: 'all_contacts',
    allowNull: false
  },
  target_filter: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const v = this.getDataValue('target_filter');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
      return v || {};
    }
  },
  recipient_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  sent_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  delivered_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  failed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  opened_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  clicked_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: {
    type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'draft',
    allowNull: false
  },
  scheduled_at: { type: DataTypes.DATE, allowNull: true },
  started_at: { type: DataTypes.DATE, allowNull: true },
  completed_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    get() {
      const v = this.getDataValue('metadata');
      if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
      return v || {};
    }
  },
}, {
  tableName: 'marketing_campaigns',
  underscored: true,
});

MarketingCampaign.belongsTo(Branch, { foreignKey: 'branch_id' });
MarketingCampaign.belongsTo(User, { as: 'Creator', foreignKey: 'created_by' });
MarketingCampaign.belongsTo(Property, { as: 'property', foreignKey: 'property_id' });
MarketingCampaign.belongsTo(MarketingTemplate, { as: 'template', foreignKey: 'template_id' });

module.exports = MarketingCampaign;
