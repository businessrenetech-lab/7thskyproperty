/**
 * accessAreas.js — the parts of the system a custom role can be given, and what each level means.
 *
 * A custom role never gets a new permission model of its own. Inside an area it is given, it counts as the
 * built-in role of the level it holds, so every existing route guard (roleMiddleware lists, wtRoles tiers)
 * already knows what it may do. Outside its areas it counts as nothing.
 *
 *   sales       as sales_executive        enquiries, clients, quotes
 *   operations  as property_manager (and the Water Tank field roles)   requests, work orders, agreements
 *   finance     as accounts               invoices, receipts, payments
 *   manage      as branch_admin           everything in the area for its own branch, including deletes
 *
 * Accounts, roles, passwords, settings, branches and automation are in no area: only built-in admins use them.
 * Water Tank and the service lines cloned from it share one set of /api/wt-* routes; the line comes from the
 * X-Service-Line header, the same value serviceScope() filters the data by, so a grant for one line never
 * reads another line's records.
 */
const { SERVICE_LINE_KEYS, getServiceLine } = require('./serviceLines');
const { resolveServiceLine } = require('../utils/controllerHelpers');

const LEVELS = Object.freeze([
  { key: 'sales', label: 'Sales', hint: 'Enquiries, clients and quotes', roles: ['sales_executive'] },
  { key: 'operations', label: 'Operations', hint: 'Requests, work orders, properties and agreements', roles: ['property_manager', 'operations', 'coordinator', 'technician'] },
  { key: 'finance', label: 'Finance', hint: 'Invoices, receipts and payments', roles: ['accounts'] },
  { key: 'manage', label: 'Manage', hint: 'Everything in this area for their branch, including deleting', roles: ['branch_admin'] },
]);
const LEVEL_KEYS = LEVELS.map((l) => l.key);

const LINE_PREFIXES = ['/api/wt-', '/api/interior-variations', '/api/br-line', '/api/business-registration-'];

// Ordered: the first matching prefix wins. A prefix ending in '-' matches a family of mounts.
const AREAS = Object.freeze([
  { key: 'crm', label: 'CRM', group: 'Customers', prefixes: ['/api/contacts', '/api/party-role-profiles', '/api/clients', '/api/leads', '/api/providers', '/api/agreements', '/api/signing', '/api/documents', '/api/kyc', '/api/communications', '/api/message-templates', '/api/agreement-templates', '/api/services', '/api/service-catalog'] },
  { key: 'rentals', label: 'Property management and rent', group: 'Property', prefixes: ['/api/property-management', '/api/properties', '/api/tenancies', '/api/tenant-applications', '/api/rental-assessments', '/api/rental-enquiries', '/api/owner-statements', '/api/rptm', '/api/rprm', '/api/vacancy-notices', '/api/deposit-settlements', '/api/rental-reports', '/api/disbursements', '/api/utility-bills', '/api/tenant-requests', '/api/arrears-actions', '/api/marketing-activities', '/api/expense-approvals', '/api/property-risks', '/api/move-in-checklist', '/api/rent-protections', '/api/care', '/api/inspections', '/api/work-orders', '/api/projects', '/api/registers'] },
  { key: 'short_stay', label: 'Short term stay', group: 'Property', prefixes: ['/api/short-stay', '/api/sts', '/api/short-stay-verification', '/api/sts-disbursements'] },
  { key: 'sales', label: 'Property sales and buyers', group: 'Property', prefixes: ['/api/sales', '/api/sales-enquiries', '/api/sales-agreements', '/api/sales-catalog', '/api/sales-payments', '/api/deals', '/api/buyer-mandates', '/api/rural-sourcing', '/api/rural-rent', '/api/rural-sale', '/api/marketing'] },
  { key: 'business', label: 'Business sale, buy and rent', group: 'Property', prefixes: ['/api/business-rent', '/api/business-ndas', '/api/business-listings', '/api/business-enquiries', '/api/business-assessments', '/api/business-documents', '/api/business-inspections', '/api/business-offers', '/api/business-settlements', '/api/business-invoices', '/api/business-reports', '/api/business-mandates', '/api/business-targets', '/api/business-leases', '/api/business-rent-collections', '/api/business-maintenance'] },
  ...SERVICE_LINE_KEYS.map((k) => ({ key: `line:${k}`, label: getServiceLine(k).label, group: 'Service lines', line: k, prefixes: [] })),
  { key: 'accounting', label: 'Accounting', group: 'Management', prefixes: ['/api/invoices', '/api/billing', '/api/account-categories', '/api/folios', '/api/payments', '/api/budget', '/api/accounting', '/api/finance', '/api/reconciliation', '/api/expenses', '/api/assets', '/api/payroll'] },
]);

// Screens everyone signed in uses. A custom role opens them at the levels it holds anywhere, never as manager.
const COMMON_PREFIXES = ['/api/dashboard', '/api/notifications', '/api/saved-views', '/api/uploads', '/api/line-dashboards', '/api/appearance'];

const under = (path, prefix) => (prefix.endsWith('-') ? path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`));

/** The area a request is in: an AREAS key, 'common', or null (no custom role may use it). */
function areaForRequest(req) {
  const path = String(req?.baseUrl || '');
  if (LINE_PREFIXES.some((p) => under(path, p))) {
    if (under(path, '/api/br-line') || under(path, '/api/business-registration-')) return 'line:business_registration';
    return `line:${resolveServiceLine(req)}`;
  }
  // Longest prefix first, so /api/business-rent-collections is not taken for /api/business-rent.
  let best = null;
  AREAS.forEach((a) => a.prefixes.forEach((p) => { if (under(path, p) && (!best || p.length > best.len)) best = { key: a.key, len: p.length }; }));
  if (best) return best.key;
  if (COMMON_PREFIXES.some((p) => under(path, p))) return 'common';
  return null;
}

/** The built-in roles a list of levels counts as. Never super_admin. */
function proxyRolesFor(levels) {
  const out = [];
  LEVELS.forEach((l) => { if ((levels || []).includes(l.key)) l.roles.forEach((r) => { if (!out.includes(r)) out.push(r); }); });
  return out;
}

module.exports = { LEVELS, LEVEL_KEYS, AREAS, COMMON_PREFIXES, areaForRequest, proxyRolesFor };
