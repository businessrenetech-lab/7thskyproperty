import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, HardHat, Wallet, TrendingUp, Layers, Users, MessageSquare, ArrowRight, CreditCard } from 'lucide-react';
import api from '../services/api';
import { PageHead, Spinner, Badge } from '../ui/kit';

const money = (v) => '৳' + Number(v || 0).toLocaleString();
const bdt = (v) => { const n = Number(v || 0); if (Math.abs(n) >= 1e5) return '৳' + (n / 1e5).toFixed(1) + 'L'; if (Math.abs(n) >= 1e3) return '৳' + Math.round(n / 1e3) + 'k'; return '৳' + Math.round(n); };

export default function CareDashboard() {
  const nav = useNavigate();
  const [m, setM] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  useEffect(() => { api.get('/care/dashboard').then(({ data }) => setM(data)).catch(() => setM({})); api.get('/care/kpis').then(({ data }) => setKpiData(data)).catch(() => {}); }, []);
  if (!m) return <div className="pm-scope"><div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div></div>;

  const kpi = (cls, Icon, label, value, sub, to) => (
    <div className={`pm-kpi ${cls}`} style={{ cursor: to ? 'pointer' : 'default' }} onClick={() => to && nav(to)}>
      <div className="top"><div className="pm-kpi-icon"><Icon size={20} /></div></div>
      <div className="pm-kpi-value" style={{ fontSize: 24 }}>{value}</div><div className="pm-kpi-label">{label}</div>
      {sub && <div className="pm-kpi-label" style={{ marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="pm-scope">
      <PageHead title="Property Care Services" desc="Service delivery overview — jobs, providers, income and payouts." />
      <div className="pm-kpis">
        {kpi('pm-kpi--cyan', ClipboardList, 'Open work orders', m.work_orders?.open ?? 0, `${m.work_orders?.total ?? 0} total`, '/property-care/work-orders')}
        {kpi('pm-kpi--green', HardHat, 'Active providers', m.providers?.active ?? 0, `${m.providers?.total ?? 0} onboarded`, '/providers')}
        {kpi('pm-kpi--navy', TrendingUp, 'Our income', bdt(m.revenue?.our_income), 'from service fees', null)}
        {kpi('pm-kpi--amber', CreditCard, 'Provider payable', bdt(m.provider_payable), 'to disburse', '/property-care/payments')}
      </div>

      {kpiData && (
        <div className="pm-card" style={{ marginTop: 18 }}>
          <div className="pm-card-h"><div className="ic"><TrendingUp size={16} /></div><h3>Service KPIs</h3></div>
          <div className="pm-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            {[['Completion rate', kpiData.completion_rate + '%', '/property-care/work-orders'], ['AMC active', kpiData.amc_active, '/property-care/amc'], ['Warranties active', kpiData.warranties_active, '/property-care/registers'], ['Complaints open', kpiData.complaints_open, '/property-care/registers'], ['Incidents open', kpiData.incidents_open, '/property-care/registers']].map(([l, v, to]) => (
              <div key={l} onClick={() => to && nav(to)} style={{ cursor: to ? 'pointer' : 'default', background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 650 }}>{l}</div>
                <div className="pm-num" style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pm-grid pm-grid-2" style={{ marginTop: 18 }}>
        <div className="pm-card">
          <div className="pm-card-h"><div className="ic"><ClipboardList size={16} /></div><h3>Work orders by stage</h3><div className="sp" /><button className="pm-link" onClick={() => nav('/property-care/work-orders')}>Open →</button></div>
          <div className="pm-card-body">
            <div className="pm-minis">
              {Object.entries(m.work_orders?.by_status || {}).map(([s, c]) => (
                <div key={s} className="pm-mini" onClick={() => nav('/property-care/work-orders')}><div className="n pm-num">{c}</div><div className="t" style={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</div></div>
              ))}
              {!Object.keys(m.work_orders?.by_status || {}).length && <div className="cell-sub">No work orders yet.</div>}
            </div>
          </div>
        </div>
        <div className="pm-card">
          <div className="pm-card-h"><div className="ic" style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}><MessageSquare size={16} /></div><h3>Lead pipeline</h3><div className="sp" /><button className="pm-link" onClick={() => nav('/property-care/leads')}>Open →</button></div>
          <div className="pm-card-body">
            <div className="pm-minis">
              {['new', 'contacted', 'assessment', 'quoted', 'won', 'lost'].map((s) => (
                <div key={s} className="pm-mini" onClick={() => nav('/property-care/leads')}><div className="n pm-num">{m.enquiries?.by_stage?.[s] || 0}</div><div className="t" style={{ textTransform: 'capitalize' }}>{s}</div></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pm-card" style={{ marginTop: 18 }}>
        <div className="pm-card-h"><div className="ic"><TrendingUp size={16} /></div><h3>Money</h3></div>
        <div className="pm-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          {[['Service value (all jobs)', m.revenue?.service_value, 'var(--ink)'], ['Our income (fees)', m.revenue?.our_income, 'var(--good)'], ['Provider charges', m.revenue?.provider_charges, 'var(--navy)'], ['Payable to providers', m.provider_payable, 'var(--warn)']].map(([l, v, c]) => (
            <div key={l} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}><div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 650 }}>{l}</div><div className="pm-num" style={{ fontSize: 19, fontWeight: 780, marginTop: 4, color: c }}>{money(v)}</div></div>
          ))}
        </div>
      </div>

      <div className="pm-card" style={{ marginTop: 18 }}>
        <div className="pm-card-h"><div className="ic"><Layers size={16} /></div><h3>Quick links</h3></div>
        <div className="pm-card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[['Enquiries', '/property-care/enquiries'], ['Leads', '/property-care/leads'], ['Customers', '/property-care/customers'], ['Services', '/services'], ['Service Providers', '/providers'], ['Work Orders', '/property-care/work-orders'], ['Invoicing', '/property-care/invoicing'], ['Payments & Disbursements', '/property-care/payments']].map(([l, t]) => (
            <button key={t} className="pm-pill" onClick={() => nav(t)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
