import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Check, X, ChevronLeft, ChevronRight, Save, Loader2, ClipboardList, Truck,
  CalendarClock, Wallet, ShieldCheck, Ban,
} from 'lucide-react';
import api from '../../services/api';
import { useSvcNav, WtHead, DatePicker, Loading, EmptyState, bdt, toast, errText } from './common';

/*
 * Edit a work order — full page, step by step, in the order the job runs:
 * job details → provider → schedule & crew → money → completion checklist.
 * Each step saves, so a half-finished edit is never lost.
 */

const STEPS = [
  { key: 'job', label: 'Job details', hint: 'Client, scope, category', icon: ClipboardList },
  { key: 'provider', label: 'Provider', hint: 'Who is doing the work', icon: Truck },
  { key: 'schedule', label: 'Schedule & crew', hint: 'Dates and attendance', icon: CalendarClock },
  { key: 'money', label: 'Money', hint: 'Fees and contract value', icon: Wallet },
  { key: 'completion', label: 'Completion', hint: 'Verification checklist', icon: ShieldCheck },
];

const STATUSES = ['Draft', 'Issued', 'Accepted', 'In Progress', 'Completed', 'Cancelled'];

export default function WorkOrderForm() {
  const { code } = useParams();
  const nav = useSvcNav();

  const [wo, setWo] = useState(null);
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [dirty, setDirty] = useState(false);

  const [f, setF] = useState({
    client_name: '', client_phone: '', site_address: '',
    category: '', scope: '', special_conditions: '', warranty: '', status: 'Draft',
    provider_name: '', target_date: '', scheduled_date: '', crew_size: '',
    provider_fee: '', ss_fee: '', total_contract: '',
    site_cleaned: false, reports_submitted: false, photos_collected: false, client_satisfied: false,
    completion_notes: '',
  });
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setDirty(true); };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/wt-work-orders/${code}`),
      api.get('/wt-work-orders/reference').catch(() => ({ data: null })),
    ]).then(([d, r]) => {
      const w = d.data.work_order;
      setWo(w); setRef(r.data);
      setF({
        client_name: w.client_name || '', client_phone: w.client_phone || '',
        site_address: w.site_address || '',
        category: w.category || '', scope: w.scope || '',
        special_conditions: w.special_conditions || '', warranty: w.warranty || '',
        status: w.status || 'Draft',
        provider_name: w.provider_name || '',
        target_date: w.target_date || '', scheduled_date: w.scheduled_date || '',
        crew_size: w.crew_size || '',
        provider_fee: w.provider_fee || '', ss_fee: w.ss_fee || '', total_contract: w.total_contract || '',
        site_cleaned: !!w.site_cleaned, reports_submitted: !!w.reports_submitted,
        photos_collected: !!w.photos_collected, client_satisfied: !!w.client_satisfied,
        completion_notes: w.completion_notes || '',
      });
    }).catch((e) => setErr(errText(e, 'Could not load this work order')))
      .finally(() => setLoading(false));
  }, [code]);
  useEffect(load, [load]);

  const save = async ({ silent, then } = {}) => {
    if (!f.client_name.trim()) { setErr('Client name is required.'); setStep(0); return null; }
    setSaving(true); setErr('');
    try {
      const { data } = await api.patch(`/wt-work-orders/${wo.id}`, {
        ...f,
        crew_size: Number(f.crew_size) || 0,
        provider_fee: Number(f.provider_fee) || 0,
        ss_fee: Number(f.ss_fee) || 0,
        total_contract: Number(f.total_contract) || 0,
        target_date: f.target_date || null,
        scheduled_date: f.scheduled_date || null,
      });
      setWo(data);
      setDirty(false);
      if (!silent) toast.ok(`${data.code} saved`);
      if (then) then(data);
      return data;
    } catch (e) { setErr(errText(e, 'Could not save')); return null; }
    finally { setSaving(false); }
  };

  const next = async () => {
    if (step < STEPS.length - 1) { await save({ silent: true }); setStep(step + 1); }
    else await save({ then: (d) => nav(`/water-tank/work-orders/${d.code}`) });
  };

  if (loading) return <Loading />;
  if (!wo) return (
    <>
      <WtHead title="Work order not found"
        crumb={<div className="wt-crumb"><span className="lnk" onClick={() => nav('/water-tank/work-orders')}>Work Orders</span></div>} />
      <div className="wt-card"><EmptyState eyebrow="Error" title={`No work order with code ${code}`} hint={err}
        action={<button className="wt-btn primary" onClick={() => nav('/water-tank/work-orders')}>Back to the register</button>} /></div>
    </>
  );

  const eligible = ref?.assignable_providers || [];
  const margin = (Number(f.total_contract) || 0) - (Number(f.provider_fee) || 0);

  return (
    <>
      <WtHead
        crumb={<div className="wt-crumb">
          <span className="lnk" onClick={() => nav('/water-tank/work-orders')}>Work Orders</span>
          {' › '}<span className="lnk" onClick={() => nav(`/water-tank/work-orders/${wo.code}`)}>{wo.code}</span>
          {' › '}<span style={{ color: 'var(--wt-accent-ink)' }}>Edit</span>
        </div>}
        title={`Edit ${wo.code}`}
        subtitle={f.client_name}
      >
        {dirty && <span style={{ fontSize: 11.5, color: 'var(--wt-amber)', fontWeight: 600 }}>Unsaved changes</span>}
        <button className="wt-btn" disabled={saving} onClick={() => save()}>
          {saving ? <Loader2 size={14} className="wt-spin" /> : <Save size={14} />} Save
        </button>
        <button className="wt-btn" onClick={() => nav(`/water-tank/work-orders/${wo.code}`)}><X size={14} /> Close</button>
      </WtHead>

      <div className="wt-wizard">
        <aside className="wt-wizrail">
          <div className="wt-wizrail-h">Work order</div>
          {STEPS.map((s, i) => (
            <button key={s.key} className={`wt-wizrail-item${i === step ? ' on' : ''}${i < step ? ' done' : ''}`}
              onClick={() => setStep(i)}>
              <span className="n">{i < step ? <Check size={12} /> : i + 1}</span>
              <span><span className="l">{s.label}</span><span className="s">{s.hint}</span></span>
            </button>
          ))}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)', fontSize: 11.5, color: 'var(--wt-muted)', lineHeight: 1.6 }}>
            Progress <strong style={{ color: 'var(--wt-ink)' }}>{wo.progress}%</strong><br />
            {wo.source_agreement && <>From agreement {wo.source_agreement}</>}
          </div>
        </aside>

        <div className="wt-wizpane">
          {err && <div className="wt-formerr">{err}</div>}

          {step === 0 && (
            <>
              <div className="wt-wizpane-h"><h2>Job details</h2><p>Who the work is for and what it covers.</p></div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Client *</label>
                  <input className="wt-input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)} /></div>
                <div className="wt-field"><label>Client phone</label>
                  <input className="wt-input" value={f.client_phone} onChange={(e) => set('client_phone', e.target.value)} /></div>
              </div>
              <div className="wt-field"><label>Site address</label>
                <input className="wt-input" value={f.site_address} onChange={(e) => set('site_address', e.target.value)} /></div>
              <div className="wt-grid2">
                <div className="wt-field"><label>Category</label>
                  <input className="wt-input" value={f.category} onChange={(e) => set('category', e.target.value)} /></div>
                <div className="wt-field"><label>Status</label>
                  <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select></div>
              </div>

              {/* System identifiers — minted automatically, never typed */}
              <div className="wt-field">
                <label>System identifiers</label>
                <div className="wt-idrow">
                  <span className="wt-idchip">
                    <span className="k">Work Order</span>
                    <span className="v">{wo.code}</span>
                  </span>
                  <button type="button" className="wt-idchip lnk"
                    disabled={!wo.client_code}
                    onClick={() => wo.client_code && nav(`/water-tank/clients/${wo.client_code}`)}>
                    <span className="k">Client ID</span>
                    <span className="v">{wo.client_code || 'Assigned on save'}</span>
                  </button>
                  <button type="button" className="wt-idchip lnk"
                    disabled={!wo.project_id}
                    onClick={() => wo.project_id && nav(`/water-tank/projects/${wo.project_id}`)}>
                    <span className="k">Project ID</span>
                    <span className="v">{wo.project_id || 'Assigned on save'}</span>
                  </button>
                  {wo.source_agreement && (
                    <span className="wt-idchip"><span className="k">Agreement</span><span className="v">{wo.source_agreement}</span></span>
                  )}
                  {wo.source_quotation && (
                    <span className="wt-idchip"><span className="k">Quotation</span><span className="v">{wo.source_quotation}</span></span>
                  )}
                </div>
                <span className="hint">
                  These are generated by the system and linked automatically — the client and project
                  file are created on save if they do not exist yet.
                </span>
              </div>
              <div className="wt-field"><label>Scope of work</label>
                <textarea className="wt-input" rows={5} style={{ resize: 'vertical' }} value={f.scope}
                  onChange={(e) => set('scope', e.target.value)} /></div>
              <div className="wt-field"><label>Special conditions</label>
                <textarea className="wt-input" rows={3} style={{ resize: 'vertical' }} value={f.special_conditions}
                  onChange={(e) => set('special_conditions', e.target.value)} /></div>
              <div className="wt-field"><label>Warranty covered</label>
                <input className="wt-input" value={f.warranty} onChange={(e) => set('warranty', e.target.value)}
                  placeholder="e.g. 90 days post-disinfection" /></div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="wt-wizpane-h"><h2>Provider</h2>
                <p>Only approved providers with a signed master agreement may take client work (Sec. 6 Step 4).</p></div>
              <div className="wt-field"><label>Assigned provider</label>
                <select className="wt-select" value={f.provider_name} onChange={(e) => set('provider_name', e.target.value)}>
                  <option value="">Not assigned</option>
                  {eligible.map((p) => <option key={p.id} value={p.business_name}>{p.business_name}{p.rank ? ` · #${p.rank}` : ''}</option>)}
                  {f.provider_name && !eligible.some((p) => p.business_name === f.provider_name) && (
                    <option value={f.provider_name}>{f.provider_name} (currently assigned)</option>
                  )}
                </select>
                <span className="hint">{eligible.length} eligible provider(s).</span>
                {!eligible.length && (
                  <span className="hint" style={{ color: 'var(--wt-amber)' }}>
                    <Ban size={11} style={{ verticalAlign: -1 }} /> None eligible — record master agreements on the provider files first.
                  </span>
                )}
              </div>
              {wo.accepted_at && (
                <div className="wt-note" style={{ background: 'var(--wt-green-bg)', borderColor: '#a7f3d0', color: 'var(--wt-green)' }}>
                  Accepted by {wo.accepted_by} on {new Date(wo.accepted_at).toLocaleDateString()}.
                </div>
              )}
              <div className="wt-note">
                Changing the provider here updates the record only. Use <strong>Assign provider</strong> on the
                dashboard to run the SOP check and stamp who assigned it and when.
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="wt-wizpane-h"><h2>Schedule &amp; crew</h2><p>When the work happens and how many people attend.</p></div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Target date</label>
                  <DatePicker value={f.target_date} onChange={(v) => set('target_date', v)} /></div>
                <div className="wt-field"><label>Scheduled visit</label>
                  <DatePicker value={f.scheduled_date} onChange={(v) => set('scheduled_date', v)} /></div>
                <div className="wt-field"><label>Crew size</label>
                  <input className="wt-input" type="number" value={f.crew_size} onChange={(e) => set('crew_size', e.target.value)} /></div>
              </div>
              {Array.isArray(wo.attendance) && wo.attendance.length > 0 && (
                <div className="wt-field">
                  <label>Attendance recorded</label>
                  <div className="wt-timeline">
                    {wo.attendance.map((a, i) => (
                      <div className="wt-tl" key={i}>
                        <div className="t">{a.crew || 'Crew attended'}</div>
                        {a.note && <div className="d">{a.note}</div>}
                        <div className="m">{new Date(a.at).toLocaleString()}{a.crew_size ? ` · ${a.crew_size} people` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="wt-wizpane-h"><h2>Agreement-controlled money</h2><p>Customer contract value and provider payout are immutable snapshots from the signed agreements.</p></div>
              <div className="wt-grid3">
                <div className="wt-field"><label>Total contract (৳)</label>
                  <input className="wt-input" value={bdt(f.total_contract)} disabled /></div>
                <div className="wt-field"><label>Provider net payout (৳)</label>
                  <input className="wt-input" value={bdt(f.provider_fee)} disabled /></div>
                <div className="wt-field"><label>Seventh Sky fee (৳)</label>
                  <input className="wt-input" value={bdt(f.ss_fee)} disabled /></div>
              </div>
              <div className="wt-card" style={{ padding: 16 }}>
                <div className="wt-costrow"><span>Contract value</span><span>{bdt(f.total_contract)}</span></div>
                <div className="wt-costrow"><span>Provider gross from agreed rates</span><span>{bdt(wo.provider_gross_charge)}</span></div>
                <div className="wt-costrow"><span>Commission ({Number(wo.provider_commission_pct || 0)}%)</span><span>− {bdt(wo.provider_commission_amount)}</span></div>
                <div className="wt-costrow"><span>Provider net payout</span><span>− {bdt(f.provider_fee)}</span></div>
                <div className="wt-costrow total"><span>Seventh Sky margin</span>
                  <span className="amt" style={{ color: margin < 0 ? 'var(--wt-red)' : undefined }}>{bdt(margin)}</span></div>
              </div>
              {margin < 0 && (
                <div className="wt-note" style={{ background: 'var(--wt-red-bg)', borderColor: '#fecdd3', color: 'var(--wt-red)' }}>
                  The provider fee exceeds the contract value — this job would run at a loss.
                </div>
              )}
              <div className="wt-note">To change a provider payout, amend the provider agreement or reassign using an authorised fee override with a recorded reason.</div>
              {Number(wo.provider_paid_amount) > 0 && (
                <div className="wt-note">Already paid to the provider: <strong>{bdt(wo.provider_paid_amount)}</strong>.</div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="wt-wizpane-h"><h2>Completion verification</h2>
                <p>Sec. 9 Step 9 — all four must be true before the job counts as verified.</p></div>
              {[['site_cleaned', 'Site left clean and clear'], ['reports_submitted', 'Reports submitted'],
                ['photos_collected', 'Before & after photos collected'], ['client_satisfied', 'Client satisfied']]
                .map(([k, label]) => (
                  <label className="wt-toggle" key={k} style={{ padding: '10px 12px', border: '1px solid var(--wt-line)', borderRadius: 8 }}>
                    <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />
                    <span>{label}</span>
                  </label>
                ))}
              <div className="wt-field"><label>Completion notes</label>
                <textarea className="wt-input" rows={4} style={{ resize: 'vertical' }} value={f.completion_notes}
                  onChange={(e) => set('completion_notes', e.target.value)} /></div>
              <div className="wt-note">
                Saving recalculates the progress bar from the record. Verification is stamped only when all
                four boxes are ticked.
              </div>
            </>
          )}

          <div className="wt-wizfoot">
            {step > 0 && <button className="wt-btn" onClick={() => setStep(step - 1)}><ChevronLeft size={14} /> Back</button>}
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--wt-muted)' }}>Step {step + 1} of {STEPS.length}</span>
            <button className="wt-btn primary" disabled={saving} onClick={next}>
              {step < STEPS.length - 1 ? <>Save &amp; continue <ChevronRight size={14} /></>
                : saving ? 'Saving…' : <><Check size={14} /> Finish</>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
