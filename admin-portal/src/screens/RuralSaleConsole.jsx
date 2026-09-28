import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { ruralSaleConsole, ruralBuyerConsole } from '../config/consoles';
import { PmScopeProvider, RURAL_SALE_SCOPE } from '../config/pmScope';

/*
 * Rural Sale / Buyer - Commercial's two sales consoles rendered for
 * category="rural". The shared sales screens already scope themselves by
 * category (SALES_CATEGORIES has held 'rural' since the console-isolation work),
 * so these wrap them rather than copying them.
 *
 * The sales screens take category as a prop, but the rural-only screens (land
 * records, ownership verification) read usePmScope() - and rural SALE shares
 * category 'rural' with rural RENT, so without a scope they would show the rent
 * book. RURAL_SALE_SCOPE pins listing_type to 'sale'.
 */
export default function RuralSaleConsole() {
  return (
    <PmScopeProvider value={RURAL_SALE_SCOPE}>
      <ServiceConsole config={ruralSaleConsole} />
    </PmScopeProvider>
  );
}

export function RuralBuyerConsole() {
  return (
    <PmScopeProvider value={RURAL_SALE_SCOPE}>
      <ServiceConsole config={ruralBuyerConsole} />
    </PmScopeProvider>
  );
}
