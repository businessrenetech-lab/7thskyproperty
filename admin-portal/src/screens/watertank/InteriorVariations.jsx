import React, { useState, useEffect, useCallback } from 'react';
import { FileSignature, Plus, Check, X, RefreshCw, Send } from 'lucide-react';
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
    try { const { data } = await api.post(`/interior-variations/${code}/decision`, { decision }); toast.ok(decision === 'approved' && data.invoice_code ? `Approved — invoice ${data.invoice_code} drafted` : `Variation ${decision}`); load(); }
    catch (e) { toast.err(errText(e, 'Could not update the variation')); }
  };

  const send = async (code) => {
    try { const { data } = await api.post(`/interior-variations/${code}/send`); toast.ok(data.message || 'Sent for approval'); load(); }
    catch (e) { toast.err(errText(e, 'Could not send the variation')); }
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
          <div style={{ gridColumn: '1 / -1' }}>
            <ProjectClientPicker form={form} setForm={setForm} />
          </div>
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
          <thead><tr><th>Code</th><th>Project</th><th>Description</th><th style={{ textAlign: 'right' }}>Price change</th><th>Status</th><th>Invoice</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.variation_code}>
                <td><strong>{r.variation_code}</strong></td>
                <td>{r.project_id || '—'}{r.client_name ? <div className="muted" style={{ fontSize: 12 }}>{r.client_name}</div> : null}</td>
                <td style={{ maxWidth: 320 }}>{r.description}{r.timeline_impact ? <div className="muted" style={{ fontSize: 12 }}>Timeline: {r.timeline_impact}</div> : null}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.amount_delta)}</td>
                <td><span className={`wt-pill ${chip(r.status)}`}>{r.status}</span>{r.status === 'sent' && r.sent_at ? <div className="muted" style={{ fontSize: 11 }}>awaiting client</div> : null}</td>
                <td>{r.invoice_code ? <span className="wt-pill green">{r.invoice_code}</span> : <span className="muted" style={{ fontSize: 12 }}>—</span>}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {['draft', 'sent'].includes(r.status) && (
                    <>
                      {r.status === 'draft' && <button className="wt-btn sm" onClick={() => send(r.variation_code)}><Send size={13} /> Send for approval</button>}
                      <button className="wt-btn sm" onClick={() => decide(r.variation_code, 'approved')} style={{ marginLeft: 6 }}><Check size={13} /> Approve</button>
                      <button className="wt-btn sm" onClick={() => decide(r.variation_code, 'rejected')} style={{ marginLeft: 6 }}><X size={13} /> Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 28, color: 'var(--wt-muted, #64748b)' }}>No variations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/*
 * Linked search for the variation form: type a client name / phone / email (or a
 * project name / code) and pick a client; their projects and work orders are then
 * fetched so project_id and work_order_code are chosen from real records instead
 * of typed by hand. Everything is scoped to the interior line by the route header.
 */
function ProjectClientPicker({ form, setForm }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [openList, setOpenList] = useState(false);
  const [projects, setProjects] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);

  // Debounced client/project search (name · phone · email · code).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return undefined; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/wt-clients/lookup', { params: { q: term } });
        setHits(data?.water_tank || []);
        setOpenList(true);
      } catch { setHits([]); }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  // When a client is chosen, fetch their projects + work orders to pick from.
  const loadForClient = useCallback(async (name) => {
    try {
      const { data: projData } = await api.get('/wt-projects', { params: { q: name } });
      const projList = (Array.isArray(projData) ? projData : projData?.data || []).filter((p) => (p.client_name || '') === name);
      setProjects(projList);
    } catch { setProjects([]); }
    try {
      const { data: woData } = await api.get('/wt-work-orders');
      setWorkOrders((woData?.rows || []).filter((w) => (w.client_name || '') === name));
    } catch { setWorkOrders([]); }
  }, []);

  const pickClient = (c) => {
    setForm((f) => ({ ...f, client_name: c.name, project_id: '', work_order_code: '' }));
    setQ(''); setHits([]); setOpenList(false);
    loadForClient(c.name);
  };
  const clearClient = () => { setForm((f) => ({ ...f, client_name: '', project_id: '', work_order_code: '' })); setProjects([]); setWorkOrders([]); };

  const woForProject = form.project_id ? workOrders.filter((w) => (w.project_id || '') === form.project_id) : workOrders;

  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
        <label style={{ display: 'block' }}>Client
          {form.client_name ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="wt-pill">{form.client_name}</span>
              <button type="button" className="wt-btn sm" onClick={clearClient}>Change</button>
            </div>
          ) : (
            <input className="wt-input" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => hits.length && setOpenList(true)}
              placeholder="Search client by name, phone or email…" autoComplete="off" />
          )}
        </label>
        {openList && !form.client_name && hits.length > 0 && (
          <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, background: 'var(--wt-card, #fff)', border: '1px solid var(--wt-line, #e2e8f0)', borderRadius: 8, marginTop: 2, maxHeight: 240, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,.08)' }}>
            {hits.map((c) => (
              <button key={c.id} type="button" onClick={() => pickClient(c)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>
                <strong>{c.name}</strong>{c.code ? <span className="muted"> · {c.code}</span> : null}
                <div className="muted" style={{ fontSize: 11.5 }}>{[c.mobile, c.email].filter(Boolean).join(' · ') || c.service_address || ''}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <label>Project
        <select className="wt-input" value={form.project_id} disabled={!form.client_name}
          onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, work_order_code: '' }))}>
          <option value="">{form.client_name ? (projects.length ? 'Select a project…' : 'No projects for this client') : 'Pick a client first'}</option>
          {projects.map((p) => <option key={p.code} value={p.code}>{p.code}{p.name ? ` — ${p.name}` : ''}</option>)}
        </select>
      </label>

      <label>Work Order (optional)
        <select className="wt-input" value={form.work_order_code} disabled={!form.client_name}
          onChange={(e) => setForm((f) => ({ ...f, work_order_code: e.target.value }))}>
          <option value="">{form.client_name ? (woForProject.length ? 'Select a work order…' : 'No work orders') : 'Pick a client first'}</option>
          {woForProject.map((w) => <option key={w.code} value={w.code}>{w.code}{w.title ? ` — ${w.title}` : ''}</option>)}
        </select>
      </label>
    </div>
  );
}
