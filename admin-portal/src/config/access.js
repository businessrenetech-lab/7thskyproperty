/*
 * access.js — which access area a page belongs to, for people with a custom role (Users and roles).
 *
 * The server decides what a custom role may do (backend/config/accessAreas.js); this only keeps the menus
 * honest, so nobody is offered a door that will not open. Built-in roles are not filtered here.
 * Area keys match the backend ones; 'admin' pages (settings, website, users) are never given to a custom role.
 */
const PATH_AREAS = [
  ['/contacts', 'crm'], ['/clients', 'crm'], ['/leads', 'crm'], ['/providers', 'crm'], ['/role-onboarding', 'crm'],
  ['/agreements', 'crm'], ['/signing', 'crm'], ['/documents', 'crm'],
  ['/property-management', 'rentals'], ['/commercial/rent', 'rentals'],
  ['/short-stay', 'short_stay'],
  ['/residential', 'sales'], ['/commercial', 'sales'], ['/rural', 'sales'], ['/sales', 'sales'],
  ['/business', 'business'], ['/business-rent', 'business'],
  ['/business-registration', 'line:business_registration'],
  ['/water-tank', 'line:water_tank'], ['/air-conditioning', 'line:air_conditioning'],
  ['/land-property-assessment', 'line:land_property_assessment'], ['/loan-financial-support', 'line:loan_financial_support'],
  ['/property-documentation-verification', 'line:property_documentation_verification'], ['/property-will-succession', 'line:property_will_succession'],
  ['/removal-relocation', 'line:removal_relocation'], ['/property-care-concierge', 'line:property_care_concierge'],
  ['/residential-interior-design', 'line:residential_interior_design'], ['/fitness-room-interior-design', 'line:fitness_room_interior_design'],
  ['/commercial-interior-design', 'line:commercial_interior_design'], ['/custom-design-fit-out', 'line:custom_design_fitout'],
  ['/furniture-styling-consultation', 'line:furniture_styling_consultation'], ['/prayer-room-interior-design', 'line:prayer_room_interior_design'],
  ['/space-planning-renovation', 'line:space_planning_renovation'],
  ['/invoices', 'accounting'], ['/landlord-bills', 'accounting'], ['/rental-receipts', 'accounting'], ['/payments', 'accounting'],
  ['/folios', 'accounting'], ['/account-categories', 'accounting'], ['/reports', 'accounting'],
  ['/website-management', 'admin'], ['/website-content', 'admin'], ['/settings', 'admin'], ['/users', 'admin'],
  ['/agreement-templates', 'admin'], ['/services', 'admin'],
];

const under = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

/** The area of a page path, or null for pages everyone uses (dashboard, HR, account). Longest prefix wins. */
export function areaForPath(path) {
  let best = null;
  PATH_AREAS.forEach(([p, a]) => { if (under(path, p) && (!best || p.length > best[0].length)) best = [p, a]; });
  return best ? best[1] : null;
}

export const isCustomRole = (user) => !!user?.access?.custom;

/** May this user open this page? Always yes for built-in roles. */
export function mayOpen(user, path) {
  if (!isCustomRole(user)) return true;
  const area = areaForPath(path);
  if (!area) return true;
  return (user.access.areas?.[area] || []).length > 0;
}

/** The roles this user counts as on this page: theirs, plus a custom role's stand-ins for the page's area. */
export function rolesOn(user, path) {
  if (!user?.role) return [];
  if (!isCustomRole(user)) return [user.role];
  return [user.role, ...(user.access.proxies?.[areaForPath(path)] || [])];
}
