const { DataTypes } = require('sequelize');
const sequelize = require('../config/db.config');
const Contact = require('./Contact');
const Lead = require('./Lead');

const MarketingCampaignRecipient = sequelize.define('MarketingCampaignRecipient', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  campaign_id: { type: DataTypes.INTEGER, allowNull: false },
  contact_id: { type: DataTypes.INTEGER, allowNull: true },
  lead_id: { type: DataTypes.INTEGER, allowNull: true },
  recipient_name: { type: DataTypes.STRING(255), allowNull: true },
  recipient_destination: { type: DataTypes.STRING(255), allowNull: false },
  channel: {
    type: DataTypes.ENUM('email', 'sms', 'whatsapp'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'suppressed'),
    defaultValue: 'queued',
    allowNull: false
  },
  error_message: { type: DataTypes.TEXT, allowNull: true },
  provider_message_id: { type: DataTypes.STRING(255), allowNull: true },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  delivered_at: { type: DataTypes.DATE, allowNull: true },
  opened_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'marketing_campaign_recipients',
  underscored: true,
});

MarketingCampaignRecipient.belongsTo(Contact, { as: 'contact', foreignKey: 'contact_id' });
MarketingCampaignRecipient.belongsTo(Lead, { as: 'lead', foreignKey: 'lead_id' });

module.exports = MarketingCampaignRecipient;
