import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus, RefreshCw, ShieldCheck, AlertTriangle, ChevronRight,
  FileWarning, CalendarClock, Ban, CheckCircle2, Search, FileSignature,
  Wallet, LayoutGrid, Rows3, ArrowUpDown, MapPin, Percent, Star,
} from 'lucide-react';
import api from '../../../services/api';
import { useSvcNav, WtHead, Pill, Loading, EmptyState, errText, bdt } from '../common';

/*
 * Service Providers — SSPC-WTCM-SOP-02 operations console.
 *
 * Three questions this screen must answer at a glance:
 *   1. Who can I safely put in front of a client today?   (readiness + Sec. 6 Step 4)
 *   2. Where is the commercial paperwork stuck?           (agreement state, priced services)
 *   3. What will break if I ignore it this week?          (attention rail)
 * Everything below is derived from live data — nothing on this screen is illustrative.
 */

const SEVERITY_COLOR = { high: 'var(--wt-red)', medium: 'var(--wt-amber)', low: 'var(--wt-blue)' };
const STATUS_FILTERS = ['All', 'Onboarding', 'Approved', 'Conditional', 'Suspended', 'Terminated'];
const SORTS = [
  { key: 'readiness', label: 'Readiness' },
  { key: 'name', label: 'Name' },
  { key: 'jobs', label: 'Active jobs' },
  { key: 'rating', label: 'Rating' },
  { key: 'owed', label: 'Amount owed' },
];

const asList = (v) => (Array.isArray(v) ? v : (typeof v === 'string' ? (() => { try { return JSON.parse(v || '[]'); } catch { return []; } })() : []));
const shortCat = (c) => String(c || '').replace(/ (Contractor|Technician|Specialist|Laboratory|Provider)$/, '');

/** Readiness donut — SOP gates passed, coloured by whether the provider is actually assignable. */
function ReadinessRing({ passed, total, assignable, size = 40 }) {
  const pct = total ? Math.round((passed / total) * 100) : 0;
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const tone = assignable ? 'var(--wt-green)' : pct >= 60 ? 'var(--wt-accent)' : pct > 0 ? 'var(--wt-amber)' : 'var(--wt-line)';
  return (
    <span className="wt-ring" style={{ width: size, height: size }} title={`${passed} of ${total} SOP gates passed`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wt-line)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(c * pct) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <b style={{ color: tone }}>{pct}</b>
    </span>
  );
}

/** Commercial state of a provider: is there a live agreement, and does it price anything? */
function CommercialCell({ p }) {
  if (p.agreement_id) {
    return (
      <>
        <span className={`wt-pill sm ${p.agreement_expired ? 'red' : p.agreement_expiring ? 'amber' : 'green'}`}>
          <FileSignature size={9} /> {p.agreement_code || `v${p.agreement_version}`}
        </span>
        <div className="cell-sub">
          {p.commission_pct != null ? `${p.commission_pct}% commission` : 'no commission set'}
          {' · '}
          {p.priced_services ? `${p.priced_services} priced` : <span style={{ color: 'var(--wt-amber)' }}>no rates</span>}
        </div>
        {p.agreement_expiring && !p.agreement_expired && (
          <div className="cell-sub" style={{ color: 'var(--wt-amber)' }}>expires in {p.agreement_days_left}d</div>
        )}
        {p.agreement_expired && <div className="cell-sub" style={{ color: 'var(--wt-red)' }}>expired</div>}
      </>
    );
  }
  if (p.draft_agreement_id) {
    return (
      <>
        <span className="wt-pill sm amber"><FileSignature size={9} /> {String(p.agreement_state).replace(/_/g, ' ')}</span>
        <div className="cell-sub">awaiting signature</div>
      </>
    );
  }
  return (
    <>
      <span className="wt-pill sm slate">No agreement</span>
      <div className="cell-sub" style={{ color: 'var(--wt-amber)' }}>fees cannot be calculated</div>
    </>
  );
}

