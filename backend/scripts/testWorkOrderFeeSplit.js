/**
 * The work order's two money figures, and who each one belongs to.
 *
 * A job splits its contract value in two: `provider_fee` is what the contractor
 * is owed, `ss_fee` is what Seventh Sky keeps. The split came from the quotation:
 *
 *     ss_fee       = quote.provider_allocation_fee
 *     provider_fee = quote.service_charges || (total - ss_fee)
 *
 * which is right for a line that allocates a provider, and wrong for one that
 * does not. Eleven service lines are delivered in-house (`no_provider`): Interior
 * Design, the four Doc Verification & Transfer lines, and the rest. Nothing is
 * allocated on those, so `provider_allocation_fee` is 0, and `provider_fee` then
 * absorbed the WHOLE contract — the job read as money owed to a contractor that
 * does not exist, with nothing earned. Measured on 2026-09-28: of 31 in-house
 * jobs carrying a value, 30 had provider_fee == total_contract and all 31 had
 * ss_fee == 0, the largest being a ৳3,715,664 contract.
 *
 * On an in-house line the crew is Seventh Sky's own, so the whole contract is
 * Seventh Sky's revenue and there is no provider fee to pay.
 *
 * Run: node scripts/testWorkOrderFeeSplit.js   (from backend/)
 */
const assert = require('assert');
const { splitFees } = require('../services/wtWorkOrder.service');

let n = 0;
const check = (label, fn) => { fn(); n += 1; console.log(`  ok  ${label}`); };

console.log('work order fee split');

// ── a provider line: the split the quotation dictates ────────────────────────
check('provider line: allocation fee is ours, the rest is the provider\'s', () => {
  const s = splitFees({ provider_allocation_fee: 5000, service_charges: 0 }, 30000, 'water_tank');
  assert.strictEqual(s.ss_fee, 5000);
  assert.strictEqual(s.provider_fee, 25000);
});

check('provider line: an explicit service charge wins over the remainder', () => {
  const s = splitFees({ provider_allocation_fee: 5000, service_charges: 20000 }, 30000, 'water_tank');
  assert.strictEqual(s.ss_fee, 5000);
  assert.strictEqual(s.provider_fee, 20000);
});

check('provider line: a fee larger than the contract never goes negative', () => {
  const s = splitFees({ provider_allocation_fee: 99000, service_charges: 0 }, 30000, 'water_tank');
  assert.strictEqual(s.provider_fee, 0);
});

// ── an in-house line: there is nobody to pay ─────────────────────────────────
check('in-house line: no provider fee, the contract is Seventh Sky\'s', () => {
  const s = splitFees({ provider_allocation_fee: 0, service_charges: 0 }, 300000, 'residential_interior_design');
  assert.strictEqual(s.provider_fee, 0, 'nothing is owed to a provider that does not exist');
  assert.strictEqual(s.ss_fee, 300000, 'the whole contract is our revenue');
});

check('in-house line: the quotation cannot book a provider fee either', () => {
  // A quotation carrying service_charges on an in-house line is a data error,
  // not an instruction to invent a payable.
  const s = splitFees({ provider_allocation_fee: 0, service_charges: 250000 }, 300000, 'land_property_assessment');
  assert.strictEqual(s.provider_fee, 0);
  assert.strictEqual(s.ss_fee, 300000);
});

check('in-house line: the two figures still add up to the contract', () => {
  for (const line of ['property_will_succession', 'custom_design_fitout', 'space_planning_renovation']) {
    const s = splitFees({ provider_allocation_fee: 0, service_charges: 0 }, 123456, line);
    assert.strictEqual(s.provider_fee + s.ss_fee, 123456, line);
  }
});

// ── the invariant that must hold on every line ───────────────────────────────
check('on any line the split never exceeds the contract', () => {
  const cases = [
    ['water_tank', { provider_allocation_fee: 5000, service_charges: 26000 }, 30000],
    ['air_conditioning', { provider_allocation_fee: 0, service_charges: 0 }, 0],
    ['business_registration', { provider_allocation_fee: 1000, service_charges: 2000 }, 3000],
    ['residential_interior_design', { provider_allocation_fee: 0, service_charges: 0 }, 300000],
  ];
  for (const [line, quote, total] of cases) {
    const s = splitFees(quote, total, line);
    assert.ok(s.provider_fee >= 0 && s.ss_fee >= 0, `${line}: no negative figure`);
    assert.ok(s.provider_fee + s.ss_fee <= total || total === 0,
      `${line}: ${s.provider_fee} + ${s.ss_fee} exceeds ${total}`);
  }
});

console.log(`\n${n} passed`);
