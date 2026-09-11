// admin-portal/src/screens/sales/SalesInbox.jsx
//
// Residential-sales inbox: conversation list + thread, with explicit
// participants, per-message internal/client visibility, and per-thread
// assignment. Drives /api/sales/inbox; the rental inbox is separate.
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { PageHead, Spinner, Button, Badge } from '../../ui/kit';
import { Combo } from '../../ui/pickers';

const sel = { border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', font: 'inherit', width: '100%' };
const DELIVERY_TONE = { sent: 'green', simulated: 'grey', failed: 'red', suppressed: 'amber', pending: 'grey' };

export default function SalesInbox() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // thread key
  const [thread, setThread] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [reply, setReply] = useState('');
  const [visibility, setVisibility] = useState('client');
  const [channel, setChannel] = useState('email');
  const [newPart, setNewPart] = useState({ contact_id: null, role: 'buyer' });
  const [templates, setTemplates] = useState([]);
  const [subject, setSubject] = useState('');

  const q = params.get('q') || ''; const status = params.get('status') || ''; const mine = params.get('mine') === '1';
  const setParam = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams(); if (q) p.set('q', q); if (status) p.set('status', status); if (mine) p.set('mine', '1');
      const r = await api.get(`/sales/inbox${p.toString() ? `?${p}` : ''}`);
      setList(r.data.data || []);
    } catch { toast.error('Failed to load the inbox'); } finally { setLoading(false); }
  }, [q, status, mine, toast]);
  useEffect(() => { load(); }, [load]);

  const openThread = useCallback(async (key) => {
    setActive(key); setThread(null);
    try {
      const [t, pr] = await Promise.all([
        api.get(`/sales/inbox/thread?key=${encodeURIComponent(key)}`),
        api.get(`/sales/inbox/${encodeURIComponent(key)}/participants`),
      ]);
      setThread(t.data.data); setParticipants(pr.data.data || []);
    } catch { toast.error('Failed to open the conversation'); }
  }, [toast]);

  // Templates for the current channel (refetched when channel changes).
  useEffect(() => {
    api.get(`/message-templates?scope=sales&channel=${channel}`).then((r) => setTemplates(r.data.data || [])).catch(() => setTemplates([]));
  }, [channel]);
  const renderTpl = (str) => {
    const ctx = { contact_name: thread?.context?.name || '', property: thread?.context?.property?.title || '', property_code: thread?.context?.property?.property_code || '', agent: 'Seventh Sky' };
    return String(str || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] != null ? ctx[k] : ''));
  };
  const applyTemplate = (id) => {
    const t = templates.find((x) => String(x.id) === String(id)); if (!t) return;
    setReply(renderTpl(t.body)); if (t.subject) setSubject(renderTpl(t.subject));
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      const r = await api.post('/sales/inbox/reply', { key: active, channel, subject, body: reply, visibility });
      toast.success(`Delivery: ${r.data.delivery}`);
      setReply(''); setSubject(''); openThread(active); load();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
  };
  const sequenceAction = async (action) => {
    const id = thread?.context?.enquiry?.id; if (!id) return;
    try { await api.post(`/sales/enquiries/${id}/sequence/${action}`); toast.success(`Sequence ${action}`); openThread(active); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not update the sequence'); }
  };
  const addParticipant = async () => {
    if (!newPart.contact_id) return;
    try { await api.post(`/sales/inbox/${encodeURIComponent(active)}/participants`, newPart); setNewPart({ contact_id: null, role: 'buyer' }); openThread(active); load(); }
    catch { toast.error('Could not add participant'); }
  };
  const removeParticipant = async (id) => { try { await api.delete(`/sales/inbox/participants/${id}`); openThread(active); load(); } catch { toast.error('Could not remove'); } };
  const assign = async (uid) => { try { await api.post(`/sales/inbox/${encodeURIComponent(active)}/assign`, { assigned_to: uid || null }); toast.success('Assigned'); load(); } catch { toast.error('Could not assign'); } };

  return (
    <div className="pm-scope">
      <PageHead title="Sales Inbox" desc="Buyer & seller conversations — participants, internal notes and assignment." actions={<Button variant="ghost" icon={RefreshCw} onClick={load}>Refresh</Button>} />
      <div className="pm-card" style={{ marginBottom: 12 }}><div className="pm-card-body" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: 12 }}>
        <input placeholder="Search…" defaultValue={q} onKeyDown={(e) => { if (e.key === 'Enter') setParam('q', e.target.value); }} style={{ ...sel, width: 200 }} />
        <select value={status} onChange={(e) => setParam('status', e.target.value)} style={{ ...sel, width: 'auto' }}><option value="">All stages</option>{['new', 'contacted', 'viewing_scheduled', 'viewed', 'offer_made', 'converted', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}><input type="checkbox" checked={mine} onChange={(e) => setParam('mine', e.target.checked ? '1' : '')} /> Assigned to me</label>
      </div></div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 12, alignItems: 'start' }}>
        {/* Conversation list */}
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 0, maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? <div style={{ padding: 24 }}><Spinner /></div> : list.length === 0 ? <div style={{ padding: 24, color: 'var(--muted)' }}>No conversations.</div> : list.map((it) => (
            <button key={it.key} onClick={() => openThread(it.key)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--line)', background: active === it.key ? 'var(--primary-50,#eff6ff)' : 'transparent', padding: '10px 12px', cursor: 'pointer', font: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong style={{ fontSize: 13 }}>{it.title}</strong>
                {it.unread && <span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--primary,#2563eb)' }} />}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.subtitle}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{it.snippet}</div>
              <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                {it.status && <Badge tone="grey">{it.status}</Badge>}
                {it.needs_reply && <Badge tone="amber">Needs reply</Badge>}
                {it.participants?.length > 0 && <Badge tone="blue">{it.participants.length} party</Badge>}
                {it.assigned_to && <Badge tone="green">assigned</Badge>}
              </div>
            </button>
          ))}
        </div></div>

        {/* Thread */}
        <div className="pm-card"><div className="pm-card-body" style={{ padding: 16 }}>
          {!active ? <div style={{ color: 'var(--muted)' }}>Select a conversation.</div> : !thread ? <Spinner /> : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ margin: 0 }}>{thread.context?.name || active}</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Assign:</span>
                  <Combo endpoint="/users" labelFn={(u) => u.name || u.email} value={null} onChange={(v) => assign(v)} placeholder="Assignee…" />
                </div>
              </div>

              {/* Attribution + follow-up sequence (sales enquiries only) */}
              {thread.context?.kind === 'sales_enquiry' && (() => {
                const enq = thread.context.enquiry || {};
                const seqStatus = enq.sequence_status;
                const seqTone = { active: 'green', paused: 'amber', completed: 'blue', stopped: 'grey' }[seqStatus] || 'grey';
                return (
                  <div style={{ margin: '8px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {enq.utm_source && <Badge tone="grey">Source: {enq.utm_source}</Badge>}
                    {enq.utm_campaign && <Badge tone="grey">Campaign: {enq.utm_campaign}</Badge>}
                    {seqStatus ? (
                      <>
                        <Badge tone={seqTone}>Sequence: {seqStatus}</Badge>
                        {seqStatus === 'active' && <Button size="sm" variant="ghost" onClick={() => sequenceAction('pause')}>Pause</Button>}
                        {seqStatus === 'paused' && <Button size="sm" variant="ghost" onClick={() => sequenceAction('resume')}>Resume</Button>}
                        {(seqStatus === 'active' || seqStatus === 'paused') && <Button size="sm" variant="ghost" onClick={() => sequenceAction('stop')}>Stop</Button>}
                      </>
                    ) : <span style={{ fontSize: 12, color: 'var(--muted)' }}>No follow-up sequence</span>}
                  </div>
                );
              })()}

              {/* Participants */}
              <div style={{ margin: '10px 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {participants.map((p) => <Badge key={p.id} tone="blue">{p.role}{p.contact_id ? ` · #${p.contact_id}` : ''} <span onClick={() => removeParticipant(p.id)} style={{ cursor: 'pointer' }}>✕</span></Badge>)}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 180 }}><Combo endpoint="/contacts" labelFn={(c) => c.full_name} value={newPart.contact_id} onChange={(v) => setNewPart({ ...newPart, contact_id: v })} placeholder="Add participant…" /></div>
                  <select value={newPart.role} onChange={(e) => setNewPart({ ...newPart, role: e.target.value })} style={{ ...sel, width: 'auto' }}>{['buyer', 'seller', 'agent', 'solicitor', 'other'].map((r) => <option key={r} value={r}>{r}</option>)}</select>
                  <Button size="sm" variant="ghost" icon={UserPlus} onClick={addParticipant}>Add</Button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '42vh', overflowY: 'auto', padding: '8px 0' }}>
                {thread.messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start', maxWidth: '80%', border: '1px solid var(--line)', borderRadius: 10, padding: '8px 12px', background: m.direction === 'outbound' ? 'var(--primary-50,#eff6ff)' : 'var(--card,#fff)', opacity: m.visibility === 'internal' ? 0.85 : 1 }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span>{m.channel} · {m.direction}</span>
                      {m.visibility === 'internal' && <Badge tone="grey">Internal</Badge>}
                      {m.delivery_status && m.delivery_status !== 'logged' && (
                        <Badge tone={DELIVERY_TONE[m.delivery_status] || 'grey'} title={m.delivery_error || ''}>{m.delivery_status}</Badge>
                      )}
                    </div>
                    {m.subject && <div style={{ fontWeight: 600, fontSize: 13 }}>{m.subject}</div>}
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </div>
                ))}
              </div>

              {/* Reply composer */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <select value={visibility} onChange={(e) => setVisibility(e.target.value)} style={{ ...sel, width: 'auto' }}><option value="client">Client</option><option value="internal">Internal note</option></select>
                  <select value={channel} onChange={(e) => setChannel(e.target.value)} style={{ ...sel, width: 'auto' }} disabled={visibility === 'internal'}><option value="email">Email</option><option value="note">Note</option><option value="sms">SMS</option></select>
                  <select value="" onChange={(e) => applyTemplate(e.target.value)} style={{ ...sel, width: 'auto' }}><option value="">Insert template…</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                </div>
                {channel === 'email' && visibility === 'client' && <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" style={{ ...sel, marginBottom: 6 }} />}
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={visibility === 'internal' ? 'Internal note (not sent to the client)…' : 'Reply to the client…'} style={{ ...sel, minHeight: 70 }} />
                <div style={{ textAlign: 'right', marginTop: 6 }}><Button icon={Send} onClick={sendReply}>{visibility === 'internal' ? 'Save note' : 'Send'}</Button></div>
              </div>
            </>
          )}
        </div></div>
      </div>
    </div>
  );
}
