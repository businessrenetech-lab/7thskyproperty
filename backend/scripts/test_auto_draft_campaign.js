'use strict';
require('dotenv').config();
const sequelize = require('../config/db.config');
const Property = require('../models/Property');
const MarketingCampaign = require('../models/MarketingCampaign');
const { autoDraftListingCampaign } = require('../services/marketingCampaignDraft.service');

async function test() {
  console.log('--- Testing Auto-Draft Campaign for Newly Listed Property ---');
  await sequelize.authenticate();
  console.log('DB connected.');

  // Find an available/listed property or latest property
  let property = await Property.findOne({
    where: { listing_type: 'sale' },
    order: [['created_at', 'DESC']]
  });

  if (!property) {
    property = await Property.findOne({ order: [['created_at', 'DESC']] });
  }

  if (!property) {
    console.log('No property found in DB to test. Creating a sample property...');
    property = await Property.create({
      branch_id: 1,
      property_code: 'SSPC-PR-TEST99',
      title: 'Grand Lakefront Duplex Penthouse',
      category: 'residential',
      listing_type: 'sale',
      status: 'available',
      price: 55000000.00,
      currency: 'BDT',
      is_negotiable: true,
      address: 'Plot 12, Road 45',
      area: 'Gulshan-2',
      city: 'Dhaka',
      bedrooms: 5,
      bathrooms: 6,
      parking: 3,
      building_size: '4,850 Sft',
      floor_number: '12',
      total_floors: '14',
      furnishing: 'furnished',
      description: 'An architectural crown jewel in Gulshan-2 overlooking the serene lake, featuring private elevator access, double-height ceilings, and Italian marble finishes throughout.',
      is_published: true
    });
    console.log('Created sample property ID:', property.id);
  } else {
    console.log('Found property ID:', property.id, 'Title:', property.title, 'Area:', property.area);
  }

  // Test drafting a campaign
  const res = await autoDraftListingCampaign(property, { name: 'Sajid Al-Mamun', phone: '+880 1711-234567', email: 'sajid@seventhskyproperty.com' }, { forceRegenerate: true });
  console.log('Draft Result Success:', !res.error);
  console.log('Campaign ID:', res.campaign?.id);
  console.log('Campaign Name:', res.campaign?.name);
  console.log('Campaign Code:', res.campaign?.campaign_code);
  console.log('Subject:', res.campaign?.subject);
  console.log('Preheader:', res.campaign?.preheader);
  console.log('Recipient Count:', res.campaign?.recipient_count);
  console.log('HTML Length:', res.campaign?.body_html?.length);
  console.log('HTML contains SEVENTH SKY PROPERTIES:', res.campaign?.body_html?.includes('SEVENTH SKY PROPERTIES'));
  console.log('HTML contains property title:', res.campaign?.body_html?.includes(property.title));
  console.log('HTML contains price:', res.campaign?.body_html?.includes('৳'));
  console.log('HTML contains Book Private Inspection:', res.campaign?.body_html?.includes('Book Private Inspection'));

  process.exit(0);
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
