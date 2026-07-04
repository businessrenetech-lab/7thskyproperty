import React, { useCallback, useEffect, useState } from 'react';
import { Home, KeyRound, Wallet, TrendingUp, AlertTriangle, Wrench, CalendarClock, Users, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, DataTable, Spinner, Badge, Button } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

export default function RentalReports() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/rental-reports/overview'); setData(data.data); }
    catch { toast.error('Failed to load reports'); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  if (!data) return null;

  const o = data.occupancy, r = data.rentRoll, a = data.arrears, c = data.collection, m = data.maintenance, exp = data.expiring, f = data.funnel, ad = data.avgDays, controls = data.controls || {};

  return (
    <>
      <PageHead title="Rental Reports" desc="Live operational metrics — occupancy, rent roll, arrears, collection, maintenance, pipeline." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />

      {/* Headline strip */}
      <div className="grid grid-4">
        <BigMetric icon={KeyRound} label="Occupancy" value={`${o.occupancy_rate_pct}%`} sub={`${o.occupied} of ${o.total_managed} managed · ${o.vacant} vacant`} tone="green" />
        <BigMetric icon={Wallet} label="Monthly rent roll" value={money(r.total_recurring)} sub={`${r.count} active tenancies · rent ${money(r.total_rent)} + service ${money(r.total_service)}`} tone="blue" />
        <BigMetric icon={TrendingUp} label="Collection rate" value={`${c.rate_pct}%`} sub={`${c.period} · ${money(c.received)} of ${money(c.due)} received`} tone={c.rate_pct >= 90 ? 'green' : 'amber'} />
        <BigMetric icon={AlertTriangle} label="Arrears total" value={money(a.total)} sub={a.total > 0 ? 'Requires collection action' : 'All clear'} tone={a.total > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-4" style={{ marginTop: 20 }}>
        <BigMetric icon={Users} label="Open tenant requests" value={controls.open_tenant_requests || 0} sub="Support, utility, move-in and billing items" tone={(controls.open_tenant_requests || 0) ? 'amber' : 'green'} />
        <BigMetric icon={Wallet} label="Pending utilities" value={controls.pending_utilities || 0} sub="Bills pending, overdue or disputed" tone={(controls.pending_utilities || 0) ? 'amber' : 'green'} />
        <BigMetric icon={Wrench} label="Expense approvals" value={controls.pending_expense_approvals || 0} sub="Owner approvals waiting" tone={(controls.pending_expense_approvals || 0) ? 'amber' : 'green'} />
        <BigMetric icon={AlertTriangle} label="Active risks" value={controls.active_risks || 0} sub={`${controls.open_arrears_actions || 0} arrears action(s) open`} tone={(controls.active_risks || 0) ? 'red' : 'green'} />
      </div>

      {/* Arrears aging + Maintenance spend */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-head"><h3>Arrears aging</h3><Badge tone={a.total > 0 ? 'red' : 'green'} dot>{money(a.total)}</Badge></div>
          <div className="card-pad" style={{ padding: 14 }}>
            <AgingRow label="0–30 days" value={a.d0_30} total={a.total} tone="amber" />
            <AgingRow label="31–60 days" value={a.d31_60} total={a.total} tone="orange" />
            <AgingRow label="61–90 days" value={a.d61_90} total={a.total} tone="red" />
            <AgingRow label="90+ days" value={a.d90_plus} total={a.total} tone="red" />
            {a.total === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No arrears — great work.</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Maintenance spend by property</h3><Badge tone="blue">{money(m.total_spend)}</Badge></div>
          {m.properties.length ? (
            <DataTable
              columns={[
                { key: 'title', header: 'Property', render: (r) => <div><div className="cell-strong">{r.title}</div><div className="cell-sub">{r.property_code}</div></div> },
                { key: 'total_orders', header: 'WOs', render: (r) => `${r.completed}/${r.total_orders}` },
                { key: 'total_cost', header: 'Spend', render: (r) => <strong>{money(r.total_cost)}</strong> },
                { key: 'avg_cost', header: 'Avg', render: (r) => <span className="cell-sub">{money(r.avg_cost)}</span> },
              ]}
              rows={m.properties}
            />
          ) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No maintenance costs yet.</div>}
        </div>
      </div>

      {/* Rent roll + Expiring leases */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-head"><h3>Rent roll</h3><Badge tone="green">{money(r.total_recurring)}/mo</Badge></div>
          {r.tenancies.length ? (
            <DataTable
              columns={[
                { key: 'tenant', header: 'Tenant', render: (t) => <div><div className="cell-strong">{t.tenant_name || '—'}</div><div className="cell-sub">{t.tenancy_code}</div></div> },
                { key: 'property', header: 'Property', render: (t) => t.property_title },
                { key: 'monthly_rent', header: 'Rent', render: (t) => <strong>{money(t.monthly_rent)}</strong> },
                { key: 'service_charge', header: 'Service', render: (t) => money(t.service_charge) },
                { key: 'lease_end', header: 'Lease ends', render: (t) => t.lease_end || '—' },
              ]}
              rows={r.tenancies}
            />
          ) : <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>No active tenancies.</div>}
        </div>

        <div className="card">
          <div className="card-head"><h3>Expiring leases</h3><Badge tone={exp.d30.length ? 'red' : exp.d60.length ? 'amber' : 'blue'}>{exp.d30.length + exp.d60.length + exp.d90.length}</Badge></div>
          <div className="card-pad" style={{ padding: 14 }}>
            <ExpiringBucket label="Next 30 days" rows={exp.d30} tone="red" />
            <ExpiringBucket label="31–60 days" rows={exp.d60} tone="amber" />
            <ExpiringBucket label="61–90 days" rows={exp.d90} tone="blue" />
            {exp.d30.length + exp.d60.length + exp.d90.length === 0 && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 12 }}>No leases expiring soon.</div>}
          </div>
        </div>
      </div>

      {/* Application funnel + Pipeline speed */}
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-head"><h3>Application funnel</h3><Badge tone={f.conversion_rate_pct >= 30 ? 'green' : 'amber'}>{f.conversion_rate_pct}% conversion</Badge></div>
          <div className="card-pad" style={{ padding: 14 }}>
            <FunnelStage label="Submitted" value={f.counts.submitted} max={f.total_created} />
            <FunnelStage label="Screening" value={f.counts.screening} max={f.total_created} />
            <FunnelStage label="Verification" value={f.counts.verification} max={f.total_created} />
            <FunnelStage label="Awaiting documents" value={f.counts.awaiting_documents} max={f.total_created} />
            <FunnelStage label="Awaiting owner approval" value={f.counts.awaiting_owner_approval} max={f.total_created} />
            <FunnelStage label="Approved" value={f.counts.approved} max={f.total_created} tone="green" />
            <FunnelStage label="Converted" value={f.counts.converted} max={f.total_created} tone="green" />
            <FunnelStage label="Rejected" value={f.counts.rejected} max={f.total_created} tone="red" />
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Pipeline speed</h3></div>
          <div className="card-pad" style={{ padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--primary)' }}>{ad.avg_days}</div>
                <div className="cell-sub">days from listing to signed lease</div>
                <div className="cell-sub" style={{ fontSize: 11 }}>Sample size: {ad.sample_size}</div>
              </div>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--warning)' }}>{o.avg_vacancy_days}</div>
                <div className="cell-sub">avg vacant days</div>
                <div className="cell-sub" style={{ fontSize: 11 }}>Across {o.vacant} vacant properties</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function BigMetric({ icon: Icon, label, value, sub, tone }) {
  const color = { blue: 'var(--primary)', green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }[tone] || 'var(--text)';
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, background: `var(--${tone}-bg)`, color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={20} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 700, marginTop: 4, letterSpacing: 0.3 }}>{label}</div>
          {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function AgingRow({ label, value, total, tone }) {
  const pct = total > 0 ? (Number(value) / Number(total)) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>{money(value)}</span>
      </div>
      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: `var(--${tone === 'red' ? 'danger' : tone === 'amber' ? 'warning' : 'primary'})` }} />
      </div>
    </div>
  );
}

function ExpiringBucket({ label, rows, tone }) {
  if (!rows.length) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: `var(--${tone === 'red' ? 'danger' : tone === 'amber' ? 'warning' : 'primary'})`, marginBottom: 6, letterSpacing: 0.3 }}>{label} · {rows.length}</div>
      {rows.map((r) => (
        <div key={r.id} className="between" style={{ padding: '6px 0', borderBottom: '1px dashed var(--border)' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{r.tenant_name || '—'}</div>
            <div className="cell-sub">{r.property_title} · Rent {money(r.monthly_rent)}</div>
          </div>
          <div style={{ fontSize: 12, color: `var(--${tone === 'red' ? 'danger' : tone === 'amber' ? 'warning' : 'primary'})`, fontWeight: 700 }}>{r.days_remaining}d</div>
        </div>
      ))}
    </div>
  );
}

function FunnelStage({ label, value, max, tone }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = tone === 'green' ? 'var(--success)' : tone === 'red' ? 'var(--danger)' : 'var(--primary)';
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="between" style={{ marginBottom: 3 }}>
        <span style={{ fontSize: 12.5 }}>{label}</span>
        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}
