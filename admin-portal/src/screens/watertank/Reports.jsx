import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import {
  Users, Truck, Building2, ClipboardCheck, Landmark,
} from 'lucide-react';
import { useSvcNav, WtHead, WtTabs, svcBase } from './common';
import ReportView from './ReportView';

/*
 * The accounting reports hub.
 *
 * Five reports, one date filter, one PDF renderer. They are tabs rather than
 * five sidebar entries because an operator comparing what came in against what
 * went out should not have to navigate between them — and because the date range
 * they have chosen survives the switch.
 *
 * The reports themselves live on the server as definitions; this screen only
 * decides which one to ask for and what to call it in the nav. Adding the sixth
 * is a line here and a definition there.
 */

const REPORTS = [
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

export default function Reports() {
  const { kind } = useParams();
  const nav = useSvcNav();

  /*
   * `/water-tank/reports/RPT-0001` used to open a SERVICE report, and links to
   * that shape exist in the wild — in the work queue, in emails, in someone's
   * bookmarks. Rather than break them, they are recognised by their prefix and
   * forwarded to where service reports now live.
   */
  if (kind && /^RPT-/i.test(kind)) {
    return <Navigate to={`${svcBase()}/service-reports/${kind}`} replace />;
  }

  const found = REPORTS.find((r) => r.kind === kind);
  const [tab, setTab] = useState(found?.label || REPORTS[0].label);

  useEffect(() => {
    if (found && found.label !== tab) setTab(found.label);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const current = REPORTS.find((r) => r.label === tab) || REPORTS[0];

  const goTab = (label) => {
    setTab(label);
    const next = REPORTS.find((r) => r.label === label);
    if (next) nav(`/water-tank/reports/${next.kind}`);
  };

  return (
    <>
      <WtHead
        title="Reports"
        subtitle="Money in, money out, and the work behind it — every report downloadable as a branded PDF"
      />

      <WtTabs tabs={REPORTS.map((r) => ({ value: r.label, label: r.label }))} value={tab} onChange={goTab} />

      <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 14px' }}>{current.blurb}</p>

      {/* Keyed on the report so switching tabs remounts cleanly rather than
          briefly drawing the previous report's rows under the new columns. */}
      <ReportView key={current.kind} kind={current.kind} />
    </>
  );
}
