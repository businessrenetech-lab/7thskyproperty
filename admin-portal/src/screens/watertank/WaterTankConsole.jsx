import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { waterTankConsole, WATER_TANK_NAV } from '../../config/consoles';

/*
 * WaterTankConsole — the Water Tank operations console.
 *
 * The shell that used to live here is now `ui/ServiceConsole.jsx`, and the nav
 * is `config/consoles.js`. Nothing about this console changed in the move: same
 * eight groups, same twenty-one destinations, same cyan accent, same badges and
 * capability gating. What changed is that Short Term Stay — and Property
 * Management after it — get the same shell instead of a copy of it.
 *
 * The two nav exports stay here because the command palette and other screens
 * import them from this path.
 */

export const WT_NAV_GROUPS = WATER_TANK_NAV;
export const WT_NAV = WATER_TANK_NAV.flatMap((g) => g.items);

export default function WaterTankConsole() {
  return <ServiceConsole config={waterTankConsole} />;
}
