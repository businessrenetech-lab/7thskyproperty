import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Building2, Layers, Users, Plus, Pencil, Power, Clock } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../ui/kit';
import OrgForm from './OrgForm';
import { useHrMe, fetchLevel, errText, Loading, Info, Tag } from './hrShared';

/*
 * Organisation structure (M1 §3–4, §6; design window "Organisation structure"). A tree of divisions,
 * departments and teams on the left; the selected unit's facts and positions on the right. New departments
 * and positions, moves and deactivations go to the HR Manager and the CEO, and wait here as pending rows.
 */

const KIND = { division: 'divisions', department: 'departments', team: 'teams' };

export default function Organisation() {
  const toast = useToast();
  const { can } = useHrMe();
  const [params, setParams] = useSearchParams();
  const [org, setOrg] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [showOff, setShowOff] = useState(false);
  const [open, setOpen] = useState(() => new Set());
  const [form, setForm] = useState(null);       // { level, row?, parent? }

  const load = useCallback(() => {
    setError(null);
    const levels = ['companies', 'divisions', 'departments', 'teams', 'positions'];
    Promise.all([...levels.map(fetchLevel), api.get('/hr/approvals', { params: { scope: 'open', limit: 100 } }).then((r) => r.data.data).catch(() => [])])
      .then(([companies, divisions, departments, teams, positions, pending]) => setOrg({ companies, divisions, departments, teams, positions, pending }))
      .catch((e) => setError(errText(e, 'The organisation could not be loaded.')));
  }, []);
  useEffect(load, [load]);

  const sel = params.get('sel') || '';
  const [selType, selId] = sel.split(':');
  const select = (type, id) => setParams({ sel: `${type}:${id}` }, { replace: true });

  // Open the path to the selection, and pick the first division when nothing is chosen.
  useEffect(() => {
    if (!org) return;
    if (!sel && org.divisions[0]) { select('division', org.divisions[0].id); return; }
    const next = new Set(open);
    if (selType === 'department') { const d = org.departments.find((x) => String(x.id) === selId); if (d) next.add(`division:${d.division_id}`); }
    if (selType === 'team') {
      const t = org.teams.find((x) => String(x.id) === selId);
      const d = t && org.departments.find((x) => x.id === t.department_id);
      if (d) { next.add(`division:${d.division_id}`); next.add(`department:${d.id}`); }
    }
    if (selType === 'division') next.add(sel);
    setOpen(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, sel]);

  const live = (r) => showOff || r.is_active !== false;
  const match = (name) => !q || String(name || '').toLowerCase().includes(q.toLowerCase());

  const tree = useMemo(() => {
    if (!org) return [];
    return org.divisions.filter(live).map((v) => {
      const deps = org.departments.filter((d) => d.division_id === v.id && live(d)).map((d) => ({
        ...d, teams: org.teams.filter((t) => t.department_id === d.id && live(t)).filter((t) => match(t.name) || match(d.name) || match(v.name)),
        seats: org.positions.filter((p) => p.department_id === d.id && p.is_active !== false).reduce((a, p) => a + (p.headcount ?? 1), 0),
      })).filter((d) => match(d.name) || match(v.name) || d.teams.length);
      return { ...v, deps, seats: deps.reduce((a, d) => a + d.seats, 0) };
    }).filter((v) => match(v.name) || v.deps.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, q, showOff]);

  if (!org) return <div className="hrm"><Loading error={error} reload={load} /></div>;

  const company = org.companies[0];
  const toggle = (key) => setOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const rowOf = (type, id) => (org[KIND[type]] || []).find((r) => String(r.id) === String(id));
  const unit = rowOf(selType, selId);
  const nameOf = (rows, id, k = 'name') => (rows.find((r) => r.id === id) || {})[k];

  const Node = ({ type, row, count, children, icon: Icon, hasKids }) => {
    const key = `${type}:${row.id}`;
    const isOpen = open.has(key) || Boolean(q);
    return (
      <li>
        <button type="button" className={`hrm-node ${row.is_active === false ? 'off' : ''}`} aria-current={sel === key} onClick={() => { select(type, row.id); if (hasKids && !open.has(key)) toggle(key); }}>
          <span className="twist" onClick={(e) => { if (hasKids) { e.stopPropagation(); toggle(key); } }} aria-hidden="true">
            {hasKids ? (isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
          </span>
          <Icon size={16} className="ic" aria-hidden="true" />
          <span className="nm"><b>{row.name}</b><small>{row.code}</small>
            {type === 'department' && !row.manager_employee_id && row.is_active !== false && <> <Tag tone="red">No manager</Tag></>}
          </span>
          <span className="ct" title="Seats">{count}</span>
        </button>
        {hasKids && isOpen && <ul>{children}</ul>}
      </li>
    );
  };

  const pendingFor = (type, id) => org.pending.filter((r) => (r.entity_type === type && String(r.entity_id) === String(id))
    || (type === 'department' && r.kind === 'org.position.create' && String(r.payload.department_id) === String(id))
    || (type === 'division' && r.kind === 'org.department.create' && String(r.payload.division_id) === String(id)));

  const deactivate = async () => {
    try {
      const r = await api.post(`/hr/org/${KIND[selType]}/${unit.id}/deactivate`, {});
      toast.success(r.status === 202 ? `Sent for approval: ${r.data.change_request.code}` : 'Deactivated');
      load();
    } catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>Organisation structure</h1>
          <p>Company, divisions, departments and teams. Changes to departments and positions go to the HR Manager and the CEO.</p>
        </div>
        {can('org.edit') && (
          <div className="hrm-actions">
            {!company && <Button icon={Plus} onClick={() => setForm({ level: 'companies' })}>Add company</Button>}
            {company && <Button variant="secondary" icon={Plus} onClick={() => setForm({ level: 'divisions', parent: { company_id: company.id } })}>Division</Button>}
            {company && <Button icon={Plus} onClick={() => setForm({ level: 'departments', parent: { division_id: selType === 'division' ? Number(selId) : unit?.division_id } })}>Department</Button>}
          </div>
        )}
      </div>

      {!company ? (
        <div className="hrm-card"><div className="hrm-empty">Start by adding the company. Divisions, departments and positions sit under it.</div></div>
      ) : (
        <div className="hrm-split">
          <section className="hrm-card" aria-label="Structure">
            <div className="hrm-card-head"><h2>{company.name}</h2><small>{org.divisions.filter((d) => d.is_active !== false).length} divisions</small></div>
            <div className="hrm-search"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a division, department or team" aria-label="Find in structure" /></div>
            {tree.length ? (
              <ul className="hrm-tree">
                {tree.map((v) => (
                  <Node key={v.id} type="division" row={v} count={v.seats} icon={Building2} hasKids={v.deps.length > 0}>
                    {v.deps.map((d) => (
                      <Node key={d.id} type="department" row={d} count={d.seats} icon={Layers} hasKids={d.teams.length > 0}>
                        {d.teams.map((t) => <Node key={t.id} type="team" row={t} count={org.positions.filter((p) => p.team_id === t.id && p.is_active !== false).reduce((a, p) => a + (p.headcount ?? 1), 0)} icon={Users} />)}
                      </Node>
                    ))}
                  </Node>
                ))}
              </ul>
            ) : <div className="hrm-empty">{q ? 'Nothing matches that search.' : 'No divisions yet. Add the first one.'}</div>}
            <div className="hrm-pad"><label className="hrm-note" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={showOff} onChange={(e) => setShowOff(e.target.checked)} /> Show inactive units</label></div>
          </section>

          {unit ? (
            <UnitDetail type={selType} unit={unit} org={org} pending={pendingFor(selType, unit.id)} canEdit={can('org.edit')} nameOf={nameOf}
              onEdit={() => setForm({ level: KIND[selType], row: unit })} onDeactivate={deactivate}
              onAdd={(level, parent) => setForm({ level, parent })} onPick={select} />
          ) : <section className="hrm-card"><div className="hrm-empty">Choose a unit on the left to see its details.</div></section>}
        </div>
      )}

      {form && <OrgForm {...form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />}
    </div>
  );
}

function UnitDetail({ type, unit, org, pending, canEdit, nameOf, onEdit, onDeactivate, onAdd, onPick }) {
  const off = unit.is_active === false;
  const label = { division: 'Division', department: 'Department', team: 'Team' }[type];
  const dep = type === 'department' ? unit : type === 'team' ? org.departments.find((d) => d.id === unit.department_id) : null;
  const positions = org.positions.filter((p) => (type === 'department' ? p.department_id === unit.id : type === 'team' ? p.team_id === unit.id : false));
  const departments = type === 'division' ? org.departments.filter((d) => d.division_id === unit.id) : [];
  const teams = type === 'department' ? org.teams.filter((t) => t.department_id === unit.id) : [];
  const parentLine = type === 'division' ? `Division in ${nameOf(org.companies, unit.company_id) || 'the company'}`
    : type === 'department' ? `Department in ${nameOf(org.divisions, unit.division_id) || '—'}`
      : `Team in ${dep?.name || '—'}`;
  const seats = positions.filter((p) => p.is_active !== false).reduce((a, p) => a + (p.headcount ?? 1), 0);
  const proposed = pending.filter((r) => r.kind === 'org.position.create' || r.kind === 'org.department.create');

  return (
    <section className="hrm-card" aria-label={unit.name}>
      <div className="hrm-card-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: 18 }}>{unit.name} <Tag tone={off ? 'slate' : 'green'}>{off ? 'Inactive' : 'Active'}</Tag></h2>
          <small>{unit.code} · {parentLine}</small>
        </div>
        {canEdit && !off && (
          <div className="hrm-actions">
            <Button variant="secondary" size="sm" icon={Pencil} onClick={onEdit}>Edit details</Button>
            <Button variant="ghost" size="sm" icon={Power} onClick={onDeactivate}>Deactivate</Button>
          </div>
        )}
      </div>

      {pending.map((r) => (
        <div className="hrm-banner" key={r.id}>
          <Clock size={16} aria-hidden="true" style={{ marginTop: 2, color: 'var(--amber)' }} />
          <div className="grow">
            <b>Waiting for approval: {r.label}{r.payload?.title || r.payload?.name ? ` "${r.payload.title || r.payload.name}"` : ''} ({r.code})</b>
            <span>Raised by {r.requested_by_name || 'someone'} · waiting for the {r.waiting_for}</span>
          </div>
          <Link className="hrm-link" to={`/hr/approvals?id=${r.id}`}>View request</Link>
        </div>
      ))}

      <div className="hrm-facts">
        {type === 'division' && <>
          <Info label="Business function">{unit.business_function}</Info>
          <Info label="Website">{unit.website}</Info>
          <Info label="Departments">{departments.filter((d) => d.is_active !== false).length} active</Info>
          <Info label="Division head" tone={unit.head_employee_id ? '' : 'red'}>{unit.head_employee_id ? `Employee #${unit.head_employee_id}` : 'Not assigned'}</Info>
        </>}
        {type === 'department' && <>
          <Info label="Manager" tone={unit.manager_employee_id ? '' : 'red'}>{unit.manager_employee_id ? `Employee #${unit.manager_employee_id}` : 'Not assigned'}</Info>
          <Info label="Teams">{teams.filter((t) => t.is_active !== false).length}</Info>
          <Info label="Positions">{positions.filter((p) => p.is_active !== false).length} active</Info>
          <Info label="Seats">{seats}</Info>
        </>}
        {type === 'team' && <>
          <Info label="Team leader">{unit.leader_employee_id ? `Employee #${unit.leader_employee_id}` : 'Not assigned'}</Info>
          <Info label="Positions">{positions.filter((p) => p.is_active !== false).length} active</Info>
          <Info label="Seats">{seats}</Info>
        </>}
      </div>

      {type === 'division' ? (
        <>
          <div className="hrm-card-head"><h2>Departments</h2>{canEdit && !off && <Button variant="secondary" size="sm" icon={Plus} onClick={() => onAdd('departments', { division_id: unit.id })}>New department</Button>}</div>
          <Rows rows={departments} empty="No departments in this division yet." onPick={(d) => onPick('department', d.id)}
            cols={[['Department', (d) => <><b>{d.name}</b><small>{d.code}</small></>], ['Manager', (d) => (d.manager_employee_id ? `Employee #${d.manager_employee_id}` : <Tag tone="red">No manager</Tag>)], ['Status', (d) => <Tag tone={d.is_active === false ? 'slate' : 'green'}>{d.is_active === false ? 'Inactive' : 'Active'}</Tag>]]} />
          {proposed.map((r) => <p key={r.id} className="hrm-note" style={{ padding: '8px 16px' }}>Proposed: {r.payload.name} · {r.code} · waiting for the {r.waiting_for}</p>)}
        </>
      ) : (
        <>
          <div className="hrm-card-head">
            <h2>Positions</h2>
            {canEdit && !off && (
              <div className="hrm-actions">
                {type === 'department' && <Button variant="ghost" size="sm" icon={Plus} onClick={() => onAdd('teams', { department_id: unit.id })}>New team</Button>}
                <Button variant="secondary" size="sm" icon={Plus} onClick={() => onAdd('positions', { department_id: dep?.id, team_id: type === 'team' ? unit.id : '' })}>New position</Button>
              </div>
            )}
          </div>
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Position</th><th>Code</th><th>Reports to</th><th className="num">Seats</th><th aria-label="Status" /></tr></thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="hrm-link" to={`/hr/positions/${p.id}`}>{p.title}</Link><small>{p.employment_type || '—'}</small></td>
                    <td>{p.code}</td>
                    <td>{p.is_top ? 'Top of the company' : (org.positions.find((x) => x.id === p.reports_to_position_id) || {}).title || <Tag tone="red">No supervisor</Tag>}</td>
                    <td className="num">{p.headcount ?? 1}</td>
                    <td className="num">{p.is_active === false ? <Tag tone="slate">Inactive</Tag> : !String(p.job_description || '').trim() ? <Tag tone="red">No job description</Tag> : <Tag tone="amber">{p.headcount ?? 1} vacant</Tag>}</td>
                  </tr>
                ))}
                {proposed.map((r) => (
                  <tr key={`p${r.id}`}>
                    <td><b>{r.payload.title}</b><small>Proposed</small></td>
                    <td>pending</td>
                    <td>{(org.positions.find((x) => x.id === r.payload.reports_to_position_id) || {}).title || '—'}</td>
                    <td className="num">{r.payload.headcount ?? 1}</td>
                    <td className="num"><Tag tone="slate">Waiting for {r.waiting_for}</Tag></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!positions.length && !proposed.length && <div className="hrm-empty">No positions here yet.</div>}
          </div>
          {type === 'department' && teams.length > 0 && <>
            <div className="hrm-card-head"><h2>Teams</h2></div>
            <Rows rows={teams} onPick={(t) => onPick('team', t.id)} cols={[['Team', (t) => <><b>{t.name}</b><small>{t.code}</small></>], ['Status', (t) => <Tag tone={t.is_active === false ? 'slate' : 'green'}>{t.is_active === false ? 'Inactive' : 'Active'}</Tag>]]} />
          </>}
        </>
      )}
    </section>
  );
}

function Rows({ rows, cols, empty, onPick }) {
  if (!rows.length) return <div className="hrm-empty">{empty}</div>;
  return (
    <div className="hrm-table-wrap">
      <table className="hrm-table">
        <thead><tr>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id} className="click" tabIndex={0} onClick={() => onPick(r)} onKeyDown={(e) => { if (e.key === 'Enter') onPick(r); }}>
            {cols.map(([h, fn]) => <td key={h}>{fn(r)}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
