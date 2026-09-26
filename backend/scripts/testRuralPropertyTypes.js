const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { RURAL_PROPERTY_TYPES } = require('../utils/ruralPropertyTypes');

// The SOP's eleven values (ten kinds; agricultural and farming land listed apart).
assert.strictEqual(RURAL_PROPERTY_TYPES.length, 11);
assert.ok(RURAL_PROPERTY_TYPES.includes('Fishery'));
assert.ok(RURAL_PROPERTY_TYPES.includes('Orchard'));
assert.ok(RURAL_PROPERTY_TYPES.includes('Mixed Use Rural'));
assert.strictEqual(new Set(RURAL_PROPERTY_TYPES).size, 11, 'no duplicates');

// The frontend mirror must not drift — the Property dashboard groups by this list
// and the wizard's select writes from it.
const mirrorPath = path.join(__dirname, '..', '..', 'admin-portal', 'src', 'config', 'ruralPropertyTypes.js');
const mirror = fs.readFileSync(mirrorPath, 'utf8');
const inArray = mirror.slice(mirror.indexOf('['), mirror.indexOf(']'));
const frontend = [...inArray.matchAll(/'([^']+)'/g)].map((m) => m[1]);
assert.deepStrictEqual(frontend, RURAL_PROPERTY_TYPES,
  'admin-portal/src/config/ruralPropertyTypes.js has drifted from backend/utils/ruralPropertyTypes.js');

console.log('ruralPropertyTypes OK');
