import React, { useState } from 'react';
import { Camera, ImageOff, Maximize2, X } from 'lucide-react';
import { fileSrc } from '../../ui/FileUpload';

/**
 * The before/after photographs a provider uploaded from the portal.
 *
 * These are written to `wt_work_orders.portal_photos_before` / `_after` by the
 * provider portal and have always travelled in the admin work-order payload —
 * the admin screen simply never rendered them, so staff saw only the
 * "Before & after photos collected" tickbox and had to take the provider's word
 * for it. This is that missing view.
 *
 * `/uploads/documents/` is JWT-gated, so every src goes through `fileSrc()`,
 * which appends the token — an <img> cannot send an Authorization header.
 */

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
};

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

function Shot({ photo, onOpen }) {
  const [broken, setBroken] = useState(false);
  const src = fileSrc(photo.url);
  return (
    <button
      type="button"
      onClick={() => !broken && onOpen(photo)}
      title={photo.name || photo.url}
      style={{
        position: 'relative', padding: 0, border: '1px solid var(--wt-line, #e2e8f0)',
        borderRadius: 10, overflow: 'hidden', background: '#f8fafc',
        cursor: broken ? 'default' : 'zoom-in', width: '100%', aspectRatio: '4 / 3',
      }}
    >
      {broken ? (
        <span style={{
          display: 'grid', placeItems: 'center', height: '100%', gap: 6,
          color: '#94a3b8', fontSize: 11, fontWeight: 700, padding: 8, textAlign: 'center',
        }}
        >
          <ImageOff size={18} />
          Could not load
        </span>
      ) : (
        <>
          <img
            src={src}
            alt={photo.name || 'Job photo'}
            loading="lazy"
            onError={() => setBroken(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <span style={{
            position: 'absolute', right: 6, top: 6, background: 'rgba(15,23,42,.72)',
            color: '#fff', borderRadius: 6, padding: '3px 5px', display: 'grid', placeItems: 'center',
          }}
          >
            <Maximize2 size={11} />
          </span>
        </>
      )}
      {(photo.at || photo.name) && (
        <span style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(transparent, rgba(15,23,42,.78))',
          color: '#fff', fontSize: 10, fontWeight: 600, padding: '14px 6px 5px',
          textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
        >
          {when(photo.at) || photo.name}
        </span>
      )}
    </button>
  );
}

function Lightbox({ photo, onClose }) {
  if (!photo) return null;
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,.88)', zIndex: 3000,
        display: 'grid', placeItems: 'center', padding: 24,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.14)',
          color: '#fff', border: 0, borderRadius: 8, padding: 8, cursor: 'pointer',
        }}
      >
        <X size={18} />
      </button>
      <figure style={{ margin: 0, maxWidth: '100%', maxHeight: '100%', textAlign: 'center' }}>
        <img
          src={fileSrc(photo.url)}
          alt={photo.name || 'Job photo'}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '100%', maxHeight: '78vh', borderRadius: 10, display: 'block', margin: '0 auto' }}
        />
        <figcaption style={{ color: '#e2e8f0', fontSize: 12, marginTop: 10 }}>
          {photo.name || ''}{photo.name && photo.at ? ' · ' : ''}{when(photo.at)}
        </figcaption>
      </figure>
    </div>
  );
}

function Strip({ label, photos, onOpen }) {
  return (
    <div style={{ flex: '1 1 260px', minWidth: 0 }}>
      <div style={{
        fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.4px',
        color: '#64748b', marginBottom: 6,
      }}
      >
        {label} <span style={{ color: '#94a3b8' }}>({photos.length})</span>
      </div>
      {photos.length === 0 ? (
        <div style={{
          border: '1px dashed var(--wt-line, #e2e8f0)', borderRadius: 10, padding: '14px 10px',
          color: '#94a3b8', fontSize: 12, textAlign: 'center',
        }}
        >
          None uploaded
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8 }}>
          {photos.map((p, i) => <Shot key={`${p.url}-${i}`} photo={p} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

/** `wo` is the work order as the admin detail endpoint returns it. */
export default function JobPhotos({ wo }) {
  const [open, setOpen] = useState(null);
  const before = asArray(wo?.portal_photos_before);
  const after = asArray(wo?.portal_photos_after);
  const total = before.length + after.length;

  return (
    <>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Strip label="Before" photos={before} onOpen={setOpen} />
        <Strip label="After" photos={after} onOpen={setOpen} />
      </div>

      {/*
        The tickbox and the evidence can disagree: a provider can mark the job
        complete without uploading anything. Saying so is more useful than an
        empty panel that looks like a loading failure.
      */}
      {total === 0 && wo?.photos_collected ? (
        <div className="wt-note" style={{ marginTop: 10 }}>
          <Camera size={13} /> This job is ticked as having photos collected, but the provider has
          not uploaded any through the portal.
        </div>
      ) : null}

      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </>
  );
}
