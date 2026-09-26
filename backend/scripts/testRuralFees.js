const assert = require('assert');
const Profile = require('../models/PropertyOwnerProfile');
const { RURAL_FEE_FIELDS } = require('../utils/ruralFees');

// SOP Rural Rental Management §7 Step 6 — the fee structure recorded per property.
assert.deepStrictEqual(RURAL_FEE_FIELDS,
  ['leasing_fee', 'marketing_budget', 'early_termination_fee', 'exclusive_until']);

// Already present, and deliberately NOT duplicated by this task.
for (const existing of ['management_commission', 'onboarding_fee', 'termination_notice_days', 'agreement_start_date']) {
  assert.ok(Profile.rawAttributes[existing], `expected ${existing} to already exist`);
  assert.ok(!RURAL_FEE_FIELDS.includes(existing), `${existing} already exists — do not add it again`);
}

// Sequelize must know the new ones, or the form writes them and they vanish.
for (const f of RURAL_FEE_FIELDS) {
  assert.ok(Profile.rawAttributes[f], `PropertyOwnerProfile model is missing ${f}`);
}

console.log('ruralFees OK');
