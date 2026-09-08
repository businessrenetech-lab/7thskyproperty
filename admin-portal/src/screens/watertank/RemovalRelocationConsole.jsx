import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { removalRelocationConsole } from '../../config/consoles';

/*
 * RemovalRelocationConsole — the Removal & Relocation operations console.
 *
 * Same shell + screens as Water Tank; only the config differs (amber-brown accent,
 * /removal-relocation/* nav, Team & Fleet + Inventory instead of provider
 * onboarding). Delivered by our own crew + vehicles: work orders are worked through
 * a Resource Allocation step (crew + vehicle, optional external provider), with NO
 * provider master agreement. Scoped by the X-Service-Line header + serviceScope(req).
 */
export default function RemovalRelocationConsole() {
  return <ServiceConsole config={removalRelocationConsole} />;
}
