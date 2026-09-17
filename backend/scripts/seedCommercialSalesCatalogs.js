/**
 * Seed the CPPS (Purchase) + CPSS (Sale) service catalogues — Schedule C of the
 * Commercial Property Purchase / Sale Service Agreements (SSPC-CPPS-01 /
 * SSPC-CPSS-01 v0.2). Verticals: sale_purchase_commercial / sale_sale_commercial
 * (distinct from the residential sale_purchase / sale_sale). Idempotent by code.
 *
 * Run from backend/: node scripts/seedCommercialSalesCatalogs.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const CPPS_ITEMS = [
  ['CPPS-001', 'Buyer Consultation', 'Session', 5000, 'quote', 'from', 'From 5,000', {}],
  ['CPPS-002', 'Commercial Property Search', 'Engagement', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPPS-003', 'Property Inspection Coordination', 'Inspection', 5000, 'quote', 'from', 'From 5,000', {}],
  ['CPPS-004', 'Due Diligence Coordination', 'Engagement', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPPS-005', 'Negotiation Support', 'Engagement', 10000, 'quote', 'from', 'From 10,000', {}],
  ['CPPS-006', 'Purchase Documentation Coordination', 'Transaction', 10000, 'quote', 'from', 'From 10,000', {}],
  ['CPPS-007', 'Settlement Coordination', 'Transaction', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPPS-008', 'Success Fee / Commission', 'Transaction', 0, 'quote', 'percent', '% of Purchase Price or As Agreed', { percent: null }],
  ['CPPS-009', 'Additional Services', 'Hour', 2000, 'quote', 'from', 'From 2,000', {}],
];
const CPSS_ITEMS = [
  ['CPSS-001', 'Initial Consultation', 'Session', 5000, 'quote', 'from', 'From 5,000', {}],
  ['CPSS-002', 'Commercial Property Assessment', 'Assessment', 10000, 'quote', 'from', 'From 10,000', {}],
  ['CPSS-003', 'Property Preparation Coordination', 'Project', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPSS-004', 'Marketing & Promotion', 'Campaign', 25000, 'quote', 'from', 'From 25,000', {}],
  ['CPSS-005', 'Buyer Management', 'Engagement', 10000, 'quote', 'from', 'From 10,000', {}],
  ['CPSS-006', 'Documentation & Settlement Coordination', 'Transaction', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPSS-007', 'Commission / Success Fee', 'Transaction', 0, 'quote', 'percent', '% of Final Sale Price or As Agreed', { percent: null }],
  ['CPSS-008', 'Additional Services', 'Hour', 2000, 'quote', 'from', 'From 2,000', {}],
];

const CATALOGS = [
  { vertical: 'sale_purchase_commercial', cat_code: 'SVC-CAT-CPPS', cat_name: 'Commercial Property Purchase Services', slug: 'commercial-purchase', group: 'cpps', items: CPPS_ITEMS },
  { vertical: 'sale_sale_commercial', cat_code: 'SVC-CAT-CPSS', cat_name: 'Commercial Property Sale Services', slug: 'commercial-sale', group: 'cpss', items: CPSS_ITEMS },
];

async function seedOne({ vertical, cat_code, cat_name, slug, group, items }) {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: cat_code },
    defaults: { branch_id: BRANCH, vertical, name: cat_name, code: cat_code, slug, icon: 'FileSignature', sort_order: 0 },
  });
  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label, extra] of items) {
    const tags = { price_type, ...(price_label ? { price_label } : {}), ...extra, schedule: 'C' };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical, name, code,
        service_group: group, fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['sales'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) { created++; }
    else {
      await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical, service_group: group, sort_order: sort - 1 });
      updated++;
    }
  }
  console.log(`${cat_code} seeded under category #${root.id}: created ${created}, updated ${updated} (of ${items.length}).`);
}

(async () => {
  for (const c of CATALOGS) await seedOne(c);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
