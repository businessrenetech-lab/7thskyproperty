const assert = require('assert');
const { RURAL_SALE_REGISTERS, SELLER_REGISTERS, BUYER_REGISTERS } = require('./seedRuralSaleRegisters');

assert.strictEqual(SELLER_REGISTERS.length, 8, 'eight seller registers');
assert.strictEqual(BUYER_REGISTERS.length, 9, 'nine buyer registers');
assert.strictEqual(RURAL_SALE_REGISTERS.length, 17);

const keyOf = (d) => `${d.vertical_key}/${d.register_key}`;

assert.deepStrictEqual(RURAL_SALE_REGISTERS.map(keyOf), [
  'rural_sale/ownership_verification',
  'rural_sale/marketing_register',
  'rural_sale/negotiation_register',
  'rural_sale/legal_coordination_register',
  'rural_sale/complaint_register',
  'rural_sale/communication_log',
  'rural_sale/seller_feedback_register',
  'rural_sale/closure_register',
  'rural_purchase/buyer_master_register',
  'rural_purchase/requirement_register',
  'rural_purchase/budget_register',
  'rural_purchase/search_criteria_register',
  'rural_purchase/property_search_register',
  'rural_purchase/shortlist_register',
  'rural_purchase/due_diligence_register',
  'rural_purchase/financing_register',
  'rural_purchase/buyer_feedback_register',
]);

// The three that already existed must not be redefined — #162 seller_master_register,
// #163 property_register, #164 offer_register, all on rural_sale.
for (const k of ['seller_master_register', 'property_register', 'offer_register']) {
  assert.ok(!RURAL_SALE_REGISTERS.some((d) => d.register_key === k),
    `${k} already exists on rural_sale and must not be reseeded`);
}

// The workbook sheets the system already models as TABLES must not become
// registers. This is the list the spec §5 names, asserted so nobody "finds the
// gap" later and splits the truth in two.
const NOT_REGISTERS = [
  'inspection_register', 'buyer_enquiry_register', 'protected_buyer_register',
  'protected_property_register', 'transaction_register', 'invoice_register',
  'payment_register', 'commission_register', 'risk_register',
  'seller_agreement_register', 'buyer_agreement_register', 'kpi_dashboard',
];
for (const k of NOT_REGISTERS) {
  assert.ok(!RURAL_SALE_REGISTERS.some((d) => d.register_key === k),
    `${k} is already a table, not a register`);
}

// Nothing collides, and every definition is well formed.
assert.strictEqual(new Set(RURAL_SALE_REGISTERS.map(keyOf)).size, RURAL_SALE_REGISTERS.length);
for (const d of RURAL_SALE_REGISTERS) {
  assert.ok(['rural_sale', 'rural_purchase'].includes(d.vertical_key), `${keyOf(d)} vertical`);
  assert.ok(d.name && /Register|Log/.test(d.name), `${keyOf(d)} has a readable name`);
  assert.ok(Array.isArray(d.columns) && d.columns.length >= 3, `${keyOf(d)} has columns`);
  for (const c of d.columns) {
    assert.ok(c.key && c.label, `${keyOf(d)} column is complete: ${JSON.stringify(c)}`);
    assert.ok(/^[a-z][a-z0-9_]*$/.test(c.key), `${keyOf(d)}.${c.key} is snake_case`);
    assert.ok(['text', 'date', 'select', 'textarea'].includes(c.type), `${keyOf(d)}.${c.key} type`);
  }
}

// Retention is a COLUMN on closure, not a register of its own — the same
// decision the rural rent closure register records.
const closure = RURAL_SALE_REGISTERS.find((d) => d.register_key === 'closure_register');
assert.ok(closure.columns.some((c) => c.key === 'retention_until'), 'closure carries the retention date');
assert.ok(!RURAL_SALE_REGISTERS.some((d) => /retention/.test(d.register_key)), 'retention is not its own register');

// The buyer's search criteria must use the same land-record field names the
// properties table uses, or a search cannot be matched against a listing.
const search = RURAL_SALE_REGISTERS.find((d) => d.register_key === 'search_criteria_register');
for (const f of ['district', 'upazila', 'union_name', 'village', 'mouza']) {
  assert.ok(search.columns.some((c) => c.key === f), `search criteria carries ${f}`);
}

// The shortlist must carry the advantages AND risks the purchase SOP Step 6 asks for.
const shortlist = RURAL_SALE_REGISTERS.find((d) => d.register_key === 'shortlist_register');
for (const f of ['advantages', 'risks']) {
  assert.ok(shortlist.columns.some((c) => c.key === f), `the shortlist records ${f}`);
}

console.log('ruralSaleRegisters OK');
