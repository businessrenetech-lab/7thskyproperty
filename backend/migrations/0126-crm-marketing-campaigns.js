'use strict';

/**
 * Migration 0126: CRM Marketing Campaigns, Templates, Recipients & Segments
 * Supports multi-channel email, SMS, and WhatsApp bulk marketing.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const q = queryInterface;
    const S = Sequelize;

    // 1. marketing_templates
    if (!(await q.describeTable('marketing_templates').catch(() => null))) {
      await q.createTable('marketing_templates', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        template_code: { type: S.STRING(50), allowNull: false, unique: true },
        name: { type: S.STRING(255), allowNull: false },
        category: {
          type: S.ENUM('new_listing', 'sales_update', 'sold_update', 'market_report', 'buyer_nurture', 'seller_engagement', 'general'),
          defaultValue: 'new_listing',
          allowNull: false
        },
        channel: {
          type: S.ENUM('email', 'sms', 'whatsapp', 'any'),
          defaultValue: 'email',
          allowNull: false
        },
        subject: { type: S.STRING(255), allowNull: true },
        preheader: { type: S.STRING(255), allowNull: true },
        headline: { type: S.STRING(255), allowNull: true },
        body_html: { type: S.TEXT('long'), allowNull: true },
        body_text: { type: S.TEXT, allowNull: true },
        thumbnail_url: { type: S.STRING(500), allowNull: true },
        variables: { type: S.JSON, defaultValue: [] },
        tags: { type: S.JSON, defaultValue: [] },
        is_system: { type: S.BOOLEAN, defaultValue: false },
        is_active: { type: S.BOOLEAN, defaultValue: true },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('marketing_templates', ['branch_id', 'category', 'is_active']);
    }

    // 2. contact_segments
    if (!(await q.describeTable('contact_segments').catch(() => null))) {
      await q.createTable('contact_segments', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        name: { type: S.STRING(255), allowNull: false },
        description: { type: S.TEXT, allowNull: true },
        filter_criteria: { type: S.JSON, defaultValue: {} },
        contact_ids: { type: S.JSON, defaultValue: [] },
        member_count: { type: S.INTEGER, defaultValue: 0 },
        created_by: { type: S.INTEGER, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('contact_segments', ['branch_id']);
    }

    // 3. marketing_campaigns
    if (!(await q.describeTable('marketing_campaigns').catch(() => null))) {
      await q.createTable('marketing_campaigns', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        branch_id: { type: S.INTEGER, allowNull: false, defaultValue: 1 },
        campaign_code: { type: S.STRING(50), allowNull: false, unique: true },
        name: { type: S.STRING(255), allowNull: false },
        channel: {
          type: S.ENUM('email', 'sms', 'whatsapp', 'multi_channel'),
          defaultValue: 'email',
          allowNull: false
        },
        campaign_type: {
          type: S.ENUM('new_listing', 'sales_update', 'sold_update', 'market_report', 'buyer_nurture', 'seller_engagement', 'general'),
          defaultValue: 'new_listing',
          allowNull: false
        },
        template_id: { type: S.INTEGER, allowNull: true },
        property_id: { type: S.INTEGER, allowNull: true },
        subject: { type: S.STRING(255), allowNull: true },
        preheader: { type: S.STRING(255), allowNull: true },
        body_html: { type: S.TEXT('long'), allowNull: true },
        body_text: { type: S.TEXT, allowNull: true },
        target_type: {
          type: S.ENUM('all_contacts', 'selected_contacts', 'buyers', 'sellers', 'leads', 'nrb_investors', 'segment'),
          defaultValue: 'all_contacts',
          allowNull: false
        },
        target_filter: { type: S.JSON, defaultValue: {} },
        recipient_count: { type: S.INTEGER, defaultValue: 0 },
        sent_count: { type: S.INTEGER, defaultValue: 0 },
        delivered_count: { type: S.INTEGER, defaultValue: 0 },
        failed_count: { type: S.INTEGER, defaultValue: 0 },
        opened_count: { type: S.INTEGER, defaultValue: 0 },
        clicked_count: { type: S.INTEGER, defaultValue: 0 },
        status: {
          type: S.ENUM('draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'),
          defaultValue: 'draft',
          allowNull: false
        },
        scheduled_at: { type: S.DATE, allowNull: true },
        started_at: { type: S.DATE, allowNull: true },
        completed_at: { type: S.DATE, allowNull: true },
        created_by: { type: S.INTEGER, allowNull: true },
        metadata: { type: S.JSON, defaultValue: {} },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('marketing_campaigns', ['branch_id', 'status']);
    }

    // 4. marketing_campaign_recipients
    if (!(await q.describeTable('marketing_campaign_recipients').catch(() => null))) {
      await q.createTable('marketing_campaign_recipients', {
        id: { type: S.INTEGER, autoIncrement: true, primaryKey: true },
        campaign_id: { type: S.INTEGER, allowNull: false },
        contact_id: { type: S.INTEGER, allowNull: true },
        lead_id: { type: S.INTEGER, allowNull: true },
        recipient_name: { type: S.STRING(255), allowNull: true },
        recipient_destination: { type: S.STRING(255), allowNull: false },
        channel: {
          type: S.ENUM('email', 'sms', 'whatsapp'),
          allowNull: false
        },
        status: {
          type: S.ENUM('queued', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked', 'suppressed'),
          defaultValue: 'queued',
          allowNull: false
        },
        error_message: { type: S.TEXT, allowNull: true },
        provider_message_id: { type: S.STRING(255), allowNull: true },
        sent_at: { type: S.DATE, allowNull: true },
        delivered_at: { type: S.DATE, allowNull: true },
        opened_at: { type: S.DATE, allowNull: true },
        created_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: S.DATE, defaultValue: S.literal('CURRENT_TIMESTAMP') },
      });
      await q.addIndex('marketing_campaign_recipients', ['campaign_id', 'status']);
      await q.addIndex('marketing_campaign_recipients', ['recipient_destination']);
    }
  },

  down: async (queryInterface) => {
    const q = queryInterface;
    await q.dropTable('marketing_campaign_recipients').catch(() => {});
    await q.dropTable('marketing_campaigns').catch(() => {});
    await q.dropTable('contact_segments').catch(() => {});
    await q.dropTable('marketing_templates').catch(() => {});
  }
};
