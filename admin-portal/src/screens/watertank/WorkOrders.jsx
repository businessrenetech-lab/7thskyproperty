import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, Pencil, ChevronRight, RefreshCw, Truck, FileSignature, AlertTriangle,
  Wallet, ClipboardCheck,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, WtTabs, StatCards, dateFmt, bdt, StatusCell, RowActions,
  Loading, EmptyState, useFocusedRecord, toast, errText,
} from './common';

/*
 * Work Orders — the delivery register. Every row carries its progress bar, so
 * the state of the whole operation is readable at a glance. Work orders are
 * raised automatically when a Customer Service Agreement is signed.
 */

const STATUSES = ['Draft', 'Issued', 'Accepted', 'In Progress', 'Completed', 'Cancelled'];
const TABS = ['All', ...STATUSES];
const num = (v) => Number(v || 0);

export default function WorkOrders() {
  const nav = useNavigate();
  const [data, setData] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get('/wt-work-orders')
      .then((r) => setData(r.data))
      .catch((e) => setError(errText(e, 'Could not load work orders')))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const rows = data.rows || [];
  const s = data.summary || {};
  const open = (r) => nav(`/water-tank/work-orders/${r.code}`);
  useFocusedRecord(rows, open);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    STATUSES.forEach((st) => { c[st] = rows.filter((r) => (r.status || '').toLowerCase() === st.toLowerCase()).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => (tab === 'All' || (r.status || '').toLowerCase() === tab.toLowerCase())
      && (!term || [r.code, r.client_name, r.provider_name, r.project_id, r.category, r.source_agreement]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q]);

  const patch = async (id, body, msg) => {
    try { await api.patch(`/wt-work-orders/${id}`, body); if (msg) toast.ok(msg); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return (<><WtHead title="Work Orders" subtitle="Raised automatically on a signed Customer Service Agreement" /><Loading /></>);

  return (
    <>
      <WtHead
        title="Work Orders"
        subtitle="Raised automatically when the Customer Service Agreement is signed — assign, deliver, verify"
        search={q} onSearch={setQ}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </WtHead>

      <StatCards items={[
        { label: 'Awaiting Assignment', value: `${s.awaiting_assignment || 0}`, sub: 'No provider yet', color: s.awaiting_assignment ? 'var(--wt-red)' : undefined },
        { label: 'Awaiting Acceptance', value: `${s.awaiting_acceptance || 0}`, sub: 'Assigned, not confirmed', color: s.awaiting_acceptance ? 'var(--wt-amber)' : undefined },
        { label: 'In Progress', value: `${s.in_progress || 0}`, sub: `${s.completed || 0} completed · avg ${s.avg_progress || 0}% done` },
        { label: 'Provider Payouts Due', value: bdt(s.provider_due), sub: `${bdt(s.contract_value)} contracted`, color: s.provider_due ? 'var(--wt-amber)' : undefined },
      ]} />

      {s.awaiting_assignment > 0 && (
        <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', borderColor: '#fde68a', color: 'var(--wt-amber)' }}>
          <AlertTriangle size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
          <strong>{s.awaiting_assignment} work order{s.awaiting_assignment === 1 ? '' : 's'} need a provider.</strong>{' '}
          Only approved providers with a signed master agreement can be assigned (Sec. 6 Step 4).
        </div>
      )}

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-card wt-tblcard">
        {error ? (
          <EmptyState eyebrow="Error" title="Could not load work orders" hint={error}
            action={<button className="wt-btn" onClick={load}>Retry</button>} />
        ) : shown.length ? (
          <>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 88 }}>WO No</th><th>Client</th><th style={{ width: 158 }}>Provider</th>
                <th style={{ width: 168 }}>Progress</th><th style={{ width: 104 }}>Target</th>
                <th style={{ width: 104 }}>Source</th><th style={{ width: 112, textAlign: 'right' }}>Contract</th>
                <th style={{ width: 132 }}>Status</th><th style={{ width: 44 }} /><th style={{ width: 28 }} />
              </tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="click" onClick={() => open(r)}>
                    <td className="id">{r.code}</td>
                    <td>
                      <strong>{r.client_name}</strong>
                      {r.category && <span className="cell-sub">{r.category}</span>}
                    </td>
                    <td>
                      {r.provider_name
                        ? <>
                            <span className="muted">{r.provider_name}</span>
                            {!r.accepted_at && <span className="cell-sub" style={{ color: 'var(--wt-amber)' }}>Not yet accepted</span>}
                          </>
                        : <span className="wt-pill sm amber"><Truck size={9} /> Unassigned</span>}
                    </td>
                    <td>
                      <div className="wt-readiness">
                        <div className="bar">
                          <span style={{
                            width: `${r.progress}%`,
                            background: r.progress === 100 ? 'var(--wt-green)' : r.progress >= 50 ? 'var(--wt-accent)' : 'var(--wt-amber)',
                          }} />
                        </div>
                        <span className="n">{r.progress}%</span>
                      </div>
                    </td>
                    <td className="muted">{dateFmt(r.scheduled_date || r.target_date)}</td>
                    <td>
                      {r.source_agreement
                        ? <span className="wt-pill sm green" title={r.source_agreement}><FileSignature size={9} /> Agreement</span>
                        : <span className="muted">Manual</span>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      {bdt(r.total_contract)}
                      {r.provider_due > 0 && <div className="cell-sub" style={{ color: 'var(--wt-amber)' }}>{bdt(r.provider_due)} due</div>}
                    </td>
                    <td>
                      <StatusCell value={r.status} options={STATUSES}
                        onChange={(body) => patch(r.id, body, `${r.code} → ${body.status}`)} />
                    </td>
                    <td>
                      <RowActions items={[
                        { label: 'Open dashboard', icon: Eye, onClick: () => open(r) },
                        { label: 'Edit', icon: Pencil, onClick: () => nav(`/water-tank/work-orders/${r.code}/edit`) },
                        !r.provider_name && { label: 'Assign provider', icon: Truck, onClick: () => open(r) },
                        r.provider_due > 0 && { label: 'Pay provider', icon: Wallet, onClick: () => nav('/water-tank/payments') },
                      ]} />
                    </td>
                    <td><ChevronRight size={15} style={{ color: 'var(--wt-muted)' }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="wt-tblfoot">
              <span>Showing {shown.length} of {rows.length} work order{rows.length === 1 ? '' : 's'}</span>
              <span style={{ marginLeft: 'auto' }}>{s.from_agreements || 0} raised from signed agreements</span>
            </div>
          </>
        ) : (
          <EmptyState
            eyebrow="Work Orders"
            title={q ? `Nothing matches “${q}”.` : `No work orders in “${tab}”.`}
            hint={q ? undefined : 'A work order is raised automatically the moment a Customer Service Agreement is signed.'}
            action={!q && <button className="wt-btn primary" onClick={() => nav('/water-tank/quotations')}>
              <ClipboardCheck size={14} /> Go to quotations
            </button>}
          />
        )}
      </div>
    </>
  );
}
