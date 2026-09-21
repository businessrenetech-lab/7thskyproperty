// Sales-engine category scoping. Unknown values are ignored (null), never an
// error, and a request without a category behaves exactly as before.
const SALES_CATEGORIES = ['residential', 'commercial', 'rural', 'business'];

function salesCategory(value) {
  const v = String(value == null ? '' : value).toLowerCase();
  return SALES_CATEGORIES.includes(v) ? v : null;
}

// Property ids in a category (branch-scoped) — for tables that only link a property.
async function propertyIdsInCategory(category, scope = {}) {
  const Property = require('../models/Property');
  const rows = await Property.findAll({ where: { ...scope, category }, attributes: ['id'], raw: true });
  return rows.map((r) => Number(r.id));
}

module.exports = { SALES_CATEGORIES, salesCategory, propertyIdsInCategory };
