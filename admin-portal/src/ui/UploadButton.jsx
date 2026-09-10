// admin-portal/src/ui/UploadButton.jsx
//
// A minimalist, self-contained file upload button. No manual path/link entry —
// the file is uploaded and its stored URL handed back via onChange. This is the
// house default for any "attach a document" field; prefer it over a text route
// input everywhere.
//
// Props:
//   value     current file url (string) | ''
//   onChange  (url) => void   — '' when cleared
//   folder    'documents' (private, default) | 'properties' (public)
//   accept    input accept attr
//   label     button caption when empty (default "Upload")
import React, { useRef, useState } from 'react';
import { UploadCloud, Eye, X, Loader2, FileCheck2 } from 'lucide-react';
import api from '../services/api';
import { fileSrc } from './FileUpload';

export default function UploadButton({
  value,
  onChange,
  folder = 'documents',
  accept = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv',
  label = 'Upload',
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const doUpload = async (file) => {
    if (!file) return;
    setErr('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/uploads?folder=${folder}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onChange(data.data.url);
    } catch (e) {
      setErr(e.response?.data?.error || 'Upload failed (max 15 MB).');
    } finally {
      setBusy(false);
    }
  };
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) doUpload(f); e.target.value = ''; };

  const hidden = <input ref={inputRef} type="file" accept={accept} onChange={onPick} style={{ display: 'none' }} />;

  // Filled — a compact chip with view + remove.
  if (value) {
    const name = value.split('/').pop().split('?')[0];
    return (
      <span style={chip}>
        <FileCheck2 size={14} style={{ color: 'var(--green, #16a34a)', flexShrink: 0 }} />
        <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{name}</span>
        <a href={fileSrc(value)} target="_blank" rel="noreferrer" title="View" style={iconBtn}><Eye size={13} /></a>
        <button type="button" title="Remove" onClick={() => onChange('')} style={iconBtn}><X size={13} /></button>
      </span>
    );
  }

  // Empty — one minimalist pill button.
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} style={{ ...pill, opacity: busy ? 0.7 : 1 }}>
        {busy ? <Loader2 size={14} className="spin" /> : <UploadCloud size={14} />}
        <span>{busy ? 'Uploading…' : label}</span>
      </button>
      {err && <span style={{ fontSize: 11.5, color: 'var(--danger, #dc2626)' }}>{err}</span>}
      {hidden}
    </span>
  );
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
  padding: '7px 14px', borderRadius: 999, font: 'inherit', fontSize: 13, fontWeight: 600,
  color: 'var(--primary, #0f766e)', background: 'var(--primary-50, #f0fdfa)',
  border: '1px solid var(--primary-200, #99f6e4)', transition: 'all .15s',
};
const chip = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '5px 8px 5px 10px', borderRadius: 999,
  background: 'var(--surface-2, #f8fafc)', border: '1px solid var(--border, #e5e7eb)',
};
const iconBtn = {
  display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 999,
  border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--muted, #64748b)',
};
