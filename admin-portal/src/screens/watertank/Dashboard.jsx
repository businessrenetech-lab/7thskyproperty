import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, UserPlus, Shield, CreditCard, Star, RefreshCw, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useSvcNav, Pill, dateFmt, bdt, EmptyState } from './common';

/*
 * Water Tank — Operations Dashboard.
 * Layout is the 1:1 rebuild of Figma node 2:9 (recoloured to 7th Sky via wt-scope.css);
 * every figure is live from GET /wt-ops/dashboard — nothing here is a placeholder.
 */

const FUNNEL_STYLE = [
  { bg: '#f1f5f9', fg: '#0f172a' },
  { bg: '#eff6ff', fg: '#2563eb' },
  { bg: '#fef3c7', fg: '#d97706' },
  { bg: 'var(--wt-accent-tint-2)', fg: 'var(--wt-accent-ink)' },
  { bg: '#ecfdf5', fg: '#059669' },
  { bg: '#64748b', fg: '#ffffff' },
];
// each funnel stage links to the screen that owns it
const FUNNEL_ROUTE = {
  lead: '/water-tank/service-requests',
  assessment: '/water-tank/site-assessments',
  quotation: '/water-tank/quotations',
  agreement: '/water-tank/work-orders',
  wo: '/water-tank/work-orders',
  done: '/water-tank/projects',
};
const ALERT_COLOR = { red: 'var(--wt-red)', amber: 'var(--wt-amber)', blue: 'var(--wt-blue)', cyan: 'var(--wt-accent-ink)' };

