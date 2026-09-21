/**
 * Seed the BRM (Business Rental Management) + BTM (Business Tenancy Management)
 * service catalogues — Schedule C of SSPC-BRMS-01 / SSPC-BTMS-01 v0.2.
 * Verticals: rent_rental_business / rent_tenancy_business (scope 'business_rent').
 * Prices transcribed verbatim from Schedule C. Idempotent by code.
 *
 * Run from backend/: node scripts/seedBusinessRentCatalogs.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const BRM_ITEMS = [
  ['BRM-001', 'Initial Business Rental Consultation', 'Session', 2500, 'fixed', 'fixed', null, {}],
  ['BRM-002', 'Business Rental Assessment', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BRM-003', 'Market Rental Assessment', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BRM-004', 'Business Preparation Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRM-005', 'Photography & Marketing Setup', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRM-006', 'Online Marketing Campaign', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BRM-007', 'Tenant Sourcing', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BRM-008', 'Preliminary Tenant Screening', 'Applicant', 2500, 'fixed', 'fixed', null, {}],
  ['BRM-009', 'Property Inspection Coordination', 'Inspection', 2000, 'fixed', 'fixed', null, {}],
  ['BRM-010', 'Lease Negotiation Coordination', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BRM-011', 'Lease Documentation Coordination', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BRM-012', 'Business Handover Coordination', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BRM-013', 'Ongoing Rental Management', 'Month', 5000, 'quote', 'percent', '5% of Monthly Rent (Min ৳5,000)', { percent: 5 }],
  ['BRM-014', 'Lease Renewal Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRM-015', 'Exit Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRM-016', 'Business Leasing Success Fee', 'Project', 0, 'quote', 'percent', "One Month's Rent or As Agreed", {}],
];

const BTM_ITEMS = [
  ['BTM-001', 'Initial Business Leasing Consultation', 'Session', 2500, 'fixed', 'fixed', null, {}],
  ['BTM-002', 'Business Requirement Assessment', 'Project', 3500, 'fixed', 'fixed', null, {}],
  ['BTM-003', 'Commercial Property Search', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BTM-004', 'Property Shortlisting', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BTM-005', 'Property Inspection Coordination', 'Inspection', 2000, 'fixed', 'fixed', null, {}],
  ['BTM-006', 'Lease Negotiation', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BTM-007', 'Letter of Offer Coordination', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BTM-008', 'Lease Documentation Coordination', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BTM-009', 'Lease Signing Coordination', 'Project', 3000, 'fixed', 'fixed', null, {}],
  ['BTM-010', 'Utility Connection Coordination', 'Service', 2500, 'fixed', 'fixed', null, {}],
  ['BTM-011', 'Move-In Coordination', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BTM-012', 'Monthly Tenancy Management', 'Month', 5000, 'fixed', 'fixed', null, {}],
  ['BTM-013', 'Lease Renewal Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BTM-014', 'Rent Review & Lease Variation Support', 'Project', 6000, 'fixed', 'fixed', null, {}],
  ['BTM-015', 'Exit / Make Good Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BTM-016', 'Full Business Tenancy Management Package', 'Project', 35000, 'quote', 'from', 'From 35,000', {}],
  ['BTM-017', 'Success Fee (Alternative Pricing Option)', 'Project', 0, 'quote', 'percent', "One Month's Rent or As Agreed", {}],
];

const CATALOGS = [
  { vertical: 'rent_rental_business', cat_code: 'SVC-CAT-BRM', cat_name: 'Business Rental Management Services', slug: 'business-rental', group: 'brm', items: BRM_ITEMS },
  { vertical: 'rent_tenancy_business', cat_code: 'SVC-CAT-BTM', cat_name: 'Business Tenancy Management Services', slug: 'business-tenancy', group: 'btm', items: BTM_ITEMS },
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
        delivery_mode: 'internal', applicable_to: ['business_rent'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) { created++; }
    else { await row.update({ name, unit, fee_model, base_price, tags, category_id: root.id, vertical, service_group: group, sort_order: sort - 1 }); updated++; }
  }
  console.log(`${cat_code} seeded under category #${root.id}: created ${created}, updated ${updated} (of ${items.length}).`);
}

(async () => {
  for (const c of CATALOGS) await seedOne(c);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
