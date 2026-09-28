import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { ruralRentConsole, RURAL_RENT_NAV } from '../config/consoles';
import { PmScopeProvider, RURAL_RENT_SCOPE } from '../config/pmScope';

/*
 * RuralRentConsole — leasing rural property.
 *
 * The fourth console on the Property Management screens, after residential,
 * Commercial Rent and Business Rent. The PmScopeProvider tells every screen it
 * renders to operate on rural RENT property — category AND listing_type, because
 * Rural Sale shares the category — and to keep its links inside /rural/rent/*.
 */
export const RRT_NAV = RURAL_RENT_NAV.flatMap((g) => g.items);

export default function RuralRentConsole() {
  return (
    <PmScopeProvider value={RURAL_RENT_SCOPE}>
      <ServiceConsole config={ruralRentConsole} />
    </PmScopeProvider>
  );
}
