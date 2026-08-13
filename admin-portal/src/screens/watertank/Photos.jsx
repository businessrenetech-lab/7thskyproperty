import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, Trash2, Loader2, X, ChevronLeft, ChevronRight, Download, ImageOff, MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import { toast, errText } from './common';
import { fileSrc } from '../../ui/FileUpload';

/*
 * Photos — one component for uploading, captioning and viewing site pictures.
 *
 * Three problems this replaces:
 *
 *   NO PREVIEW. Photos live in the private uploads folder, which is JWT-gated.
 *   An <img> cannot send an Authorization header, so every thumbnail came back
 *   401 and rendered as a broken image. The server now also accepts the auth
 *   cookie, and this component shows a clear placeholder when a picture still
 *   cannot be loaded rather than a browser's broken-image glyph.
 *
 *   NO WAY TO VIEW. Thumbnails are 62px; a tank interior at 62px tells nobody
 *   anything. Clicking one opens a full-size lightbox with keyboard paging.
 *
 *   NO COMMENT. A photo of a cracked wall is evidence; "cracked wall, north
 *   side, approx 300mm" is evidence somebody can act on a year later. Every
 *   photo now carries its own caption, saved with it.
 *
 * `readOnly` renders the same gallery without the upload or edit controls, so
 * the viewer and the editor cannot drift apart.
 */

/** Normalise however a photo was stored: a bare URL string, or an object. */
export const photoOf = (p) => (typeof p === 'string'
  ? { url: p, caption: '' }
  : { url: p?.url || '', caption: p?.caption || '', name: p?.name || '' });

/**
 * Resolve a stored URL to something an <img> can actually fetch.
 *
 * On the admin side the auth cookie travels with a same-origin request, so the
 * stored path works as-is. In the portal there is no cookie — the party is
 * identified by their link token — so the request is routed through the portal's
 * own photo endpoint instead.
 */
export const photoSrc = (url, portalBase) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^data:/i.test(url)) return url;

  /*
   * Portal: no cookie and no localStorage token — the party is identified only
   * by their link — so the image goes through the portal's own photo endpoint,
   * which authorises with that token and checks the file belongs to them.
   */
  if (portalBase) {
    const file = String(url).split('/').pop();
    const root = api.defaults.baseURL || '';
    return `${root}${portalBase}/photo?file=${encodeURIComponent(file)}`;
  }

  /*
   * Admin: reuse the app's existing helper rather than inventing a second way to
   * authenticate an <img>. It appends the stored token for private /uploads
   * paths; the server now also accepts the auth cookie, so this works either way.
   */
  return fileSrc(url);
};

/* ── lightbox ──────────────────────────────────────────────────────────── */

