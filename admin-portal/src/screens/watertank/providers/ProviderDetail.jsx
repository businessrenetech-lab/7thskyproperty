import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check,
  X,
  ShieldCheck,
  FileSignature,
  MapPin,
  Gauge,
  AlertTriangle,
  Ban,
  RefreshCw,
  Plus,
  Star,
  ClipboardCheck,
  Users,
  Clock,
  TrendingUp,
  Wallet,
  FileText,
  Pencil,
  Link2,
  BadgeDollarSign,
} from 'lucide-react';
import api from '../../../services/api';
import {
  WtHead, WtTabs, Pill, WtDrawer, Loading, EmptyState, dateFmt, dateTimeFmt, bdt,
  toast, errText, StatusCell, RowActions,
} from '../common';

/*
 * One provider's own dashboard — the operational home for SSPC-WTCM-SOP-02.
 * Everything the SOP asks an Operations Coordinator or Manager to do about a
 * provider is reachable from this page, with the clause reference beside it.
 */

const TABS = ['Overview', 'Compliance', 'Insurance', 'Agreement & Territory', 'Work Orders', 'Reports', 'Audits', 'Protected Clients', 'Timeline'];
const pct = (v) => (v == null ? '—' : `${v}%`);
const hrs = (v) => (v ? `${v} h` : '—');

/* ── small building blocks ─────────────────────────────────── */

