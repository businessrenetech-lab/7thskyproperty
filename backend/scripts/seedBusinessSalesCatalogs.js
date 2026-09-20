/**
 * Seed the BSS (Business Sale) + BPS (Business Purchase) service catalogues —
 * Schedule C of the Business Sale / Purchase Customer Service Agreements
 * (SSPC-BSS-01 / SSPC-BPS-01 v0.2). Verticals: sale_sale_business /
 * sale_purchase_business (scope 'business', distinct from residential/commercial).
 * Prices transcribed verbatim from Schedule C. Idempotent by code.
 *
 * Run from backend/: node scripts/seedBusinessSalesCatalogs.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const BSS_ITEMS = [
  ['BSS-001', 'Initial Business Sale Consultation', 'Session', 2500, 'fixed', 'fixed', null, {}],
  ['BSS-002', 'Business Sale Assessment', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BSS-003', 'Market Sale Assessment', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BSS-004', 'Business Preparation Coordination', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BSS-005', 'Professional Photography & Marketing Setup', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BSS-006', 'Online Marketing Campaign', 'Project', 12000, 'fixed', 'fixed', null, {}],
  ['BSS-007', 'Buyer Sourcing', 'Project', 20000, 'fixed', 'fixed', null, {}],
  ['BSS-008', 'Preliminary Buyer Screening', 'Buyer', 3000, 'fixed', 'fixed', null, {}],
  ['BSS-009', 'Business Inspection Coordination', 'Inspection', 2500, 'fixed', 'fixed', null, {}],
  ['BSS-010', 'Sale Negotiation Coordination', 'Project', 20000, 'fixed', 'fixed', null, {}],
  ['BSS-011', 'Due Diligence Coordination', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BSS-012', 'Sale Documentation Coordination', 'Project', 12000, 'fixed', 'fixed', null, {}],
  ['BSS-013', 'Settlement & Business Handover Coordination', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BSS-014', 'Ongoing Sale Management (if applicable)', 'Month', 8000, 'fixed', 'fixed', null, {}],
  ['BSS-015', 'Business Sale Success Fee', 'Project', 0, 'quote', 'percent', '2% of Sale Price or As Agreed', { percent: 2 }],
];

const BPS_ITEMS = [
  ['BPS-001', 'Initial Business Purchase Consultation', 'Session', 2500, 'fixed', 'fixed', null, {}],
  ['BPS-002', 'Buyer Requirement Assessment', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BPS-003', 'Business Search & Shortlisting', 'Project', 12000, 'fixed', 'fixed', null, {}],
  ['BPS-004', 'Market Opportunity Assessment', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BPS-005', 'Business Inspection Coordination', 'Inspection', 2500, 'fixed', 'fixed', null, {}],
  ['BPS-006', 'Seller Meeting Coordination', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BPS-007', 'Purchase Negotiation Coordination', 'Project', 20000, 'fixed', 'fixed', null, {}],
  ['BPS-008', 'Due Diligence Coordination', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BPS-009', 'Legal & Documentation Coordination', 'Project', 12000, 'fixed', 'fixed', null, {}],
  ['BPS-010', 'Settlement Coordination', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BPS-011', 'Post-Purchase Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BPS-012', 'Complete Business Acquisition Management', 'Project', 75000, 'quote', 'from', 'From 75,000', {}],
  ['BPS-013', 'Business Acquisition Success Fee', 'Project', 0, 'quote', 'percent', '2% of Purchase Price or As Agreed', { percent: 2 }],
];

const CATALOGS = [
  { vertical: 'sale_sale_business', cat_code: 'SVC-CAT-BSS', cat_name: 'Business Sale Services', slug: 'business-sale', group: 'bss', items: BSS_ITEMS },
  { vertical: 'sale_purchase_business', cat_code: 'SVC-CAT-BPS', cat_name: 'Business Purchase Services', slug: 'business-purchase', group: 'bps', items: BPS_ITEMS },
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
      await row.update({ name, unit, fee_model, base_price, tags, category_id: root.id, vertical, service_group: group, sort_order: sort - 1 });
      updated++;
    }
  }
  console.log(`${cat_code} seeded under category #${root.id}: created ${created}, updated ${updated} (of ${items.length}).`);
}

(async () => {
  for (const c of CATALOGS) await seedOne(c);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
