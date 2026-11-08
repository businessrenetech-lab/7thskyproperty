import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Share2, Clock } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input } from '../../../ui/kit';
import { useGet, errText, Loading, Tag, fmtDate } from '../hrShared';
import { COLUMNS, CLOSED, Avatar, days, when, priorityTone } from './recShared';

/*
 * Recruitment pipeline (M3 §10; approved frame "Recruitment pipeline"). One vacancy at a time, its applicants
 * in columns by status. A card opens the candidate, where HR moves them on. Closed applications are counted
 * above the board rather than shown on it.
 */

export default function Pipeline() {
  const { code } = useParams();
  const nav = useNavigate();
  const open = useGet('/hr/recruitment/vacancies', { status: 'published' });
  const list = open.data?.data || [];
  const current = code || list[0]?.vacancy_code;
  if (!open.data) return <div className="hrm"><Loading error={open.error} reload={open.reload} /></div>;
  if (!current) return <div className="hrm"><div className="hrm-head"><div><h1>Pipeline</h1><p>Applicants for each open vacancy.</p></div></div><section className="hrm-card"><p className="hrm-empty">There are no open vacancies. <Link className="hrm-link" to="/hr/recruitment/requests">Raise a workforce request</Link>.</p></section></div>;
  return <Board key={current} code={current} open={list} onPick={(c) => nav(`/hr/recruitment/pipeline/${c}`)} />;
}

function Board({ code, open, onPick }) {
  const v = useGet(`/hr/recruitment/vacancies/${code}`);
  const [adding, setAdding] = useState(false);
  if (!v.data) return <div className="hrm"><Loading error={v.error} reload={v.reload} /></div>;
  const x = v.data;
  const apps = x.applications_list || [];
  const closed = apps.filter((a) => CLOSED.includes(a.status));
  const count = (s) => closed.filter((a) => a.status === s).length;
  const options = open.some((o) => o.vacancy_code === x.vacancy_code) ? open : [x, ...open];

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>{x.title}</h1><p>{x.vacancy_code} · {x.department_name}{x.location_name ? ` · ${x.location_name}` : ''} · {x.positions_count} {x.positions_count === 1 ? 'position' : 'positions'}{x.closing_date ? ` · closes ${fmtDate(x.closing_date)}` : ''}</p></div>
        <div className="hrm-actions">
          <Link className="btn btn-ghost" to={`/hr/recruitment/vacancies/${x.vacancy_code}`}><Share2 size={16} /> Share vacancy</Link>
          {x.status === 'published' && <Button icon={Plus} onClick={() => setAdding(true)}>Add candidate</Button>}
        </div>
      </div>
      <div className="rec-strip">
        <label className="sr-only" htmlFor="pick-vac">Vacancy</label>
        <select id="pick-vac" value={x.vacancy_code} onChange={(e) => onPick(e.target.value)}>
          {options.map((o) => <option key={o.vacancy_code} value={o.vacancy_code}>{o.vacancy_code} {o.title}</option>)}
        </select>
        <span>Published on {(x.channels || []).length} {(x.channels || []).length === 1 ? 'channel' : 'channels'}</span>
        <span>Priority: <Tag tone={priorityTone[x.priority] || 'slate'}>{x.priority}</Tag></span>
        <span>{apps.length} {apps.length === 1 ? 'applicant' : 'applicants'}</span>
        {closed.length > 0 && <span>Closed: {count('Not Selected')} not selected, {count('Offer Declined')} declined, {count('Talent Pool')} to talent pool</span>}
      </div>
      <div className="rec-board" role="list" aria-label="Pipeline">
        {COLUMNS.map((col) => {
          const cards = apps.filter((a) => col.statuses.includes(a.status));
          return (
            <section key={col.key} className="rec-col" role="listitem" aria-label={`${col.label}, ${cards.length}`}>
              <header><div><b>{col.label}</b><small>{col.sub}</small></div><span className="n">{cards.length}</span></header>
              {cards.map((a) => <Card key={a.id} a={a} />)}
            </section>
          );
        })}
      </div>
      {adding && <AddCandidate vacancy={x} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); v.reload(); }} />}
    </div>
  );
}

function Card({ a }) {
  const c = a.candidate || {};
  const score = a.screening_score != null ? Number(a.screening_score) : null;
  let flag = null;
  if (c.duplicate_of_id) flag = <Tag tone="red">Duplicate?</Tag>;
  else if (a.next_interview) flag = <Tag tone="blue">{a.next_interview.type.replace(' Interview', '')}{a.next_interview.meeting_link ? ' · online' : ''}</Tag>;
  else if (a.status === 'Reference Check' && a.checks_left) flag = <Tag tone="amber">{a.checks_left} {a.checks_left === 1 ? 'check' : 'checks'} left</Tag>;
  else if (a.status === 'Offer Sent') flag = <Tag tone="blue">Awaiting reply</Tag>;
  else if (a.status === 'Offer Accepted') flag = <Tag tone="green">{a.hired_employee_id ? 'Hired' : 'Accepted'}</Tag>;
  return (
    <Link to={`/hr/recruitment/candidates/${c.candidate_code}?app=${a.id}`} className="rec-card">
      <div className="who"><Avatar name={c.full_name} /><span style={{ minWidth: 0 }}><b>{c.full_name}</b><small>{a.source || '—'}</small></span></div>
      <div className="row">
        <span><Clock size={12} aria-hidden /> {a.next_interview ? when(a.next_interview.scheduled_at) : a.status === 'Offer Sent' && a.offer?.sent_at ? `Sent ${fmtDate(a.offer.sent_at)}` : `${days(a.applied_at)} d`}</span>
        {score != null && <span className={`score${score >= 75 ? ' hi' : ''}`} aria-label={`Screening score ${score}`}>{Math.round(score)}</span>}
      </div>
      {flag && <div className="flag">{flag}</div>}
    </Link>
  );
}

function AddCandidate({ vacancy, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ full_name: '', email: '', mobile: '', source: 'Referral' });
  const [cv, setCv] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const { data } = await api.post('/hr/recruitment/candidates', { ...f, vacancy_code: vacancy.vacancy_code });
      if (cv) { const fd = new FormData(); fd.append('file', cv); fd.append('doc_type', 'CV'); await api.post(`/hr/recruitment/candidates/${data.candidate_code}/documents`, fd); }
      toast.success(data.duplicate_of ? `Added ${data.candidate_code}. It may be a duplicate of an existing candidate.` : `Added ${data.candidate_code}`);
      onSaved();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title={`Add a candidate to ${vacancy.vacancy_code}`} onClose={onClose} width={480}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Adding…' : 'Add candidate'}</Button></>}>
      <div className="hrm-form">
        <Field label="Full name" required full><Input value={f.full_name} onChange={set('full_name')} /></Field>
        <Field label="Email"><Input type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label="Mobile"><Input type="tel" value={f.mobile} onChange={set('mobile')} placeholder="01XXXXXXXXX" /></Field>
        <Field label="Source" full><Input value={f.source} onChange={set('source')} placeholder="Referral, walk-in, Bdjobs…" /></Field>
        <Field label="CV" full><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(e) => setCv(e.target.files[0] || null)} /></Field>
      </div>
      <p className="hrm-note" style={{ marginTop: 10 }}>Give an email address or a mobile number. A matching email, mobile or National ID is flagged as a possible duplicate.</p>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}
