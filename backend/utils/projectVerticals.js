/**
 * Which workflow verticals belong to which console.
 *
 * Projects and register entries are keyed by `vertical_key`, not by a property
 * category, so a console that asks for its projects by category needs this map.
 * Without it /api/projects returned all 82 projects to every console.
 *
 * Service lines (water_tank, ac, solar, business_registration, the interior
 * design lines) are deliberately absent: they are their own consoles with their
 * own project lists, not part of a property category.
 */
const { pmCategory } = require('./pmCategory');

const VERTICALS_BY_CATEGORY = {
  residential: ['leasing', 'short_stay', 'properties', 'properties_sale', 'residential_purchase'],
  commercial: ['commercial_rent', 'commercial_sale'],
  business: ['business_rent', 'business_sale', 'business_purchase'],
  rural: ['rural_rent', 'rural_sale', 'rural_tenancy', 'rural_purchase'],
};

/** The verticals for a console category, or null when the value is not a console. */
function verticalsForCategory(value) {
  const cat = pmCategory(value);
  return cat ? VERTICALS_BY_CATEGORY[cat] : null;
}

module.exports = { VERTICALS_BY_CATEGORY, verticalsForCategory };
