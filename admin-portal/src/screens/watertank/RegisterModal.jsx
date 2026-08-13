import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, AlertTriangle, ShieldCheck, MessageSquareWarning, AlertOctagon } from 'lucide-react';
import api from '../../services/api';
import { toast, errText } from './common';
import JobPicker, { JobContextCard } from './JobPicker';

/*
 * New warranty / complaint / incident — a CENTRED modal, driven by the database.
 *
 * All three used to be right-hand drawers whose every field was free text: the
 * client typed by hand, the work order typed by hand, the warranty type typed by
 * hand, and no property field at all. So a warranty could cover a client who was
 * not the client on the job it came from, and nothing objected — the same defect
 * the service report rework fixed, in three more places.
 *
 * Same fix, same shape: A WARRANTY, A COMPLAINT AND AN INCIDENT ARE ALL ABOUT A
 * JOB. Pick the job; the client, project, property and provider are resolved on
 * the server from the work order. The lists — warranty types, complaint types,
 * severities, providers — come from /wt-ops/registers/reference rather than being
 * hard-coded in this file, which is where they lived before and where they went
 * stale.
 *
 * The one deliberate asymmetry: a complaint may have no job. A client can be
 * unhappy about something that never became a work order, and refusing to record
 * that would simply mean it goes unrecorded.
 */

const KINDS = {
  warranties: {
    title: 'Register Warranty',
    verb: 'Register warranty',
    sub: 'Cover given on a completed job',
    icon: ShieldCheck,
    jobRequired: true,
    pickLabel: 'Find the job this warranty covers',
  },
  complaints: {
    title: 'Log Complaint',
    verb: 'Log complaint',
    sub: 'Raised by a client, or logged by our team on their behalf',
    icon: MessageSquareWarning,
    jobRequired: false,
    pickLabel: 'Find the job this complaint is about',
  },
  incidents: {
    title: 'Log Incident',
    verb: 'Log incident',
    sub: 'Injury, contamination, damage or equipment failure on site',
    icon: AlertOctagon,
    jobRequired: true,
    pickLabel: 'Find the job this incident happened on',
  },
};

const today = () => new Date().toISOString().slice(0, 10);
/** Cover ending N months from a start date, so expiry is never typed blind. */
const addMonths = (iso, months) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

