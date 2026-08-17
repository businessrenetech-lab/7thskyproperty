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
 * it wrong. When Commercial and Rural get consoles of their own, this is the one
 * line that changes.
 */
const CONSOLE_CATEGORIES = { residential: '/residential' };

/** The base path a sales screen should navigate under, for this category. */
export const salesBase = (category) => CONSOLE_CATEGORIES[category] || '/sales';

/** The property file for one listing. */
export const propertyFilePath = (category, id) => `${salesBase(category)}/property/${id}`;

/** The listing wizard: new when given no id, editing when given one. */
export const propertyWizardPath = (category, id, query = '') => {
  const base = `${salesBase(category)}/properties/new${id ? `/${id}` : ''}`;
  return query ? `${base}?${query.replace(/^\?/, '')}` : base;
};
