import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, Pencil, Trash2, Search, Wrench, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel,
} from './common';

/*
 * PropertyAssets — Property Care & Concierge only (manifest asset_register).
 * The per-property Asset & Maintenance register: what's at the client's property
 * (brand/model/serial, condition), when it was last serviced, when it's next due,
 * and when its warranty expires — so recurring maintenance can be scheduled and
 * warranties watched. Grouped per client. Due-soon / overdue / warranty flags.
 */
export default function PropertyAssets() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ categories: [], conditions: [], statuses: [] });
  const [summary, setSummary] = useState({ total: 0, due_soon: 0, overdue: 0, warranty_expiring: 0, by_status: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-assets', { params: { q: q || undefined } }),
        api.get('/wt-assets/reference'),
        api.get('/wt-assets/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete asset "${row.area || row.brand_model}"?`)) return;
    try { await api.delete(`/wt-assets/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const soon = new Date(today); soon.setDate(soon.getDate() + 30);
  const dueTone = (d) => { if (!d) return null; const nd = new Date(d); if (nd < today) return 'red'; if (nd <= soon) return 'amber'; return null; };

  const groups = [];
  rows.forEach((r) => {
    let g = groups.find((x) => x.client_code === r.client_code);
    if (!g) { g = { client_code: r.client_code, items: [] }; groups.push(g); }
    g.items.push(r);
  });

  return (
    <div className="wt-page">
      <WtHead title="Property Assets" subtitle={`${svcLabel()} — asset & maintenance register`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New asset</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Assets" value={summary.total} />
        <Chip label="Due soon (30d)" value={summary.due_soon} tone={summary.due_soon ? 'amber' : null} />
        <Chip label="Overdue" value={summary.overdue} tone={summary.overdue ? 'red' : null} />
        <Chip label="Warranty expiring" value={summary.warranty_expiring} tone={summary.warranty_expiring ? 'amber' : null} />
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1 }} placeholder="Search asset, brand, serial, client, address…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <button className="wt-btn sm" onClick={load}>Search</button>
      </div>

      {groups.length ? groups.map((g) => (
        <div key={g.client_code} className="wt-card wt-tblcard" style={{ marginBottom: 12 }}>
          <div style={{ padding: '12px 16px 4px' }}><div className="wt-sec-title">{g.client_code} <span className="muted" style={{ fontWeight: 400 }}>· {g.items.length} asset(s)</span></div></div>
          <table className="wt-tbl">
            <thead><tr><th>Asset / Area</th><th style={{ width: 110 }}>Category</th><th style={{ width: 100 }}>Condition</th><th style={{ width: 120 }}>Next service</th><th style={{ width: 120 }}>Warranty</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {g.items.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.area || '—'}</strong>{r.brand_model ? <div className="muted" style={{ fontSize: 11 }}>{r.brand_model}{r.serial_no ? ` · ${r.serial_no}` : ''}</div> : null}</td>
                  <td>{r.category || '—'}</td>
                  <td>{r.condition ? <Pill value={r.condition} sm /> : '—'}</td>
                  <td>{r.next_service_due ? <span className={dueTone(r.next_service_due) ? `wt-pill sm ${dueTone(r.next_service_due)}` : ''}>{dueTone(r.next_service_due) === 'red' ? <AlertTriangle size={10} /> : null} {r.next_service_due}</span> : <span className="muted">—</span>}</td>
                  <td>{r.warranty_expiry || <span className="muted">—</span>}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                    <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )) : <div className="wt-card" style={{ padding: 28 }}><EmptyState eyebrow={<Wrench size={20} />} title="No assets yet" hint="Record the assets at a client's property to schedule recurring maintenance and watch warranties." /></div>}

      {edit && <AssetDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const Chip = ({ label, value, tone }) => (
  <div className="wt-card" style={{ padding: '8px 14px' }}>
    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15, color: tone === 'red' ? '#b91c1c' : tone === 'amber' ? '#b45309' : 'inherit' }}>{value}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ flex: 1 }}><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function AssetDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', area: row.area || '', category: row.category || '',
    brand_model: row.brand_model || '', serial_no: row.serial_no || '', condition: row.condition || '',
    last_service_date: row.last_service_date || '', next_service_due: row.next_service_due || '', warranty_expiry: row.warranty_expiry || '',
    responsible_tech: row.responsible_tech || '', maintenance_requirement: row.maintenance_requirement || '',
    status: row.status || 'Active', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    if (!f.area.trim() && !f.brand_model.trim()) { toast.err('Asset / area is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-assets', f); else await api.patch(`/wt-assets/${row.id}`, f);
      toast.ok(isNew ? 'Added' : 'Updated'); onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={isNew ? 'New asset' : `Asset ${row.code || row.id}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client code *"><input className="wt-input" value={f.client_code} onChange={(e) => set('client_code', e.target.value)} placeholder="e.g. PCC-C0001" /></Field>}
        <Field label="Asset / area *"><input className="wt-input" value={f.area} onChange={(e) => set('area', e.target.value)} placeholder="e.g. Rooftop AC unit, Front garden" /></Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Category"><select className="wt-input" value={f.category} onChange={(e) => set('category', e.target.value)}><option value="">—</option>{(ref_.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          <Field label="Condition"><select className="wt-input" value={f.condition} onChange={(e) => set('condition', e.target.value)}><option value="">—</option>{(ref_.conditions || []).map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Brand / model"><input className="wt-input" value={f.brand_model} onChange={(e) => set('brand_model', e.target.value)} /></Field>
          <Field label="Serial no."><input className="wt-input" value={f.serial_no} onChange={(e) => set('serial_no', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Last service"><input className="wt-input" type="date" value={f.last_service_date || ''} onChange={(e) => set('last_service_date', e.target.value)} /></Field>
          <Field label="Next service due"><input className="wt-input" type="date" value={f.next_service_due || ''} onChange={(e) => set('next_service_due', e.target.value)} /></Field>
          <Field label="Warranty expiry"><input className="wt-input" type="date" value={f.warranty_expiry || ''} onChange={(e) => set('warranty_expiry', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Responsible tech"><input className="wt-input" value={f.responsible_tech} onChange={(e) => set('responsible_tech', e.target.value)} /></Field>
          <Field label="Status"><select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.statuses || ['Active']).map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Maintenance requirement"><textarea className="wt-input" rows={2} value={f.maintenance_requirement} onChange={(e) => set('maintenance_requirement', e.target.value)} placeholder="e.g. Quarterly service; filter change every 3 months" /></Field>
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
