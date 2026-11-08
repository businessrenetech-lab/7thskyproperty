import React, { useState } from 'react';
import { Plus, Send, Check } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Drawer, Field, Input, Textarea } from '../../ui/kit';
import { useGet, errText, Loading, Tag, fmtDate } from './hrShared';

/*
 * Performance reviews (plan Task 29), ported from Hadi Real Estate: six criteria rated 1 to 5, strengths, what to
 * improve and goals. HR reviews anyone, a supervisor the people below them. The employee reads it in My HR and
 * acknowledges it, with a comment if they want.
 */

const TONE = { draft: 'slate', submitted: 'amber', acknowledged: 'green' };
const LABEL = { draft: 'Draft', submitted: 'With the employee', acknowledged: 'Acknowledged' };

function Stars({ value, onChange, label }) {
  return (
    <div className="hrm-stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} of 5`} className={value >= n ? 'on' : ''} disabled={!onChange} onClick={() => onChange && onChange(n)}>★</button>
      ))}
    </div>
  );
}

export default function Performance() {
  const meta = useGet('/hr/performance/meta');
  const list = useGet('/hr/performance');
  const [open, setOpen] = useState(null);
  if (!meta.data) return <div className="hrm"><Loading error={meta.error} reload={meta.reload} /></div>;
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Performance reviews</h1><p>{meta.data.canManage ? 'Everyone’s reviews.' : 'Reviews of the people who report to you.'} The employee reads and acknowledges each one.</p></div>
        {meta.data.people.length > 0 && <Button icon={Plus} onClick={() => setOpen({})}>New review</Button>}
      </div>
      <section className="hrm-card" aria-label="Reviews">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Employee</th><th>Period</th><th className="num">Overall</th><th>Reviewer</th><th>Updated</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} className="click" tabIndex={0} onClick={() => setOpen(r)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r); }}>
                  <td><b>{r.full_name}</b><small>{r.employee_code}</small></td>
                  <td>{r.period_label}</td>
                  <td className="num">{r.overall != null ? `${Number(r.overall).toFixed(1)} / 5` : '—'}</td>
                  <td>{r.reviewer_name || '—'}</td>
                  <td>{fmtDate(r.updated_at)}</td>
                  <td className="num"><Tag tone={TONE[r.status]}>{LABEL[r.status]}</Tag></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">No reviews yet.{meta.data.people.length ? ' Start one with New review.' : ''}</p>}
      </section>
      {open && <ReviewForm meta={meta.data} review={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); list.reload(); }} />}
    </div>
  );
}

