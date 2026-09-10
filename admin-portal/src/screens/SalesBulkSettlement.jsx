// admin-portal/src/screens/SalesBulkSettlement.jsx
//
// Sales Bulk Settlement — settle many deals in one run, on the real /sales
// engine. It loads each deal's linked /sales settlement from the read-only
// readiness feed (GET /deals/settlement/sales-bulk-data) and, for every row
// that is *ready to lock* (settlement approved + no compliance blockers), calls
// the authoritative POST /api/sales/settlements/:id/lock — the same lock the
// single-deal workspace uses, with its separation-of-duties and blocker checks
// intact. It never writes money by a shortcut; a row that cannot lock comes
// back skipped with the server's reason.
import React, { useState, useCallback } from 'react';
import { Play, RefreshCw } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Spinner, Badge } from '../ui/kit';

export default function SalesBulkSettlement() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [sel, setSel] = useState({});
  const [res, setRes] = useState(null);

  const load = useCallback(async () => {
    // Note: does NOT clear `res` — a refresh after run() must keep the
    // per-row settled/skipped badges visible. `res` is only cleared when a
    // new run starts (see run() below).
    setLoading(true);
    try {
      const { data } = await api.get('/deals/settlement/sales-bulk-data');
      setRows(data.data || []);
      setSummary(data.summary);
      const s = {};
      (data.data || []).forEach((r) => { s[r.settlement_id] = r.ready; });
      setSel(s);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [toast]);
  React.useEffect(() => { load(); }, [load]);

  // Only ready rows are selectable; the checkbox on a not-ready row is disabled.
  const chosen = rows.filter((r) => r.ready && sel[r.settlement_id]);

  const run = async () => {
    setRes(null); // clear stale results only when a new run starts
    setRunning(true);
    const results = [];
    let settled = 0; let skipped = 0;
    // Lock each settlement through the /sales engine, one at a time so one
    // row's failure never aborts the rest. Each call is the authoritative lock.
    for (const r of chosen) {
      try {
        await api.post(`/sales/settlements/${r.settlement_id}/lock`, {});
        results.push({ settlement_id: r.settlement_id, status: 'settled' });
        settled += 1;
      } catch (e) {
        results.push({ settlement_id: r.settlement_id, status: 'skipped', reason: e.response?.data?.error || 'lock failed' });
        skipped += 1;
      }
    }
    setRes({ results, summary: { settled, skipped } });
    setRunning(false);
    toast[skipped && !settled ? 'error' : 'success'](`${settled} settled, ${skipped} skipped`);
    load();
  };

  const resultFor = (sid) => res?.results?.find((x) => x.settlement_id === sid);

  return (
    <>
      <PageHead
        title="Sales Settlement (Bulk)"
        desc="Lock every approved, unblocked settlement in one run — settled through the /sales engine, not a shortcut."
        actions={(
          <>
            <Button variant="ghost" icon={RefreshCw} onClick={load} disabled={running}>Refresh</Button>
            <Button icon={Play} onClick={run} disabled={!chosen.length || running}>Settle {chosen.length}</Button>
          </>
        )}
      />
      {summary && (
        <div style={{ display: 'flex', gap: 12, margin: '8px 0' }}>
          {[['In-flight settlements', summary.deals], ['Awaiting', summary.awaiting], ['Ready to settle', summary.ready_to_settle]].map(([k, v]) => (
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
        ) : rows.length === 0 ? (
          <div className="card-pad" style={{ color: '#64748b' }}>No in-flight settlements. A settlement appears here once it is approved and awaiting its final lock.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th />
                <th>Deal</th>
                <th>Settlement</th>
                <th>Status</th>
                <th>Readiness</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const x = resultFor(r.settlement_id);
                return (
                  <tr key={r.settlement_id}>
                    <td>
                      <input
                        type="checkbox"
                        disabled={!r.ready}
                        checked={!!(r.ready && sel[r.settlement_id])}
                        onChange={(e) => setSel({ ...sel, [r.settlement_id]: e.target.checked })}
                      />
                    </td>
                    <td>{r.deal_code}</td>
                    <td>{r.settlement_code}</td>
                    <td><Badge tone={r.status === 'approved' ? 'green' : 'grey'}>{r.status}</Badge></td>
                    <td>
                      {r.ready
                        ? <Badge tone="green">ready</Badge>
                        : r.blockers?.length
                          ? <span style={{ fontSize: 12, color: '#b45309' }} title={r.blockers.join(', ')}>{r.blockers.length} blocker{r.blockers.length > 1 ? 's' : ''}</span>
                          : <span style={{ fontSize: 12, color: '#64748b' }}>needs approval</span>}
                    </td>
                    <td>{x ? <Badge tone={x.status === 'settled' ? 'green' : 'amber'} title={x.reason || ''}>{x.status}</Badge> : ''}</td>
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
