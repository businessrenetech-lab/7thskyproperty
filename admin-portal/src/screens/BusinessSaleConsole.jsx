import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessSaleConsole, businessBuyerConsole } from '../config/consoles';

/* Business Sale / Buyer — Commercial's two consoles rendered for category="business". */
export default function BusinessSaleConsole() {
  return <ServiceConsole config={businessSaleConsole} />;
}

export function BusinessBuyerConsole() {
  return <ServiceConsole config={businessBuyerConsole} />;
}
