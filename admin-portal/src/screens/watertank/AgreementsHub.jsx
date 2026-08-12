import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSignature, Users, HardHat, ClipboardList, Search, Send, Eye, Download, Ban,
  Check, Clock, AlertTriangle, Copy, RefreshCw, Loader2, X, ShieldCheck, CalendarClock,
} from 'lucide-react';
import api from '../../services/api';
import { WtHead, WtTabs, Pill, Loading, EmptyState, dateFmt, dateTimeFmt, toast, errText } from './common';

/*
 * Agreements register — every Water Tank document that goes out for signature,
 * in one place: Client Agreements, Provider Agreements and Work Order Agreements.
 *
 * All three run through the same signing engine but were only visible from three
 * separate screens, so "what is out for signature and who are we waiting on?"
 * could not be answered without checking each in turn. Everything here is read
 * from the envelopes themselves, so the register cannot drift from the truth.
 */

const FAMILIES = [
  { key: 'client', label: 'Client Agreements', icon: Users },
  { key: 'provider', label: 'Provider Agreements', icon: HardHat },
  { key: 'work_order', label: 'Work Orders', icon: ClipboardList },
];

export default function AgreementsHub() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [ov, setOv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, overview] = await Promise.all([
        api.get('/wt-agreement-hub'),
        api.get('/wt-agreement-hub/overview').catch(() => ({ data: null })),
      ]);
      setRows(list.data || []);
      setOv(overview.data);
    } catch (e) { toast.err(errText(e, 'Could not load the agreements register')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    FAMILIES.forEach((f) => { c[f.label] = rows.filter((r) => r.family === f.key).length; });
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const fam = FAMILIES.find((f) => f.label === tab)?.key;
    return rows.filter((r) => (tab === 'All' || r.family === fam)
      && (!awaitingOnly || (!r.fully_signed && r.pending_count > 0))
      && (!term || [r.envelope_code, r.title, ...(r.signers || []).map((s) => s.name)]
        .some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q, awaitingOnly]);

  const resend = async (row, signerId) => {
    setBusy(`resend-${row.id}`);
    try {
      const { data } = await api.post(`/wt-agreement-hub/${row.id}/resend`, signerId ? { signer_id: signerId } : {});
      const url = `${window.location.origin}${data.signing_path}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast.ok(`Fresh link issued for ${data.signer.name} — copied to the clipboard`);
      await load();
    } catch (e) { toast.err(errText(e, 'Could not resend')); }
    finally { setBusy(''); }
  };

  const downloadSigned = async (row) => {
    setBusy(`dl-${row.id}`);
    try {
      // Confirm it is actually complete before handing over a "signed" copy.
      const { data } = await api.get(`/wt-agreement-hub/${row.id}/signed`);
      const w = window.open('', '_blank');
      if (w) { w.document.write(data.html); w.document.close(); }
      else toast.err('Allow pop-ups to view the signed agreement.');
    } catch (e) {
      const d = e?.response?.data;
      if (d?.unsigned_parties?.length) {
        // eslint-disable-next-line no-alert
        if (window.confirm(`${d.error}\n\nStill waiting on: ${d.unsigned_parties.join(', ')}.\n\nOpen the partially-signed copy anyway?`)) {
          const { data: forced } = await api.get(`/wt-agreement-hub/${row.id}/signed`, { params: { force: true } });
          const w = window.open('', '_blank');
          if (w) { w.document.write(forced.html); w.document.close(); }
        }
      } else toast.err(errText(e, 'Could not build the signed copy'));
    } finally { setBusy(''); }
  };

  const voidIt = async (row) => {
    // eslint-disable-next-line no-alert
    const reason = window.prompt(`Void ${row.envelope_code}? Give a reason — it stays on the record.`);
    if (reason === null) return;
    setBusy(`void-${row.id}`);
    try { await api.post(`/wt-agreement-hub/${row.id}/void`, { reason }); toast.ok(`${row.envelope_code} voided`); await load(); }
    catch (e) { toast.err(errText(e, 'Could not void it')); }
    finally { setBusy(''); }
  };

  return (
    <>
      <WtHead
        title="Agreements"
        subtitle="Every Water Tank document out for signature — client, provider and work order"
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => nav('/agreements/water-tank-customer')}>
          <Users size={14} /> New client agreement
        </button>
        <button className="wt-btn primary" onClick={() => nav('/agreements/water-tank-provider/new')}>
          <HardHat size={14} /> New provider agreement
        </button>
      </WtHead>

      {ov && (
        <div className="wt-pkpis" style={{ marginBottom: 16 }}>
          <Kpi icon={FileSignature} tone="accent" label="Agreements" value={ov.total}
            sub={`${ov.fully_signed} fully executed`} />
          <Kpi icon={Clock} tone={ov.signatures_outstanding > 0 ? 'amber' : 'green'}
            label="Signatures outstanding" value={ov.signatures_outstanding}
            sub={`across ${ov.awaiting} agreement(s)`} />
          <Kpi icon={ShieldCheck} tone="green" label="Fully executed" value={ov.fully_signed}
            sub="All parties signed" />
          <Kpi icon={CalendarClock} tone={ov.expiring_soon > 0 ? 'amber' : 'slate'}
            label="Expiring within 7 days" value={ov.expiring_soon}
            sub={ov.expired ? `${ov.expired} already expired` : 'None expired'} />
          <Kpi icon={AlertTriangle} tone={ov.declined > 0 ? 'red' : 'slate'} label="Declined" value={ov.declined}
            sub={`${ov.voided} voided`} />
          <div className="wt-card wt-pkpi tone-slate">
            <span className="tx" style={{ width: '100%' }}>
              <span className="lb">By type</span>
              {(ov.by_family || []).map((f) => (
                <span key={f.family} style={{ fontSize: 11.5, color: 'var(--wt-muted)', display: 'block' }}>
                  {f.label}: <strong style={{ color: 'var(--wt-ink)' }}>{f.total}</strong>
                  {f.awaiting > 0 && <span style={{ color: 'var(--wt-amber)' }}> · {f.awaiting} awaiting</span>}
                </span>
              ))}
            </span>
          </div>
        </div>
      )}

      <WtTabs tabs={['All', ...FAMILIES.map((f) => f.label)]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-filterbar">
        <label className="wt-search" style={{ width: 320 }}>
          <Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by reference, title or signatory…" />
        </label>
        <label className="wt-toggle">
          <input type="checkbox" checked={awaitingOnly} onChange={(e) => setAwaitingOnly(e.target.checked)} />
          Awaiting a signature only
        </label>
        {(q || awaitingOnly) && <button className="wt-btn sm" onClick={() => { setQ(''); setAwaitingOnly(false); }}>Clear</button>}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted)' }}>{shown.length} of {rows.length}</span>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : (
          <table className="wt-tbl">
            <thead><tr>
              <th style={{ width: 150 }}>Reference</th>
              <th>Document</th>
              <th style={{ width: 230 }}>Parties signed</th>
              <th style={{ width: 180 }}>Waiting on</th>
              <th style={{ width: 120 }}>Status</th>
              <th style={{ width: 210 }} />
            </tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="id">{r.envelope_code}</span>
                    <div style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{r.family_label}</div>
                  </td>
                  <td>
                    <strong style={{ display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </strong>
                    <span style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                      {r.sent_at ? `Sent ${dateFmt(r.sent_at)}` : 'Not sent'}
                      {r.completed_at ? ` · executed ${dateFmt(r.completed_at)}` : ''}
                    </span>
                    {r.expired && <span className="wt-tag red">Expired</span>}
                    {!r.expired && r.expiring_soon && <span className="wt-tag amber">Expires in {r.expires_in_days}d</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{r.signed_count} / {r.total_signers}</strong>
                      <div className="wt-progress" style={{ maxWidth: 90 }}>
                        <span style={{ width: `${r.progress_pct}%`, background: r.fully_signed ? 'var(--wt-green)' : 'var(--wt-accent)' }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
                      {(r.signers || []).map((s) => (
                        <span key={s.id} title={`${s.name} — ${s.status}`}
                          style={{
                            display: 'inline-grid', placeItems: 'center', width: 17, height: 17, borderRadius: 4,
                            fontSize: 9, fontWeight: 800,
                            background: s.status === 'signed' ? 'var(--wt-green)' : s.status === 'declined' ? 'var(--wt-red)' : '#e2e8f0',
                            color: s.status === 'signed' || s.status === 'declined' ? '#fff' : 'var(--wt-muted)',
                          }}>
                          {s.status === 'signed' ? <Check size={10} /> : s.status === 'declined' ? <X size={10} /> : s.order}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    {r.fully_signed
                      ? <span style={{ fontSize: 12, color: 'var(--wt-green)', fontWeight: 700 }}>All parties signed</span>
                      : r.awaiting
                        ? <><strong style={{ fontSize: 12.5, display: 'block' }}>{r.awaiting.name}</strong>
                          <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>{String(r.awaiting.role || '').replace(/_/g, ' ')}</span></>
                        : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                  </td>
                  <td><Pill value={r.status} sm /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="wt-btn sm" onClick={() => setOpen(r)}><Eye size={12} /> Open</button>
                      {r.can_resend && (
                        <button className="wt-btn sm" disabled={busy === `resend-${r.id}`} onClick={() => resend(r)}>
                          {busy === `resend-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Send size={12} />} Resend
                        </button>
                      )}
                      <button className={`wt-btn sm${r.can_download_signed ? ' primary' : ''}`}
                        disabled={busy === `dl-${r.id}`} onClick={() => downloadSigned(r)}
                        title={r.can_download_signed ? 'Signed agreement with signatures' : 'Not fully signed yet'}>
                        {busy === `dl-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Download size={12} />} Signed
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr className="wt-empty-row"><td colSpan={6}>
                  {q || awaitingOnly ? 'Nothing matches those filters.' : `No agreements under “${tab}”.`}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <AgreementDrawer
          row={open} onClose={() => setOpen(null)}
          onResend={(signerId) => resend(open, signerId)}
          onDownload={() => downloadSigned(open)}
          onVoid={() => { voidIt(open); setOpen(null); }}
          busy={busy}
        />
      )}
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'slate' }) {
  return (
    <div className={`wt-card wt-pkpi tone-${tone}`}>
      <span className="ic"><Icon /></span>
      <span className="tx">
        <span className="lb">{label}</span><span className="vl">{value}</span>
        {sub && <span className="sb">{sub}</span>}
      </span>
    </div>
  );
}

/* Per-party detail: who, when, and the individual resend / copy-link. */
function AgreementDrawer({ row, onClose, onResend, onDownload, onVoid, busy }) {
  const copyLink = (s) => {
    const url = `${window.location.origin}${s.signing_path}`;
    navigator.clipboard?.writeText(url).then(() => toast.ok(`Link for ${s.name} copied`)).catch(() => {});
  };
  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true">
        <div className="wt-modal-head">
          <div>
            <h3>{row.envelope_code}</h3>
            <div className="sub">{row.family_label} · {row.title}</div>
          </div>
          <button className="wt-modal-x" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          <div className={row.fully_signed ? 'wt-note' : 'wt-warn'}>
            {row.fully_signed
              ? <><ShieldCheck size={15} /> Fully executed — all {row.total_signers} parties signed{row.completed_at ? ` on ${dateFmt(row.completed_at)}` : ''}.</>
              : <><Clock size={15} /> {row.signed_count} of {row.total_signers} signed. Waiting on {row.awaiting?.name || 'the remaining parties'}.</>}
          </div>

          <div>
            <div className="wt-sec-title" style={{ marginBottom: 10 }}>Signing parties, in order</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(row.signers || []).map((s) => {
                const signed = s.status === 'signed';
                const declined = s.status === 'declined';
                return (
                  <div key={s.id} className={`wt-liferow${signed ? ' done' : ''}`} style={{ cursor: 'default' }}>
                    <span className="tick" style={declined ? { background: 'var(--wt-red)', borderColor: 'var(--wt-red)' } : undefined}>
                      {signed ? <Check size={14} /> : declined ? <X size={14} /> : null}
                    </span>
                    <span className="tx">
                      <span className="t">{s.order}. {s.name}</span>
                      <span className="h">
                        {String(s.role || '').replace(/_/g, ' ')}{s.email ? ` · ${s.email}` : ''}
                        {signed && s.signed_at ? ` · signed ${dateTimeFmt(s.signed_at)}` : ''}
                        {declined && s.declined_reason ? ` · ${s.declined_reason}` : ''}
                      </span>
                    </span>
                    {!signed && !declined && (
                      <>
                        <button className="wt-btn sm" onClick={() => copyLink(s)}><Copy size={12} /> Link</button>
                        <button className="wt-btn sm" disabled={!!busy} onClick={() => onResend(s.id)}>
                          <Send size={12} /> Resend
                        </button>
                      </>
                    )}
                    {signed && <span className="wt-tag" style={{ background: 'var(--wt-green-bg)', color: 'var(--wt-green)' }}>Signed</span>}
                    {declined && <span className="wt-tag red">Declined</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wt-grid3">
            {[['Sent', row.sent_at && dateFmt(row.sent_at)],
              ['Executed', row.completed_at && dateFmt(row.completed_at)],
              ['Expires', row.expires_at && `${dateFmt(row.expires_at)}${row.expires_in_days != null ? ` (${row.expires_in_days}d)` : ''}`],
            ].map(([k, v]) => (
              <div className="wt-field" key={k}><label>{k}</label>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</div></div>
            ))}
          </div>

          {row.content_hash && (
            <div style={{ fontSize: 11, color: 'var(--wt-muted)', wordBreak: 'break-all' }}>
              <strong>Content hash:</strong> {row.content_hash}
              <div style={{ marginTop: 2 }}>The electronic record, audit trail and this hash constitute proof of execution.</div>
            </div>
          )}
        </div>

        <div className="wt-modal-foot">
          {row.can_void && <button className="wt-btn danger-ghost" onClick={onVoid}><Ban size={14} /> Void</button>}
          <button className="wt-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
          <button className={`wt-btn${row.can_download_signed ? ' primary' : ''}`} onClick={onDownload}>
            <Download size={14} /> {row.fully_signed ? 'Signed agreement' : 'View current copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
