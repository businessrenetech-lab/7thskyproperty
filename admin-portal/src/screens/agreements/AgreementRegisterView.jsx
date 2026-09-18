// admin-portal/src/screens/agreements/AgreementRegisterView.jsx
//
// Unified Agreements Register & In-Page Drafting Shell.
// Replicates the high-density Services Agreements Register (AgreementsHub) 1:1
// across Property Management (RPRM, RPTM) and Sales (RPSS, RPPS, CPSS, CPPS).

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileSignature, Users, Search, Send, Eye, Download, Ban, Check, Clock,
  AlertTriangle, Copy, RefreshCw, Loader2, X, ShieldCheck, CalendarClock,
  Plus, Mail, Pencil, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import '../../styles/wt-scope.css';

export const bdt = (v) => '৳' + Number(v || 0).toLocaleString('en-BD');

export const dateFmt = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d).slice(0, 10);
  }
};

export const dateTimeFmt = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return String(d).slice(0, 16);
  }
};

const daysTo = (d) => (d ? Math.ceil((new Date(d) - Date.now()) / 864e5) : null);
const eq = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

/**
 * Normalizes any raw agreement / signing envelope row into the uniform register shape.
 */
export function shapeAgreementRow(r) {
  const rawSigners = r.signers || [];
  const signers = rawSigners
    .slice()
    .sort((a, b) => (a.order || a.signer_order || 0) - (b.order || b.signer_order || 0))
    .map((s, idx) => ({
      id: s.id,
      order: s.order || s.signer_order || (idx + 1),
      role: s.role,
      name: s.name,
      email: s.email,
      status: s.status || 'pending',
      signed_at: s.signed_at || null,
      declined_reason: s.declined_reason || null,
    }));

  const signed = signers.filter((s) => eq(s.status, 'signed'));
  const declined = signers.filter((s) => eq(s.status, 'declined'));
  const pending = signers.filter((s) => !eq(s.status, 'signed') && !eq(s.status, 'declined'));
  const complete = r.status === 'completed' || r.status === 'active' || (signers.length > 0 && signed.length === signers.length);
  const expiresIn = daysTo(r.expires_at);

  const primarySigner = signers.find((s) => ['client', 'customer', 'tenant', 'buyer', 'landlord', 'seller', 'owner'].includes(s.role))
    || signers.find((s) => !['staff_countersign', 'witness', 'internal_approver', 'org', 'agency'].includes(s.role))
    || signers[0]
    || null;

  const clientName = r.client_name || primarySigner?.name || r.signer?.name || r.terms?.client?.full_name || null;
  const clientEmail = r.client_email || primarySigner?.email || r.signer?.email || r.terms?.client?.email || null;
  const clientRole = primarySigner?.role || r.signer?.role || 'client';

  const awaiting = !complete && pending[0] ? {
    id: pending[0].id,
    name: pending[0].name,
    email: pending[0].email,
    role: pending[0].role,
    order: pending[0].order,
  } : null;

  const contractVal = r.total_contract_value != null
    ? r.total_contract_value
    : (r.terms?.pricing_summary?.total_contract_value != null
      ? r.terms.pricing_summary.total_contract_value
      : (r.terms?.pricing?.summary?.total_contract_value != null ? r.terms.pricing.summary.total_contract_value : null));

  return {
    ...r,
    id: r.id,
    envelope_code: r.envelope_code,
    title: r.title || 'Agreement',
    status: r.status || 'draft',
    signers,
    signed_count: signed.length,
    total_signers: signers.length,
    pending_count: pending.length,
    declined_count: declined.length,
    fully_signed: complete,
    progress_pct: signers.length ? Math.round((signed.length / signers.length) * 100) : (complete ? 100 : 0),
    awaiting,
    client_name: clientName,
    client_email: clientEmail,
    client_role: clientRole,
    expires_in_days: expiresIn,
    expiring_soon: !complete && expiresIn != null && expiresIn >= 0 && expiresIn <= 7,
    expired: !complete && (eq(r.status, 'expired') || (expiresIn != null && expiresIn < 0)),
    can_resend: !complete && !['voided', 'declined', 'draft'].includes(r.status) && pending.length > 0,
    can_void: !['voided', 'declined'].includes(r.status),
    void_executed: complete,
    can_download_signed: complete,
    contract_value: contractVal,
  };
}

