// What the unauthenticated website may see of a property. An ALLOWLIST, not a
// denylist: any column added to properties later stays private by default.
const PUBLIC_DETAIL_FIELDS = [
  'id', 'property_code', 'title', 'slug', 'category', 'property_type', 'listing_type',
  'status', 'listing_status', 'occupancy_status', 'price', 'price_unit', 'currency', 'is_negotiable',
  'address', 'area', 'city', 'district', 'postal_code', 'country',
  'bedrooms', 'bathrooms', 'balconies', 'parking', 'drawing_rooms', 'dining_rooms',
  'land_size', 'building_size', 'floor_number', 'total_floors', 'total_units', 'building_height',
  'year_built', 'furnishing', 'property_condition', 'features', 'nearby_places', 'utilities',
  'description', 'featured_image_url', 'floor_plan_url', 'video_tour_url', 'drone_video_url',
  'virtual_tour_url', 'unit_floor_plans', 'is_featured', 'approved_monthly_rent',
  'lease_min_period_months', 'seo_title', 'seo_description', 'created_at',
];

// Same rule as getPublishedProperties' visibility filter.
const PUBLIC_STATUSES = ['sold', 'settled', 'rented', 'occupied', 'under_application', 'under_offer', 'reserved'];
const PUBLIC_LISTING_STATUSES = ['sold', 'let', 'under_offer', 'under_application'];

function isPubliclyVisible(p) {
  if (!p) return false;
  return p.is_published === true || p.is_published === 1
    || p.listing_type === 'short_term'
    || PUBLIC_STATUSES.includes(p.status)
    || PUBLIC_LISTING_STATUSES.includes(p.listing_status);
}

function pickPublic(plain) {
  const out = {};
  for (const k of PUBLIC_DETAIL_FIELDS) if (plain && plain[k] !== undefined) out[k] = plain[k];
  return out;
}

module.exports = { PUBLIC_DETAIL_FIELDS, isPubliclyVisible, pickPublic };
