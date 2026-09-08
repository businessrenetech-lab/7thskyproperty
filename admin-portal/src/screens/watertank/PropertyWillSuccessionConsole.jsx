import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { propertyWillSuccessionConsole } from '../../config/consoles';

/*
 * PropertyWillSuccessionConsole — the Property Will & Succession Support
 * operations console, the fourth sub-service of Property Doc Verification &
 * Transfer Support.
 *
 * Same shell + screens as Water Tank; only the config differs (rose accent,
 * /property-will-succession/* nav, plus the Doc Manager and Beneficiary Register).
 * Scoped to this service line by the X-Service-Line header and serviceScope(req)
 * on the backend. See SERVICE_MODULE_DUPLICATION.md.
 */
export default function PropertyWillSuccessionConsole() {
  return <ServiceConsole config={propertyWillSuccessionConsole} />;
}
