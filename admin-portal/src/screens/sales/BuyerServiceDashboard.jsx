// admin-portal/src/screens/sales/BuyerServiceDashboard.jsx
//
// Buyer service dashboard — the buy-side counterpart to the seller Sell Dashboard.
// KPIs + worklists over buy deals and buyer mandates, each linking into the buyer
// deal file (/residential/buy/:id). Buyer service is fee-for-coordination.
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Briefcase, ClipboardList, HandCoins } from 'lucide-react';
import api from '../../services/api';
import { PageHead, StatCard, Button, Spinner } from '../../ui/kit';

const BUY_STAGES = ['lead', 'negotiation', 'agreed', 'settlement', 'completed', 'cancelled'];

export default function BuyerServiceDashboard() {
  const navigate = useNavigate();
  const [deals, setDeals] = useState(null);
  const [mandates, setMandates] = useState(null);

  const load = useCallback(async () => {
    setDeals(null); setMandates(null);
    try {
      const [d, m] = await Promise.all([
        api.get('/deals?deal_type=buy&category=residential&limit=500'),
        api.get('/buyer-mandates').catch(() => ({ data: { data: [] } })),
      ]);
      setDeals(d.data.data || d.data.rows || []);
      setMandates(m.data.data || []);
    } catch { setDeals([]); setMandates([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const loading = deals === null || mandates === null;
  const byStage = (s) => (deals || []).filter((d) => d.status === s);
  const activeMandates = (mandates || []).filter((m) => ['active', 'engaged'].includes(m.status));
  const openDeals = (deals || []).filter((d) => !['completed', 'cancelled'].includes(d.status));

  const WL = ({ title, icon: Icon, rows, render, onRow, empty }) => (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, display: 'inline-flex', gap: 8, alignItems: 'center' }}>{Icon && <Icon size={16} />} {title}</h3>
        <span className="cell-sub">{rows.length}</span>
      </div>
      {rows.length === 0 ? <div className="card-pad cell-sub">{empty || 'Nothing here.'}</div> : (
        <div style={{ overflowX: 'auto' }}><table className="tbl"><tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ cursor: onRow ? 'pointer' : 'default' }} onClick={() => onRow?.(r)}>{render(r)}</tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );

  if (loading) return <><PageHead title="Buyer Service" desc="Buyer-side pipeline, mandates and service-fee status." /><div className="card-pad"><Spinner /></div></>;

  return (
    <>
      <PageHead title="Buyer Service" desc="Buyer-side pipeline, mandates and service-fee status — open a deal for its 8-stage purchase workflow." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="grid-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon={Users} tone="sky" label="Active mandates" value={activeMandates.length} />
        <StatCard icon={Briefcase} tone="green" label="Open buy deals" value={openDeals.length} />
        <StatCard icon={ClipboardList} tone="amber" label="In negotiation" value={byStage('negotiation').length} />
        <StatCard icon={HandCoins} tone="amber" label="At settlement" value={byStage('settlement').length} />
      </div>

      <WL
        title="Active buyer mandates" icon={Users} rows={activeMandates}
        onRow={() => navigate('/residential/mandates')}
        empty="No active mandates. Create one from Buyer Mandates."
        render={(m) => (<>
          <td><strong>{m.mandate_code}</strong></td>
          <td>{m.buyer_name || '—'}</td>
          <td className="cell-sub">{m.candidate_count} candidates</td>
          <td><span className="pm-chip">{m.status}</span></td>
        </>)}
      />

      <WL
        title="Open buy deals" icon={Briefcase} rows={openDeals}
        onRow={(d) => navigate(`/residential/buy/${d.id}`)}
        empty="No open buy deals."
        render={(d) => (<>
          <td><strong>{d.deal_code}</strong></td>
          <td>{d.buyer?.Contact?.full_name || d.Property?.title || '—'}</td>
          <td className="cell-sub">{d.Property?.property_code || '—'}</td>
          <td><span className="pm-chip">{d.status}</span></td>
        </>)}
      />
    </>
  );
}