export default function WaterTankDashboard() {
  const nav = useSvcNav();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    api.get('/wt-ops/dashboard')
      .then((r) => setData(r.data))
      .catch((e) => { setData(null); setError(e.response?.data?.error || 'Could not load the dashboard'); })
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const k = data?.kpis || {};
  const fin = data?.finance || {};
  const sla = data?.sla || {};
  /*
   * Every KPI lands on the ROWS IT COUNTED, not on the bare register.
   * "Pending Invoices ৳4.2m" used to open the full invoice list and leave the
   * operator to reconstruct by hand the filter the figure came from — which
   * makes the number a decoration rather than a way in. The `?tab=` seeds the
   * register's own filter (see useUrlTab).
   */
  const KPIS = [
    { icon: Briefcase, tint: 'var(--wt-accent-tint)', color: 'var(--wt-accent)', label: 'Total Active Projects', value: k.active_projects ?? '—', sub: k.active_projects_sub || '', to: '/water-tank/projects?tab=Open' },
    { icon: UserPlus, tint: 'rgba(37,99,235,0.10)', color: 'var(--wt-blue)', label: 'New Leads', value: k.new_leads ?? '—', sub: 'awaiting assessment', to: '/water-tank/service-requests?tab=New' },
    { icon: Shield, tint: 'rgba(5,150,105,0.10)', color: 'var(--wt-green)', label: 'AMC Contracts Active', value: k.amc_active ?? '—', sub: k.amc_annual_value ? `Value: ${bdt(k.amc_annual_value)} annually` : 'No active contracts', to: '/water-tank/amc?status=Active' },
    { icon: CreditCard, tint: 'rgba(225,29,72,0.10)', color: 'var(--wt-red)', label: 'Pending Invoices', value: k.pending_invoice_amount != null ? bdt(k.pending_invoice_amount) : '—', sub: `${k.overdue_invoice_count || 0} invoice${k.overdue_invoice_count === 1 ? '' : 's'} overdue`, to: '/water-tank/invoices?tab=Overdue' },
  ];
  const funnel = data?.funnel || [];
  const requests = data?.recent_requests || [];
  const amc = data?.upcoming_amc || [];
  const providers = data?.top_providers || [];
  const alerts = data?.alerts || [];

  if (loading) return (
    <>
      <div className="wt-head"><div><h1 className="wt-title">Operations Dashboard</h1><p className="wt-subtitle">Seventh Sky Operations Management System</p></div></div>
      <div style={{ padding: 60, textAlign: 'center' }}><Spinner /></div>
    </>
  );

  if (error) return (
    <>
      <div className="wt-head"><div><h1 className="wt-title">Operations Dashboard</h1><p className="wt-subtitle">Seventh Sky Operations Management System</p></div></div>
      <div className="wt-card">
        <EmptyState eyebrow="Error" title="Could not load the dashboard" hint={error}
          action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} />
      </div>
    </>
  );

  return (
    <>
      <div className="wt-head">
        <div>
          <h1 className="wt-title">Operations Dashboard</h1>
          <p className="wt-subtitle">Seventh Sky Operations Management System</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* The one front door. Every water-tank job starts as a Service Request;
              the direct assessment/quotation/project creates are in-flow shortcuts. */}
          <button className="wt-btn primary" onClick={() => nav('/water-tank/service-requests/new')}>
            <UserPlus size={14} /> New Service Request
          </button>
          <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {/* Action Centre leads. What needs a person today is the reason to open
          this screen; the headline figures are context for it, not the point. */}
      {alerts.length > 0 && (
        <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">Action Centre — what needs attention today</h2>
            <span className="muted" style={{ fontSize: 11.5 }}>{alerts.reduce((s, a) => s + a.count, 0)} items across {alerts.length} queues</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
            {alerts.map((a) => (
              <button key={a.key} className="wt-card" onClick={() => nav(a.to)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 15px', border: '1px solid var(--wt-line)', borderLeft: `3px solid ${ALERT_COLOR[a.tone] || 'var(--wt-slate)'}`, cursor: 'pointer', font: 'inherit', textAlign: 'left', boxShadow: 'none' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: ALERT_COLOR[a.tone] || 'var(--wt-ink)', minWidth: 30 }}>{a.count}</span>
                <span style={{ flex: '1 0 0', fontSize: 12.5, fontWeight: 600, color: 'var(--wt-ink-2)', lineHeight: 1.35 }}>{a.label}</span>
                <ChevronRight size={15} style={{ color: 'var(--wt-muted)', flex: 'none' }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="wt-kpis">
        {KPIS.map((kp) => (
          <button key={kp.label} className="wt-card wt-kpi" onClick={() => nav(kp.to)}
            style={{ textAlign: 'left', border: '1px solid var(--wt-line)', cursor: 'pointer', font: 'inherit' }}>
            <span className="wt-kpi-ic" style={{ background: kp.tint, color: kp.color }}><kp.icon /></span>
            <div>
              <div className="wt-kpi-label">{kp.label}</div>
              <div className="wt-kpi-value">{kp.value}</div>
              <div className="wt-kpi-sub">{kp.sub}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="wt-section-title">Service Acquisition Pipeline (Active Funnel)</h2>
        <div className="wt-funnel">
          {funnel.map((s, i) => (
            <button key={s.key} className="wt-funnel-step" onClick={() => nav(FUNNEL_ROUTE[s.key] || '/water-tank')}
              style={{ ...FUNNEL_STYLE[i % FUNNEL_STYLE.length], border: 0, cursor: 'pointer', font: 'inherit' }}>
              <span className="n">{s.count}</span>
              <span className="l">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="wt-two">
        <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">Recent Service Requests</h2>
            <button className="wt-link" onClick={() => nav('/water-tank/service-requests')}>View All</button>
          </div>
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 80 }}>ID</th><th>Client</th><th style={{ width: 140 }}>Service Type</th><th style={{ width: 80 }}>Priority</th><th style={{ width: 120 }}>Status</th></tr></thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/water-tank/service-requests?focus=${encodeURIComponent(r.code)}`)}>
                  <td className="id">{r.code}</td>
                  <td style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.client_name}</td>
                  <td className="muted">{r.specific_service || r.category || '—'}</td>
                  <td><Pill value={r.priority} sm /></td>
                  <td><Pill value={r.status} sm /></td>
                </tr>
              ))}
              {!requests.length && <tr className="wt-empty-row"><td colSpan={5}>No service requests yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">Upcoming AMC Visits</h2>
            <button className="wt-link" onClick={() => nav('/water-tank/amc')}>Schedule</button>
          </div>
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 90 }}>AMC ID</th><th>Client Name</th><th style={{ width: 120 }}>Visit Date</th><th style={{ width: 130 }}>Package</th></tr></thead>
            <tbody>
              {amc.map((a) => (
                <tr key={a.id} className="click" onClick={() => nav(`/water-tank/amc?focus=${encodeURIComponent(a.code)}`)}>
                  <td className="id-dark">{a.code}</td>
                  <td style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.client_name}</td>
                  <td className="muted">{a.next_visit || dateFmt(a.end_date)}</td>
                  <td><span className="wt-pill sm cyan">{a.package || '—'}</span></td>
                </tr>
              ))}
              {!amc.length && <tr className="wt-empty-row"><td colSpan={4}>No upcoming visits.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="wt-two">
        <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">Revenue &amp; Collections</h2>
            <button className="wt-link" onClick={() => nav('/water-tank/invoices')}>Invoices</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              ['Invoiced to date', bdt(fin.invoiced_total), `${fin.outstanding_count || 0} unsettled`],
              ['Collected this month', bdt(fin.paid_this_month), `${fin.paid_this_month_count || 0} invoice${fin.paid_this_month_count === 1 ? '' : 's'}`],
              ['Overdue', bdt(fin.overdue_amount), `${fin.overdue_count || 0} account${fin.overdue_count === 1 ? '' : 's'}`],
              ['Provider payouts due', bdt(fin.pending_payout), `${fin.pending_payout_count || 0} pending`],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="wt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">Service Quality &amp; SLA</h2>
            <button className="wt-link" onClick={() => nav('/water-tank/complaints')}>Complaints</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              ['Open incidents', String(sla.open_count ?? 0), sla.critical_count ? `${sla.critical_count} high severity` : 'None high severity'],
              ['Avg resolution', sla.avg_resolution_hours ? `${sla.avg_resolution_hours} h` : '—', `${sla.resolved_count || 0} resolved`],
              ['SLA compliance', sla.compliance_rate == null ? '—' : `${sla.compliance_rate}%`, 'within 24-hour target'],
              ['AMC renewal rate', data?.amc?.renewal_rate == null ? '—' : `${data.amc.renewal_rate}%`, `${data?.amc?.due_soon || 0} expiring in 60d`],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
                <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 className="wt-section-title">Top Performing Service Providers</h2>
        <div className="wt-providers">
          {providers.map((p) => (
            <div key={p.id} className="wt-card wt-provider">
              <div className="wt-panel-head">
                <span className="wt-provider-name">{p.business_name || p.name}</span>
                {p.rank ? <span className="wt-pill sm cyan">Rank #{p.rank}</span> : <Pill value={p.status} sm />}
              </div>
              <span className="wt-provider-role">{p.specialty}</span>
              <hr />
              <div className="wt-provider-stats">
                <div className="wt-stat"><div className="k">Completion Rate</div><div className="v green">{Number(p.completion_rate || 0)}%</div></div>
                <div className="wt-stat"><div className="k">Satisfaction Score</div><div className="v"><Star /> {Number(p.rating || 0)}</div></div>
                <div className="wt-stat"><div className="k">Coverage</div><div className="v" style={{ fontSize: 11, color: 'var(--wt-ink-2)' }}>{p.coverage}</div></div>
              </div>
            </div>
          ))}
          {!providers.length && (
            <div className="wt-card" style={{ gridColumn: '1 / -1' }}>
              <EmptyState eyebrow="Providers" title="No ranked providers yet"
                hint="Rank providers on the Providers screen and the top three appear here."
                action={<button className="wt-btn" onClick={() => nav('/water-tank/providers')}><AlertCircle size={14} /> Go to Providers</button>} />
            </div>
          )}
        </div>
      </div>

      <style>{`@media (max-width:1100px){ .wt-two{ grid-template-columns:1fr!important } }`}</style>
    </>
  );
}
