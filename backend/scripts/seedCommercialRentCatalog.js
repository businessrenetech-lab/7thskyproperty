/**
 * Seed the Commercial Rent price schedules (Schedule C) for the two commercial
 * rent agreements — Commercial Property Rental Management (CPRM) and Commercial
 * Property Tenancy Management (CPTM). Mirrors seedRprmCatalog.js. Idempotent by
 * code. Commercial work is largely bespoke, so most lines are on-quote / from /
 * percent rather than a fixed retail price.
 *
 * Run from backend/: node scripts/seedCommercialRentCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const CPRM = [
  ['CPRM-001', 'Rental Market Assessment', 'Property', 5000, 'fixed', 'fixed', null, {}],
  ['CPRM-002', 'Commercial Leasing Consultation', 'Session', 3000, 'fixed', 'fixed', null, {}],
  ['CPRM-003', 'Rental Pricing Guidance', 'Property', 0, 'fixed', 'included', 'Included', {}],
  ['CPRM-004', 'Leasing Strategy', 'Property', 5000, 'quote', 'from', 'From 5,000', {}],
  ['CPRM-005', 'Lease Coordination', 'Property', 10000, 'fixed', 'fixed', null, {}],
  ['CPRM-006', 'Lease Renewal Coordination', 'Property', 5000, 'fixed', 'fixed', null, {}],
  ['CPRM-007', 'Property Marketing', 'Property', 15000, 'quote', 'from', 'From 15,000', {}],
  ['CPRM-008', 'Professional Photography Coordination', 'Property', 8000, 'fixed', 'fixed', null, {}],
  ['CPRM-009', 'Online Property Listings', 'Property', 0, 'fixed', 'included', 'Included', {}],
  ['CPRM-010', 'Corporate / Business Tenant Sourcing', 'Property', 20000, 'quote', 'from', 'From 20,000', {}],
  ['CPRM-011', 'Business Verification & Tenant Screening', 'Tenant', 5000, 'fixed', 'fixed', null, {}],
  ['CPRM-012', 'Rent Collection Coordination', 'Month', 0, 'amc', 'included', 'Included in Management Fee', {}],
  ['CPRM-013', 'Routine Property Inspections', 'Inspection', 0, 'fixed', 'included', 'Included', {}],
  ['CPRM-014', 'Lease Administration', 'Month', 0, 'amc', 'included', 'Included in Management Fee', {}],
  ['CPRM-015', 'Maintenance & Contractor Coordination', 'Request', 0, 'fixed', 'included', 'Included (Fair Usage)', {}],
  ['CPRM-016', 'Monthly Management Reporting', 'Month', 0, 'amc', 'included', 'Included', {}],
  ['CPRM-017', 'Interior Fit-Out / Renovation Coordination', 'Project', 10000, 'quote', 'from', 'From 10,000', {}],
  ['CPRM-018', 'Ongoing Commercial Management Fee', 'Month', 0, 'amc', 'percent_of_rent', '7% of Monthly Rent (Minimum BDT 5,000)', { percent: 7, min: 5000 }],
];

const CPTM = [
  ['CPTM-001', 'Tenant Onboarding & Handover Coordination', 'Tenancy', 5000, 'fixed', 'fixed', null, {}],
  ['CPTM-002', 'Lease Administration', 'Month', 0, 'amc', 'included', 'Included in Management Fee', {}],
  ['CPTM-003', 'Rent Collection & Arrears Management', 'Month', 0, 'amc', 'included', 'Included in Management Fee', {}],
  ['CPTM-004', 'Tenant Communication & Support', 'Month', 0, 'amc', 'included', 'Included', {}],
  ['CPTM-005', 'Routine & Periodic Inspections', 'Inspection', 0, 'fixed', 'included', 'Included', {}],
  ['CPTM-006', 'Maintenance & Contractor Coordination', 'Request', 0, 'fixed', 'included', 'Included (Fair Usage)', {}],
  ['CPTM-007', 'Lease Renewal & Re-negotiation', 'Renewal', 5000, 'fixed', 'fixed', null, {}],
  ['CPTM-008', 'Deposit & Exit Settlement Coordination', 'Tenancy', 3000, 'fixed', 'fixed', null, {}],
  ['CPTM-009', 'Dispute Handling Coordination', 'Case', 5000, 'quote', 'from', 'From 5,000', {}],
  ['CPTM-010', 'Compliance & Documentation Management', 'Month', 0, 'amc', 'included', 'Included', {}],
  ['CPTM-011', 'Monthly Tenancy Management Reporting', 'Month', 0, 'amc', 'included', 'Included', {}],
  ['CPTM-012', 'Ongoing Tenancy Management Fee', 'Month', 0, 'amc', 'percent_of_rent', '6% of Monthly Rent (Minimum BDT 4,000)', { percent: 6, min: 4000 }],
];

async function seed(vertical, group, catCode, catName, slug, items) {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: catCode },
    defaults: { branch_id: BRANCH, vertical, name: catName, code: catCode, slug, icon: 'Building2', sort_order: 0 },
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
        delivery_mode: 'internal', applicable_to: ['property_management'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) created++;
    else { await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical, service_group: group, sort_order: sort - 1 }); updated++; }
  }
  console.log(`${vertical} catalog: created ${created}, updated ${updated} (of ${items.length}).`);
}

(async () => {
  await seed('commercial_pm', 'cprm', 'SVC-CAT-CPRM', 'Commercial Property Rental Management', 'commercial-pm', CPRM);
  await seed('commercial_tenancy_mgmt', 'cptm', 'SVC-CAT-CPTM', 'Commercial Property Tenancy Management', 'commercial-tenancy-mgmt', CPTM);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
