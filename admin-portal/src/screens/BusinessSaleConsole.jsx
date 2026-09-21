import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessSaleConsole } from '../config/consoles';

/*
 * BusinessSaleConsole — the Business Sale / Purchase operations console.
 *
 * A business is not a property, so this console has its own subject model and
 * modules (added phase by phase). Phase 0 ships the two Customer Service
 * Agreements (SSPC-BSS-01 / SSPC-BPS-01) and their price schedules, on the
 * isolated 'business' category, rebased onto /business/*.
 */
export default function BusinessSaleConsole() {
  return <ServiceConsole config={businessSaleConsole} />;
}
