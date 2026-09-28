import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { businessRegistrationConsole } from '../config/consoles';

/*
 * BusinessRegistrationConsole — the Business Registration operations console.
 *
 * Same shell and same screens as Water Tank; only the config differs (teal accent,
 * /business-registration/* nav). Screens scope their data with the X-Service-Line
 * header (services/api.js) and the backend's serviceScope(req).
 * See SERVICE_MODULE_DUPLICATION.md for the shared-core contract.
 */
export default function BusinessRegistrationConsole() {
  return <ServiceConsole config={businessRegistrationConsole} />;
}
