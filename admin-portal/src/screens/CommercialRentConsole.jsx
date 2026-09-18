import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { commercialRentConsole, COMMERCIAL_RENT_NAV } from '../config/consoles';
import { PmScopeProvider, COMMERCIAL_RENT_SCOPE } from '../config/pmScope';

/*
 * CommercialRentConsole — the commercial rental & tenancy management console.
 *
 * It reuses the Property Management operational screens verbatim; the only
 * difference is the PmScopeProvider, which tells every screen it renders to
 * operate on commercial properties and to keep its own links inside
 * /commercial/rent/*. New commercial-specific screens (agreements, price
 * schedules) are wired in App.jsx exactly as the PM console wires its own.
 */
export const CMR_NAV = COMMERCIAL_RENT_NAV.flatMap((g) => g.items);

export default function CommercialRentConsole() {
  return (
    <PmScopeProvider value={COMMERCIAL_RENT_SCOPE}>
      <ServiceConsole config={commercialRentConsole} />
    </PmScopeProvider>
  );
}
