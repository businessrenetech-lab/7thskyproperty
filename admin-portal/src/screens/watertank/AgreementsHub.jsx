import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSignature, Users, HardHat, ClipboardList, Search, Send, Eye, Download, Ban,
  Check, Clock, AlertTriangle, Copy, RefreshCw, Loader2, X, ShieldCheck, CalendarClock,
  Plus, Sparkles, Mail,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CustomerAgreementBuilder } from '../WtCustomerAgreements';
import { useSvcNav, WtHead, WtTabs, Pill, Loading, EmptyState, dateFmt, dateTimeFmt, toast, errText, svcProfile, svcBase } from './common';

function getClientSigner(r) {
  if (r.client_name || r.client_email) {
    return { name: r.client_name, email: r.client_email, role: r.client_role || 'client' };
  }
  const signers = r.signers || [];
  return signers.find((s) => ['client', 'customer', 'tenant', 'buyer', 'landlord'].includes(s.role))
    || signers.find((s) => !['staff_countersign', 'witness', 'internal_approver'].includes(s.role))
    || signers[0]
    || null;
}

/*
 * Agreements register — central signing console for every agreement out for
 * signature in the active service line: Client Agreements, Provider Agreements,
 * and Work Order Agreements.
 *
 * For internal-only service lines (such as Residential Interior Design where
 * Seventh Sky delivers/coordinates in-house, no_provider: true), provider
 * tabs, buttons and breakdown entries are cleanly suppressed.
 */

const ALL_FAMILIES = [
  { key: 'client', label: 'Client Agreements', icon: Users, desc: 'Customer Service Agreements' },
  { key: 'provider', label: 'Provider Agreements', icon: HardHat, desc: 'Master Service Delivery Provider Agreements' },
  { key: 'work_order', label: 'Work Orders', icon: ClipboardList, desc: 'Project Work Order Execution Agreements' },
];

