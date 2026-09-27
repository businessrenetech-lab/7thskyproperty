import { useLocation } from 'react-router-dom';
import { lockedCategoryForPath } from './categoryLock.mjs';

/*
 * Where a sales screen navigates, given the category it is serving.
 *
 * `PropertySellDashboard`, `DealsBoard` and `SalesEnquiries` are ONE set of
 * components rendered three times — residential, commercial and rural — with
 * only a `category` prop between them. Residential now opens in its own console
 * and the other two do not, so the same click has to lead to two different
 * places: inside the console for residential, and to the global `/sales/*`
 * screens for the rest.
 *
 * That decision lives here rather than in each component, because there are six
 * navigation sites across four files and the alternative is six chances to get
 * it wrong. This is the one line that changes when a category gets a console of
 * its own; rural got one with the Rural Sale build, and all sixteen destinations
 * the shared screens navigate to were verified to exist under /rural first.
 */
const CONSOLE_CATEGORIES = {
  residential: '/residential', commercial: '/commercial', business: '/business', rural: '/rural',
};

/** The base path a sales screen should navigate under, for this category. */
export const salesBase = (category) => CONSOLE_CATEGORIES[category] || '/sales';

/** The property file for one listing. */
export const propertyFilePath = (category, id) => `${salesBase(category)}/property/${id}`;

/** The five-view settlement desk for one property's settlement. */
export const settlementDeskPath = (category, id) => `${salesBase(category)}/property/${id}/settlement`;

/** Buyer mandates: the list, and one mandate's detail. */
export const mandatesPath = (category) => `${salesBase(category)}/mandates`;
export const mandateDetailPath = (category, id) => `${salesBase(category)}/mandates/${id}`;

/** The properties register for this category. */
export const salesPropertiesPath = (category) => `${salesBase(category)}/properties`;

/** The listing wizard: new when given no id, editing when given one. */
export const propertyWizardPath = (category, id, query = '') => {
  const base = `${salesBase(category)}/properties/new${id ? `/${id}` : ''}`;
  return query ? `${base}?${query.replace(/^\?/, '')}` : base;
};

/** Client profile path for a category (inside console for residential, global /clients for others). */
export const clientProfilePath = (category, { clientId, contactId } = {}) => {
  const base = CONSOLE_CATEGORIES[category] ? `${CONSOLE_CATEGORIES[category]}/contacts/clients` : '/clients';
  if (clientId) return `${base}?client=${clientId}`;
  if (contactId) return `${base}?contact=${contactId}`;
  return base;
};


/** The category the current console locks shared sales screens to, or null outside one. */
export function useSalesCategory() {
  const { pathname } = useLocation();
  return lockedCategoryForPath(pathname);
}

/**
 * The sales console the current path belongs to — '/residential', '/commercial',
 * '/business', '/rural', or '/sales' outside those.
 *
 * Shared sales screens are mounted under several consoles and used to hard-code
 * '/residential/...' in 27 places, so a button in Commercial dropped the user
 * into the Residential console. Every sale destination (agreements, marketing,
 * mandates, buy deals, buyer service, buyer invoices, work queue, property file)
 * exists symmetrically under all four sales consoles, so rebasing is safe.
 *
 * A rent console rebases to its own SALES sibling (/commercial/rent -> /commercial,
 * /rural/rent -> /rural), because that is where those destinations live.
 */
export function useSalesHome() {
  const { pathname } = useLocation();
  return salesBase(lockedCategoryForPath(pathname));
}
