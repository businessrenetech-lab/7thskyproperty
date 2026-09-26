// Which property category a console locks its shared screens to, from the URL.
//
// One set of sales screens is mounted under several consoles, so the console can
// only be known from the path. This used to lock Business alone and let
// Residential and Commercial "show every category, as before" — which meant the
// Commercial console listed residential contacts, clients, mandates, invoices,
// introductions and money, and two screens even asked for `category=residential`
// explicitly while sitting inside Commercial.
//
// Order matters only for readability here: `/business-rent` and
// `/business-registration` are matched before `/business`, and the `(\/|$)`
// guards already stop `/business` from swallowing them.
//
// null means "not a console" — the global /sales/* and /clients screens, which
// stay unscoped exactly as they are today.
const RULES = [
  [/^\/property-management(\/|$)/, 'residential'],
  [/^\/residential(\/|$)/, 'residential'],
  [/^\/commercial(\/|$)/, 'commercial'],
  // A service line, not a property category: it must not lock to 'business'.
  [/^\/business-registration(\/|$)/, null],
  [/^\/business-rent(\/|$)/, 'business'],
  [/^\/business(\/|$)/, 'business'],
  [/^\/rural(\/|$)/, 'rural'],
];

/** The category this path's console works in, or null outside a console. */
export function consoleCategoryForPath(pathname) {
  const p = String(pathname || '');
  for (const [re, cat] of RULES) if (re.test(p)) return cat;
  return null;
}

/**
 * The category a console locks its shared SALES screens to.
 * Kept as its own name because nine screens import it through useSalesCategory().
 */
export function lockedCategoryForPath(pathname) {
  return consoleCategoryForPath(pathname);
}
