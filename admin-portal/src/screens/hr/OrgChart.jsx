import React, { useEffect, useMemo, useState } from 'react';
import { Printer, Minus, Plus, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../ui/kit';
import { useGet, Loading } from './hrShared';

/*
 * Organisation chart (M1 §5; design window "Org chart"): the six filters, units as cards, vacant seats
 * dashed. Cards open one level at a time so a 1,000-position company stays readable. People appear on the
 * cards once employee records exist (plan Task 9).
 */

const STATUSES = ['Onboarding', 'Active', 'Probation', 'Confirmed', 'Suspended'];
const TYPE_LABEL = { company: 'Company', division: 'Division', department: 'Department', team: 'Team', position: 'Position' };

export default function OrgChart() {
  const [f, setF] = useState({ divisionId: '', departmentId: '', branchId: '', positionId: '', managerId: '', employmentStatus: '' });
  const [open, setOpen] = useState(() => new Set());
  const [zoom, setZoom] = useState(1);
  const params = useMemo(() => Object.fromEntries(Object.entries(f).filter(([, v]) => v)), [f]);
  const { data: tree, error, reload } = useGet('/hr/org/tree', params);
  const [lists, setLists] = useState({ divisions: [], departments: [], positions: [], branches: [] });

  useEffect(() => {
    Promise.all(['divisions', 'departments', 'positions'].map((l) => api.get(`/hr/org/${l}`, { params: { all: 1, active: 'true' } }).then((r) => r.data.data).catch(() => [])))
      .then(([divisions, departments, positions]) => setLists((x) => ({ ...x, divisions, departments, positions })));
    api.get('/hr/org/branches').then((r) => setLists((x) => ({ ...x, branches: r.data }))).catch(() => {});
  }, []);

  // A filter opens the whole matching tree; otherwise the chart starts at departments.
  const filtered = Object.keys(params).length > 0;
  const set = (k) => (e) => { setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'divisionId' ? { departmentId: '', positionId: '' } : {}) })); };
  const toggle = (key) => setOpen((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const isOpen = (node, depth) => filtered || depth < 2 || open.has(`${node.type}:${node.id}`);

  const deps = lists.departments.filter((d) => !f.divisionId || String(d.division_id) === f.divisionId);
  const poss = lists.positions.filter((p) => !f.departmentId || String(p.department_id) === f.departmentId);
  const managers = [];   // department managers and division heads join with employee records (Task 9)

  const Card = ({ node, depth }) => {
    const kids = node.children || [];
    const vacant = node.type === 'position' && node.headcount === 0;
    const expandable = kids.length > 0;
    const shut = expandable && !isOpen(node, depth);
    return (
      <li>
        <button type="button" className={`hrm-box ${depth === 0 ? 'top' : ''} ${vacant ? 'vacant' : ''}`}
          onClick={() => expandable && toggle(`${node.type}:${node.id}`)} aria-expanded={expandable ? !shut : undefined}>
          {(node.type !== 'position' && node.type !== 'company') && <span className="n" title="People in a seat">{node.headcount}</span>}
          {vacant && <UserPlus size={15} style={{ color: '#94A3B8', float: 'right' }} aria-hidden="true" />}
          <b>{vacant ? 'Vacant' : node.name}</b>
          <span>{node.type === 'position' ? `${node.title}${node.vacancies > 1 ? ` · ${node.vacancies} seats` : ''}` : TYPE_LABEL[node.type]}</span>
          <small>{node.code}{shut ? ` · ${kids.length} below` : ''}</small>
        </button>
        {expandable && !shut && <ul>{kids.map((k) => <Card key={`${k.type}${k.id}`} node={k} depth={depth + 1} />)}</ul>}
      </li>
    );
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>Organisation chart</h1>
          <p>{tree ? `${tree.name} · ${tree.headcount} people, ${tree.vacancies} vacant seats` : 'Loading…'}</p>
        </div>
        <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print or save as PDF</Button>
      </div>

      <div className="hrm-filters">
        <label>Division<select value={f.divisionId} onChange={set('divisionId')}><option value="">All divisions</option>{lists.divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Department<select value={f.departmentId} onChange={set('departmentId')}><option value="">All departments</option>{deps.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Branch<select value={f.branchId} onChange={set('branchId')}><option value="">All branches</option>{lists.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Position<select value={f.positionId} onChange={set('positionId')}><option value="">Any position</option>{poss.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label>Manager<select value={f.managerId} onChange={set('managerId')} disabled={!managers.length} title={managers.length ? undefined : 'Managers appear once employee records exist'}><option value="">Any manager</option></select></label>
        <label>Status<select value={f.employmentStatus} onChange={set('employmentStatus')}><option value="">Any status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>

      <section className="hrm-card" aria-label="Organisation chart">
        {!tree ? <div className="hrm-pad" style={{ paddingTop: 16 }}><Loading error={error} reload={reload} /></div> : (
          tree.children.length ? (
            <div className="hrm-chart"><ul style={{ zoom }}><Card node={tree} depth={0} /></ul></div>
          ) : <div className="hrm-empty">{filtered ? 'Nothing matches these filters.' : 'No divisions yet. Build the structure first.'}</div>
        )}
        <div className="hrm-chart-foot">
          <span>{filtered ? 'Showing everything that matches the filters.' : 'Showing divisions and departments. Click a card to open the level below.'}</span>
          <span className="hrm-actions" style={{ alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))} aria-label="Zoom out"><Minus size={14} /></button>
            <span style={{ minWidth: 44, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))} aria-label="Zoom in"><Plus size={14} /></button>
          </span>
        </div>
      </section>
    </div>
  );
}
