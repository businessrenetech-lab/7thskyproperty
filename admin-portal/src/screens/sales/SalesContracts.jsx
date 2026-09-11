// admin-portal/src/screens/sales/SalesContracts.jsx
//
// Residential-sales Contracts home over the RPPS/RPSS signing envelopes.
// Buckets (awaiting / expiring / expired / completed / declined-voided) with
// remind / void / copy-link / open / vary actions. Data from
// GET /sales-agreements/contracts; actions reuse the signing endpoints.
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Ban, Copy, Eye, GitBranch } from 'lucide-react';
import api from '../../services/api';
import { Spinner } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';

const SECTIONS = [
  ['awaiting_signature', 'Awaiting signature', 'warn'],
  ['expiring_soon', 'Expiring soon', 'warn'],
  ['expired', 'Expired', 'bad'],
  ['completed', 'Completed', 'good'],
  ['declined_voided', 'Declined / voided', 'grey'],
];

export default function SalesContracts() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const kind = params.get('kind') || '';
  const search = params.get('search') || '';
  const setParam = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(); if (kind) q.set('kind', kind); if (search) q.set('search', search);
      const r = await api.get(`/sales-agreements/contracts${q.toString() ? `?${q}` : ''}`);
      setData(r.data);
    } catch { toast.error('Failed to load contracts'); } finally { setLoading(false); }
  }, [kind, search, toast]);
  useEffect(() => { load(); }, [load]);

  const remind = async (it) => { try { await api.post(`/signing/envelopes/${it.id}/remind`); toast.success('Reminder sent'); } catch (e) { toast.error(e.response?.data?.error || 'Could not remind'); } };
  const voidIt = async (it) => {
    const reason = window.prompt('Reason for voiding this agreement?'); if (!reason) return;
    try { await api.post(`/signing/envelopes/${it.id}/void`, { reason }); toast.success('Agreement voided'); load(); } catch (e) { toast.error(e.response?.data?.error || 'Could not void'); }
  };
  const copyLink = async (it) => {
    try { const r = await api.get(`/signing/envelopes/${it.id}`); const signers = r.data?.data?.signers || []; const s = signers.find((x) => ['sent', 'viewed', 'pending'].includes(x.status)) || signers[0];
      if (!s?.access_token) return toast.error('No active signing link'); const url = `${window.location.origin}/admin/sign/${s.access_token}`;
      try { await navigator.clipboard.writeText(url); toast.success('Signing link copied'); } catch { window.prompt('Signing link:', url); }
    } catch { toast.error('Could not fetch link'); }
  };
  const openDoc = (it) => { const url = it.final_pdf_url || it.certificate_url; if (url) window.open(url, '_blank'); else copyLink(it); };
  const vary = async (it) => {
    try { const r = await api.post(`/sales-agreements/contracts/${it.id}/variation`); toast.success('Original voided — complete the variation'); navigate(`/residential/agreements/${r.data.kind}`, { state: { prefill: r.data.prefill } }); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not start variation'); }
  };

  const chip = (s) => ({ completed: 'good', sent: 'warn', viewed: 'info', partially_signed: 'warn', declined: 'bad', voided: 'grey', expired: 'bad', draft: 'grey' }[s] || 'grey');
  const expiryText = (it) => it.days_to_expiry == null ? '' : it.days_to_expiry < 0 ? `${-it.days_to_expiry}d overdue` : `in ${it.days_to_expiry}d`;

  const actionsFor = (key, it) => {
    const open = key === 'awaiting_signature' || key === 'expiring_soon';
    const btn = (fn, Icon, label) => <button key={label} className="pm-btn" style={{ padding: '4px 9px', fontSize: 12 }} onClick={() => fn(it)}><Icon size={13} /> {label}</button>;
    const out = [];
    if (open) { out.push(btn(remind, Bell, 'Remind'), btn(copyLink, Copy, 'Link'), btn(voidIt, Ban, 'Void')); }
    if (key === 'expired') { out.push(btn(voidIt, Ban, 'Void'), btn(vary, GitBranch, 'Vary')); }
    if (key === 'completed') { out.push(btn(openDoc, Eye, 'Open'), btn(vary, GitBranch, 'Vary')); }
    if (key === 'declined_voided') { out.push(btn(vary, GitBranch, 'Vary')); }
    return <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>{out}</div>;
  };

  return (
    <div className="pm-scope">
      <div className="pm-head">
        <div><div className="pm-eyebrow">Contracts</div><h1>Sales Contracts</h1><div className="pm-meta">Every purchase and sale service agreement — status, reminders, expiry and variations.</div></div>
      </div>
      <div className="pm-card" style={{ marginBottom: 16 }}><div className="pm-card-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 14 }}>
        <div className="pm-segment">
          {[['', 'All'], ['purchase', 'Purchase'], ['sale', 'Sale']].map(([v, l]) => <button key={v} className={`pm-seg-btn ${kind === v ? 'active' : ''}`} onClick={() => setParam('kind', v)}>{l}</button>)}
        </div>
        <input placeholder="Search code / title…" defaultValue={search} onKeyDown={(e) => { if (e.key === 'Enter') setParam('search', e.target.value); }} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', font: 'inherit', minWidth: 200 }} />
      </div></div>

      {loading ? <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div> : !data ? null : (
        SECTIONS.map(([key, label]) => {
          const rows = data.buckets[key] || [];
          if (!rows.length) return null;
          return (
            <div className="pm-card" key={key} style={{ marginBottom: 14 }}>
              <div className="pm-card-body" style={{ padding: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>{label}</h3><span className="pm-chip grey"><span className="d" />{rows.length}</span>
                </div>
                <table className="pm-tbl">
                  <thead><tr><th>Reference</th><th>Kind</th><th>Party</th><th>Status</th><th>Expiry</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                  <tbody>
                    {rows.map((it) => (
                      <tr key={it.id}>
                        <td><strong style={{ color: 'var(--navy)' }}>{it.envelope_code}</strong></td>
                        <td><span className={`pm-chip ${it.kind === 'sale' ? 'warn' : 'info'}`}><span className="d" />{it.kind}</span></td>
                        <td>{it.party_name || '—'}<div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{it.party_email || ''}</div></td>
                        <td><span className={`pm-chip ${chip(it.status)}`}><span className="d" />{it.status}</span>{it.voided_reason ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>{it.voided_reason}</div> : null}</td>
                        <td>{it.completed_at ? '—' : expiryText(it)}</td>
                        <td>{actionsFor(key, it)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
      {!loading && data && Object.values(data.counts || {}).every((n) => !n) && (
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No sales agreements yet. Create one from Purchase or Sale Agreements.</div></div>
      )}
    </div>
  );
}
