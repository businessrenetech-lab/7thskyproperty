const assert = require('assert');
const { RURAL_SERVICE_REGISTERS } = require('./seedRuralServiceRegisters');

// Owner Sheets 19-22 and tenant Sheets 21-23 — the five the workbook defines and
// that were never seeded alongside the other thirteen.
assert.deepStrictEqual(RURAL_SERVICE_REGISTERS.map((r) => r.register_key), [
  'complaint_register', 'communication_log', 'owner_feedback_register',
  'closure_register', 'tenant_feedback_register',
]);

// Tenant feedback belongs to the tenant pipeline; the rest to the owner one.
const byKey = Object.fromEntries(RURAL_SERVICE_REGISTERS.map((r) => [r.register_key, r]));
assert.strictEqual(byKey.tenant_feedback_register.vertical_key, 'rural_tenancy');
for (const k of ['complaint_register', 'communication_log', 'owner_feedback_register', 'closure_register']) {
  assert.strictEqual(byKey[k].vertical_key, 'rural_rent', `${k} is an owner-side register`);
}

// It must not collide with any of the thirteen that already exist.
const EXISTING = ['owner_master_register', 'property_master_register', 'ownership_verification',
  'marketing_register', 'tenant_screening', 'protected_tenant_register', 'lease_register',
  'maintenance_register', 'tenant_master_register', 'requirement_register',
  'property_search_register', 'shortlist_register', 'protected_property_register'];
for (const r of RURAL_SERVICE_REGISTERS) {
  assert.ok(!EXISTING.includes(r.register_key), `${r.register_key} already exists — do not reseed it`);
}

// Every definition carries a name and usable columns.
for (const r of RURAL_SERVICE_REGISTERS) {
  assert.ok(r.name && r.name.length > 3, `${r.register_key} has a name`);
  assert.ok(Array.isArray(r.columns) && r.columns.length >= 4, `${r.register_key} has columns`);
  r.columns.forEach((c) => {
    assert.ok(c.key && c.label && c.type, `${r.register_key}/${c.key} is complete`);
    assert.ok(/^[a-z_]+$/.test(c.key), `${r.register_key}/${c.key} is a snake_case key`);
  });
  assert.strictEqual(new Set(r.columns.map((c) => c.key)).size, r.columns.length,
    `${r.register_key} has no duplicate columns`);
}

// SOP §14: retention is an attribute of closure, not a register of its own.
const closure = byKey.closure_register.columns.map((c) => c.key);
assert.ok(closure.includes('retention_until'), 'closure carries the retention date');
assert.ok(closure.includes('records_archived'), 'closure records whether the file was archived');
assert.ok(!RURAL_SERVICE_REGISTERS.some((r) => /retention/.test(r.register_key)),
  'there is no separate retention register');

// A complaint needs a lifecycle, not just text.
const complaint = byKey.complaint_register.columns.map((c) => c.key);
for (const k of ['severity', 'action_taken', 'resolved_on', 'outcome']) {
  assert.ok(complaint.includes(k), `complaint register records ${k}`);
}

console.log('ruralServiceRegisters OK');
