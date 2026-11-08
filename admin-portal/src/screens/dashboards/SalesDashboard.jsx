import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLineData, DashHead, DashState, KpiStrip, Panel, Bars, HBars, Table, COLOR, money, moneyFull } from '../../ui/dash/LineDash';

/*
 * SalesDashboard — the seller-side index of the four sale consoles
 * (residential, commercial, business, rural). Enquiries become viewings,
 * offers, contracts and settled sales; commission comes off the settlement.
 */
const TITLE = { residential: 'Residential sales', commercial: 'Commercial sales', business: 'Business sales', rural: 'Rural sales' };

export default function SalesDashboard({ category = 'residential' }) {
  const { data: d, error, loading, period, setPeriod, reload } = useLineData('/line-dashboards/sales', { category });
  return (
    <div className="ld">
      <DashHead title={TITLE[category]} desc="Listings, deals and commission, from first enquiry to settlement"
        period={period} setPeriod={setPeriod} action={{ label: 'New listing', to: `/${category}/properties/new`, icon: Plus }} />
      <DashState loading={loading} error={error} reload={reload}>
        {d && (
          <>
            <KpiStrip items={d.kpis} />
            <div className="ld-grid">
              <Panel title="Pipeline by stage" span="c5" meta="count and value">
                <HBars labelWidth={110} rows={d.pipeline.map((s) => ({ label: s.label, sub: s.value ? money(s.value) : null, value: s.count, display: s.count, color: s.key === 'settled' ? COLOR.b4 : COLOR.s1 }))} />
              </Panel>
              <Panel title="Commission by month" span="c7" meta="settled deals">
                <Bars labels={d.commission.labels} format="money" height={220} empty="No settlements locked in this window."
                  series={[{ key: 'c', label: 'Commission', color: COLOR.s1, values: d.commission.values }]} />
              </Panel>
            </div>
            <div className="ld-grid">
              <Panel title="Enquiries by source" span="c4">
                <HBars labelWidth={100} rows={d.sources.map((s) => ({ label: s.label, value: s.count }))} empty="No enquiries yet." />
                <div className="ld-stat">
                  <span>Enquiries that moved past first contact</span>
                  <b>{d.conversion.rate === null ? '—' : `${d.conversion.rate}%`}</b>
                  <small>{d.conversion.progressed} of {d.conversion.enquiries}</small>
                </div>
              </Panel>
              <Panel title="Days on market" span="c3" meta="settled sales">
                <Bars labels={d.days_on_market.map((b) => b.label)} height={230} empty="No settled sales yet."
                  series={[{ key: 'n', label: 'Sales', color: COLOR.b3, values: d.days_on_market.map((b) => b.count) }]} />
              </Panel>
              <Panel title="Handled by" span="c5" meta={<Link className="ld-link" to={`/${category}/settlements`}>Settlements</Link>}>
                <Table rows={d.agents} empty="No deals yet." rowKey={(r) => r.name}
                  cols={[
                    { key: 'name', label: 'Staff', strong: true },
                    { key: 'open', label: 'Open', num: true },
                    { key: 'settled', label: 'Settled', num: true },
                    { key: 'value', label: 'Value', num: true, render: (r) => money(r.value) },
                    { key: 'commission', label: 'Commission', num: true, render: (r) => moneyFull(r.commission) },
                  ]} />
                <div className="ld-foot">Counted against the person who opened each deal.</div>
              </Panel>
            </div>
          </>
        )}
      </DashState>
    </div>
  );
}
