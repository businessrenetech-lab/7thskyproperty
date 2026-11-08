import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, FileText, Power, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Drawer, Field, Input } from '../../ui/kit';
import OrgForm from './OrgForm';
import { useHrMe, fetchLevel, errText, Loading, Info, Tag, fmtDate } from './hrShared';

/*
 * Company (M1 §4.1 profile, §4.2 divisions, §13 up to 10 trading businesses; design window "Company and
 * divisions"). Cost centres and salary grades are shown only to people who may see costs (M1 §7).
 */

const MAX_COMPANIES = 10;
const money = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('en-IN'));

export default function Company() {
  const toast = useToast();
  const { can } = useHrMe();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(null);
  const [policy, setPolicy] = useState(null);
  const edit = can('org.edit');
  const cost = can('org.view_cost');

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchLevel('companies'), fetchLevel('divisions'), fetchLevel('departments'),
      cost ? fetchLevel('cost-centres') : [], cost ? fetchLevel('salary-grades') : []])
      .then(([companies, divisions, departments, centres, grades]) => setData({ companies, divisions, departments, centres, grades }))
      .catch((e) => setError(errText(e, 'The company could not be loaded.')));
  }, [cost]);
  useEffect(load, [load]);

  if (!data) return <div className="hrm"><Loading error={error} reload={load} /></div>;
  const companies = data.companies.filter((c) => c.is_active !== false);
  const co = companies.find((c) => c.id === current) || companies[0];
  const saved = () => { setForm(null); load(); };

  if (!co) {
    return (
      <div className="hrm">
        <div className="hrm-head"><div><h1>Company</h1><p>Add the legal company first. Divisions, departments and positions sit under it.</p></div>
          {edit && <Button icon={Plus} onClick={() => setForm({ level: 'companies' })}>Add company</Button>}</div>
        {form && <OrgForm {...form} onClose={() => setForm(null)} onSaved={saved} />}
      </div>
    );
  }

  const divisions = data.divisions.filter((d) => d.company_id === co.id);
  const policies = Array.isArray(co.policies) ? co.policies : [];
  const savePolicies = async (next, msg) => {
    try { await api.patch(`/hr/org/companies/${co.id}`, { policies: next }); toast.success(msg); setPolicy(null); load(); }
    catch (e) { toast.error(errText(e)); }
  };
  const deactivate = async (level, row) => {
    try { const r = await api.post(`/hr/org/${level}/${row.id}/deactivate`, {}); toast.success(r.status === 202 ? `Sent for approval: ${r.data.change_request.code}` : 'Deactivated'); load(); }
    catch (e) { toast.error(errText(e)); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div>
          <h1>{co.name}</h1>
          <p>Company {companies.indexOf(co) + 1} of {companies.length} · up to {MAX_COMPANIES} trading businesses</p>
        </div>
        <div className="hrm-actions">
          {companies.length > 1 && (
            <select className="select" value={co.id} onChange={(e) => setCurrent(Number(e.target.value))} aria-label="Company">
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {edit && companies.length < MAX_COMPANIES && <Button variant="secondary" icon={Plus} onClick={() => setForm({ level: 'companies' })}>Add company</Button>}
          {edit && <Button icon={Pencil} onClick={() => setForm({ level: 'companies', row: co })}>Edit profile</Button>}
        </div>
      </div>

      <div className="hrm-split even">
        <section className="hrm-card" aria-label="Company profile">
          <div className="hrm-card-head"><h2>Company profile</h2><small>{co.code}</small></div>
          <div className="hrm-facts">
            <Info label="Legal name">{co.name}</Info>
            <Info label="Trading as">{co.trading_name}</Info>
            <Info label="Registration no.">{co.registration_no}</Info>
            <Info label="TIN">{co.tin}</Info>
            <Info label="BIN">{co.bin}</Info>
            <Info label="Phone">{co.phone}</Info>
            <Info label="Email">{co.email}</Info>
            <Info label="Website">{co.website}</Info>
          </div>
          <div className="hrm-facts" style={{ gridTemplateColumns: '1fr' }}><Info label="Address">{co.address}</Info></div>
        </section>

        <section className="hrm-card" aria-label="Divisions">
          <div className="hrm-card-head"><h2>Divisions</h2>{edit && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setForm({ level: 'divisions', parent: { company_id: co.id } })}>Add division</Button>}</div>
          {divisions.length ? (
            <div className="hrm-table-wrap">
              <table className="hrm-table">
                <thead><tr><th>Division</th><th>Code</th><th>Business function</th><th>Status</th>{edit && <th aria-label="Actions" />}</tr></thead>
                <tbody>{divisions.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.name}</b><small>{d.website || `${data.departments.filter((x) => x.division_id === d.id && x.is_active !== false).length} departments`}</small></td>
                    <td>{d.code}</td>
                    <td>{d.business_function || '—'}</td>
                    <td><Tag tone={d.is_active === false ? 'slate' : 'green'}>{d.is_active === false ? 'Inactive' : 'Active'}</Tag></td>
                    {edit && <td className="num" style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="hrm-link" onClick={() => setForm({ level: 'divisions', row: d })}>Edit</button>
                      {d.is_active !== false && <> · <button type="button" className="hrm-link danger" onClick={() => deactivate('divisions', d)}>Deactivate</button></>}
                    </td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <div className="hrm-empty">No divisions yet.</div>}
          <p className="hrm-note" style={{ padding: '10px 16px 14px' }}>A division cannot be deactivated while it still has active departments.</p>
        </section>
      </div>

      <div className="hrm-split even">
        <section className="hrm-card" aria-label="Company policies">
          <div className="hrm-card-head"><h2>Company policies</h2>{edit && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setPolicy({ title: '', version: 'v1', date: new Date().toISOString().slice(0, 10) })}>Add policy</Button>}</div>
          {policies.length ? (
            <ul className="hrm-alerts" style={{ padding: '0 16px 8px' }}>
              {policies.map((p, i) => (
                <li key={`${p.title}${i}`}>
                  <span className="ic"><FileText size={16} /></span>
                  <span className="t"><b>{p.title}</b><small>{p.version} · {fmtDate(p.date)}</small></span>
                  {edit && <button type="button" className="hrm-link danger" aria-label={`Remove ${p.title}`} onClick={() => savePolicies(policies.filter((_, j) => j !== i), 'Policy removed')}><Trash2 size={15} /></button>}
                </li>
              ))}
            </ul>
          ) : <div className="hrm-empty">No policies yet. Employees will see them in self-service.</div>}
        </section>

        {cost ? (
          <section className="hrm-card" aria-label="Cost centres and salary grades">
            <div className="hrm-card-head"><h2>Cost centres</h2>{edit && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setForm({ level: 'cost-centres', parent: { company_id: co.id } })}>Add</Button>}</div>
            <MiniTable rows={data.centres.filter((c) => c.is_active !== false)} empty="No cost centres yet."
              cols={[['Cost centre', (c) => <><b>{c.code}</b> {c.name}</>], ['Departments', (c) => data.departments.filter((d) => d.cost_centre_id === c.id && d.is_active !== false).length, true]]}
              onEdit={edit ? (c) => setForm({ level: 'cost-centres', row: c }) : null} onOff={edit ? (c) => deactivate('cost-centres', c) : null} />
            <div className="hrm-card-head"><h2>Salary grades</h2>{edit && <Button variant="secondary" size="sm" icon={Plus} onClick={() => setForm({ level: 'salary-grades' })}>Add</Button>}</div>
            <MiniTable rows={data.grades.filter((g) => g.is_active !== false)} empty="No salary grades yet."
              cols={[['Grade', (g) => <b>{g.name}</b>], ['Range (Tk / month)', (g) => `${money(g.min_amount)} – ${money(g.max_amount)}`, true]]}
              onEdit={edit ? (g) => setForm({ level: 'salary-grades', row: g }) : null} onOff={edit ? (g) => deactivate('salary-grades', g) : null} />
            <p className="hrm-note" style={{ padding: '10px 16px 14px' }}>Changing a grade’s range goes to the HR Manager and the CEO.</p>
          </section>
        ) : <section className="hrm-card"><div className="hrm-empty">Cost centres and salary grades are visible to Finance, the HR Manager and the CEO.</div></section>}
      </div>

      {form && <OrgForm {...form} onClose={() => setForm(null)} onSaved={saved} />}
      {policy && (
        <Drawer title="Add policy" onClose={() => setPolicy(null)} width={440}
          footer={<><Button variant="secondary" onClick={() => setPolicy(null)}>Cancel</Button><Button disabled={!policy.title.trim()} onClick={() => savePolicies([...policies, policy], 'Policy added')}>Add policy</Button></>}>
          <Field label="Title" required><Input value={policy.title} onChange={(e) => setPolicy({ ...policy, title: e.target.value })} placeholder="Leave policy" /></Field>
          <Field label="Version"><Input value={policy.version} onChange={(e) => setPolicy({ ...policy, version: e.target.value })} /></Field>
          <Field label="Effective from"><Input type="date" value={policy.date} onChange={(e) => setPolicy({ ...policy, date: e.target.value })} /></Field>
        </Drawer>
      )}
    </div>
  );
}

function MiniTable({ rows, cols, empty, onEdit, onOff }) {
  if (!rows.length) return <div className="hrm-empty">{empty}</div>;
  return (
    <div className="hrm-table-wrap">
      <table className="hrm-table">
        <thead><tr>{cols.map(([h, , num]) => <th key={h} className={num ? 'num' : ''}>{h}</th>)}{onEdit && <th aria-label="Actions" />}</tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            {cols.map(([h, fn, num]) => <td key={h} className={num ? 'num' : ''}>{fn(r)}</td>)}
            {onEdit && <td className="num" style={{ whiteSpace: 'nowrap' }}>
              <button type="button" className="hrm-link" onClick={() => onEdit(r)}>Edit</button> · <button type="button" className="hrm-link danger" onClick={() => onOff(r)} aria-label={`Deactivate ${r.name}`}><Power size={13} /></button>
            </td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
