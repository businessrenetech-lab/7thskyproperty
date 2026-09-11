// admin-portal/src/screens/sales/SalesWorkQueue.jsx
//
// Role-based "what's waiting on me" across the sales pipeline — read-only,
// derived server-side from settlement status + calculations. Items group by
// kind; each Go links to the desk view that resolves it. Managers can toggle
// My work / All.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { PageHead, Button, Spinner, Badge } from '../../ui/kit';
import { settlementDeskPath } from './paths';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();
// kind -> [group label, desk view]. offer_review routes to the property file offers section.
const KIND = {
  prepare: ['Prepare', 'prepare'], submit: ['Submit for review', 'review'], review: ['Review', 'review'],
  approve: ['Approve', 'review'], record_receipt: ['Record receipt', 'record'], match_bank: ['Match bank', 'match'],
  pay_out: ['Pay out', 'record'], lock: ['Lock & complete', 'complete'], offer_review: ['Offer review', null],
  sop_overdue: ['Overdue SOP', null],
};
const ORDER = ['prepare', 'submit', 'review', 'approve', 'record_receipt', 'match_bank', 'pay_out', 'lock', 'offer_review', 'sop_overdue'];

export default function SalesWorkQueue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = ['super_admin', 'branch_admin', 'property_manager'].includes(user?.role);
  const [items, setItems] = useState(null);
  const [scope, setScope] = useState('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const { data } = await api.get(`/sales/work-queue${scope === 'all' ? '?scope=all' : ''}`); setItems(data.data.items || []); }
    catch (e) { setError(e.response?.data?.error || 'Could not load your work queue.'); }
    finally { setLoading(false); }
  }, [scope]);
  useEffect(() => { load(); }, [load]);

  const go = (it) => {
    if (it.kind === 'offer_review') return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=offers`);
    if (it.kind === 'sop_overdue') return navigate(`${settlementDeskPath('residential', it.property_id).replace('/settlement', '')}?section=workflow`);
    const view = KIND[it.kind]?.[1] || 'prepare';
    navigate(`${settlementDeskPath('residential', it.property_id)}?view=${view}`);
  };

  if (loading) return <div className="card-pad"><Spinner /></div>;
  if (error) return <div className="pm-card card-pad">{error} <Button variant="ghost" size="sm" onClick={load}>Retry</Button></div>;
  const groups = ORDER.map((k) => [k, items.filter((it) => it.kind === k)]).filter(([, rows]) => rows.length);

  return (
    <>
      <PageHead title="My Work Queue" desc="Everything waiting on you across the sales pipeline." actions={<>
        {isManager && <Button variant="ghost" size="sm" onClick={() => setScope(scope === 'all' ? 'mine' : 'all')}>{scope === 'all' ? 'Show my work' : 'Show all'}</Button>}
        <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
      </>} />
      {groups.length === 0 ? <div className="pm-card card-pad">You&apos;re all caught up. 🎉</div> : groups.map(([k, rows]) => (
        <div className="card" key={k} style={{ marginTop: 12 }}>
          <div className="card-pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>{KIND[k][0]}</h3><Badge tone="amber">{rows.length}</Badge>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl"><tbody>
              {rows.map((it, i) => (
                <tr key={i}>
                  <td>{it.label}</td>
                  <td style={{ textAlign: 'right' }}>{it.amount != null ? money(it.amount) : ''}</td>
                  <td style={{ textAlign: 'right' }}><Button size="sm" onClick={() => go(it)}>Go</Button></td>
                </tr>
              ))}
            </tbody></table>
          </div>
        </div>
      ))}
    </>
  );
}
