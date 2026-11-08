import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Upload, Send, UserCheck, ArrowRightLeft, CalendarPlus, Copy } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { fileSrc } from '../../../ui/FileUpload';
import { Button, Field, Input, Select, Textarea } from '../../../ui/kit';
import { useGet, errText, Loading, Info, Tag, fmtDate } from '../hrShared';
import { useRecMeta, Avatar, statusTone, when, tk } from './recShared';

/*
 * Candidate (M3 §8–15, §21). Everything HR does with one applicant: the profile and documents, then for each
 * application the status, CV screening, interviews and panel scores, pre-employment checks, the offer and
 * the transfer to the Employee Master. Each change is logged on the application's timeline.
 */

export default function Candidate() {
  const { code } = useParams();
  const [params, setParams] = useSearchParams();
  const { meta, error } = useRecMeta();
  const c = useGet(`/hr/recruitment/candidates/${code}`);
  const toast = useToast();
  if (!c.data || !meta) return <div className="hrm"><Loading error={c.error || error} reload={c.reload} /></div>;
  const x = c.data;
  const apps = x.applications || [];
  const sel = apps.find((a) => String(a.id) === params.get('app')) || apps[0];

  const pool = async () => {
    try { await api.post(`/hr/recruitment/candidates/${code}/talent-pool`, { in: !x.in_talent_pool }); toast.success(x.in_talent_pool ? 'Removed from the talent pool' : 'Added to the talent pool'); c.reload(); }
    catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar name={x.full_name} />
          <div>
            <h1>{x.full_name} {x.in_talent_pool && <Tag tone="blue">Talent pool</Tag>} {x.archived_at && <Tag tone="slate">Archived</Tag>}</h1>
            <p>{x.candidate_code}{x.email ? ` · ${x.email}` : ''}{x.mobile ? ` · ${x.mobile}` : ''}</p>
          </div>
        </div>
        <div className="hrm-actions"><Button variant="ghost" onClick={pool}>{x.in_talent_pool ? 'Remove from talent pool' : 'Keep in talent pool'}</Button></div>
      </div>
      {x.duplicate_of && <div className="hrm-banner"><div className="grow"><b>Possible duplicate</b><span>The email, mobile or National ID matches {x.duplicate_of.full_name} ({x.duplicate_of.candidate_code}).</span></div><Link className="hrm-link" to={`/hr/recruitment/candidates/${x.duplicate_of.candidate_code}`}>Open</Link></div>}
      <div className="hrm-split">
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          <Profile x={x} />
          <Documents x={x} reload={c.reload} />
        </div>
        <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
          {apps.length > 1 && (
            <div className="hrm-tabs" role="group" aria-label="Applications">
              {apps.map((a) => <button key={a.id} type="button" aria-pressed={sel && sel.id === a.id} onClick={() => setParams({ app: a.id })}>{a.vacancy?.vacancy_code} {a.vacancy?.title}<b>{a.status}</b></button>)}
            </div>
          )}
          {sel ? <Application key={sel.id} a={sel} cand={x} meta={meta} reload={c.reload} /> : <section className="hrm-card"><p className="hrm-empty">No applications. Add this person to an open vacancy from the talent pool.</p></section>}
        </div>
      </div>
    </div>
  );
}

function Profile({ x }) {
  return (
    <section className="hrm-card" aria-labelledby="cand-prof">
      <div className="hrm-card-head"><h2 id="cand-prof">Profile</h2></div>
      <div className="hrm-facts">
        <Info label="Date of birth">{fmtDate(x.date_of_birth)}</Info>
        <Info label="National ID">{x.national_id}</Info>
        <Info label="Address">{x.address}</Info>
        <Info label="Location">{x.location}</Info>
        <Info label="Highest qualification">{x.highest_qualification}</Info>
        <Info label="Institution">{x.institution}{x.graduation_year ? `, ${x.graduation_year}` : ''}</Info>
        <Info label="Current employer">{x.current_employer}</Info>
        <Info label="Current position">{x.current_position}</Info>
        <Info label="Experience">{x.years_experience != null ? `${Number(x.years_experience)} years` : null}</Info>
        <Info label="Expected salary">{x.expected_salary ? tk(x.expected_salary) : null}</Info>
        <Info label="Notice period">{x.notice_period}</Info>
        <Info label="Availability">{x.availability}</Info>
      </div>
      {(x.skills || []).length > 0 && <div className="hrm-pad"><div className="hrm-chips">{x.skills.map((s) => <span key={s}>{s}</span>)}</div></div>}
    </section>
  );
}

