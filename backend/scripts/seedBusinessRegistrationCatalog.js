/**
 * Seed the BRC (Business Registration Coordination) service catalogue —
 * Schedule C of SSPC-BR-CSA-01 v0.2.
 * Vertical: registration_registration_business (scope 'business_registration').
 * Prices transcribed verbatim from Schedule C (BRC-001 … BRC-020). Idempotent by code.
 *
 * Run from backend/: node scripts/seedBusinessRegistrationCatalog.js
 */
require('dotenv').config();
const ServiceCategory = require('../models/ServiceCategory');
const ServiceItem = require('../models/ServiceItem');

const BRANCH = 1;

// [code, name, unit, base_price, fee_model, price_type, price_label, extra]
const BRC_ITEMS = [
  ['BRC-001', 'Business Registration Consultation', 'Session', 2500, 'fixed', 'fixed', null, {}],
  ['BRC-002', 'Sole Proprietorship Registration', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRC-003', 'Partnership Registration', 'Project', 12000, 'fixed', 'fixed', null, {}],
  ['BRC-004', 'Private Limited Company Registration', 'Project', 35000, 'fixed', 'fixed', null, {}],
  ['BRC-005', 'Public Limited Company Registration', 'Project', 60000, 'fixed', 'fixed', null, {}],
  ['BRC-006', 'Business Name Registration', 'Project', 10000, 'fixed', 'fixed', null, {}],
  ['BRC-007', 'RJSC Registration Coordination', 'Project', 15000, 'fixed', 'fixed', null, {}],
  ['BRC-008', 'Trade Licence Application', 'Project', 6000, 'fixed', 'fixed', null, {}],
  ['BRC-009', 'Trade Licence Renewal', 'Project', 3500, 'fixed', 'fixed', null, {}],
  ['BRC-010', 'Trade Licence Amendment', 'Project', 4500, 'fixed', 'fixed', null, {}],
  ['BRC-011', 'TIN Registration', 'Project', 2500, 'fixed', 'fixed', null, {}],
  ['BRC-012', 'BIN / VAT Registration', 'Project', 6000, 'fixed', 'fixed', null, {}],
  ['BRC-013', 'Memorandum & Articles Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRC-014', 'Shareholder & Director Documentation', 'Project', 5000, 'fixed', 'fixed', null, {}],
  ['BRC-015', 'Company Resolution Preparation', 'Document', 2500, 'fixed', 'fixed', null, {}],
  ['BRC-016', 'Annual Return Coordination', 'Project', 8000, 'fixed', 'fixed', null, {}],
  ['BRC-017', 'Corporate Compliance Review', 'Review', 7500, 'fixed', 'fixed', null, {}],
  ['BRC-018', 'Regulatory Filing Support', 'Filing', 5000, 'fixed', 'fixed', null, {}],
  ['BRC-019', 'Government Liaison & Follow-up', 'Visit', 3000, 'fixed', 'fixed', null, {}],
  ['BRC-020', 'Priority / Urgent Processing Coordination', 'Project', 8000, 'quote', 'from', 'From 8,000', {}],
];

const VERTICAL = 'registration_registration_business';
const CAT_CODE = 'SVC-CAT-BRG';

async function seed() {
  const [root] = await ServiceCategory.findOrCreate({
    where: { code: CAT_CODE },
    defaults: { branch_id: BRANCH, vertical: VERTICAL, name: 'Business Registration Services', code: CAT_CODE, slug: 'business-registration', icon: 'FileSignature', sort_order: 0 },
  });
  let created = 0, updated = 0, sort = 0;
  for (const [code, name, unit, base_price, fee_model, price_type, price_label, extra] of BRC_ITEMS) {
    const tags = { price_type, ...(price_label ? { price_label } : {}), ...extra, schedule: 'C' };
    const [row, wasCreated] = await ServiceItem.findOrCreate({
      where: { code },
      defaults: {
        branch_id: BRANCH, category_id: root.id, vertical: VERTICAL, name, code,
        service_group: 'brg', fee_model, base_price, unit,
        sspc_fee_type: 'fixed', sspc_fee_value: 0, provider_pay_type: 'remainder', provider_pay_value: 0,
        delivery_mode: 'internal', applicable_to: ['business_registration'], tags,
        is_active: true, sort_order: sort++,
      },
    });
    if (wasCreated) { created++; }
    else { await row.update({ name, unit, fee_model, base_price, tags, category_id: root.id, vertical: VERTICAL, service_group: 'brg', sort_order: sort - 1 }); updated++; }
  }
  console.log(`${CAT_CODE} seeded under category #${root.id}: created ${created}, updated ${updated} (of ${BRC_ITEMS.length}).`);
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
