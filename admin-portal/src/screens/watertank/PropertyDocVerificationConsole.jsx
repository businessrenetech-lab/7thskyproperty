import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { propertyDocVerificationConsole } from '../../config/consoles';

/*
 * PropertyDocVerificationConsole — the Property Documentation & Verification
 * operations console, the third sub-service of Property Doc Verification &
 * Transfer Support.
 *
 * Same shell + screens as Water Tank; only the config differs (orange accent,
 * /property-documentation-verification/* nav, plus the Doc Manager and
 * Verification Register). Scoped to this service line by the X-Service-Line header
 * and serviceScope(req) on the backend. See SERVICE_MODULE_DUPLICATION.md.
 */
export default function PropertyDocVerificationConsole() {
  return <ServiceConsole config={propertyDocVerificationConsole} />;
}
