import React, { useRef, useState } from 'react';
import { UploadCloud, X, FileText, Link2, Eye, Loader2 } from 'lucide-react';
import api from '../services/api';

// Public upload folders are served without auth; everything else is JWT-gated,
// so we append the token as a query param for previews (img/iframe can't send headers).
const PUBLIC_PREFIXES = ['/uploads/properties', '/uploads/assets', '/uploads/website', '/uploads/services', '/uploads/branches'];
export function fileSrc(url) {
  if (!url) return url;
  if (/^https?:|^data:/i.test(url)) return url;
  const isPublic = PUBLIC_PREFIXES.some((p) => url.startsWith(p));
  if (url.startsWith('/uploads') && !isPublic) {
    const t = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    return t ? `${url}${url.includes('?') ? '&' : '?'}token=${t}` : url;
  }
  return url;
}
const isImage = (url = '') => /\.(png|jpe?g|webp|gif|heic|avif)(\?|$)/i.test(url);
const fmtSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.round(b / 1e3) + ' KB');

async function defaultUploader(file, folder) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post(`/uploads?folder=${folder || 'documents'}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return data.data.url;
}

/**
 * FileUpload — drop-in replacement for a document/photo/ID URL field.
 * Props:
 *   value     current file url (string)
 *   onChange  (url) => void
 *   folder    'documents' (private, default) | 'properties' (public photos)
 *   accept    input accept attr (default images + pdf + office)
 *   label     small caption under the control
 *   uploader  optional (file, folder) => Promise<url> — used by the public KYC page
 *   compact   smaller footprint for dense forms
 */
export default function FileUpload({ value, onChange, folder = 'documents', accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv', label, uploader, compact }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const doUpload = async (file) => {
    if (!file) return;
    setErr(''); setBusy(true);
    try {
      const up = uploader || defaultUploader;
      const url = await up(file, folder);
      onChange(url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed. Try a smaller file (max 15 MB).');
    } finally { setBusy(false); }
  };

  const onPick = (e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f); };

  // ── Filled state ──
  if (value) {
    const name = value.split('/').pop().split('?')[0];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface-2)' }}>
        {isImage(value)
          ? <img src={fileSrc(value)} alt="attachment" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
          : <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><FileText size={20} /></div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Uploaded · attached</div>
        </div>
        <a href={fileSrc(value)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm btn-icon" title="View"><Eye size={14} /></a>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <Loader2 size={13} className="spin" /> : 'Replace'}</button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" title="Remove" onClick={() => onChange('')}><X size={14} /></button>
        <input ref={inputRef} type="file" accept={accept} onChange={onPick} style={{ display: 'none' }} />
      </div>
    );
  }

  // ── Paste-URL mode ──
  if (urlMode) {
    return (
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Paste a file link (https://…)" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { if (urlDraft.trim()) onChange(urlDraft.trim()); setUrlMode(false); }}>Use</button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => setUrlMode(false)}><X size={14} /></button>
      </div>
    );
  }

  // ── Empty / dropzone state ──
  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        role="button" tabIndex={0}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: compact ? '10px 12px' : '16px', borderRadius: 10,
          border: `1.5px dashed ${drag ? 'var(--primary)' : 'var(--border-strong)'}`,
          background: drag ? 'var(--primary-50)' : 'var(--surface-2)', transition: 'all .15s',
        }}>
        <div style={{ width: compact ? 34 : 40, height: compact ? 34 : 40, borderRadius: 10, background: 'var(--primary-50)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {busy ? <Loader2 size={18} className="spin" /> : <UploadCloud size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 650 }}>{busy ? 'Uploading…' : 'Click to upload or drag & drop'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{label || 'Images, PDF, Word, Excel · up to 15 MB'}</div>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setUrlMode(true); }} title="Paste a link instead"><Link2 size={13} /> Link</button>
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{err}</div>}
      <input ref={inputRef} type="file" accept={accept} onChange={onPick} style={{ display: 'none' }} />
    </div>
  );
}