function Lightbox({ photos, index, portalBase, onClose, onIndex }) {
  const p = photoOf(photos[index] || {});

  // Arrow keys and Escape, because a gallery that needs the mouse for
  // everything is slower than the drawer it replaced.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && index < photos.length - 1) onIndex(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, photos.length, onClose, onIndex]);

  return (
    <div className="wt-lightbox" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button className="wt-lightbox-x" onClick={onClose} title="Close (Esc)"><X size={20} /></button>

      {index > 0 && (
        <button className="wt-lightbox-nav left" onClick={() => onIndex(index - 1)} title="Previous">
          <ChevronLeft size={26} />
        </button>
      )}
      {index < photos.length - 1 && (
        <button className="wt-lightbox-nav right" onClick={() => onIndex(index + 1)} title="Next">
          <ChevronRight size={26} />
        </button>
      )}

      <figure className="wt-lightbox-fig" onMouseDown={(e) => e.stopPropagation()}>
        <img src={photoSrc(p.url, portalBase)} alt={p.caption || 'Site photo'} />
        <figcaption>
          <span>{p.caption || <em style={{ opacity: 0.6 }}>No comment on this photo</em>}</span>
          <span className="wt-lightbox-meta">
            {index + 1} of {photos.length}
            <a href={photoSrc(p.url, portalBase)} target="_blank" rel="noreferrer" title="Open full size">
              <Download size={13} /> Full size
            </a>
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

/* ── one thumbnail ─────────────────────────────────────────────────────── */

function Thumb({ photo, portalBase, onOpen, onCaption, onRemove, readOnly }) {
  const [broken, setBroken] = useState(false);
  const p = photoOf(photo);

  return (
    <div className="wt-pv">
      <button type="button" className="wt-pv-img" onClick={onOpen} title="Click to enlarge">
        {broken ? (
          // A named placeholder rather than the browser's broken-image icon,
          // which tells the operator nothing about what went wrong.
          <span className="wt-pv-broken"><ImageOff size={16} /> Unavailable</span>
        ) : (
          <img src={photoSrc(p.url, portalBase)} alt={p.caption || 'Site photo'}
            loading="lazy" onError={() => setBroken(true)} />
        )}
      </button>

      {!readOnly && (
        <button type="button" className="wt-pv-x" onClick={onRemove} title="Remove this photo">
          <Trash2 size={11} />
        </button>
      )}

      {readOnly ? (
        p.caption ? <span className="wt-pv-cap-ro" title={p.caption}>{p.caption}</span> : null
      ) : (
        <input
          className="wt-pv-cap"
          value={p.caption}
          onChange={(e) => onCaption(e.target.value)}
          placeholder="Add a comment…"
          title="What does this photo show?"
        />
      )}
    </div>
  );
}

/* ── the gallery ───────────────────────────────────────────────────────── */

/**
 * @param photos      array of { url, caption } or bare URL strings
 * @param onChange    omit for a read-only gallery
 * @param uploadUrl   endpoint that accepts a multipart `file` and returns { url }
 * @param portalBase  set in the portal, so images route through its photo endpoint
 */
export default function Photos({
  label, photos = [], onChange, uploadUrl, portalBase, readOnly = false, hint,
}) {
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(-1);
  const list = photos.map(photoOf);

  const pick = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    const added = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      try {
        const r = await api.post(uploadUrl, form);
        added.push({ url: r.data.url, caption: '', name: r.data.name || file.name });
      } catch (err) {
        toast.err(errText(err, `Could not upload ${file.name}`));
      }
    }
    // One state update for the whole batch: updating per file made the earlier
    // version drop photos when several finished at once.
    if (added.length) onChange([...list, ...added]);
    setBusy(false);
    e.target.value = '';
  }, [list, onChange, uploadUrl]);

  const setCaption = (i, caption) => onChange(list.map((p, j) => (j === i ? { ...p, caption } : p)));
  const remove = (i) => onChange(list.filter((_, j) => j !== i));

  return (
    <div className="wt-field">
      {label && (
        <label>
          {label}
          {list.length > 0 && <span className="muted" style={{ fontWeight: 500 }}> · {list.length}</span>}
        </label>
      )}

      {list.length === 0 && readOnly && <span className="muted" style={{ fontSize: 12.5 }}>No photos.</span>}

      <div className="wt-pv-grid">
        {list.map((p, i) => (
          <Thumb key={`${p.url}-${i}`} photo={p} portalBase={portalBase} readOnly={readOnly}
            onOpen={() => setLightbox(i)}
            onCaption={(c) => setCaption(i, c)}
            onRemove={() => remove(i)} />
        ))}

        {!readOnly && (
          <label className="wt-pv-add" title="Take or choose photos">
            {busy ? <Loader2 size={17} className="wt-spin" /> : <Camera size={17} />}
            <span>{busy ? 'Uploading…' : 'Add photos'}</span>
            {/* `capture` opens the camera straight away on a phone. */}
            <input type="file" accept="image/*" multiple capture="environment"
              onChange={pick} disabled={busy} />
          </label>
        )}
      </div>

      {!readOnly && (
        <span className="hint">
          <MessageSquare size={11} style={{ verticalAlign: -1 }} />{' '}
          {hint || 'Add a comment to each photo — what it shows is what makes it useful later.'}
        </span>
      )}

      {lightbox >= 0 && list[lightbox] && (
        <Lightbox photos={list} index={lightbox} portalBase={portalBase}
          onClose={() => setLightbox(-1)} onIndex={setLightbox} />
      )}
    </div>
  );
}
