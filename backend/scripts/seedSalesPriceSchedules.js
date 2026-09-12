// backend/scripts/seedSalesPriceSchedules.js
//
// Seed Schedule C — Standard Price Schedule for the residential sales service
// agreements, transcribed VERBATIM from the V0.2 source documents:
//   • SSPC-RPPS-01  Residential Property Purchase Service Agreement  (vertical sale_purchase)
//   • SSPC-RPSS-01  Residential Property Sale Service Agreement      (vertical sale_sale)
// These are the ServiceItem (care_services) rows the agreement builder shows in
// Schedule C and prices against. Idempotent: upserts by (branch_id, vertical,
// code), so re-running only corrects drift and never duplicates.
//
// Usage:  node scripts/seedSalesPriceSchedules.js            # all branches
//         node scripts/seedSalesPriceSchedules.js --branch=1 # one branch
const ServiceItem = require('../models/ServiceItem');
const Branch = require('../models/Branch');

// price_type: 'fixed' → base_price; 'from' → "From base_price"; 'included';
// 'percent' → a % of the purchase/sale price captured on the agreement.
const PURCHASE = [
  ['RPPS-001', 'Initial Property Consultation', 'Session', 2000, 'fixed'],
  ['RPPS-002', 'Property Requirement Assessment', 'Project', 3000, 'fixed'],
  ['RPPS-003', 'Property Search & Shortlisting', 'Project', 8000, 'from'],
  ['RPPS-004', 'Market Research & Property Comparison', 'Project', 5000, 'from'],
  ['RPPS-005', 'Property Inspection Coordination', 'Inspection', 2000, 'from'],
  ['RPPS-006', 'Seller Communication & Negotiation', 'Transaction', 5000, 'from'],
  ['RPPS-007', 'Offer Preparation & Submission', 'Transaction', 3000, 'from'],
  ['RPPS-008', 'Documentation Coordination', 'Transaction', 5000, 'from'],
  ['RPPS-009', 'Settlement Coordination', 'Transaction', 8000, 'from'],
  ['RPPS-010', 'Loan Assistance Coordination', 'Project', 5000, 'from'],
  ['RPPS-011', 'Property Valuation / Survey Coordination', 'Project', 3000, 'from'],
  ['RPPS-012', 'Relocation & Utility Coordination', 'Project', 3000, 'from'],
  ['RPPS-013', 'Professional Success Fee (Optional)', 'Purchase', 0, 'percent', '% of Purchase Price or As Agreed'],
];
const SALE = [
  ['RPSS-001', 'Initial Property Consultation', 'Session', 2000, 'fixed'],
  ['RPSS-002', 'Property Assessment', 'Property', 3000, 'fixed'],
  ['RPSS-003', 'Market Appraisal', 'Property', 5000, 'fixed'],
  ['RPSS-004', 'Property Photography', 'Property', 5000, 'from'],
  ['RPSS-005', 'Drone Photography & Videography', 'Property', 8000, 'from'],
  ['RPSS-006', 'Property Listing & Marketing', 'Property', 10000, 'from'],
  ['RPSS-007', 'Buyer Inspection Coordination', 'Inspection', 1500, 'from'],
  ['RPSS-008', 'Open House Coordination', 'Event', 3000, 'from'],
  ['RPSS-009', 'Negotiation & Offer Coordination', 'Transaction', 0, 'included'],
  ['RPSS-010', 'Documentation Coordination', 'Transaction', 5000, 'from'],
  ['RPSS-011', 'Settlement Coordination', 'Transaction', 8000, 'from'],
  ['RPSS-012', 'Property Preparation / Styling Coordination', 'Project', 5000, 'from'],
  ['RPSS-013', 'Professional Sales Commission', 'Sale', 0, 'percent', '% of Final Sale Price'],
];

const fmt = (n) => Number(n).toLocaleString('en-US');
function tagsFor(priceType, basePrice, label) {
  const t = { price_type: priceType, schedule: 'C' };
  if (priceType === 'from') t.price_label = `From ${fmt(basePrice)}`;
  else if (priceType === 'included') t.price_label = 'Included';
  else if (priceType === 'percent') t.price_label = label || '% as agreed';
  return t;
}

async function seedList(branchId, vertical, list) {
  let created = 0; let updated = 0;
  for (let i = 0; i < list.length; i++) {
    const [code, name, unit, basePrice, priceType, label] = list[i];
    const fields = {
      branch_id: branchId, vertical, code, name, unit,
      base_price: basePrice, fee_model: priceType === 'fixed' ? 'fixed' : 'quote',
      tags: tagsFor(priceType, basePrice, label), is_active: true, sort_order: i + 1,
    };
    const [row, wasCreated] = await ServiceItem.findOrCreate({ where: { branch_id: branchId, vertical, code }, defaults: fields });
    if (wasCreated) created += 1;
    else { await row.update(fields); updated += 1; }
  }
  return { created, updated };
}

(async () => {
  const arg = process.argv.find((a) => a.startsWith('--branch='));
  const branchIds = arg
    ? [Number(arg.split('=')[1])]
    : (await Branch.findAll({ attributes: ['id'], raw: true })).map((b) => b.id);

  for (const branchId of branchIds) {
    const p = await seedList(branchId, 'sale_purchase', PURCHASE);
    const s = await seedList(branchId, 'sale_sale', SALE);
    console.log(`branch ${branchId}: sale_purchase +${p.created}/~${p.updated}, sale_sale +${s.created}/~${s.updated}`);
  }
  console.log('Sales price schedules seeded (idempotent).');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
