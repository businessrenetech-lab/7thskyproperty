import React, { useState, useEffect } from 'react';
import {
  X, Check, Loader2, Briefcase, User, FolderOpen,
  MapPin, Truck, AlertTriangle, FileText,
} from 'lucide-react';
import api from '../../services/api';
import { dateFmt, Pill, toast, errText, svcReports } from './common';
import Photos from './Photos';
import JobPicker from './JobPicker';

/*
 * New Service Report — a CENTRED modal, and nothing typed that the system knows.
 *
 * The old form was a right-hand drawer with client and work order as free text,
 * no project or property fields at all, and photos entered as a caption plus an
 * "image link" the filer had to host themselves. A report could therefore name a
 * client who was not the client on the job, cite a work order that did not
 * exist, and carry no evidence.
 *
 * The fix is one idea: A REPORT IS ABOUT A JOB. Pick the job and the client,
 * project, property, provider and service category all follow from it — resolved
 * on the server, not sent by this screen. What is left to type is the only thing
 * the system genuinely does not know: what was found on site.
 *
 * Staff filing for a provider is first-class rather than a workaround: the
 * report records who it is ABOUT and who FILED it, which are different things
 * when a dispute arrives.
 */

const STEPS = ['Choose the job', 'Write the report'];

/* ── the modal ─────────────────────────────────────────────────────────── */