export default function AgreementRegisterView({
  title = 'Agreements',
  subtitle = 'Register of electronic agreements, signing parties, and execution records',
  docCode = 'SSPC-AGR-01',
  accent = '#0284c7',
  accentSoft = 'rgba(2, 132, 199, 0.12)',
  partyLabel = 'Client',
  newButtonLabel = 'New agreement',
  tabs = [],
  rows = [],
  loading = false,
  onRefresh,
  onNew,
  onEditDraft,
  onSendDraft,
  onReissue,
  toast,
  showBuilderModal = false,
  builderModalTitle = '',
  onCloseBuilderModal,
  renderBuilder,
}) {
  const [activeTab, setActiveTab] = useState('All');
  const [q, setQ] = useState('');
  const [awaitingOnly, setAwaitingOnly] = useState(false);
  const [drawerRow, setDrawerRow] = useState(null);
  const [busy, setBusy] = useState('');

  const shapedRows = useMemo(() => rows.map(shapeAgreementRow), [rows]);

  const overview = useMemo(() => {
    let signaturesOutstanding = 0;
    let awaitingCount = 0;
    let fullySignedCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let declinedCount = 0;
    let voidedCount = 0;

    shapedRows.forEach((r) => {
      if (r.fully_signed) {
        fullySignedCount++;
      } else {
        if (r.pending_count > 0) {
          signaturesOutstanding += r.pending_count;
          awaitingCount++;
        }
        if (r.expiring_soon) expiringSoonCount++;
        if (r.expired) expiredCount++;
      }
      if (eq(r.status, 'declined') || r.declined_count > 0) declinedCount++;
      if (eq(r.status, 'voided')) voidedCount++;
    });

    // Genuine families (exclude generic status filters)
    const statusKeys = ['all', 'awaiting', 'draft', 'drafts', 'completed', 'fully_signed', 'signed', 'declined', 'voided'];
    const genuineFamilyTabs = (tabs || []).filter((t) => {
      const k = String(t.key || t.label || '').toLowerCase();
      return !statusKeys.includes(k);
    });

    const byFamily = genuineFamilyTabs.map((t) => {
      const matched = shapedRows.filter((r) => (t.filterFn ? t.filterFn(r) : r.category === t.key || r.kind === t.key || r.family === t.key));
      const awaitingInFam = matched.filter((r) => !r.fully_signed && r.pending_count > 0).length;
      return {
        key: t.key,
        label: t.label,
        total: matched.length,
        awaiting: awaitingInFam,
      };
    });

    return {
      total: shapedRows.length,
      fully_signed: fullySignedCount,
      signatures_outstanding: signaturesOutstanding,
      awaiting: awaitingCount,
      expiring_soon: expiringSoonCount,
      expired: expiredCount,
      declined: declinedCount,
      voided: voidedCount,
      by_family: byFamily,
    };
  }, [shapedRows, tabs]);

  const normalizedTabs = useMemo(() => {
    let raw = tabs;
    if (!raw || !raw.length) {
      raw = [
        { key: 'all', label: 'All' },
        { key: 'awaiting', label: 'Awaiting Signature', filterFn: (r) => !r.fully_signed && r.pending_count > 0 && r.status !== 'voided' && r.status !== 'declined' },
        { key: 'draft', label: 'Drafts', filterFn: (r) => r.status === 'draft' },
        { key: 'completed', label: 'Fully Executed', filterFn: (r) => r.fully_signed || r.status === 'completed' || r.status === 'active' },
      ];
    }

    const seen = new Set();
    const result = [];

    // Ensure 'All' is present and first
    const hasAll = raw.some((t) => {
      const l = typeof t === 'string' ? t : (t.label || t.key || '');
      return l.trim().toLowerCase() === 'all';
    });
    if (!hasAll) {
      result.push({ key: 'all', label: 'All' });
      seen.add('all');
    }

    raw.forEach((t) => {
      const label = typeof t === 'string' ? t : (t.label || t.key || '');
      const key = typeof t === 'string' ? t.toLowerCase() : (t.key || label.toLowerCase());
      const normalizedKey = label.trim().toLowerCase();
      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey);
        result.push(typeof t === 'string' ? { key, label } : { ...t, key, label });
      }
    });

    return result;
  }, [tabs]);

  const tabCounts = useMemo(() => {
    const c = {};
    normalizedTabs.forEach((t) => {
      if (t.label.toLowerCase() === 'all' || t.key.toLowerCase() === 'all') {
        c[t.label] = shapedRows.length;
      } else if (t.filterFn) {
        c[t.label] = shapedRows.filter(t.filterFn).length;
      } else {
        c[t.label] = shapedRows.filter((r) => r.category === t.key || r.kind === t.key || r.family === t.key).length;
      }
    });
    return c;
  }, [shapedRows, normalizedTabs]);

  const shownRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const currentTabObj = normalizedTabs.find((t) => t.label.toLowerCase() === activeTab.toLowerCase()) || normalizedTabs[0];

    return shapedRows.filter((r) => {
      if (currentTabObj && currentTabObj.label.toLowerCase() !== 'all' && currentTabObj.key.toLowerCase() !== 'all') {
        const matchesTab = currentTabObj.filterFn
          ? currentTabObj.filterFn(r)
          : (r.category === currentTabObj.key || r.kind === currentTabObj.key || r.family === currentTabObj.key);
        if (!matchesTab) return false;
      }
      if (awaitingOnly && (r.fully_signed || r.pending_count === 0)) {
        return false;
      }
      if (!term) return true;
      return [
        r.envelope_code,
        r.title,
        r.client_name,
        r.client_email,
        ...(r.signers || []).flatMap((s) => [s.name, s.email]),
      ].some((v) => String(v || '').toLowerCase().includes(term));
    });
  }, [shapedRows, activeTab, normalizedTabs, awaitingOnly, q]);

  const copyCode = async (code, e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(code);
      toast?.success?.(`Copied ${code}`) || toast?.ok?.(`Copied ${code}`);
    } catch {
      window.prompt('Envelope Code:', code);
    }
  };

  const downloadSignedDoc = async (row) => {
    setBusy(`dl-${row.id}`);
    try {
      // 1. Try dedicated signed document endpoint with injected signatures
      try {
        const { data } = await api.get(`/signing/envelopes/${row.id}/signed`);
        if (data?.html) {
          const w = window.open('', '_blank');
          if (w) {
            w.document.write(data.html);
            w.document.close();
            return;
          }
        }
      } catch {}

      // 2. Try links endpoint
      const { data: linksData } = await api.get(`/signing/envelopes/${row.id}/links`);
      const payload = linksData?.data || linksData;
      const targetUrl = payload?.signed_document || payload?.active_link;
      if (targetUrl) {
        window.open(targetUrl.includes('?') ? `${targetUrl}&download=1` : `${targetUrl}?download=1`, '_blank');
        return;
      }

      // 3. Fall back to raw envelope document_html
      const { data: envData } = await api.get(`/signing/envelopes/${row.id}`);
      const rawHtml = envData?.data?.document_html || envData?.document_html;
      if (rawHtml) {
        const w = window.open('', '_blank');
        if (w) {
          w.document.write(rawHtml);
          w.document.close();
          return;
        }
      }
      toast?.error?.('Could not open the agreement document.');
    } catch (e) {
      toast?.error?.(e?.response?.data?.error || 'Could not fetch the agreement copy');
    } finally {
      setBusy('');
    }
  };

  const handleCountersign = async (row, awaitingParty) => {
    try {
      // Try dedicated signing-link endpoint
      try {
        const { data } = await api.post(`/signing/envelopes/${row.id}/signing-link/${awaitingParty?.id || ''}`);
        const link = data?.url || (data?.signing_path ? `${window.location.origin}${data.signing_path}` : null);
        if (link) {
          const w = window.open(link, '_blank', 'noopener');
          if (!w) {
            await navigator.clipboard.writeText(link);
            toast?.info?.('Pop-up blocked — signing link copied to clipboard');
          }
          return;
        }
      } catch {}

      // Fall back to links endpoint
      const { data } = await api.get(`/signing/envelopes/${row.id}/links`);
      const links = data?.data?.links || [];
      const staff = links.find((l) => ['staff_countersign', 'org', 'agency'].includes(l.role)) || links[0];
      if (staff?.link) {
        const w = window.open(staff.link, '_blank', 'noopener');
        if (!w) {
          await navigator.clipboard.writeText(staff.link);
          toast?.info?.('Signing link copied to clipboard');
        }
      } else {
        toast?.error?.('No active countersign link available');
      }
    } catch (e) {
      toast?.error?.(e?.response?.data?.error || 'Could not open signing page');
    }
  };

  const handleResend = async (row, signerId) => {
    setBusy(`resend-${row.id}`);
    try {
      if (signerId) {
        try {
          const { data } = await api.post(`/signing/envelopes/${row.id}/signing-link/${signerId}`);
          const url = data?.url || `${window.location.origin}${data?.signing_path}`;
          await navigator.clipboard.writeText(url);
          toast?.success?.(`Fresh link for ${data?.signer?.name || 'signatory'} copied to clipboard`);
          onRefresh?.();
          return;
        } catch {}
      }

      await api.post(`/signing/envelopes/${row.id}/remind`);
      toast?.success?.('Reminder email sent & links refreshed');
      onRefresh?.();
    } catch (e) {
      toast?.error?.(e?.response?.data?.error || 'Could not resend invitation');
    } finally {
      setBusy('');
    }
  };

  const handleVoid = async (row) => {
    const executed = row.void_executed || row.fully_signed;
    if (executed && !window.confirm(
      `${row.envelope_code} is a FULLY EXECUTED agreement.\n\nVoiding it rescinds a signed contract — the signed PDF is kept on record but marked VOID. This cannot be undone. Continue?`,
    )) return;
    // eslint-disable-next-line no-alert
    const reason = window.prompt(
      executed
        ? `Reason for voiding executed agreement ${row.envelope_code}? (required — stays on the record)`
        : `Void ${row.envelope_code}? Give a reason — it stays on the record.`,
    );
    if (reason === null) return;
    if (executed && !reason.trim()) { toast?.error?.('A reason is required to void an executed agreement.'); return; }
    setBusy(`void-${row.id}`);
    try {
      await api.post(`/signing/envelopes/${row.id}/void`, { reason });
      toast?.success?.(`${row.envelope_code} voided`);
      setDrawerRow(null);
      onRefresh?.();
    } catch (e) {
      toast?.error?.(e?.response?.data?.error || 'Could not void agreement');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="wt-scope pm-scope">
      {/* ── Top Header ── */}
      <div className="pm-head" style={{ marginBottom: 18 }}>
        <div>
          <div className="pm-eyebrow" style={{ color: accent, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileSignature size={14} /> Contracts &amp; Agreements
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '2px 0 6px', color: 'var(--navy, #0f172a)' }}>
            {title}
          </h1>
          <div className="pm-meta" style={{ fontSize: 13, color: 'var(--muted, #64748b)' }}>
            {subtitle}
          </div>
        </div>
        <div className="pm-head-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="wt-btn"
            onClick={onRefresh}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'wt-spin' : ''} /> Refresh
          </button>
          {onNew && (
            <button
              type="button"
              className="wt-btn primary"
              onClick={onNew}
              style={{
                background: accent,
                borderColor: accent,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
              }}
            >
              <Plus size={15} /> {newButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Top 6 KPI Cards Strip ── */}
      {overview && (
        <div className="wt-pkpis" style={{ marginBottom: 16 }}>
          <KpiCard
            icon={FileSignature}
            tone="accent"
            label="Total Agreements"
            value={overview.total}
            sub={`${overview.fully_signed} fully executed`}
          />
          <KpiCard
            icon={Clock}
            tone={overview.signatures_outstanding > 0 ? 'amber' : 'green'}
            label="Signatures Outstanding"
            value={overview.signatures_outstanding}
            sub={`across ${overview.awaiting} agreement(s)`}
          />
          <KpiCard
            icon={ShieldCheck}
            tone="green"
            label="Fully Executed"
            value={overview.fully_signed}
            sub="All parties signed"
          />
          <KpiCard
            icon={CalendarClock}
            tone={overview.expiring_soon > 0 ? 'amber' : 'slate'}
            label="Expiring in 7 Days"
            value={overview.expiring_soon}
            sub={overview.expired ? `${overview.expired} already expired` : 'None expired'}
          />
          <KpiCard
            icon={AlertTriangle}
            tone={overview.declined > 0 ? 'red' : 'slate'}
            label="Declined / Voided"
            value={overview.declined}
            sub={`${overview.voided} voided`}
          />
          <div className="wt-card wt-pkpi tone-slate">
            <span className="tx" style={{ width: '100%' }}>
              <span className="lb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{overview.by_family?.length > 1 ? 'By Family' : 'Document Type'}</span>
                {docCode && (
                  <span style={{
                    fontSize: 9.5,
                    padding: '1px 5px',
                    borderRadius: 4,
                    background: accentSoft,
                    color: accent,
                    fontWeight: 700,
                    border: `1px solid ${accent}30`,
                  }}>
                    {docCode}
                  </span>
                )}
              </span>
              {overview.by_family?.length > 0 ? (
                overview.by_family.map((f) => (
                  <span key={f.key} style={{ fontSize: 11.5, color: 'var(--wt-muted, #64748b)', display: 'block', marginTop: 3 }}>
                    {f.label}: <strong style={{ color: 'var(--wt-ink, #0f172a)' }}>{f.total}</strong>
                    {f.awaiting > 0 && <span style={{ color: 'var(--wt-amber, #d97706)', fontWeight: 600 }}> · {f.awaiting} awaiting</span>}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--wt-muted, #64748b)', display: 'block', marginTop: 3 }}>
                  Standard Agreement: <strong style={{ color: 'var(--wt-ink, #0f172a)' }}>{overview.total}</strong>
                  {overview.signatures_outstanding > 0 && (
                    <span style={{ color: 'var(--wt-amber, #d97706)', fontWeight: 600 }}> · {overview.signatures_outstanding} awaiting</span>
                  )}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ── Filter Tabs ── */}
      {normalizedTabs.length > 1 && (
        <div
          className="wt-tabs"
          style={{
            marginBottom: 16,
            borderBottom: '1px solid var(--wt-line, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
          }}
        >
          {normalizedTabs.map((t) => {
            const label = t.label;
            const count = tabCounts[label] ?? 0;
            const on = activeTab.toLowerCase() === label.toLowerCase();
            return (
              <button
                key={label}
                type="button"
                className={`wt-tab${on ? ' on' : ''}`}
                onClick={() => setActiveTab(label)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  background: on ? accent : 'transparent',
                  color: on ? '#ffffff' : 'var(--wt-muted, #64748b)',
                  fontWeight: on ? 700 : 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderBottom: on ? `2px solid ${accent}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                <span>{label}</span>
                <span
                  className="wt-tab-n"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 20,
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 800,
                    background: on ? 'rgba(255, 255, 255, 0.28)' : '#e2e8f0',
                    color: on ? '#ffffff' : 'var(--wt-ink-2, #334155)',
                    marginLeft: 4,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="wt-filterbar" style={{ marginBottom: 14 }}>
        <label className="wt-search" style={{ width: 340 }}>
          <Search size={15} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by reference, title or signatory…"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              style={{ border: 'none', background: 'none', padding: 2, cursor: 'pointer', color: 'var(--wt-muted, #94a3b8)' }}
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
          <button
            type="button"
            className="wt-btn sm"
            onClick={() => { setQ(''); setAwaitingOnly(false); }}
          >
            Reset filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--wt-muted, #64748b)' }}>
          Showing <strong>{shownRows.length}</strong> of {shapedRows.length}
        </span>
      </div>

      {/* ── Agreements Table ── */}
      <div className="wt-card wt-tblcard">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--wt-muted, #64748b)' }}>
            <Loader2 size={24} className="wt-spin" style={{ margin: '0 auto 8px' }} />
            <div>Loading agreements…</div>
          </div>
        ) : (
          <>
            <table className="wt-tbl">
            <thead>
              <tr>
                <th style={{ width: 170 }}>Reference &amp; Type</th>
                <th style={{ width: 220 }}>{partyLabel} &amp; Email</th>
                <th>Document &amp; Scope</th>
                <th style={{ width: 190 }}>Parties Signed</th>
                <th style={{ width: 190 }}>Waiting On</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 210, textAlign: 'right' }}>Actions</th>
                <th style={{ width: 28 }} />
              </tr>
            </thead>
            <tbody>
              {shownRows.map((r) => {
                const isDraft = r.status === 'draft';
                const isOpen = ['sent', 'viewed', 'partially_signed'].includes(r.status);
                return (
                  <tr
                    key={r.id}
                    className="click"
                    onClick={() => setDrawerRow(r)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 1. Reference & Type */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="id"
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            cursor: 'pointer',
                            letterSpacing: '0.02em',
                            fontWeight: 700,
                            color: 'var(--navy, #0f172a)',
                          }}
                          onClick={(e) => copyCode(r.envelope_code, e)}
                          title="Click to copy envelope code"
                        >
                          {r.envelope_code}
                        </span>
                        <button
                          type="button"
                          className="wt-btn sm"
                          style={{ padding: 2, height: 20, width: 20, border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={(e) => copyCode(r.envelope_code, e)}
                          title="Copy code"
                        >
                          <Copy size={11} style={{ color: 'var(--wt-muted, #94a3b8)' }} />
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--wt-muted, #64748b)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            background: accentSoft,
                            color: accent,
                          }}
                        >
                          {r.kind ? `${r.kind.toUpperCase()} Service` : (r.family_label || 'Agreement')}
                        </span>
                      </div>
                    </td>

                    {/* 2. Client & Email */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <strong style={{ fontSize: 13, color: 'var(--wt-ink, #0f172a)', fontWeight: 700 }}>
                          {r.client_name || '—'}
                        </strong>
                        {r.client_email ? (
                          <a
                            href={`mailto:${r.client_email}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 11.5,
                              color: accent,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4.5,
                              marginTop: 1,
                            }}
                            title={`Email: ${r.client_email}`}
                          >
                            <Mail size={12} style={{ color: 'var(--wt-muted, #94a3b8)', flexShrink: 0 }} />
                            <span style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.client_email}
                            </span>
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--wt-muted, #94a3b8)' }}>No email</span>
                        )}
                      </div>
                    </td>

                    {/* 3. Document & Scope */}
                    <td>
                      <strong
                        style={{
                          display: 'block',
                          maxWidth: 320,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--wt-ink, #0f172a)',
                        }}
                        title={r.title}
                      >
                        {r.title}
                      </strong>
                      <div style={{ fontSize: 11.5, color: 'var(--wt-muted, #64748b)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {r.contract_value != null && (
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {bdt(r.contract_value)}
                          </span>
                        )}
                        {r.sent_at ? <span>Sent {dateFmt(r.sent_at)}</span> : <span>Not sent</span>}
                        {r.completed_at ? <span>· Executed {dateFmt(r.completed_at)}</span> : null}
                        {r.expired && <span className="wt-tag red" style={{ fontSize: 10 }}>Expired</span>}
                        {!r.expired && r.expiring_soon && (
                          <span className="wt-tag amber" style={{ fontSize: 10 }}>Expires in {r.expires_in_days}d</span>
                        )}
                      </div>
                    </td>

                    {/* 4. Parties Signed */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontSize: 12.5 }}>{r.signed_count} / {r.total_signers || 1}</strong>
                        <span style={{ fontSize: 11, color: 'var(--wt-muted, #64748b)' }}>({r.progress_pct}%)</span>
                        <div className="wt-progress" style={{ maxWidth: 80, flex: 1 }}>
                          <span
                            style={{
                              width: `${r.progress_pct}%`,
                              background: r.fully_signed ? '#16a34a' : accent,
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
                              key={s.id || s.order}
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
                                  ? '#16a34a'
                                  : declined
                                  ? '#ef4444'
                                  : isNext
                                  ? accentSoft
                                  : '#f1f5f9',
                                border: isNext ? `1.5px solid ${accent}` : '1px solid transparent',
                                color: signed || declined ? '#fff' : isNext ? accent : '#64748b',
                                cursor: 'default',
                              }}
                            >
                              {signed ? <Check size={11} strokeWidth={3} /> : declined ? <X size={11} strokeWidth={3} /> : s.order}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* 5. Waiting On */}
                    <td>
                      {r.fully_signed ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#16a34a', fontWeight: 700, fontSize: 12 }}>
                          <ShieldCheck size={14} /> All parties signed
                        </div>
                      ) : r.awaiting ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 12.5, color: 'var(--wt-ink, #0f172a)' }}>{r.awaiting.name}</strong>
                            {['staff_countersign', 'org', 'agency'].includes(r.awaiting.role) && (
                              <button
                                type="button"
                                className="wt-btn sm primary"
                                style={{ padding: '2px 8px', fontSize: 10.5, fontWeight: 700, height: 21, background: accent, borderColor: accent }}
                                onClick={(e) => { e.stopPropagation(); handleCountersign(r, r.awaiting); }}
                                title="Countersign directly as Seventh Sky officer"
                              >
                                <FileSignature size={11} /> Countersign
                              </button>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--wt-muted, #64748b)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: ['staff_countersign', 'org'].includes(r.awaiting.role) ? accent : '#d97706',
                              }}
                            />
                            {String(r.awaiting.role || '').replace(/_/g, ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="muted" style={{ fontSize: 12, color: 'var(--wt-muted, #64748b)' }}>—</span>
                      )}
                    </td>

                    {/* 6. Status */}
                    <td>
                      <StatusPill value={r.status} />
                    </td>

                    {/* 7. Actions */}
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="wt-btn sm"
                          onClick={(e) => { e.stopPropagation(); setDrawerRow(r); }}
                          title="Open detailed audit record"
                        >
                          <Eye size={12} /> Open
                        </button>

                        {isDraft && onEditDraft && (
                          <button
                            type="button"
                            className="wt-btn sm"
                            onClick={(e) => { e.stopPropagation(); onEditDraft(r); }}
                            title="Edit this draft"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}

                        {isDraft && onSendDraft && (
                          <button
                            type="button"
                            className="wt-btn sm primary"
                            style={{ background: accent, borderColor: accent }}
                            onClick={(e) => { e.stopPropagation(); onSendDraft(r); }}
                            title="Dispatch draft for signature"
                          >
                            <Send size={12} /> Send
                          </button>
                        )}

                        {isOpen && r.can_resend && (
                          <button
                            type="button"
                            className="wt-btn sm"
                            disabled={busy === `resend-${r.id}`}
                            onClick={(e) => { e.stopPropagation(); handleResend(r); }}
                            title="Resend signing invitation"
                          >
                            {busy === `resend-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Send size={12} />} Resend
                          </button>
                        )}

                        {isOpen && onReissue && (
                          <button
                            type="button"
                            className="wt-btn sm"
                            onClick={(e) => { e.stopPropagation(); onReissue(r); }}
                            title="Void & reissue fresh agreement"
                          >
                            <Pencil size={12} /> Reissue
                          </button>
                        )}

                        <button
                          type="button"
                          className={`wt-btn sm${r.can_download_signed ? ' primary' : ''}`}
                          style={r.can_download_signed ? { background: '#16a34a', borderColor: '#16a34a', color: '#ffffff' } : {}}
                          disabled={busy === `dl-${r.id}`}
                          onClick={(e) => { e.stopPropagation(); downloadSignedDoc(r); }}
                          title={r.can_download_signed ? 'Download executed agreement with verified signatures' : 'View current agreement copy'}
                        >
                          {busy === `dl-${r.id}` ? <Loader2 size={12} className="wt-spin" /> : <Download size={12} />}
                          {r.fully_signed ? 'Signed' : 'Preview'}
                        </button>
                      </div>
                    </td>

                    {/* 8. Row Chevron */}
                    <td style={{ width: 28, textAlign: 'center', paddingRight: 16 }}>
                      <ChevronRight size={15} style={{ color: 'var(--wt-muted, #94a3b8)' }} />
                    </td>
                  </tr>
                );
              })}

              {!shownRows.length && (
                <tr className="wt-empty-row">
                  <td colSpan={8} style={{ textAlign: 'center', padding: 36 }}>
                    <div style={{ fontSize: 13, color: 'var(--wt-muted, #64748b)', marginBottom: 8 }}>
                      {q || awaitingOnly ? 'Nothing matches those filters.' : `No agreements registered under “${activeTab}”.`}
                    </div>
                    {(q || awaitingOnly) && (
                      <button
                        type="button"
                        className="wt-btn sm"
                        onClick={() => { setQ(''); setAwaitingOnly(false); }}
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="wt-tblfoot">
            <span>Showing <strong>{shownRows.length}</strong> of {shapedRows.length} agreement{shapedRows.length === 1 ? '' : 's'}</span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span><strong style={{ color: 'var(--wt-green, #16a34a)' }}>{overview?.fully_signed || 0}</strong> fully executed</span>
              <span><strong style={{ color: 'var(--wt-amber, #d97706)' }}>{overview?.signatures_outstanding || 0}</strong> signatures outstanding</span>
              {(overview?.declined || 0) > 0 && <span><strong style={{ color: 'var(--wt-red, #dc2626)' }}>{overview.declined}</strong> declined</span>}
            </span>
          </div>
        </>
      )}
      </div>

      {/* ── Slide-over Detailed Audit Drawer ── */}
      {drawerRow && (
        <AuditDrawer
          row={drawerRow}
          accent={accent}
          onClose={() => setDrawerRow(null)}
          onResend={(signerId) => handleResend(drawerRow, signerId)}
          onDownload={() => downloadSignedDoc(drawerRow)}
          onVoid={() => handleVoid(drawerRow)}
          onCountersign={(signer) => handleCountersign(drawerRow, signer)}
          busy={busy}
          toast={toast}
        />
      )}

      {/* ── Identical In-Page Drafting Window Modal Chrome ── */}
      {showBuilderModal && (
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
            if (e.key === 'Escape') onCloseBuilderModal?.();
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
            {/* Window Top Title Bar (Exact Services Agreement Window Chrome) */}
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
                    background: 'rgba(255,255,255,0.12)',
                    color: '#38bdf8',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <FileSignature size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {builderModalTitle || `New ${partyLabel} Agreement`}
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
                      {docCode}
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
                  onClick={onCloseBuilderModal}
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

            {/* Window Body: Scrollable 2-Column Workspace */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
              {renderBuilder && renderBuilder()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'slate' }) {
  return (
    <div className={`wt-card wt-pkpi tone-${tone}`}>
      <span className="ic"><Icon size={20} /></span>
      <span className="tx">
        <span className="lb">{label}</span>
        <span className="vl">{value}</span>
        {sub && <span className="sb">{sub}</span>}
      </span>
    </div>
  );
}

function StatusPill({ value }) {
  const v = String(value || 'draft').toLowerCase();
  const map = {
    completed: { text: 'Completed', bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' },
    active: { text: 'Active', bg: 'rgba(22, 163, 74, 0.12)', color: '#16a34a' },
    sent: { text: 'Sent', bg: 'rgba(217, 119, 6, 0.12)', color: '#d97706' },
    viewed: { text: 'Viewed', bg: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' },
    partially_signed: { text: 'Partially signed', bg: 'rgba(217, 119, 6, 0.15)', color: '#b45309' },
    draft: { text: 'Draft', bg: '#f1f5f9', color: '#475569' },
    declined: { text: 'Declined', bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
    voided: { text: 'Voided', bg: '#e2e8f0', color: '#64748b' },
  };
  const cfg = map[v] || { text: value, bg: '#f1f5f9', color: '#475569' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: cfg.bg,
        color: cfg.color,
        textTransform: 'capitalize',
      }}
    >
      {cfg.text}
    </span>
  );
}

/* Sliding Detailed Audit Drawer */
function AuditDrawer({ row, accent, onClose, onResend, onDownload, onVoid, busy, onCountersign, toast }) {
  const [copyingHash, setCopyingHash] = useState(false);

  const copySignerLink = async (s) => {
    try {
      const { data } = await api.post(`/signing/envelopes/${row.id}/signing-link/${s.id}`);
      const link = data?.url || `${window.location.origin}${data?.signing_path}`;
      await navigator.clipboard.writeText(link);
      toast?.success?.(`Link for ${s.name} copied — treat it as their signature`) || toast?.ok?.(`Link copied`);
    } catch {
      toast?.error?.('Could not issue signing link');
    }
  };

  const copyHash = async () => {
    if (!row.content_hash) return;
    setCopyingHash(true);
    await navigator.clipboard?.writeText(row.content_hash).catch(() => {});
    toast?.success?.('Content hash copied to clipboard');
    setTimeout(() => setCopyingHash(false), 1500);
  };

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true" style={{ maxWidth: 640 }}>
        <div className="wt-modal-head">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontFamily: 'ui-monospace, monospace' }}>{row.envelope_code}</h3>
              <StatusPill value={row.status} />
            </div>
            <div className="sub" style={{ marginTop: 4 }}>
              {row.title}
            </div>
          </div>
          <button type="button" className="wt-modal-x" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          <div className={row.fully_signed ? 'wt-note' : 'wt-warn'} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {row.fully_signed ? (
              <>
                <ShieldCheck size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div>
                  <strong>Fully executed.</strong> All {row.total_signers} parties signed
                  {row.completed_at ? ` on ${dateTimeFmt(row.completed_at)}` : ''}.
                </div>
              </>
            ) : (
              <>
                <Clock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
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
              <span style={{ fontSize: 11.5, color: 'var(--wt-muted, #64748b)', fontWeight: 500 }}>
                {row.signed_count} of {row.total_signers} signed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(row.signers || []).map((s) => {
                const signed = s.status === 'signed';
                const declined = s.status === 'declined';
                return (
                  <div
                    key={s.id || s.order}
                    className={`wt-liferow${signed ? ' done' : ''}`}
                    style={{
                      cursor: 'default',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--wt-line, #e2e8f0)',
                      background: signed ? '#f0fdf4' : '#fff',
                    }}
                  >
                    <span
                      className="tick"
                      style={
                        declined
                          ? { background: '#ef4444', borderColor: '#ef4444' }
                          : signed
                          ? { background: '#16a34a', borderColor: '#16a34a' }
                          : { borderColor: 'var(--wt-line, #e2e8f0)', color: 'var(--wt-muted, #64748b)' }
                      }
                    >
                      {signed ? <Check size={14} color="#fff" strokeWidth={3} /> : declined ? <X size={14} color="#fff" strokeWidth={3} /> : s.order}
                    </span>
                    <span className="tx" style={{ flex: 1, minWidth: 0 }}>
                      <span className="t" style={{ fontWeight: 650, color: 'var(--wt-ink, #0f172a)' }}>
                        {s.order}. {s.name}
                      </span>
                      <span className="h" style={{ fontSize: 11.5, color: 'var(--wt-muted, #64748b)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--wt-ink-2, #334155)' }}>
                          {String(s.role || '').replace(/_/g, ' ')}
                        </span>
                        {s.email ? ` · ${s.email}` : ''}
                        {signed && s.signed_at ? ` · signed ${dateTimeFmt(s.signed_at)}` : ''}
                        {declined && s.declined_reason ? ` · ${s.declined_reason}` : ''}
                      </span>
                    </span>
                    {!signed && !declined && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        {['staff_countersign', 'org'].includes(s.role) && (
                          <button
                            type="button"
                            className="wt-btn sm primary"
                            style={{ background: accent, borderColor: accent }}
                            onClick={() => onCountersign(s)}
                            title="Countersign immediately in a new tab"
                          >
                            <FileSignature size={12} /> Countersign
                          </button>
                        )}
                        <button type="button" className="wt-btn sm" onClick={() => copySignerLink(s)} title="Copy secure signing link">
                          <Copy size={12} /> Link
                        </button>
                        <button
                          type="button"
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
                        style={{ background: 'rgba(5, 150, 105, 0.15)', color: '#059669', fontWeight: 700 }}
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
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--wt-muted, #64748b)' }}>{k}</label>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--wt-ink, #0f172a)' }}>{v || '—'}</div>
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
                border: '1px solid var(--wt-line, #e2e8f0)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--wt-ink, #0f172a)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cryptographic Integrity Hash (SHA-256)
                </span>
                <button
                  type="button"
                  className="wt-btn sm"
                  style={{ padding: '2px 8px', height: 22, fontSize: 11 }}
                  onClick={copyHash}
                >
                  <Copy size={11} /> {copyingHash ? 'Copied' : 'Copy Hash'}
                </button>
              </div>
              <code style={{ display: 'block', fontSize: 11, color: 'var(--wt-muted, #64748b)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {row.content_hash}
              </code>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--wt-muted, #64748b)' }}>
                The electronic record, audit trail and cryptographic digest constitute proof of agreement terms and execution.
              </div>
            </div>
          )}
        </div>

        <div className="wt-modal-foot">
          {row.can_void && (
            <button type="button" className="wt-btn danger-ghost" onClick={onVoid}>
              <Ban size={14} /> {row.void_executed ? 'Void executed agreement' : 'Void agreement'}
            </button>
          )}
          <button type="button" className="wt-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={`wt-btn${row.can_download_signed ? ' primary' : ''}`}
            style={row.can_download_signed ? { background: '#16a34a', borderColor: '#16a34a' } : {}}
            onClick={onDownload}
          >
            <Download size={14} /> {row.fully_signed ? 'Download signed copy' : 'Preview current agreement'}
          </button>
        </div>
      </div>
    </div>
  );
}
