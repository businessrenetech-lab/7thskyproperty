// Confidential business listings on the public website. Every business listing
// is a TEASER (Business Sale SOP Step 13): no business name, street address,
// coordinates or exact financials. Full details only via a released NDA token.
const BUSINESS_TYPES = {
  retail: 'Retail', restaurant: 'Restaurant / Café', hospitality: 'Hospitality', manufacturing: 'Manufacturing',
  service: 'Service', trading: 'Trading', industrial: 'Industrial', franchise: 'Franchise', online: 'Online', other: 'Other',
};
const LAKH = 100000;
const CRORE = 10000000;

function turnoverBand(amount) {
  const n = Number(amount);
  if (amount == null || amount === '' || !Number.isFinite(n) || n <= 0) return 'On request';
  if (n < 50 * LAKH) return 'Under ৳50 L';
  if (n < CRORE) return '৳50 L–1 Cr';
  if (n < 2 * CRORE) return '৳1–2 Cr';
  if (n < 5 * CRORE) return '৳2–5 Cr';
  if (n < 10 * CRORE) return '৳5–10 Cr';
  return '৳10 Cr+';
}

function yearsEstablished(year, now = new Date()) {
  const y = Number(year);
  return Number.isInteger(y) && y > 1800 && y <= now.getFullYear() ? now.getFullYear() - y : null;
}

// Fields that could identify the business — never in a teaser.
const TEASER_HIDDEN = ['address', 'postal_code', 'latitude', 'longitude', 'map_url', 'description', 'remarks',
  'nearby_places', 'floor_plan_url', 'unit_floor_plans', 'seo_title', 'seo_description', 'owner_contact_id', 'access_contacts'];

const PROFILE_PUBLIC_FULL = ['business_type', 'industry', 'ownership_structure', 'company_registration_no', 'trade_licence_no',
  'tin_bin', 'year_established', 'staff_count', 'lease_status', 'lease_details', 'reason_for_sale', 'annual_turnover',
  'annual_profit', 'monthly_revenue', 'included_assets', 'stock_info', 'employee_info', 'ip_details'];

function typeLabel(profile) {
  return BUSINESS_TYPES[profile && profile.business_type] || null;
}

function applyBusinessTeaser(pub, profile) {
  const p = profile || {};
  const label = typeLabel(p);
  const out = { ...pub };
  for (const k of TEASER_HIDDEN) delete out[k];
  const where = pub.area || pub.city || 'Bangladesh';
  out.title = (p.teaser_headline && String(p.teaser_headline).trim()) || `${label ? `${label} business` : 'Business'} in ${where}`;
  out.slug = pub.property_code ? String(pub.property_code).toLowerCase() : null; // the real slug may carry the name
  out.description = p.teaser_summary || null;
  out.bedrooms = null; out.bathrooms = null; out.balconies = null;
  out.business = {
    business_type: p.business_type || null,
    business_type_label: label || 'Business',
    industry: p.industry || null,
    staff_count: p.staff_count ?? null,
    years_established: yearsEstablished(p.year_established),
    turnover_band: turnoverBand(p.annual_turnover),
    confidential: true,
  };
  return out;
}

// For a buyer holding a released NDA token only.
function fullBusinessDetails(pub, profile) {
  const p = profile || {};
  const business = { business_type_label: typeLabel(p) || 'Business', confidential: false };
  for (const k of PROFILE_PUBLIC_FULL) business[k] = p[k] ?? null;
  return { ...pub, business };
}

module.exports = { BUSINESS_TYPES, turnoverBand, yearsEstablished, applyBusinessTeaser, fullBusinessDetails };
