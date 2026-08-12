import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pencil, Plus, Repeat, AlertTriangle, TrendingUp, Wallet, Banknote, ArrowDownRight,
  CalendarClock, Building2, User, HardHat, Check, X, Trash2, Archive, FileText,
  ShieldCheck, Clock, Receipt, ChevronRight,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, dateFmt, dateTimeFmt, bdt, Loading, EmptyState,
  DatePicker, parseJson, titleCase, toast, errText,
} from './common';

/*
 * The project file — SSPC-WTCM-SOP-01.
 *
 * One dossier call gives us the project, its client, its site, its provider, its
 * AMC contract, every linked record and a derived financial position. Nothing on
 * this screen is computed from a client-side filter over the whole database the
 * way the old stub did it.
 */

const money = (v) => bdt(Number(v || 0));
const pct = (v) => `${Math.round(Number(v || 0))}%`;

const TABS = ['Overview', 'Lifecycle', 'Timeline', 'Work Orders', 'Billing', 'Documents', 'Closure'];

export default function ProjectDetail() {
  const { code } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Overview');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get(`/wt-projects/${code}`); setD(r.data); }
    catch { setD(null); }
    finally { setLoading(false); }
  }, [code]);
  useEffect(() => { load(); }, [load]);

  const setStage = async (stage, acknowledge = false) => {
    setBusy(true);
    try {
      const r = await api.post(`/wt-projects/${code}/stage`, { stage, acknowledge });
      toast.ok(`${code} → ${stage}`);
      if (r.data.warning) toast.err(r.data.warning);
      await load();
    } catch (e) {
      const data = e?.response?.data;
      if (data?.requires_acknowledgement) {
        // The SOP precondition is not met. Say so plainly and let ops decide —
        // a job that genuinely started must still be recordable.
        // eslint-disable-next-line no-alert
        if (window.confirm(`${data.warning}\n\nMove to “${stage}” anyway?`)) return setStage(stage, true);
      } else toast.err(errText(e, 'Could not change the stage'));
    } finally { setBusy(false); }
  };

  if (loading) return <Loading />;
  if (!d) return (
    <>
      <WtHead title="Project not found" crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/projects')}>Projects</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="404" title={`No project with code ${code}`}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/projects')}>Back to Projects</button>} /></div>
    </>
  );

  const { project: p, stage, client, property, provider, amc, financials: fin, related, disbursements } = d;
  const stages = stage.stages || [];
  const daysToTarget = p.target_completion
    ? Math.ceil((new Date(p.target_completion) - Date.now()) / 864e5) : null;
  const open = !['completed', 'cancelled'].includes(String(p.status || '').toLowerCase());
  const overdue = open && daysToTarget != null && daysToTarget < 0;

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/projects')}>Projects</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{p.code}</span>
        </div>}
        title={p.name}
        subtitle={[p.project_type, p.client_name, p.site_address].filter(Boolean).join(' · ')}
      >
        {/* Editing uses the same route-based six-step form the project was entered
            through, not a cut-down drawer. */}
        <button className="wt-btn" onClick={() => nav(`/water-tank/projects/${p.code}/edit`)}>
          <Pencil size={14} /> Edit project
        </button>
        <Pill value={p.status} />
      </WtHead>

      {/* AMC ribbon — only when the project genuinely sits under a contract */}
      {!!p.under_amc && (
        <div className="wt-ribbon">
          <Repeat size={16} />
          <span><strong>Under AMC</strong>{p.amc_code ? ` — ${p.amc_code}` : ''}</span>
          <span className="sep" />
          {p.amc_package && <span>{p.amc_package}</span>}
          {p.amc_frequency && <span>{p.amc_frequency}</span>}
          {p.amc_visit_no && <span>Visit #{p.amc_visit_no}</span>}
          {(p.amc_next_visit || amc?.next_visit) && <span>Next visit {dateFmt(p.amc_next_visit || amc.next_visit)}</span>}
          {amc?.status && <Pill value={amc.status} sm />}
        </div>
      )}
      {overdue && (
        <div className="wt-warn">
          <AlertTriangle size={15} />
          Target completion was {dateFmt(p.target_completion)} — {Math.abs(daysToTarget)} day(s) overdue.
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="wt-pkpis">
        <ProgressKpi value={p.progress_pct} stage={p.stage} />
        <Kpi icon={Wallet} tone="accent" label="Contract value" value={money(fin.contract_value)}
          sub={`${related.quotations.length} quotation(s)`} />
        <Kpi icon={TrendingUp} tone="green" label="Collected" value={money(fin.collected)}
          sub={`${pct(fin.collection_pct)} of ${money(fin.invoiced)} invoiced`} />
        <Kpi icon={Banknote} tone={fin.receivable > 0 ? 'red' : 'green'} label="Receivable" value={money(fin.receivable)}
          sub={fin.receivable > 0 ? 'Outstanding from client' : 'Nothing outstanding'} />
        <Kpi icon={ArrowDownRight} tone="amber" label="Disbursed" value={money(fin.disbursed)}
          sub={`${money(fin.provider_paid)} to providers`} />
        <Kpi icon={CalendarClock} tone={overdue ? 'red' : daysToTarget != null && daysToTarget <= 3 ? 'amber' : 'slate'}
          label="Target completion" value={p.target_completion ? dateFmt(p.target_completion) : '—'}
          sub={daysToTarget == null ? 'No target set' : overdue ? `${Math.abs(daysToTarget)} day(s) overdue` : `${daysToTarget} day(s) to go`} />
      </div>

      <div className="wt-subtabs" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`wt-subtab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t}
            {t === 'Work Orders' && related.workOrders.length > 0 && <span className="wt-cnt">{related.workOrders.length}</span>}
            {t === 'Billing' && (related.invoices.length + disbursements.length) > 0 && <span className="wt-cnt">{related.invoices.length + disbursements.length}</span>}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'Overview' && <Overview d={d} nav={nav} />}
        {tab === 'Lifecycle' && <Lifecycle stage={stage} stages={stages} busy={busy} onSet={setStage} project={p} />}
        {tab === 'Timeline' && <Timeline p={p} />}
        {tab === 'Work Orders' && <WorkOrders rows={related.workOrders} nav={nav} />}
        {tab === 'Billing' && <Billing d={d} reload={load} />}
        {tab === 'Documents' && <Documents d={d} nav={nav} />}
        {tab === 'Closure' && <Closure d={d} reload={load} />}
      </div>

    </>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

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

/* A ring rather than a bar: progress is the one figure people look for first. */
function ProgressKpi({ value, stage }) {
  const v = Math.max(0, Math.min(100, Number(value || 0)));
  const R = 26, C = 2 * Math.PI * R;
  return (
    <div className="wt-card wt-pkpi tone-accent">
      <svg className="wt-pring" viewBox="0 0 64 64" width="60" height="60" aria-hidden>
        <circle cx="32" cy="32" r={R} className="trk" />
        <circle cx="32" cy="32" r={R} className="bar" strokeDasharray={C} strokeDashoffset={C - (C * v) / 100} />
        <text x="32" y="36" textAnchor="middle" className="lbl">{v}%</text>
      </svg>
      <span className="tx">
        <span className="lb">Progress</span>
        <span className="vl" style={{ fontSize: 15 }}>{stage}</span>
        <span className="sb">Current stage</span>
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

/*
 * Lifecycle — the eleven SOP-01 Sec. 4 stages as a checklist.
 *
 * A checklist rather than a stepper: the operator's questions are "what is
 * done?", "where are we?" and "what is left?", and a tick answers all three at a
 * glance where a numbered rail does not. Stages are grouped by SOP phase because
 * that is how the SOP itself reads.
 */
function Lifecycle({ stage, stages, busy, onSet, project }) {
  const phases = stages.reduce((acc, s, i) => {
    const key = s.phase || 'Lifecycle';
    (acc[key] = acc[key] || []).push({ ...s, index: i });
    return acc;
  }, {});
  const doneCount = stage.index;
  const total = stages.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="wt-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <div className="wt-sec-title">Lifecycle — SOP-01 Sec. 4</div>
          <div style={{ fontSize: 12, color: 'var(--wt-muted)' }}>
            {doneCount} of {total} complete · currently {stage.label}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginBottom: 12 }}>
          Tick a stage to move the project to it. Moving out of order is allowed — the system warns
          you when the SOP precondition is not met rather than blocking a job that has genuinely started.
        </div>
        <div className="wt-progressbar">
          <span style={{ width: `${Math.round((doneCount / total) * 100)}%` }} />
        </div>
      </div>

      {Object.entries(phases).map(([phase, items]) => (
        <div className="wt-card" style={{ padding: 18 }} key={phase}>
          <div className="wt-sec-title" style={{ marginBottom: 10 }}>{phase}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map((s) => {
              const done = s.index < stage.index;
              const current = s.index === stage.index;
              return (
                <button
                  key={s.key}
                  className={`wt-liferow${done ? ' done' : ''}${current ? ' current' : ''}`}
                  disabled={busy || current}
                  onClick={() => onSet(s.label)}
                  title={current ? 'Current stage' : `Move to ${s.label}`}
                >
                  <span className="tick">
                    {done ? <Check size={14} /> : current ? <span className="dot" /> : null}
                  </span>
                  <span className="tx">
                    <span className="t">{s.label}</span>
                    <span className="h">{s.sop}</span>
                  </span>
                  {current && <span className="wt-tag amc">Current</span>}
                  {done && <span className="wt-tag" style={{ background: 'var(--wt-green-bg)', color: 'var(--wt-green)' }}>Done</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="wt-card" style={{ padding: 18 }}>
        <div className="wt-sec-title" style={{ marginBottom: 10 }}>Key dates</div>
        <div className="wt-grid3">
          {[['Started', project.start_date], ['Scheduled', project.scheduled_date],
            ['Actual start', project.actual_start], ['Target completion', project.target_completion],
            ['Actual completion', project.actual_completion], ['Handover', project.handover_at]].map(([k, v]) => (
              <div className="wt-field" key={k}>
                <label>{k}</label>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{v ? dateFmt(v) : '—'}</div>
              </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Overview({ d, nav }) {
  const { project: p, client, property, provider, related } = d;
  const services = parseJson(p.services, []) || [];
  const milestones = parseJson(p.milestones, []) || [];
  const risks = parseJson(p.risk_flags, []) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="wt-cards3">
        <InfoCard icon={User} title="Client" action={client && { label: 'Open client file', onClick: () => nav(`/water-tank/clients/${client.code}`) }}
          rows={[
            ['Name', p.client_name], ['Client ID', p.client_code], ['Type', p.client_type],
            ['Mobile', p.client_phone], ['Email', p.client_email],
            ['Agreement', p.agreement_status || 'Not Started'],
          ]} />
        <InfoCard icon={Building2} title="Site"
          action={property && { label: 'Open property', onClick: () => nav(`/properties/${property.id}`) }}
          rows={[
            ['Property', p.property_title || '—'], ['Property ID', p.property_code],
            ['Address', p.site_address], ['Area', p.area], ['District', p.district],
            ['Site contact', [p.site_contact_name, p.site_contact_phone].filter(Boolean).join(' · ')],
          ]} />
        <InfoCard icon={HardHat} title="Provider"
          action={provider && { label: 'Open provider', onClick: () => nav(`/water-tank/providers/${provider.id}`) }}
          rows={[
            ['Assigned', p.assigned_provider || 'Not yet assigned'], ['Provider ID', p.provider_code],
            ['Coordinator', p.assigned_officer], ['Ops manager', p.ops_manager],
            ['Scheduled', dateFmt(p.scheduled_date)], ['Started', dateFmt(p.actual_start)],
          ]} />
      </div>

      <div className="wt-card" style={{ padding: 18 }}>
        <div className="wt-sec-title" style={{ marginBottom: 12 }}>Scope</div>
        <div className="wt-grid3" style={{ marginBottom: 14 }}>
          {[['Project type', p.project_type], ['Category', p.service_category], ['Priority', p.priority],
            ['Tank type', p.tank_type], ['Number of tanks', p.tanks_count || '—'], ['Capacity', p.tank_capacity],
            ['Water source', p.water_source], ['Origin', p.origin], ['Health', p.health_index]].map(([k, v]) => (
              <div className="wt-field" key={k}><label>{k}</label><div style={{ fontSize: 13, fontWeight: 600 }}>{v || '—'}</div></div>
          ))}
        </div>
        {p.scope_summary && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--wt-ink-2)', lineHeight: 1.6 }}>{p.scope_summary}</p>}
        {p.access_notes && <div className="wt-note" style={{ marginBottom: 14 }}><strong>Access:</strong> {p.access_notes}</div>}

        {services.length > 0 ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 90 }}>Code</th><th>Service</th><th style={{ width: 70 }}>Qty</th><th style={{ width: 120, textAlign: 'right' }}>Rate</th><th style={{ width: 120, textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {services.map((l, i) => (
                <tr key={l.code || i}>
                  <td className="id">{l.code}</td><td>{l.name}</td>
                  <td className="muted">{l.qty || 1}</td>
                  <td style={{ textAlign: 'right' }}>{money(l.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(Number(l.price || 0) * (Number(l.qty) || 1))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <EmptyState eyebrow="Scope" title="No service lines on this project" hint="Add them by editing the project or approving a quotation." />}
      </div>

      {risks.length > 0 && (
        <div className="wt-card" style={{ padding: 18 }}>
          <div className="wt-sec-title" style={{ marginBottom: 10 }}>Risk flags</div>
          {risks.map((r, i) => (
            <div key={i} className="wt-warn" style={{ marginBottom: 6 }}>
              <AlertTriangle size={14} /> <strong>{r.label}</strong>{r.note ? ` — ${r.note}` : ''}
            </div>
          ))}
        </div>
      )}

      {milestones.length > 0 && (
        <div>
          <div className="wt-sec-title" style={{ marginBottom: 10 }}>Milestones</div>
          <div className="wt-milestones">
            {milestones.map((m, i) => (
              <div className={`wt-milestone${m.active ? ' active' : ''}`} key={i}>
                <div className="mh"><span className="mt">{m.title || m.label}</span>{m.status && <Pill value={m.status} sm />}</div>
                {m.amount != null && <div className="amt">{money(m.amount)}</div>}
                {m.date && <div className="dt">{dateFmt(m.date)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="wt-cards3">
        <CountCard label="Service requests" n={related.requests.length} onClick={() => nav('/water-tank/service-requests')} />
        <CountCard label="Site assessments" n={related.assessments.length} onClick={() => nav('/water-tank/site-assessments')} />
        <CountCard label="Quotations" n={related.quotations.length} onClick={() => nav('/water-tank/quotations')} />
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, title, rows, action }) {
  return (
    <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={15} style={{ color: 'var(--wt-accent-ink)' }} />
        <span className="wt-sec-title">{title}</span>
      </div>
      <div className="wt-profile">
        {rows.map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
      </div>
      {action && (
        <button className="wt-btn sm" style={{ alignSelf: 'flex-start' }} onClick={action.onClick}>
          {action.label} <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

function CountCard({ label, n, onClick }) {
  return (
    <button className="wt-card wt-kpi-btn" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={onClick}>
      <span style={{ fontSize: 12.5, color: 'var(--wt-muted)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800 }}>{n}</span>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

function Timeline({ p }) {
  const rows = [...(parseJson(p.timeline, []) || [])].reverse();
  if (!rows.length) return <div className="wt-card"><EmptyState eyebrow="Timeline" title="Nothing logged yet" hint="Advancing a stage or logging a disbursement writes an entry here." /></div>;
  return (
    <div className="wt-card" style={{ padding: 18 }}>
      <div className="wt-tline">
        {rows.map((t, i) => (
          <div className="wt-tlrow" key={i}>
            <span className="dot" />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong style={{ fontSize: 13.5 }}>{t.title}</strong>
                <span style={{ fontSize: 11, color: 'var(--wt-muted)', whiteSpace: 'nowrap' }}>
                  {/^\d{4}-/.test(t.at || '') ? dateTimeFmt(t.at) : t.at}
                </span>
              </div>
              {t.detail && <div style={{ fontSize: 12.5, color: 'var(--wt-muted)', marginTop: 3 }}>{t.detail}</div>}
              {t.by && <div style={{ fontSize: 11.5, color: 'var(--wt-accent-ink)', marginTop: 2 }}>{t.by}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkOrders({ rows, nav }) {
  if (!rows.length) return <div className="wt-card"><EmptyState eyebrow="Work Orders" title="No work orders on this project" hint="Approve a quotation and issue the work order to see it here." /></div>;
  return (
    <div className="wt-card wt-tblcard">
      <table className="wt-tbl">
        <thead><tr>
          <th style={{ width: 100 }}>WO No</th><th>Provider</th><th style={{ width: 130 }}>Category</th>
          <th style={{ width: 110 }}>Scheduled</th><th style={{ width: 130 }}>Document</th>
          <th style={{ width: 120 }}>Status</th><th style={{ width: 120, textAlign: 'right' }}>Fee</th>
          <th style={{ width: 120, textAlign: 'right' }}>Paid</th>
        </tr></thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id} className="click" onClick={() => nav(`/water-tank/work-orders/${w.code}`)}>
              <td className="id">{w.code}</td>
              <td><strong>{w.provider_name || '—'}</strong></td>
              <td className="muted">{w.category || '—'}</td>
              <td className="muted">{dateFmt(w.scheduled_date || w.target_date)}</td>
              <td><Pill value={w.wo_doc_status || 'Not Started'} sm /></td>
              <td><Pill value={w.status} sm /></td>
              <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(w.provider_fee)}</td>
              <td style={{ textAlign: 'right' }}>{money(w.provider_paid_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

const DISB_CATEGORIES = ['Provider Payout', 'Materials', 'Transport', 'Lab Testing', 'Government Fee', 'Equipment Hire', 'Reimbursement', 'Other'];
const DISB_STATUSES = ['Requested', 'Approved', 'Paid', 'Rejected'];

function Billing({ d, reload }) {
  const { project: p, financials: fin, related, disbursements } = d;
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    category: 'Materials', payee: '', payee_type: 'Supplier', work_order_code: '',
    description: '', amount: '', status: 'Requested', incurred_on: new Date().toISOString().slice(0, 10),
    method: '', reference: '', billable_to_client: false,
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!form.payee.trim() || !Number(form.amount)) { toast.err('A payee and an amount are required.'); return; }
    setBusy(true);
    try {
      await api.post(`/wt-projects/${p.code}/disbursements`, { ...form, amount: Number(form.amount) });
      toast.ok('Disbursement logged');
      setAdding(false);
      setForm((s) => ({ ...s, payee: '', description: '', amount: '', reference: '' }));
      await reload();
    } catch (e) { toast.err(errText(e, 'Could not log the disbursement')); }
    finally { setBusy(false); }
  };

  const patch = async (row, body) => {
    setBusy(true);
    try { await api.patch(`/wt-projects/${p.code}/disbursements/${row.id}`, body); await reload(); }
    catch (e) { toast.err(errText(e, 'Could not update it')); }
    finally { setBusy(false); }
  };

  const del = async (row) => {
    setBusy(true);
    try { await api.delete(`/wt-projects/${p.code}/disbursements/${row.id}`); toast.ok(`${row.code} removed`); await reload(); }
    catch (e) { toast.err(errText(e, 'Could not remove it')); }
    finally { setBusy(false); }
  };

  const outflowTotal = disbursements
    .filter((r) => String(r.status || '').toLowerCase() === 'paid')
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* net position strip — the whole cash story in one line */}
      <div className="wt-netstrip">
        <NetCell label="Contract value" value={money(fin.contract_value)} />
        <NetCell label="Invoiced" value={money(fin.invoiced)} />
        <NetCell label="Collected" value={money(fin.collected)} tone="green" />
        <NetCell label="Receivable" value={money(fin.receivable)} tone={fin.receivable > 0 ? 'red' : 'slate'} />
        <NetCell label="Disbursed" value={money(fin.disbursed)} tone="amber" />
        <NetCell label="Gross margin" value={money(fin.gross_margin)} sub={pct(fin.margin_pct)} tone={fin.gross_margin >= 0 ? 'green' : 'red'} />
        <NetCell label="Net position" value={money(fin.net_position)} sub="Collected − disbursed"
          tone={fin.net_position >= 0 ? 'green' : 'red'} />
      </div>

      {!!p.deposit_required && (
        <div className={p.deposit_received_at ? 'wt-note' : 'wt-warn'}>
          {p.deposit_received_at
            ? <><ShieldCheck size={15} /> Deposit of {money(p.deposit_amount)} received {dateFmt(p.deposit_received_at)}.</>
            : <><AlertTriangle size={15} /> Deposit of {money(p.deposit_amount)} required before commencement (Sec. 7) — not yet received.</>}
        </div>
      )}

      {/* quotations */}
      <div className="wt-card wt-tblcard">
        <div style={{ padding: '14px 20px 0' }}><div className="wt-sec-title">Quotations ({related.quotations.length})</div></div>
        {related.quotations.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 110 }}>Quote No</th><th>Client</th><th style={{ width: 120 }}>Validity</th><th style={{ width: 130, textAlign: 'right' }}>Total</th><th style={{ width: 120 }}>Decision</th></tr></thead>
            <tbody>
              {related.quotations.map((q) => (
                <tr key={q.id}>
                  <td className="id">{q.code}</td><td>{q.client_name}</td>
                  <td className="muted">{q.validity || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(q.total)}</td>
                  <td><Pill value={q.decision} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: '0 20px' }}><EmptyState eyebrow="Quotations" title="No quotations on this project" /></div>}
      </div>

      {/* invoices */}
      <div className="wt-card wt-tblcard">
        <div style={{ padding: '14px 20px 0' }}><div className="wt-sec-title">Invoices ({related.invoices.length})</div></div>
        {related.invoices.length ? (
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 110 }}>Invoice</th><th style={{ width: 140 }}>Type</th><th style={{ width: 110 }}>Due</th><th style={{ width: 120, textAlign: 'right' }}>Amount</th><th style={{ width: 120, textAlign: 'right' }}>Paid</th><th style={{ width: 120, textAlign: 'right' }}>Outstanding</th><th style={{ width: 110 }}>Status</th></tr></thead>
            <tbody>
              {related.invoices.map((iv) => (
                <tr key={iv.id}>
                  <td className="id">{iv.code}</td><td className="muted">{iv.inv_type || '—'}</td>
                  <td className="muted">{dateFmt(iv.due_date)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(iv.amount)}</td>
                  <td style={{ textAlign: 'right' }}>{money(iv.paid_amount)}</td>
                  <td style={{ textAlign: 'right', color: Number(iv.outstanding) > 0 ? 'var(--wt-red)' : undefined }}>{money(iv.outstanding)}</td>
                  <td><Pill value={iv.status} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ padding: '0 20px' }}><EmptyState eyebrow="Invoices" title="No invoices raised yet" /></div>}
      </div>

      {/* ── disbursements ── */}
      <div className="wt-card wt-tblcard">
        <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <div className="wt-sec-title">Disbursements ({disbursements.length})</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 3 }}>
              Money paid out on this project. Provider payouts are read from the work orders and managed on the Payments screen.
            </div>
          </div>
          <button className="wt-btn primary sm" onClick={() => setAdding((v) => !v)}>
            {adding ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Log disbursement</>}
          </button>
        </div>

        {adding && (
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--wt-line)' }}>
            <div className="wt-grid3" style={{ marginBottom: 12 }}>
              <div className="wt-field"><label>Category</label>
                <select className="wt-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {DISB_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select></div>
              <div className="wt-field"><label>Payee *</label>
                <input className="wt-input" value={form.payee} onChange={(e) => set('payee', e.target.value)} placeholder="Supplier, lab, contractor…" /></div>
              <div className="wt-field"><label>Amount *</label>
                <input className="wt-input" type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
              <div className="wt-field"><label>Status</label>
                <select className="wt-select" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {DISB_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
              <div className="wt-field"><label>Incurred on</label>
                <DatePicker value={form.incurred_on} onChange={(v) => set('incurred_on', v)} /></div>
              <div className="wt-field"><label>Against work order</label>
                <select className="wt-select" value={form.work_order_code} onChange={(e) => set('work_order_code', e.target.value)}>
                  <option value="">Not linked</option>
                  {related.workOrders.map((w) => <option key={w.code} value={w.code}>{w.code} — {w.provider_name}</option>)}
                </select></div>
              <div className="wt-field"><label>Method</label>
                <input className="wt-input" value={form.method} onChange={(e) => set('method', e.target.value)} placeholder="Cash, bKash, bank…" /></div>
              <div className="wt-field"><label>Reference</label>
                <input className="wt-input" value={form.reference} onChange={(e) => set('reference', e.target.value)} /></div>
              <div className="wt-field" style={{ gridColumn: '1 / -1' }}><label>Description</label>
                <input className="wt-input" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label className="wt-toggle">
                <input type="checkbox" checked={form.billable_to_client} onChange={(e) => set('billable_to_client', e.target.checked)} />
                Rechargeable to the client
              </label>
              <button className="wt-btn primary" style={{ marginLeft: 'auto' }} disabled={busy} onClick={save}>
                <Check size={14} /> {busy ? 'Saving…' : 'Log disbursement'}
              </button>
            </div>
          </div>
        )}

        {disbursements.length ? (
          <>
            <table className="wt-tbl">
              <thead><tr>
                <th style={{ width: 110 }}>Ref</th><th style={{ width: 140 }}>Category</th><th>Payee</th>
                <th style={{ width: 100 }}>WO</th><th style={{ width: 110 }}>Date</th>
                <th style={{ width: 120, textAlign: 'right' }}>Amount</th>
                <th style={{ width: 120 }}>Status</th><th style={{ width: 130 }} />
              </tr></thead>
              <tbody>
                {disbursements.map((r) => (
                  <tr key={`${r.source}-${r.id}`}>
                    <td className="id">{r.code}</td>
                    <td>
                      {r.category}
                      {r.source === 'work_order' && <span className="wt-tag">from work order</span>}
                      {!!r.billable_to_client && <span className="wt-tag">rechargeable</span>}
                    </td>
                    <td>
                      <strong>{r.payee || '—'}</strong>
                      {r.description && <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{r.description}</div>}
                    </td>
                    <td className="muted">{r.work_order_code || '—'}</td>
                    <td className="muted">{dateFmt(r.paid_on || r.incurred_on)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(r.amount)}</td>
                    <td><Pill value={r.status} sm /></td>
                    <td>
                      {r.editable ? (
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          {String(r.status).toLowerCase() === 'requested' && (
                            <button className="wt-btn sm" disabled={busy} onClick={() => patch(r, { status: 'Approved' })}>Approve</button>
                          )}
                          {String(r.status).toLowerCase() !== 'paid' && String(r.status).toLowerCase() !== 'rejected' && (
                            <button className="wt-btn sm primary" disabled={busy} onClick={() => patch(r, { status: 'Paid' })}>Mark paid</button>
                          )}
                          <button className="wt-iconbtn" disabled={busy} title="Remove" onClick={() => del(r)}><Trash2 size={13} /></button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--wt-muted)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                          <Receipt size={12} /> read-only
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--wt-line)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: 'var(--wt-muted)' }}>
                Paid out {money(outflowTotal)}
                {fin.register_pending > 0 && <> · {money(fin.register_pending)} requested or approved, not yet paid</>}
              </span>
              <strong>Total outflow {money(fin.disbursed)}</strong>
            </div>
          </>
        ) : (
          <div style={{ padding: '0 20px 8px' }}>
            <EmptyState eyebrow="Disbursements" title="Nothing paid out on this project yet"
              hint="Log materials, transport, lab testing, government fees or reimbursements here. Provider payouts appear automatically once recorded on the work order." />
          </div>
        )}
      </div>
    </div>
  );
}

function NetCell({ label, value, sub, tone = 'slate' }) {
  return (
    <div className={`wt-netcell tone-${tone}`}>
      <span className="lb">{label}</span>
      <span className="vl">{value}</span>
      {sub && <span className="sb">{sub}</span>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

function Documents({ d, nav }) {
  const { project: p, related } = d;
  const docs = [
    // Carrying ?project= is what makes the agreement inherit the project's client,
    // site, tanks, scope, priced services, dates and deposit rather than starting blank.
    { label: 'Customer Service Agreement', code: p.agreement_code, status: p.agreement_status || 'Not Started',
      hint: p.agreement_code
        ? 'Sec. 7 Step 6 — required before commencement'
        : 'Sec. 7 Step 6 — raise it prefilled from this project',
      onClick: () => nav(`/agreements/water-tank-customer?project=${encodeURIComponent(p.code)}`) },
    { label: 'Quotation', code: p.quotation_code || related.quotations[0]?.code,
      status: related.quotations[0]?.decision || (p.needs_quotation ? 'To be prepared' : 'None'),
      hint: 'Sec. 7 Step 5',
      onClick: () => (related.quotations[0] ? nav(`/water-tank/quotations/${related.quotations[0].code}`) : nav('/water-tank/quotations')) },
    { label: 'Site Assessment Report', code: related.assessments[0]?.code, status: related.assessments[0]?.status || 'None',
      hint: 'Sec. 6 Step 4',
      onClick: () => (related.assessments[0] ? nav(`/water-tank/site-assessments/${related.assessments[0].code}`) : nav('/water-tank/site-assessments')) },
    { label: 'Project Work Order', code: related.workOrders[0]?.code, status: related.workOrders[0]?.wo_doc_status || 'None',
      hint: 'SOP-02 Sec. 7 Step 6',
      onClick: () => (related.workOrders[0] ? nav(`/water-tank/work-orders/${related.workOrders[0].code}/document`) : nav('/water-tank/work-orders')) },
    { label: 'Warranty', code: p.warranty_code || related.warranties[0]?.code,
      status: related.warranties[0]?.status || (p.warranty_period || 'None'),
      hint: 'Sec. 9 Step 10 / SOP-02 Sec. 9 Step 12',
      onClick: () => nav('/water-tank/registers') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="wt-note">
        Documents raised from here inherit this project&rsquo;s client, site, tank details, scope,
        priced services, dates and deposit — and carry {p.code} as the reference, so nothing is retyped.
      </div>
      {docs.map((doc) => (
        <button key={doc.label} className="wt-doccard" onClick={doc.onClick}>
          <FileText size={18} />
          <span className="tx">
            <span className="t">{doc.label}</span>
            <span className="h">{doc.code ? `${doc.code} · ` : ''}{doc.hint}</span>
          </span>
          <Pill value={doc.status} sm />
          <ChevronRight size={15} style={{ color: 'var(--wt-muted)' }} />
        </button>
      ))}
      {related.incidents.length > 0 && (
        <div className="wt-card wt-tblcard">
          <div style={{ padding: '14px 20px 0' }}><div className="wt-sec-title">Incidents ({related.incidents.length})</div></div>
          <table className="wt-tbl">
            <thead><tr><th style={{ width: 110 }}>Ref</th><th>Type</th><th style={{ width: 110 }}>Severity</th><th style={{ width: 110 }}>Date</th><th style={{ width: 110 }}>Status</th></tr></thead>
            <tbody>
              {related.incidents.map((i) => (
                <tr key={i.id}>
                  <td className="id">{i.code}</td><td>{i.incident_type}</td>
                  <td><Pill value={i.severity} sm /></td><td className="muted">{dateFmt(i.incident_date)}</td>
                  <td><Pill value={i.status} sm /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────── */

function Closure({ d, reload }) {
  const { project: p, closure_checklist: checklist } = d;
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(p.satisfaction_score || '');
  const done = checklist.filter((c) => c.done).length;
  const allDone = done === checklist.length;

  const toggle = async (item, value) => {
    setBusy(true);
    try {
      await api.post(`/wt-projects/${p.code}/closure`, { checklist: [{ key: item.key, done: value }] });
      await reload();
    } catch (e) { toast.err(errText(e, 'Could not update the checklist')); }
    finally { setBusy(false); }
  };

  const saveScore = async () => {
    setBusy(true);
    try {
      await api.post(`/wt-projects/${p.code}/closure`, { satisfaction_score: Number(score) || null });
      toast.ok('Satisfaction score saved');
      await reload();
    } catch (e) { toast.err(errText(e, 'Could not save the score')); }
    finally { setBusy(false); }
  };

  const close = async () => {
    setBusy(true);
    try {
      await api.post(`/wt-projects/${p.code}/closure`, { close: true });
      toast.ok(`${p.code} closed`);
      await reload();
    } catch (e) { toast.err(errText(e, 'Could not close the project')); }
    finally { setBusy(false); }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await api.post(`/wt-projects/${p.code}/closure`, { archive: true });
      toast.ok(`${p.code} archived`);
      await reload();
    } catch (e) { toast.err(errText(e, 'Could not archive the project')); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="wt-card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div className="wt-sec-title">Project closure checklist</div>
            <div style={{ fontSize: 11.5, color: 'var(--wt-muted)', marginTop: 3 }}>SOP-01 Sec. 12 — every item must be ticked before the file closes.</div>
          </div>
          <strong style={{ fontSize: 15 }}>{done} / {checklist.length}</strong>
        </div>
        <div className="wt-progressbar" style={{ marginBottom: 16 }}>
          <span style={{ width: `${(done / checklist.length) * 100}%`, background: allDone ? 'var(--wt-green)' : 'var(--wt-accent)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {checklist.map((c) => (
            <label key={c.key} className={`wt-check-row${c.done ? ' on' : ''}`}>
              <input type="checkbox" checked={!!c.done} disabled={busy} onChange={(e) => toggle(c, e.target.checked)} />
              <span className="tx">
                <span className="t">{c.label}</span>
                <span className="h">{c.sop}{c.done && c.at ? ` · ${dateTimeFmt(c.at)}${c.by ? ` by ${c.by}` : ''}` : ''}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="wt-cards3">
        <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="wt-sec-title">Client satisfaction</div>
          <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>Sec. 13 KPI — Customer Satisfaction Score, out of 10.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="wt-input" type="number" min="1" max="10" value={score} onChange={(e) => setScore(e.target.value)} style={{ width: 90 }} />
            <button className="wt-btn" disabled={busy} onClick={saveScore}>Save</button>
          </div>
        </div>
        <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="wt-sec-title">Handover</div>
          <div className="wt-profile">
            <div className="f"><div className="k">Handover date</div><div className="v">{dateFmt(p.handover_at)}</div></div>
            <div className="f"><div className="k">Warranty</div><div className="v">{p.warranty_period || '—'}</div></div>
            <div className="f"><div className="k">Completed</div><div className="v">{dateFmt(p.actual_completion)}</div></div>
          </div>
        </div>
        <div className="wt-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="wt-sec-title">Close the file</div>
          <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>
            {p.closed_at ? `Closed ${dateTimeFmt(p.closed_at)}.` : allDone ? 'All items ticked — ready to close.' : `${checklist.length - done} item(s) outstanding.`}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!p.closed_at && (
              <button className="wt-btn primary" disabled={busy || !allDone} onClick={close}>
                <Check size={14} /> Close project
              </button>
            )}
            {p.closed_at && !p.archived_at && (
              <button className="wt-btn" disabled={busy} onClick={archive}><Archive size={14} /> Archive file</button>
            )}
            {p.archived_at && (
              <span style={{ fontSize: 12.5, color: 'var(--wt-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Check size={14} /> Archived {dateFmt(p.archived_at)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
