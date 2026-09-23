import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { PageHead, StatCard, Spinner, Badge } from '../../../ui/kit';

const money = (n) => `BDT ${Number(n || 0).toLocaleString()}`;

function Panel({ title, children }) {
  return (
    <section className="wt-card" style={{ padding: 18, marginTop: 14 }}>
      <h3 style={{ margin: '0 0 10px', color: '#115e59' }}>{title}</h3>
      {children}
    </section>
  );
}

/** The six dashboards named in the Business Registration workbook. */
export default function Dashboards() {
  const toast = useToast();
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get('/br-line/dashboards')
      .then(({ data }) => setD(data.data))
      .catch(() => toast.error('Could not load the registration dashboards'));
  }, [toast]);

  if (!d) return <Spinner />;
  const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 };

  return (
    <div className="wt-scope">
      <PageHead title="Registration Dashboards" desc="Registration, revenue, government liaison, providers, risk and profitability." />

      <Panel title="Registration">
        <div style={row}>
          <StatCard label="New applications" value={d.registration.new_applications} tone="blue" />
          <StatCard label="Pending" value={d.registration.pending} tone="amber" />
          <StatCard label="Completed" value={d.registration.completed} tone="green" />
          <StatCard label="Rejected submissions" value={d.registration.rejected} tone="red" />
        </div>
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead><tr><th>SOP phase</th><th style={{ textAlign: 'right' }}>Projects</th></tr></thead>
          <tbody>
            {d.registration.by_stage.map((s) => (
              <tr key={s.stage}><td>{s.stage}</td><td style={{ textAlign: 'right' }}>{s.count}</td></tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Revenue">
        <div style={row}>
          <StatCard label="Professional fees" value={money(d.revenue.professional_total)} tone="green" />
          <StatCard label="Government fees collected" value={money(d.revenue.government_collected)} tone="grey" />
          <StatCard label="Invoiced" value={money(d.revenue.invoiced)} tone="blue" />
        </div>
        <p className="cell-sub" style={{ marginTop: 8 }}>
          Government fees are collected for the authority and are not counted as revenue.
        </p>
      </Panel>

      <Panel title="Government liaison">
        <div style={row}>
          <StatCard label="Municipality / licence" value={d.government_liaison.municipality_cases} />
          <StatCard label="RJSC" value={d.government_liaison.rjsc_cases} />
          <StatCard label="Tax (TIN/BIN/VAT)" value={d.government_liaison.tax_cases} />
          <StatCard label="Open with authorities" value={d.government_liaison.open} tone="amber" />
        </div>
      </Panel>

      <Panel title="Providers">
        <div style={row}>
          <StatCard label="Approved providers" value={d.provider.active} />
          <StatCard label="Providers on file" value={d.provider.total} />
          <StatCard label="Jobs assigned" value={d.provider.jobs_assigned} />
          <StatCard label="Jobs completed" value={d.provider.jobs_completed} tone="green" />
        </div>
      </Panel>

      <Panel title="Risk">
        <div style={row}>
          <StatCard label="Delayed (over 14 days)" value={d.risk.delayed_applications} tone="red" />
          <StatCard label="Name clearance rejections" value={d.risk.name_clearance_rejections} tone="red" />
          <StatCard label="Awaiting authority" value={d.risk.government_queries} tone="amber" />
        </div>
        {d.risk.rejections.length > 0 && (
          <table className="tbl" style={{ marginTop: 10 }}>
            <thead><tr><th>Activity</th><th>Project</th><th>Reason</th></tr></thead>
            <tbody>
              {d.risk.rejections.slice(0, 20).map((r, i) => (
                <tr key={i}><td>{String(r.activity || '').replace(/_/g, ' ')}</td><td className="cell-sub">{r.project || '—'}</td><td className="cell-sub">{r.reason || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <Panel title="Profitability">
        <div style={row}>
          <StatCard label="Gross margin" value={money(d.profitability.gross_margin_total)} tone="green" />
          <StatCard label="Provider cost" value={money(d.profitability.provider_cost_total)} tone="grey" />
        </div>
        <table className="tbl" style={{ marginTop: 10 }}>
          <thead><tr><th>Project</th><th>Professional fee</th><th>Provider cost</th><th>Margin</th><th>%</th></tr></thead>
          <tbody>
            {d.profitability.per_project.length === 0 && <tr><td colSpan={5} className="cell-sub">No projects yet.</td></tr>}
            {d.profitability.per_project.map((p) => (
              <tr key={p.project}>
                <td>{p.project}<div className="cell-sub">{p.name}</div></td>
                <td>{money(p.professional)}</td>
                <td>{money(p.provider_cost)}</td>
                <td>{money(p.gross_margin)}</td>
                <td><Badge tone={p.margin_pct >= 30 ? 'green' : p.margin_pct >= 0 ? 'amber' : 'red'}>{p.margin_pct}%</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
