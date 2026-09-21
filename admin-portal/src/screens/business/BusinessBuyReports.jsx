import React, { useEffect, useState } from 'react';
import { ClipboardList, Target, Receipt, HandCoins, Layers, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { PageHead, Button, StatCard, Spinner } from '../../ui/kit';

const money = (n) => `৳${Number(n || 0).toLocaleString()}`;

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {}).filter(([, n]) => n);
  if (!entries.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #e0e7ff', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#3730a3' }}>{title}</div>
      <div style={{ display: 'grid', gap: 6 }}>
        {entries.map(([k, n]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span><b>{n}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BusinessBuyReports() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); api.get('/business-reports/buy-overview').then((r) => setD(r.data.data)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  if (loading || !d) return <div className="pm-scope" style={{ padding: 40, textAlign: 'center' }}><Spinner /></div>;
  const { mandates, targets, invoices } = d;

  return (
    <div className="pm-scope">
      <PageHead title="Business Buy Reports" desc="Acquisition pipeline & financials — every figure scoped to the Business Buy console only."
        actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '10px 0 8px' }}>PIPELINE</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={ClipboardList} label="Mandates" value={mandates.total} tone="violet" />
        <StatCard icon={Target} label="Target shortlist" value={targets.total} tone="blue" />
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', margin: '18px 0 8px' }}>FINANCIALS</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <StatCard icon={Receipt} label="Invoiced" value={money(invoices.total_invoiced)} tone="blue" />
        <StatCard icon={HandCoins} label="Collected" value={money(invoices.total_collected)} tone="green" />
        <StatCard icon={Layers} label="Outstanding" value={money(invoices.outstanding)} tone={invoices.outstanding > 0 ? 'red' : 'green'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
        <Breakdown title="Mandates by stage" data={mandates.by_stage} />
        <Breakdown title="Mandates by status" data={mandates.by_status} />
        <Breakdown title="Targets by status" data={targets.by_status} />
      </div>
    </div>
  );
}
