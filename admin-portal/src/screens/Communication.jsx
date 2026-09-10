import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Inbox, RefreshCw, Search, Send, Mail, MessageSquare, Phone, Globe, FileText, Pencil, Trash2, CornerUpLeft, User } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { PageHead, Button, Field, Input, Select, Spinner, Badge } from '../ui/kit';

/*
 * Communication → Inbox (PM). A unified admin inbox over the existing
 * `communications` store + `rental_enquiries`. Two panes: conversation list
 * (left) and the selected thread + composer (right). Replies post through the
 * existing send path (backend /api/communications) — no parallel message system.
 */
const CHANNELS = [
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'sms', label: 'SMS', icon: MessageSquare },
  { key: 'note', label: 'Internal note', icon: FileText },
];
const channelIcon = (c) => ({ email: Mail, sms: MessageSquare, call: Phone, phone: Phone, web: Globe, note: FileText }[c] || MessageSquare);
const fmt = (v) => { if (!v) return ''; const d = new Date(v); const now = new Date(); const sameDay = d.toDateString() === now.toDateString(); return sameDay ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString(); };

export default function Communication() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState({ conversations: 0, unread: 0, needs_reply: 0, drafts: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');   // '' | unread | needs_reply | drafts
  const [source, setSource] = useState('');    // '' | enquiry | message
  const [q, setQ] = useState('');
  const [active, setActive] = useState(null);  // conversation key
  const [thread, setThread] = useState(null);
  const [composing, setComposing] = useState(false); // new-message mode

  const loadInbox = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (status) params.status = status;
      if (source) params.source = source;
      if (q.trim()) params.q = q.trim();
      const { data } = await api.get('/communications/inbox', { params });
      setList(data.data || []);
      setSummary(data.summary || {});
    } catch (e) { toast.error(e.response?.data?.error || 'Could not load inbox'); }
    finally { setLoading(false); }
  }, [status, source, q, toast]);
  useEffect(() => { loadInbox(); }, [loadInbox]);

  const openThread = useCallback(async (key) => {
    setActive(key); setComposing(false); setThread(null);
    try { const { data } = await api.get('/communications/thread', { params: { key } }); setThread(data.data); }
    catch (e) { toast.error(e.response?.data?.error || 'Could not load conversation'); }
  }, [toast]);

  const Kpi = ({ label, value, on, onClick }) => (
    <button className={`pm-chip ${on ? 'active' : ''}`} onClick={onClick}
      style={{ border: '1px solid var(--line,#e2e8f0)', borderRadius: 8, padding: '6px 10px', background: on ? 'rgba(2,132,199,.10)' : '#fff', cursor: 'pointer', fontSize: 12.5 }}>
      <strong style={{ marginRight: 5 }}>{value}</strong>{label}
    </button>
  );

  return (
    <>
      <PageHead title="Communication — Inbox"
        desc="Every incoming tenant, landlord and website enquiry in one place — reply by email, SMS or note, or save a draft."
        actions={<><Button variant="ghost" icon={RefreshCw} onClick={loadInbox}>Refresh</Button><Button icon={Pencil} onClick={() => { setComposing(true); setActive(null); setThread(null); }}>Compose</Button></>} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Kpi label="All" value={summary.conversations} on={!status} onClick={() => setStatus('')} />
        <Kpi label="Unread" value={summary.unread} on={status === 'unread'} onClick={() => setStatus('unread')} />
        <Kpi label="Needs reply" value={summary.needs_reply} on={status === 'needs_reply'} onClick={() => setStatus('needs_reply')} />
        <Kpi label="Drafts" value={summary.drafts} on={status === 'drafts'} onClick={() => setStatus('drafts')} />
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Left: conversation list */}
        <div className="card" style={{ width: 360, flex: 'none', display: 'flex', flexDirection: 'column', maxHeight: '72vh' }}>
          <div className="card-pad" style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line,#e2e8f0)' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: '#94a3b8' }} />
              <input className="input" style={{ paddingLeft: 30 }} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadInbox()} />
            </div>
            <select className="select" style={{ width: 110 }} value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">All</option><option value="enquiry">Enquiries</option><option value="message">Messages</option>
            </select>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? <div style={{ padding: 20 }}><Spinner /></div> : !list.length ? (
              <div style={{ padding: 24, color: '#64748b', fontSize: 13, textAlign: 'center' }}>Nothing here.</div>
            ) : list.map((c) => {
              const Ic = channelIcon(c.channel);
              const on = active === c.key;
              return (
                <button key={c.key} onClick={() => openThread(c.key)}
                  style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--line,#f1f5f9)', background: on ? 'rgba(2,132,199,.08)' : c.unread ? '#fff' : '#fff', cursor: 'pointer', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.needs_reply && <span title="Needs reply" style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flex: 'none' }} />}
                    <span style={{ fontWeight: c.unread ? 800 : 600, fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', flex: 'none' }}>{fmt(c.last_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, margin: '2px 0' }}>
                    <Badge tone={c.source === 'enquiry' ? 'cyan' : 'grey'}>{c.source}</Badge>
                    <Ic size={11} style={{ color: '#64748b' }} />
                    {c.is_draft && <Badge tone="amber">draft</Badge>}
                    <span style={{ fontSize: 11.5, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.subtitle}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.snippet}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: thread + composer, or compose-new */}
        <div className="card" style={{ flex: 1, minHeight: '72vh', display: 'flex', flexDirection: 'column' }}>
          {composing ? (
            <ComposeNew onClose={() => setComposing(false)} onSent={() => { setComposing(false); loadInbox(); }} />
          ) : !active ? (
            <div style={{ margin: 'auto', color: '#94a3b8', textAlign: 'center', padding: 40 }}>
              <Inbox size={30} /><div style={{ marginTop: 8, fontSize: 13 }}>Select a conversation to read and reply.</div>
            </div>
          ) : !thread ? <div style={{ padding: 24 }}><Spinner /></div> : (
            <ThreadView thread={thread} onReplied={() => { openThread(active); loadInbox(); }} />
          )}
        </div>
      </div>
    </>
  );
}

function ThreadView({ thread, onReplied }) {
  const toast = useToast();
  const ctx = thread.context || {};
  const [channel, setChannel] = useState('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [thread]);

  const send = async (isDraft) => {
    if (!body.trim() && !isDraft) return toast.error('Write a message first.');
    setBusy(true);
    try {
      await api.post('/communications/reply', { key: thread.key, channel, subject: subject || undefined, body });
      toast.success('Reply sent');
      setBody(''); setSubject(''); onReplied();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="card-pad" style={{ borderBottom: '1px solid var(--line,#e2e8f0)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', background: 'rgba(2,132,199,.12)', color: '#0284c7', flex: 'none' }}><User size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{ctx.name || 'Conversation'}{ctx.stage && <Badge tone="cyan" >{ctx.stage}</Badge>}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{[ctx.property?.title, ctx.email, ctx.phone].filter(Boolean).join(' · ') || ctx.kind}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc' }}>
        {(thread.messages || []).map((m) => {
          const out = m.direction === 'outbound';
          return (
            <div key={m.id} style={{ alignSelf: out ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
              <div style={{ background: out ? '#0284c7' : '#fff', color: out ? '#fff' : '#0f172a', border: out ? 'none' : '1px solid var(--line,#e2e8f0)', borderRadius: 12, padding: '9px 12px', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                {m.subject && <div style={{ fontWeight: 700, marginBottom: 3 }}>{m.subject}</div>}
                {m.body}
              </div>
              <div style={{ fontSize: 10.5, color: '#94a3b8', textAlign: out ? 'right' : 'left', marginTop: 2 }}>
                {m.is_draft ? 'Draft · ' : ''}{m.channel} · {new Date(m.at).toLocaleString()}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="card-pad" style={{ borderTop: '1px solid var(--line,#e2e8f0)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="select" style={{ width: 150 }} value={channel} onChange={(e) => setChannel(e.target.value)}>
            {CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          {channel === 'email' && <input className="input" style={{ flex: 1 }} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />}
        </div>
        <textarea className="input" rows={3} placeholder={`Reply by ${channel}…`} value={body} onChange={(e) => setBody(e.target.value)} style={{ resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button icon={CornerUpLeft} onClick={() => send(false)} disabled={busy}>{busy ? <Spinner /> : 'Send reply'}</Button>
        </div>
      </div>
    </>
  );
}

function ComposeNew({ onClose, onSent }) {
  const toast = useToast();
  const [f, setF] = useState({ to_email: '', channel: 'email', subject: '', body: '' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (isDraft) => {
    if (!f.body.trim() && !isDraft) return toast.error('Write a message first.');
    if (f.channel === 'email' && !f.to_email.trim() && !isDraft) return toast.error('Enter a recipient email.');
    setBusy(true);
    try {
      await api.post('/communications', { channel: f.channel, subject: f.subject || undefined, body: f.body, to_email: f.to_email || undefined, is_draft: isDraft });
      toast.success(isDraft ? 'Draft saved' : 'Message sent'); onSent();
    } catch (e) { toast.error(e.response?.data?.error || 'Could not send'); }
    finally { setBusy(false); }
  };
  return (
    <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>New message</strong>
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Channel"><Select value={f.channel} onChange={(e) => set('channel', e.target.value)}>{CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</Select></Field>
        <Field label="To (email)"><Input value={f.to_email} onChange={(e) => set('to_email', e.target.value)} placeholder="recipient@example.com" /></Field>
      </div>
      <Field label="Subject"><Input value={f.subject} onChange={(e) => set('subject', e.target.value)} /></Field>
      <Field label="Message"><textarea className="input" rows={6} value={f.body} onChange={(e) => set('body', e.target.value)} style={{ resize: 'vertical' }} /></Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" icon={FileText} onClick={() => submit(true)} disabled={busy}>Save draft</Button>
        <Button icon={Send} onClick={() => submit(false)} disabled={busy}>{busy ? <Spinner /> : 'Send'}</Button>
      </div>
    </div>
  );
}
