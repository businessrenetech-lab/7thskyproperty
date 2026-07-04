const MarketingActivity = require('../models/MarketingActivity');
const Property = require('../models/Property');
const Contact = require('../models/Contact');
const { makeController } = require('./propertyControlCrud');

module.exports = makeController({
  Model: MarketingActivity,
  codeField: 'marketing_code',
  codePrefix: 'SSPC-MKT-',
  fields: ['property_id', 'owner_contact_id', 'channel', 'asset_task', 'start_date', 'end_date', 'budget', 'status', 'enquiries_generated', 'inspections_booked', 'next_action', 'notes'],
  searchFields: ['marketing_code', 'channel', 'asset_task', 'next_action', 'notes'],
  include: [
    { model: Property, as: 'property', attributes: ['id', 'property_code', 'title', 'area', 'district'] },
    { model: Contact, as: 'owner', attributes: ['id', 'full_name', 'primary_phone', 'email'] },
  ],
});