function Documents({ x, reload }) {
  const toast = useToast();
  const { meta } = useRecMeta();
  const [type, setType] = useState('CV');
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', file); fd.append('doc_type', type);
    try { await api.post(`/hr/recruitment/candidates/${x.candidate_code}/documents`, fd); toast.success('Uploaded'); reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  return (
    <section className="hrm-card" aria-labelledby="cand-docs">
      <div className="hrm-card-head"><h2 id="cand-docs">Documents</h2><small>{x.documents.length}</small></div>
      {x.documents.length ? (
        <div className="hrm-pad"><ul className="hrm-alerts">
          {x.documents.map((d) => (
            <li key={d.id}><span className="ic" aria-hidden><Upload size={14} /></span><span className="t"><b>{d.doc_type}</b><small>{d.file_name || 'File'} · {fmtDate(d.createdAt)}</small></span><a className="hrm-link" href={fileSrc(d.file_url)} target="_blank" rel="noopener noreferrer">Open</a></li>
          ))}
        </ul></div>
      ) : <p className="hrm-empty">No documents yet.</p>}
      <div className="hrm-decide">
        <label className="sr-only" htmlFor="doc-type">Document type</label>
        <select id="doc-type" className="select" value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 200 }}>{(meta?.documentTypes || ['CV']).map((t) => <option key={t}>{t}</option>)}</select>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}><Upload size={16} /> {busy ? 'Uploading…' : 'Upload'}<input type="file" hidden onChange={(e) => upload(e.target.files[0])} /></label>
      </div>
    </section>
  );
}

function Application({ a, cand, meta, reload }) {
  const v = a.vacancy || {};
  return (
    <>
      <StatusCard a={a} v={v} reload={reload} />
      {!['Not Selected', 'Talent Pool', 'Offer Declined'].includes(a.status) && <Screening a={a} meta={meta} reload={reload} />}
      <Interviews a={a} meta={meta} reload={reload} />
      {(a.checks || []).length > 0 && <Checks a={a} meta={meta} reload={reload} />}
      {['Offer Pending', 'Offer Sent', 'Offer Accepted', 'Offer Declined'].includes(a.status) && <Offer a={a} cand={cand} meta={meta} reload={reload} />}
      <Messages a={a} cand={cand} reload={reload} />
      <Timeline a={a} />
    </>
  );
}

function StatusCard({ a, v, reload }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [pool, setPool] = useState(false);
  const [busy, setBusy] = useState(null);
  const move = async (to) => {
    setBusy(to);
    try { await api.post(`/hr/recruitment/applications/${a.id}/status`, { to, note: note || undefined, talent_pool: to === 'Not Selected' ? pool : undefined }); toast.success(`Moved to ${to}`); setNote(''); reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(null); }
  };
  const forward = (a.next || []).filter((s) => !['Not Selected', 'Talent Pool'].includes(s));
  return (
    <section className="hrm-card" aria-labelledby="app-status">
      <div className="hrm-card-head">
        <h2 id="app-status">{v.title} <Link className="hrm-link" to={`/hr/recruitment/pipeline/${v.vacancy_code}`} style={{ fontWeight: 400 }}>{v.vacancy_code}</Link></h2>
        <Tag tone={statusTone(a.status)}>{a.status}</Tag>
      </div>
      <div className="hrm-facts">
        <Info label="Applied">{fmtDate(a.applied_at)}</Info>
        <Info label="Source">{a.source}</Info>
        <Info label="Screening score">{a.screening_score != null ? Math.round(Number(a.screening_score)) : 'Not scored'}</Info>
        {a.hired_employee_code && <Info label="Employee"><Link className="hrm-link" to={`/hr/employees/${a.hired_employee_code}`}>{a.hired_employee_code}</Link></Info>}
      </div>
      {a.cover_letter && <div className="hrm-pad"><p className="hrm-text">{a.cover_letter}</p></div>}
      {(a.next || []).length > 0 && (
        <div className="hrm-pad" style={{ display: 'grid', gap: 10 }}>
          <label className="sr-only" htmlFor="move-note">Note for the timeline</label>
          <input id="move-note" className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the timeline (optional)" />
          <div className="rec-moves">
            {forward.map((s) => <Button key={s} size="sm" onClick={() => move(s)} disabled={Boolean(busy)}>{busy === s ? 'Moving…' : `Move to ${s}`}</Button>)}
            {(a.next || []).includes('Talent Pool') && <Button size="sm" variant="ghost" onClick={() => move('Talent Pool')} disabled={Boolean(busy)}>Move to talent pool</Button>}
            {(a.next || []).includes('Not Selected') && <Button size="sm" variant="ghost" onClick={() => move('Not Selected')} disabled={Boolean(busy)}>Not selected</Button>}
          </div>
          {(a.next || []).includes('Not Selected') && <label className="hrm-check" style={{ minHeight: 0, fontSize: 13 }}><input type="checkbox" checked={pool} onChange={(e) => setPool(e.target.checked)} /> If not selected, keep them in the talent pool</label>}
          {a.status === 'Reference Check' && !a.checks_complete?.ok && <p className="hrm-note">The offer opens when every required check is done.</p>}
        </div>
      )}
    </section>
  );
}

