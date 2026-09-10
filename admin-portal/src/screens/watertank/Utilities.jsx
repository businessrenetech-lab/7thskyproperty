import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Search, Plug, Check, X } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel, money, ClientLookupField,
} from './common';

/*
 * Utilities — Property Care & Concierge only (manifest utility_coordination).
 * The Utility Bill & Connection Assistance register: requests handled on a client's
 * behalf (bill payment, new connection, transfer), with provider/account, amount,
 * client approval and status. Grouped per client.
 */
export default function Utilities() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ utility_types: [], request_types: [], statuses: [] });
  const [summary, setSummary] = useState({ total: 0, open: 0, total_amount: 0, by_status: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-utilities', { params: { q: q || undefined } }),
        api.get('/wt-utilities/reference'),
        api.get('/wt-utilities/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.code}?`)) return;
    try { await api.delete(`/wt-utilities/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  const groups = [];
  rows.forEach((r) => {
    let g = groups.find((x) => x.client_code === r.client_code);
    if (!g) { g = { client_code: r.client_code, items: [] }; groups.push(g); }
    g.items.push(r);
  });

  return (
    <div className="wt-page">
      <WtHead title="Utilities" subtitle={`${svcLabel()} — bill & connection assistance`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New request</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Requests" value={summary.total} />
        <Chip label="Open" value={summary.open} />
        <Chip label="Total amount" value={money(summary.total_amount)} />
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1 }} placeholder="Search provider, account, client, address…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <button className="wt-btn sm" onClick={load}>Search</button>
      </div>

      {groups.length ? groups.map((g) => (
        <div key={g.client_code} className="wt-card wt-tblcard" style={{ marginBottom: 12 }}>
          <div style={{ padding: '12px 16px 4px' }}><div className="wt-sec-title">{g.client_code} <span className="muted" style={{ fontWeight: 400 }}>· {g.items.length} request(s)</span></div></div>
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 96 }}>Code</th><th style={{ width: 130 }}>Utility</th><th>Request / Provider</th><th style={{ width: 110, textAlign: 'right' }}>Amount</th><th style={{ width: 80 }}>Approved</th><th style={{ width: 120 }}>Status</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {g.items.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.code}</strong></td>
                  <td>{r.utility_type || '—'}</td>
                  <td>{r.service_request || '—'}{r.provider ? <div className="muted" style={{ fontSize: 11 }}>{r.provider}{r.account_ref ? ` · ${r.account_ref}` : ''}</div> : null}</td>
                  <td style={{ textAlign: 'right' }}>{Number(r.amount) ? money(r.amount) : '—'}</td>
                  <td>{r.client_approval ? <Check size={14} style={{ color: '#059669' }} /> : <X size={14} style={{ color: 'var(--wt-muted)' }} />}</td>
                  <td><Pill value={r.status} sm /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                    <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )) : <div className="wt-card" style={{ padding: 28 }}><EmptyState eyebrow={<Plug size={20} />} title="No utility requests yet" hint="Log a bill payment, new connection or transfer handled on a client's behalf." /></div>}

      {edit && <UtilityDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const Chip = ({ label, value }) => (
  <div className="wt-card" style={{ padding: '8px 14px' }}>
    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
  </div>
);
const Field = ({ label, children }) => (
  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function UtilityDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', client_name: row.client_name || '', utility_type: row.utility_type || '', service_request: row.service_request || '',
    provider: row.provider || '', account_ref: row.account_ref || '', request_date: row.request_date || '',
    required_date: row.required_date || '', amount: row.amount || '', client_approval: !!row.client_approval,
    completion_date: row.completion_date || '', status: row.status || 'Requested', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));
  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    if (!f.utility_type) { toast.err('Utility type is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-utilities', f); else await api.patch(`/wt-utilities/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };
  return (
    <WtDrawer title={isNew ? 'New utility request' : `Request ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client *"><ClientLookupField value={f.client_code} picked={f.client_name} autoFocus onPick={(c) => setF((s) => ({ ...s, client_code: c ? c.code : '', client_name: c ? c.name : '' }))} /></Field>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Utility type *"><select className="wt-input" value={f.utility_type} onChange={(e) => set('utility_type', e.target.value)}><option value="">—</option>{(ref_.utility_types || []).map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
          <Field label="Request type"><select className="wt-input" value={f.service_request} onChange={(e) => set('service_request', e.target.value)}><option value="">—</option>{(ref_.request_types || []).map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Provider"><input className="wt-input" value={f.provider} onChange={(e) => set('provider', e.target.value)} placeholder="e.g. DESCO, WASA, Titas" /></Field>
          <Field label="Account / reference"><input className="wt-input" value={f.account_ref} onChange={(e) => set('account_ref', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Request date"><input className="wt-input" type="date" value={f.request_date || ''} onChange={(e) => set('request_date', e.target.value)} /></Field>
          <Field label="Required by"><input className="wt-input" type="date" value={f.required_date || ''} onChange={(e) => set('required_date', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Amount (BDT)"><input className="wt-input" type="number" min="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} /></Field>
          <Field label="Status"><select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.statuses || ['Requested']).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
          <Field label="Completed"><input className="wt-input" type="date" value={f.completion_date || ''} onChange={(e) => set('completion_date', e.target.value)} /></Field>
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={f.client_approval} onChange={(e) => set('client_approval', e.target.checked)} /> Client approval obtained</label>
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
