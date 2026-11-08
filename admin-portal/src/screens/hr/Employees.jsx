import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, SlidersHorizontal } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../ui/kit';
import { useGet, useHrMe, fetchLevel, Loading, Tag, fmtDate } from './hrShared';
import { STATUS_TONE } from './employeeFields';

/*
 * Employees (M2 §7). Search with the spec's filters; the server only returns the people this viewer may
 * see (everyone for HR, Finance and IT; the team for managers). Opening a row goes to the profile.
 */

const BASIC = ['q', 'department_id', 'status', 'employee_type'];
const MORE = [
  ['position_id', 'Position'], ['supervisor_employee_id', 'Supervisor'], ['location', 'Location'], ['skill', 'Skill'], ['licence', 'Licence or certificate'],
  ['joined_from', 'Joined from'], ['joined_to', 'Joined to'], ['contract_before', 'Contract ends before'], ['document_before', 'A document expires before'],
];

export default function Employees() {
  const nav = useNavigate();
  const { can } = useHrMe();
  const [filters, setFilters] = useState({ status: '' });
  const [q, setQ] = useState('');
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [org, setOrg] = useState({ departments: [], positions: [], branches: [] });
  const meta = useGet('/hr/employees/meta');
  const people = useGet('/hr/employees', { limit: 200 });   // supervisors for the filter

  useEffect(() => {
    Promise.all([fetchLevel('departments'), fetchLevel('positions'), api.get('/hr/org/branches').then((r) => r.data.data || r.data)])
      .then(([departments, positions, branches]) => setOrg({ departments, positions, branches })).catch(() => {});
  }, []);
  useEffect(() => { const id = setTimeout(() => setFilters((f) => ({ ...f, q })), 300); return () => clearTimeout(id); }, [q]);
  useEffect(() => setPage(1), [filters]);

  const params = useMemo(() => Object.fromEntries(Object.entries({ ...filters, page, limit: 25 }).filter(([, v]) => v !== '' && v != null)), [filters, page]);
  const list = useGet('/hr/employees', params);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const moreCount = MORE.filter(([k]) => filters[k]).length;
  const rows = list.data?.data || [];
  const total = list.data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / 25));

  const pickFor = (k) => {
    if (k === 'position_id') return org.positions.filter((p) => p.is_active !== false).map((p) => [p.id, p.title]);
    if (k === 'supervisor_employee_id') return (people.data?.data || []).map((e) => [e.id, e.full_name]);
    if (k === 'location') return org.branches.map((b) => [b.id, b.name]);
    return null;
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Employees</h1><p>Everyone on the Employee Master, the single record attendance, leave and payroll read from.</p></div>
        {can('emp.edit') && <Button icon={Plus} onClick={() => nav('/hr/employees/new')}>New employee</Button>}
      </div>

      <div className="hrm-filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
        <label>Search<input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or employee ID" /></label>
        <label>Department<select value={filters.department_id || ''} onChange={set('department_id')}><option value="">All departments</option>{org.departments.filter((d) => d.is_active !== false).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Status<select value={filters.status || ''} onChange={set('status')}><option value="">Any status</option>{(meta.data?.statuses || []).map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Employee type<select value={filters.employee_type || ''} onChange={set('employee_type')}><option value="">All types</option>{(meta.data?.types || []).map((t) => <option key={t.id}>{t.name}</option>)}</select></label>
      </div>
      <div className="hrm-actions" style={{ marginTop: -4 }}>
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} aria-expanded={more} onClick={() => setMore((m) => !m)}>More filters{moreCount ? ` (${moreCount})` : ''}</Button>
        {(moreCount > 0 || BASIC.some((k) => filters[k])) && <button type="button" className="hrm-link" onClick={() => { setQ(''); setFilters({ status: '' }); }}>Clear filters</button>}
      </div>
      {more && (
        <div className="hrm-filters" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
          {MORE.map(([k, label]) => {
            const opts = pickFor(k);
            if (opts) return <label key={k}>{label}<select value={filters[k] || ''} onChange={set(k)}><option value="">Any</option>{opts.map(([v, n]) => <option key={v} value={v}>{n}</option>)}</select></label>;
            const date = /_from$|_to$|_before$/.test(k);
            return <label key={k}>{label}<input className="input" type={date ? 'date' : 'text'} value={filters[k] || ''} onChange={set(k)} /></label>;
          })}
        </div>
      )}

      <section className="hrm-card" aria-label="Employees">
        <div className="hrm-card-head"><h2>{total} {total === 1 ? 'person' : 'people'}</h2></div>
        {list.error ? <Loading error={list.error} reload={list.reload} /> : !list.data ? <Loading /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Name</th><th>Position</th><th>Department</th><th>Supervisor</th><th>Joined</th><th aria-label="Status" /></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id} className="click" tabIndex={0} onClick={() => nav(`/hr/employees/${e.employee_code}`)} onKeyDown={(ev) => { if (ev.key === 'Enter') nav(`/hr/employees/${e.employee_code}`); }}>
                  <td><b>{e.full_name}</b><small>{e.employee_code}{e.preferred_name ? ` · ${e.preferred_name}` : ''}</small></td>
                  <td>{e.position_title || '—'}<small>{e.employee_type}</small></td>
                  <td>{e.department_name || '—'}</td>
                  <td>{e.supervisor_name || '—'}</td>
                  <td>{fmtDate(e.joining_date)}</td>
                  <td className="num"><Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="hrm-empty">{Object.values(params).length > 2 ? 'Nobody matches these filters.' : 'No employees yet. Add the first one with New employee.'}</div>}
        {pages > 1 && (
          <div className="hrm-pager">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <span>Page {page} of {pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </section>
    </div>
  );
}
