import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Badge } from '../../ui/kit';

/** The six Business Rent dashboards — SOP §8. */
const TABS = [
  ['pipeline', 'Leasing pipeline'],
  ['occupancy', 'Occupancy'],
  ['screening', 'Tenant screening & risk'],
  ['financial', 'Financial'],
  ['protection', 'Protection'],
  ['operations', 'Operations'],
];

const money = (v) => `BDT ${Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const VERDICT_TONE = { suitable: 'green', conditional: 'amber', declined: 'red', pending: 'grey' };

export default function BusinessRentDashboards() {
  const toast = useToast();
  const [tab, setTab] = useState('pipeline');
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    api.get(`/business-rent/dashboards/${tab}`)
      .then(({ data: d }) => { if (live) setData(d.data || {}); })
      .catch(() => { if (live) { setData({}); toast.error('Could not load this dashboard'); } });
    return () => { live = false; };
  }, [tab, toast]);

  return (
    <div>
      <PageHead
        title="Business Rent · Dashboards"
        desc="Pipeline, occupancy, screening, money, protection and operations across business premises."
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
            {tab === 'pipeline' && (
              <>
                <p className="cell-sub">{data.total || 0} lease workflow(s) across the 13 SOP stages.</p>
                <table className="data-table" style={{ marginTop: 10, width: '100%' }}>
                  <thead><tr><th>Stage</th><th>Department</th><th>Leases</th><th>Days in stage</th></tr></thead>
                  <tbody>
                    {(data.stages || []).map((s) => (
                      <tr key={s.key}>
                        <td>
                          <span className="cell-strong">{s.name}</span>
                          {s.warning && <div style={{ color: '#b45309', fontSize: 12 }}>{s.warning}</div>}
                        </td>
                        <td className="cell-sub">{s.department}</td>
                        <td>{s.count}</td>
                        <td className="cell-sub">{s.count ? `${s.oldestDays}d` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'occupancy' && (
              <div className="grid grid-4">
                <div><div className="cell-sub">Premises</div><div className="cell-strong">{data.total ?? 0}</div></div>
                <div><div className="cell-sub">Leased</div><div className="cell-strong">{data.leased ?? 0}</div></div>
                <div><div className="cell-sub">Vacant</div><div className="cell-strong">{data.vacant ?? 0}</div></div>
                <div><div className="cell-sub">Expiring ≤ 90 days</div><div className="cell-strong">{data.expiringSoon ?? 0}</div></div>
              </div>
            )}

            {tab === 'screening' && (
              <>
                <p className="cell-sub">{data.total ?? 0} application(s) · {data.screeningOutstanding ?? 0} with screening outstanding</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {Object.entries(data.byVerdict || {}).map(([k, v]) => (
                    <Badge key={k} tone={VERDICT_TONE[k] || 'grey'}>{k}: {v}</Badge>
                  ))}
                </div>
              </>
            )}

            {tab === 'financial' && (
              <div className="grid grid-2">
                <div>
                  <div className="cell-sub">Advance rent</div>
                  <div className="cell-strong">{money(data.advance?.received)} of {money(data.advance?.agreed)}</div>
                  <div className="cell-sub">{money(data.advance?.outstanding)} outstanding</div>
                </div>
                <div>
                  <div className="cell-sub">Commission</div>
                  <div className="cell-strong">{money(data.commission?.paid)} of {money(data.commission?.charged)}</div>
                  <div className="cell-sub">{money(data.commission?.outstanding)} outstanding</div>
                </div>
                <div>
                  <div className="cell-sub">Deposits held</div>
                  <div className="cell-strong">{money(data.deposits?.total?.received)} of {money(data.deposits?.total?.agreed)}</div>
                  {Object.entries(data.deposits?.byType || {}).map(([k, v]) => (
                    <div key={k} className="cell-sub">{k}: {money(v.received)} / {money(v.agreed)}</div>
                  ))}
                </div>
                <div>
                  <div className="cell-sub">Arrears ageing</div>
                  {Object.entries(data.arrears || {}).map(([k, v]) => (
                    <div key={k} className="cell-sub">{k}: {money(v)}</div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'protection' && (
              <div className="grid grid-4">
                <div><div className="cell-sub">Protected introductions</div><div className="cell-strong">{data.total ?? 0}</div></div>
                <div><div className="cell-sub">Active</div><div className="cell-strong">{data.active ?? 0}</div></div>
                <div><div className="cell-sub">Nearing expiry</div><div className="cell-strong">{data.expiring ?? 0}</div></div>
                <div><div className="cell-sub">Suspected breach</div><div className="cell-strong">{data.breached ?? 0}</div></div>
              </div>
            )}

            {tab === 'operations' && (
              <>
                <div className="grid grid-4">
                  <div><div className="cell-sub">Premises</div><div className="cell-strong">{data.properties ?? 0}</div></div>
                  <div><div className="cell-sub">Tenancies</div><div className="cell-strong">{data.tenancies ?? 0}</div></div>
                  <div><div className="cell-sub">Escalations</div><div className="cell-strong">{data.escalationCount ?? 0}</div></div>
                </div>
                {(data.escalations || []).length > 0 && (
                  <table className="data-table" style={{ marginTop: 14, width: '100%' }}>
                    <thead><tr><th>Stage</th><th>Department</th><th>Escalation trigger</th></tr></thead>
                    <tbody>
                      {data.escalations.map((e, i) => (
                        <tr key={`${e.project_id}-${i}`}>
                          <td>{e.stage}</td>
                          <td className="cell-sub">{e.department || '—'}</td>
                          <td>{e.trigger || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
