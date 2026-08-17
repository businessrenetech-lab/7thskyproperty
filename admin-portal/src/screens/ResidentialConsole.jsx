import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { residentialConsole, RESIDENTIAL_NAV } from '../config/consoles';

/*
 * ResidentialConsole — the Residential Sales operations console.
 *
 * The fourth vertical on the shared shell. Nothing in `ui/ServiceConsole.jsx`
 * changed for it.
 *
 * One thing about this console is different from the other three: its screens
 * are SHARED with Commercial and Rural, which pass a different `category` prop
 * to the same components. So the property file and the listing wizard are routed
 * here under `/residential/*` for this console, and stay at `/sales/*` for the
 * other two categories — see `salesBase()` in `screens/sales/paths.js`, which is
 * the one place that decides which.
 */

export const RES_NAV_GROUPS = RESIDENTIAL_NAV;
export const RES_NAV = RESIDENTIAL_NAV.flatMap((g) => g.items);

export default function ResidentialConsole() {
  return <ServiceConsole config={residentialConsole} />;
}
