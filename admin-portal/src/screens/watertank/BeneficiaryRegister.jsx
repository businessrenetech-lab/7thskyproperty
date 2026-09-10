import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, Users, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  toast, errText, svcLabel, ClientLookupField,
} from './common';

/*
 * Beneficiary / Heirs Register — Property Will & Succession Support line only.
 *
 * Each beneficiary / legal heir of a client's estate with relationship, share and
 * entitlement (workbook Sheet 3 Beneficiaries + Sheet 7 Beneficiary Documents).
 * The one module the will/succession workflow needs beyond the shared spine. Scoped
 * to the line by the X-Service-Line header; the backend refuses lines without
 * beneficiary_register.
 */
export default function BeneficiaryRegister() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ relationships: [], statuses: [] });
  const [summary, setSummary] = useState({ total: 0, by_status: {}, disputed: 0, share_by_client: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-beneficiaries', { params: { q: q || undefined, status: statusFilter || undefined } }),
        api.get('/wt-beneficiaries/reference'),
        api.get('/wt-beneficiaries/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete beneficiary ${row.beneficiary_name} (${row.code})?`)) return;
    try { await api.delete(`/wt-beneficiaries/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  // group rows by client for an organised, estate-by-estate view
  const groups = [];
  rows.forEach((r) => {
    let g = groups.find((x) => x.client_code === r.client_code);
    if (!g) { g = { client_code: r.client_code, client_name: r.client_name, items: [] }; groups.push(g); }
    g.items.push(r);
  });

  return (
    <div className="wt-page">
      <WtHead title="Beneficiary Register" subtitle={`${svcLabel()} — heirs, shares & entitlements`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New beneficiary</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Beneficiaries" value={summary.total} />
        <Chip label="Disputed" value={summary.disputed} tone={summary.disputed ? 'red' : undefined} />
        {['Identified', 'Documented', 'Consented', 'Settled'].map((s) => <Chip key={s} label={s} value={summary.by_status?.[s] || 0} />)}
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1, minWidth: 180 }} placeholder="Search beneficiary, client, relationship, NID, entitlement…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <select className="wt-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">All statuses</option>{(ref.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="wt-btn sm" onClick={load}>Apply</button>
      </div>

      {groups.length ? groups.map((g) => {
        const share = summary.share_by_client?.[g.client_code];
        const shareOff = share != null && Math.abs(Number(share) - 100) > 0.01 && Number(share) > 0;
        return (
          <div key={g.client_code} className="wt-card wt-tblcard" style={{ marginBottom: 12 }}>
            <div style={{ padding: '12px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="wt-sec-title">{g.client_name} <span className="muted" style={{ fontWeight: 400 }}>· {g.client_code} · {g.items.length} beneficiary(ies)</span></div>
              {share != null && share > 0 && (
                <span className="wt-pill sm" style={shareOff ? { background: '#fef3c7', color: '#92400e' } : {}}>Shares total {Number(share)}%{shareOff ? ' ⚠' : ''}</span>
              )}
            </div>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 84 }}>Ref</th><th>Beneficiary</th><th>Relationship</th>
                <th style={{ width: 80, textAlign: 'right' }}>Share</th><th>Entitlement</th>
                <th style={{ width: 110 }}>Status</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th>
              </tr></thead>
              <tbody>
                {g.items.map((r) => (
                  <tr key={r.id}>
                    <td className="id">{r.code}</td>
                    <td><strong>{r.beneficiary_name}</strong>{r.nid_passport ? <div className="muted" style={{ fontSize: 11 }}>{r.nid_passport}</div> : null}</td>
                    <td>{r.relationship || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{r.share_percent != null && Number(r.share_percent) > 0 ? `${Number(r.share_percent)}%` : '—'}</td>
                    <td className="muted" style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.entitlement || '—'}</td>
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
        );
      }) : <div className="wt-card" style={{ padding: 28 }}><EmptyState title="No beneficiaries" hint="Record each client's beneficiaries / legal heirs and their shares here." /></div>}

      {edit && <BenDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const Chip = ({ label, value, tone }) => (
  <div className="wt-card" style={{ padding: '8px 14px' }}>
    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15, color: tone === 'red' ? '#b91c1c' : undefined }}>{value}</div>
  </div>
);

const Field = ({ label, children }) => (
  <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function BenDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', client_name: row.client_name || '', beneficiary_name: row.beneficiary_name || '', relationship: row.relationship || '',
    nid_passport: row.nid_passport || '', contact: row.contact || '', share_percent: row.share_percent || '',
    entitlement: row.entitlement || '', status: row.status || 'Identified', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    if (!f.beneficiary_name.trim()) { toast.err('Beneficiary name is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-beneficiaries', f);
      else await api.patch(`/wt-beneficiaries/${row.id}`, f);
      toast.ok(isNew ? 'Beneficiary added' : 'Updated');
      onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={isNew ? 'New beneficiary' : `Beneficiary ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Add beneficiary' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && <Field label="Client *"><ClientLookupField value={f.client_code} picked={f.client_name} autoFocus onPick={(c) => setF((s) => ({ ...s, client_code: c ? c.code : '', client_name: c ? c.name : '' }))} /></Field>}
        <Field label="Beneficiary name *"><input className="wt-input" value={f.beneficiary_name} onChange={(e) => set('beneficiary_name', e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Relationship">
            <select className="wt-input" value={f.relationship} onChange={(e) => set('relationship', e.target.value)}>
              <option value="">—</option>{(ref_.relationships || []).map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Share (%)"><input className="wt-input" type="number" step="0.01" value={f.share_percent} onChange={(e) => set('share_percent', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="NID / Passport"><input className="wt-input" value={f.nid_passport} onChange={(e) => set('nid_passport', e.target.value)} /></Field>
          <Field label="Contact"><input className="wt-input" value={f.contact} onChange={(e) => set('contact', e.target.value)} /></Field>
        </div>
        <Field label="Status">
          <select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
        </Field>
        <Field label="Entitlement"><textarea className="wt-input" rows={2} value={f.entitlement} onChange={(e) => set('entitlement', e.target.value)} placeholder="e.g. 1/3 share of the Dhanmondi apartment and the Gazipur land." /></Field>
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
