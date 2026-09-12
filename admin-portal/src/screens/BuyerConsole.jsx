import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { buyerConsole } from '../config/consoles';

/*
 * BuyerConsole — the Residential BUYER Service operations console.
 *
 * Shares the residential shell/accent and screens, but presents a buyer-only
 * sidebar (BUYER_NAV) so the sell groups (Sell Dashboard, Properties, Sale
 * Agreements, Settlements) disappear when working a buy. Buyer-owned routes are
 * mounted under this console in App.jsx; a "Switch" link crosses to the Sell side.
 */
export default function BuyerConsole() {
  return <ServiceConsole config={buyerConsole} />;
}
