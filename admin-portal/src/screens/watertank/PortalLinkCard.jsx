import React, { useState, useEffect, useCallback } from 'react';
import { Link2, Copy, ShieldOff, RefreshCw, Clock, Check } from 'lucide-react';
import api from '../../services/api';
import { dateFmt, dateTimeFmt, toast, errText, Loading } from './common';

/*
 * PortalLinkCard — grant a provider or a client access to their own records.
 *
 * Dropped onto the provider file and the client file. The one thing this
 * component has to get right is that the token is shown EXACTLY ONCE: the server
 * stores only its SHA-256, so there is no way to display it again, and the UI
 * must not pretend otherwise. Hence the copy box appears on issue and is gone on
 * the next load, with the card thereafter reporting only whether a live link
 * exists — never the link itself.
 *
 * Re-issuing is therefore also the way to cut off access to an old link, which
 * is worth saying out loud where someone is deciding whether to click it.
 */
export default function PortalLinkCard({ partyType, partyId, partyName }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issued, setIssued] = useState(null);   // shown once, never re-fetchable
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/wt-ops/portal/${partyType}/${partyId}`)
      .then((r) => setState(r.data))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [partyType, partyId]);
  useEffect(load, [load]);

  const issue = async () => {
    setBusy(true);
    try {
      const r = await api.post(`/wt-ops/portal/${partyType}/${partyId}/link`, {});
      setIssued(r.data);
      toast.ok(r.data.message);
      load();
    } catch (e) { toast.err(errText(e, 'Could not issue a link')); }
    finally { setBusy(false); }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      const r = await api.delete(`/wt-ops/portal/${partyType}/${partyId}/link`);
      toast.ok(r.data.message);
      setIssued(null);
      load();
    } catch (e) { toast.err(errText(e, 'Could not withdraw access')); }
    finally { setBusy(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(issued.url)
      .then(() => { setCopied(true); toast.ok('Link copied.'); setTimeout(() => setCopied(false), 2500); })
      .catch(() => toast.err('Could not copy — select the link and copy it by hand.'));
  };

  const label = partyType === 'provider' ? 'Provider portal' : 'Customer portal';

  return (
    <div className="wt-card" style={{ padding: 18 }}>
      <div className="wt-panel-head">
        <div>
          <h2 className="wt-section-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Link2 size={15} /> {label}
          </h2>
          <p className="wt-subtitle" style={{ marginBottom: 0 }}>
            {partyType === 'provider'
              ? `Lets ${partyName || 'this provider'} accept jobs, book dates, submit completion reports and see what they are owed.`
              : `Lets ${partyName || 'this client'} see their quotations, invoices, receipts, AMC visits and warranties — and accept a quotation themselves.`}
          </p>
        </div>
        <button className="wt-btn sm" onClick={load}><RefreshCw size={13} /></button>
      </div>

      {loading ? <Loading /> : (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', margin: '12px 0', fontSize: 12.5 }}>
            <span>
              Status:{' '}
              <b style={{ color: state?.has_link ? 'var(--wt-green, #059669)' : 'var(--wt-muted)' }}>
                {state?.has_link ? 'Active' : state?.revoked_at ? 'Withdrawn' : 'No link issued'}
              </b>
            </span>
            {state?.expires_at && <span className="muted">Expires {dateFmt(state.expires_at)}</span>}
            <span className="muted">
              <Clock size={12} style={{ verticalAlign: -2 }} />{' '}
              {state?.last_seen_at ? `Last opened ${dateTimeFmt(state.last_seen_at)}` : 'Never opened'}
            </span>
          </div>

          {issued && (
            <div className="wt-note" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <b>Copy this link now — it cannot be shown again.</b>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="wt-input" readOnly value={issued.url}
                  onFocus={(e) => e.target.select()} style={{ flex: '1 0 0', fontFamily: 'monospace', fontSize: 11.5 }} />
                <button className="wt-btn primary" onClick={copy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <span className="muted" style={{ fontSize: 11.5 }}>
                Anyone holding this link can see this page, so send it to the right person and nobody else.
              </span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="wt-btn primary" disabled={busy} onClick={issue}>
              <Link2 size={14} /> {state?.has_link ? 'Issue a new link' : 'Issue portal link'}
            </button>
            {state?.has_link && (
              <button className="wt-btn danger-ghost" disabled={busy} onClick={revoke}>
                <ShieldOff size={14} /> Withdraw access
              </button>
            )}
          </div>
          {state?.has_link && (
            <p className="muted" style={{ fontSize: 11.5, marginTop: 8, marginBottom: 0 }}>
              Issuing a new link immediately stops the old one working — that is how to cut off
              access when a contact leaves.
            </p>
          )}

          {state?.events?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 className="wt-section-title" style={{ fontSize: 12.5, marginBottom: 8 }}>Recent activity</h3>
              <table className="wt-tbl">
                <tbody>
                  {state.events.slice(0, 8).map((e, i) => (
                    <tr key={`${e.created_at}-${i}`}>
                      <td className="muted" style={{ width: 150, whiteSpace: 'nowrap' }}>{dateTimeFmt(e.created_at)}</td>
                      <td>{String(e.action).replace(/_/g, ' ')}</td>
                      <td className="id" style={{ width: 110 }}>{e.subject_code || ''}</td>
                      <td className="muted" style={{ fontSize: 11.5 }}>{e.detail || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
