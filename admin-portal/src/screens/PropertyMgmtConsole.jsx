import React from 'react';
import ServiceConsole from '../ui/ServiceConsole';
import { propertyMgmtConsole, PROPERTY_MGMT_NAV } from '../config/consoles';

/*
 * PropertyMgmtConsole — the Property Management operations console.
 *
 * The third vertical to open this way, and the one that made the shell earn its
 * keep: it cost this file, a config object and a route block. Nothing in
 * `ui/ServiceConsole.jsx` changed for it except one honest fix — comparing nav
 * paths without their query strings, because several Property Management
 * destinations are shared screens filtered by one.
 *
 * The URLs are unchanged. `/property-management/*` meant these screens before
 * and means them now; only the chrome around them is different, so nothing
 * anybody has bookmarked needs a redirect.
 */

export const PM_NAV_GROUPS = PROPERTY_MGMT_NAV;
export const PM_NAV = PROPERTY_MGMT_NAV.flatMap((g) => g.items);

export default function PropertyMgmtConsole() {
  return <ServiceConsole config={propertyMgmtConsole} />;
}
