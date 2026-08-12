import React, { useState, useEffect, useCallback } from 'react';
import { Send, Pin, Trash2, Paperclip, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { fileSrc } from '../../ui/FileUpload';
import { EmptyState, dateTimeFmt, toast, errText } from './common';

/*
 * Running commentary on any water-tank record — an observation added after the
 * visit, a client request phoned in, a follow-up for whoever picks the job up
 * next. Categorised so the important ones stand out, pinnable so they stay on
 * top. Used by site assessments, quotations and anything else that accumulates
 * a story.
 */

const CATEGORY_TONE = { Risk: 'red', 'Client Request': 'blue', 'Follow-up': 'amber', Observation: 'cyan', Note: 'slate' };
const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export default function RecordComments({ entityType, entityId, categories = ['Note', 'Observation', 'Risk', 'Client Request', 'Follow-up'] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Note');
  const [attachment, setAttachment] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/wt-ops/${entityType}/${entityId}/comments`)
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);
  useEffect(load, [load]);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api.post(`/wt-ops/${entityType}/${entityId}/comments`, {
        body: body.trim(), category, attachment_url: attachment || null,
      });
      setBody(''); setAttachment(''); setCategory('Note');
      load();
    } catch (e) { toast.err(errText(e, 'Could not post the comment')); }
    finally { setBusy(false); }
  };

  const attach = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uploads?folder=documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAttachment(data.data.url);
    } catch (e) { toast.err(errText(e, 'Upload failed')); }
    finally { setUploading(false); }
  };

  const togglePin = async (c) => {
    try { await api.patch(`/wt-ops/${entityType}/${entityId}/comments/${c.id}`, { pinned: !c.pinned }); load(); }
    catch (e) { toast.err(errText(e)); }
  };
  const remove = async (c) => {
    try { await api.delete(`/wt-ops/${entityType}/${entityId}/comments/${c.id}`); toast.ok('Comment deleted'); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="wt-commentbox">
        <textarea
          className="wt-input" rows={3} style={{ resize: 'vertical', border: 0, padding: 0 }}
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Add an observation, a client request, or anything the next person needs to know…"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        {attachment && (
          <a className="wt-comment att" href={fileSrc(attachment)} target="_blank" rel="noreferrer" style={{ padding: 0, border: 0, background: 'none' }}>
            <Paperclip size={12} /> {attachment.split('/').pop()}
            <button type="button" className="wt-iconbtn" onClick={(e) => { e.preventDefault(); setAttachment(''); }}>×</button>
          </a>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select className="wt-select" style={{ width: 152 }} value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="wt-btn sm" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? <Loader2 size={12} className="wt-spin" /> : <Paperclip size={12} />} Attach
            <input type="file" style={{ display: 'none' }} onChange={(e) => { attach(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--wt-muted)' }}>Ctrl + Enter to post</span>
          <button className="wt-btn primary sm" disabled={busy || !body.trim()} onClick={submit}>
            <Send size={12} /> {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={18} className="wt-spin" style={{ color: 'var(--wt-muted)' }} /></div>
      ) : rows.length ? (
        <div className="wt-comments">
          {rows.map((c) => (
            <div className={`wt-comment${c.pinned ? ' pinned' : ''}`} key={c.id}>
              <span className="av">{initials(c.author)}</span>
              <div className="bd">
                <div className="hd">
                  <span className="who">{c.author || 'Operations'}</span>
                  <span className={`wt-pill sm ${CATEGORY_TONE[c.category] || 'slate'}`}>{c.category}</span>
                  {c.pinned && <span className="wt-pill sm cyan"><Pin size={9} /> Pinned</span>}
                  <span className="when">{dateTimeFmt(c.createdAt)}</span>
                </div>
                <div className="txt">{c.body}</div>
                {c.attachment_url && (
                  <a className="att" href={fileSrc(c.attachment_url)} target="_blank" rel="noreferrer">
                    <Paperclip size={12} /> {c.attachment_url.split('/').pop()}
                  </a>
                )}
              </div>
              <div className="tools">
                <button className="wt-iconbtn" title={c.pinned ? 'Unpin' : 'Pin to top'} onClick={() => togglePin(c)}><Pin size={13} /></button>
                <button className="wt-iconbtn" title="Delete" onClick={() => remove(c)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState eyebrow="Comments" title="No comments yet"
          hint="Use this thread for observations after the visit, client requests, and follow-ups for whoever picks the job up next." />
      )}
    </div>
  );
}
