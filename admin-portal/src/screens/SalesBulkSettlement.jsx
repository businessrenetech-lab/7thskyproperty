// admin-portal/src/screens/SalesBulkSettlement.jsx
//
// Sales Bulk Settlement (Task 8). Mirrors BulkOwnerDisbursement.jsx: load
// every deal that has money movement pending, pick the ones that are fully
// received, and settle them in one POST. Posts nothing new — it only calls
// the existing settlement/bulk endpoints built in Task 7's bulk-data +
// bulk API, same as the single-deal DealSettlementWorkspace's "Mark settled"
// action but run across many deals at once.
import React, { useState, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Spinner, Badge } from '../ui/kit';

const money = (v) => 'BDT ' + Number(v || 0).toLocaleString();

export default function SalesBulkSettlement() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState({});
  const [res, setRes] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRes(null);
    try {
      const { data } = await api.get('/deals/settlement/bulk-data');
      setRows(data.data || []);
      setSummary(data.summary);
      const s = {};
      (data.data || []).forEach((r) => { s[r.deal_id] = r.statuses.payment === 'received'; });
      setSel(s);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);
  React.useEffect(() => { load(); }, [load]);

  const ids = rows.filter((r) => sel[r.deal_id]).map((r) => r.deal_id);

  const run = async () => {
    try {
      const { data } = await api.post('/deals/settlement/bulk', { deal_ids: ids });
      setRes(data);
      toast.success(`${data.summary.settled} settled, ${data.summary.skipped} skipped`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Run failed');
    }
  };

  const resultFor = (id) => res?.results?.find((x) => x.deal_id === id);

  return (
    <>
      <PageHead
        title="Sales Settlement (Bulk)"
        desc="Settle every fully-received deal in one run — posts nothing new, just confirms settlement."
        actions={(
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>
            <Button icon={Play} onClick={run} disabled={!ids.length}>Settle {ids.length}</Button>
          </>
        )}
      />
      {summary && (
        <div style={{ display: 'flex', gap: 12, margin: '8px 0' }}>
          {[['Deals', summary.deals], ['Awaiting money', summary.awaiting], ['Ready to settle', summary.ready_to_settle]].map(([k, v]) => (
            <div key={k} className="card" style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 11, color: '#64748b' }}>{k}</div>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        {loading ? (
          <div className="card-pad"><Spinner /></div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th />
                <th>Deal</th>
                <th style={{ textAlign: 'right' }}>Expected</th>
                <th style={{ textAlign: 'right' }}>Received</th>
                <th>Payment</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const x = resultFor(r.deal_id);
                return (
                  <tr key={r.deal_id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!sel[r.deal_id]}
                        onChange={(e) => setSel({ ...sel, [r.deal_id]: e.target.checked })}
                      />
                    </td>
                    <td>{r.deal_code}</td>
                    <td style={{ textAlign: 'right' }}>{money(r.expected)}</td>
                    <td style={{ textAlign: 'right' }}>{money(r.received)}</td>
                    <td><Badge tone={r.statuses.payment === 'received' ? 'green' : 'amber'}>{r.statuses.payment}</Badge></td>
                    <td>{x ? <Badge tone={x.status === 'settled' ? 'green' : 'grey'}>{x.status}</Badge> : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