export default function RegisterModal({ kind, job: presetJob, onClose, onCreated }) {
  const spec = KINDS[kind];
  const [ref, setRef] = useState(null);
  const [step, setStep] = useState(presetJob ? 1 : 0);
  const [job, setJob] = useState(presetJob || null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState({
    // warranty
    warranty_type: '',
    start_date: today(),
    expiry_date: '',
    coverage: '',
    terms: '',
    status: kind === 'warranties' ? 'Active' : 'Open',
    // complaint / incident
    incident_type: '',
    severity: 'Medium',
    details: '',
    description: '',
    action_taken: '',
    location: '',
    incident_date: today(),
    logged_date: today(),
    raised_via: kind === 'complaints' ? 'client' : 'staff',
    client_name: '',
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-ops/registers/reference')
      .then((r) => {
        setRef(r.data);
        // Defaults come from the reference payload, so this screen never carries
        // its own copy of a list that the backend also holds.
        setF((s) => ({
          ...s,
          warranty_type: s.warranty_type || r.data?.warranty?.types?.[0] || '',
          incident_type: s.incident_type
            || (kind === 'complaints' ? r.data?.complaint?.types?.[0] : r.data?.incident?.types?.[0])
            || '',
        }));
      })
      .catch(() => setRef({ warranty: {}, complaint: {}, incident: {}, providers: [] }));
  }, [kind]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  /*
   * Expiry follows the type and the start date, using the standard cover period
   * the backend publishes. It stays editable — a negotiated warranty is a real
   * thing — but it is no longer a blank box that gets a guessed date.
   */
  const months = ref?.warranty?.default_months?.[f.warranty_type];
  const suggestedExpiry = months ? addMonths(f.start_date || today(), months) : '';
  const expiry = f.expiry_date || suggestedExpiry;

  const pickJob = (j) => {
    setJob(j);
    // A warranty starts when the work finished, not when someone got round to
    // registering it.
    if (kind === 'warranties' && j.completed_at) set('start_date', String(j.completed_at).slice(0, 10));
    if (kind === 'incidents' && j.site_address) set('location', j.site_address);
    setStep(1);
  };

  const save = async () => {
    if (spec.jobRequired && !job) { setErr('Choose the job this is about.'); return; }
    if (kind === 'complaints' && !job && !f.client_name.trim()) {
      setErr('Name the client, or pick the job this complaint is about.');
      return;
    }
    if (kind === 'complaints' && !f.details.trim()) { setErr('Say what the client is unhappy about.'); return; }
    if (kind === 'incidents' && !f.description.trim()) { setErr('Describe what happened.'); return; }

    setSaving(true); setErr('');
    const body = { work_order_code: job?.code || undefined, status: f.status };
    if (kind === 'warranties') {
      Object.assign(body, {
        warranty_type: f.warranty_type,
        start_date: f.start_date,
        expiry_date: expiry,
        coverage: f.coverage,
        terms: f.terms,
      });
    } else if (kind === 'complaints') {
      Object.assign(body, {
        incident_type: f.incident_type,
        severity: f.severity,
        details: f.details,
        logged_date: f.logged_date,
        raised_via: f.raised_via,
        client_name: job ? undefined : f.client_name,
      });
    } else {
      Object.assign(body, {
        incident_type: f.incident_type,
        severity: f.severity,
        incident_date: f.incident_date,
        location: f.location,
        description: f.description,
        action_taken: f.action_taken,
      });
    }

    try {
      const r = await api.post(`/wt-ops/registers/${kind}`, body);
      toast.ok(`${r.data.code} recorded${job ? ` against ${job.code}` : ''}.`);
      onCreated(r.data);
    } catch (e) { setErr(errText(e, `Could not save this ${spec.verb.toLowerCase()}`)); setSaving(false); }
  };

  const existing = job?.existing?.[kind] || 0;
  const slaHours = ref?.complaint?.sla_hours?.[f.severity];
  const Icon = spec.icon;

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true">
        <div className="wt-modal-head">
          <div>
            <h3><Icon size={16} style={{ verticalAlign: -3, marginRight: 6 }} />{spec.title}</h3>
            <div className="sub">
              {spec.sub}
              {job && step === 1 ? ` · ${job.code}` : ''}
            </div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={saving}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {step === 0 && (
            <>
              <JobPicker countKey={kind} label={spec.pickLabel} onPick={pickJob} />
              {!spec.jobRequired && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--wt-line)' }}>
                  <button className="wt-btn" onClick={() => { setJob(null); setStep(1); }}>
                    This is not about a specific job
                  </button>
                  <span className="hint" style={{ display: 'block', marginTop: 6 }}>
                    A client can be unhappy about something that never became a work order —
                    billing, a missed callback, conduct. Those belong on the register too.
                  </span>
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              {job && (
                <JobContextCard job={job} onChange={() => { setJob(null); setStep(0); }}>
                  {existing > 0 && (
                    <div className="wt-note" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        {existing} already recorded against this job. Add another only if it is
                        genuinely a separate matter.
                      </span>
                    </div>
                  )}
                </JobContextCard>
              )}

              {/* ── warranty ─────────────────────────────────────────── */}
              {kind === 'warranties' && (
                <>
                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>What the cover is for</label>
                      <select className="wt-select" value={f.warranty_type} onChange={(e) => { set('warranty_type', e.target.value); set('expiry_date', ''); }}>
                        {(ref?.warranty?.types || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                      {months ? <span className="hint">Standard cover for this is {months} months.</span> : null}
                    </div>
                    <div className="wt-field">
                      <label>Status</label>
                      <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                        {(ref?.warranty?.statuses || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>Cover starts</label>
                      <input className="wt-input" type="date" value={f.start_date}
                        onChange={(e) => { set('start_date', e.target.value); set('expiry_date', ''); }} />
                      <span className="hint">Defaults to the day the job was completed.</span>
                    </div>
                    <div className="wt-field">
                      <label>Cover ends</label>
                      <input className="wt-input" type="date" value={expiry}
                        onChange={(e) => set('expiry_date', e.target.value)} />
                      <span className="hint">
                        {f.expiry_date && suggestedExpiry && f.expiry_date !== suggestedExpiry
                          ? `Standard would be ${suggestedExpiry}.`
                          : 'Calculated from the type — change it if this one was negotiated.'}
                      </span>
                    </div>
                  </div>

                  <div className="wt-field">
                    <label>What is covered</label>
                    <textarea className="wt-input" rows={3} value={f.coverage} onChange={(e) => set('coverage', e.target.value)}
                      placeholder="e.g. Re-clean at no charge if bacteriological testing fails within the cover period." />
                  </div>
                  <div className="wt-field">
                    <label>Conditions and exclusions</label>
                    <textarea className="wt-input" rows={2} value={f.terms} onChange={(e) => set('terms', e.target.value)}
                      placeholder="What voids it — third-party works, tampering, no access for inspection…" />
                  </div>
                </>
              )}

              {/* ── complaint ────────────────────────────────────────── */}
              {kind === 'complaints' && (
                <>
                  {!job && (
                    <div className="wt-field">
                      <label>Client</label>
                      <input className="wt-input" value={f.client_name} onChange={(e) => set('client_name', e.target.value)}
                        placeholder="Who is complaining" />
                    </div>
                  )}

                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>How it reached us</label>
                      <select className="wt-select" value={f.raised_via} onChange={(e) => set('raised_via', e.target.value)}>
                        <option value="client">The client raised it</option>
                        <option value="staff">Our team logged it</option>
                        <option value="provider">The provider reported it</option>
                      </select>
                      <span className="hint">
                        The register shows both, and shows which is which — a complaint the client
                        made and one we noticed ourselves are not the same thing.
                      </span>
                    </div>
                    <div className="wt-field">
                      <label>Date logged</label>
                      <input className="wt-input" type="date" value={f.logged_date} onChange={(e) => set('logged_date', e.target.value)} />
                    </div>
                  </div>

                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>What it is about</label>
                      <select className="wt-select" value={f.incident_type} onChange={(e) => set('incident_type', e.target.value)}>
                        {(ref?.complaint?.types || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="wt-field">
                      <label>Severity</label>
                      <select className="wt-select" value={f.severity} onChange={(e) => set('severity', e.target.value)}>
                        {(ref?.complaint?.severities || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                      {slaHours ? (
                        <span className="hint">
                          Response due within {slaHours} hours; acknowledgement within one business day.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="wt-field">
                    <label>What the client said</label>
                    <textarea className="wt-input" rows={4} value={f.details} onChange={(e) => set('details', e.target.value)}
                      placeholder="In their words where possible — it is the record that gets read back if this escalates." />
                  </div>
                </>
              )}

              {/* ── incident ─────────────────────────────────────────── */}
              {kind === 'incidents' && (
                <>
                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>What happened</label>
                      <select className="wt-select" value={f.incident_type} onChange={(e) => set('incident_type', e.target.value)}>
                        {(ref?.incident?.types || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="wt-field">
                      <label>Severity</label>
                      <select className="wt-select" value={f.severity} onChange={(e) => set('severity', e.target.value)}>
                        {(ref?.incident?.severities || []).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="wt-grid2">
                    <div className="wt-field">
                      <label>Date</label>
                      <input className="wt-input" type="date" value={f.incident_date} onChange={(e) => set('incident_date', e.target.value)} />
                    </div>
                    <div className="wt-field">
                      <label>Where</label>
                      <input className="wt-input" value={f.location} onChange={(e) => set('location', e.target.value)}
                        placeholder="Rooftop tank, plant room…" />
                      <span className="hint">Defaults to the job's site address.</span>
                    </div>
                  </div>

                  <div className="wt-field">
                    <label>What happened</label>
                    <textarea className="wt-input" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)}
                      placeholder="Sequence of events, who was present, any injury or damage." />
                  </div>
                  <div className="wt-field">
                    <label>Action taken</label>
                    <textarea className="wt-input" rows={2} value={f.action_taken} onChange={(e) => set('action_taken', e.target.value)}
                      placeholder="Immediate response, made safe, reported to…" />
                  </div>
                  <div className="wt-field">
                    <label>Status</label>
                    <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                      {(ref?.incident?.statuses || []).map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="wt-modal-foot">
          <span className="muted" style={{ fontSize: 12, marginRight: 'auto' }}>
            {step === 0 ? 'Step 1 of 2 — the job decides everything else' : 'Step 2 of 2'}
          </span>
          <button className="wt-btn" onClick={onClose} disabled={saving}>Cancel</button>
          {step === 1 && (
            <button className="wt-btn primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 size={14} className="wt-spin" /> : <Check size={14} />}
              {saving ? ' Saving…' : ` ${spec.verb}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