export default function AgreementsHub() {
  const nav = useSvcNav();
  const { user } = useAuth();
  const profile = svcProfile();
  const isInternalOnly = Boolean(profile.internal_team || profile.no_provider);

  const families = useMemo(() => {
    return isInternalOnly ? ALL_FAMILIES.filter((f) => f.key !== 'provider') : ALL_FAMILIES;
  }, [isInternalOnly]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [showNewAgreementWindow, setShowNewAgreementWindow] = useState(() => {
    return searchParams.get('new') === 'client' || searchParams.get('new') === 'customer';
  });
  const projectCode = searchParams.get('project') || null;

  const [rows, setRows] = useState([]);
  const [ov, setOv] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');
  const [q, setQ] = useState('');
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');

  const closeNewAgreementWindow = useCallback(() => {
    setShowNewAgreementWindow(false);
    if (searchParams.get('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const openNewAgreementWindow = useCallback(() => {
    setShowNewAgreementWindow(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, overview] = await Promise.all([
        api.get('/wt-agreement-hub'),
        api.get('/wt-agreement-hub/overview').catch(() => ({ data: null })),
      ]);
      setRows(list.data || []);
      setOv(overview.data);
    } catch (e) {
      toast.err(errText(e, 'Could not load the agreements register'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { All: rows.length };
    families.forEach((f) => { c[f.label] = rows.filter((r) => r.family === f.key).length; });
    return c;
  }, [rows, families]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const fam = families.find((f) => f.label === tab)?.key;
    return rows.filter((r) => (tab === 'All' || r.family === fam)
      && (!awaitingOnly || (!r.fully_signed && r.pending_count > 0))
      && (!term || [
        r.envelope_code,
        r.title,
        r.client_name,
        r.client_email,
        ...(r.signers || []).flatMap((s) => [s.name, s.email]),
      ].some((v) => String(v || '').toLowerCase().includes(term))));
  }, [rows, tab, q, awaitingOnly, families]);

  const resend = async (row, signerId) => {
    setBusy(`resend-${row.id}`);
    try {
      const { data } = await api.post(`/wt-agreement-hub/${row.id}/resend`, signerId ? { signer_id: signerId } : {});
      const url = `${window.location.origin}${data.signing_path}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast.ok(`Fresh link issued for ${data.signer.name} — copied to the clipboard`);
      await load();
    } catch (e) {
      toast.err(errText(e, 'Could not resend'));
    } finally {
      setBusy('');
    }
  };

  const countersign = async (row, awaitingParty) => {
    const signer = awaitingParty || (row.signers || []).find((s) => s.role === 'staff_countersign' && s.status !== 'signed' && s.status !== 'declined');
    if (!signer) return;
    try {
      const { data } = await api.post(`/wt-agreement-hub/${row.id}/signing-link/${signer.id}`);
      const url = `${window.location.origin}${data.signing_path}`;
      const w = window.open(url, '_blank', 'noopener');
      if (!w) {
        await navigator.clipboard?.writeText(url).catch(() => {});
        toast.ok('Pop-up blocked — signing link copied to clipboard instead');
      }
    } catch (e) {
      toast.err(errText(e, 'Could not open signing page'));
    }
  };

  const downloadSigned = async (row) => {
    setBusy(`dl-${row.id}`);
    try {
      // Confirm it is actually complete before handing over a "signed" copy.
      const { data } = await api.get(`/wt-agreement-hub/${row.id}/signed`);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(data.html);
        w.document.close();
      } else {
        toast.err('Allow pop-ups to view the signed agreement.');
      }
    } catch (e) {
      const d = e?.response?.data;
      if (d?.unsigned_parties?.length) {
        // eslint-disable-next-line no-alert
        if (window.confirm(`${d.error}\n\nStill waiting on: ${d.unsigned_parties.join(', ')}.\n\nOpen the partially-signed copy anyway?`)) {
          const { data: forced } = await api.get(`/wt-agreement-hub/${row.id}/signed`, { params: { force: true } });
          const w = window.open('', '_blank');
          if (w) { w.document.write(forced.html); w.document.close(); }
        }
      } else {
        toast.err(errText(e, 'Could not build the signed copy'));
      }
    } finally {
      setBusy('');
    }
  };

  const voidIt = async (row) => {
    // eslint-disable-next-line no-alert
    const reason = window.prompt(`Void ${row.envelope_code}? Give a reason — it stays on the record.`);
    if (reason === null) return;
    setBusy(`void-${row.id}`);
    try {
      await api.post(`/wt-agreement-hub/${row.id}/void`, { reason });
      toast.ok(`${row.envelope_code} voided`);
      await load();
    } catch (e) {
      toast.err(errText(e, 'Could not void it'));
    } finally {
      setBusy('');
    }
  };

  const copyCode = async (code, e) => {
    e?.stopPropagation?.();
    await navigator.clipboard?.writeText(code).catch(() => {});
    toast.ok(`Copied ${code}`);
  };

  return (
    <>
      <WtHead
        title="Agreements"
        subtitle={
          isInternalOnly
            ? `Every ${profile.label} document out for signature — customer agreements and project work orders`
            : `Every ${profile.label} document out for signature — client, provider and work order`
        }
      >
        <button className="wt-btn" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'wt-spin' : ''} /> Refresh
        </button>
        <button className="wt-btn primary" onClick={openNewAgreementWindow}>
          <Users size={14} /> New client agreement
        </button>
        {!isInternalOnly && (
          <button className="wt-btn" onClick={() => nav(`${svcBase()}/agreements/provider/new`)}>
            <HardHat size={14} /> New provider agreement
          </button>
        )}
      </WtHead>

      {ov && (
        <div className="wt-pkpis" style={{ marginBottom: 16 }}>
          <Kpi
            icon={FileSignature}
            tone="accent"
            label="Total Agreements"
            value={ov.total}
            sub={`${ov.fully_signed} fully executed`}
          />
          <Kpi
            icon={Clock}
            tone={ov.signatures_outstanding > 0 ? 'amber' : 'green'}
            label="Signatures Outstanding"
            value={ov.signatures_outstanding}
            sub={`across ${ov.awaiting} agreement(s)`}
          />
          <Kpi
            icon={ShieldCheck}
            tone="green"
            label="Fully Executed"
            value={ov.fully_signed}
            sub="All parties signed"
          />
          <Kpi
            icon={CalendarClock}
            tone={ov.expiring_soon > 0 ? 'amber' : 'slate'}
            label="Expiring in 7 Days"
            value={ov.expiring_soon}
            sub={ov.expired ? `${ov.expired} already expired` : 'None expired'}
          />
          <Kpi
            icon={AlertTriangle}
            tone={ov.declined > 0 ? 'red' : 'slate'}
            label="Declined / Voided"
            value={ov.declined}
            sub={`${ov.voided} voided`}
          />
          <div className="wt-card wt-pkpi tone-slate">
            <span className="tx" style={{ width: '100%' }}>
              <span className="lb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>By Family</span>
                {profile.doc_code && (
                  <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 4, background: 'var(--wt-accent-tint, rgba(147, 51, 234, 0.12))', color: 'var(--wt-accent-ink, #9333ea)', fontWeight: 700 }}>
                    {profile.doc_code}
                  </span>
                )}
              </span>
              {(ov.by_family || [])
                .filter((f) => !isInternalOnly || f.family !== 'provider')
                .map((f) => (
                  <span key={f.family} style={{ fontSize: 11.5, color: 'var(--wt-muted)', display: 'block', marginTop: 2 }}>
                    {f.label}: <strong style={{ color: 'var(--wt-ink)' }}>{f.total}</strong>
                    {f.awaiting > 0 && <span style={{ color: 'var(--wt-amber)', fontWeight: 600 }}> · {f.awaiting} awaiting</span>}
                  </span>
                ))}
            </span>
          </div>
        </div>
      )}

      <WtTabs tabs={['All', ...families.map((f) => f.label)]} value={tab} onChange={setTab} counts={counts} />

      <div className="wt-filterbar">
        <label className="wt-search" style={{ width: 340 }}>
          <Search />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by reference, title or signatory…"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer', color: 'var(--wt-muted)' }}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <label className="wt-toggle" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={awaitingOnly}
            onChange={(e) => setAwaitingOnly(e.target.checked)}
          />
          Awaiting signature only
        </label>
        {(q || awaitingOnly) && (
          <button className="wt-btn sm" onClick={() => { setQ(''); setAwaitingOnly(false); }}>
            Reset filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted)' }}>
          Showing <strong>{shown.length}</strong> of {rows.length}
        </span>
      </div>

      <div className="wt-card wt-tblcard">
        {loading ? <Loading /> : (
          <table className="wt-tbl">
            <thead>
              <tr>
                <th style={{ width: 170 }}>Reference &amp; Type</th>
                <th style={{ width: 220 }}>Client &amp; Email</th>
                <th>Document &amp; Scope</th>
                <th style={{ width: 200 }}>Parties Signed</th>
                <th style={{ width: 200 }}>Waiting On</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 200, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        className="id"
                        style={{ fontFamily: 'ui-monospace, monospace', cursor: 'pointer', letterSpacing: '0.02em' }}
                        onClick={(e) => copyCode(r.envelope_code, e)}
                        title="Click to copy envelope code"
                      >
                        {r.envelope_code}
                      </span>
                      <button
                        className="wt-btn sm"
                        style={{ padding: 2, height: 20, width: 20, border: 'none', background: 'transparent' }}
                        onClick={(e) => copyCode(r.envelope_code, e)}
                        title="Copy code"
                      >
                        <Copy size={11} style={{ color: 'var(--wt-muted)' }} />
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--wt-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          background: r.family === 'client'
                            ? 'var(--wt-accent-tint, rgba(147, 51, 234, 0.12))'
                            : r.family === 'work_order'
                            ? 'rgba(217, 119, 6, 0.12)'
                            : '#f1f5f9',
                          color: r.family === 'client'
                            ? 'var(--wt-accent-ink, #9333ea)'
                            : r.family === 'work_order'
                            ? 'var(--wt-amber)'
                            : 'var(--wt-ink-2)',
                        }}
                      >
                        {r.family_label}
                      </span>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const client = getClientSigner(r);
                      if (!client?.name) {
                        return <span className="muted" style={{ fontSize: 12, color: 'var(--wt-muted)' }}>—</span>;
                      }
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong
                              style={{
                                fontSize: 13,
                                color: 'var(--wt-ink, #0f172a)',
                                fontWeight: 700,
                              }}
                            >
                              {client.name}
                            </strong>
                          </div>
                          {client.email ? (
                            <a
                              href={`mailto:${client.email}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                fontSize: 11.5,
                                color: 'var(--wt-accent, #9333ea)',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4.5,
                                marginTop: 1,
                              }}
                              title={`Email: ${client.email}`}
                            >
                              <Mail size={12} style={{ color: 'var(--wt-muted, #94a3b8)', flexShrink: 0 }} />
                              <span style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {client.email}
                              </span>
                            </a>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>No email</span>
                          )}
                        </div>
                      );
                    })()}
                  </td>
                  <td>
                    <strong
                      style={{
                        display: 'block',
                        maxWidth: 320,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--wt-ink)',
                      }}
                      title={r.title}
                    >
                      {r.title}
                    </strong>
                    <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {r.sent_at ? <span>Sent {dateFmt(r.sent_at)}</span> : <span>Not sent</span>}
                      {r.completed_at ? <span>· Executed {dateFmt(r.completed_at)}</span> : null}
                      {r.expired && <span className="wt-tag red" style={{ fontSize: 10 }}>Expired</span>}
                      {!r.expired && r.expiring_soon && (
                        <span className="wt-tag amber" style={{ fontSize: 10 }}>Expires in {r.expires_in_days}d</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 12.5 }}>{r.signed_count} / {r.total_signers}</strong>
                      <span style={{ fontSize: 11, color: 'var(--wt-muted)' }}>({r.progress_pct}%)</span>
                      <div className="wt-progress" style={{ maxWidth: 80, flex: 1 }}>
                        <span
                          style={{
                            width: `${r.progress_pct}%`,
                            background: r.fully_signed ? 'var(--wt-green)' : 'var(--wt-accent, #9333ea)',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      {(r.signers || []).map((s) => {
                        const signed = s.status === 'signed';
                        const declined = s.status === 'declined';
                        const isNext = !signed && !declined && r.awaiting?.name === s.name;
                        return (
                          <span
                            key={s.id}
                            title={`${s.order}. ${s.name} (${String(s.role || '').replace(/_/g, ' ')}) — ${s.status}${s.signed_at ? ` on ${dateTimeFmt(s.signed_at)}` : ''}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 19,
                              height: 19,
                              borderRadius: 5,
                              fontSize: 9.5,
                              fontWeight: 800,
                              background: signed
                                ? 'var(--wt-green)'
                                : declined
                                ? 'var(--wt-red)'
                                : isNext
                                ? 'var(--wt-accent-tint, rgba(147, 51, 234, 0.12))'
                                : '#f1f5f9',
                              border: isNext ? '1.5px solid var(--wt-accent, #9333ea)' : '1px solid transparent',
                              color: signed || declined ? '#fff' : isNext ? 'var(--wt-accent-ink, #9333ea)' : 'var(--wt-muted)',
                              cursor: 'default',
                            }}
                          >
                            {signed ? <Check size={11} strokeWidth={3} /> : declined ? <X size={11} strokeWidth={3} /> : s.order}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>
                    {r.fully_signed ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--wt-green)', fontWeight: 700, fontSize: 12 }}>
                        <ShieldCheck size={14} /> All parties signed
                      </div>
                    ) : r.awaiting ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 12.5, color: 'var(--wt-ink)' }}>{r.awaiting.name}</strong>
                          {r.awaiting.role === 'staff_countersign' && (
                            <button
                              className="wt-btn sm primary"
                              style={{ padding: '2px 8px', fontSize: 10.5, fontWeight: 700, height: 21 }}
                              onClick={() => countersign(r, r.awaiting)}
                              title="Countersign directly as Seventh Sky officer"
                            >
                              <FileSignature size={11} /> Countersign
                            </button>
                          )}
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--wt-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: r.awaiting.role === 'staff_countersign' ? 'var(--wt-accent, #9333ea)' : 'var(--wt-amber)',
                            }}
                          />
                          {String(r.awaiting.role || '').replace(/_/g, ' ')}
                        </span>
                      </div>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    <Pill value={r.status} sm />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="wt-btn sm" onClick={() => setOpen(r)} title="Open detailed audit record">
                        <Eye size={12} /> Open
                      </button>
                      {r.can_resend && (
                        <button
                          className="wt-btn sm"
                          disabled={busy === `resend-${r.id}`}
                          onClick={() => resend(r)}
                          title="Resend signing invitation"
                        >
                          {busy === `resend-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Send size={12} />} Resend
                        </button>
                      )}
                      <button
                        className={`wt-btn sm${r.can_download_signed ? ' primary' : ''}`}
                        disabled={busy === `dl-${r.id}`}
                        onClick={() => downloadSigned(r)}
                        title={r.can_download_signed ? 'Download executed agreement with verified signatures' : 'View current agreement copy'}
                      >
                        {busy === `dl-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Download size={12} />}
                        {r.fully_signed ? 'Signed' : 'Preview'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!shown.length && (
                <tr className="wt-empty-row">
                  <td colSpan={7} style={{ textAlign: 'center', padding: 36 }}>
                    <div style={{ fontSize: 13, color: 'var(--wt-muted)', marginBottom: 8 }}>
                      {q || awaitingOnly ? 'Nothing matches those filters.' : `No agreements registered under “${tab}”.`}
                    </div>
                    {(q || awaitingOnly) && (
                      <button className="wt-btn sm" onClick={() => { setQ(''); setAwaitingOnly(false); }}>
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <AgreementDrawer
          row={open}
          onClose={() => setOpen(null)}
          onResend={(signerId) => resend(open, signerId)}
          onDownload={() => downloadSigned(open)}
          onVoid={() => { voidIt(open); setOpen(null); }}
          busy={busy}
          onCountersign={(signer) => countersign(open, signer)}
        />
      )}

      {showNewAgreementWindow && (
        <div
          className="wt-modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            overflow: 'hidden',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') closeNewAgreementWindow();
          }}
        >
          <div
            className="wt-modal"
            role="dialog"
            aria-modal="true"
            style={{
              width: '100%',
              maxWidth: '1600px',
              height: '96vh',
              maxHeight: '96vh',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.45)',
              overflow: 'hidden',
              background: '#f8fafc',
              border: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            {/* Window Top Title Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                background: '#0f172a',
                color: '#ffffff',
                borderBottom: '1px solid #1e293b',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: profile.accent ? `${profile.accent}33` : 'rgba(255,255,255,0.15)',
                    color: profile.accent || '#c084fc',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <FileSignature size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    New {profile.label} Client Agreement
                    <span
                      style={{
                        fontSize: 11,
                        background: 'rgba(255,255,255,0.15)',
                        color: '#e2e8f0',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      SSPC-{profile.doc_code || 'RIDS'}-CSA-01
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: '#4ade80',
                        background: 'rgba(74, 222, 128, 0.15)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontWeight: 600,
                      }}
                    >
                      In-Page Drafting Window
                    </span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
                    Draft, schedule pricing, and dispatch legal contract without leaving Agreements Hub
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={closeNewAgreementWindow}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 7,
                    color: '#f8fafc',
                    padding: '6px 14px',
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                  }}
                >
                  <X size={15} /> Close window
                </button>
              </div>
            </div>

            {/* Window Body: Scrollable CustomerAgreementBuilder */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
              <CustomerAgreementBuilder
                isModal
                user={user}
                profile={profile}
                projectCode={projectCode}
                onClose={closeNewAgreementWindow}
                onCancel={closeNewAgreementWindow}
                onDone={async () => {
                  closeNewAgreementWindow();
                  await load();
                  toast.ok('Client agreement dispatched — list updated');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'slate' }) {
  return (
    <div className={`wt-card wt-pkpi tone-${tone}`}>
      <span className="ic"><Icon /></span>
      <span className="tx">
        <span className="lb">{label}</span>
        <span className="vl">{value}</span>
        {sub && <span className="sb">{sub}</span>}
      </span>
    </div>
  );
}

/* Per-party detail: who, when, individual resend, copy-link and direct countersign */
function AgreementDrawer({ row, onClose, onResend, onDownload, onVoid, busy, onCountersign }) {
  const [copyingHash, setCopyingHash] = useState(false);

  const copyLink = async (s) => {
    try {
      const { data } = await api.post(`/wt-agreement-hub/${row.id}/signing-link/${s.id}`);
      const url = `${window.location.origin}${data.signing_path}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast.ok(`Link for ${s.name} copied — treat it as their signature`);
    } catch (e) {
      toast.err(errText(e, 'Could not issue the signing link'));
    }
  };

  const copyHash = async () => {
    if (!row.content_hash) return;
    setCopyingHash(true);
    await navigator.clipboard?.writeText(row.content_hash).catch(() => {});
    toast.ok('Content hash copied to clipboard');
    setTimeout(() => setCopyingHash(false), 1500);
  };

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 640 }}>
        <div className="wt-modal-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>{row.envelope_code}</h3>
              <Pill value={row.status} sm />
            </div>
            <div className="sub" style={{ marginTop: 4 }}>
              {row.family_label} · {row.title}
            </div>
          </div>
          <button className="wt-modal-x" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          <div className={row.fully_signed ? 'wt-note' : 'wt-warn'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {row.fully_signed ? (
              <>
                <ShieldCheck size={18} style={{ color: 'var(--wt-green)', flexShrink: 0 }} />
                <div>
                  <strong>Fully executed.</strong> All {row.total_signers} parties signed
                  {row.completed_at ? ` on ${dateTimeFmt(row.completed_at)}` : ''}.
                </div>
              </>
            ) : (
              <>
                <Clock size={18} style={{ color: 'var(--wt-amber)', flexShrink: 0 }} />
                <div>
                  <strong>Awaiting signatures.</strong> {row.signed_count} of {row.total_signers} completed.
                  {row.awaiting && (
                    <span> Next awaiting: <strong>{row.awaiting.name}</strong> ({String(row.awaiting.role || '').replace(/_/g, ' ')}).</span>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            <div className="wt-sec-title" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Signing Parties Sequence</span>
              <span style={{ fontSize: 11.5, color: 'var(--wt-muted)', fontWeight: 500 }}>
                {row.signed_count} of {row.total_signers} signed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(row.signers || []).map((s) => {
                const signed = s.status === 'signed';
                const declined = s.status === 'declined';
                return (
                  <div
                    key={s.id}
                    className={`wt-liferow${signed ? ' done' : ''}`}
                    style={{
                      cursor: 'default',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--wt-line)',
                      background: signed ? 'var(--wt-green-bg)' : '#fff',
                    }}
                  >
                    <span
                      className="tick"
                      style={
                        declined
                          ? { background: 'var(--wt-red)', borderColor: 'var(--wt-red)' }
                          : signed
                          ? { background: 'var(--wt-green)', borderColor: 'var(--wt-green)' }
                          : { borderColor: 'var(--wt-line)', color: 'var(--wt-muted)' }
                      }
                    >
                      {signed ? <Check size={14} color="#fff" strokeWidth={3} /> : declined ? <X size={14} color="#fff" strokeWidth={3} /> : s.order}
                    </span>
                    <span className="tx" style={{ flex: 1, minWidth: 0 }}>
                      <span className="t" style={{ fontWeight: 650, color: 'var(--wt-ink)' }}>
                        {s.order}. {s.name}
                      </span>
                      <span className="h" style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--wt-ink-2)' }}>
                          {String(s.role || '').replace(/_/g, ' ')}
                        </span>
                        {s.email ? ` · ${s.email}` : ''}
                        {signed && s.signed_at ? ` · signed ${dateTimeFmt(s.signed_at)}` : ''}
                        {declined && s.declined_reason ? ` · ${s.declined_reason}` : ''}
                      </span>
                    </span>
                    {!signed && !declined && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {s.role === 'staff_countersign' && (
                          <button
                            className="wt-btn sm primary"
                            onClick={() => onCountersign(s)}
                            title="Countersign immediately in a new tab"
                          >
                            <FileSignature size={12} /> Countersign as Seventh Sky
                          </button>
                        )}
                        <button className="wt-btn sm" onClick={() => copyLink(s)} title="Copy secure signing link">
                          <Copy size={12} /> Link
                        </button>
                        <button
                          className="wt-btn sm"
                          disabled={!!busy}
                          onClick={() => onResend(s.id)}
                          title="Re-send email invitation"
                        >
                          <Send size={12} /> Resend
                        </button>
                      </div>
                    )}
                    {signed && (
                      <span
                        className="wt-tag"
                        style={{ background: 'rgba(5, 150, 105, 0.15)', color: 'var(--wt-green)', fontWeight: 700 }}
                      >
                        Signed
                      </span>
                    )}
                    {declined && <span className="wt-tag red">Declined</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="wt-grid3" style={{ marginTop: 12 }}>
            {[
              ['Sent Date', row.sent_at && dateFmt(row.sent_at)],
              ['Execution Date', row.completed_at && dateFmt(row.completed_at)],
              [
                'Validity / Expiry',
                row.expires_at && `${dateFmt(row.expires_at)}${row.expires_in_days != null ? ` (${row.expires_in_days}d remaining)` : ''}`,
              ],
            ].map(([k, v]) => (
              <div className="wt-field" key={k}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-muted)' }}>{k}</label>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-ink)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>

          {row.content_hash && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px solid var(--wt-line)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wt-ink)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cryptographic Integrity Hash (SHA-256)
                </span>
                <button
                  className="wt-btn sm"
                  style={{ padding: '2px 8px', height: 22, fontSize: 11 }}
                  onClick={copyHash}
                >
                  <Copy size={11} /> {copyingHash ? 'Copied' : 'Copy Hash'}
                </button>
              </div>
              <code style={{ display: 'block', fontSize: 11, color: 'var(--wt-muted)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {row.content_hash}
              </code>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--wt-muted)' }}>
                The electronic record, audit trail and this cryptographic digest constitute conclusive proof of agreement terms and execution.
              </div>
            </div>
          )}
        </div>

        <div className="wt-modal-foot">
          {row.can_void && (
            <button className="wt-btn danger-ghost" onClick={onVoid}>
              <Ban size={14} /> Void agreement
            </button>
          )}
          <button className="wt-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Close
          </button>
          <button className={`wt-btn${row.can_download_signed ? ' primary' : ''}`} onClick={onDownload}>
            <Download size={14} /> {row.fully_signed ? 'Download signed copy' : 'Preview current agreement'}
          </button>
        </div>
      </div>
    </div>
  );
}
