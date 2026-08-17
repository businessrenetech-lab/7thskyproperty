/**
 * Seed the Short-Term Rental Management (STR/STS) service catalog — Schedule C of the
 * Short-Term Rental Management Service Agreement (SSPC-STRMS-01 v0.2). Idempotent by code.
 * Standard prices in ServiceItem.base_price (editable); special formats in tags.price_type.
 * Run from backend/: node scripts/seedStsCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const VERTICAL = 'str_mgmt';
const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label]
const ITEMS = [
  ['STR-001', 'Initial Property Consultation', 'Session', 2000, 'fixed', 'fixed', null],
  ['STR-002', 'STR Readiness Assessment', 'Property', 3000, 'fixed', 'fixed', null],
  ['STR-003', 'Property Setup Coordination', 'Project', 8000, 'quote', 'from', 'From 8,000'],
  ['STR-004', 'Professional Photography', 'Property', 5000, 'quote', 'from', 'From 5,000'],
  ['STR-005', 'Listing Creation & Platform Setup', 'Property', 5000, 'quote', 'from', 'From 5,000'],
  ['STR-006', 'Marketing & Promotion', 'Campaign', 5000, 'quote', 'from', 'From 5,000'],
  ['STR-007', 'Booking & Guest Management', 'Month', 8000, 'quote', 'from', 'From 8,000'],
  ['STR-008', 'Housekeeping Coordination', 'Booking', 1000, 'quote', 'from', 'From 1,000'],
  ['STR-009', 'Linen Management Coordination', 'Booking', 500, 'quote', 'from', 'From 500'],
  ['STR-010', 'Maintenance Coordination', 'Request', 1500, 'quote', 'from', 'From 1,500'],
  ['STR-011', 'Emergency Response Coordination', 'Request', 2000, 'quote', 'from', 'From 2,000'],
  ['STR-012', 'Owner Reporting & Performance Review', 'Month', 0, 'fixed', 'included', 'Included'],
  ['STR-013', 'Management Fee', 'Month', 0, 'amc', 'fixed_monthly', 'Fixed Monthly Fee (As Agreed)'],
  ['STR-014', 'Revenue Share (Optional)', 'Booking Revenue', 0, 'amc', 'revenue_share', '% of Gross Booking Revenue'],
];

(async () => {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: 'SVC-CAT-STR' },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Short-Term Rental Management', code: 'SVC-CAT-STR', slug: 'str-mgmt', icon: 'Hotel', sort_order: 0 },
  });

  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label] of ITEMS) {
    const recurring = price_type === 'fixed_monthly' || price_type === 'revenue_share';
    const tags = { price_type, ...(price_label ? { price_label } : {}), schedule: 'C', ...(recurring ? { recurring: true } : {}) };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical: VERTICAL, name, code,
        service_group: 'str', fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['short_term_stay'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) created++;
    else { await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical: VERTICAL, service_group: 'str', sort_order: sort - 1 }); updated++; }
  }
  console.log(`STS catalog seeded under category #${root.id}: created ${created}, updated ${updated} (of ${ITEMS.length}).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