function Screening({ a, meta, reload }) {
  const toast = useToast();
  const [scores, setScores] = useState(a.screening?.scores || {});
  const save = async () => {
    try { const r = await api.post(`/hr/recruitment/applications/${a.id}/screening`, { scores }); toast.success(`Score ${Math.round(Number(r.data.screening_score))} of 100`); reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  return (
    <section className="hrm-card" aria-labelledby="app-screen">
      <div className="hrm-card-head"><h2 id="app-screen">CV screening</h2><small>Score 0 to 5; the weights add up to 100</small></div>
      <div className="hrm-pad">
        <div className="rec-score-grid">
          {Object.entries(meta.weights).map(([k, w]) => (
            <React.Fragment key={k}>
              <label htmlFor={`sc-${k}`}>{meta.criteria[k]}</label>
              <select id={`sc-${k}`} value={scores[k] ?? ''} onChange={(e) => setScores({ ...scores, [k]: e.target.value === '' ? undefined : Number(e.target.value) })}><option value="">—</option>{[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              <small style={{ color: 'var(--mute)' }}>{w}%</small>
            </React.Fragment>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><Button size="sm" onClick={save}>Save score</Button></div>
      </div>
    </section>
  );
}

function Interviews({ a, meta, reload }) {
  const toast = useToast();
  const { user } = useAuth();
  const panelOpts = useGet('/hr/recruitment/panel-options');
  const [form, setForm] = useState(null);
  const [scoring, setScoring] = useState(null);
  const closed = ['Not Selected', 'Talent Pool', 'Offer Declined', 'Offer Accepted'].includes(a.status);
  const schedule = async () => {
    try {
      await api.post(`/hr/recruitment/applications/${a.id}/interviews`, { ...form, scheduled_at: form.at ? new Date(form.at).toISOString() : null, panel: form.panel });
      toast.success('Interview scheduled. Invites with a calendar file were emailed.'); setForm(null); reload();
    } catch (e) { toast.error(errText(e)); }
  };
  const setStatus = async (iv, status) => {
    try { await api.patch(`/hr/recruitment/interviews/${iv.id}`, { status }); toast.success(status === 'completed' ? 'Marked completed' : 'Cancelled'); reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  return (
    <section className="hrm-card" aria-labelledby="app-iv">
      <div className="hrm-card-head"><h2 id="app-iv">Interviews</h2>{!closed && !form && <Button size="sm" variant="ghost" icon={CalendarPlus} onClick={() => setForm({ type: meta.interviewTypes[0], duration_minutes: 45, panel: [] })}>Schedule</Button>}</div>
      {form && (
        <div className="hrm-pad">
          <div className="hrm-form">
            <Field label="Type" required><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{meta.interviewTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Date and time (Dhaka)" required><Input type="datetime-local" value={form.at || ''} onChange={(e) => setForm({ ...form, at: e.target.value })} /></Field>
            <Field label="Length (minutes)"><Input type="number" min="15" step="15" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Head office, room 2" /></Field>
            <Field label="Meeting link" full><Input value={form.meeting_link || ''} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} placeholder="For an online interview" /></Field>
            <Field label="Panel" required full>
              <select multiple className="select" style={{ minHeight: 110 }} value={form.panel.map(String)} onChange={(e) => setForm({ ...form, panel: [...e.target.selectedOptions].map((o) => Number(o.value)) })}>
                {(panelOpts.data?.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="hrm-actions" style={{ marginTop: 12 }}><Button size="sm" onClick={schedule}>Schedule and send invites</Button><Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancel</Button></div>
        </div>
      )}
      {(a.interviews || []).length ? (
        <ul className="rec-timeline">
          {a.interviews.map((iv) => (
            <li key={iv.id}>
              <span><b>{iv.type}</b> · {when(iv.scheduled_at)} · {iv.meeting_link ? 'online' : iv.location || 'place to be confirmed'}</span>
              <Tag tone={iv.status === 'completed' ? 'green' : iv.status === 'cancelled' ? 'slate' : 'blue'}>{iv.status}</Tag>
              <small className="note">Panel: {iv.panel_names.join(', ') || '—'}</small>
              {iv.evaluations.map((ev) => <small key={ev.id} className="note">{ev.evaluator_name}: <b>{ev.recommendation}</b> · {Object.entries(ev.scores || {}).map(([k, n]) => `${k} ${n}`).join(', ')}{ev.comments ? `: "${ev.comments}"` : ''}</small>)}
              <span className="note rec-moves">
                {iv.status === 'scheduled' && <><button type="button" className="hrm-link" onClick={() => setStatus(iv, 'completed')}>Mark completed</button><button type="button" className="hrm-link danger" onClick={() => setStatus(iv, 'cancelled')}>Cancel</button></>}
                {iv.status !== 'cancelled' && <button type="button" className="hrm-link" onClick={() => setScoring(scoring === iv.id ? null : iv.id)}>{iv.evaluations.some((e) => e.evaluator_id === user?.id) ? 'Change my scores' : 'Score this interview'}</button>}
              </span>
              {scoring === iv.id && <Evaluate iv={iv} meta={meta} mine={iv.evaluations.find((e) => e.evaluator_id === user?.id)} onDone={() => { setScoring(null); reload(); }} />}
            </li>
          ))}
        </ul>
      ) : !form && <p className="hrm-empty">No interviews yet.</p>}
    </section>
  );
}

function Evaluate({ iv, meta, mine, onDone }) {
  const toast = useToast();
  const [scores, setScores] = useState(mine?.scores || {});
  const [rec, setRec] = useState(mine?.recommendation || '');
  const [comments, setComments] = useState(mine?.comments || '');
  const save = async () => {
    const clean = Object.fromEntries(Object.entries(scores).filter(([, n]) => n));
    try { await api.post(`/hr/recruitment/interviews/${iv.id}/evaluations`, { scores: clean, recommendation: rec, comments }); toast.success('Scores saved'); onDone(); }
    catch (e) { toast.error(errText(e)); }
  };
  return (
    <div className="note" style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, display: 'grid', gap: 10 }}>
      <div className="rec-score-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 90px' }}>
        {meta.competencies.map((k) => (
          <React.Fragment key={k}>
            <label htmlFor={`ev-${iv.id}-${k}`}>{k}</label>
            <select id={`ev-${iv.id}-${k}`} value={scores[k] || ''} onChange={(e) => setScores({ ...scores, [k]: Number(e.target.value) || undefined })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
          </React.Fragment>
        ))}
      </div>
      <Field label="Overall recommendation" required><Select value={rec} onChange={(e) => setRec(e.target.value)}><option value="">Choose…</option>{meta.recommendations.map((r) => <option key={r}>{r}</option>)}</Select></Field>
      <Field label="Comments"><Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      <div><Button size="sm" onClick={save}>Save scores</Button></div>
    </div>
  );
}

function Checks({ a, meta, reload }) {
  const toast = useToast();
  const put = async (type, body) => {
    try { await api.put(`/hr/recruitment/applications/${a.id}/checks/${encodeURIComponent(type)}`, body); reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  const left = a.checks_complete?.missing?.length || 0;
  return (
    <section className="hrm-card" aria-labelledby="app-checks">
      <div className="hrm-card-head"><h2 id="app-checks">Pre-employment checks</h2><small>{left ? `${left} required ${left === 1 ? 'check' : 'checks'} left` : 'All required checks done'}</small></div>
      <div className="hrm-table-wrap">
        <table className="hrm-table rec-checks">
          <thead><tr><th>Check</th><th>Required</th><th>Result</th><th>Verified</th></tr></thead>
          <tbody>{a.checks.map((k) => (
            <tr key={k.id}>
              <td><b>{k.check_type}</b></td>
              <td>{meta.optionalChecks.includes(k.check_type)
                ? <label className="hrm-check" style={{ minHeight: 0 }}><input type="checkbox" checked={k.required} onChange={(e) => put(k.check_type, { required: e.target.checked })} aria-label={`${k.check_type} required`} /> {k.required ? 'Yes' : 'If required'}</label>
                : 'Always'}</td>
              <td><select className="select" aria-label={`${k.check_type} result`} value={k.status} onChange={(e) => put(k.check_type, { status: e.target.value })}><option value="pending">Pending</option><option value="done">Done</option><option value="failed">Failed</option></select></td>
              <td>{k.verified_by_name ? <small>{k.verified_by_name}, {fmtDate(k.verified_at)}</small> : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

function Offer({ a, cand, meta, reload }) {
  const toast = useToast();
  const o = a.offer;
  const [f, setF] = useState(() => ({ salary: o?.salary || '', employment_type: o?.employment_type || a.vacancy?.employment_type || '', probation_months: o?.probation_months ?? 3, start_date: o?.start_date || '', supervisor_employee_id: o?.supervisor_employee_id || '', work_location_branch_id: o?.work_location_branch_id || a.vacancy?.location_branch_id || '' }));
  const [link, setLink] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try { await api.post(`/hr/recruitment/applications/${a.id}/offer`, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''))); toast.success('Offer letter ready. Check it, then send.'); reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const send = async () => {
    setBusy(true);
    try { const r = await api.post(`/hr/recruitment/offers/${o.id}/send`); setLink(r.data.link); (r.data.email_sent ? toast.success : toast.error)(r.data.message); reload(); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const confirm = async () => {
    try { await api.post(`/hr/recruitment/applications/${a.id}/confirm-onboarding`); toast.success('Onboarding confirmed'); reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  const transfer = async () => {
    try { const r = await api.post(`/hr/recruitment/applications/${a.id}/transfer`); toast.success(`${r.data.message} (${r.data.change_request.code})`); reload(); }
    catch (e) { toast.error(e.response?.data?.reasons ? e.response.data.reasons.join(' ') : errText(e)); }
  };
  const draft = a.status === 'Offer Pending';
  return (
    <section className="hrm-card" aria-labelledby="app-offer">
      <div className="hrm-card-head"><h2 id="app-offer">Offer</h2>{o && <Tag tone={o.status === 'accepted' ? 'green' : o.status === 'declined' ? 'red' : 'blue'}>{o.status}</Tag>}</div>
      {draft && (
        <div className="hrm-pad">
          <div className="hrm-form">
            <Field label="Monthly basic salary (Tk)" required><Input type="number" min="1" value={f.salary} onChange={set('salary')} /></Field>
            <Field label="Employment type" required><Select value={f.employment_type} onChange={set('employment_type')}><option value="">Choose…</option>{meta.employeeTypes.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Probation (months)"><Input type="number" min="0" max="12" value={f.probation_months} onChange={set('probation_months')} /></Field>
            <Field label="Start date" required><Input type="date" value={f.start_date} onChange={set('start_date')} /></Field>
            <Field label="Supervisor" required><Select value={f.supervisor_employee_id} onChange={set('supervisor_employee_id')}><option value="">Choose…</option>{meta.supervisors.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.employee_code})</option>)}</Select></Field>
            <Field label="Work location"><Select value={f.work_location_branch_id} onChange={set('work_location_branch_id')}><option value="">—</option>{meta.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
          </div>
          <div className="hrm-actions" style={{ marginTop: 12 }}><Button size="sm" variant={o ? 'ghost' : 'primary'} onClick={save} disabled={busy}>{o ? 'Update letter' : 'Prepare letter'}</Button>{o && <Button size="sm" icon={Send} onClick={send} disabled={busy}>Send offer to {cand.email || 'the candidate'}</Button>}</div>
        </div>
      )}
      {o?.letter_html && (
        <div className="hrm-pad">
          {/* Generated server-side from the approved template with every value escaped and active content removed. */}
          <div className="rec-letter" aria-label="Offer letter" dangerouslySetInnerHTML={{ __html: o.letter_html }} />
        </div>
      )}
      {link && <div className="hrm-banner info"><div className="grow"><b>Offer link</b><span style={{ overflowWrap: 'anywhere' }}>{link}</span></div><button type="button" className="hrm-link" onClick={() => navigator.clipboard?.writeText(link).then(() => toast.success('Copied'))}><Copy size={13} /> Copy</button></div>}
      {o?.status === 'sent' && <p className="hrm-note hrm-pad">Sent {fmtDate(o.sent_at)}. The candidate answers on the offer page; the link works for 14 days.</p>}
      {o?.status === 'declined' && <p className="hrm-note hrm-pad">Declined {fmtDate(o.declined_at)}{o.decline_reason ? `: "${o.decline_reason}"` : ''}.</p>}
      {a.status === 'Offer Accepted' && (
        <div className="hrm-pad" style={{ display: 'grid', gap: 10 }}>
          <p className="hrm-note">Accepted {fmtDate(o?.accepted_at)}{o?.accepted_ip ? ` from ${o.accepted_ip}` : ''}.</p>
          {a.hired_employee_code ? <p className="hrm-note">Transferred to the Employee Master as <Link className="hrm-link" to={`/hr/employees/${a.hired_employee_code}`}>{a.hired_employee_code}</Link>.</p> : <>
            {a.transfer && !a.transfer.ok && <ul className="hrm-note" style={{ margin: 0, paddingLeft: 18 }}>{a.transfer.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            <div className="hrm-actions">
              {!a.hr_confirmed_at && <Button size="sm" variant="ghost" icon={UserCheck} onClick={confirm}>Confirm onboarding</Button>}
              <Button size="sm" icon={ArrowRightLeft} onClick={transfer} disabled={!a.transfer?.ok}>Transfer to Employee Master</Button>
            </div>
            <p className="hrm-note">The HR Manager approves the transfer in Approvals; the employee record and login are created then.</p>
          </>}
        </div>
      )}
    </section>
  );
}

function Messages({ a, cand, reload }) {
  const toast = useToast();
  const [m, setM] = useState({ channel: cand.email ? 'email' : 'sms', subject: '', body: '' });
  const send = async () => {
    try { await api.post(`/hr/recruitment/applications/${a.id}/messages`, m); toast.success('Sent'); setM({ ...m, subject: '', body: '' }); reload(); }
    catch (e) { toast.error(errText(e)); reload(); }
  };
  return (
    <section className="hrm-card" aria-labelledby="app-msg">
      <div className="hrm-card-head"><h2 id="app-msg">Message the candidate</h2><small>Logged on the timeline</small></div>
      <div className="hrm-pad">
        <div className="hrm-form">
          <Field label="Send by"><Select value={m.channel} onChange={(e) => setM({ ...m, channel: e.target.value })}><option value="email" disabled={!cand.email}>Email</option><option value="sms" disabled={!cand.mobile}>SMS</option></Select></Field>
          {m.channel === 'email' && <Field label="Subject"><Input value={m.subject} onChange={(e) => setM({ ...m, subject: e.target.value })} /></Field>}
          <Field label="Message" required full><Textarea rows={3} value={m.body} onChange={(e) => setM({ ...m, body: e.target.value })} /></Field>
        </div>
        <div style={{ marginTop: 10 }}><Button size="sm" icon={Send} onClick={send} disabled={!m.body.trim()}>Send</Button></div>
      </div>
    </section>
  );
}

function Timeline({ a }) {
  const events = [...(a.events || [])].reverse();
  return (
    <section className="hrm-card" aria-labelledby="app-tl">
      <div className="hrm-card-head"><h2 id="app-tl">Timeline</h2></div>
      <ul className="rec-timeline">
        {events.map((e) => (
          <li key={e.id}>
            <span>{e.kind === 'status' ? <>{e.from_status ? `${e.from_status} → ` : ''}<b>{e.to_status}</b></> : e.kind === 'message' ? <b>{e.channel === 'sms' ? 'SMS sent' : 'Email sent'}</b> : <b>Note</b>}</span>
            <small>{e.actor_name || 'Candidate'} · {when(e.at)}</small>
            {e.note && <span className="note">{e.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

