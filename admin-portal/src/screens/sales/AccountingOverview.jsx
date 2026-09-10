// admin-portal/src/screens/sales/AccountingOverview.jsx
//
// Portfolio finance across every sale — read-only. Headline figures + four
// worklists, each row drilling into that deal's Settlement Desk. No money
// actions here; those live in the desk.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Wallet, HandCoins, Receipt, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { PageHead, StatCard, Button, Spinner } from '../../ui/kit';
import { settlementDeskPath } from './paths';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function AccountingOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get('/sales/accounting-overview'); setData(data.data); }
    catch (e) { setError(e.response?.data?.error || 'Could not load accounting overview.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openDesk = (propertyId, view) => navigate(`${settlementDeskPath('residential', propertyId)}?view=${view}`);

  const WL = ({ title, rows, view, cols }) => (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{title}</h3><span className="cell-sub">{rows.length}</span>
      </div>
      {rows.length === 0 ? <div className="card-pad cell-sub">Nothing here.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead><tr><th>Property</th>{cols.map((c) => <th key={c.k} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.h}</th>)}<th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={`${r.deal_id}-${r.property_id}`}>
                <td>{r.property_code || r.title || r.property_id}</td>
                {cols.map((c) => <td key={c.k} style={{ textAlign: c.right ? 'right' : 'left' }}>{c.money ? money(r[c.k]) : r[c.k]}</td>)}
                <td style={{ textAlign: 'right' }}><Button size="sm" variant="ghost" onClick={() => openDesk(r.property_id, view)}>Open desk</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return <div className="card-pad"><Spinner /></div>;
  if (error) return <div className="pm-card card-pad">{error} <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>;
  const h = data.headline; const w = data.worklists;
  return (
    <>
      <PageHead title="Accounting" desc="Portfolio finance across every sale — drill into a deal's Settlement Desk to act." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="grid-stats" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon={Wallet} tone="green" label="Trust cash held" value={money(h.trust_cash_held)} />
        <StatCard icon={Receipt} tone="sky" label="Buyer receivable" value={money(h.buyer_receivable)} />
        <StatCard icon={HandCoins} tone="amber" label="Agency fees outstanding" value={money(h.agency_fees_outstanding)} />
        <StatCard icon={HandCoins} tone="amber" label="Payables outstanding" value={money(h.payables_outstanding)} />
        <StatCard icon={CheckCircle2} tone="green" label={`Completed sales (${h.completed_sales_count})`} value={money(h.completed_sales_value)} />
      </div>
      <WL title="Awaiting receipt" rows={w.awaiting_receipt} view="record" cols={[{ k: 'expected', h: 'Expected', money: true, right: true }, { k: 'received', h: 'Received', money: true, right: true }]} />
      <WL title="Payouts to pay" rows={w.payouts_to_pay} view="record" cols={[{ k: 'amount', h: 'Amount', money: true, right: true }]} />
      <WL title="To approve" rows={w.to_approve} view="review" cols={[{ k: 'status', h: 'Status' }]} />
      <WL title="To lock" rows={w.to_lock} view="complete" cols={[]} />
    </>
  );
}
