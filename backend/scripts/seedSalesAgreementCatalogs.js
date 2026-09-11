/**
 * Seed the RPPS (Purchase) + RPSS (Sale) service catalogues — Schedule C of the
 * Residential Property Purchase / Sale Service Agreements (SSPC-RPPS-01 /
 * SSPC-RPSS-01 v0.2). Idempotent by code. Standard prices live in
 * ServiceItem.base_price; special price formats (included / from / percent) are
 * encoded in tags.price_type — no schema change to the shared care_services table.
 *
 * Run from backend/: node scripts/seedSalesAgreementCatalogs.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const RPPS_ITEMS = [
  ['RPPS-001', 'Initial Property Consultation', 'Session', 2000, 'fixed', 'fixed', null, {}],
  ['RPPS-002', 'Property Requirement Assessment', 'Project', 3000, 'fixed', 'fixed', null, {}],
  ['RPPS-003', 'Property Search & Shortlisting', 'Project', 8000, 'quote', 'from', 'From 8,000', {}],
  ['RPPS-004', 'Market Research & Property Comparison', 'Project', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-005', 'Property Inspection Coordination', 'Inspection', 2000, 'quote', 'from', 'From 2,000', {}],
  ['RPPS-006', 'Seller Communication & Negotiation', 'Transaction', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-007', 'Offer Preparation & Submission', 'Transaction', 3000, 'quote', 'from', 'From 3,000', {}],
  ['RPPS-008', 'Documentation Coordination', 'Transaction', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-009', 'Settlement Coordination', 'Transaction', 8000, 'quote', 'from', 'From 8,000', {}],
  ['RPPS-010', 'Loan Assistance Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-011', 'Property Valuation / Survey Coordination', 'Project', 3000, 'quote', 'from', 'From 3,000', {}],
  ['RPPS-012', 'Relocation & Utility Coordination', 'Project', 3000, 'quote', 'from', 'From 3,000', {}],
  ['RPPS-013', 'Professional Success Fee (Optional)', 'Purchase', 0, 'quote', 'percent', '% of Purchase Price or As Agreed', { percent: null }],
];
const RPSS_ITEMS = [
  ['RPSS-001', 'Initial Property Consultation', 'Session', 2000, 'fixed', 'fixed', null, {}],
  ['RPSS-002', 'Property Assessment', 'Property', 3000, 'fixed', 'fixed', null, {}],
  ['RPSS-003', 'Market Appraisal', 'Property', 5000, 'fixed', 'fixed', null, {}],
  ['RPSS-004', 'Property Photography', 'Property', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPSS-005', 'Drone Photography & Videography', 'Property', 8000, 'quote', 'from', 'From 8,000', {}],
  ['RPSS-006', 'Property Listing & Marketing', 'Property', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPSS-007', 'Buyer Inspection Coordination', 'Inspection', 1500, 'quote', 'from', 'From 1,500', {}],
  ['RPSS-008', 'Open House Coordination', 'Event', 3000, 'quote', 'from', 'From 3,000', {}],
  ['RPSS-009', 'Negotiation & Offer Coordination', 'Transaction', 0, 'fixed', 'included', 'Included', {}],
  ['RPSS-010', 'Documentation Coordination', 'Transaction', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPSS-011', 'Settlement Coordination', 'Transaction', 8000, 'quote', 'from', 'From 8,000', {}],
  ['RPSS-012', 'Property Preparation / Styling Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPSS-013', 'Professional Sales Commission', 'Sale', 0, 'quote', 'percent', '% of Final Sale Price', { percent: null }],
];

const CATALOGS = [
  { vertical: 'sale_purchase', cat_code: 'SVC-CAT-RPPS', cat_name: 'Residential Property Purchase Services', slug: 'residential-purchase', group: 'rpps', items: RPPS_ITEMS },
  { vertical: 'sale_sale', cat_code: 'SVC-CAT-RPSS', cat_name: 'Residential Property Sale Services', slug: 'residential-sale', group: 'rpss', items: RPSS_ITEMS },
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
