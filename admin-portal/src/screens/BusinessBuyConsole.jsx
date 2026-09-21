import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessBuyConsole } from '../config/consoles';

// Business Buy — the acquisition (buy-side) console: mandates, acquirer enquiries,
// purchase agreements, buy invoices & reports. Separate from Sale and Rent.
export default function BusinessBuyConsole() {
  return <ServiceConsole config={businessBuyConsole} />;
}
