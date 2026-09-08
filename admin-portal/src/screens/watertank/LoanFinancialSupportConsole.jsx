import React from 'react';
import ServiceConsole from '../../ui/ServiceConsole';
import { loanFinancialSupportConsole } from '../../config/consoles';

/*
 * LoanFinancialSupportConsole — the Loan & Financial Support operations console,
 * the second sub-service of Property Doc Verification & Transfer Support.
 *
 * Same shell + screens as Water Tank; only the config differs (teal accent,
 * /loan-financial-support/* nav, plus the Doc Manager and Loan Application
 * Tracker). Scoped to this service line by the X-Service-Line header and
 * serviceScope(req) on the backend. See SERVICE_MODULE_DUPLICATION.md.
 */
export default function LoanFinancialSupportConsole() {
  return <ServiceConsole config={loanFinancialSupportConsole} />;
}