const Kpi = ({ icon: Icon, label, value, sub, tone }) => (
  <div className="wt-card" style={{ padding: '15px 17px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    {Icon && <span className="wt-kpi-ic" style={{ background: 'var(--wt-accent-tint)', color: 'var(--wt-accent)', width: 32, height: 32 }}><Icon size={15} /></span>}
    <div style={{ minWidth: 0 }}>
      <div className="wt-kpi-label">{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: tone, margin: '2px 0' }}>{value}</div>
      {sub && <div className="wt-kpi-sub">{sub}</div>}
    </div>
  </div>
);

function DocTable({ specs, docs, onEdit, onVerify, onDelete, category }) {
  return (
    <table className="wt-tbl">
      <thead><tr>
        <th>Document</th><th style={{ width: 150 }}>Number</th><th style={{ width: 150 }}>Issuer</th>
        {category === 'insurance' && <th style={{ width: 120, textAlign: 'right' }}>Sum insured</th>}
        <th style={{ width: 118 }}>Expiry</th><th style={{ width: 120 }}>Status</th><th style={{ width: 130 }} />
      </tr></thead>
      <tbody>
        {specs.map((spec) => {
          const d = docs.find((x) => x.doc_type === spec.type && x.category === category);
          const days = d?.expiry_date ? Math.ceil((new Date(d.expiry_date) - Date.now()) / 864e5) : null;
          const expired = days != null && days < 0;
          const soon = days != null && days >= 0 && days <= 30;
          return (
            <tr key={spec.type}>
              <td>
                <strong>{spec.type}</strong>
                {spec.required
                  ? <span className="wt-pill sm slate" style={{ marginLeft: 6 }}>Required</span>
                  : <span className="cell-sub" style={{ marginLeft: 6 }}>{spec.note || 'Optional'}</span>}
              </td>
              <td className="muted">{d?.doc_number || '—'}</td>
              <td className="muted">{d?.issuer || '—'}</td>
              {category === 'insurance' && <td style={{ textAlign: 'right' }} className="muted">{d?.sum_insured > 0 ? bdt(d.sum_insured) : '—'}</td>}
              <td style={{ color: expired ? 'var(--wt-red)' : soon ? 'var(--wt-amber)' : 'var(--wt-muted)', fontWeight: expired || soon ? 700 : 400 }}>
                {d?.expiry_date ? <>{dateFmt(d.expiry_date)}{expired ? ' · lapsed' : soon ? ` · ${days}d` : ''}</> : '—'}
              </td>
              <td>
                {!d ? <span className="wt-pill sm slate">Not supplied</span>
                  : expired ? <span className="wt-pill sm red">Expired</span>
                    : <Pill value={d.status} sm />}
              </td>
              <td style={{ textAlign: 'right' }}>
                <button className="wt-btn sm" onClick={() => onEdit(spec, d)}>{d ? 'Edit' : 'Add'}</button>
                {d && !d.verified && <button className="wt-btn sm primary" style={{ marginLeft: 5 }} onClick={() => onVerify(d, true)}>Verify</button>}
                {d && d.verified && <button className="wt-btn sm" style={{ marginLeft: 5 }} onClick={() => onVerify(d, false)}>Unverify</button>}
                {d && <RowActions items={[{ label: 'Delete', icon: X, danger: true, onClick: () => onDelete(d) }]} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ── document add/edit drawer ───────────────────────────────── */
function DocumentDrawer({ providerId, category, spec, doc, onClose, onSaved }) {
  const [form, setForm] = useState({
    doc_number: doc?.doc_number || '', issuer: doc?.issuer || '', sum_insured: doc?.sum_insured || '',
    issue_date: doc?.issue_date || '', expiry_date: doc?.expiry_date || '', file_url: doc?.file_url || '', notes: doc?.notes || '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setBusy(true); setErr('');
    try {
      await api.post('/wt-providers/documents', {
        ...form, provider_id: providerId, category, doc_type: spec.type,
        sum_insured: Number(form.sum_insured) || 0,
        issue_date: form.issue_date || null, expiry_date: form.expiry_date || null,
      });
      onSaved();
    } catch (e) { setErr(errText(e, 'Could not save the document')); setBusy(false); }
  };

  return (
    <WtDrawer title={spec.type} subtitle={category === 'insurance' ? 'Insurance verification · Sec. 5 Step 3' : 'Compliance verification · Sec. 5 Step 2'} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button><button className="wt-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save document'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      {!spec.required && <div className="wt-note">{spec.note || 'This document is optional'} — record it if the provider holds one.</div>}
      <div className="wt-field"><label>{category === 'insurance' ? 'Policy number' : 'Document number'}</label>
        <input className="wt-input" value={form.doc_number} onChange={(e) => set('doc_number', e.target.value)} /></div>
      <div className="wt-field"><label>{category === 'insurance' ? 'Insurer' : 'Issuing authority'}</label>
        <input className="wt-input" value={form.issuer} onChange={(e) => set('issuer', e.target.value)} /></div>
      {category === 'insurance' && (
        <div className="wt-field"><label>Sum insured (৳)</label>
          <input className="wt-input" type="number" value={form.sum_insured} onChange={(e) => set('sum_insured', e.target.value)} /></div>
      )}
      <div className="wt-grid2">
        <div className="wt-field"><label>Issue date</label>
          <input className="wt-input" type="date" value={form.issue_date || ''} onChange={(e) => set('issue_date', e.target.value)} /></div>
        <div className="wt-field"><label>Expiry date</label>
          <input className="wt-input" type="date" value={form.expiry_date || ''} onChange={(e) => set('expiry_date', e.target.value)} />
          <span className="hint">Drives the expiry alerts on the watchtower.</span></div>
      </div>
      <div className="wt-field"><label>Document link</label>
        <input className="wt-input" value={form.file_url} onChange={(e) => set('file_url', e.target.value)} placeholder="https://…" /></div>
      <div className="wt-field"><label>Notes</label>
        <textarea className="wt-input" rows={2} style={{ resize: 'vertical' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} /></div>
    </WtDrawer>
  );
}

/* ── generic action drawer used by several lifecycle steps ──── */
function ActionDrawer({ title, subtitle, note, fields, submitLabel, danger, onClose, onSubmit }) {
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
        <button className={`wt-btn ${danger ? 'danger' : 'primary'}`} disabled={busy} onClick={go}>{busy ? 'Working…' : submitLabel}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      {note && <div className="wt-note">{note}</div>}
      {fields.map((f) => (
        <div className="wt-field" key={f.key}>
          <label>{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'textarea' ? <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            : f.type === 'select' ? <select className="wt-select" value={form[f.key]} onChange={(e) => set(f.key, e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
              : f.type === 'boolean' ? <label className="wt-toggle"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} /><span>{form[f.key] ? 'Yes' : 'No'}</span></label>
                : <input className="wt-input" type={f.type || 'text'} value={form[f.key]} onChange={(e) => set(f.key, f.type === 'number' ? e.target.value : e.target.value)} />}
          {f.hint && <span className="hint">{f.hint}</span>}
        </div>
      ))}
    </WtDrawer>
  );
}

/* ═══ main ════════════════════════════════════════════════════ */

export default function ProviderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Overview');
  const [docDrawer, setDocDrawer] = useState(null);
  const [action, setAction] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-providers/${id}`)
      .then((r) => setD(r.data))
      .catch((e) => { setD(null); setError(errText(e, 'Could not load this provider')); })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(load, [load]);

  const post = async (path, body, msg) => {
    const r = await api.post(`/wt-providers/${id}${path}`, body);
    if (msg) toast.ok(msg);
    load();
    return r;
  };

  if (loading) return <Loading />;
  if (error || !d) return (
    <>
      <WtHead title="Provider not found" crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/providers')}>Providers</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title="Could not load this provider" hint={error}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/providers')}>Back to directory</button>} /></div>
    </>
  );

  const p = d.provider;
  const k = d.kpis || {};
  const status = String(p.status || '').toLowerCase();
  const stageIdx = d.stages.indexOf(p.onboarding_stage);
  const cats = Array.isArray(p.service_categories) ? p.service_categories : [];
  const areas = Array.isArray(p.coverage_areas) ? p.coverage_areas : [];

  /* ── lifecycle action wiring ── */
  const openCapability = () => setAction({
    title: 'Capability Assessment', subtitle: 'Sec. 5 Step 1 — Provider Assessment', submitLabel: 'Save assessment',
    note: 'Score the provider against experience, resources, equipment and reference work. This gate must pass before approval.',
    fields: [
      { key: 'capability_score', label: 'Capability score (out of 100)', type: 'number', required: true, value: p.capability_score || '' },
      { key: 'years_experience', label: 'Years of experience', type: 'number', value: p.years_experience || '' },
      { key: 'team_size', label: 'Team size', type: 'number', value: p.team_size || '' },
      { key: 'capacity_per_week', label: 'Jobs per week capacity', type: 'number', value: p.capacity_per_week || '' },
      { key: 'equipment_summary', label: 'Equipment & resources', type: 'textarea', value: p.equipment_summary || '' },
      { key: 'capability_notes', label: 'Assessment notes', type: 'textarea', value: p.capability_notes || '' },
    ],
    onSubmit: async (f) => { await post('/capability', f, 'Capability assessment recorded'); setAction(null); },
  });

  const openAgreement = () => {
    const active = (d.agreements || []).find((agreement) => agreement.id === p.active_agreement_id)
      || (d.agreements || [])[0];
    nav(active ? `/water-tank/agreements/provider/${active.code}` : `/water-tank/agreements/provider/new?provider=${p.code}`);
  };

  const inviteProvider = async () => {
    try {
      const { data } = await api.post(`/wt-providers/${p.code}/invite`);
      await navigator.clipboard.writeText(data.link);
      toast.ok('Secure onboarding link generated and copied');
      load();
    } catch (e) { toast.err(errText(e, 'Could not generate the onboarding link')); }
  };

  const openBriefing = () => setAction({
    title: 'Cumilla Territory Briefing', subtitle: 'Sec. 6 Step 5 · Sec. 11 · Sec. 12', submitLabel: 'Record briefing',
    note: 'Confirm the provider has been taken through Protected Client rules, Cumilla exclusivity, non-circumvention obligations and referral requirements — and record who acknowledged it.',
    fields: [
      { key: 'acknowledged_by', label: 'Acknowledged by (provider representative)', required: true, value: p.cumilla_acknowledged_by || '' },
      { key: 'briefing_date', label: 'Briefing date', type: 'date', value: p.cumilla_briefing_date || '' },
      { key: 'cumilla_exclusive', label: 'Cumilla exclusivity applies', type: 'boolean', value: !!p.cumilla_exclusive },
    ],
    onSubmit: async (f) => { await post('/territory-briefing', f, 'Territory briefing recorded'); setAction(null); },
  });

  const openSanction = (which) => setAction({
    title: which === 'suspend' ? 'Suspend Provider' : 'Terminate Provider',
    subtitle: 'Sec. 15 — Renewal or Termination', submitLabel: which === 'suspend' ? 'Suspend' : 'Terminate', danger: true,
    note: which === 'terminate'
      ? 'Termination starts a 24-month non-circumvention protection period on every client this provider has worked with (Sec. 12).'
      : 'A suspended provider cannot be assigned new work. Reinstate them once the issue is resolved.',
    fields: [{ key: 'reason', label: 'Reason', type: 'textarea', required: true }],
    onSubmit: async (f) => { await post('/sanction', { action: which, ...f }, `Provider ${which}d`); setAction(null); },
  });

  const openRenewal = () => setAction({
    title: 'Renewal Review', subtitle: 'Sec. 15 — review compliance, performance, feedback, territory & non-circumvention',
    submitLabel: 'Record decision',
    note: `Compliance ${d.ready_to_approve ? 'clear' : `${d.blocking.length} outstanding`} · completion ${pct(k.completion_rate)} · complaints ${pct(k.complaint_rate)} · territory breaches ${k.territory_breaches} · circumvention breaches ${k.circumvention_breaches}.`,
    fields: [
      { key: 'renewal_decision', label: 'Decision', type: 'select', options: ['Renew', 'Conditional Renewal', 'Suspend', 'Terminate'], required: true },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
    onSubmit: async (f) => { await post('/renewal', f, `Renewal decision: ${f.renewal_decision}`); setAction(null); },
  });

  const openBreach = () => setAction({
    title: 'Log Compliance Breach', subtitle: 'Sec. 11 Territory · Sec. 12 Non-Circumvention', submitLabel: 'Log breach', danger: true,
    fields: [
      { key: 'kind', label: 'Breach type', type: 'select', options: ['territory', 'circumvention'], required: true },
      { key: 'client_name', label: 'Client involved', hint: 'If a protected client is named, their register entry is marked breached.' },
      { key: 'detail', label: 'What happened', type: 'textarea', required: true },
    ],
    onSubmit: async (f) => { await post('/breach', f, 'Breach recorded'); setAction(null); },
  });

  const openAudit = () => setAction({
    title: 'Schedule Audit', subtitle: 'Sec. 14 — Provider Audits', submitLabel: 'Schedule audit',
    fields: [
      { key: 'audit_type', label: 'Audit type', type: 'select', options: d.reference.audit_types, required: true },
      { key: 'scheduled_date', label: 'Scheduled date', type: 'date', required: true },
      { key: 'auditor', label: 'Auditor' },
    ],
    onSubmit: async (f) => {
      await api.post('/wt-providers/audits', { ...f, provider_id: p.id });
      toast.ok('Audit scheduled'); setAction(null); load();
    },
  });

  const approve = async () => {
    try { await post('/stage', { stage: 'Approved' }, `${p.business_name} approved`); }
    catch (e) {
      const data = e?.response?.data;
      toast.err(data?.blocking ? `${data.error} ${data.blocking.join(' · ')}` : errText(e));
    }
  };

  const verifyDoc = async (doc, verified) => {
    try { await api.post(`/wt-providers/documents/${doc.id}/verify`, { verified }); toast.ok(`${doc.doc_type} ${verified ? 'verified' : 'unverified'}`); load(); }
    catch (e) { toast.err(errText(e)); }
  };
  const deleteDoc = async (doc) => {
    try { await api.delete(`/wt-providers/documents/${doc.id}`); toast.ok(`${doc.doc_type} removed`); load(); }
    catch (e) { toast.err(errText(e)); }
  };

  const counts = {
    Compliance: d.compliance.filter((c) => !c.satisfied).length || undefined,
    Insurance: d.insurance.filter((c) => !c.satisfied).length || undefined,
    'Work Orders': d.work_orders.length || undefined,
    Reports: d.reports.length || undefined,
    Audits: d.audits.filter((a) => !a.closed).length || undefined,
    'Protected Clients': d.protected_clients.filter((c) => c.status === 'Protected').length || undefined,
  };

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/providers')}>Providers</span> › <span style={{ color: 'var(--wt-accent-ink)' }}>{p.code}</span></div>}
        title={p.business_name}
        subtitle={[p.legal_name, p.district, p.contact_person].filter(Boolean).join(' · ')}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => nav(`/water-tank/providers/${p.code}/edit`)}><Pencil size={14} /> Edit / continue onboarding</button>
        {status !== 'approved' && d.ready_to_approve && <button className="wt-btn primary" onClick={approve}><ShieldCheck size={14} /> Approve provider</button>}
        {status === 'suspended' && <button className="wt-btn primary" onClick={() => post('/sanction', { action: 'reinstate' }, 'Provider reinstated')}>Reinstate</button>}
        <RowActions items={[
          { label: 'Capability assessment', icon: Gauge, onClick: openCapability },
          { label: 'Open / draft agreement', icon: FileSignature, onClick: openAgreement },
          { label: 'Provider onboarding link', icon: Link2, onClick: inviteProvider },
          { label: 'Territory briefing', icon: MapPin, onClick: openBriefing },
          { label: 'Schedule audit', icon: ClipboardCheck, onClick: openAudit },
          { label: 'Renewal review', icon: RefreshCw, onClick: openRenewal },
          { label: 'Log breach', icon: AlertTriangle, danger: true, onClick: openBreach },
          status !== 'suspended' && status !== 'terminated' && { label: 'Suspend provider', icon: Ban, danger: true, onClick: () => openSanction('suspend') },
          status !== 'terminated' && { label: 'Terminate provider', icon: X, danger: true, onClick: () => openSanction('terminate') },
        ]} />
      </WtHead>

      {/* ── status strip ── */}
      <div className="wt-statusstrip">
        <Pill value={p.status} />
        <span className="wt-pill cyan">{p.onboarding_stage}</span>
        {d.assignable
          ? <span className="wt-pill green"><Check size={11} /> Assignable</span>
          : <span className="wt-pill amber"><Ban size={11} /> Not assignable — {d.blocking.length || 'agreement/status'} outstanding</span>}
        {p.cumilla_exclusive && <span className="wt-pill blue"><MapPin size={11} /> Cumilla exclusive</span>}
        {(k.territory_breaches > 0 || k.circumvention_breaches > 0) && (
          <span className="wt-pill red"><AlertTriangle size={11} /> {k.territory_breaches + k.circumvention_breaches} breach(es)</span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>
          Applied {dateFmt(p.application_date)}{p.approved_date ? ` · approved ${dateFmt(p.approved_date)}` : ''}
        </span>
      </div>

      {/* ── Sec. 4 workflow stepper ── */}
      <div className="wt-stepper">
        {d.stages.map((s, i) => (
          <React.Fragment key={s}>
            <div className={`wt-step${i < stageIdx ? ' done' : i === stageIdx ? ' current' : ''}`}>
              <span className="dot">{i < stageIdx ? <Check size={11} /> : i + 1}</span><span className="lbl">{s}</span>
            </div>
            {i < d.stages.length - 1 && <span className="wt-step-sep" />}
          </React.Fragment>
        ))}
      </div>

      <WtTabs tabs={TABS} value={tab} onChange={setTab} counts={counts} />

      {/* ═══ OVERVIEW ═══ */}
      {tab === 'Overview' && (
        <>
          <div className="wt-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="wt-panel-head">
              <h2 className="wt-section-title">Onboarding Readiness</h2>
              <span className="muted" style={{ fontSize: 11.5 }}>{d.gates.filter((g) => g.ok).length} of {d.gates.length} gates passed</span>
            </div>
            <div className="wt-gates">
              {d.gates.map((g) => (
                <div key={g.key} className={`wt-gate${g.ok ? ' ok' : ''}`}>
                  <span className="ic">{g.ok ? <Check size={13} /> : <X size={13} />}</span>
                  <div className="tx"><span className="l">{g.label}</span><span className="s">{g.stage} · {g.sop}</span></div>
                  {!g.ok && (
                    <button className="wt-btn sm" onClick={() => {
                      if (g.key === 'capability') openCapability();
                      else if (g.key === 'compliance') setTab('Compliance');
                      else if (g.key === 'insurance') setTab('Insurance');
                      else if (g.key === 'agreement') openAgreement();
                      else if (g.key === 'payment') setTab('Agreement & Territory');
                      else if (g.key === 'territory') openBriefing();
                      else setTab('Overview');
                    }}>Resolve</button>
                  )}
                </div>
              ))}
            </div>
            {!d.ready_to_approve && (
              <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', borderColor: '#fde68a', color: 'var(--wt-amber)' }}>
                <strong>Not approvable yet.</strong> Sec. 6 Step 4 requires a signed master agreement before any client assignment, and Sec. 5 requires verified compliance and insurance.
              </div>
            )}
          </div>

          <h2 className="wt-section-title">Performance — KPI Measures (Sec. 16)</h2>
          <div className="wt-kpigrid">
            <Kpi icon={Clock} label="Response Time" value={hrs(k.response_time_hours)} sub="average to accept a work order" />
            <Kpi icon={Check} label="Service Completion Rate" value={pct(k.completion_rate)} sub={`${k.jobs_completed} of ${k.jobs_total} jobs`} tone="var(--wt-green)" />
            <Kpi icon={AlertTriangle} label="Complaint Rate" value={pct(k.complaint_rate)} sub="complaints per job" tone={k.complaint_rate > 10 ? 'var(--wt-red)' : undefined} />
            <Kpi icon={ShieldCheck} label="Warranty Claim Rate" value={pct(k.warranty_claim_rate)} sub="claims against warranties issued" />
            <Kpi icon={Star} label="Client Satisfaction" value={k.satisfaction_score ? `${k.satisfaction_score} / 5` : '—'} sub="average rating" />
            <Kpi icon={MapPin} label="Territory Compliance" value={pct(k.territory_compliance_rate)} sub={`${k.territory_breaches} breach(es) logged`} tone={k.territory_breaches ? 'var(--wt-red)' : undefined} />
            <Kpi icon={Users} label="Non-Circumvention" value={k.non_circumvention_compliance ? 'Compliant' : 'Breached'} sub={`${k.protected_clients} protected clients`} tone={k.non_circumvention_compliance ? 'var(--wt-green)' : 'var(--wt-red)'} />
            <Kpi icon={Wallet} label="Revenue Generated" value={bdt(k.revenue_generated)} sub={`${bdt(k.provider_earnings)} paid to provider`} />
            <Kpi icon={TrendingUp} label="Repeat Project Rate" value={pct(k.repeat_project_rate)} sub="clients who booked again" />
          </div>

          <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="wt-card" style={{ padding: 20 }}>
              <div className="wt-sec-title" style={{ marginBottom: 12 }}>Business Profile (Sec. 5 Step 1)</div>
              <div className="wt-profile">
                {[['Legal name', p.legal_name], ['Business type', p.business_type], ['Registration no.', p.registration_no],
                  ['Contact', p.contact_person], ['Mobile', p.contact_phone], ['Email', p.contact_email],
                  ['Address', p.address], ['District', p.district],
                  ['Experience', p.years_experience ? `${p.years_experience} years` : null],
                  ['Team size', p.team_size || null], ['Weekly capacity', p.capacity_per_week ? `${p.capacity_per_week} jobs` : null],
                  ['Capability score', p.capability_score ? `${p.capability_score}/100 (${dateFmt(p.assessed_date)})` : null],
                ].map(([kk, v]) => <div className="f" key={kk}><div className="k">{kk}</div><div className="v">{v || '—'}</div></div>)}
              </div>
            </div>
            <div className="wt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 8 }}>Service Categories (Sec. 2)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {cats.length ? cats.map((c) => <span key={c} className="wt-pill sm slate">{c}</span>) : <span className="muted" style={{ fontSize: 12.5 }}>None recorded.</span>}
                </div>
              </div>
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 8 }}>Coverage Areas</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {areas.length ? areas.map((a) => <span key={a} className={`wt-pill sm ${a === 'Cumilla' ? 'amber' : 'cyan'}`}>{a}</span>) : <span className="muted" style={{ fontSize: 12.5 }}>None recorded.</span>}
                </div>
              </div>
              {p.equipment_summary && (
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 6 }}>Equipment &amp; Resources</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{p.equipment_summary}</p>
                </div>
              )}
              {p.capability_notes && (
                <div>
                  <div className="wt-sec-title" style={{ marginBottom: 6 }}>Capability Assessment Notes</div>
                  <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{p.capability_notes}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ COMPLIANCE / INSURANCE ═══ */}
      {(tab === 'Compliance' || tab === 'Insurance') && (() => {
        const isInsurance = tab === 'Insurance';
        const specs = isInsurance ? d.reference.insurance_docs : d.reference.compliance_docs;
        const list = isInsurance ? d.insurance : d.compliance;
        const category = isInsurance ? 'insurance' : 'compliance';
        const outstanding = list.filter((c) => !c.satisfied);
        return (
          <>
            <div className={`wt-note${outstanding.length ? '' : ' ok'}`} style={outstanding.length ? undefined : { background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
              {outstanding.length
                ? <><strong>{outstanding.length} required {isInsurance ? 'policy' : 'document'}{outstanding.length === 1 ? '' : 's'} outstanding.</strong> {isInsurance ? 'Sec. 5 Step 3 — Insurance Verification' : 'Sec. 5 Step 2 — Compliance Verification'} must be complete before approval.</>
                : <><strong>All required {isInsurance ? 'policies' : 'documents'} verified.</strong> {isInsurance ? 'Sec. 5 Step 3' : 'Sec. 5 Step 2'} satisfied.</>}
            </div>
            <div className="wt-card wt-tblcard">
              <DocTable
                specs={specs} docs={d.documents} category={category}
                onEdit={(spec, doc) => setDocDrawer({ spec, doc, category })}
                onVerify={verifyDoc} onDelete={deleteDoc}
              />
            </div>
          </>
        );
      })()}

      {/* ═══ AGREEMENT & TERRITORY ═══ */}
      {tab === 'Agreement & Territory' && (
        <div className="wt-detail-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="wt-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="wt-panel-head">
              <h2 className="wt-section-title">Master Agreement (Sec. 6 Step 4)</h2>
              <button className="wt-btn sm" onClick={openAgreement}>{p.agreement_code ? 'Open' : 'Draft agreement'}</button>
            </div>
            <div className="wt-profile">
              {[['Status', p.agreement_status], ['Reference', p.agreement_code], ['Signed', dateFmt(p.agreement_signed_date)], ['Expires', dateFmt(p.agreement_expiry_date)]]
                .map(([kk, v]) => <div className="f" key={kk}><div className="k">{kk}</div><div className="v">{v || '—'}</div></div>)}
            </div>
            <div className="wt-note">
              {String(p.agreement_status).toLowerCase() === 'signed'
                ? 'Signed master agreement on file — client assignment permitted.'
                : 'No signed agreement. The SOP forbids assigning any client work until the Master Service Delivery Provider Agreement is executed.'}
            </div>
            <button className="wt-btn" onClick={openAgreement}>
              <FileSignature size={14} /> {p.agreement_code ? 'Open provider agreement' : 'Draft provider agreement'}
            </button>
            <div className="wt-profile">
              <div className="f"><div className="k">Payment account</div><div className="v">{p.payment_verified ? 'Verified' : 'Awaiting verification'}</div></div>
              <div className="f"><div className="k">Active rate lines</div><div className="v">{(d.rates || []).filter((rate) => rate.agreement_id === p.active_agreement_id).length}</div></div>
            </div>
            {!p.payment_verified && <button className="wt-btn" onClick={async () => { try { await api.post(`/wt-providers/${p.code}/payment-verification`, { verified: true }); toast.ok('Payment account verified'); load(); } catch (e) { toast.err(errText(e)); } }}><BadgeDollarSign size={14} /> Verify payment account</button>}
          </div>

          <div className="wt-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="wt-panel-head">
              <h2 className="wt-section-title">Cumilla Territory (Sec. 6 Step 5 · Sec. 11)</h2>
              <button className="wt-btn sm" onClick={openBriefing}>{p.cumilla_briefed ? 'Re-brief' : 'Deliver briefing'}</button>
            </div>
            <div className="wt-profile">
              {[['Briefing delivered', p.cumilla_briefed ? 'Yes' : 'No'], ['Briefing date', dateFmt(p.cumilla_briefing_date)],
                ['Acknowledged by', p.cumilla_acknowledged_by], ['Cumilla exclusivity', p.cumilla_exclusive ? 'Applies' : 'No'],
                ['Territory breaches', String(p.territory_breaches || 0)], ['Circumvention breaches', String(p.circumvention_breaches || 0)]]
                .map(([kk, v]) => <div className="f" key={kk}><div className="k">{kk}</div><div className="v">{v || '—'}</div></div>)}
            </div>
            <div className="wt-sec-title">Provider obligations</div>
            <ul className="wt-oblig">
              <li>Refer all Cumilla enquiries to Seventh Sky</li>
              <li>No direct marketing in Cumilla</li>
              <li>No offices or branches in Cumilla without approval</li>
              <li>No direct contracting with Cumilla clients</li>
              <li>No direct contact with Protected Clients for 24 months (Sec. 12)</li>
            </ul>
            <button className="wt-btn danger-ghost" style={{ marginRight: 0, justifyContent: 'center' }} onClick={openBreach}>
              <AlertTriangle size={14} /> Log a breach
            </button>
          </div>
        </div>
      )}

      {tab === 'Agreement & Territory' && (d.rates || []).length > 0 && (
        <div className="wt-card wt-tblcard" style={{ marginTop: 14 }}>
          <div className="wt-panel-head" style={{ padding: '16px 18px 8px' }}><h2 className="wt-section-title">Signed Commercial Rate Schedule</h2><span className="muted">Provider gross rates before agreement commission</span></div>
          <table className="wt-tbl"><thead><tr><th>Code</th><th>Service</th><th>Unit</th><th style={{ textAlign: 'right' }}>Standard</th><th style={{ textAlign: 'right' }}>Agreed</th><th>Status</th></tr></thead><tbody>{d.rates.filter((rate) => !p.active_agreement_id || rate.agreement_id === p.active_agreement_id).map((rate) => <tr key={rate.id}><td className="id">{rate.service_code}</td><td><strong>{rate.service_name}</strong></td><td className="muted">{rate.unit || '—'}</td><td style={{ textAlign: 'right' }}>{bdt(rate.standard_rate)}</td><td style={{ textAlign: 'right', fontWeight: 800 }}>{bdt(rate.agreed_rate)}</td><td><Pill value={rate.rate_status} sm /></td></tr>)}</tbody></table>
        </div>
      )}

      {/* ═══ WORK ORDERS ═══ */}
      {tab === 'Work Orders' && (
        <div className="wt-card wt-tblcard">
          {d.work_orders.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>WO No</th><th>Client</th><th style={{ width: 150 }}>Category</th><th style={{ width: 112 }}>Target</th><th style={{ width: 124 }}>Status</th><th style={{ width: 112, textAlign: 'right' }}>Fee</th><th style={{ width: 112, textAlign: 'right' }}>Paid</th></tr></thead>
              <tbody>
                {d.work_orders.map((w) => (
                  <tr key={w.id} className="click" onClick={() => nav(`/water-tank/work-orders?focus=${encodeURIComponent(w.code)}`)}>
                    <td className="id">{w.code}</td>
                    <td><strong>{w.client_name}</strong></td>
                    <td className="muted">{w.category || '—'}</td>
                    <td className="muted">{dateFmt(w.target_date)}</td>
                    <td><Pill value={w.status} sm /></td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(w.provider_fee)}</td>
                    <td style={{ textAlign: 'right' }} className="muted">{bdt(w.provider_paid_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState eyebrow="Work Orders" title="No work assigned yet"
              hint={d.assignable ? 'Issue a work order from an approved quotation and it will appear here (Sec. 7 Step 6).' : 'This provider is not yet assignable — finish onboarding first.'} />
          )}
        </div>
      )}

      {/* ═══ REPORTS ═══ */}
      {tab === 'Reports' && (
        <div className="wt-card wt-tblcard">
          {d.reports.length ? (
            <table className="wt-tbl">
              <thead><tr><th style={{ width: 96 }}>Report</th><th style={{ width: 150 }}>Type</th><th>Client</th><th style={{ width: 108 }}>Work order</th><th style={{ width: 112 }}>Submitted</th><th style={{ width: 124 }}>Status</th></tr></thead>
              <tbody>
                {d.reports.map((r) => (
                  <tr key={r.id} className="click" onClick={() => nav(`/water-tank/reports?focus=${encodeURIComponent(r.code)}`)}>
                    <td className="id">{r.code}</td>
                    <td><strong>{r.report_type}</strong></td>
                    <td className="muted">{r.client_name || '—'}</td>
                    <td className="id">{r.work_order_code || '—'}</td>
                    <td className="muted">{dateFmt(r.submitted_date)}</td>
                    <td><Pill value={r.status} sm /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState eyebrow="Reports" title="No reports submitted"
              hint="Sec. 8 Step 10 requires site assessment, cleaning, inspection, testing, repair and AMC reports with before & after photos." />
          )}
        </div>
      )}

      {/* ═══ AUDITS ═══ */}
      {tab === 'Audits' && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="wt-note" style={{ flex: '1 0 0', margin: 0 }}>
              Sec. 14 requires an annual compliance audit plus insurance, safety and service-quality audits.
              {p.next_audit_date && <> Next due <strong>{dateFmt(p.next_audit_date)}</strong>.</>}
            </div>
            <button className="wt-btn primary" onClick={openAudit}><Plus size={14} /> Schedule audit</button>
          </div>
          <div className="wt-card wt-tblcard">
            {d.audits.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 92 }}>Code</th><th>Audit type</th><th style={{ width: 116 }}>Scheduled</th><th style={{ width: 116 }}>Conducted</th><th style={{ width: 130 }}>Auditor</th><th style={{ width: 76 }}>Score</th><th style={{ width: 130 }}>Outcome</th><th style={{ width: 44 }} /></tr></thead>
                <tbody>
                  {d.audits.map((a) => (
                    <tr key={a.id}>
                      <td className="id">{a.code}</td>
                      <td><strong>{a.audit_type}</strong>{a.findings && <div className="cell-sub">{a.findings.slice(0, 70)}{a.findings.length > 70 ? '…' : ''}</div>}</td>
                      <td className="muted">{dateFmt(a.scheduled_date)}</td>
                      <td className="muted">{dateFmt(a.conducted_date)}</td>
                      <td className="muted">{a.auditor || '—'}</td>
                      <td style={{ fontWeight: 700 }}>{a.score ? `${a.score}%` : '—'}</td>
                      <td>
                        <StatusCell value={a.outcome} options={['Scheduled', 'Passed', 'Conditional', 'Failed']} field="outcome"
                          onChange={async (body) => { await api.patch(`/wt-providers/audits/${a.id}`, body); toast.ok(`${a.code} → ${body.outcome}`); load(); }} />
                      </td>
                      <td>
                        <RowActions items={[
                          { label: 'Record findings', icon: FileText, onClick: () => setAction({
                            title: `${a.audit_type} — findings`, subtitle: `${a.code} · Sec. 14`, submitLabel: 'Save findings',
                            fields: [
                              { key: 'score', label: 'Score (%)', type: 'number', value: a.score || '' },
                              { key: 'auditor', label: 'Auditor', value: a.auditor || '' },
                              { key: 'outcome', label: 'Outcome', type: 'select', options: ['Scheduled', 'Passed', 'Conditional', 'Failed'], value: a.outcome },
                              { key: 'findings', label: 'Findings', type: 'textarea', value: a.findings || '' },
                              { key: 'corrective_actions', label: 'Corrective actions', type: 'textarea', value: a.corrective_actions || '' },
                              { key: 'action_due_date', label: 'Actions due by', type: 'date', value: a.action_due_date || '' },
                            ],
                            onSubmit: async (f) => { await api.patch(`/wt-providers/audits/${a.id}`, f); toast.ok('Audit updated'); setAction(null); load(); },
                          }) },
                          !a.closed && { label: 'Close audit', icon: Check, onClick: async () => { await api.patch(`/wt-providers/audits/${a.id}`, { closed: true }); toast.ok(`${a.code} closed`); load(); } },
                          { label: 'Delete', icon: X, danger: true, onClick: async () => { await api.delete(`/wt-providers/audits/${a.id}`); toast.ok('Audit deleted'); load(); } },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState eyebrow="Audits" title="No audits recorded" hint="Schedule the annual compliance audit to start the cycle." />}
          </div>
        </>
      )}

      {/* ═══ PROTECTED CLIENTS ═══ */}
      {tab === 'Protected Clients' && (
        <>
          <div className="wt-note">
            Sec. 12 — this provider may not contact these clients directly, accept repeat work or referrals from them, or bypass Seventh Sky.
            Protection runs <strong>24 months</strong> from project completion or termination, whichever is later.
          </div>
          <div className="wt-card wt-tblcard">
            {d.protected_clients.length ? (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 92 }}>Code</th><th>Client</th><th style={{ width: 150 }}>Trigger</th><th style={{ width: 112 }}>From</th><th style={{ width: 148 }}>Protected until</th><th style={{ width: 120 }}>Status</th></tr></thead>
                <tbody>
                  {d.protected_clients.map((c) => {
                    const days = c.protection_end ? Math.ceil((new Date(c.protection_end) - Date.now()) / 864e5) : null;
                    return (
                      <tr key={c.id}>
                        <td className="id">{c.code}</td>
                        <td><strong>{c.client_name}</strong>{c.work_order_code && <div className="cell-sub">{c.work_order_code}</div>}</td>
                        <td className="muted">{c.trigger_event}</td>
                        <td className="muted">{dateFmt(c.protection_start)}</td>
                        <td>{dateFmt(c.protection_end)}{days > 0 && <span className="cell-sub">{days} days remaining</span>}</td>
                        <td><Pill value={c.status} sm /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState eyebrow="Protected Clients" title="No protected clients yet" hint="Completing a work order automatically places that client under 24-month protection." />}
          </div>
        </>
      )}

      {/* ═══ TIMELINE ═══ */}
      {tab === 'Timeline' && (
        <div className="wt-card" style={{ padding: 22 }}>
          {d.events.length ? (
            <div className="wt-timeline">
              {d.events.map((e) => (
                <div className="wt-tl" key={e.id}>
                  <div className="t">{e.title}</div>
                  {e.detail && <div className="d">{e.detail}</div>}
                  <div className="m">{dateTimeFmt(e.occurred_at)}{e.actor ? ` · ${e.actor}` : ''} · {e.event_type}</div>
                </div>
              ))}
            </div>
          ) : <EmptyState eyebrow="Timeline" title="Nothing logged yet" hint="Stage changes, verifications, briefings, audits and sanctions all appear here." />}
        </div>
      )}

      {docDrawer && (
        <DocumentDrawer
          providerId={p.id} category={docDrawer.category} spec={docDrawer.spec} doc={docDrawer.doc}
          onClose={() => setDocDrawer(null)}
          onSaved={() => { setDocDrawer(null); toast.ok(`${docDrawer.spec.type} saved`); load(); }}
        />
      )}
      {action && <ActionDrawer {...action} onClose={() => setAction(null)} />}
    </>
  );
}
