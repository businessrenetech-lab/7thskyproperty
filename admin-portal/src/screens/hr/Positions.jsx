import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Copy, Power, Info as InfoIcon } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../ui/kit';
import OrgForm from './OrgForm';
import { useHrMe, fetchLevel, errText, Loading, Info, Tag } from './hrShared';

/*
 * Positions (M1 §4.4; design window "Position and job description"). The list finds a position fast;
 * the detail shows its fields and job description. Title, grade and reporting line changes go to the HR
 * Manager and the CEO. Holders appear once employee records exist (plan Task 9).
 */

export default function Positions() {
  const { id } = useParams();
  const { can } = useHrMe();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchLevel('positions'), fetchLevel('departments'), fetchLevel('teams'), can('org.view_cost') ? fetchLevel('salary-grades') : []])
      .then(([positions, departments, teams, grades]) => setData({ positions, departments, teams, grades }))
      .catch((e) => setError(errText(e, 'Positions could not be loaded.')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can('org.view_cost')]);
  useEffect(load, [load]);

  if (!data) return <div className="hrm"><Loading error={error} reload={load} /></div>;
  const saved = () => { setForm(null); load(); };
  return (
    <>
      {id ? <PositionDetail id={Number(id)} data={data} canEdit={can('org.edit')} onForm={setForm} reload={load} />
        : <PositionList data={data} canEdit={can('org.edit')} onForm={setForm} />}
      {form && <OrgForm {...form} onClose={() => setForm(null)} onSaved={saved} />}
    </>
  );
}

