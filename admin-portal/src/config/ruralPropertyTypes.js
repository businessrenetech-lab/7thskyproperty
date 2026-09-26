/**
 * The rural property types (SOP Rural Rental Management §2 / Tenancy §2).
 *
 * `property_type` is a free string shared with the other categories and already
 * holds junk ('', 'sa'), so this constrains the rural wizard's select and drives
 * the Property dashboard's grouping without touching the column for anyone else.
 *
 * The SOP lists ten kinds but names eleven values — agricultural land and
 * farming land appear separately — so both are kept rather than silently merged.
 */
export const RURAL_PROPERTY_TYPES = [
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
