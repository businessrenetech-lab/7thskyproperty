import React from 'react';
import { Link } from 'react-router-dom';
import { Banknote } from 'lucide-react';
import { usePmScope } from '../../config/pmScope';
import { useLineData, DashHead, DashState, KpiStrip, Panel, Bars, HBars, Table, Pill, COLOR, moneyFull, money } from '../../ui/dash/LineDash';

/*
 * RentalsDashboard — the index of the four rent consoles (residential PM,
 * commercial, business and rural rent). usePmScope says which category this
 * console runs, and where its own screens live.
 */
const TITLE = { residential: 'Property Management', commercial: 'Commercial rent', business: 'Business rent', rural: 'Rural rent' };
const AGE = [COLOR.b1, '#F5A77E', COLOR.s2, '#B8431A'];

export default function RentalsDashboard() {
  const scope = usePmScope();
  const bp = scope.basePath;
  const { data: d, error, loading, period, setPeriod, reload } = useLineData('/line-dashboards/rentals', { category: scope.category });
  return (
    <div className="ld">
      <DashHead title={TITLE[scope.category] || 'Rentals'} desc="Rent billed and collected, occupancy, overdue rent and leases ending"
        period={period} setPeriod={setPeriod} action={{ label: 'Collect rent', to: `${bp}/collect-rent`, icon: Banknote }} />
      <DashState loading={loading} error={error} reload={reload}>
        {d && (
          <>
            <KpiStrip items={d.kpis} />
            <div className="ld-grid">
              <Panel title="Rent billed and collected" span="c8" legend={[['Billed', COLOR.b1], ['Collected', COLOR.s1]]} meta="by due month">
                <Bars labels={d.billing.labels} format="money" height={240} empty="No rent receipts due in this window."
                  series={[{ key: 'b', label: 'Billed', color: COLOR.b1, values: d.billing.billed }, { key: 'c', label: 'Collected', color: COLOR.s1, values: d.billing.collected }]} />
              </Panel>
              <Panel title="Occupancy by type" span="c4">
                <HBars labelWidth={110} empty="No rental units in this console yet."
                  rows={d.occupancy.map((t) => ({ label: t.label, sub: `${t.occupied} of ${t.total} let`, value: t.occupied, max: t.total, display: `${t.total ? Math.round((t.occupied / t.total) * 100) : 0}%` }))} />
                {d.vacant > 0 && <div className="ld-foot">{d.vacant} unit{d.vacant === 1 ? '' : 's'} vacant · <Link className="ld-link" to={`${bp}/vacancies`}>View vacancies</Link></div>}
              </Panel>
            </div>
            <div className="ld-grid">
              <Panel title="Overdue rent" span="c8" meta={<Link className="ld-link" to={`${bp}/arrears`}>Arrears</Link>}
                legend={d.arrears.buckets.map((b, i) => [`${b.label} ${money(b.amount)}`, AGE[i]])}>
                <AgeStrip buckets={d.arrears.buckets} />
                <Table rows={d.arrears.rows} empty="No rent is overdue."
                  cols={[
                    { key: 'tenant', label: 'Tenant', strong: true },
                    { key: 'property', label: 'Property', clip: true },
                    { key: 'owed', label: 'Owed', num: true, render: (r) => moneyFull(r.owed) },
                    { key: 'days', label: 'Oldest', num: true, render: (r) => `${r.days} days` },
                    { key: 'state', label: '', render: (r) => <Pill tone={r.days > 60 ? 'red' : r.days > 30 ? 'amber' : ''}>{r.days > 60 ? 'Escalate' : r.days > 30 ? 'Send reminder' : 'Due'}</Pill> },
                  ]} />
              </Panel>
              <Panel title="Leases ending" span="c4" legend={[['Renewal agreed', COLOR.s1], ['Not started', COLOR.b1]]} meta={<Link className="ld-link" to={`${bp}/renewals`}>Renewals</Link>}>
                <Bars labels={d.leases.labels} stacked height={220} empty="No leases end in the next six months."
                  series={[{ key: 'r', label: 'Renewal agreed', color: COLOR.s1, values: d.leases.renewing }, { key: 'n', label: 'Not started', color: COLOR.b1, values: d.leases.not_started }]} />
              </Panel>
            </div>
          </>
        )}
      </DashState>
    </div>
  );
}

function AgeStrip({ buckets }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  if (!total) return null;
  return (
    <div style={{ display: 'flex', gap: 2, height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }} aria-hidden="true">
      {buckets.map((b, i) => b.amount > 0 && <span key={b.label} style={{ flex: b.amount, background: AGE[i] }} />)}
    </div>
  );
}
