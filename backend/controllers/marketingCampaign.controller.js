'use strict';

const { Op } = require('sequelize');
const MarketingTemplate = require('../models/MarketingTemplate');
const MarketingCampaign = require('../models/MarketingCampaign');
const MarketingCampaignRecipient = require('../models/MarketingCampaignRecipient');
const ContactSegment = require('../models/ContactSegment');
const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const Property = require('../models/Property');
const User = require('../models/User');
const Activity = require('../models/Activity');
const communicationService = require('../services/communication.service');
const { branchScope, resolveBranchId, pick, getPagination } = require('../utils/controllerHelpers');

/**
 * Replace placeholders like {{name}}, {{property_title}}, etc.
 */
function interpolateVariables(content, data = {}) {
  if (!content) return '';
  return content
    .replace(/\{\{name\}\}/gi, data.name || data.full_name || 'Valued Client')
    .replace(/\{\{first_name\}\}/gi, data.first_name || (data.name ? data.name.split(' ')[0] : 'Client'))
    .replace(/\{\{email\}\}/gi, data.email || '')
    .replace(/\{\{phone\}\}/gi, data.primary_phone || data.phone || '')
    .replace(/\{\{property_title\}\}/gi, data.property_title || data.property?.title || 'Prime Dhaka Property')
    .replace(/\{\{property_price\}\}/gi, data.property_price || (data.property?.price ? '৳ ' + Number(data.property.price).toLocaleString('en-BD') : 'Guide Price on Request'))
    .replace(/\{\{property_area\}\}/gi, data.property_area || data.property?.area || 'Dhaka')
    .replace(/\{\{agent_name\}\}/gi, data.agent_name || 'Seventh Sky Advisory Desk')
    .replace(/\{\{agent_phone\}\}/gi, data.agent_phone || '+880 1711-223344')
    .replace(/\{\{agent_email\}\}/gi, data.agent_email || 'sales@seventhskyproperty.com')
    .replace(/\{\{view_link\}\}/gi, data.view_link || 'https://seventhskypropertycare.com/properties')
    .replace(/\{\{unsubscribe_link\}\}/gi, data.unsubscribe_link || 'https://seventhskypropertycare.com/preferences');
}

// ────────────────────────────────────────────────────────────
//  TEMPLATES
// ────────────────────────────────────────────────────────────

