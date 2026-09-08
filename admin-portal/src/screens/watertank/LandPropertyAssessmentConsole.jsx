import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { landPropertyAssessmentConsole } from '../../config/consoles';

/*
 * LandPropertyAssessmentConsole — the Survey & Valuation operations console, the
 * first sub-service of Property Doc Verification & Transfer Support.
 *
 * It renders the SAME shell (ui/ServiceConsole) and the SAME screens as Water
 * Tank; only the config differs (indigo accent, /land-property-assessment/* nav).
 * The screens scope their data to this service line via the X-Service-Line header
 * (services/api.js) and the backend's serviceScope(req). See
 * SERVICE_MODULE_DUPLICATION.md for the shared-core contract.
 */
export default function LandPropertyAssessmentConsole() {
  return <ServiceConsole config={landPropertyAssessmentConsole} />;
}
