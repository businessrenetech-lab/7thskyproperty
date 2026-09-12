import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { interiorServiceConsole } from '../../config/consoles';

/*
 * InteriorServiceConsole — the Interior Service Solutions operations console.
 *
 * Same shell (ui/ServiceConsole) and screens as Water Tank; only the config
 * differs (purple accent, /interior-service-solutions/* nav, no Providers/
 * Compliance/AMC). Screens scope their data by the X-Service-Line header
 * (services/api.js) → the residential_interior_design service line.
 */
export default function InteriorServiceConsole() {
  return <ServiceConsole config={interiorServiceConsole} />;
}