exports.listTemplates = async (req, res) => {
  try {
    const { category, channel, search } = req.query;
    const where = { is_active: true };

    if (category && category !== 'all') where.category = category;
    if (channel && channel !== 'all') {
      where.channel = { [Op.in]: [channel, 'any'] };
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { template_code: { [Op.like]: `%${search}%` } },
      ];
    }

    const templates = await MarketingTemplate.findAll({
      where,
      order: [['is_system', 'DESC'], ['id', 'ASC']]
    });

    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const tpl = await MarketingTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const branch_id = resolveBranchId(req);
    const code = req.body.template_code || `TPL-CUSTOM-${Date.now().toString().slice(-6)}`;
    const tpl = await MarketingTemplate.create({
      ...req.body,
      branch_id,
      template_code: code,
      is_system: false,
      created_by: req.user?.id || 1
    });
    res.status(201).json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const tpl = await MarketingTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    
    const allowed = ['name', 'category', 'channel', 'subject', 'preheader', 'headline', 'body_html', 'body_text', 'thumbnail_url', 'tags', 'is_active'];
    await tpl.update(pick(req.body, allowed));
    res.json(tpl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const tpl = await MarketingTemplate.findByPk(req.params.id);
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    if (tpl.is_system) {
      return res.status(400).json({ error: 'System templates cannot be deleted, but can be deactivated or edited.' });
    }
    await tpl.destroy();
    res.json({ success: true, message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.previewTemplate = async (req, res) => {
  try {
    const { body_html, subject, preheader, recipient = {}, property_id } = req.body;
    let propData = {};
    if (property_id) {
      const prop = await Property.findByPk(property_id);
      if (prop) propData = prop.toJSON();
    }

    const mergeData = {
      ...recipient,
      property: propData,
      property_title: propData.title,
      property_price: propData.price ? '৳ ' + Number(propData.price).toLocaleString('en-BD') : undefined,
      property_area: propData.area,
      agent_name: req.user?.name || 'Seventh Sky Property Care',
      agent_email: req.user?.email || 'sales@seventhskyproperty.com',
      agent_phone: req.user?.phone || '+880 1711-223344'
    };

    const renderedHtml = interpolateVariables(body_html || '', mergeData);
    const renderedSubject = interpolateVariables(subject || '', mergeData);

    res.json({
      rendered_subject: renderedSubject,
      rendered_html: renderedHtml,
      merge_data: mergeData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────
//  CAMPAIGNS
// ────────────────────────────────────────────────────────────

exports.listCampaigns = async (req, res) => {
  try {
    const { channel, status, search } = req.query;
    const where = branchScope(req);

    if (channel && channel !== 'all') where.channel = channel;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { subject: { [Op.like]: `%${search}%` } },
        { campaign_code: { [Op.like]: `%${search}%` } }
      ];
    }

    const campaigns = await MarketingCampaign.findAll({
      where,
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] },
        { model: Property, as: 'property', attributes: ['id', 'title', 'price', 'property_code'] },
        { model: MarketingTemplate, as: 'template', attributes: ['id', 'template_code', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findOne({
      where: { id: req.params.id, ...branchScope(req) },
      include: [
        { model: User, as: 'Creator', attributes: ['id', 'name', 'email'] },
        { model: Property, as: 'property' },
        { model: MarketingTemplate, as: 'template' }
      ]
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Include recent recipients
    const recipients = await MarketingCampaignRecipient.findAll({
      where: { campaign_id: campaign.id },
      limit: 100,
      order: [['id', 'ASC']]
    });

    res.json({ campaign, recipients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const branch_id = resolveBranchId(req);
    const campaign_code = `CMP-${Date.now().toString().slice(-6)}`;
    
    // Calculate targeted recipients count
    const targetInfo = await resolveRecipients(req.body.target_type, req.body.target_filter, branch_id, req.body.channel);
    
    const campaign = await MarketingCampaign.create({
      ...req.body,
      branch_id,
      campaign_code,
      recipient_count: targetInfo.length,
      status: req.body.scheduled_at ? 'scheduled' : 'draft',
      created_by: req.user?.id || 1
    });

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Dispatch Campaign
 */
exports.sendCampaign = async (req, res) => {
  try {
    const campaign = await MarketingCampaign.findOne({
      where: { id: req.params.id, ...branchScope(req) },
      include: [{ model: Property, as: 'property' }]
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'completed' || campaign.status === 'sending') {
      return res.status(400).json({ error: `Campaign already ${campaign.status}` });
    }

    const recipients = await resolveRecipients(campaign.target_type, campaign.target_filter, campaign.branch_id, campaign.channel);
    if (!recipients.length) {
      return res.status(400).json({ error: 'No matching recipients found for the target criteria.' });
    }

    // Update campaign status
    await campaign.update({
      status: 'sending',
      started_at: new Date(),
      recipient_count: recipients.length
    });

    // Create recipient records
    const recipientRows = recipients.map(r => ({
      campaign_id: campaign.id,
      contact_id: r.contact_id || null,
      lead_id: r.lead_id || null,
      recipient_name: r.name,
      recipient_destination: campaign.channel === 'email' ? r.email : (r.phone || r.whatsapp),
      channel: campaign.channel === 'multi_channel' ? (r.email ? 'email' : 'sms') : campaign.channel,
      status: 'queued'
    })).filter(r => !!r.recipient_destination);

    await MarketingCampaignRecipient.bulkCreate(recipientRows);

    // Run dispatch asynchronously in background
    executeCampaignDispatch(campaign, recipients, req.user).catch(err => {
      console.error('[MARKETING_DISPATCH] Async error:', err);
    });

    res.json({
      success: true,
      message: `Campaign dispatch started for ${recipientRows.length} recipients in background.`,
      campaign
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Quick Direct Broadcast (Ad-hoc Email / SMS / WhatsApp)
 */
exports.quickBroadcast = async (req, res) => {
  try {
    const branch_id = resolveBranchId(req);
    const {
      channel = 'email',
      subject,
      headline,
      body_html,
      body_text,
      target_type = 'selected_contacts',
      target_filter = {},
      contact_ids = [],
      property_id
    } = req.body;

    let recipients = [];
    if (target_type === 'selected_contacts' && Array.isArray(contact_ids) && contact_ids.length > 0) {
      const contacts = await Contact.findAll({
        where: { id: { [Op.in]: contact_ids }, branch_id }
      });
      recipients = contacts.map(c => ({
        contact_id: c.id,
        name: c.full_name,
        email: c.email,
        phone: c.primary_phone,
        whatsapp: c.whatsapp,
        do_not_email: c.do_not_email,
        do_not_sms: c.do_not_sms
      }));
    } else {
      recipients = await resolveRecipients(target_type, target_filter, branch_id, channel);
    }

    if (!recipients.length) {
      return res.status(400).json({ error: 'No matching recipients found for broadcast.' });
    }

    const campaign_code = `BRD-${Date.now().toString().slice(-6)}`;
    const campaign = await MarketingCampaign.create({
      branch_id,
      campaign_code,
      name: `Direct Broadcast: ${subject || headline || channel.toUpperCase()}`,
      channel,
      campaign_type: 'general',
      property_id: property_id || null,
      subject,
      body_html,
      body_text,
      target_type,
      target_filter: { ...target_filter, contact_ids },
      recipient_count: recipients.length,
      status: 'sending',
      started_at: new Date(),
      created_by: req.user?.id || 1
    });

    // Create recipients
    const recipientRows = recipients.map(r => ({
      campaign_id: campaign.id,
      contact_id: r.contact_id || null,
      lead_id: r.lead_id || null,
      recipient_name: r.name,
      recipient_destination: channel === 'email' ? r.email : (r.phone || r.whatsapp),
      channel: channel === 'multi_channel' ? (r.email ? 'email' : 'sms') : channel,
      status: 'queued'
    })).filter(r => !!r.recipient_destination);

    await MarketingCampaignRecipient.bulkCreate(recipientRows);

    // If channel is WhatsApp and user requested direct WhatsApp Web fast dispatch URLs:
    let whatsappQueue = [];
    if (channel === 'whatsapp') {
      whatsappQueue = recipients.map(r => {
        const dest = (r.whatsapp || r.phone || '').replace(/[^0-9]/g, '');
        const text = interpolateVariables(body_text || body_html || '', {
          name: r.name,
          agent_name: req.user?.name,
          agent_phone: req.user?.phone
        });
        const waUrl = dest ? `https://web.whatsapp.com/send?phone=${dest}&text=${encodeURIComponent(text)}` : null;
        return {
          contact_id: r.contact_id,
          name: r.name,
          phone: dest,
          preview_text: text,
          whatsapp_url: waUrl
        };
      });
    }

    // Execute background dispatch
    executeCampaignDispatch(campaign, recipients, req.user).catch(err => {
      console.error('[BROADCAST_DISPATCH] Async error:', err);
    });

    res.json({
      success: true,
      message: `Broadcast initiated for ${recipientRows.length} recipients.`,
      campaign_id: campaign.id,
      recipient_count: recipientRows.length,
      whatsapp_queue: whatsappQueue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Send Test Email / SMS to Current User or Specific Destination
 */
exports.testSend = async (req, res) => {
  try {
    const { channel = 'email', destination, subject = 'Test Message', body_html, body_text } = req.body;
    const dest = destination || (channel === 'email' ? req.user?.email : req.user?.phone);

    if (!dest) {
      return res.status(400).json({ error: 'Destination email or phone is required for test send.' });
    }

    const testMerge = {
      name: req.user?.name || 'Valued Partner',
      agent_name: req.user?.name || 'Seventh Sky Advisor',
      agent_phone: req.user?.phone || '+880 1711-223344',
      agent_email: req.user?.email || 'admin@seventhskyproperty.com',
      property_title: 'The Sky Residence · Road 71, Gulshan 2',
      property_price: '৳ 16.50 Crore',
      property_area: 'Gulshan 2, Dhaka'
    };

    const parsedSubject = `[TEST] ${interpolateVariables(subject, testMerge)}`;
    const parsedBody = interpolateVariables(body_html || body_text || '', testMerge);
    const parsedText = interpolateVariables(body_text || body_html || '', testMerge);

    let result = { success: false };
    if (channel === 'email') {
      result = await communicationService.sendEmail(dest, parsedSubject, parsedBody);
    } else {
      result = await communicationService.sendSMS(dest, parsedText.substring(0, 160));
    }

    res.json({
      success: result.success,
      destination: dest,
      channel,
      message: result.message || 'Test dispatch executed successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────
//  AUDIENCE & SEGMENTS
// ────────────────────────────────────────────────────────────

exports.getAudienceCount = async (req, res) => {
  try {
    const branch_id = resolveBranchId(req);
    const { target_type = 'all_contacts', target_filter = {}, channel = 'email' } = req.body;
    const recipients = await resolveRecipients(target_type, target_filter, branch_id, channel);

    const withEmail = recipients.filter(r => !!r.email && !r.do_not_email).length;
    const withPhone = recipients.filter(r => !!r.phone && !r.do_not_sms).length;
    const withWhatsApp = recipients.filter(r => !!r.whatsapp || (!!r.phone && !r.do_not_sms)).length;

    res.json({
      total: recipients.length,
      reachable: channel === 'email' ? withEmail : (channel === 'whatsapp' ? withWhatsApp : withPhone),
      with_email: withEmail,
      with_phone: withPhone,
      with_whatsapp: withWhatsApp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listSegments = async (req, res) => {
  try {
    const segments = await ContactSegment.findAll({
      where: branchScope(req),
      order: [['name', 'ASC']]
    });
    res.json(segments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSegment = async (req, res) => {
  try {
    const branch_id = resolveBranchId(req);
    const segment = await ContactSegment.create({
      ...req.body,
      branch_id,
      created_by: req.user?.id || 1
    });
    res.status(201).json(segment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSegment = async (req, res) => {
  try {
    await ContactSegment.destroy({
      where: { id: req.params.id, ...branchScope(req) }
    });
    res.json({ success: true, message: 'Segment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────
//  ANALYTICS & LOGS
// ────────────────────────────────────────────────────────────

exports.getAnalytics = async (req, res) => {
  try {
    const scope = branchScope(req);
    const totalCampaigns = await MarketingCampaign.count({ where: scope });
    const totalSent = await MarketingCampaign.sum('sent_count', { where: scope }) || 0;
    const totalDelivered = await MarketingCampaign.sum('delivered_count', { where: scope }) || 0;
    const totalOpened = await MarketingCampaign.sum('opened_count', { where: scope }) || 0;
    const totalClicked = await MarketingCampaign.sum('clicked_count', { where: scope }) || 0;

    const emailCount = await MarketingCampaign.count({ where: { ...scope, channel: 'email' } });
    const smsCount = await MarketingCampaign.count({ where: { ...scope, channel: 'sms' } });
    const waCount = await MarketingCampaign.count({ where: { ...scope, channel: 'whatsapp' } });

    res.json({
      total_campaigns: totalCampaigns,
      total_sent: totalSent,
      total_delivered: totalDelivered,
      total_opened: totalOpened,
      total_clicked: totalClicked,
      delivery_rate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '100.0',
      open_rate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0.0',
      channel_distribution: { email: emailCount, sms: smsCount, whatsapp: waCount }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOutboxLogs = async (req, res) => {
  try {
    const { campaign_id, channel, status } = req.query;
    const where = {};
    if (campaign_id) where.campaign_id = campaign_id;
    if (channel && channel !== 'all') where.channel = channel;
    if (status && status !== 'all') where.status = status;

    const logs = await MarketingCampaignRecipient.findAll({
      where,
      limit: 100,
      order: [['created_at', 'DESC']]
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.autoDraftForProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const force = req.body?.force === true;
    const { autoDraftListingCampaign } = require('../services/marketingCampaignDraft.service');
    const result = await autoDraftListingCampaign(propertyId, req.user, { forceRegenerate: force });
    if (!result.campaign) {
      return res.status(404).json({ error: result.error || 'Property not found or drafting failed' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ────────────────────────────────────────────────────────────

async function resolveRecipients(target_type, target_filter = {}, branch_id, channel) {
  let list = [];

  if (target_type === 'selected_contacts' && Array.isArray(target_filter.contact_ids)) {
    const contacts = await Contact.findAll({
      where: { id: { [Op.in]: target_filter.contact_ids }, branch_id }
    });
    list = contacts.map(c => ({
      contact_id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.primary_phone,
      whatsapp: c.whatsapp,
      do_not_email: c.do_not_email,
      do_not_sms: c.do_not_sms
    }));
  } else if (target_type === 'buyers') {
    const contacts = await Contact.findAll({
      where: {
        branch_id,
        [Op.or]: [
          { tags: { [Op.like]: '%buyer%' } },
          { tags: { [Op.like]: '%investor%' } },
          { is_client: true }
        ]
      }
    });
    list = contacts.map(c => ({
      contact_id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.primary_phone,
      whatsapp: c.whatsapp,
      do_not_email: c.do_not_email,
      do_not_sms: c.do_not_sms
    }));
  } else if (target_type === 'sellers') {
    const contacts = await Contact.findAll({
      where: {
        branch_id,
        [Op.or]: [
          { tags: { [Op.like]: '%vendor%' } },
          { tags: { [Op.like]: '%seller%' } },
          { tags: { [Op.like]: '%owner%' } }
        ]
      }
    });
    list = contacts.map(c => ({
      contact_id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.primary_phone,
      whatsapp: c.whatsapp,
      do_not_email: c.do_not_email,
      do_not_sms: c.do_not_sms
    }));
  } else if (target_type === 'nrb_investors') {
    const contacts = await Contact.findAll({
      where: { branch_id, is_nrb: true }
    });
    list = contacts.map(c => ({
      contact_id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.primary_phone,
      whatsapp: c.whatsapp,
      do_not_email: c.do_not_email,
      do_not_sms: c.do_not_sms
    }));
  } else if (target_type === 'leads') {
    const leads = await Lead.findAll({ where: { branch_id } });
    list = leads.map(l => ({
      lead_id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      whatsapp: l.phone,
      do_not_email: false,
      do_not_sms: false
    }));
  } else {
    // Default: all_contacts
    const contacts = await Contact.findAll({ where: { branch_id, status: 'active' } });
    list = contacts.map(c => ({
      contact_id: c.id,
      name: c.full_name,
      email: c.email,
      phone: c.primary_phone,
      whatsapp: c.whatsapp,
      do_not_email: c.do_not_email,
      do_not_sms: c.do_not_sms
    }));
  }

  // Filter out opt-outs based on channel
  return list.filter(r => {
    if (channel === 'email' && r.do_not_email) return false;
    if ((channel === 'sms' || channel === 'whatsapp') && r.do_not_sms) return false;
    return true;
  });
}

/**
 * Background Dispatch Runner
 */
async function executeCampaignDispatch(campaign, recipients, actor = {}) {
  let sentCount = 0;
  let deliveredCount = 0;
  let failedCount = 0;

  for (const r of recipients) {
    const channel = campaign.channel === 'multi_channel' ? (r.email ? 'email' : 'sms') : campaign.channel;
    const dest = channel === 'email' ? r.email : (r.phone || r.whatsapp);

    if (!dest) {
      failedCount++;
      continue;
    }

    const mergeData = {
      name: r.name,
      email: r.email,
      phone: r.phone,
      property_title: campaign.property?.title,
      property_price: campaign.property?.price ? '৳ ' + Number(campaign.property.price).toLocaleString('en-BD') : undefined,
      property_area: campaign.property?.area,
      agent_name: actor.name || 'Seventh Sky Property Care',
      agent_phone: actor.phone || '+880 1711-223344',
      agent_email: actor.email || 'sales@seventhskyproperty.com'
    };

    const subject = interpolateVariables(campaign.subject || campaign.name, mergeData);
    const bodyHtml = interpolateVariables(campaign.body_html || '', mergeData);
    const bodyText = interpolateVariables(campaign.body_text || campaign.body_html || '', mergeData);

    let dispatchRes = { success: false };

    try {
      if (channel === 'email') {
        dispatchRes = await communicationService.sendEmail(dest, subject, bodyHtml);
      } else {
        dispatchRes = await communicationService.sendSMS(dest, bodyText.substring(0, 160));
      }

      if (dispatchRes.success) {
        sentCount++;
        deliveredCount++;
        
        await MarketingCampaignRecipient.update({
          status: 'delivered',
          sent_at: new Date(),
          delivered_at: new Date()
        }, {
          where: { campaign_id: campaign.id, recipient_destination: dest }
        });

        // Log Activity in CRM timeline
        if (r.contact_id || r.lead_id) {
          await Activity.create({
            branch_id: campaign.branch_id,
            contact_id: r.contact_id || null,
            lead_id: r.lead_id || null,
            type: channel === 'email' ? 'email' : 'call',
            subject: `Campaign: ${campaign.name}`,
            description: `Sent via ${channel.toUpperCase()}: ${subject}`,
            due_date: new Date(),
            is_done: true,
            completed_at: new Date(),
            created_by: actor.id || 1
          }).catch(() => {});
        }
      } else {
        failedCount++;
        await MarketingCampaignRecipient.update({
          status: 'failed',
          error_message: dispatchRes.error || 'Failed to dispatch'
        }, {
          where: { campaign_id: campaign.id, recipient_destination: dest }
        });
      }
    } catch (err) {
      failedCount++;
      await MarketingCampaignRecipient.update({
        status: 'failed',
        error_message: err.message
      }, {
        where: { campaign_id: campaign.id, recipient_destination: dest }
      });
    }

    // Gentle throttle between messages
    await new Promise(res => setTimeout(res, 50));
  }

  await campaign.update({
    status: 'completed',
    completed_at: new Date(),
    sent_count: sentCount,
    delivered_count: deliveredCount,
    failed_count: failedCount
  });

  console.log(`[CAMPAIGN_${campaign.id}] Dispatched complete: ${deliveredCount} delivered, ${failedCount} failed.`);
}
