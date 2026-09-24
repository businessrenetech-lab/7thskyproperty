/**
 * Property-Management category scoping.
 *
 * The PM screens run under three consoles — residential (/property-management),
 * commercial (/commercial/rent) and business (/business-rent) — off one set of
 * tables. Before this existed the controllers compared against 'commercial' and
 * 'residential' inline and an unknown value fell through to NO filter, so a
 * console asking for anything else saw every property and every tenancy.
 *
 * null means "not a console category": the caller leaves the query unfiltered,
 * which is exactly the behaviour every existing caller already had.
 */
const PM_CATEGORIES = ['residential', 'commercial', 'business'];

function pmCategory(value) {
  const v = String(value == null ? '' : value).toLowerCase().trim();
  return PM_CATEGORIES.includes(v) ? v : null;
}

/** SQL fragment for a validated category, or '' — never interpolates raw input. */
function pmCategoryClause(value, column = 'category') {
  const cat = pmCategory(value);
  return cat ? ` AND ${column} = '${cat}'` : '';
}

module.exports = { PM_CATEGORIES, pmCategory, pmCategoryClause };
