/**
 * Seed the Residential Property Rental Management (RPRM) service catalog — Schedule C of the
 * Residential Property Rental Management Service Agreement (SSPC-RPRMS-01 v0.2).
 * Idempotent by code. Standard prices live in ServiceItem.base_price (editable in the catalog admin);
 * special price formats (included / from / percent-of-rent) are encoded in tags.price_type so no
 * schema change to the shared care_services table is needed.
 *
 * Run from backend/: node scripts/seedRprmCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const VERTICAL = 'residential_pm';
const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const ITEMS = [
  ['RPRM-001', 'Initial Property Consultation', 'Session', 2000, 'fixed', 'fixed', null, {}],
  ['RPRM-002', 'Property Assessment', 'Property', 3000, 'fixed', 'fixed', null, {}],
  ['RPRM-003', 'Rental Market Assessment', 'Property', 3000, 'fixed', 'fixed', null, {}],
  ['RPRM-004', 'Property Marketing & Listing Setup', 'Property', 8000, 'fixed', 'fixed', null, {}],
  ['RPRM-005', 'Professional Photography', 'Property', 5000, 'fixed', 'fixed', null, {}],
  ['RPRM-006', 'Tenant Sourcing', 'Property', 12000, 'fixed', 'fixed', null, {}],
  ['RPRM-007', 'Tenant Screening', 'Applicant', 2000, 'fixed', 'fixed', null, {}],
  ['RPRM-008', 'Lease Coordination', 'Property', 5000, 'fixed', 'fixed', null, {}],
  ['RPRM-009', 'Entry Inspection', 'Inspection', 0, 'fixed', 'included', 'Included', {}],
  ['RPRM-010', 'Routine Inspection', 'Inspection', 0, 'fixed', 'included', 'Included', {}],
  ['RPRM-011', 'Exit Inspection', 'Inspection', 0, 'fixed', 'included', 'Included', {}],
  ['RPRM-012', 'Rent Collection & Administration', 'Month', 0, 'amc', 'included', 'Included in Management Fee', {}],
  ['RPRM-013', 'General Maintenance Coordination', 'Request', 0, 'fixed', 'included', 'Included (Fair Usage)', {}],
  ['RPRM-014', 'Premium Maintenance / Renovation Coordination', 'Project', 3000, 'quote', 'from', 'From 3,000', {}],
  ['RPRM-015', 'Property Styling Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPRM-016', 'Smart Property / Security Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000', {}],
  ['RPRM-017', 'NRB Premium Property Services', 'Month', 2500, 'quote', 'from', 'From 2,500', {}],
  ['RPRM-018', 'Ongoing Property Management Fee', 'Month', 0, 'amc', 'percent_of_rent', '5% of Monthly Rent (Minimum BDT 3,000)', { percent: 5, min: 3000 }],
];

(async () => {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: 'SVC-CAT-RPRM' },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Residential Property Rental Management', code: 'SVC-CAT-RPRM', slug: 'residential-pm', icon: 'Home', sort_order: 0 },
  });

  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label, extra] of ITEMS) {
    const tags = { price_type, ...(price_label ? { price_label } : {}), ...extra, schedule: 'C' };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical: VERTICAL, name, code,
        service_group: 'rprm', fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['property_management'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) { created++; }
    else {
      // keep standard price/label current on re-run (admin edits to base_price are preserved only if you
      // remove this block; here we refresh name/unit/tags but leave base_price as stored if already customised)
      await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical: VERTICAL, service_group: 'rprm', sort_order: sort - 1 });
      updated++;
    }
  }
  console.log(`RPRM catalog seeded under category #${root.id}: created ${created}, updated ${updated} (of ${ITEMS.length}).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
