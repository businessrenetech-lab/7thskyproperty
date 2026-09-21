import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRentConsole } from '../config/consoles';

// Business Rent — the leasing console: rental listings, tenant enquiries,
// rental/tenancy management agreements, rent price schedule & reports.
export default function BusinessRentConsole() {
  return <ServiceConsole config={businessRentConsole} />;
}