function ReviewForm({ meta, review, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ employee_code: review.employee_code || '', period_label: review.period_label || '', period_start: review.period_start || '', period_end: review.period_end || '',
    ratings: review.ratings || {}, strengths: review.strengths || '', improvements: review.improvements || '', goals: review.goals || '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const locked = review.id && review.status !== 'draft';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const rated = meta.criteria.filter((c) => f.ratings[c]).length;
  const save = async (submit) => {
    setBusy(true); setErr(null);
    const body = { ...f, period_start: f.period_start || null, period_end: f.period_end || null };
    try {
      const r = review.id ? await api.patch(`/hr/performance/${review.id}`, body) : await api.post('/hr/performance', body);
      if (submit) await api.post(`/hr/performance/${r.data.id}/submit`);
      toast.success(submit ? 'Sent to the employee' : 'Saved as draft');
      onSaved();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title={review.id ? `${review.full_name}: ${review.period_label}` : 'New review'} onClose={onClose} width={560}
      footer={locked ? <Button variant="ghost" onClick={onClose}>Close</Button> : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="secondary" onClick={() => save(false)} disabled={busy}>Save draft</Button><Button icon={Send} onClick={() => save(true)} disabled={busy || rated < meta.criteria.length}>Send to employee</Button></>}>
      <div className="hrm-form">
        {!review.id && <Field label="Employee" required full><select className="input" value={f.employee_code} onChange={set('employee_code')}><option value="">Choose…</option>{meta.people.map((p) => <option key={p.employee_code} value={p.employee_code}>{p.full_name} ({p.employee_code})</option>)}</select></Field>}
        <Field label="Period" required full><Input value={f.period_label} onChange={set('period_label')} disabled={locked} placeholder="e.g. 2026 mid-year" /></Field>
        <Field label="From"><Input type="date" value={f.period_start || ''} onChange={set('period_start')} disabled={locked} /></Field>
        <Field label="To"><Input type="date" value={f.period_end || ''} onChange={set('period_end')} disabled={locked} /></Field>
      </div>
      <div className="hrm-ratings">
        {meta.criteria.map((c) => (
          <div key={c} className="row"><span>{c}</span><Stars label={c} value={Number(f.ratings[c]) || 0} onChange={locked ? null : (n) => setF((s) => ({ ...s, ratings: { ...s.ratings, [c]: n } }))} /></div>
        ))}
        <p className="hrm-note">{rated} of {meta.criteria.length} rated{review.overall != null ? ` · overall ${Number(review.overall).toFixed(1)} / 5` : ''}</p>
      </div>
      <div className="hrm-form">
        <Field label="Strengths" full><Textarea rows={3} value={f.strengths} onChange={set('strengths')} disabled={locked} /></Field>
        <Field label="What to improve" full><Textarea rows={3} value={f.improvements} onChange={set('improvements')} disabled={locked} /></Field>
        <Field label="Goals for the next period" full><Textarea rows={3} value={f.goals} onChange={set('goals')} disabled={locked} /></Field>
      </div>
      {review.employee_comment && <p className="hrm-note" style={{ marginTop: 10 }}>Employee’s comment: {review.employee_comment}</p>}
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}

export function MyReviews() {
  const toast = useToast();
  const list = useGet('/hr/performance/mine');
  const [comment, setComment] = useState({});
  const rows = list.data?.data || [];
  const ack = async (r) => {
    try { await api.post(`/hr/performance/${r.id}/acknowledge`, { comment: comment[r.id] || null }); toast.success('Acknowledged'); list.reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>My reviews</h1><p>Your performance reviews. Acknowledge each one once you have read it.</p></div></div>
      {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? rows.map((r) => (
        <section key={r.id} className="hrm-card" aria-label={r.period_label}>
          <div className="hrm-card-head"><h2>{r.period_label}</h2><Tag tone={TONE[r.status]}>{r.status === 'submitted' ? 'To acknowledge' : 'Acknowledged'}</Tag></div>
          <div className="hrm-pad">
            <p className="hrm-note">By {r.reviewer_name || 'your reviewer'} · {fmtDate(r.submitted_at)} · overall {Number(r.overall).toFixed(1)} / 5</p>
            <div className="hrm-ratings">{Object.entries(r.ratings).map(([c, v]) => <div key={c} className="row"><span>{c}</span><Stars label={c} value={Number(v)} /></div>)}</div>
            {r.strengths && <><span className="hrm-note">Strengths</span><p className="hrm-text">{r.strengths}</p></>}
            {r.improvements && <><span className="hrm-note">What to improve</span><p className="hrm-text">{r.improvements}</p></>}
            {r.goals && <><span className="hrm-note">Goals</span><p className="hrm-text">{r.goals}</p></>}
            {r.status === 'submitted' ? (
              <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                <Field label="Your comment (optional)"><Textarea rows={2} value={comment[r.id] || ''} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} /></Field>
                <div><Button icon={Check} onClick={() => ack(r)}>Acknowledge</Button></div>
              </div>
            ) : r.employee_comment && <p className="hrm-note">Your comment: {r.employee_comment}</p>}
          </div>
        </section>
      )) : <section className="hrm-card"><p className="hrm-empty">No reviews yet.</p></section>}
    </div>
  );
}
