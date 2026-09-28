import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Badge } from '../../ui/kit';

/** The five Rural Sale dashboards — sales workbook, "RECOMMENDED DASHBOARDS". */
const TABS = [
  ['seller', 'Seller'],
  ['buyer', 'Buyer'],
  ['land', 'Rural Land'],
  ['risk', 'Risk'],
  ['executive', 'Executive'],
];

const money = (v) => `BDT ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const pct = (v) => `${Number(v || 0)}%`;

const Stat = ({ label, value, sub }) => (
  <div>
    <div className="cell-sub">{label}</div>
    <div className="cell-strong">{value}</div>
    {sub && <div className="cell-sub">{sub}</div>}
  </div>
);

const TypeTable = ({ rows = [] }) => (
  <table className="data-table" style={{ width: '100%', marginTop: 12 }}>
    <thead><tr><th>Rural property type</th><th style={{ textAlign: 'right' }}>Count</th></tr></thead>
    <tbody>
      {rows.map((r) => (
        <tr key={r.type}>
          <td className="cell-strong">{r.type}</td>
          <td className="cell-sub" style={{ textAlign: 'right' }}>{r.count}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function RuralSaleDashboards() {
  const toast = useToast();
  const [tab, setTab] = useState('seller');
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    api.get(`/rural-sale/dashboards/${tab}`)
      .then(({ data: d }) => { if (live) setData(d.data || {}); })
      .catch(() => { if (live) { setData({}); toast.error('Could not load this dashboard'); } });
    return () => { live = false; };
  }, [tab, toast]);

  return (
    <div>
      <PageHead
        title="Rural Sale · Dashboards"
        desc="Seller, buyer, rural land, risk and executive views across rural property for sale."
      />

      <div className="tabs" style={{ margin: '12px 0' }}>
        {TABS.map(([k, label]) => (
          <button key={k} type="button" className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {data === null ? <Spinner /> : (
        <div className="card">
          <div className="card-pad">
            {tab === 'seller' && (
              <>
                <div className="grid grid-4">
                  <Stat label="Active listings" value={data.listings ?? 0} />
                  <Stat label="Sellers" value={data.sellers ?? 0} />
                  <Stat label="Inspections" value={data.inspections ?? 0} />
                  <Stat label="Offers" value={data.offers ?? 0} />
                </div>
                <div className="grid grid-4" style={{ marginTop: 12 }}>
                  {/* The two ratios the sale SOP §14 measures by name. */}
                  <Stat label="Inspection → offer" value={pct(data.inspectionToOffer)} />
                  <Stat label="Offer → sale" value={pct(data.offerToSale)} />
                  <Stat label="Conversion rate" value={pct(data.conversionRate)} sub={`${data.sales ?? 0} completed`} />
                  <Stat label="Commission revenue" value={money(data.commissionRevenue)} sub={`${money(data.commissionPipeline)} in pipeline`} />
                </div>
                <div className="grid grid-4" style={{ marginTop: 12 }}>
                  <Stat label="Avg days on market" value={data.daysOnMarket?.average ?? 0} sub={`${data.daysOnMarket?.count ?? 0} still listed`} />
                  <Stat label="Longest on market" value={`${data.daysOnMarket?.longest ?? 0} days`} />
                </div>
                <TypeTable rows={data.byType} />
              </>
            )}

            {tab === 'buyer' && (
              <div className="grid grid-4">
                <Stat label="Active buyers" value={data.activeBuyers ?? 0} />
                <Stat label="Requirements recorded" value={data.requirements ?? 0} />
                <Stat label="Properties searched" value={data.searches ?? 0} />
                <Stat label="Shortlisted" value={data.shortlisted ?? 0} />
                <Stat label="Buyer enquiries" value={data.enquiries ?? 0} />
                <Stat label="Transactions" value={data.transactions ?? 0} />
                <Stat label="Success fees" value={money(data.successFees)} />
                <Stat label="Fee pipeline" value={money(data.successFeePipeline)} />
              </div>
            )}

            {tab === 'land' && (
              <>
                <div className="grid grid-4">
                  <Stat label="Total rural listings" value={data.total ?? 0} />
                  <Stat label="Vacant / unsold" value={data.vacant ?? 0} />
                  <Stat label="Under offer" value={data.underOffer ?? 0} />
                  <Stat label="Sold" value={data.sold ?? 0} />
                </div>
                <TypeTable rows={data.byType} />
              </>
            )}

            {tab === 'risk' && (
              <>
                <div className="grid grid-4">
                  <Stat label="Disputes" value={data.total ?? 0} />
                  <Stat label="Open" value={data.open ?? 0} />
                  <Stat label="Escalated" value={data.escalated ?? 0} />
                  <Stat label="Resolved" value={data.resolved ?? 0} />
                </div>
                <table className="data-table" style={{ width: '100%', marginTop: 12 }}>
                  <thead><tr><th>Risk group</th><th style={{ textAlign: 'right' }}>Disputes</th></tr></thead>
                  <tbody>
                    {Object.entries(data.byGroup || {}).map(([group, count]) => (
                      <tr key={group}>
                        <td className="cell-strong">{group}</td>
                        <td style={{ textAlign: 'right' }}>
                          {count > 0 ? <Badge tone={group === 'Other' ? 'grey' : 'amber'}>{count}</Badge> : <span className="cell-sub">0</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'executive' && (
              <div className="grid grid-4">
                <Stat label="Total rural listings" value={data.listings ?? 0} sub={`${data.available ?? 0} available`} />
                <Stat label="Total buyers" value={data.buyers ?? 0} />
                <Stat label="Transactions" value={data.transactions ?? 0} />
                <Stat label="Total sale value" value={money(data.totalSaleValue)} />
                <Stat label="Average sale price" value={money(data.averageSalePrice)} />
                <Stat label="Commission revenue" value={money(data.commissionRevenue)} sub={`${money(data.commissionPipeline)} in pipeline`} />
                {/* Gross margin is not modelled for rural sale; the rate achieved is. */}
                <Stat label="Commission rate achieved" value={pct(data.commissionRate)} />
                <Stat label="Protected introductions" value={data.protectedIntroductions ?? 0} sub="24 months, rural" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
