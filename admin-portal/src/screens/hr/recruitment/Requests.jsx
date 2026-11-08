import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, X, Clock } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input, Select, Textarea } from '../../../ui/kit';
import { useGet, errText, Loading, Info, Tag, fmtDate } from '../hrShared';
import { useRecMeta, priorityTone, range } from './recShared';

/*
 * Workforce requests (M3 §3–5; approved frame "Vacancy request"). A department manager or HR asks for staff;
 * the request goes Department Manager → HR Manager → Finance → CEO in the Approvals inbox, and the CEO's
 * approval publishes the vacancy. Decisions are taken in Approvals, so this screen shows where each one stands.
 */

const STATE = { pending: ['Waiting', 'amber'], approved: ['Approved', 'green'], rejected: ['Returned', 'red'], withdrawn: ['Withdrawn', 'slate'] };
const ROLE = { department_manager: 'Department Manager', hr_manager: 'HR Manager', finance_manager: 'Finance verification', ceo: 'CEO approval' };

export default function Requests() {
  const { meta, error: metaError } = useRecMeta();
  const list = useGet('/hr/recruitment/workforce-requests');
  const [sel, setSel] = useState(null);
  const [form, setForm] = useState(false);
  const rows = list.data?.data || [];
  const current = rows.find((r) => r.id === sel) || rows[0];

  if (!meta || !list.data) return <div className="hrm"><Loading error={metaError || list.error} reload={list.reload} /></div>;
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Workforce requests</h1><p>Ask for new or replacement staff. The CEO's approval publishes the vacancy.</p></div>
        <Button icon={Plus} onClick={() => setForm(true)}>New request</Button>
      </div>
      {!rows.length ? (
        <section className="hrm-card"><p className="hrm-empty">No requests yet. Raise one when a team needs more people.</p></section>
      ) : (
        <div className="hrm-split">
          <section className="hrm-card hrm-inbox" aria-label="Requests">
            {rows.map((r) => {
              const [label, tone] = STATE[r.status] || [r.status, 'slate'];
              return (
                <button key={r.id} type="button" className="hrm-req" aria-current={current && current.id === r.id} onClick={() => setSel(r.id)}>
                  <div className="top"><b>{r.vacancies_count} × {r.position_title || 'Position'}</b><span className="when"><Tag tone={tone}>{label}</Tag></span></div>
                  <p>{r.department_name} · {r.request_kind}</p>
                  <div className="chain">{r.change_request?.code} · raised {fmtDate(r.createdAt)} by {r.requested_by_name || '—'}</div>
                </button>
              );
            })}
          </section>
          {current && <RequestDetail r={current} />}
        </div>
      )}
      {form && <RequestForm meta={meta} onClose={() => setForm(false)} onSaved={() => { setForm(false); list.reload(); }} />}
    </div>
  );
}

