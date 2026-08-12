import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon, Link2, Eye } from 'lucide-react';
import api from '../../services/api';
import { fileSrc } from '../../ui/FileUpload';

/*
 * WtPhotoGrid — photo evidence capture for a site assessment (Sec. 8 Step 10).
 * Real uploads to /api/uploads (same endpoint the rest of the admin uses),
 * styled for wt-scope, multi-file, drag & drop, with a caption per photo.
 */

const MAX_MB = 15;

async function uploadOne(file) {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await api.post('/uploads?folder=documents', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data.url;
}

export default function WtPhotoGrid({ label, hint, value = [], onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [linkMode, setLinkMode] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');

  const addFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    const tooBig = list.find((f) => f.size > MAX_MB * 1e6);
    if (tooBig) { setErr(`${tooBig.name} is over ${MAX_MB} MB.`); return; }
    setErr(''); setBusy(list.length);
    const added = [];
    for (const file of list) {
      try {
        const url = await uploadOne(file);
        added.push({ url, caption: file.name.replace(/\.[^.]+$/, '') });
      } catch (e) {
        setErr(e.response?.data?.error || `Could not upload ${file.name}.`);
      } finally { setBusy((n) => n - 1); }
    }
    if (added.length) onChange([...value, ...added]);
  };

  const setCaption = (i, caption) => onChange(value.map((p, j) => (j === i ? { ...p, caption } : p)));
  const removeAt = (i) => onChange(value.filter((_, j) => j !== i));

  return (
    <div className="wt-field">
      {label && <label>{label}{value.length ? ` (${value.length})` : ''}</label>}

      {value.length > 0 && (
        <div className="wt-photogrid">
          {value.map((p, i) => (
            <div className="wt-photocard" key={`${p.url || 'x'}-${i}`}>
              <div className="thumb">
                {p.url
                  ? <img src={fileSrc(p.url)} alt={p.caption || `Photo ${i + 1}`} loading="lazy" />
                  : <ImageIcon size={20} />}
                <div className="acts">
                  {p.url && (
                    <a href={fileSrc(p.url)} target="_blank" rel="noreferrer" title="View full size" onClick={(e) => e.stopPropagation()}>
                      <Eye size={13} />
                    </a>
                  )}
                  <button type="button" title="Remove" onClick={() => removeAt(i)}><X size={13} /></button>
                </div>
              </div>
              <input
                className="cap" value={p.caption || ''} placeholder="Add a caption…"
                onChange={(e) => setCaption(i, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {linkMode ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="wt-input" placeholder="Paste an image link (https://…)" value={linkDraft}
            onChange={(e) => setLinkDraft(e.target.value)} />
          <button type="button" className="wt-btn" onClick={() => {
            if (linkDraft.trim()) onChange([...value, { url: linkDraft.trim(), caption: '' }]);
            setLinkDraft(''); setLinkMode(false);
          }}>Add</button>
          <button type="button" className="wt-iconbtn" onClick={() => setLinkMode(false)}><X size={14} /></button>
        </div>
      ) : (
        <div
          className={`wt-dropzone${drag ? ' on' : ''}`}
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
        >
          <span className="ic">{busy > 0 ? <Loader2 size={17} className="wt-spin" /> : <UploadCloud size={17} />}</span>
          <span className="tx">
            <strong>{busy > 0 ? `Uploading ${busy} photo${busy === 1 ? '' : 's'}…` : 'Click to upload or drag photos here'}</strong>
            <span>{hint || `JPG, PNG or HEIC · up to ${MAX_MB} MB each · multiple allowed`}</span>
          </span>
          <button type="button" className="wt-btn sm" onClick={(e) => { e.stopPropagation(); setLinkMode(true); }}>
            <Link2 size={12} /> Link
          </button>
        </div>
      )}

      {err && <span className="hint" style={{ color: 'var(--wt-red)' }}>{err}</span>}
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
