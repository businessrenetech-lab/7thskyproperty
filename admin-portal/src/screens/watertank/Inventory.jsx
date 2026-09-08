import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Search, Boxes, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel,
} from './common';

/*
 * Inventory — Removal & Relocation only (manifest inventory).
 * The itemised list of a client's goods being moved (room, qty, fragile/high-value,
 * photo, condition, status Listed→Delivered). The client's Inventory Acknowledgement
 * is captured at agreement signing; this is the list itself. Grouped per client.
 */
export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ statuses: [], rooms: [] });
  const [summary, setSummary] = useState({ lines: 0, items: 0, fragile: 0, high_value: 0, by_status: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-inventory', { params: { q: q || undefined } }),
        api.get('/wt-inventory/reference'),
        api.get('/wt-inventory/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete "${row.item}"?`)) return;
    try { await api.delete(`/wt-inventory/${row.id}`); toast.ok('Deleted'); load(); }
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
      <WtHead title="Inventory" subtitle={`${svcLabel()} — items being moved`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New item</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Lines" value={summary.lines} />
        <Chip label="Items" value={summary.items} />
        <Chip label="Fragile" value={summary.fragile} />
        <Chip label="High value" value={summary.high_value} />
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1 }} placeholder="Search item, room, client, condition…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <button className="wt-btn sm" onClick={load}>Search</button>
      </div>

      {groups.length ? groups.map((g) => (
        <div key={g.client_code} className="wt-card wt-tblcard" style={{ marginBottom: 12 }}>
          <div style={{ padding: '12px 16px 4px' }}><div className="wt-sec-title">{g.client_code} <span className="muted" style={{ fontWeight: 400 }}>· {g.items.length} line(s)</span></div></div>
          <table className="wt-tbl">
            <thead><tr><th>Room</th><th>Item</th><th style={{ width: 60, textAlign: 'right' }}>Qty</th><th style={{ width: 130 }}>Flags</th><th style={{ width: 110 }}>Status</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {g.items.map((r) => (
                <tr key={r.id}>
                  <td>{r.room || '—'}</td>
                  <td><strong>{r.item}</strong>{r.condition_note ? <div className="muted" style={{ fontSize: 11 }}>{r.condition_note}</div> : null}</td>
                  <td style={{ textAlign: 'right' }}>{r.qty}</td>
                  <td>
                    {r.fragile ? <span className="wt-pill sm amber" style={{ marginRight: 4 }}><AlertTriangle size={10} /> Fragile</span> : null}
                    {r.high_value ? <span className="wt-pill sm red">High value</span> : null}
                    {!r.fragile && !r.high_value ? <span className="muted">—</span> : null}
                  </td>
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
      )) : <div className="wt-card" style={{ padding: 28 }}><EmptyState eyebrow={<Boxes size={20} />} title="No inventory yet" hint="Add the items a client is moving, or import from the site inspection." /></div>}

      {edit && <ItemDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
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
  <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function ItemDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', room: row.room || '', item: row.item || '', qty: row.qty || 1,
    fragile: !!row.fragile, high_value: !!row.high_value, condition_note: row.condition_note || '',
    status: row.status || 'Listed', work_order_code: row.work_order_code || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    if (!f.item.trim()) { toast.err('Item is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-inventory', f); else await api.patch(`/wt-inventory/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={isNew ? 'New inventory item' : `Item ${row.id}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client code *"><input className="wt-input" value={f.client_code} onChange={(e) => set('client_code', e.target.value)} placeholder="e.g. RRS-C0001" /></Field>}
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Room"><select className="wt-input" value={f.room} onChange={(e) => set('room', e.target.value)}><option value="">—</option>{(ref_.rooms || []).map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
          <Field label="Qty"><input className="wt-input" type="number" min="1" value={f.qty} onChange={(e) => set('qty', e.target.value)} /></Field>
        </div>
        <Field label="Item *"><input className="wt-input" value={f.item} onChange={(e) => set('item', e.target.value)} placeholder="e.g. 3-seater sofa" /></Field>
        <div style={{ display: 'flex', gap: 16 }}>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={f.fragile} onChange={(e) => set('fragile', e.target.checked)} /> Fragile</label>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={f.high_value} onChange={(e) => set('high_value', e.target.checked)} /> High value</label>
        </div>
        <Field label="Status"><select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.statuses || ['Listed']).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        <Field label="Condition / notes"><textarea className="wt-input" rows={2} value={f.condition_note} onChange={(e) => set('condition_note', e.target.value)} placeholder="e.g. minor scratch on left arm" /></Field>
      </div>
    </WtDrawer>
  );
}
