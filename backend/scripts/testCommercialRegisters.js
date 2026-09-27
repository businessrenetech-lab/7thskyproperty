const assert = require('assert');
const {
  COMMERCIAL_REGISTERS, RENT_REGISTERS, SALE_REGISTERS, MALFORMED,
} = require('./seedCommercialRegisters');

assert.strictEqual(RENT_REGISTERS.length, 4, 'four lease-side registers');
assert.strictEqual(SALE_REGISTERS.length, 6, 'six sale-side registers');
assert.strictEqual(COMMERCIAL_REGISTERS.length, 10);

const keyOf = (d) => `${d.vertical_key}/${d.register_key}`;
assert.deepStrictEqual(COMMERCIAL_REGISTERS.map(keyOf), [
  'commercial_rent/negotiation_register',
  'commercial_rent/handover_register',
  'commercial_rent/exit_checklist',
  'commercial_rent/communication_log',
  'commercial_sale/ownership_verification',
  'commercial_sale/marketing_register',
  'commercial_sale/negotiation_register',
  'commercial_sale/due_diligence_register',
  'commercial_sale/communication_log',
  'commercial_sale/closure_register',
]);

/*
 * The workbook's "CRM Record Required" column names records that are ALREADY
 * tables. Duplicating them as registers would split the truth in two. This is the
 * list the seed header measured, kept executable so nobody adds them later
 * believing they are missing.
 */
const ALREADY_TABLES = [
  'owner_profile', 'property_profile', 'document_register', 'work_progress_tracker',
  'marketing_record', 'screening_notes', 'inspection_schedule', 'lease_draft',
  'payment_record', 'rental_ledger', 'maintenance_tracker', 'maintenance_register',
  'offer_register', 'invoice_register', 'commission_register',
];
for (const k of ALREADY_TABLES) {
  assert.ok(!COMMERCIAL_REGISTERS.some((d) => d.register_key === k),
    `${k} is already a table, not a register`);
}

// The malformed auto-generated key must never be recreated as a definition.
assert.strictEqual(MALFORMED.register_key, 'commercial_rent-lease');
assert.ok(MALFORMED.register_key.includes('-'), 'the malformed key is the hyphenated one');
assert.ok(!COMMERCIAL_REGISTERS.some((d) => d.register_key === MALFORMED.register_key),
  'the malformed key is retired, not reseeded');

// Every key in the new set is snake_case, like every other register in the system.
for (const d of COMMERCIAL_REGISTERS) {
  assert.ok(/^[a-z][a-z0-9_]*$/.test(d.register_key),
    `${keyOf(d)} is snake_case — the malformed one was not`);
  assert.ok(['commercial_rent', 'commercial_sale'].includes(d.vertical_key), `${keyOf(d)} vertical`);
  assert.ok(d.name && /Register|Log|Checklist/.test(d.name), `${keyOf(d)} has a readable name`);
  assert.ok(Array.isArray(d.columns) && d.columns.length >= 3, `${keyOf(d)} has columns`);
  for (const c of d.columns) {
    assert.ok(c.key && c.label, `${keyOf(d)} column is complete: ${JSON.stringify(c)}`);
    assert.ok(/^[a-z][a-z0-9_]*$/.test(c.key), `${keyOf(d)}.${c.key} is snake_case`);
    assert.ok(['text', 'date', 'select', 'textarea'].includes(c.type), `${keyOf(d)}.${c.key} type`);
  }
}
assert.strictEqual(new Set(COMMERCIAL_REGISTERS.map(keyOf)).size, COMMERCIAL_REGISTERS.length);

// A register_key may repeat across verticals — negotiation and communication do —
// but never twice within one vertical.
for (const v of ['commercial_rent', 'commercial_sale']) {
  const keys = COMMERCIAL_REGISTERS.filter((d) => d.vertical_key === v).map((d) => d.register_key);
  assert.strictEqual(new Set(keys).size, keys.length, `${v} has no duplicate register_key`);
}

// Retention is a COLUMN on closure and on the exit checklist, not a register.
const closure = COMMERCIAL_REGISTERS.find((d) => d.register_key === 'closure_register');
assert.ok(closure.columns.some((c) => c.key === 'retention_until'), 'closure carries the retention date');
const exit = COMMERCIAL_REGISTERS.find((d) => d.register_key === 'exit_checklist');
assert.ok(exit.columns.some((c) => c.key === 'retention_until'), 'the exit checklist carries it too');
assert.ok(!COMMERCIAL_REGISTERS.some((d) => /retention/.test(d.register_key)),
  'retention is not a register of its own');

// The handover register must capture what the workbook's asset verification needs.
const handover = COMMERCIAL_REGISTERS.find((d) => d.register_key === 'handover_register');
for (const f of ['meter_readings', 'keys_issued', 'assets_verified']) {
  assert.ok(handover.columns.some((c) => c.key === f), `handover records ${f}`);
}

// Both sides track negotiation round by round, which is the point of having it.
for (const v of ['commercial_rent', 'commercial_sale']) {
  const neg = COMMERCIAL_REGISTERS.find((d) => d.vertical_key === v && d.register_key === 'negotiation_register');
  assert.ok(neg, `${v} has a negotiation register`);
  for (const f of ['round', 'counter_offer', 'outcome']) {
    assert.ok(neg.columns.some((c) => c.key === f), `${v} negotiation records ${f}`);
  }
}

console.log('commercialRegisters OK');
