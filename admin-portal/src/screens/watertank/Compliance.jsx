import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Plus, ClipboardCheck, X, Check, FileText } from 'lucide-react';
import api from '../../services/api';
import { useSvcNav,
  WtHead,
  WtTabs,
  StatCards,
  dateFmt,
  Loading,
  EmptyState,
  StatusCell,
  RowActions,
  WtDrawer,
  toast,
  errText,
  svcDoc,
} from './common';

/*
 * Compliance — the Operations Manager's desk for SSPC-WTCM-SOP-02.
 *   Watchtower        everything lapsing, overdue or unverified, ranked
 *   Audits (Sec. 14)      annual compliance / insurance / safety / service quality
 *   Protected Clients (Sec. 12)  the 24-month non-circumvention register
 */

const TABS = ['Watchtower', 'Audits', 'Protected Clients'];
const SEVERITY_COLOR = { high: 'var(--wt-red)', medium: 'var(--wt-amber)', low: 'var(--wt-blue)' };
const OUTCOMES = ['Scheduled', 'Passed', 'Conditional', 'Failed'];
const PROTECTION_STATUSES = ['Protected', 'Expired', 'Breached', 'Waived'];

/* ── schedule-an-audit drawer ─────────────────────────────── */
function AuditDrawer({ providers, auditTypes, onClose, onSaved }) {
  const [f, setF] = useState({ provider_id: '', audit_type: '', scheduled_date: '', auditor: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const go = async () => {
    if (!f.provider_id || !f.audit_type) { setErr('Choose a provider and an audit type.'); return; }
    setBusy(true); setErr('');
    try { await api.post('/wt-providers/audits', f); onSaved(); }
    catch (e) { setErr(errText(e, 'Could not schedule the audit')); setBusy(false); }
  };

  return (
    <WtDrawer title="Schedule Audit" subtitle="Sec. 14 — Provider Audits" onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Saving…' : 'Schedule'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-field"><label>Provider *</label>
        <select className="wt-select" value={f.provider_id} onChange={(e) => set('provider_id', e.target.value)}>
          <option value="">Select…</option>
          {providers.map((p) => <option key={p.id} value={p.id}>{p.business_name}</option>)}
        </select></div>
      <div className="wt-field"><label>Audit type *</label>
        <select className="wt-select" value={f.audit_type} onChange={(e) => set('audit_type', e.target.value)}>
          <option value="">Select…</option>{auditTypes.map((t) => <option key={t}>{t}</option>)}
        </select></div>
      <div className="wt-field"><label>Scheduled date</label>
        <input className="wt-input" type="date" value={f.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} /></div>
      <div className="wt-field"><label>Auditor</label>
        <input className="wt-input" value={f.auditor} onChange={(e) => set('auditor', e.target.value)} /></div>
    </WtDrawer>
  );
}

/* ── audit findings drawer ────────────────────────────────── */
function FindingsDrawer({ audit, onClose, onSaved }) {
  const [f, setF] = useState({
    score: audit.score || '', auditor: audit.auditor || '', outcome: audit.outcome || 'Scheduled',
    findings: audit.findings || '', corrective_actions: audit.corrective_actions || '', action_due_date: audit.action_due_date || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const go = async () => {
    setBusy(true); setErr('');
    try { await api.patch(`/wt-providers/audits/${audit.id}`, f); onSaved(); }
    catch (e) { setErr(errText(e, 'Could not save')); setBusy(false); }
  };

  return (
    <WtDrawer title={`${audit.audit_type} — findings`} subtitle={`${audit.code} · ${audit.provider_name}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Saving…' : 'Save findings'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-note">Completing an audit stamps the provider&apos;s last/next audit dates. A <strong>Failed</strong> outcome moves them to Conditional status.</div>
      <div className="wt-grid2">
        <div className="wt-field"><label>Score (%)</label><input className="wt-input" type="number" value={f.score} onChange={(e) => set('score', e.target.value)} /></div>
        <div className="wt-field"><label>Outcome</label>
          <select className="wt-select" value={f.outcome} onChange={(e) => set('outcome', e.target.value)}>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}</select></div>
      </div>
      <div className="wt-field"><label>Auditor</label><input className="wt-input" value={f.auditor} onChange={(e) => set('auditor', e.target.value)} /></div>
      <div className="wt-field"><label>Findings</label><textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.findings} onChange={(e) => set('findings', e.target.value)} /></div>
      <div className="wt-field"><label>Corrective actions</label><textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.corrective_actions} onChange={(e) => set('corrective_actions', e.target.value)} /></div>
      <div className="wt-field"><label>Actions due by</label><input className="wt-input" type="date" value={f.action_due_date || ''} onChange={(e) => set('action_due_date', e.target.value)} /></div>
    </WtDrawer>
  );
}

export default function Compliance() {
  const nav = useSvcNav();
  const [tab, setTab] = useState('Watchtower');
  const [alerts, setAlerts] = useState(null);
  const [audits, setAudits] = useState([]);
  const [protectedRows, setProtectedRows] = useState({ rows: [], summary: {} });
  const [providers, setProviders] = useState([]);
  const [reference, setReference] = useState({ audit_types: [] });
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);
  const [findings, setFindings] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/wt-providers/alerts').catch(() => ({ data: { items: [], summary: {} } })),
      api.get('/wt-providers/audits').catch(() => ({ data: [] })),
      api.get('/wt-providers/protected').catch(() => ({ data: { rows: [], summary: {} } })),
      api.get('/wt-ops/providers').catch(() => ({ data: [] })),
      api.get('/wt-providers/reference').catch(() => ({ data: { audit_types: [] } })),
    ]).then(([a, au, pc, pr, ref]) => {
      setAlerts(a.data); setAudits(au.data || []);
      setProtectedRows(pc.data || { rows: [], summary: {} });
      setProviders(pr.data || []); setReference(ref.data || { audit_types: [] });
    }).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const term = q.trim().toLowerCase();
  const shownAudits = useMemo(() => audits.filter((a) => !term
    || [a.code, a.provider_name, a.audit_type, a.auditor].some((v) => String(v || '').toLowerCase().includes(term))), [audits, term]);
  const shownProtected = useMemo(() => (protectedRows.rows || []).filter((r) => !term
    || [r.code, r.client_name, r.provider_name, r.work_order_code].some((v) => String(v || '').toLowerCase().includes(term))), [protectedRows, term]);

  const counts = {
    Watchtower: alerts?.items?.length || undefined,
    Audits: audits.filter((a) => !a.closed).length || undefined,
    'Protected Clients': protectedRows.summary?.protected || undefined,
  };

  if (loading) return (<><WtHead title="Compliance" subtitle={`${svcDoc('SOP-02')} · audits, territory and non-circumvention`} /><Loading /></>);

  return (
    <>
      <WtHead
        title="Compliance"
        subtitle={`${svcDoc('SOP-02')} · Sec. 14 audits · Sec. 11 territory · Sec. 12 non-circumvention`}
        search={q} onSearch={setQ}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        {tab === 'Audits' && <button className="wt-btn primary" onClick={() => setScheduling(true)}><Plus size={15} /> Schedule Audit</button>}
      </WtHead>

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      {/* ═══ WATCHTOWER ═══ */}
      {tab === 'Watchtower' && (
        <>
          <StatCards items={[
            { label: 'High severity', value: `${alerts?.summary?.high || 0}`, sub: 'Act today', color: alerts?.summary?.high ? 'var(--wt-red)' : undefined },
            { label: 'Medium severity', value: `${alerts?.summary?.medium || 0}`, sub: 'This week', color: alerts?.summary?.medium ? 'var(--wt-amber)' : undefined },
            { label: 'Low severity', value: `${alerts?.summary?.low || 0}`, sub: 'Keep an eye on' },
            { label: 'Total open items', value: `${alerts?.summary?.total || 0}`, sub: 'Across all providers' },
          ]} />
          <div className="wt-card" style={{ padding: 20 }}>
            {alerts?.items?.length ? (
              <div className="wt-alertlist">
                {alerts.items.map((a, i) => (
                  <button key={i} className="wt-alert" style={{ borderLeftColor: SEVERITY_COLOR[a.severity] }}
                    onClick={() => a.provider_id && nav(`/water-tank/providers/${a.provider_id}`)}>
                    <AlertTriangle size={14} style={{ color: SEVERITY_COLOR[a.severity], flex: 'none' }} />
                    <span className="t">{a.title}</span>
                    <span className="p">{a.provider_name || '—'}</span>
                    <span className="d">{a.detail}</span>
                    <span className="s">{a.sop}</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState eyebrow="Watchtower" title="Everything is compliant"
                hint="No lapsed documents, overdue audits, unsigned agreements, missing briefings or open breaches." />
            )}
          </div>
        </>
      )}

      {/* ═══ AUDITS ═══ */}
      {tab === 'Audits' && (
        <>
          <StatCards items={[
            { label: 'Scheduled', value: `${audits.filter((a) => a.outcome === 'Scheduled').length}`, sub: 'Awaiting the visit' },
            { label: 'Passed', value: `${audits.filter((a) => a.outcome === 'Passed').length}`, sub: 'Cleared without action', color: 'var(--wt-green)' },
            { label: 'Conditional / Failed', value: `${audits.filter((a) => ['Conditional', 'Failed'].includes(a.outcome)).length}`, sub: 'Corrective actions required', color: 'var(--wt-amber)' },
            { label: 'Open', value: `${audits.filter((a) => !a.closed).length}`, sub: `${audits.length} on record` },
          ]} />
          <div className="wt-card wt-tblcard">
            {shownAudits.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 90 }}>Code</th><th style={{ width: 176 }}>Provider</th><th>Audit type</th>
                  <th style={{ width: 112 }}>Scheduled</th><th style={{ width: 112 }}>Conducted</th><th style={{ width: 70 }}>Score</th>
                  <th style={{ width: 130 }}>Outcome</th><th style={{ width: 116 }}>Actions due</th><th style={{ width: 44 }} /></tr></thead>
                <tbody>
                  {shownAudits.map((a) => {
                    const overdue = a.action_due_date && !a.closed && new Date(a.action_due_date) < new Date();
                    return (
                      <tr key={a.id} className="click" onClick={() => nav(`/water-tank/providers/${a.provider_id}`)}>
                        <td className="id">{a.code}</td>
                        <td><strong>{a.provider_name}</strong></td>
                        <td>{a.audit_type}{a.findings && <div className="cell-sub">{a.findings.slice(0, 60)}{a.findings.length > 60 ? '…' : ''}</div>}</td>
                        <td className="muted">{dateFmt(a.scheduled_date)}</td>
                        <td className="muted">{dateFmt(a.conducted_date)}</td>
                        <td style={{ fontWeight: 700 }}>{a.score ? `${a.score}%` : '—'}</td>
                        <td><StatusCell value={a.outcome} options={OUTCOMES} field="outcome"
                          onChange={async (body) => { await api.patch(`/wt-providers/audits/${a.id}`, body); toast.ok(`${a.code} → ${body.outcome}`); load(); }} /></td>
                        <td style={{ color: overdue ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: overdue ? 700 : 400 }}>
                          {a.action_due_date ? <>{dateFmt(a.action_due_date)}{overdue ? ' · overdue' : ''}</> : '—'}
                          {a.closed && <div className="cell-sub">closed</div>}
                        </td>
                        <td>
                          <RowActions items={[
                            { label: 'Record findings', icon: FileText, onClick: () => setFindings(a) },
                            !a.closed && { label: 'Close audit', icon: Check, onClick: async () => { await api.patch(`/wt-providers/audits/${a.id}`, { closed: true }); toast.ok(`${a.code} closed`); load(); } },
                            { label: 'Delete', icon: X, danger: true, onClick: async () => { await api.delete(`/wt-providers/audits/${a.id}`); toast.ok('Audit deleted'); load(); } },
                          ]} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState eyebrow="Audits" title={q ? `Nothing matches “${q}”.` : 'No audits recorded'}
                hint={q ? undefined : 'Sec. 14 requires an annual compliance audit plus insurance, safety and service-quality audits for every provider.'}
                action={!q && <button className="wt-btn primary" onClick={() => setScheduling(true)}><ClipboardCheck size={14} /> Schedule the first audit</button>} />
            )}
          </div>
        </>
      )}

      {/* ═══ PROTECTED CLIENTS ═══ */}
      {tab === 'Protected Clients' && (
        <>
          <div className="wt-note">
            Sec. 12 — a provider may not contact a Protected Client directly, accept repeat work or referrals from them, or bypass Seventh Sky.
            Protection runs <strong>{protectedRows.summary?.protection_months || 24} months</strong> from project completion or termination, whichever is later.
            Completing a work order adds the client here automatically.
          </div>
          <StatCards items={[
            { label: 'Under protection', value: `${protectedRows.summary?.protected || 0}`, sub: 'Active non-circumvention cover', color: 'var(--wt-green)' },
            { label: 'Expiring in 90 days', value: `${protectedRows.summary?.expiring_soon || 0}`, sub: 'Re-engage before cover lapses', color: protectedRows.summary?.expiring_soon ? 'var(--wt-amber)' : undefined },
            { label: 'Breached', value: `${protectedRows.summary?.breached || 0}`, sub: 'Provider bypassed Seventh Sky', color: protectedRows.summary?.breached ? 'var(--wt-red)' : undefined },
            { label: 'Expired', value: `${protectedRows.summary?.expired || 0}`, sub: 'Protection period elapsed' },
          ]} />
          <div className="wt-card wt-tblcard">
            {shownProtected.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 88 }}>Code</th><th>Client</th><th style={{ width: 180 }}>Provider</th>
                  <th style={{ width: 152 }}>Trigger</th><th style={{ width: 108 }}>From</th>
                  <th style={{ width: 168 }}>Protected until</th><th style={{ width: 128 }}>Status</th></tr></thead>
                <tbody>
                  {shownProtected.map((r) => {
                    const soon = r.status === 'Protected' && r.days_remaining != null && r.days_remaining <= 90;
                    return (
                      <tr key={r.id} className="click" onClick={() => r.provider_id && nav(`/water-tank/providers/${r.provider_id}`)}>
                        <td className="id">{r.code}</td>
                        <td><strong>{r.client_name}</strong>{r.work_order_code && <div className="cell-sub">{r.work_order_code}</div>}</td>
                        <td className="muted">{r.provider_name || '—'}</td>
                        <td className="muted">{r.trigger_event}</td>
                        <td className="muted">{dateFmt(r.protection_start)}</td>
                        <td style={{ color: soon ? 'var(--wt-amber)' : 'var(--wt-ink)', fontWeight: soon ? 700 : 400 }}>
                          {dateFmt(r.protection_end)}
                          {r.days_remaining > 0 && <div className="cell-sub">{r.days_remaining} days remaining</div>}
                        </td>
                        <td><StatusCell value={r.status} options={PROTECTION_STATUSES}
                          onChange={async (body) => { await api.patch(`/wt-providers/protected/${r.id}`, body); toast.ok(`${r.code} → ${body.status}`); load(); }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <EmptyState eyebrow="Protected Clients" title={q ? `Nothing matches “${q}”.` : 'No protected clients yet'}
                hint={q ? undefined : 'Every completed work order places that client under 24-month non-circumvention protection against the assigned provider.'} />
            )}
          </div>
        </>
      )}

      {scheduling && (
        <AuditDrawer providers={providers} auditTypes={reference.audit_types}
          onClose={() => setScheduling(false)}
          onSaved={() => { setScheduling(false); toast.ok('Audit scheduled'); load(); }} />
      )}
      {findings && (
        <FindingsDrawer audit={findings}
          onClose={() => setFindings(null)}
          onSaved={() => { setFindings(null); toast.ok('Audit updated'); load(); }} />
      )}
    </>
  );
}
