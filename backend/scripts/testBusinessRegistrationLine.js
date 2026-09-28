const assert = require('assert');
const { getServiceLine, SERVICE_LINE_KEYS } = require('../config/serviceLines');

assert.ok(SERVICE_LINE_KEYS.includes('business_registration'), 'line is registered');

const sl = getServiceLine('business_registration');
assert.strictEqual(sl.label, 'Business Registration');
assert.strictEqual(sl.route_base, 'business-registration');
// The catalogue already exists under this vertical (BRC-001..020) — do not invent a new one.
assert.strictEqual(sl.catalogue_vertical, 'registration_registration_business');
// The customer agreement is already signed under this related_type; renaming it would orphan envelopes.
assert.strictEqual(sl.related_type.customer, 'business_registration_agreement');
assert.strictEqual(sl.no_provider, false, 'registration uses third-party providers');
assert.ok(sl.doc_manager, 'Phase 4 collects client documents');
assert.ok(sl.registration_register, 'line module: parties + activities');
assert.strictEqual(sl.code_prefix.quotation, 'BRQ-');
assert.strictEqual(sl.code_prefix.project, 'BR-P');
assert.ok(sl.required_docs.compliance.includes('Trade Licence'));
assert.ok(sl.service_categories.includes('RJSC Consultant'));

// Service picker comes from workbook Sheet 4.
const groups = Object.keys(sl.ui.service_catalogue);
assert.deepStrictEqual(groups, ['Trade Licence Documentation Support', 'Business Registration Coordination']);
assert.ok(sl.ui.service_catalogue['Business Registration Coordination'].includes('RJSC Registration'));

// Registration has no site visit — shared screens read this to hide scheduling language.
assert.strictEqual(sl.no_site_visit, true);

// SOP Phase 4 — document collection checklist.
const docs = sl.ui.client_docs;
assert.ok(Array.isArray(docs) && docs.length >= 8, 'client_docs checklist present');
const keys = docs.map((d) => d.key);
for (const k of ['nid', 'passport_photo', 'utility_bill', 'trade_licence_existing', 'shareholder_docs', 'director_docs']) {
  assert.ok(keys.includes(k), `checklist has ${k}`);
}
assert.ok(docs.find((d) => d.key === 'nid').required, 'NID is required');
// Per-party documents expand as shareholders/directors are added.
assert.strictEqual(docs.find((d) => d.key === 'shareholder_docs').per_party, 'shareholder');
assert.strictEqual(docs.find((d) => d.key === 'director_docs').per_party, 'director');

console.log('businessRegistrationLine OK');