export default function ServiceReportModal({ job: presetJob, onClose, onCreated }) {
  const [ref, setRef] = useState(null);
  const [step, setStep] = useState(presetJob ? 1 : 0);
  const [job, setJob] = useState(presetJob || null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState({
    report_type: 'Cleaning',
    status: 'Submitted',
    submitted_date: new Date().toISOString().slice(0, 10),
    summary: '',
    findings: '',
    provider_id: '',
    filed_via: 'staff',
    photos_before: [],
    photos_after: [],
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    api.get('/wt-providers/reports/reference')
      .then((r) => setRef(r.data))
      .catch(() => setRef({ report_types: [], statuses: [], providers: [] }));
  }, []);

  // Closing on Escape is expected of a modal; without it the only way out is the X.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const pickJob = (j) => {
    setJob(j);
    // The provider defaults to whoever the job is assigned to. Still changeable,
    // for the case where the job was reassigned after the visit happened.
    set('provider_id', j.provider?.id || '');
    setStep(1);
  };

  const save = async () => {
    if (!job) { setErr('Choose the job this report is about.'); return; }
    if (!f.summary.trim() && !f.findings.trim()) {
      setErr('Say what was found on site — that is the part of a report only a person can supply.');
      return;
    }
    setSaving(true); setErr('');
    try {
      const r = await api.post('/wt-providers/reports', {
        work_order_code: job.code,
        report_type: f.report_type,
        status: f.status,
        submitted_date: f.submitted_date,
        summary: f.summary,
        findings: f.findings,
        provider_id: f.provider_id || undefined,
        filed_via: f.filed_via,
        photos_before: f.photos_before,
        photos_after: f.photos_after,
      });
      toast.ok(`Report ${r.data.code} filed against ${job.code}.`);
      onCreated(r.data);
    } catch (e) { setErr(errText(e, 'Could not file this report')); setSaving(false); }
  };

  const provider = ref?.providers?.find((p) => String(p.id) === String(f.provider_id));

  return (
    <div className="wt-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className="wt-modal" role="dialog" aria-modal="true">
        <div className="wt-modal-head">
          <div>
            <h3>New Service Report</h3>
            <div className="sub">
              SOP-02 Sec. 8 Step 10 · {STEPS[step]}
              {job && step === 1 ? ` · ${job.code}` : ''}
            </div>
          </div>
          <button className="wt-modal-x" onClick={onClose} disabled={saving}><X size={18} /></button>
        </div>

        <div className="wt-modal-body">
          {err && <div className="wt-formerr">{err}</div>}

          {step === 0 && (
            <JobPicker endpoint="/wt-providers/reports/jobs" countKey="reports"
              label="Find the job this report is about" onPick={pickJob} />
          )}

          {step === 1 && job && (
            <>
              {/*
                * The resolved job, shown read-only. These are facts from the work
                * order, not inputs — displaying them as fields would invite
                * someone to change one and create the very mismatch this rework
                * exists to prevent.
                */}
              <div className="wt-ctxcard">
                <div className="wt-ctxcard-head">
                  <span><Briefcase size={14} /> <strong>{job.code}</strong> <Pill value={job.status} sm /></span>
                  <button className="wt-btn sm" onClick={() => { setJob(null); setStep(0); }}>Change job</button>
                </div>
                <div className="wt-ctxgrid">
                  <span><User size={12} /> <span className="muted">Client</span><b>{job.client?.name || '—'}</b></span>
                  <span><FolderOpen size={12} /> <span className="muted">Project</span><b>{job.project?.code || '—'}</b></span>
                  <span><MapPin size={12} /> <span className="muted">Property</span><b>{job.site_address || '—'}</b></span>
                  <span><Truck size={12} /> <span className="muted">Assigned to</span><b>{job.provider?.name || 'Unassigned'}</b></span>
                  <span><FileText size={12} /> <span className="muted">Service</span><b>{job.category || '—'}</b></span>
                  <span><span className="muted">Scheduled</span><b>{job.scheduled_date ? dateFmt(job.scheduled_date) : job.target_date ? dateFmt(job.target_date) : '—'}</b></span>
                </div>
                {job.reports_filed > 0 && (
                  <div className="wt-note" style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>
                      {job.reports_filed} report{job.reports_filed === 1 ? '' : 's'} already filed against this job
                      ({job.report_types_filed.join(', ')}). File another only if this covers a different visit.
                    </span>
                  </div>
                )}
              </div>

              <div className="wt-grid2">
                <div className="wt-field">
                  <label>Report type</label>
                  <select className="wt-select" value={f.report_type} onChange={(e) => set('report_type', e.target.value)}>
                    {(ref?.report_types || []).map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="wt-field">
                  <label>Date of the visit</label>
                  <input className="wt-input" type="date" value={f.submitted_date}
                    onChange={(e) => set('submitted_date', e.target.value)} />
                </div>
              </div>

              {/*
                * Filing on a provider's behalf, which is the normal case on this
                * screen: the office is entering what a contractor phoned or
                * handed in. The record keeps both facts.
                */}
              <div className="wt-field">
                <label>Report is about</label>
                <select className="wt-select" value={f.provider_id} onChange={(e) => set('provider_id', e.target.value)}>
                  <option value="">No provider — Seventh Sky did this work</option>
                  {(ref?.providers || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.status && p.status !== 'Approved' ? ` (${p.status})` : ''}
                    </option>
                  ))}
                </select>
                {/*
                  * Some work orders name a contractor who has no record in the
                  * provider book — seed and legacy rows carry the name only. The
                  * id cannot be invented, but silently defaulting to "Seventh Sky
                  * did this work" for a job that plainly names someone else would
                  * be misleading, so the mismatch is stated.
                  */}
                {job.provider?.name && !job.provider?.id ? (
                  <span className="hint" style={{ color: '#b45309' }}>
                    <AlertTriangle size={11} style={{ verticalAlign: -1 }} />{' '}
                    The job names <b>{job.provider.name}</b>, who is not in the provider book.
                    Choose the matching provider, or leave this as Seventh Sky.
                  </span>
                ) : (
                  <span className="hint">
                    {provider
                      ? `Filed by you on behalf of ${provider.name}. The record keeps both facts.`
                      : 'Defaults to whoever the job is assigned to.'}
                  </span>
                )}
              </div>

              <div className="wt-field">
                <label>What was done</label>
                <textarea className="wt-input" rows={3} value={f.summary} onChange={(e) => set('summary', e.target.value)}
                  placeholder={svcReports().placeholder} />
              </div>

              <div className="wt-field">
                <label>Findings and anything needing follow-up</label>
                <textarea className="wt-input" rows={3} value={f.findings} onChange={(e) => set('findings', e.target.value)}
                  placeholder="Condition found, damage, parts replaced, recommendations…" />
              </div>

              <Photos label="Before photos" photos={f.photos_before}
                uploadUrl="/wt-providers/reports/upload"
                onChange={(p) => set('photos_before', p)} />
              <Photos label="After photos" photos={f.photos_after}
                uploadUrl="/wt-providers/reports/upload"
                onChange={(p) => set('photos_after', p)} />

              <div className="wt-field">
                <label>Status</label>
                <select className="wt-select" value={f.status} onChange={(e) => set('status', e.target.value)}>
                  {(ref?.statuses || []).map((t) => <option key={t}>{t}</option>)}
                </select>
                <span className="hint">
                  Submitted means it is waiting on Seventh Sky to verify. Accepting it is a separate
                  decision on the register — filing and signing off are not the same act.
                </span>
              </div>
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
              {saving ? ' Filing…' : ' File report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
