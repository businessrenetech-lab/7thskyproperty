import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { airConditioningConsole } from '../../config/consoles';

/*
 * AirConditioningConsole — the Air Conditioning operations console.
 *
 * It renders the SAME shell (ui/ServiceConsole) and the SAME screens as Water
 * Tank; only the config differs (violet accent, /air-conditioning/* nav). The
 * screens scope their data to Air Conditioning via the X-Service-Line header
 * (services/api.js) and the backend's serviceScope(req). See
 * SERVICE_MODULE_DUPLICATION.md for the shared-core contract.
 */
export default function AirConditioningConsole() {
  return <ServiceConsole config={airConditioningConsole} />;
}
