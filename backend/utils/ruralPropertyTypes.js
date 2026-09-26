/**
 * The rural property types (SOP Rural Rental Management §2 / Tenancy §2).
 *
 * This is the source of truth; admin-portal/src/config/ruralPropertyTypes.js
 * mirrors it for the wizard's select, and scripts/testRuralPropertyTypes.js fails
 * if the two drift apart.
 *
 * The SOP lists ten kinds but names eleven values — agricultural land and farming
 * land appear separately — so both are kept rather than silently merged.
 */
const RURAL_PROPERTY_TYPES = [
  'Agricultural Land',
  'Farming Land',
  'Farm House',
  'Rural Residential House',
  'Fishery',
  'Pond',
  'Dairy Farm',
  'Poultry Farm',
  'Orchard',
  'Commercial Rural',
  'Mixed Use Rural',
];

module.exports = { RURAL_PROPERTY_TYPES };
