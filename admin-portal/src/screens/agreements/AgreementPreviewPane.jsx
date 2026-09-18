import React from 'react';
import { Maximize2, RefreshCw } from 'lucide-react';
import { Spinner } from '../../ui/kit';

/**
 * Turn a failed preview request into a message the user can act on, so the
 * preview pane never shows a bare "Could not generate" with no reason.
 * Pass the caught error (axios error or anything). Returns a non-empty string.
 */
export function previewErrorMessage(e) {
  const st = e?.response?.status;
  if (st === 401 || st === 403) return 'Your session has expired — sign in again, then reopen this agreement.';
  const backend = e?.response?.data?.error;
  if (backend) return backend;
  if (e?.message === 'Network Error') return 'Cannot reach the server — check your connection and retry.';
  return `Could not generate the preview${st ? ` (error ${st})` : ''}.`;
}

/**
 * AgreementPreviewPane — the shared live-document preview window used by every
 * agreement builder (Sales, Property Management, Tenancy, Short-Term Stay, and the
 * service-line customer/provider builders). One component so the preview window's
 * design AND behaviour are identical everywhere:
 *   • sticky right column, card header with title + "Live Preview" badge,
 *   • inline spinner while regenerating, "Full preview" button,
 *   • the live iframe, a spinner-on-first-load, and a Retry state on failure.
 *
 * The fetching (debounce, immediate first render, error flag) stays in each
 * builder; this component only renders the given state.
 *
 * Props:
 *   title            document title shown in the header
 *   html             the rendered preview HTML (falsy → spinner / empty state)
 *   previewing       true while a preview request is in flight
 *   error            true when the last request failed (shows Retry)
 *   onFullPreview    open the full-screen preview modal
 *   onRetry          re-run the preview (used by the Retry button)
 *   previewRef       parent-owned ref to the iframe (for scroll capture)
 *   previewScrollRef parent-owned ref holding the last scroll position to restore
 *   liveLabel        sub-label under the title
 *   emptyHint        message shown instead of the spinner before anything can load
 *                    (e.g. "Select a service provider to load live preview")
 *   stickyTop        sticky offset from the top (default 90)
 */
export default function AgreementPreviewPane({
  title,
  html,
  previewing = false,
  error = false,
  onFullPreview,
  onRetry,
  previewRef,
  previewScrollRef,
  liveLabel = 'Live Preview · Auto-updates as you edit',
  emptyHint,
  stickyTop = 90,
  heightCss,
  wrapperStyle,
}) {
  return (
    <div style={{ position: 'sticky', top: stickyTop, height: heightCss || `calc(100vh - ${stickyTop + 20}px)`, display: 'flex', flexDirection: 'column', ...wrapperStyle }}>
      <div className="pm-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--pm-sh2)' }}>

        {/* Header */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy)', letterSpacing: '-0.2px' }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)' }} />
              {liveLabel}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {previewing && <Spinner size={14} />}
            <button className="pm-btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={onFullPreview} disabled={!html}>
              <Maximize2 size={13} /> Full preview
            </button>
          </div>
        </div>

        {/* Frame Body */}
        <div style={{ flex: 1, background: '#f1f5f9', padding: 12, overflow: 'hidden' }}>
          {html ? (
            <iframe
              ref={previewRef}
              title="Agreement live preview"
              srcDoc={html}
              sandbox="allow-same-origin"
              onLoad={() => {
                try {
                  if (previewScrollRef) previewRef?.current?.contentWindow?.scrollTo(0, previewScrollRef.current || 0);
                } catch { /* cross-origin guard */ }
              }}
              style={{ width: '100%', height: '100%', border: 0, borderRadius: 8, background: '#ffffff', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            />
          ) : error && !previewing ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>
              <span style={{ fontSize: 13 }}>{typeof error === 'string' && error ? error : 'Could not generate the preview.'}</span>
              {onRetry && (
                <button type="button" className="pm-btn" onClick={() => onRetry()}>
                  <RefreshCw size={13} /> Retry
                </button>
              )}
            </div>
          ) : emptyHint && !previewing ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>
              {emptyHint}
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--muted)' }}>
              <Spinner />
              <span style={{ fontSize: 13 }}>Generating live document preview…</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
