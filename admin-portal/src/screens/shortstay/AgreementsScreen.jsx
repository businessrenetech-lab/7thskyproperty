import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { FileSignature, Search } from 'lucide-react';
import api from '../../services/api';
import { Spinner, Drawer } from '../../ui/kit';
import { useToast } from '../../context/ToastContext';
import { AgreementCard, ScreenHead, fmtDate } from './common';

const signBase = () => `${window.location.origin}/admin/sign`;
const firstToken = (env) => {
  const signers = env?.signers || [];
  const pending = signers.find((s) => ['sent', 'pending', 'viewed'].includes(s.status)) || signers[0];
  return pending?.access_token || null;
};

// Shared owner/guest agreements screen — cards + full eSign wiring (reminder / copy link / audit / preview)
export default function AgreementsScreen({ endpoint, title, desc, statuses, emptyHint }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [audit, setAudit] = useState(null); // { envelope_id, code }
  const [auditData, setAuditData] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await api.get(endpoint); setRows(Array.isArray(res.data) ? res.data : []); }
    finally { setLoading(false); }
  }, [endpoint]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) => (status === 'all' || r.status === status)
    && (!q.trim() || r.title.toLowerCase().includes(q.trim().toLowerCase()) || (r.owner_name || r.guest_name || '').toLowerCase().includes(q.trim().toLowerCase()))), [rows, q, status]);

  const errMsg = (err) => err.response?.data?.error || err.message || 'Something went wrong';

  const sendReminder = async (item) => {
    if (!item.envelope_id) return toast.error('No envelope to remind on');
    setBusyId(item.id);
    try { await api.post(`/signing/envelopes/${item.envelope_id}/remind`); toast.success('Reminder sent to signers'); load(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusyId(null); }
  };
  const copyLink = async (item) => {
    if (!item.envelope_id) return toast.error('No signing link available');
    try {
      const res = await api.get(`/signing/envelopes/${item.envelope_id}`);
      const token = firstToken(res.data?.data);
      if (!token) return toast.error('No active signer link');
      const url = `${signBase()}/${token}`;
      try { await navigator.clipboard.writeText(url); toast.success('Signing link copied'); }
      catch { window.prompt('Copy signing link:', url); }
    } catch (err) { toast.error(errMsg(err)); }
  };
  const preview = async (item) => {
    if (!item.envelope_id) return toast.error('Nothing to preview');
    try {
      const res = await api.get(`/signing/envelopes/${item.envelope_id}`);
      const token = firstToken(res.data?.data);
      if (token) window.open(`${signBase()}/${token}`, '_blank', 'noopener');
      else toast.error('No signer document to preview');
    } catch (err) { toast.error(errMsg(err)); }
  };
  const openAudit = async (item) => {
    setAudit({ envelope_id: item.envelope_id, code: item.code }); setAuditData(null);
    if (!item.envelope_id) return;
    try { const res = await api.get(`/signing/envelopes/${item.envelope_id}`); setAuditData(res.data?.data || null); }
    catch { setAuditData(null); }
  };

  const cardActions = (item) => item.status === 'active' || item.status === 'completed' ? (
    <>
      <button className="pm-btn" style={b} onClick={() => preview(item)}>Preview</button>
      <button className="pm-btn" style={b} onClick={() => openAudit(item)}>View audit trail</button>
    </>
  ) : (
    <>
      <button className="pm-btn primary" style={b} disabled={busyId === item.id} onClick={() => sendReminder(item)}>{busyId === item.id ? 'Sending…' : 'Send reminder'}</button>
      <button className="pm-btn" style={b} onClick={() => copyLink(item)}>Copy signing link</button>
      <button className="pm-btn" style={b} onClick={() => openAudit(item)}>View audit trail</button>
    </>
  );

  if (loading) return <div style={{ padding: 48, textAlign: 'center' }}><Spinner /></div>;

  return (
    <div>
      <ScreenHead title={title} desc={desc} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 10, padding: '0 12px', background: 'var(--surface)' }}>
          <Search size={15} color="var(--muted)" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, signer or reference…" style={{ border: 0, outline: 0, background: 'transparent', padding: '9px 0', font: 'inherit', flex: 1, color: 'var(--ink)' }} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={sel}>
          <option value="all">Status · all</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}><FileSignature size={13} /> Signing runs on the portal's e-signing service</span>
      </div>

      {filtered.map((item) => <AgreementCard key={item.id} item={item} actions={cardActions(item)} />)}
      {!filtered.length && <div className="pm-card"><div className="pm-card-body" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>{emptyHint}</div></div>}

      {/* Audit trail drawer */}
      {audit && (
        <Drawer title={`Audit trail · ${audit.code}`} onClose={() => setAudit(null)}>
          {!auditData ? <div style={{ padding: 24, textAlign: 'center' }}><Spinner /></div> : (
            <div className="st-history">
              {(auditData.audit_logs || []).slice().sort((a, c) => new Date(c.created_at) - new Date(a.created_at)).map((ev) => (
                <div key={ev.id} className="st-history-row">
                  <span className="st-history-dot" />
                  <div>
                    <strong style={{ textTransform: 'capitalize' }}>{String(ev.event || '').replace(/_/g, ' ')}</strong>
                    <span>{ev.actor_email || 'system'}{ev.ip_address ? ` · ${ev.ip_address}` : ''}</span>
                  </div>
                  <time>{fmtDate(ev.created_at)}</time>
                </div>
              ))}
              {!(auditData.audit_logs || []).length && <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No audit events recorded yet.</div>}
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}
const b = { justifyContent: 'center', padding: '6px 10px', fontSize: 12 };
const sel = { border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', background: 'var(--surface)', font: 'inherit', color: 'var(--ink)', textTransform: 'capitalize' };
