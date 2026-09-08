import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, ShieldCheck, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  dateFmt, toast, errText, svcLabel,
} from './common';

/*
 * Verification Register — Property Documentation & Verification line only.
 *
 * Each verification check / government search with its finding and risk rating
 * (workbook Sheet 8 Government Search Register + Sheet 9 Verification Findings).
 * The one module the verification workflow needs beyond the shared spine. Scoped
 * to the line by the X-Service-Line header; the backend refuses lines without
 * verification_register.
 */
const RISK_TONE = { Clear: 'green', Low: 'blue', Medium: 'amber', High: 'red', Critical: 'red' };

export default function VerificationRegister() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ check_types: [], statuses: [], risk_levels: [], authorities: [] });
  const [summary, setSummary] = useState({ total: 0, by_status: {}, by_risk: {}, flagged: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [edit, setEdit] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-verifications', { params: { q: q || undefined, status: statusFilter || undefined, risk_level: riskFilter || undefined } }),
        api.get('/wt-verifications/reference'),
        api.get('/wt-verifications/summary'),
      ]);
      setRows(l.data || []); setRef(r.data || {}); setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q, statusFilter, riskFilter]);

  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete verification ${row.code}?`)) return;
    try { await api.delete(`/wt-verifications/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  return (
    <div className="wt-page">
      <WtHead title="Verification Register" subtitle={`${svcLabel()} — searches, findings & risk`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New verification</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Checks" value={summary.total} />
        <Chip label="Flagged (High/Critical)" value={summary.flagged} tone={summary.flagged ? 'red' : undefined} />
        {['Pending', 'In Progress', 'Completed'].map((s) => <Chip key={s} label={s} value={summary.by_status?.[s] || 0} />)}
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1, minWidth: 180 }} placeholder="Search check type, client, authority, reference, finding…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <select className="wt-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All statuses</option>{(ref.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="wt-input" value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="">All risk</option>{(ref.risk_levels || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="wt-btn sm" onClick={load}>Apply</button>
      </div>

      <div className="wt-card wt-tblcard">
        {rows.length ? (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 90 }}>Ref</th><th>Client</th><th>Check</th><th>Authority</th>
              <th style={{ width: 100 }}>Status</th><th style={{ width: 90 }}>Risk</th><th style={{ width: 84, textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="id">{r.code}</td>
                  <td><strong>{r.client_name}</strong><div className="muted" style={{ fontSize: 11 }}>{r.client_code}</div></td>
                  <td>{r.check_type}{r.reference_no ? <div className="muted" style={{ fontSize: 11 }}>#{r.reference_no}</div> : null}{r.finding ? <div className="muted" style={{ fontSize: 11, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.finding}</div> : null}</td>
                  <td>{r.authority || '—'}</td>
                  <td><Pill value={r.status} sm /></td>
                  <td><Pill value={r.risk_level} force={RISK_TONE[r.risk_level]} sm /></td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                    <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: 28 }}><EmptyState title="No verification checks" hint="Track deed, registry, land-office, mutation and encumbrance checks here." /></div>}
      </div>

      {edit && <VerifyDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
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

function VerifyDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', check_type: row.check_type || (ref_.check_types || [])[0] || 'Deed Verification',
    authority: row.authority || '', reference_no: row.reference_no || '', status: row.status || 'Pending',
    risk_level: row.risk_level || 'Clear', finding: row.finding || '', recommended_action: row.recommended_action || '', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-verifications', f);
      else await api.patch(`/wt-verifications/${row.id}`, f);
      toast.ok(isNew ? 'Verification created' : 'Updated');
      onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  return (
    <WtDrawer title={isNew ? 'New verification check' : `Verification ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Create' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && (
          <Field label="Client code *"><input className="wt-input" value={f.client_code} onChange={(e) => set('client_code', e.target.value)} placeholder="e.g. PDV-C0001" /></Field>
        )}
        <Field label="Check type">
          <select className="wt-input" value={f.check_type} onChange={(e) => set('check_type', e.target.value)}>
            {(ref_.check_types || []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Authority / office">
          <input className="wt-input" list="pdv-authorities" value={f.authority} onChange={(e) => set('authority', e.target.value)} />
          <datalist id="pdv-authorities">{(ref_.authorities || []).map((a) => <option key={a} value={a} />)}</datalist>
        </Field>
        <Field label="Reference / case no."><input className="wt-input" value={f.reference_no} onChange={(e) => set('reference_no', e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Status">
            <select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>{(ref_.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </Field>
          <Field label="Risk level">
            <select className="wt-input" value={f.risk_level} onChange={(e) => set('risk_level', e.target.value)}>{(ref_.risk_levels || []).map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </Field>
        </div>
        <Field label="Finding"><textarea className="wt-input" rows={3} value={f.finding} onChange={(e) => set('finding', e.target.value)} placeholder="e.g. RS Khatian matches the deed; no encumbrance found at the Sub-Registry." /></Field>
        <Field label="Recommended action"><textarea className="wt-input" rows={2} value={f.recommended_action} onChange={(e) => set('recommended_action', e.target.value)} placeholder="e.g. Proceed; obtain updated mutation before registration." /></Field>
        <Field label="Notes"><textarea className="wt-input" rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
