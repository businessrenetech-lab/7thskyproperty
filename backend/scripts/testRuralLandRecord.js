const assert = require('assert');
const Property = require('../models/Property');
const { RURAL_LAND_FIELDS } = require('../utils/ruralLandRecord');

// A rural property is identified by its land record, not a street address.
assert.deepStrictEqual(RURAL_LAND_FIELDS, [
  'district', 'upazila', 'union_name', 'village', 'mouza', 'khatiyan', 'dag',
  'land_area_decimal', 'current_use',
]);

// Sequelize must know every one of them, or the wizard writes them and they vanish.
for (const f of RURAL_LAND_FIELDS) {
  assert.ok(Property.rawAttributes[f], `Property model is missing ${f}`);
}

console.log('ruralLandRecord OK');
