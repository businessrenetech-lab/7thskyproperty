/**
 * Seed the Residential Property Tenancy Management (RPTM) service catalog — Schedule C of the
 * Residential Property Tenancy Management Service Agreement (SSPC-RPTMS-01 v0.2). Idempotent by code.
 * Standard prices in ServiceItem.base_price (editable); special formats in tags.price_type.
 * Run from backend/: node scripts/seedRptmCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const VERTICAL = 'tenancy_mgmt';
const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label]
const ITEMS = [
  ['RPTM-001', 'Initial Tenancy Consultation', 'Session', 1500, 'fixed', 'fixed', null],
  ['RPTM-002', 'Lease Administration', 'Lease', 3000, 'fixed', 'fixed', null],
  ['RPTM-003', 'Move-in Coordination', 'Property', 2000, 'fixed', 'fixed', null],
  ['RPTM-004', 'Move-out Coordination', 'Property', 2000, 'fixed', 'fixed', null],
  ['RPTM-005', 'Utility Bill Coordination', 'Request', 500, 'fixed', 'fixed', null],
  ['RPTM-006', 'Cleaning Coordination', 'Request', 1000, 'quote', 'from', 'From 1,000'],
  ['RPTM-007', 'Gardening Coordination', 'Request', 1000, 'quote', 'from', 'From 1,000'],
  ['RPTM-008', 'General Maintenance Coordination', 'Request', 1000, 'quote', 'from', 'From 1,000'],
  ['RPTM-009', 'Emergency Maintenance Coordination', 'Request', 2000, 'quote', 'from', 'From 2,000'],
  ['RPTM-010', 'Property Styling Assistance', 'Project', 3000, 'quote', 'from', 'From 3,000'],
  ['RPTM-011', 'Smart Property Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000'],
  ['RPTM-012', 'Security Coordination', 'Project', 5000, 'quote', 'from', 'From 5,000'],
  ['RPTM-013', 'Corporate Relocation Support', 'Project', 10000, 'quote', 'from', 'From 10,000'],
  ['RPTM-014', 'NRB / Priority Support Services', 'Month', 2500, 'quote', 'from', 'From 2,500'],
];

(async () => {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: 'SVC-CAT-RPTM' },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Residential Property Tenancy Management', code: 'SVC-CAT-RPTM', slug: 'tenancy-mgmt', icon: 'KeyRound', sort_order: 0 },
  });

  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label] of ITEMS) {
    // RPTM-014 is a monthly support service → recurring
    const recurring = unit === 'Month';
    const tags = { price_type, ...(price_label ? { price_label } : {}), schedule: 'C', ...(recurring ? { recurring: true } : {}) };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical: VERTICAL, name, code,
        service_group: 'rptm', fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['tenancy_management'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) created++;
    else { await row.update({ name, unit, fee_model, tags, category_id: root.id, vertical: VERTICAL, service_group: 'rptm', sort_order: sort - 1 }); updated++; }
  }
  console.log(`RPTM catalog seeded under category #${root.id}: created ${created}, updated ${updated} (of ${ITEMS.length}).`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
