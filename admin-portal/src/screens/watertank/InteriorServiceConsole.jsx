import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { residentialInteriorConsole } from '../../config/consoles';

/*
 * ResidentialInteriorConsole — the Residential Interior Design operations console.
 *
 * Same shell (ui/ServiceConsole) and screens as Water Tank; only the config
 * differs (purple accent, /residential-interior-design/* nav, no Providers/
 * Compliance/AMC). Screens scope their data by the X-Service-Line header
 * (services/api.js) → the residential_interior_design service line.
 */
export default function ResidentialInteriorConsole() {
  return <ServiceConsole config={residentialInteriorConsole} />;
}
