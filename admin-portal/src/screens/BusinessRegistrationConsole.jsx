import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRegistrationConsole } from '../config/consoles';

/*
 * BusinessRegistrationConsole — the Business Registration operations console.
 *
 * A service-delivery project line (trade licence, company registration, RJSC,
 * TIN/BIN/VAT and corporate documentation coordination) — not a marketplace, so
 * it has its own subject model (registration projects) and modules, added phase
 * by phase. Phase 0 ships the Customer Service Agreement (SSPC-BR-CSA-01) and its
 * price schedule, on the isolated 'business_registration' category.
 */
export default function BusinessRegistrationConsole() {
  return <ServiceConsole config={businessRegistrationConsole} />;
}
