import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Check, Trash2, Upload, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import '../styles/wt-scope.css';

/*
 * DocumentRequest — the PUBLIC page a client opens from the secure link the Doc
 * Manager generates (Property Doc Verification & Transfer). No login: the token in
 * the URL is the credential. The client sees the requested documents, uploads each
 * with its number/date, and submits. Files are filed against their client record.
 */
export default function DocumentRequest() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [busyKey, setBusyKey] = useState('');
  const [meta, setMeta] = useState({});      // per-key { doc_number, issue_date }
  const [error, setError] = useState('');
  const [missing, setMissing] = useState([]);
  const [done, setDone] = useState(false);
  const fileInputs = useRef({});

  const load = async () => {
    try {
      const { data } = await api.get(`/public/doc-request/${token}`);
      setState({ loading: false, ...data });
      if (data.request?.status === 'Submitted') setDone(true);
    } catch (e) {
      setState({ loading: false, error: e.response?.data?.error || 'This document-upload link is unavailable.' });
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [token]);

  const docFor = (key) => (state.documents || []).find((d) => d.doc_key === key);

  const upload = async (item, file) => {
    if (!file) return;
    setBusyKey(item.key); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_key', item.key);
      if (meta[item.key]?.doc_number) fd.append('doc_number', meta[item.key].doc_number);
      if (meta[item.key]?.issue_date) fd.append('issue_date', meta[item.key].issue_date);
      await api.post(`/public/doc-request/${token}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
    } catch (e) { setError(e.response?.data?.error || 'Upload failed. Please try again.'); }
    setBusyKey('');
  };

  const remove = async (doc) => {
    setBusyKey(doc.doc_key); setError('');
    try { await api.delete(`/public/doc-request/${token}/documents/${doc.id}`); await load(); }
    catch (e) { setError(e.response?.data?.error || 'Could not remove the document.'); }
    setBusyKey('');
  };

  const submit = async () => {
    setError(''); setMissing([]);
    try {
      const { data } = await api.post(`/public/doc-request/${token}/submit`);
      setDone(true);
      setState((s) => ({ ...s, submitMessage: data.message }));
    } catch (e) {
      setError(e.response?.data?.error || 'Please complete the required documents.');
      setMissing(e.response?.data?.missing || []);
    }
  };

  if (state.loading) {
    return <div className="wt-scope" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}><Loader2 className="spin" size={28} /></div>;
  }
  if (state.error) {
    return (
      <div className="wt-scope" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="wt-card" style={{ padding: 28, maxWidth: 420, textAlign: 'center' }}>
          <AlertTriangle size={28} style={{ color: '#b45309' }} />
          <h2 style={{ margin: '10px 0 4px' }}>Link unavailable</h2>
          <p style={{ color: 'var(--wt-muted)' }}>{state.error}</p>
        </div>
      </div>
    );
  }

  const req = state.request || {};
  const requested = state.requested_docs || [];

  return (
    <div className="wt-scope" style={{ minHeight: '100vh', background: 'var(--wt-bg, #f4f7fb)', padding: '28px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--wt-accent-ink, #1e3a8a)' }}>{state.org || 'Seventh Sky Property Care'}</div>
          <div style={{ color: 'var(--wt-muted)', fontSize: 13 }}>{state.service_label} — Document Upload</div>
        </div>

        {done ? (
          <div className="wt-card" style={{ padding: 28, textAlign: 'center' }}>
            <span style={{ display: 'inline-grid', placeItems: 'center', width: 46, height: 46, borderRadius: '50%', background: 'var(--wt-green-bg, #d1fae5)', color: 'var(--wt-green, #047857)' }}><Check size={24} /></span>
            <h2 style={{ margin: '12px 0 4px' }}>Documents submitted</h2>
            <p style={{ color: 'var(--wt-muted)' }}>{state.submitMessage || 'Your documents have been submitted to Seventh Sky. Thank you.'}</p>
          </div>
        ) : (
          <>
            <div className="wt-card" style={{ padding: 18 }}>
              <div style={{ fontWeight: 700 }}>Hello {req.client_name || 'there'},</div>
              <p style={{ color: 'var(--wt-muted)', fontSize: 13.5, margin: '6px 0 0' }}>
                {req.message || 'Please upload the documents below so we can proceed with your property assessment. You can add a document number and date for each if available.'}
              </p>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--wt-muted)' }}>Reference {req.code}{req.expires_at ? ` · link valid until ${String(req.expires_at).slice(0, 10)}` : ''}</div>
            </div>

            {error && (
              <div className="wt-note" style={{ background: '#fef3c7', borderColor: '#fcd34d', color: '#92400e' }}>
                {error}
                {missing.length > 0 && <ul style={{ margin: '6px 0 0 18px' }}>{missing.map((m) => <li key={m}>{m}</li>)}</ul>}
              </div>
            )}

            <div className="wt-card" style={{ padding: 0 }}>
              {requested.map((item) => {
                const doc = docFor(item.key);
                const busy = busyKey === item.key;
                return (
                  <div key={item.key} style={{ padding: '14px 18px', borderBottom: '1px solid var(--wt-border, #e5e9f0)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {item.label} {item.required && <span className="wt-pill sm red" style={{ marginLeft: 4 }}>Required</span>}
                      </div>
                      {doc && doc.file_url ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span className="wt-pill sm green"><Check size={11} /> Uploaded</span>
                          <span style={{ fontSize: 12, color: 'var(--wt-muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.original_name || 'file'}</span>
                          <button className="wt-btn ghost sm" disabled={busy} onClick={() => remove(doc)}><Trash2 size={12} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <input ref={(el) => { fileInputs.current[item.key] = el; }} type="file" style={{ display: 'none' }}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onChange={(e) => upload(item, e.target.files?.[0])} />
                          <button className="wt-btn sm" disabled={busy} onClick={() => fileInputs.current[item.key]?.click()}>
                            {busy ? <Loader2 className="spin" size={13} /> : <Upload size={13} />} Upload
                          </button>
                        </div>
                      )}
                    </div>
                    {!doc?.file_url && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input className="wt-input" placeholder="Document / reference no. (optional)" style={{ flex: 1, fontSize: 12.5 }}
                          value={meta[item.key]?.doc_number || ''} onChange={(e) => setMeta((m) => ({ ...m, [item.key]: { ...m[item.key], doc_number: e.target.value } }))} />
                        <input className="wt-input" type="date" style={{ fontSize: 12.5 }}
                          value={meta[item.key]?.issue_date || ''} onChange={(e) => setMeta((m) => ({ ...m, [item.key]: { ...m[item.key], issue_date: e.target.value } }))} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="wt-btn" style={{ alignSelf: 'center', minWidth: 220 }} onClick={submit}>
              <ShieldCheck size={15} /> Submit documents
            </button>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--wt-muted)' }}>
              Your documents are sent securely to Seventh Sky and used only for your property assessment.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
