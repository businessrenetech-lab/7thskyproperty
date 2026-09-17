import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { commercialConsole, commercialBuyerConsole } from '../config/consoles';

/*
 * CommercialConsole — the Commercial Sales operations console.
 *
 * The same sales screens as Residential, rendered with category="commercial"
 * and rebased onto /commercial/*. Fully isolated from residential (its own
 * agreements, listings and enquiries). CommercialBuyerConsole presents the
 * buyer-only sidebar for the /commercial/buyer* routes.
 */
export default function CommercialConsole() {
  return <ServiceConsole config={commercialConsole} />;
}

export function CommercialBuyerConsole() {
  return <ServiceConsole config={commercialBuyerConsole} />;
}