function PositionList({ data, canEdit, onForm }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [dep, setDep] = useState('');
  const [status, setStatus] = useState('active');
  const name = (rows, id, k = 'name') => (rows.find((r) => r.id === id) || {})[k];
  const rows = useMemo(() => data.positions.filter((p) => (status === 'all' || (status === 'active') === (p.is_active !== false))
    && (!dep || String(p.department_id) === dep)
    && (!q || `${p.title} ${p.code}`.toLowerCase().includes(q.toLowerCase()))), [data, q, dep, status]);

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Positions</h1><p>Every role in the company, with its seats, reporting line and job description.</p></div>
        {canEdit && <Button icon={Plus} onClick={() => onForm({ level: 'positions' })}>New position</Button>}
      </div>
      <div className="hrm-filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <label>Search<input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title or code" /></label>
        <label>Department<select value={dep} onChange={(e) => setDep(e.target.value)}><option value="">All departments</option>{data.departments.filter((d) => d.is_active !== false).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All</option></select></label>
      </div>
      <section className="hrm-card" aria-label="Positions">
        {rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Position</th><th>Code</th><th>Department</th><th>Reports to</th><th className="num">Seats</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id} className="click" tabIndex={0} onClick={() => nav(`/hr/positions/${p.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') nav(`/hr/positions/${p.id}`); }}>
                  <td><b>{p.title}</b><small>{p.employment_type || '—'}</small></td>
                  <td>{p.code}</td>
                  <td>{name(data.departments, p.department_id) || '—'}</td>
                  <td>{p.is_top ? 'Top of the company' : name(data.positions, p.reports_to_position_id, 'title') || <Tag tone="red">No supervisor</Tag>}</td>
                  <td className="num">{p.headcount ?? 1}</td>
                  <td className="num">{p.is_active === false ? <Tag tone="slate">Inactive</Tag> : !String(p.job_description || '').trim() ? <Tag tone="red">No job description</Tag> : <Tag tone="green">Active</Tag>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="hrm-empty">{data.positions.length ? 'No positions match.' : 'No positions yet. Add one, or add it from a department in Structure.'}</div>}
      </section>
    </div>
  );
}

function PositionDetail({ id, data, canEdit, onForm, reload }) {
  const toast = useToast();
  const p = data.positions.find((x) => x.id === id);
  const [pending, setPending] = useState([]);
  useEffect(() => {
    api.get('/hr/approvals', { params: { scope: 'open', limit: 100 } })
      .then((r) => setPending(r.data.data.filter((c) => c.entity_type === 'position' && c.entity_id === id))).catch(() => setPending([]));
  }, [id, data]);
  if (!p) return <div className="hrm"><div className="hrm-error">That position does not exist. <Link className="hrm-link" to="/hr/positions">Back to positions</Link></div></div>;

  const dep = data.departments.find((d) => d.id === p.department_id) || {};
  const team = data.teams.find((t) => t.id === p.team_id);
  const boss = data.positions.find((x) => x.id === p.reports_to_position_id);
  const grade = data.grades.find((g) => g.id === p.salary_grade_id);
  const reports = data.positions.filter((x) => x.reports_to_position_id === p.id && x.is_active !== false);
  const skills = Array.isArray(p.skills) ? p.skills : [];
  const authority = typeof p.approval_authority === 'string' ? p.approval_authority : p.approval_authority ? JSON.stringify(p.approval_authority) : '';
  const off = p.is_active === false;

  const deactivate = async () => {
    try { const r = await api.post(`/hr/org/positions/${p.id}/deactivate`, {}); toast.success(`Sent for approval: ${r.data.change_request.code}`); reload(); }
    catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>{p.title}</h1>
          <p>{p.code} · {dep.name || '—'}{team ? ` · ${team.name}` : ''} · {p.headcount ?? 1} {p.headcount === 1 ? 'seat' : 'seats'}</p>
        </div>
        {canEdit && (
          <div className="hrm-actions">
            <Button variant="secondary" icon={Copy} onClick={() => onForm({ level: 'positions', copyOf: p })}>Clone</Button>
            {!off && <Button variant="secondary" icon={Power} onClick={deactivate}>Deactivate</Button>}
            {!off && <Button icon={Pencil} onClick={() => onForm({ level: 'positions', row: p })}>Edit</Button>}
          </div>
        )}
      </div>

      <div className="hrm-split">
        <section className="hrm-card" aria-label="Position">
          <div className="hrm-card-head"><h2>Position</h2><Tag tone={off ? 'slate' : 'green'}>{off ? 'Inactive' : 'Active'}</Tag></div>
          <div className="hrm-facts" style={{ gridTemplateColumns: '1fr' }}>
            <Info label="Position code">{p.code} (automatic)</Info>
            <Info label="Department">{dep.name}</Info>
            <Info label="Reports to" tone={!p.is_top && !boss ? 'red' : ''}>{p.is_top ? 'Top of the company' : boss ? <Link className="hrm-link" to={`/hr/positions/${boss.id}`}>{boss.title} ({boss.code})</Link> : 'No supervisor set'}</Info>
            <Info label="Employment type">{p.employment_type}</Info>
            {grade && <Info label="Salary grade">{grade.name} · Tk {Number(grade.min_amount || 0).toLocaleString('en-IN')} – {Number(grade.max_amount || 0).toLocaleString('en-IN')}</Info>}
            <Info label="Required qualifications">{p.qualifications}</Info>
            <Info label="Required experience">{p.experience}</Info>
            <Info label="Approval authority">{authority || null}</Info>
          </div>
          {skills.length > 0 && <div className="hrm-pad"><span className="hrm-note">Required skills</span><div className="hrm-chips" style={{ marginTop: 6 }}>{skills.map((s) => <span key={s}>{s}</span>)}</div></div>}
          <div className="hrm-banner info"><InfoIcon size={16} aria-hidden="true" style={{ marginTop: 2, color: '#1B4F8F' }} />
            <div className="grow"><b>Changes need approval</b><span>Title, grade or reporting line: HR Manager, then CEO.</span></div></div>
        </section>

        <section className="hrm-card" aria-label="Job description">
          <div className="hrm-card-head"><h2>Job description</h2></div>
          {pending.map((c) => (
            <div className="hrm-banner" key={c.id}>
              <div className="grow"><b>Waiting for approval: {c.label} ({c.code})</b><span>Waiting for the {c.waiting_for}</span></div>
              <Link className="hrm-link" to={`/hr/approvals?id=${c.id}`}>View request</Link>
            </div>
          ))}
          <div className="hrm-pad">
            {String(p.job_description || '').trim() ? <p className="hrm-text">{p.job_description}</p>
              : <div className="hrm-banner" style={{ margin: 0 }}><div className="grow"><b>No job description yet</b><span>HR is alerted until one is written.</span></div></div>}
          </div>
          <div className="hrm-card-head"><h2>Reports to this position</h2><small>{reports.length}</small></div>
          {reports.length ? (
            <div className="hrm-table-wrap"><table className="hrm-table"><tbody>{reports.map((r) => (
              <tr key={r.id}><td><Link className="hrm-link" to={`/hr/positions/${r.id}`}>{r.title}</Link><small>{r.code}</small></td><td className="num">{r.headcount ?? 1} seats</td></tr>
            ))}</tbody></table></div>
          ) : <div className="hrm-empty">No positions report here.</div>}
          <div className="hrm-card-head"><h2>Used by</h2></div>
          <div className="hrm-empty">People in this position appear here once employee records are added.</div>
        </section>
      </div>
    </div>
  );
}
