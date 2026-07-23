/**
 * Seed the Water Tank Cleaning & Maintenance service catalog (reference vertical),
 * mirroring the scope in SOP - Water Tank CM. Idempotent by code.
 * Default: Seventh Sky takes 20% fee, provider gets the remainder.
 */
require('dotenv').config();
const sequelize = require('../config/db.config');
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const VERTICAL = 'water_tank';
const BRANCH = 1;

// group → [services]. Each service: [name, fee_model, base_price, unit]
const TREE = {
  'Residential Services': { group: 'residential', services: [
    ['Rooftop Water Tank Cleaning', 'fixed', 3500, 'per tank'],
    ['Underground Water Tank Cleaning', 'fixed', 5000, 'per tank'],
    ['Apartment Water Tank Cleaning', 'quote', 0, 'per building'],
    ['House Water Tank Cleaning', 'fixed', 3000, 'per tank'],
    ['Tank Sanitisation', 'fixed', 2000, 'per tank'],
    ['Bacteria & Algae Treatment', 'fixed', 2500, 'per tank'],
    ['Water Tank Inspection', 'fixed', 1500, 'per visit'],
    ['Tank Maintenance', 'quote', 0, 'per visit'],
  ] },
  'Commercial Services': { group: 'commercial', services: [
    ['Commercial Building Tank Cleaning', 'quote', 0, 'per building'],
    ['Hotel Water Tank Cleaning', 'quote', 0, 'per site'],
    ['Restaurant Water Tank Cleaning', 'quote', 0, 'per site'],
    ['School Water Tank Cleaning', 'quote', 0, 'per site'],
    ['Hospital Water Tank Cleaning', 'quote', 0, 'per site'],
    ['Factory Water Tank Cleaning', 'quote', 0, 'per site'],
    ['Warehouse Water Tank Cleaning', 'quote', 0, 'per site'],
  ] },
  'Repair Services': { group: 'repair', services: [
    ['Crack Repair', 'quote', 0, 'per job'],
    ['Leakage Repair', 'quote', 0, 'per job'],
    ['Valve Replacement', 'fixed', 1200, 'per valve'],
    ['Pipe Repair', 'quote', 0, 'per job'],
    ['Waterproofing', 'quote', 0, 'per job'],
    ['Structural Reinforcement', 'quote', 0, 'per job'],
  ] },
  'Water Quality Services': { group: 'water_quality', services: [
    ['Water Testing', 'fixed', 2500, 'per sample'],
    ['Water Treatment', 'quote', 0, 'per job'],
    ['Filtration Systems', 'quote', 0, 'per system'],
    ['Water Purification', 'quote', 0, 'per system'],
  ] },
  'AMC Services': { group: 'amc', services: [
    ['Residential AMC', 'amc', 12000, 'per year'],
    ['Commercial AMC', 'amc', 0, 'per year'],
  ] },
};

(async () => {
  // Root vertical category
  let [root] = await ServiceCategory.findOrCreate({
    where: { code: 'SVC-CAT-WATERTANK' },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Water Tank Cleaning & Maintenance', code: 'SVC-CAT-WATERTANK', slug: 'water-tank', icon: 'Droplet', sort_order: 0 },
  });

  let catN = 0, svcN = 0, sort = 0;
  for (const [groupName, def] of Object.entries(TREE)) {
    const code = 'SVC-CAT-WT-' + def.group.toUpperCase();
    const [cat, created] = await ServiceCategory.findOrCreate({
      where: { code },
      defaults: { branch_id: BRANCH, parent_id: root.id, vertical: VERTICAL, name: groupName, code, slug: def.group, sort_order: sort++ },
    });
    if (created) catN++;
    let ssort = 0;
    for (const [name, fee_model, base_price, unit] of def.services) {
      const scode = 'SVC-WT-' + name.replace(/[^a-z0-9]+/gi, '-').toUpperCase().slice(0, 30);
      const [, sCreated] = await ServiceItem.findOrCreate({
        where: { code: scode },
        defaults: {
          branch_id: BRANCH, category_id: cat.id, vertical: VERTICAL, name, code: scode,
          service_group: def.group, fee_model, base_price, unit,
          sspc_fee_type: 'percentage', sspc_fee_value: 20, provider_pay_type: 'remainder', provider_pay_value: 0,
          delivery_mode: 'either', applicable_to: ['property_management', 'standalone'],
          requires_site_assessment: def.group === 'commercial' || def.group === 'repair',
          sort_order: ssort++,
        },
      });
      if (sCreated) svcN++;
    }
  }
  console.log(`Water tank catalog seeded: categories +${catN}, services +${svcN}`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
