import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRentConsole, BUSINESS_RENT_NAV } from '../config/consoles';
import { PmScopeProvider, BUSINESS_RENT_SCOPE } from '../config/pmScope';

/*
 * BusinessRentConsole — leasing business premises (office, retail, restaurant,
 * warehouse, factory).
 *
 * Like Commercial Rent, it reuses the Property Management operational screens
 * verbatim; the PmScopeProvider tells every screen it renders to operate on
 * business rent properties (category 'business' AND listing_type 'rent' — the
 * business SALE book shares the category) and to keep its links inside
 * /business-rent/*. The BRM and BTM agreement builders, the price schedule and
 * the SOP dashboards are wired in App.jsx.
 */
export const BRT_NAV = BUSINESS_RENT_NAV.flatMap((g) => g.items);

export default function BusinessRentConsole() {
  return (
    <PmScopeProvider value={BUSINESS_RENT_SCOPE}>
      <ServiceConsole config={businessRentConsole} />
    </PmScopeProvider>
  );
}
