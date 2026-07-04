import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, Users, StickyNote, Send, Plus } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button, Field, Input, Textarea, Select, Spinner } from '../ui/kit';

const CHANNEL_ICON = { call: Phone, email: Mail, sms: Send, whatsapp: MessageCircle, meeting: Users, note: StickyNote };

/** Communications timeline for a property. Renders comms + supports adding new. */
export function CommunicationsTab({ propertyId, communications = [], onReload }) {
  const toast = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ channel: 'note', direction: 'internal', subject: '', body: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.body && !form.subject) return toast.error('Add a subject or body');
    setSaving(true);
    try {
      await api.post(`/properties/${propertyId}/communications`, form);
      toast.success('Communication logged');
      setForm({ channel: 'note', direction: 'internal', subject: '', body: '' });
      setShowAdd(false);
      onReload?.();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="between">
        <h4 className="form-section-title" style={{ margin: 0, border: 'none', padding: 0 }}>Communication Timeline</h4>
        <Button size="sm" icon={Plus} onClick={() => setShowAdd((v) => !v)}>Log Communication</Button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: 12, background: 'var(--surface-2)' }}>
          <div className="form-grid">
            <Field label="Channel">
              <Select value={form.channel} onChange={(e) => setForm((s) => ({ ...s, channel: e.target.value }))}>
                {['call', 'email', 'sms', 'whatsapp', 'meeting', 'note'].map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Direction">
              <Select value={form.direction} onChange={(e) => setForm((s) => ({ ...s, direction: e.target.value }))}>
                <option value="outbound">Outbound (we sent)</option>
                <option value="inbound">Inbound (received)</option>
                <option value="internal">Internal note</option>
              </Select>
            </Field>
          </div>
          <Field label="Subject / summary"><Input value={form.subject} onChange={(e) => setForm((s) => ({ ...s, subject: e.target.value }))} placeholder="Called owner about rent…" /></Field>
          <Field label="Body / details"><Textarea rows={3} value={form.body} onChange={(e) => setForm((s) => ({ ...s, body: e.target.value }))} /></Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={saving}>{saving ? <Spinner /> : 'Save'}</Button>
          </div>
        </div>
      )}

      {communications.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {communications.map((c) => {
            const Icon = CHANNEL_ICON[c.channel] || StickyNote;
            return (
              <div key={c.id} style={{ display: 'flex', gap: 10, padding: 10, borderLeft: '3px solid var(--border)', background: 'var(--surface)' }}>
                <div style={{ color: 'var(--muted)' }}><Icon size={15} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ fontWeight: 700, textTransform: 'capitalize' }}>{c.channel}</span>
                    <span className="cell-sub">· {c.direction}</span>
                    <span className="cell-sub">· {c.occurred_at ? new Date(c.occurred_at).toLocaleString() : ''}</span>
                  </div>
                  {c.subject && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{c.subject}</div>}
                  {c.body && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, whiteSpace: 'pre-wrap' }}>{c.body}</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)' }}>
          <MessageCircle size={22} style={{ opacity: 0.6, marginBottom: 8 }} />
          <div style={{ fontSize: 13 }}>No communications logged yet.</div>
        </div>
      )}
    </div>
  );
}

/** Audit log tab — read-only feed of system changes. */
export function AuditLogTab({ auditLog = [] }) {
  if (!auditLog.length) return (
    <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontSize: 13 }}>No audit events recorded yet.</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {auditLog.map((a) => (
        <div key={a.id} style={{ padding: 10, borderLeft: '3px solid var(--primary)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>{a.action}</span>
            <span className="cell-sub">on {a.entity}#{a.entity_id}</span>
            <span className="cell-sub">· {a.User?.name || 'system'}</span>
            <span className="cell-sub">· {a.created_at ? new Date(a.created_at).toLocaleString() : ''}</span>
          </div>
          {a.new_value && (
            <details style={{ marginTop: 4 }}>
              <summary style={{ fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer' }}>Details</summary>
              <pre style={{ fontSize: 11, background: 'var(--surface-2)', padding: 8, borderRadius: 4, marginTop: 4, overflow: 'auto', maxHeight: 200 }}>{JSON.stringify(a.new_value, null, 2)}</pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}
