import React, { createContext, useContext } from 'react';

/*
 * pmScope — lets the Property Management operational screens run under either the
 * residential PM console (/property-management/*) or the commercial rent console
 * (/commercial/rent/*) without duplicating a single screen.
 *
 * A screen reads `usePmScope()` to know:
 *   - category    which properties/tenancies it operates on (residential|commercial)
 *   - listingType 'rent' for both (kept for future lease/short-term variants)
 *   - basePath    the console root, so its own links stay inside that console
 *   - label       the console name for headings
 *
 * With no provider (the residential console), it defaults to residential /
 * /property-management, so existing screens behave exactly as before.
 */
const DEFAULT_SCOPE = {
  category: 'residential',
  listingType: 'rent',
  basePath: '/property-management',
  label: 'Property Management',
};

const PmScopeContext = createContext(DEFAULT_SCOPE);

export function PmScopeProvider({ value, children }) {
  return <PmScopeContext.Provider value={{ ...DEFAULT_SCOPE, ...(value || {}) }}>{children}</PmScopeContext.Provider>;
}

export function usePmScope() {
  return useContext(PmScopeContext);
}

/** Build a console-relative path: pmPath(scope, '/rentals') → '/commercial/rent/rentals'. */
export function pmPath(scope, sub = '') {
  const base = (scope?.basePath || DEFAULT_SCOPE.basePath).replace(/\/$/, '');
  if (!sub) return base;
  return base + (sub.startsWith('/') ? sub : `/${sub}`);
}

export const COMMERCIAL_RENT_SCOPE = {
  category: 'commercial',
  listingType: 'rent',
  basePath: '/commercial/rent',
  label: 'Commercial · Rent',
};
