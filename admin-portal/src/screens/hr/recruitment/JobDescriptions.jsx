import React, { useState } from 'react';
import { Plus, Copy, Pencil } from 'lucide-react';
import api from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { Button, Drawer, Field, Input, Select, Textarea } from '../../../ui/kit';
import { useGet, errText, Loading, Tag } from '../hrShared';
import { useRecMeta } from './recShared';

/*
 * Job description library (M3 §6). HR keeps one description per position and clones it for a similar role.
 * The careers page shows the summary, duties, qualifications and skills; KPIs and career path stay internal
 * except the career path, which candidates see as "Where it leads".
 */

const TEXTS = [
  ['summary', 'Summary', 3], ['duties', 'Duties (one per line)', 4], ['responsibilities', 'Responsibilities (one per line)', 4],
  ['qualifications', 'Qualifications (one per line)', 3], ['experience', 'Experience', 2], ['technical_skills', 'Technical skills', 2],
  ['soft_skills', 'Soft skills', 2], ['kpis', 'Key performance indicators', 3], ['career_path', 'Career path', 2],
];

export default function JobDescriptions() {
  const { meta, error } = useRecMeta();
  const [q, setQ] = useState('');
  const [dep, setDep] = useState('');
  const list = useGet('/hr/recruitment/job-descriptions', { q: q || undefined, department_id: dep || undefined, active: 'all' });
  const [form, setForm] = useState(null);
  const toast = useToast();

  const clone = async (jd) => {
    try { const r = await api.post(`/hr/recruitment/job-descriptions/${jd.id}/clone`, {}); toast.success(`Copied as "${r.data.title}"`); setForm(r.data); list.reload(); }
    catch (e) { toast.error(errText(e)); }
  };

  if (!meta) return <div className="hrm"><Loading error={error} /></div>;
  const rows = list.data?.data || [];
  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Job descriptions</h1><p>One description per role. Vacancies use it, and the careers page shows it to applicants.</p></div>
        {meta.canManage && <Button icon={Plus} onClick={() => setForm({})}>New job description</Button>}
      </div>
      <div className="hrm-filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <label>Search<input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title" /></label>
        <label>Department<select value={dep} onChange={(e) => setDep(e.target.value)}><option value="">All departments</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      </div>
      <section className="hrm-card" aria-label="Job descriptions">
        {!list.data ? <Loading error={list.error} reload={list.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Title</th><th>Position</th><th>Department</th><th>Reports to</th><th aria-label="Status" /><th aria-label="Actions" /></tr></thead>
              <tbody>{rows.map((j) => (
                <tr key={j.id}>
                  <td><b>{j.title}</b><small>{(j.summary || '').slice(0, 90)}</small></td>
                  <td>{j.position_title || '—'}</td>
                  <td>{j.department_name || '—'}</td>
                  <td>{j.reports_to_title || '—'}</td>
                  <td>{j.is_active ? <Tag tone="green">In use</Tag> : <Tag tone="slate">Retired</Tag>}</td>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {meta.canManage && <>
                      <button type="button" className="hrm-link" onClick={() => setForm(j)} aria-label={`Edit ${j.title}`}><Pencil size={14} /> Edit</button>{' '}
                      <button type="button" className="hrm-link" onClick={() => clone(j)} aria-label={`Copy ${j.title}`} style={{ marginLeft: 12 }}><Copy size={14} /> Copy</button>
                    </>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="hrm-empty">No job descriptions yet.{meta.canManage ? ' Write one for each role you hire for.' : ''}</p>}
      </section>
      {form && <JdForm meta={meta} jd={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); list.reload(); }} />}
    </div>
  );
}

function JdForm({ meta, jd, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ is_active: true, ...jd });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const save = async () => {
    setBusy(true); setErr(null);
    const keys = ['title', 'position_id', 'department_id', 'reports_to_position_id', 'working_hours', 'is_active', ...TEXTS.map((t) => t[0])];
    const body = Object.fromEntries(keys.map((k) => [k, f[k] === '' ? null : f[k]]).filter(([, v]) => v !== undefined));
    try {
      if (jd.id) await api.patch(`/hr/recruitment/job-descriptions/${jd.id}`, body); else await api.post('/hr/recruitment/job-descriptions', body);
      toast.success('Job description saved'); onSaved();
    } catch (e) { setErr(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Drawer title={jd.id ? 'Edit job description' : 'New job description'} onClose={onClose} width={620}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></>}>
      <div className="hrm-form">
        <Field label="Title" required full><Input value={f.title || ''} onChange={set('title')} /></Field>
        <Field label="Department"><Select value={f.department_id || ''} onChange={set('department_id')}><option value="">—</option>{meta.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select></Field>
        <Field label="Position"><Select value={f.position_id || ''} onChange={set('position_id')}><option value="">—</option>{meta.positions.filter((p) => !f.department_id || String(p.department_id) === String(f.department_id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
        <Field label="Reports to"><Select value={f.reports_to_position_id || ''} onChange={set('reports_to_position_id')}><option value="">—</option>{meta.positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</Select></Field>
        <Field label="Working hours"><Input value={f.working_hours || ''} onChange={set('working_hours')} placeholder="e.g. Sat–Thu, 9:00–18:00" /></Field>
        {TEXTS.map(([k, label, rows]) => <Field key={k} label={label} full><Textarea rows={rows} value={f[k] || ''} onChange={set(k)} /></Field>)}
        <label className="hrm-check full"><input type="checkbox" checked={Boolean(f.is_active)} onChange={set('is_active')} /> In use</label>
      </div>
      {err && <div className="hrm-error" role="alert" style={{ marginTop: 12 }}>{err}</div>}
    </Drawer>
  );
}
