import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import {
  Users, Truck, Building2, ClipboardCheck, Landmark, Package, TrendingUp,
} from 'lucide-react';
import { useSvcNav, WtHead, WtTabs, svcBase, svcProfile } from './common';
import ReportView from './ReportView';

/*
 * The accounting reports hub.
 *
 * Adaptive across service lines:
 * For Residential Interior Design (internal team / supplier-driven model),
 * it serves Client Payments, Supplier Payouts, Direct Costs, Project Profitability,
 * Project Handover, and Bank Statement.
 * For provider-driven models (Water Tank, AC), it serves Client Payments,
 * Provider Payouts, Seventh Sky Payments, Service Completion, and Bank Statement.
 */

const STANDARD_REPORTS = [
  {
    kind: 'client-payments',
    label: 'Client Payments',
    icon: Users,
    blurb: 'Every receipt, refund and correction against a client invoice.',
  },
  {
    kind: 'provider-payouts',
    label: 'Provider Payouts',
    icon: Truck,
    blurb: 'What Seventh Sky has paid its service providers.',
  },
  {
    kind: 'seventh-sky',
    label: 'Seventh Sky Payments',
    icon: Building2,
    blurb: 'What the business paid for directly, not through a provider.',
  },
  {
    kind: 'service-completion',
    label: 'Service Completion',
    icon: ClipboardCheck,
    blurb: 'Jobs finished in the period, and how long they took.',
  },
  {
    kind: 'bank-statement',
    label: 'Bank Statement',
    icon: Landmark,
    blurb: 'Every movement in date order with a running balance.',
  },
];

const INTERIOR_REPORTS = [
  {
    kind: 'client-payments',
    label: 'Client Payments',
    icon: Users,
    blurb: 'Every receipt, deposit and milestone payment received from interior clients.',
  },
  {
    kind: 'supplier-payouts',
    label: 'Supplier Payouts',
    icon: Package,
    blurb: 'What Seventh Sky has paid to materials, furniture, joinery, and trade suppliers.',
  },
  {
    kind: 'seventh-sky',
    label: 'Direct Costs',
    icon: Building2,
    blurb: 'Direct on-site expenses, transport, permits, and petty cash disbursements.',
  },
  {
    kind: 'project-profitability',
    label: 'Project Profitability',
    icon: TrendingUp,
    blurb: 'Contract value invoiced vs supplier & direct costs vs gross margins per project.',
  },
  {
    kind: 'service-completion',
    label: 'Project Handover',
    icon: ClipboardCheck,
    blurb: 'Completed interior design projects, handover checklists, and delivery timelines.',
  },
  {
    kind: 'bank-statement',
    label: 'Bank Statement',
    icon: Landmark,
    blurb: 'Every cash movement in date order with a running bank balance.',
  },
];

const EMPTY_FILTERS = {};

export default function Reports() {
  const { kind } = useParams();
  const nav = useSvcNav();
  const base = svcBase();
  const profile = svcProfile();
  const isInterior = base.includes('residential-interior-design') || !!profile.internal_team;

  const reportList = isInterior ? INTERIOR_REPORTS : STANDARD_REPORTS;

  /*
   * Legacy RPT- prefix redirect for service reports.
   */
  if (kind && /^RPT-/i.test(kind)) {
    return <Navigate to={`${base}/service-reports/${kind}`} replace />;
  }

  /*
   * If on interior design and visiting /provider-payouts, forward to /supplier-payouts.
   */
  if (isInterior && kind === 'provider-payouts') {
    return <Navigate to={`${base}/reports/supplier-payouts`} replace />;
  }

  const found = reportList.find((r) => r.kind === kind);
  const [tab, setTab] = useState(found?.label || reportList[0].label);

  useEffect(() => {
    if (found && found.label !== tab) setTab(found.label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, isInterior]);

  const current = reportList.find((r) => r.label === tab) || reportList[0];

  const goTab = (label) => {
    setTab(label);
    const next = reportList.find((r) => r.label === label);
    if (next) nav(`${base}/reports/${next.kind}`);
  };

  return (
    <>
      <WtHead
        title={isInterior ? 'Financial & Operational Reports' : 'Reports'}
        subtitle={
          isInterior
            ? 'Client receipts, supplier disbursements, project margins, and bank reconciliation for Residential Interior Design'
            : 'Money in, money out, and the work behind it — every report downloadable as a branded PDF'
        }
      />

      <WtTabs tabs={reportList.map((r) => ({ value: r.label, label: r.label }))} value={tab} onChange={goTab} />

      <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 14px' }}>{current.blurb}</p>

      {/* Keyed on the report so switching tabs remounts cleanly rather than
          briefly drawing the previous report's rows under the new columns. */}
      <ReportView key={current.kind} kind={current.kind} filters={EMPTY_FILTERS} />
    </>
  );
}
