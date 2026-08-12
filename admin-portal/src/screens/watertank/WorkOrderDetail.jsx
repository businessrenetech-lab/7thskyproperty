import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check, X, RefreshCw, Pencil, Truck, CalendarClock, CheckCircle2,
  ShieldCheck, Receipt, FileSignature, FileText, MessageSquare, Ban,
  Users, Wallet, ClipboardCheck, ArrowRight, Star, AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import {
  WtHead, Pill, Loading, EmptyState, WtDrawer, DatePicker, RecordComments,
  dateFmt, dateTimeFmt, bdt, toast, errText,
} from './common';

/*
 * One work order — its own dashboard. Raised automatically when the Customer
 * Service Agreement is signed, then driven through assignment, acceptance,
 * scheduling, delivery, reporting and completion verification. The progress bar
 * is derived from the record, so it can never disagree with what actually happened.
 */

const ICONS = {
  raised: FileSignature, assigned: Truck, accepted: CheckCircle2, scheduled: CalendarClock,
  attended: Users, work_done: ClipboardCheck, reports: FileText, verified: ShieldCheck, invoiced: Receipt,
};

const Section = ({ icon: Icon, title, right, children }) => (
  <div className="wt-asec">
    <div className="wt-asec-h">
      <Icon size={15} style={{ color: 'var(--wt-accent-ink)' }} />
      <h3>{title}</h3>
      {right}
    </div>
    <div className="wt-asec-b">{children}</div>
  </div>
);

/* ── assign provider ── */
function AssignDrawer({ wo, onClose, onDone }) {
  const [ref, setRef] = useState(null);
  const [pick, setPick] = useState('');
  const [overrideFee, setOverrideFee] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideAllowed, setOverrideAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api.get('/wt-work-orders/reference').then((r) => setRef(r.data)).catch(() => setRef(null)); }, []);

  const go = async () => {
    if (!pick) { setErr('Choose a provider.'); return; }
    setBusy(true); setErr('');
    try {
      await api.post(`/wt-work-orders/${wo.id}/assign`, {
        provider_id: pick,
        ...(overrideAllowed ? { provider_fee: Number(overrideFee) || 0, fee_override_reason: overrideReason } : {}),
      });
      onDone();
    } catch (e) {
      const d = e?.response?.data;
      setErr(d?.blocking?.length ? `${d.error} ${d.blocking.join(' · ')}` : (d?.error || errText(e, 'Could not assign')));
      setOverrideAllowed(!!d?.override_allowed);
      setBusy(false);
    }
  };

  const eligible = ref?.assignable_providers || [];
  const blocked = (ref?.providers || []).filter((p) => !p.assignable);

  return (
    <WtDrawer title="Assign a provider" subtitle={`${wo.code} · ${wo.client_name}`} onClose={onClose}
      footer={<><button className="wt-btn" onClick={onClose}>Cancel</button>
        <button className="wt-btn primary" disabled={busy || !pick || (overrideAllowed && (!overrideFee || !overrideReason.trim()))} onClick={go}>{busy ? 'Assigning…' : 'Assign provider'}</button></>}>
      {err && <div className="wt-formerr">{err}</div>}
      <div className="wt-note">
        Only approved providers with a signed Master Service Delivery Provider Agreement can take client
        work (Sec. 6 Step 4). {eligible.length} available.
      </div>

      {!ref ? <Loading /> : eligible.length ? (
        <div className="wt-field">
          <label>Provider</label>
          <div className="wt-lookup">
            {eligible.map((p) => (
              <button key={p.id} className={`wt-lookup-item${String(pick) === String(p.id) ? ' on' : ''}`}
                onClick={() => setPick(p.id)}
                style={String(pick) === String(p.id) ? { borderColor: 'var(--wt-accent)', background: 'var(--wt-accent-tint)' } : undefined}>
                <span className="av">{p.business_name.slice(0, 2).toUpperCase()}</span>
                <span style={{ flex: '1 0 0', minWidth: 0 }}>
                  <span className="nm">{p.business_name}{p.rank ? ` · #${p.rank}` : ''}</span>
                  <span className="mt">{[p.specialty, p.coverage_areas.join(', ')].filter(Boolean).join(' · ') || 'No coverage recorded'}</span>
                  <span className="mt">{p.agreement_code} · {p.rate_count} agreed rates · {p.commission_pct}% commission</span>
                </span>
                {p.rating > 0 && <span className="wt-pill sm slate"><Star size={9} /> {p.rating}</span>}
                {p.completion_rate > 0 && <span className="wt-pill sm green">{p.completion_rate}%</span>}
                {String(pick) === String(p.id) && <Check size={14} style={{ color: 'var(--wt-accent)' }} />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState eyebrow="No eligible providers" title="Nobody can be assigned yet"
          hint="Every provider is either unapproved or has no signed master agreement. Record their agreements on the provider file first." />
      )}

      {blocked.length > 0 && (
        <div className="wt-field">
          <label>Not eligible ({blocked.length})</label>
          {blocked.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', fontSize: 12, color: 'var(--wt-muted)' }}>
              <Ban size={12} style={{ color: 'var(--wt-red)', flex: 'none' }} />
              <strong style={{ color: 'var(--wt-ink-2)' }}>{p.business_name}</strong> — {p.blocked_reason}
            </div>
          ))}
        </div>
      )}

      <div className="wt-note">
        Provider fees are calculated automatically from the selected provider's signed rates: agreed rate × quantity, less agreement commission. Contract value is {bdt(wo.total_contract)}.
      </div>
      {overrideAllowed && <div className="wt-note" style={{ background: 'var(--wt-amber-bg)', color: 'var(--wt-amber)' }}>
        <strong>Authorised override required.</strong> One or more work-order lines have no signed rate. Branch administrators may enter a net payout and must record why.
        <div className="wt-grid2" style={{ marginTop: 10 }}><div className="wt-field"><label>Override net payout (৳)</label><input className="wt-input" type="number" value={overrideFee} onChange={(e) => setOverrideFee(e.target.value)} /></div><div className="wt-field"><label>Override reason</label><input className="wt-input" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} /></div></div>
      </div>}
    </WtDrawer>
  );
}