export default function ProviderDirectory() {
  const nav = useSvcNav();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('');
  const [focus, setFocus] = useState('');          // attention-rail lens
  const [view, setView] = useState(() => localStorage.getItem('wt.providers.view') || 'table');
  const [sort, setSort] = useState('readiness');

  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([
      api.get('/wt-providers/directory'),
      api.get('/wt-providers/alerts').catch(() => ({ data: null })),
    ])
      .then(([d, a]) => { setData(d.data); setAlerts(a.data); })
      .catch((e) => { setData(null); setError(errText(e, 'Could not load the provider directory')); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const setViewMode = (v) => { setView(v); localStorage.setItem('wt.providers.view', v); };

  const providers = data?.providers || [];
  const summary = data?.summary || {};
  const funnel = data?.funnel || [];

  /* ── the attention rail: work that will bite if left alone ── */
  const LENSES = useMemo(() => ([
    {
      key: 'ready', label: 'Ready to approve', tone: 'green', icon: CheckCircle2,
      hint: 'All Sec. 5 gates passed — awaiting the approval decision',
      match: (p) => p.ready_to_approve && String(p.status || '').toLowerCase() !== 'approved',
    },
    {
      key: 'noagreement', label: 'No signed agreement', tone: 'amber', icon: FileSignature,
      hint: 'Sec. 5 Phase 4 — work orders cannot be priced without one',
      match: (p) => !p.agreement_id && !['terminated', 'suspended'].includes(String(p.status || '').toLowerCase()),
    },
    {
      key: 'norates', label: 'Agreement without rates', tone: 'amber', icon: Percent,
      hint: 'Signed but no approved rate lines — fee calculation will refuse',
      match: (p) => p.agreement_id && !p.priced_services,
    },
    {
      key: 'blocked', label: 'Approved but blocked', tone: 'red', icon: Ban,
      hint: 'Sec. 6 Step 4 refuses assignment until these clear',
      match: (p) => String(p.status || '').toLowerCase() === 'approved' && !p.assignable,
    },
    {
      key: 'docs', label: 'Documents expired', tone: 'red', icon: FileWarning,
      hint: 'Sec. 5 Phase 2 compliance evidence is out of date',
      match: (p) => p.docs_expired > 0,
    },
    {
      key: 'audit', label: 'Audit overdue', tone: 'red', icon: CalendarClock,
      hint: 'Sec. 10 audit cycle has passed its due date',
      match: (p) => p.audit_overdue,
    },
    {
      key: 'expiring', label: 'Agreement expiring', tone: 'amber', icon: CalendarClock,
      hint: 'Renew within 60 days to avoid a gap in cover',
      match: (p) => p.agreement_expiring,
    },
  ].map((l) => ({ ...l, count: providers.filter(l.match).length })).filter((l) => l.count > 0)), [providers]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const lens = LENSES.find((l) => l.key === focus);
    const rows = providers.filter((p) => {
      const status = String(p.status || '').toLowerCase();
      const statusOk = statusFilter === 'All'
        || (statusFilter === 'Onboarding' ? !['approved', 'suspended', 'terminated'].includes(status) : status === statusFilter.toLowerCase());
      const stageOk = !stageFilter || p.onboarding_stage === stageFilter;
      const lensOk = !lens || lens.match(p);
      const termOk = !term || [p.code, p.business_name, p.contact_person, p.specialty, p.district, p.agreement_code]
        .concat(asList(p.coverage_areas), asList(p.service_categories))
        .some((v) => String(v || '').toLowerCase().includes(term));
      return statusOk && stageOk && lensOk && termOk;
    });
    const rd = (p) => (p.gates_total ? p.gates_passed / p.gates_total : 0);
    const cmp = {
      readiness: (a, b) => (b.assignable === a.assignable ? rd(b) - rd(a) : (b.assignable ? 1 : -1)),
      name: (a, b) => String(a.business_name || '').localeCompare(String(b.business_name || '')),
      jobs: (a, b) => (b.active_jobs || 0) - (a.active_jobs || 0),
      rating: (a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0),
      owed: (a, b) => (b.owed_total || 0) - (a.owed_total || 0),
    }[sort];
    return rows.sort(cmp);
  }, [providers, q, statusFilter, stageFilter, focus, sort, LENSES]);

  const head = (
    <WtHead
      title="Service Providers"
      subtitle="SSPC-WTCM-SOP-02 · onboarding, commercial terms, compliance, performance and territory"
      search={q} onSearch={setQ}
    >
      <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
      <button className="wt-btn" onClick={() => nav('/water-tank/agreements/provider')}><FileSignature size={14} /> Master Agreement</button>
      <button className="wt-btn primary" onClick={() => nav('/water-tank/providers/new')}><UserPlus size={15} /> Onboard Provider</button>
    </WtHead>
  );

  if (loading) return (<>{head}<Loading /></>);
  if (error) return (
    <>{head}
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load providers" hint={error}
        action={<button className="wt-btn primary" onClick={load}><RefreshCw size={14} /> Retry</button>} /></div>
    </>
  );

  const filtersOn = q || statusFilter !== 'All' || stageFilter || focus;
  const clearAll = () => { setQ(''); setStatusFilter('All'); setStageFilter(''); setFocus(''); };
  const assignable = providers.filter((p) => p.assignable).length;

  return (
    <>
      {head}

      {/* ── command strip ── */}
      <div className="wt-kpis five">
        <button className="wt-card wt-kpi wt-kpi-btn" onClick={() => { clearAll(); setStatusFilter('Approved'); }}>
          <span className="wt-kpi-ic" style={{ background: 'rgba(5,150,105,0.10)', color: 'var(--wt-green)' }}><ShieldCheck /></span>
          <div>
            <div className="wt-kpi-label">Assignable Today</div>
            <div className="wt-kpi-value">{assignable}<span className="wt-kpi-of">/ {providers.length}</span></div>
            <div className="wt-kpi-sub">{summary.not_assignable || 0} approved but blocked by Sec. 6 Step 4</div>
          </div>
        </button>
        <button className="wt-card wt-kpi wt-kpi-btn" onClick={() => { clearAll(); setStatusFilter('Onboarding'); }}>
          <span className="wt-kpi-ic" style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--wt-blue)' }}><UserPlus /></span>
          <div>
            <div className="wt-kpi-label">In Onboarding</div>
            <div className="wt-kpi-value">{summary.onboarding || 0}</div>
            <div className="wt-kpi-sub">{summary.ready_to_approve || 0} ready for the approval decision</div>
          </div>
        </button>
        <button className="wt-card wt-kpi wt-kpi-btn" onClick={() => { clearAll(); setFocus('noagreement'); }}>
          <span className="wt-kpi-ic" style={{ background: 'rgba(18,182,243,0.12)', color: 'var(--wt-accent)' }}><FileSignature /></span>
          <div>
            <div className="wt-kpi-label">Commercial Cover</div>
            <div className="wt-kpi-value">{summary.with_agreement || 0}<span className="wt-kpi-of">agreements</span></div>
            <div className="wt-kpi-sub">
              {summary.avg_commission != null ? `${summary.avg_commission}% avg commission · ` : ''}
              {summary.priced_services || 0} priced services
            </div>
          </div>
        </button>
        <button className="wt-card wt-kpi wt-kpi-btn" onClick={() => { clearAll(); setFocus('docs'); }}>
          <span className="wt-kpi-ic" style={{ background: 'rgba(217,119,6,0.10)', color: 'var(--wt-amber)' }}><FileWarning /></span>
          <div>
            <div className="wt-kpi-label">Compliance</div>
            <div className="wt-kpi-value" style={{ color: summary.docs_expired ? 'var(--wt-red)' : undefined }}>
              {summary.docs_expired || 0}<span className="wt-kpi-of">expired</span>
            </div>
            <div className="wt-kpi-sub">{summary.docs_expiring || 0} expiring in 30d · {summary.audits_overdue || 0} audits overdue</div>
          </div>
        </button>
        <div className="wt-card wt-kpi">
          <span className="wt-kpi-ic" style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}><Wallet /></span>
          <div>
            <div className="wt-kpi-label">Payable to Providers</div>
            <div className="wt-kpi-value">{summary.owed_total ? bdt(summary.owed_total) : '—'}</div>
            <div className="wt-kpi-sub">{summary.earned_total ? `${bdt(summary.earned_total)} earned to date` : 'no provider fees raised yet'}</div>
          </div>
        </div>
      </div>

      {/* ── Sec. 4 workflow pipeline ── */}
      <div className="wt-card wt-panel">
        <div className="wt-panel-head">
          <h2 className="wt-section-title">Provider Management Workflow (Sec. 4)</h2>
          {stageFilter && <button className="wt-link" onClick={() => setStageFilter('')}>Clear stage filter</button>}
        </div>
        <div className="wt-pipeline">
          {funnel.map((s, i) => (
            <React.Fragment key={s.stage}>
              <button
                className={`wt-pipe-step${stageFilter === s.stage ? ' on' : ''}${s.stage === 'Approved' ? ' final' : ''}`}
                onClick={() => setStageFilter(stageFilter === s.stage ? '' : s.stage)}
              >
                <span className="n">{s.count}</span>
                <span className="l">{s.stage}</span>
              </button>
              {i < funnel.length - 1 && <ChevronRight size={14} className="wt-pipe-sep" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── roster + attention rail ── */}
      <div className="wt-split">
        <div className="wt-split-main">
          <div className="wt-filterbar">
            <span className="lead"><Search /> Status:</span>
            {STATUS_FILTERS.map((s) => (
              <button key={s} className={`wt-chip${statusFilter === s ? ' on' : ''}`} onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
            <span className="wt-filter-spacer" />
            <span className="wt-sortpick">
              <ArrowUpDown size={12} />
              <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort providers">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </span>
            <span className="wt-viewswitch">
              <button className={view === 'table' ? 'on' : ''} onClick={() => setViewMode('table')} title="Table view"><Rows3 size={14} /></button>
              <button className={view === 'cards' ? 'on' : ''} onClick={() => setViewMode('cards')} title="Card view"><LayoutGrid size={14} /></button>
            </span>
            {filtersOn && <button className="wt-btn" onClick={clearAll}>Clear</button>}
          </div>

          {focus && (
            <div className="wt-lensbar">
              Showing <strong>{LENSES.find((l) => l.key === focus)?.label}</strong>
              <span className="muted"> — {LENSES.find((l) => l.key === focus)?.hint}</span>
              <button className="wt-link" onClick={() => setFocus('')}>Show all providers</button>
            </div>
          )}

          {!shown.length ? (
            <div className="wt-card wt-tblcard">
              <EmptyState
                eyebrow="Providers"
                title={filtersOn ? 'No providers match these filters' : 'No providers onboarded yet'}
                hint={filtersOn ? undefined : 'Start with Sec. 5 Phase 1 — capture the business profile, then work through compliance, insurance, the master agreement and the territory briefing.'}
                action={filtersOn
                  ? <button className="wt-btn" onClick={clearAll}>Clear filters</button>
                  : <button className="wt-btn primary" onClick={() => nav('/water-tank/providers/new')}><UserPlus size={14} /> Onboard the first provider</button>}
              />
            </div>
          ) : view === 'cards' ? (
            <div className="wt-provgrid">
              {shown.map((p) => {
                const cats = asList(p.service_categories);
                const areas = asList(p.coverage_areas);
                return (
                  <button key={p.id} className="wt-card wt-provcard" onClick={() => nav(`/water-tank/providers/${p.id}`)}>
                    <div className="pc-top">
                      <ReadinessRing passed={p.gates_passed} total={p.gates_total} assignable={p.assignable} size={46} />
                      <div className="pc-id">
                        <strong>{p.business_name}</strong>
                        <span className="muted">{p.code}{p.contact_person ? ` · ${p.contact_person}` : ''}</span>
                      </div>
                      <Pill value={p.status} sm />
                    </div>
                    <div className="pc-meta">
                      <span className="wt-pill sm cyan">{p.onboarding_stage}</span>
                      {p.rating ? <span className="pc-rating"><Star size={11} /> {Number(p.rating).toFixed(1)}</span> : null}
                      {p.assignable
                        ? <span className="pc-flag ok"><CheckCircle2 size={11} /> assignable</span>
                        : <span className="pc-flag no"><Ban size={11} /> {p.blocking_count} blocking</span>}
                    </div>
                    <div className="pc-commercial"><CommercialCell p={p} /></div>
                    <div className="pc-foot">
                      {areas.length ? <span><MapPin size={11} /> {areas.slice(0, 2).join(', ')}{areas.length > 2 ? ` +${areas.length - 2}` : ''}</span> : <span className="muted">No coverage set</span>}
                      <span>{cats.length ? shortCat(cats[0]) : '—'}</span>
                      <span>{p.active_jobs || 0} active · {p.total_jobs || 0} total</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="wt-card wt-tblcard">
              <table className="wt-tbl">
                <thead><tr>
                  <th style={{ width: 78 }}>ID</th><th>Provider</th>
                  <th style={{ width: 128 }}>Stage</th>
                  <th style={{ width: 118 }}>Readiness</th>
                  <th style={{ width: 168 }}>Commercial</th>
                  <th style={{ width: 116 }}>Compliance</th>
                  <th style={{ width: 92 }}>Jobs</th>
                  <th style={{ width: 108 }}>Status</th>
                  <th style={{ width: 28 }} />
                </tr></thead>
                <tbody>
                  {shown.map((p) => {
                    const cats = asList(p.service_categories);
                    const areas = asList(p.coverage_areas);
                    return (
                      <tr key={p.id} className="click" onClick={() => nav(`/water-tank/providers/${p.id}`)}>
                        <td className="id">{p.code}</td>
                        <td>
                          <strong>{p.business_name}</strong>
                          {p.rating ? <span className="pc-rating" style={{ marginLeft: 6 }}><Star size={10} /> {Number(p.rating).toFixed(1)}</span> : null}
                          <div className="cell-sub">
                            {cats.length ? shortCat(cats[0]) : (p.specialty || '—')}
                            {cats.length > 1 ? ` +${cats.length - 1}` : ''}
                            {areas.length ? ` · ${areas.slice(0, 2).join(', ')}` : ''}
                          </div>
                        </td>
                        <td><span className="wt-pill sm cyan">{p.onboarding_stage}</span></td>
                        <td>
                          <div className="wt-readycell">
                            <ReadinessRing passed={p.gates_passed} total={p.gates_total} assignable={p.assignable} />
                            <span>
                              <span className="n">{p.gates_passed}/{p.gates_total}</span>
                              {p.assignable
                                ? <span className="cell-sub" style={{ color: 'var(--wt-green)' }}>assignable</span>
                                : <span className="cell-sub" style={{ color: 'var(--wt-amber)' }}>{p.blocking_count} blocking</span>}
                            </span>
                          </div>
                        </td>
                        <td><CommercialCell p={p} /></td>
                        <td>
                          {p.docs_expired > 0 && <span className="wt-pill sm red">{p.docs_expired} expired</span>}
                          {p.docs_expired === 0 && p.docs_expiring > 0 && <span className="wt-pill sm amber">{p.docs_expiring} expiring</span>}
                          {p.docs_expired === 0 && p.docs_expiring === 0 && <span className="wt-pill sm green">Clear</span>}
                          {p.audit_overdue && <div><span className="wt-pill sm red" style={{ marginTop: 3 }}><CalendarClock size={9} /> audit due</span></div>}
                        </td>
                        <td className="muted">
                          {p.active_jobs > 0 ? <strong>{p.active_jobs} active</strong> : '—'}
                          <div className="cell-sub">{p.owed_total ? `${bdt(p.owed_total)} owed` : `${p.total_jobs} total`}</div>
                        </td>
                        <td><Pill value={p.status} sm /></td>
                        <td><ChevronRight size={15} style={{ color: 'var(--wt-muted)' }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="wt-tblfoot"><span>Showing {shown.length} of {providers.length} providers</span></div>
            </div>
          )}
        </div>

        {/* ── attention rail ── */}
        <aside className="wt-split-side">
          <div className="wt-card wt-panel">
            <div className="wt-panel-head"><h2 className="wt-section-title">Needs Attention</h2></div>
            {LENSES.length ? (
              <div className="wt-lenslist">
                {LENSES.map((l) => {
                  const Icon = l.icon;
                  return (
                    <button key={l.key} className={`wt-lens ${l.tone}${focus === l.key ? ' on' : ''}`}
                      onClick={() => setFocus(focus === l.key ? '' : l.key)}>
                      <Icon size={14} />
                      <span className="l">{l.label}<span className="h">{l.hint}</span></span>
                      <span className="c">{l.count}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>
                <CheckCircle2 size={13} style={{ verticalAlign: -2, color: 'var(--wt-green)' }} /> Nothing outstanding — every provider is compliant, agreed and assignable.
              </p>
            )}
          </div>

          {alerts?.items?.length > 0 && (
            <div className="wt-card wt-panel">
              <div className="wt-panel-head">
                <h2 className="wt-section-title">Compliance Watchtower</h2>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  {alerts.summary.high} high · {alerts.summary.medium} medium
                </span>
              </div>
              <div className="wt-alertlist compact">
                {alerts.items.slice(0, 7).map((a, i) => (
                  <button key={i} className="wt-alert" style={{ borderLeftColor: SEVERITY_COLOR[a.severity] }}
                    onClick={() => a.provider_id && nav(`/water-tank/providers/${a.provider_id}`)}>
                    <AlertTriangle size={13} style={{ color: SEVERITY_COLOR[a.severity], flex: 'none' }} />
                    <span className="t">{a.title}</span>
                    <span className="p">{a.provider_name || '—'}</span>
                    <span className="d">{a.detail}</span>
                    <span className="s">{a.sop}</span>
                  </button>
                ))}
              </div>
              {alerts.items.length > 7 && (
                <span className="muted" style={{ fontSize: 11.5 }}>+{alerts.items.length - 7} more — open a provider to work through them.</span>
              )}
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
