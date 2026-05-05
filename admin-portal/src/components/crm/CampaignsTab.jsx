import React, { useState } from 'react';
import { Plus, Mail, MessageCircle, Smartphone, Send } from 'lucide-react';
import api from '../../services/api';
import { inputStyle } from './CRMComponents';
import { useToast } from '../../context/ToastContext';

const CampaignsTab = ({ campaigns, onRefresh }) => {
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', channel: 'email', subject: '', body: '', target_audience: 'all_leads', attachment_url: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/crm/campaigns', form); setShowForm(false); onRefresh(); }
    catch { toast.error('Failed'); } finally { setSaving(false); }
  };

  const handleSend = async (id) => {
    if (!window.confirm('Send this campaign now?')) return;
    try { const r = await api.post(`/crm/campaigns/${id}/send`); toast.success(r.data.message); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  const channelIcon = { email: <Mail size={16} />, whatsapp: <MessageCircle size={16} />, sms: <Smartphone size={16} /> };
  const statusColor = { draft: '#6b7280', sent: '#10b981', scheduled: '#f59e0b' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Campaign Manager</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Create and send marketing campaigns to your leads</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)} style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Plus size={16} /> New Campaign</button>
      </div>

      {showForm && (
        <div style={{ marginBottom: '1.2rem', padding: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem' }}>
              <input required placeholder="Campaign Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
              <select value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))} style={inputStyle}>
                {['email', 'whatsapp', 'sms'].map(c => <option key={c}>{c}</option>)}
              </select>
              <select value={form.target_audience} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))} style={inputStyle}>
                {['all_leads', 'new_leads', 'interested', 'trial', 'lost', 'all_contacts'].map(a => <option key={a}>{a.replace('_', ' ')}</option>)}
              </select>
            </div>
            {form.channel === 'email' && <input placeholder="Email Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={inputStyle} />}
            {form.channel === 'email' && <input placeholder="Attachment URL (Optional)" value={form.attachment_url || ''} onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))} style={inputStyle} title="Link to a PDF or Image" />}
            
            <div style={{ position: 'relative' }}>
              <textarea required placeholder="Message body..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ ...inputStyle, height: '110px', resize: 'none', width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  Variables: <strong>{`{{name}}`}</strong>, <strong>{`{{phone}}`}</strong>, <strong>{`{{email}}`}</strong>, <strong>{`{{course}}`}</strong>
                </span>
                {form.channel === 'sms' && (
                  <span style={{ fontSize: '0.65rem', color: form.body.length > 160 ? '#f59e0b' : 'var(--text-dim)', fontWeight: '600' }}>
                    {form.body.length} chars ({Math.ceil((form.body.length || 1) / 160)} SMS)
                  </span>
                )}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowForm(false)} style={{ padding: '0.6rem 1.2rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '0.6rem 1.5rem' }}>{saving ? '...' : 'Save Draft'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {campaigns.length === 0
          ? <div className="glass-morphism" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>No campaigns yet. Create your first one above.</div>
          : campaigns.map(c => (
            <div key={c.id} className="glass-morphism" style={{ padding: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>{channelIcon[c.channel]}</span>
                  <h4 style={{ fontWeight: '700', fontSize: '0.95rem' }}>{c.name}</h4>
                  <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px', background: `${statusColor[c.status]}15`, color: statusColor[c.status], fontWeight: '700' }}>{c.status?.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Target: {c.target_audience?.replace('_', ' ')} · {c.sent_count > 0 ? `Sent to ${c.sent_count}` : 'Not sent'}</p>
              </div>
              {c.status === 'draft' && (
                <button onClick={() => handleSend(c.id)} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Send size={14} /> Send</button>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default CampaignsTab;
