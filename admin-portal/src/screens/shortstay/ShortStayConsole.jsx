import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { shortStayConsole, SHORT_STAY_NAV } from '../../config/consoles';

/*
 * ShortStayConsole — the Short Term Stay operations console.
 *
 * Short Term Stay used to be one hub screen inside the global admin Layout,
 * reached by query string (`?tab=bookings`) with its nav living in the shared
 * sidebar among every other vertical. Its sixteen screens were already real;
 * only the shell was missing.
 *
 * It now opens the way Water Tank does — own sidebar, own window, own accent,
 * addressable paths — through the same `ServiceConsole`. The screens themselves
 * are untouched: they are written in the pm-design system, so the console hosts
 * them via `contentClass: 'pm-scope'` rather than restyling sixteen files.
 */

export const SS_NAV_GROUPS = SHORT_STAY_NAV;
export const SS_NAV = SHORT_STAY_NAV.flatMap((g) => g.items);

export default function ShortStayConsole() {
  return <ServiceConsole config={shortStayConsole} />;
}
