import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Megaphone, Columns3, Copy, ExternalLink, Lock } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Field, Input, Select } from '../../../ui/kit';
import { useGet, errText, Loading, Info, Tag, fmtDate } from '../hrShared';
import { useRecMeta, vacancyTone, vacancyLabel, priorityTone, range, days } from './recShared';

/*
 * Vacancies (M3 §4, §7). A vacancy is created when the CEO approves its workforce request. HR publishes it:
 * the website, careers portal and internal board go live at once; LinkedIn, Facebook and Bdjobs get
 * ready-to-post text and a share link (no job-board accounts are connected); an email campaign goes to the
 * talent pool. Closing marks every open application Not Selected.
 */

export default function Vacancies() {
  const { code } = useParams();
  return code ? <VacancyDetail code={code} /> : <VacancyList />;
}

function VacancyList() {
  const nav = useNavigate();
  const { meta, error } = useRecMeta();
  const [status, setStatus] = useState('published');
  const list = useGet('/hr/recruitment/vacancies', { status: status || undefined });
  if (!meta) return <div className="hrm"><Loading error={error} /></div>;
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Vacancies</h1><p>Open roles and how far each one has got. Age counts from publishing.</p></div>
        <Link to="/hr/recruitment/requests" className="btn btn-ghost">Workforce requests</Link>
      </div>
      <div className="hrm-tabs" role="group" aria-label="Show">
        {[['published', 'Open'], ['closed,filled', 'Closed'], ['', 'All']].map(([k, l]) => <button key={l} type="button" aria-pressed={status === k} onClick={() => setStatus(k)}>{l}</button>)}
      </div>
      <section className="hrm-card" aria-label="Vacancies">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Vacancy</th><th>Department</th><th>Priority</th><th className="num">Applicants</th><th>Closes</th><th className="num">Age</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((v) => {
                const go = () => nav(`/hr/recruitment/vacancies/${v.vacancy_code}`);
                return (
                  <tr key={v.id} className="click" tabIndex={0} onClick={go} onKeyDown={(e) => { if (e.key === 'Enter') go(); }}>
                    <td><b>{v.title}</b><small>{v.vacancy_code} · {v.positions_count} {v.positions_count === 1 ? 'position' : 'positions'}</small></td>
                    <td>{v.department_name || '—'}</td>
                    <td><Tag tone={priorityTone[v.priority] || 'slate'}>{v.priority}</Tag></td>
                    <td className="num">{v.applications}</td>
                    <td>{fmtDate(v.closing_date)}</td>
                    <td className="num">{v.published_at ? `${days(v.published_at)} days` : '—'}</td>
                    <td className="num"><Tag tone={vacancyTone[v.status]}>{vacancyLabel[v.status] || v.status}</Tag></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">No vacancies here. A vacancy appears when the CEO approves a workforce request.</p>}
      </section>
    </div>
  );
}

function VacancyDetail({ code }) {
  const toast = useToast();
  const { meta } = useRecMeta();
  const v = useGet(`/hr/recruitment/vacancies/${code}`);
  const [channels, setChannels] = useState(null);
  const [results, setResults] = useState(null);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!v.data || !meta) return <div className="hrm"><Loading error={v.error} reload={v.reload} /></div>;
  const x = v.data;
  const chosen = channels || meta.channels.filter((c) => !(x.channels || []).includes(c) && c !== 'Email Campaigns');
  const open = x.status === 'published';

  const publish = async () => {
    setBusy(true);
    try { const r = await api.post(`/hr/recruitment/vacancies/${code}/publish`, { channels: chosen }); setResults(r.data.results); toast.success('Published'); v.reload(); setChannels(null); }
    catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  const close = async () => {
    if (!window.confirm(`Close ${x.vacancy_code}? Every open application will be marked Not Selected.`)) return;
    try { const r = await api.post(`/hr/recruitment/vacancies/${code}/close`, {}); toast.success(r.data.message); v.reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  const saveEdit = async () => {
    try { await api.patch(`/hr/recruitment/vacancies/${code}`, edit); toast.success('Saved'); setEdit(null); v.reload(); }
    catch (e) { toast.error(errText(e)); }
  };
  const copy = (t) => navigator.clipboard?.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy did not work. Select the text instead.'));

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>{x.title} <Tag tone={vacancyTone[x.status]}>{vacancyLabel[x.status] || x.status}</Tag></h1>
          <p>{x.vacancy_code} · {x.department_name} · {x.positions_count} {x.positions_count === 1 ? 'position' : 'positions'}{x.closing_date ? ` · closes ${fmtDate(x.closing_date)}` : ''}</p>
        </div>
        <div className="hrm-actions">
          {meta.canManage && <Link className="btn btn-ghost" to={`/hr/recruitment/pipeline/${x.vacancy_code}`}><Columns3 size={16} /> Pipeline</Link>}
          {open && <a className="btn btn-ghost" href={x.careers_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> Careers page</a>}
          {meta.canManage && open && <Button variant="ghost" onClick={close}>Close vacancy</Button>}
        </div>
      </div>
      <div className="hrm-split wide-left">
        <section className="hrm-card" aria-labelledby="vac-facts">
          <div className="hrm-card-head"><h2 id="vac-facts">Vacancy</h2>{meta.canManage && !edit && open && <button type="button" className="hrm-link" onClick={() => setEdit({ priority: x.priority, closing_date: x.closing_date || '', cost_amount: x.cost_amount || 0, positions_count: x.positions_count })}>Edit</button>}</div>
          {edit ? (
            <div className="hrm-pad">
              <div className="hrm-form">
                <Field label="Priority"><Select value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: e.target.value })}>{meta.priorities.map((p) => <option key={p}>{p}</option>)}</Select></Field>
                <Field label="Closing date"><Input type="date" value={edit.closing_date || ''} onChange={(e) => setEdit({ ...edit, closing_date: e.target.value })} /></Field>
                <Field label="Positions"><Input type="number" min="1" value={edit.positions_count} onChange={(e) => setEdit({ ...edit, positions_count: e.target.value })} /></Field>
                <Field label="Recruitment cost so far (Tk)"><Input type="number" min="0" value={edit.cost_amount} onChange={(e) => setEdit({ ...edit, cost_amount: e.target.value })} /></Field>
              </div>
              <div className="hrm-actions" style={{ marginTop: 12 }}><Button onClick={saveEdit}>Save</Button><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div>
            </div>
          ) : (
            <div className="hrm-facts">
              <Info label="Position">{x.position_title}</Info>
              <Info label="Reports to">{x.reports_to_title}</Info>
              <Info label="Employment type">{x.employment_type}</Info>
              <Info label="Salary range">{range(x.salary_min, x.salary_max)}</Info>
              <Info label="Location">{x.location_name}</Info>
              <Info label="Priority"><Tag tone={priorityTone[x.priority] || 'slate'}>{x.priority}</Tag></Info>
              <Info label="Published">{fmtDate(x.published_at)}</Info>
              <Info label="Applicants">{x.applications}</Info>
              <Info label="Filled">{x.filled_count} of {x.positions_count}</Info>
              {meta.canManage && <Info label="Recruitment cost">{`Tk ${Number(x.cost_amount || 0).toLocaleString('en-IN')}`}</Info>}
              <Info label="Job description">{x.job_description ? x.job_description.title : 'None linked'}</Info>
            </div>
          )}
        </section>
        {meta.canManage && (
          <section className="hrm-card" aria-labelledby="vac-pub">
            <div className="hrm-card-head"><h2 id="vac-pub">Publish to</h2><small>{(x.channels || []).length ? `Live on ${(x.channels || []).length}` : ''}</small></div>
            <div className="hrm-pad" style={{ display: 'grid', gap: 12 }}>
              {!open ? <p className="hrm-note"><Lock size={13} /> Publishing is open while the vacancy is approved and not closed.</p> : <>
                <div className="rec-channels">
                  {meta.channels.map((c) => (
                    <label key={c}><input type="checkbox" checked={chosen.includes(c)} onChange={(e) => setChannels(e.target.checked ? [...chosen, c] : chosen.filter((y) => y !== c))} />{c}{(x.channels || []).includes(c) && <small style={{ color: 'var(--mute)' }}> (done)</small>}</label>
                  ))}
                </div>
                <p className="hrm-note">LinkedIn, Facebook and Bdjobs get text to paste and a share link. An email campaign goes to everyone in the talent pool.</p>
                <div><Button icon={Megaphone} onClick={publish} disabled={busy || !chosen.length}>{busy ? 'Publishing…' : `Publish to ${chosen.length} ${chosen.length === 1 ? 'channel' : 'channels'}`}</Button></div>
              </>}
              {(results || []).map((r) => (
                <div key={r.channel} className="rec-result">
                  <b>{r.channel}: {r.status === 'live' ? 'live' : r.status === 'sent' ? `sent to ${r.sent} of ${r.of}` : 'ready to post'}</b>
                  {r.text && <pre>{r.text}</pre>}
                  <div className="hrm-actions">
                    {r.text && <button type="button" className="hrm-link" onClick={() => copy(r.text)}><Copy size={13} /> Copy text</button>}
                    {r.share_url && <a className="hrm-link" href={r.share_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} /> Open {r.channel}</a>}
                    {r.url && <button type="button" className="hrm-link" onClick={() => copy(r.url)}><Copy size={13} /> Copy link</button>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
