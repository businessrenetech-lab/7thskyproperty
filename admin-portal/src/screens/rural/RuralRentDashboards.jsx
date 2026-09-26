import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner } from '../../ui/kit';

/** The five Rural Rent dashboards — CRM workbook, "DASHBOARDS TO BUILD INTO CRM". */
const TABS = [
  ['owner', 'Owner'],
  ['tenant', 'Tenant'],
  ['property', 'Property'],
  ['financial', 'Financial'],
  ['executive', 'Executive'],
];

const money = (v) => `BDT ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const Stat = ({ label, value, sub }) => (
  <div>
    <div className="cell-sub">{label}</div>
    <div className="cell-strong">{value}</div>
    {sub && <div className="cell-sub">{sub}</div>}
  </div>
);

export default function RuralRentDashboards() {
  const toast = useToast();
  const [tab, setTab] = useState('owner');
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    api.get(`/rural-rent/dashboards/${tab}`)
      .then(({ data: d }) => { if (live) setData(d.data || {}); })
      .catch(() => { if (live) { setData({}); toast.error('Could not load this dashboard'); } });
    return () => { live = false; };
  }, [tab, toast]);

  return (
    <div>
      <PageHead
        title="Rural Rent · Dashboards"
        desc="Owner, tenant, property, financial and executive views across rural rental property."
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
            {tab === 'owner' && (
              <>
                <div className="grid grid-4">
                  <Stat label="Active listings" value={data.activeListings ?? 0} />
                  <Stat label="Occupied" value={data.occupied ?? 0} />
                  <Stat label="Vacant" value={data.vacant ?? 0} />
                  <Stat label="Owners" value={data.owners ?? 0} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <Stat label="Leasing revenue (monthly rent under management)" value={money(data.leasingRevenue)} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="cell-sub">Arrears ageing</div>
                  {Object.entries(data.arrears || {}).map(([k, v]) => (
                    <div key={k} className="cell-sub">{k}: {money(v)}</div>
                  ))}
                </div>
              </>
            )}

            {tab === 'tenant' && (
              <div className="grid grid-4">
                <Stat label="Active briefs" value={data.activeBriefs ?? 0} />
                <Stat label="Shortlisted" value={data.shortlisted ?? 0} />
                <Stat label="Enquiries" value={data.enquiries ?? 0} />
                <Stat label="Inspections" value={data.inspections ?? 0} />
                <Stat label="Active leases" value={data.activeLeases ?? 0} />
                <Stat label="Renewals due (≤ 90 days)" value={data.renewalsDue ?? 0} />
              </div>
            )}

            {tab === 'property' && (
              <>
                <p className="cell-sub">{data.total ?? 0} rural rental propert{(data.total ?? 0) === 1 ? 'y' : 'ies'}.</p>
                <table className="data-table" style={{ marginTop: 10, width: '100%' }}>
                  <thead><tr><th>Property type</th><th>Count</th></tr></thead>
                  <tbody>
                    {(data.byType || []).map((r) => (
                      <tr key={r.type}>
                        <td className={r.count ? 'cell-strong' : 'cell-sub'}>{r.type}</td>
                        <td>{r.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'financial' && (
              <>
                <div className="grid grid-4">
                  <Stat label="Leasing fees" value={money(data.leasingFees)} />
                  <Stat label="Management fees" value={money(data.managementFees)} />
                  <Stat label="Marketing budget" value={money(data.marketingBudget)} />
                  <Stat
                    label="Outstanding invoices"
                    value={money(data.outstandingInvoices?.total)}
                    sub={`${data.outstandingInvoices?.count ?? 0} invoice(s)`}
                  />
                </div>
                <div style={{ marginTop: 14 }}>
                  <div className="cell-sub">Revenue by property type</div>
                  {Object.keys(data.revenueByType || {}).length === 0
                    ? <div className="cell-sub">No revenue recorded yet.</div>
                    : Object.entries(data.revenueByType).map(([k, v]) => (
                      <div key={k} className="cell-sub">{k}: {money(v)}</div>
                    ))}
                </div>
              </>
            )}

            {tab === 'executive' && (
              <div className="grid grid-4">
                <Stat label="Owners" value={data.owners ?? 0} />
                <Stat label="Tenants" value={data.tenants ?? 0} />
                <Stat label="Properties" value={data.properties ?? 0} />
                <Stat label="Active rentals" value={data.activeRentals ?? 0} />
                <Stat label="Occupancy rate" value={`${data.occupancyRate ?? 0}%`} />
                <Stat label="Revenue" value={money(data.revenue)} />
                <Stat label="Net of outstanding" value={money(data.netOfOutstanding)} />
                <Stat label="Protected introductions" value={data.protectedIntroductions ?? 0} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
