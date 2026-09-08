import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { propertyCareConciergeConsole } from '../../config/consoles';

/*
 * PropertyCareConciergeConsole — the Property Care & Concierge operations console.
 *
 * Same shell + screens as Water Tank; only the config differs (emerald accent,
 * /property-care-concierge/* nav, internal Team & Fleet instead of provider
 * onboarding, plus the Property Assets / Concierge & Access / Utilities registers).
 * Delivered by our own team + vehicles: work orders are worked through a Resource
 * Allocation step, with NO provider master agreement. Ongoing/recurring care plans
 * run through the shared AMC console. Scoped by the X-Service-Line header +
 * serviceScope(req).
 */
export default function PropertyCareConciergeConsole() {
  return <ServiceConsole config={propertyCareConciergeConsole} />;
}
