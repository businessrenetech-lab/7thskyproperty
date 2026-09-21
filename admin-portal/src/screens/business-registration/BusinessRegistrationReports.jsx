import React, { useEffect, useState } from 'react';
import { ScrollText, HandCoins, Receipt, Layers, Landmark, Building2, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Button, StatCard, Spinner } from '../../ui/kit';
import { STAGE_LABEL, BIZ_TYPE_LABEL, money } from './constants';

const teal = '#0d9488';

function Breakdown({ title, data, labelMap }) {
  const entries = Object.entries(data || {}).filter(([, n]) => n);
  if (!entries.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#115e59' }}>{title}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {entries.map(([k, n]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{(labelMap && labelMap[k]) || k.replace(/_/g, ' ')}</span>
            <b>{n}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

const H = ({ children }) => <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '20px 0 8px', letterSpacing: 0.4 }}>{children}</div>;

export default function BusinessRegistrationReports() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get('/business-registration-reports/overview').then((r) => setD(r.data.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  if (loading || !d) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const { projects, enquiries, revenue, government_liaison, providers, risk, profitability } = d;
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 };

  return (
    <div className="pm-scope">
      <PageHead title="Business Registration Reports" desc="Every figure scoped to the Business Registration module only."
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />

      <H>REGISTRATION</H>
      <div style={grid}>
        <StatCard icon={ScrollText} label="Projects" value={projects.total} tone="violet" />
        <StatCard icon={Layers} label="New applications" value={projects.new_applications} tone="blue" />
        <StatCard icon={Layers} label="In progress" value={projects.pending} tone="amber" />
        <StatCard icon={ScrollText} label="Completed" value={projects.completed} tone="green" />
      </div>

      <H>REVENUE</H>
      <div style={grid}>
        <StatCard icon={HandCoins} label="Contract value" value={money(revenue.contract_value)} tone="violet" />
        <StatCard icon={Receipt} label="Invoiced" value={money(revenue.invoiced)} tone="blue" />
        <StatCard icon={HandCoins} label="Collected" value={money(revenue.collected)} tone="green" />
        <StatCard icon={Layers} label="Outstanding" value={money(revenue.outstanding)} tone={revenue.outstanding > 0 ? 'red' : 'green'} />
        <StatCard icon={Landmark} label="Government fees" value={money(revenue.government_fees)} tone="blue" />
      </div>

      <H>PROFITABILITY</H>
      <div style={grid}>
        <StatCard icon={TrendingUp} label="Revenue" value={money(profitability.revenue)} tone="blue" />
        <StatCard icon={Building2} label="Provider cost" value={money(profitability.provider_cost)} tone="amber" />
        <StatCard icon={TrendingUp} label="Gross margin" value={money(profitability.gross_margin)} tone={profitability.gross_margin >= 0 ? 'green' : 'red'} />
        <StatCard icon={TrendingUp} label="Margin %" value={`${profitability.margin_percent}%`} tone="violet" />
      </div>

      <H>RISK</H>
      <div style={grid}>
        <StatCard icon={AlertTriangle} label="Priority / urgent" value={risk.priority_projects} tone="amber" />
        <StatCard icon={AlertTriangle} label="On hold" value={risk.on_hold} tone={risk.on_hold > 0 ? 'red' : 'green'} />
        <StatCard icon={AlertTriangle} label="Rejected activities" value={risk.rejected_activities} tone={risk.rejected_activities > 0 ? 'red' : 'green'} />
        <StatCard icon={AlertTriangle} label="Awaiting QA" value={risk.overdue_reviews} tone="amber" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
        <Breakdown title="Projects by stage" data={projects.by_stage} labelMap={STAGE_LABEL} />
        <Breakdown title="Projects by type" data={projects.by_type} labelMap={BIZ_TYPE_LABEL} />
        <Breakdown title="Projects by status" data={projects.by_status} />
        <Breakdown title="Government liaison cases" data={government_liaison} />
        <Breakdown title="Provider work orders" data={providers.by_status} />
        <Breakdown title="Enquiries" data={{ total: enquiries.total, converted: enquiries.converted, 'conversion %': enquiries.conversion_rate }} />
      </div>
    </div>
  );
}
