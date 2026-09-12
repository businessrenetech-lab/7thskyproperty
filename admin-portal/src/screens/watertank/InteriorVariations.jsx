import React, { useState, useEffect, useCallback } from 'react';
import { FileSignature, Plus, Check, X, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { bdt, toast, errText } from './common';

/*
 * Interior Design — Variation Requests. A re-priced, client-approved change to an
 * in-flight project (added scope, changed layout/materials/furniture). Talks to
 * /api/interior-variations; the service line is set from the route by api.js.
 */
const chip = (s) => ({ approved: 'green', rejected: 'red', sent: 'amber', draft: 'slate' }[s] || 'slate');
const blank = { project_id: '', work_order_code: '', client_name: '', description: '', reason: '', amount_delta: '', timeline_impact: '' };

export default function InteriorVariations() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed, {} = new
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/interior-variations'); setRows(data.data || []); }
    catch (e) { toast.err(errText(e, 'Could not load variations')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.description || !Number(form.amount_delta)) { toast.err('Enter a description and a price change.'); return; }
    setBusy(true);
    try {
      await api.post('/interior-variations', { ...form, amount_delta: Number(form.amount_delta) });
      toast.ok('Variation created'); setForm(null); load();
    } catch (e) { toast.err(errText(e, 'Could not create the variation')); }
    finally { setBusy(false); }
  };

  const decide = async (code, decision) => {
    try { await api.post(`/interior-variations/${code}/decision`, { decision }); toast.ok(`Variation ${decision}`); load(); }
    catch (e) { toast.err(errText(e, 'Could not update the variation')); }
  };

  return (
    <div className="wt-scope" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}><FileSignature size={20} /> Variation Requests</h1>
          <p className="muted" style={{ margin: '4px 0 0' }}>Re-priced, client-approved changes to an in-flight project.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wt-btn" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'wt-spin' : ''} /> Refresh</button>
          <button className="wt-btn primary" onClick={() => setForm({ ...blank })}><Plus size={14} /> New variation</button>
        </div>
      </div>

      {form && (
        <div className="wt-card" style={{ padding: 18, marginBottom: 16, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <label>Project ID<input className="wt-input" value={form.project_id} onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value }))} placeholder="RIDS-P0001" /></label>
          <label>Work Order (optional)<input className="wt-input" value={form.work_order_code} onChange={(e) => setForm((f) => ({ ...f, work_order_code: e.target.value }))} /></label>
          <label>Client<input className="wt-input" value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} /></label>
          <label>Price change (BDT) *<input className="wt-input" type="number" value={form.amount_delta} onChange={(e) => setForm((f) => ({ ...f, amount_delta: e.target.value }))} /></label>
          <label>Timeline impact<input className="wt-input" value={form.timeline_impact} onChange={(e) => setForm((f) => ({ ...f, timeline_impact: e.target.value }))} placeholder="e.g. +5 days" /></label>
          <label style={{ gridColumn: '1 / -1' }}>Description *<textarea className="wt-input" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></label>
          <label style={{ gridColumn: '1 / -1' }}>Reason<input className="wt-input" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="wt-btn" onClick={() => setForm(null)}>Cancel</button>
            <button className="wt-btn primary" onClick={save} disabled={busy}>Save variation</button>
          </div>
        </div>
      )}

      <div className="wt-card" style={{ padding: 0 }}>
        <table className="wt-tbl">
          <thead><tr><th>Code</th><th>Project</th><th>Description</th><th style={{ textAlign: 'right' }}>Price change</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variation_code}>
                <td><strong>{r.variation_code}</strong></td>
                <td>{r.project_id || '—'}{r.client_name ? <div className="muted" style={{ fontSize: 12 }}>{r.client_name}</div> : null}</td>
                <td style={{ maxWidth: 320 }}>{r.description}{r.timeline_impact ? <div className="muted" style={{ fontSize: 12 }}>Timeline: {r.timeline_impact}</div> : null}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.amount_delta)}</td>
                <td><span className={`wt-pill ${chip(r.status)}`}>{r.status}</span></td>
                <td style={{ textAlign: 'right' }}>
                  {['draft', 'sent'].includes(r.status) && (
                    <>
                      <button className="wt-btn sm" onClick={() => decide(r.variation_code, 'approved')}><Check size={13} /> Approve</button>
                      <button className="wt-btn sm" onClick={() => decide(r.variation_code, 'rejected')} style={{ marginLeft: 6 }}><X size={13} /> Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'var(--wt-muted, #64748b)' }}>No variations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
