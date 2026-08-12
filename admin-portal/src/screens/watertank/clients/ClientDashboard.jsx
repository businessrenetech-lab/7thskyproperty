import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  RefreshCw,
  Droplets,
  ClipboardList,
  FileSignature,
  Wallet,
  Package,
  Star,
  ShieldCheck,
  AlertTriangle,
  MessageSquarePlus,
  Plus,
  Archive,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import api from '../../../services/api';
import {
  WtHead, WtTabs, Pill, Loading, EmptyState, DatePicker, WtDrawer, RowActions,
  dateFmt, dateTimeFmt, bdt, titleCase, toast, errText, parseJson,
} from '../common';

/*
 * Client dashboard — the client's own home in the Water Tank console.
 * Built to SSPC-WTCM-SOP-01: the Sec. 4 workflow across the top, the phase gates
 * beneath it, then everything Seventh Sky holds on them — account, service
 * history, documents, AMC, complaints and the closure checklist.
 */

const TABS = ['Overview', 'Journey', 'Service History', 'Account', 'AMC & Warranty', 'Complaints', 'Documents', 'Timeline'];
const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const pct = (v) => (v == null ? '—' : `${v}%`);

const Stat = ({ label, value, sub, tone, icon: Icon }) => (
  <div className="wt-card" style={{ padding: '15px 17px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    {Icon && <span className="wt-kpi-ic" style={{ background: 'var(--wt-accent-tint)', color: 'var(--wt-accent)', width: 32, height: 32 }}><Icon size={15} /></span>}
    <div style={{ minWidth: 0 }}>
      <div className="wt-kpi-label">{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone, margin: '2px 0' }}>{value}</div>
      {sub && <div className="wt-kpi-sub">{sub}</div>}
    </div>
  </div>
);

/* generic action drawer, same pattern as the provider console */
function ActionDrawer({ title, subtitle, note, fields, submitLabel, onClose, onSubmit }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? (f.type === 'boolean' ? false : '')])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const go = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length) { setErr(`${missing.map((m) => m.label).join(', ')} required`); return; }
    setBusy(true); setErr('');
    try { await onSubmit(form); }
    catch (e) {
      const data = e?.response?.data;
      setErr(data?.blocking ? `${data.error} ${data.blocking.join(' · ')}` : errText(e, 'Could not complete this action'));
      setBusy(false);
    }
  };

  return (
    <WtDrawer title={title} subtitle={subtitle} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy} onClick={go}>{busy ? 'Working…' : submitLabel}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      {note && <div className="wt-note">{note}</div>}
      {fields.map((f) => (
        <div className="wt-field" key={f.key}>
          <label>{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'date' ? <DatePicker value={form[f.key]} onChange={(v) => set(f.key, v)} />
            : f.type === 'textarea' ? <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              : f.type === 'select' ? <select className="wt-select" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                : f.type === 'boolean' ? <label className="wt-toggle"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} /><span>{form[f.key] ? 'Yes' : 'No'}</span></label>
                  : <input className="wt-input" type={f.type || 'text'} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
          {f.hint && <span className="hint">{f.hint}</span>}
        </div>
      ))}
    </WtDrawer>
  );
}

