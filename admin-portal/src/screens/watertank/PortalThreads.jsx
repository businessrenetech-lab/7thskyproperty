import React, { useCallback, useEffect, useState } from 'react';
import { Send, RefreshCw, CornerUpLeft } from 'lucide-react';
import api from '../../services/api';
import { dateTimeFmt, Loading, toast, errText } from './common';

/**
 * The desk's half of the portal conversation.
 *
 * Until migration 0162 every `channel: 'portal'` row was `direction: 'inbound'`:
 * a contractor could write in and could not be answered in the portal, so staff
 * replied by phone or WhatsApp and the thread died. This panel is where the reply
 * gets written, and it sits on the Communication Log because that is where staff
 * already look for what someone said.
 *
 * Threads waiting for an answer come first, oldest-waiting at the top.
 */

function Thread({ thread, onSent }) {
  const [rows, setRows] = useState(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const partyType = thread.party_type === 'provider' ? 'provider' : 'client';
  const partyId = thread.provider_id;

  const load = useCallback(async () => {
    if (!partyId) { setRows([]); return; }
    try {
      const { data } = await api.get(`/wt-ops/portal-threads/${partyType}/${partyId}`);
      setRows(data.data || []);
    } catch { setRows([]); }
  }, [partyType, partyId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/wt-ops/portal-threads/${partyType}/${partyId}/reply`, { body });
      toast.ok(data.message || 'Reply sent');
      setBody('');
      await load();
      onSent?.();
    } catch (e) {
      toast.err(errText(e, 'Could not send that reply'));
    } finally { setBusy(false); }
  };

  if (rows === null) return <Loading />;

  return (
    <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'grid', gap: 8 }}>
        {rows.length === 0 && <span className="muted" style={{ fontSize: 12.5 }}>Nothing in this thread yet.</span>}
        {rows.map((m) => {
          const fromDesk = m.direction === 'outbound';
          return (
            <div
              key={m.id}
              style={{
                justifySelf: fromDesk ? 'end' : 'start',
                maxWidth: '82%',
                background: fromDesk ? '#e0f2fe' : '#f8fafc',
                border: '1px solid var(--wt-line, #e2e8f0)',
                borderRadius: 10,
                padding: '9px 11px',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 12 }}>{fromDesk ? (m.author || 'Seventh Sky') : thread.name}</strong>
                <span className="muted" style={{ fontSize: 11 }}>
                  {m.logged_at ? dateTimeFmt(m.logged_at) : ''}{m.ref_code ? ` · ${m.ref_code}` : ''}
                </span>
                {/* Whether they have opened it is the thing staff actually ask. */}
                {fromDesk && (
                  <span className="muted" style={{ fontSize: 11 }}>
                    {m.read_by_party_at ? `· read ${dateTimeFmt(m.read_by_party_at)}` : '· unread'}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 13, margin: '5px 0 0', whiteSpace: 'pre-wrap' }}>{m.body || m.summary}</p>
            </div>
          );
        })}
      </div>

      <textarea className="wt-input" rows={3} value={body}
        onChange={(e) => setBody(e.target.value)} placeholder={`Reply to ${thread.name}…`} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="wt-btn primary" disabled={busy || !body.trim()} onClick={send}>
          <Send size={14} /> {busy ? 'Sending…' : 'Send reply'}
        </button>
      </div>
    </div>
  );
}

export default function PortalThreads() {
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState({});
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/wt-ops/portal-threads');
      setData(d.data || []);
      setSummary(d.summary || {});
    } catch {
      setData([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Nothing to answer, nothing to show: this panel sits above the full log and
  // should not push it down when it has no news.
  if (data === null || data.length === 0) return null;

  return (
    <div className="wt-card" style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}>Portal messages</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {summary.waiting ? `${summary.waiting} waiting for a reply` : 'all answered'}
          {` · ${summary.threads} thread${summary.threads === 1 ? '' : 's'}`}
        </span>
        <button type="button" className="wt-btn ghost" style={{ marginLeft: 'auto' }} onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {data.map((t) => (
        <div key={t.key} style={{ borderTop: '1px solid var(--wt-line, #e2e8f0)', padding: '10px 0' }}>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 13 }}>{t.name}</strong>
            {t.party_type && <span className="wt-chip" style={{ cursor: 'default' }}>{t.party_type}</span>}
            {t.unanswered > 0 && (
              <span className="wt-chip" style={{ cursor: 'default', background: '#fee2e2', color: '#dc2626' }}>
                {t.unanswered} waiting
              </span>
            )}
            <span className="muted" style={{ fontSize: 11.5, marginLeft: 'auto' }}>
              {t.last_at ? dateTimeFmt(t.last_at) : ''} · {t.messages} message{t.messages === 1 ? '' : 's'}
            </span>
          </div>

          <p className="muted" style={{ fontSize: 12.5, margin: '6px 0 0' }}>
            {t.last_direction === 'outbound' ? 'You: ' : ''}{t.last_summary}
          </p>

          {/*
            A thread with no provider_id predates 0162 and is keyed only by a name.
            It can be read on the log below but not replied to, and saying so beats
            a button that fails.
          */}
          {t.provider_id ? (
            open === t.key ? (
              <>
                <Thread thread={t} onSent={load} />
                <button type="button" className="wt-btn ghost" style={{ marginTop: 8 }} onClick={() => setOpen(null)}>
                  Close
                </button>
              </>
            ) : (
              <button type="button" className="wt-btn" style={{ marginTop: 9 }} onClick={() => setOpen(t.key)}>
                <CornerUpLeft size={14} /> Open and reply
              </button>
            )
          ) : (
            <span className="muted" style={{ fontSize: 11.5, display: 'block', marginTop: 7 }}>
              An older message with no linked party record — readable below, not repliable here.
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