function RequestDetail({ r }) {
  const cr = r.change_request || { chain: [], step: 0, status: r.status };
  const steps = (cr.chain || []).map((s, i) => {
    const done = s.decision === 'approve';
    const no = s.decision === 'reject';
    const now = cr.status === 'pending' && i === cr.step;
    return { ...s, i, done, no, now };
  });
  return (
    <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
      <section className="hrm-card" aria-labelledby="wr-title">
        <div className="hrm-card-head"><h2 id="wr-title">{r.vacancies_count} × {r.position_title} · {r.department_name}</h2><small>{cr.code}</small></div>
        <div className="hrm-facts">
          <Info label="Reason">{r.reason}</Info>
          <Info label="New or replacement">{r.request_kind}</Info>
          <Info label="Salary range">{range(r.salary_min, r.salary_max)}</Info>
          <Info label="Employment type">{r.employment_type}</Info>
          <Info label="Expected joining">{fmtDate(r.expected_joining_date)}</Info>
          <Info label="Closing date">{fmtDate(r.closing_date)}</Info>
          <Info label="Budget available">{r.budget_available ? 'Yes' : 'No'}</Info>
          <Info label="Priority"><Tag tone={priorityTone[r.priority] || 'slate'}>{r.priority}</Tag></Info>
        </div>
      </section>
      <section className="hrm-card" aria-labelledby="wr-chain">
        <div className="hrm-card-head"><h2 id="wr-chain">Approval</h2><small>Decisions are taken in Approvals</small></div>
        <ol className="hrm-steps">
          {steps.map((s) => (
            <li key={s.i}>
              <span className={`dot ${s.done ? 'ok' : s.no ? 'no' : s.now ? 'now' : ''}`} aria-hidden>{s.done ? <Check size={12} /> : s.no ? <X size={12} /> : s.now ? <Clock size={12} /> : null}</span>
              <div><b>{ROLE[s.role] || s.role}</b><small>{s.decided_by_name || (s.decision ? '' : s.now ? 'Waiting' : 'Not yet')}{s.comment ? `: "${s.comment}"` : ''}</small></div>
              <span className="at">{s.at ? new Date(s.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : s.now ? 'Waiting' : ''}</span>
            </li>
          ))}
          <li>
            <span className={`dot ${r.vacancy ? 'ok' : ''}`} aria-hidden>{r.vacancy ? <Check size={12} /> : null}</span>
            <div><b>Vacancy published</b><small>{r.vacancy ? <Link className="hrm-link" to={`/hr/recruitment/vacancies/${r.vacancy.vacancy_code}`}>{r.vacancy.vacancy_code}</Link> : 'Created and goes live when the CEO approves'}</small></div>
            <span className="at" />
          </li>
        </ol>
        {cr.status === 'pending' && <div className="hrm-decide"><Link className="hrm-link" to="/hr/approvals">Open Approvals</Link></div>}
      </section>
    </div>
  );
}

function RequestForm({ meta, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ request_kind: 'New Position', vacancies_count: 1, priority: 'Normal', budget_available: false, department_id: meta.departments.length === 1 ? String(meta.departments[0].id) : '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const positions = useMemo(() => meta.positions.filter((p) => String(p.department_id) === String(f.department_id)), [meta, f.department_id]);
  const jds = useGet(f.position_id ? '/hr/recruitment/job-descriptions' : null, { position_id: f.position_id });

  const save = async () => {
    setBusy(true); setErr(null);
    const body = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null));
    try {
      const { data } = await api.post('/hr/recruitment/workforce-requests', body);
      toast.success(`Sent for approval (${data.change_request.code})`);
      onSaved();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };

  return (
    <Drawer title="New workforce request" onClose={onClose} width={560}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Sending…' : 'Send for approval'}</Button></>}>
      <div className="hrm-form">
        <Field label="Department" required><Select value={f.department_id || ''} onChange={(e) => setF((s) => ({ ...s, department_id: e.target.value, position_id: '' }))}><option value="">Choose…</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label="Position" required><Select value={f.position_id || ''} onChange={(e) => { const p = positions.find((x) => String(x.id) === e.target.value); setF((s) => ({ ...s, position_id: e.target.value, reports_to_position_id: p?.reports_to_position_id || '', employment_type: s.employment_type || '' })); }} disabled={!f.department_id}><option value="">Choose…</option>{positions.map((p) => <option key={p.id} value={p.id}>{p.title} ({p.code})</option>)}</Select></Field>
        <Field label="Reason for recruitment" required full><Textarea rows={2} value={f.reason || ''} onChange={set('reason')} /></Field>
        <Field label="New position or replacement" required><Select value={f.request_kind} onChange={set('request_kind')}>{meta.requestKinds.map((k) => <option key={k}>{k}</option>)}</Select></Field>
        <Field label="Number of vacancies" required><Input type="number" min="1" max="100" value={f.vacancies_count} onChange={set('vacancies_count')} /></Field>
        <Field label="Lowest salary (Tk a month)"><Input type="number" min="0" value={f.salary_min || ''} onChange={set('salary_min')} /></Field>
        <Field label="Highest salary (Tk a month)"><Input type="number" min="0" value={f.salary_max || ''} onChange={set('salary_max')} /></Field>
        <Field label="Employment type" required><Select value={f.employment_type || ''} onChange={set('employment_type')}><option value="">Choose…</option>{meta.employeeTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Expected joining date" required><Input type="date" value={f.expected_joining_date || ''} onChange={set('expected_joining_date')} /></Field>
        <Field label="Reports to"><Select value={f.reports_to_position_id || ''} onChange={set('reports_to_position_id')}><option value="">—</option>{meta.positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
        <Field label="Location"><Select value={f.location_branch_id || ''} onChange={set('location_branch_id')}><option value="">—</option>{meta.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Closing date" required><Input type="date" value={f.closing_date || ''} onChange={set('closing_date')} /></Field>
        <Field label="Job description"><Select value={f.job_description_id || ''} onChange={set('job_description_id')} disabled={!f.position_id}><option value="">—</option>{(jds.data?.data || []).map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}</Select></Field>
        <div className="field full" style={{ gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink2)' }}>Recruitment priority</span>
          <div className="rec-prio" role="group" aria-label="Recruitment priority">{meta.priorities.map((p) => <button key={p} type="button" aria-pressed={f.priority === p} onClick={() => setF((s) => ({ ...s, priority: p }))}>{p}</button>)}</div>
        </div>
        <label className="hrm-check full"><input type="checkbox" checked={f.budget_available} onChange={set('budget_available')} /> Budget is available for this hire</label>
      </div>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}
