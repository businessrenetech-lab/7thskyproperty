import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, Landmark, X, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer,
  dateFmt, bdt, toast, errText, svcLabel, ClientLookupField,
} from './common';

/*
 * Loan Application Tracker — Loan & Financial Support line only.
 *
 * The loan service coordinates each application to a lender through to its
 * outcome (workbook Sheet 8 + banking liaison). This is the one module the loan
 * workflow needs beyond the shared project/work-order spine. Scoped to the line
 * by the X-Service-Line header; the backend refuses lines without loan_tracker.
 */
export default function LoanApplications() {
  const [rows, setRows] = useState([]);
  const [ref, setRef] = useState({ statuses: [], loan_types: [], lenders: [], purposes: [] });
  const [summary, setSummary] = useState({ total: 0, by_status: {}, pipeline_amount: 0, approved_amount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [edit, setEdit] = useState(null); // row being edited, or {} for new

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [l, r, s] = await Promise.all([
        api.get('/wt-loan-applications', { params: { q: q || undefined, status: statusFilter || undefined } }),
        api.get('/wt-loan-applications/reference'),
        api.get('/wt-loan-applications/summary'),
      ]);
      setRows(l.data || []);
      setRef(r.data || {});
      setSummary(s.data || {});
    } catch (e) { setError(errText(e)); }
    setLoading(false);
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const remove = async (row) => {
    if (!window.confirm(`Delete loan application ${row.code}?`)) return;
    try { await api.delete(`/wt-loan-applications/${row.id}`); toast.ok('Deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  if (loading) return <Loading />;

  return (
    <div className="wt-page">
      <WtHead title="Loan Applications" subtitle={`${svcLabel()} — application tracker & banking liaison`}>
        <button className="wt-btn ghost sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
        <button className="wt-btn sm" onClick={() => setEdit({})}><Plus size={14} /> New application</button>
      </WtHead>

      {error && <div className="wt-note" style={{ margin: '8px 0', background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>{error}</div>}

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '4px 0 12px' }}>
        <Chip label="Applications" value={summary.total} />
        <Chip label="Pipeline (BDT)" value={bdt(summary.pipeline_amount)} />
        <Chip label="Approved (BDT)" value={bdt(summary.approved_amount)} />
        {['Submitted', 'Under Review', 'Approved', 'Declined'].map((s) => (
          <Chip key={s} label={s} value={summary.by_status?.[s] || 0} />
        ))}
      </div>

      <div className="wt-card" style={{ padding: 12, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <Search size={15} style={{ color: 'var(--wt-muted)' }} />
        <input className="wt-input" style={{ flex: 1, minWidth: 180 }} placeholder="Search lender, client, loan type, outcome…"
          value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
        <select className="wt-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ maxWidth: 180 }}>
          <option value="">All statuses</option>
          {(ref.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="wt-btn sm" onClick={load}>Apply</button>
      </div>

      <div className="wt-card wt-tblcard">
        {rows.length ? (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 96 }}>Ref</th><th>Client</th><th>Lender</th><th>Loan type</th>
              <th style={{ textAlign: 'right', width: 120 }}>Amount</th><th style={{ width: 120 }}>Status</th>
              <th style={{ width: 110 }}>Applied</th><th style={{ width: 96, textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="id">{r.code}</td>
                  <td><strong>{r.client_name}</strong><div className="muted" style={{ fontSize: 11 }}>{r.client_code}</div></td>
                  <td>{r.lender || '—'}{r.relationship_manager ? <div className="muted" style={{ fontSize: 11 }}>{r.relationship_manager}</div> : null}</td>
                  <td>{r.loan_type || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{r.loan_amount ? bdt(r.loan_amount) : '—'}{r.approved_amount && Number(r.approved_amount) > 0 ? <div className="muted" style={{ fontSize: 11 }}>appr {bdt(r.approved_amount)}</div> : null}</td>
                  <td><Pill value={r.status} sm /></td>
                  <td>{r.application_date ? dateFmt(r.application_date) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="wt-btn ghost sm" onClick={() => setEdit(r)}><Pencil size={12} /></button>
                    <button className="wt-btn ghost sm" onClick={() => remove(r)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: 28 }}><EmptyState title="No loan applications" hint="Track each client's loan application to a lender here." /></div>}
      </div>

      {edit && <LoanDrawer row={edit} ref_={ref} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

const Chip = ({ label, value }) => (
  <div className="wt-card" style={{ padding: '8px 14px' }}>
    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{label}</div>
    <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
  </div>
);

// Module-level so inputs keep focus across the drawer's re-renders.
const Field = ({ label, children }) => (
  <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
);

function LoanDrawer({ row, ref_, onClose, onSaved }) {
  const isNew = !row.id;
  const [f, setF] = useState({
    client_code: row.client_code || '', client_name: row.client_name || '', lender: row.lender || '', relationship_manager: row.relationship_manager || '',
    loan_type: row.loan_type || '', purpose: row.purpose || '', loan_amount: row.loan_amount || '',
    approved_amount: row.approved_amount || '', interest_rate: row.interest_rate || '',
    application_date: row.application_date || '', decision_date: row.decision_date || '',
    status: row.status || 'Enquiry', outcome: row.outcome || '', notes: row.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((c) => ({ ...c, [k]: v }));

  const save = async () => {
    if (isNew && !f.client_code.trim()) { toast.err('Client code is required'); return; }
    setBusy(true);
    try {
      if (isNew) await api.post('/wt-loan-applications', f);
      else await api.patch(`/wt-loan-applications/${row.id}`, f);
      toast.ok(isNew ? 'Loan application created' : 'Updated');
      onSaved();
    } catch (e) { toast.err(errText(e)); }
    setBusy(false);
  };

  const Field = ({ label, children }) => (
    <div><div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{label}</div>{children}</div>
  );

  return (
    <WtDrawer title={isNew ? 'New loan application' : `Loan application ${row.code}`} onClose={onClose}
      footer={<button className="wt-btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : (isNew ? 'Create' : 'Save changes')}</button>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isNew && (
          <Field label="Client *">
            <ClientLookupField value={f.client_code} picked={f.client_name} autoFocus onPick={(c) => setF((s) => ({ ...s, client_code: c ? c.code : '', client_name: c ? c.name : '' }))} />
          </Field>
        )}
        <Field label="Lender / Bank">
          <input className="wt-input" list="lfs-lenders" value={f.lender} onChange={(e) => set('lender', e.target.value)} />
          <datalist id="lfs-lenders">{(ref_.lenders || []).map((l) => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Relationship manager (banking liaison)">
          <input className="wt-input" value={f.relationship_manager} onChange={(e) => set('relationship_manager', e.target.value)} />
        </Field>
        <Field label="Loan type">
          <input className="wt-input" list="lfs-loan-types" value={f.loan_type} onChange={(e) => set('loan_type', e.target.value)} />
          <datalist id="lfs-loan-types">{(ref_.loan_types || []).map((l) => <option key={l} value={l} />)}</datalist>
        </Field>
        <Field label="Purpose">
          <select className="wt-input" value={f.purpose} onChange={(e) => set('purpose', e.target.value)}>
            <option value="">—</option>{(ref_.purposes || []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Requested amount (BDT)"><input className="wt-input" type="number" value={f.loan_amount} onChange={(e) => set('loan_amount', e.target.value)} /></Field>
          <Field label="Approved amount (BDT)"><input className="wt-input" type="number" value={f.approved_amount} onChange={(e) => set('approved_amount', e.target.value)} /></Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Interest rate (%)"><input className="wt-input" type="number" step="0.01" value={f.interest_rate} onChange={(e) => set('interest_rate', e.target.value)} /></Field>
          <Field label="Status">
            <select className="wt-input" value={f.status} onChange={(e) => set('status', e.target.value)}>
              {(ref_.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Application date"><input className="wt-input" type="date" value={f.application_date || ''} onChange={(e) => set('application_date', e.target.value)} /></Field>
          <Field label="Decision date"><input className="wt-input" type="date" value={f.decision_date || ''} onChange={(e) => set('decision_date', e.target.value)} /></Field>
        </div>
        <Field label="Outcome"><input className="wt-input" value={f.outcome} onChange={(e) => set('outcome', e.target.value)} placeholder="e.g. Approved subject to valuation" /></Field>
        <Field label="Notes"><textarea className="wt-input" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
      </div>
    </WtDrawer>
  );
}