/* ── generic step drawer ── */
function StepDrawer({ title, subtitle, note, fields, submitLabel, danger, onClose, onSubmit }) {
  const [form, setForm] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.value ?? (f.type === 'boolean' ? false : '')])));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const go = async () => {
    const missing = fields.filter((f) => f.required && !form[f.key]);
    if (missing.length) { setErr(`${missing.map((m) => m.label).join(', ')} required`); return; }
    setBusy(true); setErr('');
    try { await onSubmit(form); }
    catch (e) { setErr(errText(e, 'Could not complete this step')); setBusy(false); }
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
          {f.type === 'date' ? <DatePicker value={form[f.key]} onChange={(v) => set(f.key, v)} />
            : f.type === 'textarea' ? <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              : f.type === 'boolean' ? <label className="wt-toggle"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} /><span>{form[f.key] ? 'Yes' : 'No'}</span></label>
                : <input className="wt-input" type={f.type || 'text'} value={form[f.key]} onChange={(e) => set(f.key, e.target.value)} />}
          {f.hint && <span className="hint">{f.hint}</span>}
        </div>
      ))}
    </WtDrawer>
  );
}

export default function WorkOrderDetail() {
  const { code } = useParams();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [step, setStep] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError('');
    api.get(`/wt-work-orders/${code}`)
      .then((r) => setD(r.data))
      .catch((e) => { setD(null); setError(errText(e, 'Could not load this work order')); })
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const post = async (path, body, msg) => {
    await api.post(`/wt-work-orders/${d.work_order.id}${path}`, body);
    if (msg) toast.ok(msg);
    setStep(null);
    load();
  };

  if (loading) return <Loading />;
  if (error || !d) return (
    <>
      <WtHead title="Work order not found"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/work-orders')}>Work Orders</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title={`No work order with code ${code}`} hint={error}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/work-orders')}>Back to the register</button>} /></div>
    </>
  );

  const w = d.work_order;
  const m = d.money || {};
  const stages = w.stages || {};
  const next = d.next_action;

  const ACTIONS = {
    assign: () => setAssigning(true),
    accept: () => setStep({
      title: 'Record provider acceptance', subtitle: `${w.code} · ${w.provider_name}`, submitLabel: 'Record acceptance',
      note: 'Sec. 7 Step 7 — the provider must confirm availability, resources, pricing and timeline before work begins.',
      fields: [{ key: 'accepted_by', label: 'Accepted by', value: w.provider_name || '' }],
      onSubmit: (f) => post('/accept', f, 'Acceptance recorded'),
    }),
    schedule: () => setStep({
      title: 'Schedule the visit', subtitle: w.code, submitLabel: 'Schedule',
      note: 'Sec. 8 Step 8 — set the date the crew attends site.',
      fields: [
        { key: 'scheduled_date', label: 'Visit date', type: 'date', required: true, value: w.scheduled_date || w.target_date || '' },
        { key: 'crew_size', label: 'Crew size', type: 'number', value: w.crew_size || '' },
      ],
      onSubmit: (f) => post('/schedule', f, 'Visit scheduled'),
    }),
    start: () => setStep({
      title: 'Crew attended site', subtitle: w.code, submitLabel: 'Record attendance',
      fields: [
        { key: 'crew', label: 'Who attended', value: '' },
        { key: 'crew_size', label: 'Crew size', type: 'number', value: w.crew_size || '' },
        { key: 'note', label: 'Note', type: 'textarea' },
      ],
      onSubmit: (f) => post('/start', f, 'Attendance recorded'),
    }),
    complete: () => setStep({
      title: 'Mark work completed', subtitle: w.code, submitLabel: 'Mark completed',
      note: 'This registers the warranty and places the client under 24-month non-circumvention protection (Sec. 9 Step 12, Sec. 12).',
      fields: [{ key: 'completion_notes', label: 'Completion notes', type: 'textarea', value: w.completion_notes || '' }],
      onSubmit: (f) => post('/complete', f, 'Work order completed'),
    }),
    reports: () => nav('/water-tank/reports'),
    verify: () => setStep({
      title: 'Verify completion', subtitle: `${w.code} · Sec. 9 Step 9`, submitLabel: 'Save verification',
      note: 'Confirm the work is done, the site is clean, reports are in and the client is satisfied.',
      fields: [
        { key: 'site_cleaned', label: 'Site left clean and clear', type: 'boolean', value: !!w.site_cleaned },
        { key: 'reports_submitted', label: 'Reports submitted', type: 'boolean', value: !!w.reports_submitted },
        { key: 'photos_collected', label: 'Before & after photos collected', type: 'boolean', value: !!w.photos_collected },
        { key: 'client_satisfied', label: 'Client satisfied', type: 'boolean', value: !!w.client_satisfied },
        { key: 'completion_notes', label: 'Notes', type: 'textarea', value: w.completion_notes || '' },
      ],
      onSubmit: (f) => post('/verify', f, 'Verification saved'),
    }),
    invoice: () => nav('/water-tank/invoices'),
  };

  const decline = () => setStep({
    title: 'Provider declined', subtitle: w.code, submitLabel: 'Record decline', danger: true,
    note: 'This clears the assignment so the job can go to another provider.',
    fields: [{ key: 'reason', label: 'Reason', type: 'textarea', required: true }],
    onSubmit: (f) => post('/decline', f, 'Decline recorded — ready to reassign'),
  });

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/work-orders')}>Work Orders</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>{w.code}</span>
        </div>}
        title={w.client_name}
        subtitle={[w.category, w.site_address].filter(Boolean).join(' · ') || 'Water tank service'}
      >
        <button className="wt-btn" onClick={load}><RefreshCw size={14} /> Refresh</button>
        <button className="wt-btn" onClick={() => nav(`/water-tank/work-orders/${w.code}/edit`)}><Pencil size={14} /> Edit</button>
        <button className="wt-btn" onClick={() => nav(`/water-tank/work-orders/${w.code}/document`)}>
          <FileSignature size={14} /> {w.wo_signed_at ? 'Signed work order' : w.wo_doc_status === 'Sent' ? 'Awaiting signature' : 'Project work order'}
        </button>
        {next && <button className="wt-btn primary" onClick={ACTIONS[next.key]}>{next.label} <ArrowRight size={14} /></button>}
      </WtHead>

      {/* ── progress ── */}
      <div className="wt-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="wt-panel-head">
          <h2 className="wt-section-title">Delivery Progress</h2>
          <span style={{ fontSize: 22, fontWeight: 800, color: w.progress === 100 ? 'var(--wt-green)' : 'var(--wt-accent-ink)' }}>{w.progress}%</span>
        </div>
        <div className="wt-progressbar">
          <span style={{ width: `${w.progress}%`, background: w.progress === 100 ? 'var(--wt-green)' : 'var(--wt-accent)' }} />
        </div>
        <div className="wt-stagetrack">
          {(d.stage_defs || []).map((s) => {
            const done = !!stages[s.key];
            const Icon = ICONS[s.key] || Check;
            const isNext = next && next.key === s.key;
            return (
              <div key={s.key} className={`wt-stagestep${done ? ' done' : ''}${isNext ? ' next' : ''}`}
                title={`${s.label} · ${s.sop}`}>
                <span className="dot">{done ? <Check size={12} /> : <Icon size={12} />}</span>
                <span className="lb">{s.label}</span>
                <span className="sp">{s.sop}</span>
              </div>
            );
          })}
        </div>
        {next && (
          <div className="wt-note">
            <strong>Next:</strong> {next.label} <span className="muted">({next.sop})</span>
            <button className="wt-btn sm primary" style={{ marginLeft: 10 }} onClick={ACTIONS[next.key]}>Do it</button>
          </div>
        )}
        {!next && w.progress === 100 && (
          <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
            <Check size={13} style={{ verticalAlign: -2, marginRight: 5 }} /> This work order is complete.
          </div>
        )}
      </div>

      {/* ── status strip ── */}
      <div className="wt-statusstrip">
        <Pill value={w.status} />
        {w.source_agreement && <span className="wt-pill green"><FileSignature size={11} /> {w.source_agreement}</span>}
        {w.source_quotation && <span className="wt-pill blue"><FileText size={11} /> {w.source_quotation}</span>}
        {w.provider_name
          ? <span className="wt-pill cyan"><Truck size={11} /> {w.provider_name}</span>
          : <span className="wt-pill amber"><AlertTriangle size={11} /> No provider assigned</span>}
        {w.accepted_at && <span className="wt-pill green">Accepted {dateFmt(w.accepted_at)}</span>}
        {w.declined_reason && <span className="wt-pill red">Declined previously</span>}
        <span className="wt-pill slate">{bdt(w.total_contract)}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {w.provider_name && !w.accepted_at && <button className="wt-btn sm" onClick={decline}><Ban size={12} /> Provider declined</button>}
          {w.provider_name && <button className="wt-btn sm" onClick={() => setAssigning(true)}><Truck size={12} /> Reassign</button>}
        </div>
      </div>

      <div className="wt-detail-grid" style={{ gridTemplateColumns: '340px 1fr' }}>
        {/* ── left rail ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignSelf: 'start' }}>
          <div className="wt-card wt-detailcard">
            <div className="eyebrow">Work Order</div>
            <div className="wt-profile">
              {[['Number', w.code], ['Status', w.status], ['Project', w.project_id],
                ['From agreement', w.source_agreement], ['From quotation', w.source_quotation],
                ['Target date', dateFmt(w.target_date)], ['Scheduled', dateFmt(w.scheduled_date)],
                ['Started', w.started_at ? dateTimeFmt(w.started_at) : null],
                ['Completed', w.completed_at ? dateTimeFmt(w.completed_at) : null],
                ['Warranty', w.warranty]]
                .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
            </div>
          </div>

          {d.client && (
            <div className="wt-card wt-detailcard">
              <div className="eyebrow">Client</div>
              <div className="wt-profile">
                {[['Name', d.client.name], ['Mobile', d.client.mobile], ['Email', d.client.email],
                  ['Site', w.site_address || d.client.service_address], ['Property', d.client.property_type]]
                  .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v || '—'}</div></div>)}
              </div>
              <button className="wt-btn" style={{ justifyContent: 'center' }} onClick={() => nav(`/water-tank/clients/${d.client.code}`)}>
                Open client file <ArrowRight size={13} />
              </button>
            </div>
          )}

          <div className="wt-card wt-detailcard">
            <div className="eyebrow">Money</div>
            <div className="wt-profile">
              {[['Contract value', bdt(m.contract)], ['Provider fee', bdt(m.provider_fee)],
                ['Seventh Sky fee', bdt(m.ss_fee)], ['Paid to provider', bdt(m.provider_paid)],
                ['Still due', bdt(m.provider_due)], ['Margin', bdt(m.margin)]]
                .map(([k, v]) => <div className="f" key={k}><div className="k">{k}</div><div className="v">{v}</div></div>)}
            </div>
            {m.provider_due > 0 && (
              <button className="wt-btn" style={{ justifyContent: 'center' }} onClick={() => nav('/water-tank/payments')}>
                <Wallet size={13} /> Pay provider
              </button>
            )}
          </div>
        </div>

        {/* ── body ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {d.provider && (
            <Section icon={Truck} title="Assigned Provider"
              right={<button className="wt-btn sm" onClick={() => nav(`/water-tank/providers/${d.provider.id}`)}>Open provider</button>}>
              <div className="wt-grid3">
                {[['Provider', d.provider.business_name], ['Contact', d.provider.contact_person],
                  ['Specialty', d.provider.specialty],
                  ['Rating', d.provider.rating ? `${d.provider.rating} / 5` : null],
                  ['Completion rate', d.provider.completion_rate ? `${d.provider.completion_rate}%` : null],
                  ['Assigned', w.assigned_at ? `${dateFmt(w.assigned_at)} by ${w.assigned_by || '—'}` : null]]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}><div style={{ fontSize: 10.5, color: 'var(--wt-muted)' }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div></div>
                  ))}
              </div>
              {w.declined_reason && (
                <div className="wt-note" style={{ background: 'var(--wt-red-bg)', borderColor: '#fecdd3', color: 'var(--wt-red)' }}>
                  A previous provider declined: {w.declined_reason}
                </div>
              )}
            </Section>
          )}

          <Section icon={ClipboardCheck} title="Scope of Work">
            <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {w.scope || 'No scope recorded.'}
            </div>
            {w.special_conditions && (
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 4 }}>Special conditions</div>
                <div style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{w.special_conditions}</div>
              </div>
            )}
            {Array.isArray(w.lines) && w.lines.length > 0 && (
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 90 }}>Code</th><th>Service</th><th style={{ width: 60 }}>Qty</th><th style={{ width: 110, textAlign: 'right' }}>Amount</th></tr></thead>
                <tbody>
                  {w.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="id">{l.code || '—'}</td><td>{l.name}</td>
                      <td>{l.qty || 1}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{bdt(Number(l.price || 0) * (Number(l.qty) || 1))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section icon={ShieldCheck} title="Completion Verification"
            right={<span className="sop">Sec. 9 Step 9</span>}>
            <div className="wt-gates">
              {[['Site left clean and clear', w.site_cleaned], ['Reports submitted', w.reports_submitted],
                ['Before & after photos collected', w.photos_collected], ['Client satisfied', w.client_satisfied]]
                .map(([label, ok]) => (
                  <div className={`wt-gate${ok ? ' ok' : ''}`} key={label}>
                    <span className="ic">{ok ? <Check size={13} /> : <X size={13} />}</span>
                    <div className="tx"><span className="l">{label}</span></div>
                  </div>
                ))}
            </div>
            {w.verified_at
              ? <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
                  Verified by {w.verified_by} on {dateFmt(w.verified_at)}.
                </div>
              : <button className="wt-btn" style={{ alignSelf: 'flex-start' }} onClick={ACTIONS.verify}>
                  <ShieldCheck size={14} /> Update verification
                </button>}
            {w.completion_notes && (
              <div>
                <div className="wt-sec-title" style={{ marginBottom: 4 }}>Completion notes</div>
                <p style={{ fontSize: 12.5, color: 'var(--wt-ink-2)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{w.completion_notes}</p>
              </div>
            )}
          </Section>

          {d.reports.length > 0 && (
            <Section icon={FileText} title={`Service Reports (${d.reports.length})`}>
              <table className="wt-tbl">
                <thead><tr><th style={{ width: 96 }}>Code</th><th>Type</th><th style={{ width: 130 }}>Submitted</th><th style={{ width: 120 }}>Status</th></tr></thead>
                <tbody>
                  {d.reports.map((r) => (
                    <tr key={r.id} className="click" onClick={() => nav(`/water-tank/reports?focus=${encodeURIComponent(r.code)}`)}>
                      <td className="id">{r.code}</td><td><strong>{r.report_type}</strong></td>
                      <td className="muted">{dateFmt(r.submitted_date)}</td><td><Pill value={r.status} sm /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <Section icon={MessageSquare} title="Comments & Observations">
            <RecordComments entityType="work-orders" entityId={w.id} />
          </Section>
        </div>
      </div>

      {assigning && <AssignDrawer wo={w} onClose={() => setAssigning(false)}
        onDone={() => { setAssigning(false); toast.ok('Provider assigned'); load(); }} />}
      {step && <StepDrawer {...step} onClose={() => setStep(null)} />}
    </>
  );
}
