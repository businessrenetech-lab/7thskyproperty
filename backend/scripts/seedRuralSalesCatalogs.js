/**
 * Seed the RLPSS (Sale) + RLPPS (Purchase) service catalogues — Schedule C of the
 * Rural Property Sale / Purchase Service Agreements (SSPC-RLPSS-01 /
 * SSPC-RLPPS-01 v0.2). Verticals: sale_sale_rural / sale_purchase_rural.
 *
 * CODE COLLISION, deliberate: both rural V0.2 documents print their Schedule C
 * codes as RPSS-001..010 and RPPS-001..010 — the SAME codes the RESIDENTIAL
 * catalogue already uses on verticals sale_sale / sale_purchase, for different
 * services. The codes are kept as the signed documents print them, so a printed
 * Schedule C matches the paper, and this seed therefore matches on
 * (code, vertical) rather than on code alone. The commercial and business seeds
 * match on code alone; running that pattern here would have found the residential
 * rows and moved them onto a rural vertical.
 *
 * Idempotent. Run from backend/: node scripts/seedRuralSalesCatalogs.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
// Verbatim from Schedule C of each agreement; prices are "From" figures in line
// with the commercial and business catalogues, as the documents print "From"
// with the amount left blank for the branch to set.
const RLPSS_ITEMS = [
  ['RPSS-001', 'Initial Consultation', 'Session', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPSS-002', 'Property Assessment & Sale Strategy', 'Engagement', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPSS-003', 'Property Preparation Coordination', 'Engagement', 15000, 'quote', 'from', 'From 15,000', {}],
  ['RPSS-004', 'Marketing & Promotion', 'Campaign', 25000, 'quote', 'from', 'From 25,000', {}],
  ['RPSS-005', 'Buyer Management', 'Engagement', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPSS-006', 'Negotiation Support', 'Transaction', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPSS-007', 'Documentation & Settlement Coordination', 'Transaction', 15000, 'quote', 'from', 'From 15,000', {}],
  ['RPSS-008', 'Exclusive Sale Engagement', 'Engagement', 20000, 'quote', 'from', 'From 20,000', {}],
  ['RPSS-009', 'Sales Commission', 'Transaction', 0, 'quote', 'percent', '% of Final Sale Price or As Agreed', { percent: null }],
  ['RPSS-010', 'Additional Services', 'Hour', 2000, 'quote', 'from', 'From 2,000', {}],
];
const RLPPS_ITEMS = [
  ['RPPS-001', 'Initial Consultation', 'Session', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-002', 'Property Requirement Assessment', 'Session', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-003', 'Rural Property Search', 'Engagement', 15000, 'quote', 'from', 'From 15,000', {}],
  ['RPPS-004', 'Property Inspection Coordination', 'Inspection', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPPS-005', 'Negotiation Support', 'Transaction', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPPS-006', 'Documentation Coordination', 'Transaction', 10000, 'quote', 'from', 'From 10,000', {}],
  ['RPPS-007', 'Settlement Coordination', 'Transaction', 15000, 'quote', 'from', 'From 15,000', {}],
  ['RPPS-008', 'Professional Coordination', 'Engagement', 12000, 'quote', 'from', 'From 12,000', {}],
  ['RPPS-009', 'Success Fee', 'Transaction', 0, 'quote', 'percent', '% of Purchase Price or As Agreed', { percent: null }],
  ['RPPS-010', 'Additional Services', 'Hour', 2000, 'quote', 'from', 'From 2,000', {}],
];

const CATALOGS = [
  { vertical: 'sale_purchase_rural', cat_code: 'SVC-CAT-RLPPS', cat_name: 'Rural Property Purchase Services', slug: 'rural-purchase', group: 'rlpps', items: RLPPS_ITEMS },
  { vertical: 'sale_sale_rural', cat_code: 'SVC-CAT-RLPSS', cat_name: 'Rural Property Sale Services', slug: 'rural-sale', group: 'rlpss', items: RLPSS_ITEMS },
];

async function seedOne({ vertical, cat_code, cat_name, slug, group, items }) {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: cat_code },
    defaults: { branch_id: BRANCH, vertical, name: cat_name, code: cat_code, slug, icon: 'FileSignature', sort_order: 0 },
  });
  let created = 0; let updated = 0; let sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label, extra] of items) {
    const tags = { price_type, ...(price_label ? { price_label } : {}), ...extra, schedule: 'C' };
    // (code, vertical) — see the header: these codes are shared with residential.
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code, vertical },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical, name, code,
        service_group: group, fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['sales'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) { created += 1; } else {
      await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical, service_group: group, sort_order: sort - 1 });
      updated += 1;
      sort += 1;
    }
  }
  console.log(`${cat_code} seeded under category #${root.id}: created ${created}, updated ${updated} (of ${items.length}).`);
}

module.exports = { RLPSS_ITEMS, RLPPS_ITEMS, CATALOGS };

if (require.main === module) {
  (async () => {
    for (const c of CATALOGS) await seedOne(c);
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