export default function ClientDashboard() {
  const { code } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [action, setAction] = useState(null);
  const [closure, setClosure] = useState(null);
  const [journey, setJourney] = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-clients/${code}`)
      .then((r) => setD(r.data))
      .catch((e) => { setD(null); setError(errText(e, 'Could not load this client')); })
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const post = async (path, body, msg) => {
    const r = await api.post(`/wt-clients/${d.client.id}${path}`, body);
    if (msg) toast.ok(msg);
    load();
    return r;
  };

  if (loading) return <Loading />;
  if (error || !d) return (
    <>
      <WtHead title="Client not found" crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/clients')}>Clients</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load this client" hint={error}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/clients')}>Back to clients</button>} /></div>
    </>
  );

  const c = d.client;
  const a = d.account || {};
  const stageIdx = d.stages.indexOf(c.workflow_stage);
  const checklist = parseJson(c.closure_checklist, {}) || {};
  const handoverDocs = parseJson(c.handover_docs, []) || [];
  const closureDone = (d.reference.closure_checklist || []).filter((i) => checklist[i.key]).length;

  /* ── lifecycle actions ── */
  const openConsultation = () => setAction({
    title: 'Initial Consultation', subtitle: 'Sec. 5 Step 2', submitLabel: 'Save consultation',
    note: 'Capture tank type, capacity, how many, existing issues, water-quality concerns and AMC interest.',
    fields: [
      { key: 'tank_type', label: 'Tank type', type: 'select', options: d.reference.service_catalogue ? ['Overhead', 'Underground', 'Rooftop', 'Ground Level', 'Sectional', 'Pressure Vessel'] : [], value: c.tank_type || '' },
      { key: 'tank_capacity', label: 'Tank capacity', value: c.tank_capacity || '' },
      { key: 'tanks_count', label: 'Number of tanks', type: 'number', value: c.tanks_count || '' },
      { key: 'last_cleaning', label: 'Last cleaned', value: c.last_cleaning || '' },
      { key: 'key_issues', label: 'Existing issues', type: 'textarea', value: c.key_issues || '' },
      { key: 'water_quality_concerns', label: 'Water quality concerns', type: 'textarea', value: c.water_quality_concerns || '' },
      { key: 'amc_required', label: 'AMC required', type: 'boolean', value: !!c.amc_required },
      { key: 'consultation_notes', label: 'Notes', type: 'textarea', value: c.consultation_notes || '' },
    ],
    onSubmit: async (f) => { await post('/consultation', f, 'Consultation recorded'); setAction(null); },
  });

  /*
   * The SOP path to an agreement (Sec. 6 → Sec. 7): a job either needs a site
   * visit before it can be priced, or it is understood well enough to quote
   * straight away. Either way a QUOTATION is what the Customer Service Agreement
   * is built from (Clause 7), so the agreement is never raised out of thin air —
   * the operator picks the branch and the records are generated for them.
   */
  // 'Approved' is the decision vocabulary the quotation register uses — the SOP
  // gate at Sec. 7 Step 5 keys off it, so the client file must speak it too.
  const approvedQuote = (d.quotations || []).find((q) => String(q.decision || '').toLowerCase() === 'approved');
  const pendingQuote = (d.quotations || []).find((q) => !['approved', 'rejected'].includes(String(q.decision || '').toLowerCase()));
  const openAssessment = (d.assessments || []).find((s) => !['completed', 'cancelled'].includes(String(s.status || '').toLowerCase()));

  const approveQuote = async (q) => {
    try {
      await api.patch(`/wt-ops/quotations/${q.id}`, { decision: 'Approved' });
      toast.ok(`${q.code} approved — the agreement can now be raised`);
      await load();
    } catch (e) { toast.err(errText(e, 'Could not approve the quotation')); }
  };

  // Recording an agreement signed outside the system stays available, but it is
  // no longer the only route — see the journey chooser above.
  const openAgreement = () => setAction({
    title: 'Record an existing agreement', subtitle: 'Sec. 7 Step 6 — for one signed outside the system', submitLabel: 'Record agreement',
    note: 'Use this only for an agreement already signed on paper or elsewhere. To raise a new one, use “Create agreement” — it generates the quotation the agreement is built from.',
    fields: [
      { key: 'agreement_status', label: 'Status', type: 'select', options: ['Not Started', 'Sent', 'Signed', 'Expired'], value: c.agreement_status || 'Signed' },
      { key: 'agreement_code', label: 'Agreement / envelope reference', value: c.agreement_code || '' },
      { key: 'agreement_signed_date', label: 'Signed date', type: 'date', value: c.agreement_signed_date || '' },
    ],
    onSubmit: async (f) => { await post('/agreement', f, 'Agreement recorded'); setAction(null); },
  });

  const openDeposit = () => setAction({
    title: 'Record Deposit', subtitle: 'Deposit Collection (Sec. 4)', submitLabel: 'Record deposit',
    note: a.deposit_due > 0 ? `${bdt(a.deposit_due)} still outstanding on a ${bdt(c.deposit_amount)} deposit.` : 'Set the deposit required and record what has been received.',
    fields: [
      { key: 'deposit_amount', label: 'Deposit required (৳)', type: 'number', value: c.deposit_amount || '' },
      { key: 'amount', label: 'Amount received (৳)', type: 'number', required: true },
      { key: 'deposit_date', label: 'Received on', type: 'date', value: new Date().toISOString().slice(0, 10) },
      { key: 'reference', label: 'Reference' },
    ],
    onSubmit: async (f) => { await post('/deposit', f, 'Deposit recorded'); setAction(null); },
  });

  const openHandover = () => setAction({
    title: 'Client Handover', subtitle: 'Sec. 9 Step 10', submitLabel: 'Record handover',
    note: `Hand over: ${(d.reference.handover_docs || []).join(', ')}.`,
    fields: [
      { key: 'handover_date', label: 'Handover date', type: 'date', value: new Date().toISOString().slice(0, 10) },
      { key: 'maintenance_recommendations', label: 'Maintenance recommendations', type: 'textarea', value: c.maintenance_recommendations || '' },
    ],
    onSubmit: async (f) => {
      await post('/handover', { ...f, handover_docs: d.reference.handover_docs }, 'Handover recorded');
      setAction(null);
    },
  });

  const openNote = () => setAction({
    title: 'Log Interaction', subtitle: 'Sec. 3 — CRM updates', submitLabel: 'Log to CRM',
    fields: [
      { key: 'channel', label: 'Channel', type: 'select', options: ['call', 'email', 'sms', 'whatsapp', 'visit', 'note'], value: 'call' },
      { key: 'direction', label: 'Direction', type: 'select', options: ['inbound', 'outbound'], value: 'outbound' },
      { key: 'summary', label: 'Summary', type: 'textarea', required: true },
    ],
    onSubmit: async (f) => { await post('/note', f, 'Logged to CRM'); setAction(null); },
  });

  const advanceStage = async (stage) => {
    try { await post('/stage', { stage }, `${c.name} → ${stage}`); }
    catch (e) {
      const data = e?.response?.data;
      toast.err(data?.blocking ? `${data.error} ${data.blocking.join(' · ')}` : errText(e));
    }
  };

  const counts = {
    'Service History': d.work_orders.length || undefined,
    Complaints: d.complaints.filter((x) => !['resolved', 'closed'].includes(String(x.status || '').toLowerCase())).length || undefined,
    Documents: (d.quotations.length + d.reports.length) || undefined,
  };

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/clients')}>Clients</span> › <span style={{ color: 'var(--wt-accent-ink)' }}>{c.code}</span></div>}
        title={c.name}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={openNote}><MessageSquarePlus size={14} /> Log interaction</button>
        <button className="wt-btn primary" onClick={() => setJourney(true)}>
          <FileSignature size={14} /> Create agreement
        </button>
        <RowActions items={[
          { label: 'Initial consultation (Sec. 5.2)', icon: Droplets, onClick: openConsultation },
          { label: 'Record an existing agreement', icon: FileSignature, onClick: openAgreement },
          { label: 'Record deposit', icon: Wallet, onClick: openDeposit },
          { label: 'Client handover (Sec. 9.10)', icon: Package, onClick: openHandover },
          { label: 'Project closure (Sec. 12)', icon: Archive, onClick: () => { setTab('Overview'); setClosure(checklist); } },
          { label: 'Log a complaint (Sec. 11)', icon: AlertTriangle, onClick: () => nav('/water-tank/complaints') },
        ]} />
      </WtHead>

      {/* ── hero ── */}
      <div className="wt-cd-hero">
        <span className="av">{initials(c.name)}</span>
        <div style={{ minWidth: 0 }}>
          <h1>{c.name}</h1>
          <div className="sub">
            {[c.code, c.client_type, c.property_type, c.district].filter(Boolean).join(' · ')}
          </div>
          <div className="chips">
            {c.mobile && <span className="chip"><Phone size={10} style={{ verticalAlign: -1 }} /> {c.mobile}</span>}
            {c.email && <span className="chip"><Mail size={10} style={{ verticalAlign: -1 }} /> {c.email}</span>}
            {c.service_address && <span className="chip"><MapPin size={10} style={{ verticalAlign: -1 }} /> {c.service_address}</span>}
            {a.amc_active && <span className="chip" style={{ background: 'rgba(16,185,129,.3)' }}>AMC active</span>}
            {!d.agreement_ok && <span className="chip" style={{ background: 'rgba(251,191,36,.3)' }}>Agreement unsigned</span>}
          </div>
        </div>
        <div className="money">
          <div className="k">Lifetime value</div>
          <div className="v">{bdt(a.lifetime_value)}</div>
          {a.outstanding > 0 && <div className="k" style={{ color: '#fca5a5' }}>{bdt(a.outstanding)} outstanding</div>}
        </div>
      </div>

      {/* ── Sec. 4 workflow ── */}
      <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="wt-panel-head">
          <h2 className="wt-section-title">Client Management Workflow (Sec. 4)</h2>
          <span className="muted" style={{ fontSize: 11.5 }}>{d.stage_phase[c.workflow_stage]}</span>
        </div>
        <div className="wt-pipeline">
          {d.stages.map((s, i) => (
            <button key={s} className={`wt-pipe-step${s === c.workflow_stage ? ' on' : ''}${i < stageIdx ? ' final' : ''}`}
              onClick={() => advanceStage(s)} title={s === c.workflow_stage ? 'Current stage' : `Move to ${s}`}>
              <span className="n">{i < stageIdx ? <Check size={14} /> : i + 1}</span>
              <span className="l">{s}</span>
            </button>
          ))}
        </div>
        {!d.agreement_ok && (
          <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', borderColor: '#fde68a', color: 'var(--wt-amber)' }}>
            <strong>No signed agreement.</strong> Sec. 7 Step 6 requires the Customer Service Agreement before commencement — Provider Assignment and Service Delivery are blocked until it is recorded.
            <button className="wt-btn sm" style={{ marginLeft: 10 }} onClick={openAgreement}>Record agreement</button>
          </div>
        )}
      </div>

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'Overview' && (
        <>
          <div className="wt-kpigrid">
            <Stat icon={Package} label="Jobs" value={`${a.jobs_total}`} sub={`${a.jobs_active} active · ${a.jobs_completed} completed`} />
            <Stat icon={Check} label="Completion Rate" value={pct(a.completion_rate)} sub="jobs finished vs. cancelled" tone="var(--wt-green)" />
            <Stat icon={Wallet} label="Collected" value={bdt(a.collected)} sub={`${bdt(a.outstanding)} outstanding`} tone={a.outstanding ? 'var(--wt-red)' : undefined} />
            <Stat icon={AlertTriangle} label="Open Complaints" value={`${a.open_complaints}`} sub={a.avg_resolution_hours ? `avg ${a.avg_resolution_hours}h to resolve` : 'none resolved yet'} tone={a.open_complaints ? 'var(--wt-red)' : undefined} />
            <Stat icon={ShieldCheck} label="Active Warranties" value={`${a.active_warranties}`} sub="cover in force" />
            <Stat icon={Star} label="Satisfaction" value={a.satisfaction_score ? `${a.satisfaction_score} / 5` : '—'} sub={c.satisfaction_date ? `surveyed ${dateFmt(c.satisfaction_date)}` : 'not yet surveyed'} />
          </div>

          <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="wt-card" style={{ padding: 20 }}>
              <div className="wt-panel-head" style={{ marginBottom: 12 }}>
                <div className="wt-sec-title">Tank &amp; Service Profile (Sec. 5 Step 2)</div>
                <button className="wt-btn sm" onClick={openConsultation}>Update</button>
              </div>
              <div className="wt-profile">
                {[['Requested service', c.requested_service], ['Service category', c.service_category],
                  ['Tank type', c.tank_type], ['Capacity', c.tank_capacity], ['Number of tanks', c.tanks_count || null],
                  ['Last cleaned', c.last_cleaning], ['Existing issues', c.key_issues],
                  ['Water quality concerns', c.water_quality_concerns],
                  ['AMC required', c.amc_required ? 'Yes' : 'No'],
                  ['Consultation', c.consultation_date ? `${dateFmt(c.consultation_date)} · ${c.consultation_by || '—'}` : null]]
                  .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
              </div>
            </div>

            <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="wt-panel-head">
                <div className="wt-sec-title">Project Closure Checklist (Sec. 12)</div>
                <span className="muted" style={{ fontSize: 11.5 }}>{closureDone}/{(d.reference.closure_checklist || []).length}</span>
              </div>
              <div className="wt-gates">
                {(d.reference.closure_checklist || []).map((item) => {
                  const on = !!(closure || checklist)[item.key];
                  return (
                    <button key={item.key} className={`wt-gate${on ? ' ok' : ''}`} style={{ cursor: 'pointer', font: 'inherit', textAlign: 'left', width: '100%' }}
                      onClick={() => setClosure({ ...(closure || checklist), [item.key]: !on })}>
                      <span className="ic">{on ? <Check size={13} /> : <X size={13} />}</span>
                      <div className="tx"><span className="l">{item.label}</span></div>
                    </button>
                  );
                })}
              </div>
              {closure && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="wt-btn" onClick={() => setClosure(null)}>Cancel</button>
                  <button className="wt-btn primary" style={{ flex: 1, justifyContent: 'center' }}
                    onClick={async () => { await post('/closure', { closure_checklist: closure }, 'Closure checklist saved'); setClosure(null); }}>
                    Save checklist
                  </button>
                </div>
              )}
              {c.closed_date && <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
                Project closed {dateFmt(c.closed_date)}{c.archived ? ' · file archived' : ''}.</div>}
            </div>
          </div>
        </>
      )}

      {/* ═══ JOURNEY (phase gates) ═══ */}
      {tab === 'Journey' && (
        <div className="wt-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="wt-panel-head">
            <h2 className="wt-section-title">SOP Phase Gates</h2>
            <span className="muted" style={{ fontSize: 11.5 }}>{d.gates.filter((g) => g.ok).length} of {d.gates.length} complete</span>
          </div>
          <div className="wt-gates">
            {d.gates.map((g) => (
              <div key={g.key} className={`wt-gate${g.ok ? ' ok' : ''}`}>
                <span className="ic">{g.ok ? <Check size={13} /> : <X size={13} />}</span>
                <div className="tx"><span className="l">{g.label}</span><span className="s">{g.stage} · {g.sop}</span></div>
                {!g.ok && (
                  <button className="wt-btn sm" onClick={() => {
                    if (g.key === 'consultation') openConsultation();
                    else if (g.key === 'assessment') nav('/water-tank/site-assessments');
                    else if (g.key === 'quotation') nav('/water-tank/quotations');
                    else if (g.key === 'agreement') openAgreement();
                    else if (g.key === 'deposit') openDeposit();
                    else if (g.key === 'provider' || g.key === 'delivery') nav('/water-tank/work-orders');
                    else if (g.key === 'reporting') nav('/water-tank/reports');
                    else if (g.key === 'handover') openHandover();
                    else setTab('Overview');
                  }}>Resolve</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ SERVICE HISTORY ═══ */}
      {tab === 'Service History' && (
        <>
          {[['Service Requests', d.requests, [['code', 'ID'], ['specific_service', 'Service'], ['request_date', 'Requested'], ['status', 'Status']], '/water-tank/service-requests'],
            ['Site Assessments', d.assessments, [['code', 'ID'], ['provider', 'Provider'], ['assessed_date', 'Date'], ['status', 'Status']], '/water-tank/site-assessments'],
            ['Work Orders', d.work_orders, [['code', 'WO'], ['provider_name', 'Provider'], ['target_date', 'Target'], ['status', 'Status']], '/water-tank/work-orders'],
          ].map(([title, rows, cols, route]) => (
            <div className="wt-card wt-tblcard" key={title}>
              <div style={{ padding: '14px 18px 0' }}><div className="wt-sec-title">{title} ({rows.length})</div></div>
              {rows.length ? (
                <table className="wt-tbl">
                  <thead><tr>{cols.map(([, l]) => <th key={l}>{l}</th>)}</tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="click" onClick={() => nav(`${route}?focus=${encodeURIComponent(r.code)}`)}>
                        {cols.map(([k, l]) => (
                          <td key={l} className={k === 'code' ? 'id' : 'muted'}>
                            {k === 'status' ? <Pill value={r[k]} sm />
                              : /_date$/.test(k) ? dateFmt(r[k])
                                : r[k] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <EmptyState eyebrow={title} title={`No ${title.toLowerCase()} yet`} />}
            </div>
          ))}
        </>
      )}

      {/* ═══ ACCOUNT ═══ */}
      {tab === 'Account' && (
        <>
          <div className="wt-kpigrid">
            <Stat icon={Wallet} label="Lifetime Value" value={bdt(a.lifetime_value)} sub="total invoiced" />
            <Stat icon={Check} label="Collected" value={bdt(a.collected)} sub="received to date" tone="var(--wt-green)" />
            <Stat icon={AlertTriangle} label="Outstanding" value={bdt(a.outstanding)} sub={a.overdue ? `${bdt(a.overdue)} overdue` : 'nothing overdue'} tone={a.outstanding ? 'var(--wt-red)' : undefined} />
            <Stat icon={Wallet} label="Deposit" value={c.deposit_required ? bdt(c.deposit_paid_amount) : 'Not required'} sub={c.deposit_required ? `of ${bdt(c.deposit_amount)} · ${bdt(a.deposit_due)} due` : '—'} />
          </div>
          <div className="wt-card wt-tblcard">
            <div style={{ padding: '14px 18px 0' }}>
              <div className="wt-panel-head"><div className="wt-sec-title">Quotations ({d.quotations.length}) &amp; Invoices ({d.invoices.length})</div>
                <button className="wt-btn sm" onClick={openDeposit}><Plus size={13} /> Record deposit</button></div>
            </div>
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 100 }}>Ref</th><th style={{ width: 120 }}>Kind</th><th>Detail</th>
                <th style={{ width: 120, textAlign: 'right' }}>Amount</th><th style={{ width: 120, textAlign: 'right' }}>Outstanding</th><th style={{ width: 120 }}>Status</th></tr></thead>
              <tbody>
                {d.quotations.map((r) => (
                  <tr key={`q${r.id}`} className="click" onClick={() => nav(`/water-tank/quotations?focus=${encodeURIComponent(r.code)}`)}>
                    <td className="id">{r.code}</td><td className="muted">Quotation</td><td className="muted">{r.validity || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.total)}</td><td /><td><Pill value={r.decision} sm /></td>
                  </tr>
                ))}
                {d.invoices.map((r) => (
                  <tr key={`i${r.id}`} className="click" onClick={() => nav(`/water-tank/invoices?focus=${encodeURIComponent(r.code)}`)}>
                    <td className="id">{r.code}</td><td className="muted">Invoice</td><td className="muted">{r.inv_type || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(r.amount)}</td>
                    <td style={{ textAlign: 'right', color: Number(r.outstanding) > 0 ? 'var(--wt-red)' : undefined }}>{bdt(r.outstanding)}</td>
                    <td><Pill value={r.status} sm /></td>
                  </tr>
                ))}
                {!d.quotations.length && !d.invoices.length && <tr className="wt-empty-row"><td colSpan={6}>Nothing billed yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ═══ AMC & WARRANTY ═══ */}
      {tab === 'AMC & Warranty' && (
        <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-panel-head"><div className="wt-sec-title">AMC Management (Sec. 10)</div>
              <button className="wt-btn sm" onClick={() => nav('/water-tank/amc')}>Open AMC</button></div>
            {d.amc.length ? d.amc.map((m) => (
              <div key={m.id} className="wt-card" style={{ padding: 14, boxShadow: 'none', border: '1px solid var(--wt-line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 13.5 }}>{m.package || 'AMC'}</strong><Pill value={m.status} sm />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--wt-muted)', marginTop: 4 }}>
                  {m.frequency} · {bdt(m.annual_value)}/yr · next visit {m.next_visit || '—'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--wt-muted)' }}>{dateFmt(m.start_date)} → {dateFmt(m.end_date)}</div>
              </div>
            )) : <EmptyState eyebrow="AMC" title="No AMC contract"
              hint={c.amc_required ? 'This client asked about an AMC at consultation — worth following up.' : 'Offer an AMC at project closure to lift the renewal rate.'} />}
          </div>
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-panel-head"><div className="wt-sec-title">Warranties (Sec. 9 Step 12)</div></div>
            {d.warranties.length ? d.warranties.map((w) => (
              <div key={w.id} className="wt-card" style={{ padding: 14, boxShadow: 'none', border: '1px solid var(--wt-line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 13.5 }}>{w.warranty_type}</strong><Pill value={w.status} sm />
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--wt-muted)', marginTop: 4 }}>
                  {w.code} · {w.work_order_code || '—'} · {dateFmt(w.start_date)} → {dateFmt(w.expiry_date)}
                </div>
              </div>
            )) : <EmptyState eyebrow="Warranties" title="No warranties issued" hint="Completing a work order registers the warranty automatically." />}
            {c.maintenance_recommendations && (
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 6 }}>Maintenance Recommendations</div>
                <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{c.maintenance_recommendations}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ COMPLAINTS ═══ */}
      {tab === 'Complaints' && (
        <>
          <div className="wt-note">Sec. 11 — every complaint must be logged in the CRM, acknowledged within <strong>1 business day</strong>, investigated and resolved promptly.</div>
          <div className="wt-card wt-tblcard">
            {d.complaints.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 96 }}>Code</th><th>Incident</th><th style={{ width: 90 }}>Severity</th>
                  <th style={{ width: 110 }}>Logged</th><th style={{ width: 130 }}>Acknowledged</th><th style={{ width: 110 }}>Resolution</th><th style={{ width: 118 }}>Status</th></tr></thead>
                <tbody>
                  {d.complaints.map((x) => {
                    const acked = !!x.acknowledged_at;
                    const open = !['resolved', 'closed'].includes(String(x.status || '').toLowerCase());
                    return (
                      <tr key={x.id} className="click" onClick={() => nav(`/water-tank/complaints?focus=${encodeURIComponent(x.code)}`)}>
                        <td className="id" style={{ color: 'var(--wt-red)' }}>{x.code}</td>
                        <td><strong>{x.incident_type || '—'}</strong></td>
                        <td><Pill value={x.severity} sm /></td>
                        <td className="muted">{dateFmt(x.logged_date || x.createdAt)}</td>
                        <td style={{ color: !acked && open ? 'var(--wt-red)' : 'var(--wt-muted)', fontWeight: !acked && open ? 700 : 400 }}>
                          {acked ? dateTimeFmt(x.acknowledged_at) : open ? 'Not acknowledged' : '—'}
                        </td>
                        <td className="muted">{Number(x.resolution_hours) > 0 ? `${x.resolution_hours} h` : '—'}</td>
                        <td><Pill value={x.status} sm /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState eyebrow="Complaints" title="No complaints logged" hint="A clean record — worth noting in the satisfaction survey." />}
          </div>
        </>
      )}

      {/* ═══ DOCUMENTS ═══ */}
      {tab === 'Documents' && (
        <>
          <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="wt-panel-head">
              <div className="wt-sec-title">Client Handover Pack (Sec. 9 Step 10)</div>
              <button className="wt-btn sm" onClick={openHandover}>{c.handover_date ? 'Re-issue' : 'Record handover'}</button>
            </div>
            {c.handover_date ? (
              <>
                <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
                  Handed over {dateFmt(c.handover_date)}.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {handoverDocs.map((doc) => <span key={doc} className="wt-pill sm green"><Check size={10} /> {doc}</span>)}
                </div>
              </>
            ) : (
              <div className="wt-gates">
                {(d.reference.handover_docs || []).map((doc) => (
                  <div key={doc} className="wt-gate"><span className="ic"><X size={13} /></span><div className="tx"><span className="l">{doc}</span></div></div>
                ))}
              </div>
            )}
          </div>
          <div className="wt-card wt-tblcard">
            <div style={{ padding: '14px 18px 0' }}><div className="wt-sec-title">Service Reports ({d.reports.length})</div></div>
            {d.reports.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 96 }}>Code</th><th style={{ width: 150 }}>Type</th><th>Provider</th>
                  <th style={{ width: 112 }}>Submitted</th><th style={{ width: 118 }}>Status</th></tr></thead>
                <tbody>
                  {d.reports.map((r) => (
                    <tr key={r.id} className="click" onClick={() => nav(`/water-tank/reports?focus=${encodeURIComponent(r.code)}`)}>
                      <td className="id">{r.code}</td><td><strong>{r.report_type}</strong></td>
                      <td className="muted">{r.provider_name || '—'}</td><td className="muted">{dateFmt(r.submitted_date)}</td>
                      <td><Pill value={r.status} sm /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState eyebrow="Reports" title="No service reports yet" hint="Providers submit cleaning, inspection and testing reports against each work order." />}
          </div>
        </>
      )}

      {/* ═══ TIMELINE ═══ */}
      {tab === 'Timeline' && (
        <div className="wt-card" style={{ padding: 22 }}>
          {(d.events.length || d.comms.length) ? (
            <div className="wt-timeline">
              {[...d.events.map((e) => ({ t: e.title, dd: e.detail, at: e.occurred_at, who: e.actor, kind: e.event_type })),
                ...d.comms.map((m) => ({ t: `${titleCase(m.channel)} · ${titleCase(m.direction)}`, dd: m.summary, at: m.logged_at || m.createdAt, who: null, kind: 'comm' }))]
                .sort((x, y) => new Date(y.at) - new Date(x.at))
                .map((e, i) => (
                  <div className="wt-tl" key={i}>
                    <div className="t">{e.t}</div>
                    {e.dd && <div className="d">{e.dd}</div>}
                    <div className="m">{dateTimeFmt(e.at)}{e.who ? ` · ${e.who}` : ''} · {e.kind}</div>
                  </div>
                ))}
            </div>
          ) : <EmptyState eyebrow="Timeline" title="Nothing logged yet" hint="Stage changes, consultations, agreements, deposits and every logged interaction appear here." />}
        </div>
      )}

      {action && <ActionDrawer {...action} onClose={() => setAction(null)} />}

      {/* eslint-disable-next-line no-use-before-define */}
      {journey && (
        <WtDrawer
          title="Create agreement"
          subtitle="Sec. 6 → Sec. 7 — the path from enquiry to a signed agreement"
          onClose={() => setJourney(false)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="wt-note">
              The Customer Service Agreement is built from an approved quotation (Clause 7).
              Pick how this job gets priced and the records are raised for you.
            </div>

            {/* Where this client already is, so the operator does not duplicate work. */}
            {(openAssessment || pendingQuote || approvedQuote) && (
              <div className="wt-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="wt-sec-title">Already in progress</div>
                {openAssessment && (
                  <RowLine label={`Site assessment ${openAssessment.code}`} status={openAssessment.status}
                    action="Open" onClick={() => nav(`/water-tank/site-assessments/${openAssessment.code}`)} />
                )}
                {pendingQuote && (
                  <RowLine label={`Quotation ${pendingQuote.code} — ${bdt(pendingQuote.total)}`} status={pendingQuote.decision}
                    action="Approve" onClick={() => approveQuote(pendingQuote)} />
                )}
                {approvedQuote && (
                  <RowLine label={`Quotation ${approvedQuote.code} — ${bdt(approvedQuote.total)}`} status="Approved"
                    action="Raise agreement"
                    onClick={() => nav(`/agreements/water-tank-customer?project=${encodeURIComponent(approvedQuote.project_id || '')}`)} />
                )}
              </div>
            )}

            {approvedQuote ? (
              <button className="wt-choice on" style={{ width: '100%' }}
                onClick={() => nav(`/agreements/water-tank-customer?project=${encodeURIComponent(approvedQuote.project_id || '')}`)}>
                <FileSignature size={18} />
                <span className="t">Raise the agreement now</span>
                <span className="h">
                  {approvedQuote.code} is approved at {bdt(approvedQuote.total)}. The agreement is prefilled
                  from it — services ticked, pricing and advance carried across.
                </span>
              </button>
            ) : (
              <>
                <div className="wt-sec-title">Does this job need a site visit first?</div>
                <div className="wt-choices">
                  <button className="wt-choice"
                    onClick={() => nav(`/water-tank/service-requests/new?client=${c.code}&route=assessment`)}>
                    <ClipboardList size={18} />
                    <span className="t">Yes — assess first</span>
                    <span className="h">
                      Sec. 6. Raises the service request and schedules a site assessment.
                      The quotation is built from the assessment findings once the visit is done.
                    </span>
                  </button>
                  <button className="wt-choice"
                    onClick={() => nav(`/water-tank/service-requests/new?client=${c.code}&route=quotation`)}>
                    <FileSignature size={18} />
                    <span className="t">No — quote straight away</span>
                    <span className="h">
                      Sec. 7 Step 5. Raises the service request and generates the quotation
                      directly from the services you pick.
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </WtDrawer>
      )}
    </>
  );
}

/* One in-progress record inside the agreement chooser: what it is, where it has
   got to, and the single next thing to do with it. */
function RowLine({ label, status, action, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5 }}>
      <span style={{ flex: '1 0 0', minWidth: 0 }}>{label}</span>
      <Pill value={status} sm />
      <button className="wt-btn sm" onClick={onClick}>{action}</button>
    </div>
  );
}
