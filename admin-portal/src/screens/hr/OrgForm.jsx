import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Drawer, Button, Field, Input, Select, Textarea } from '../../ui/kit';
import { errText, fetchLevel, LEVEL, EMPLOYMENT_TYPES, useHrMe } from './hrShared';

/*
 * Create or edit one organisation item (company, division, department, team, position, cost centre or
 * salary grade). The server decides whether the change is written now or sent for approval (M1 §6);
 * this drawer only reports which one happened.
 */

const blank = (level, parent = {}) => ({
  companies: { name: '', trading_name: '', registration_no: '', tin: '', bin: '', phone: '', email: '', website: '', address: '' },
  divisions: { company_id: parent.company_id || '', name: '', business_function: '', website: '' },
  departments: { division_id: parent.division_id || '', name: '', location_branch_id: '', cost_centre_id: '' },
  teams: { department_id: parent.department_id || '', name: '' },
  positions: { department_id: parent.department_id || '', team_id: parent.team_id || '', title: '', reports_to_position_id: '', is_top: false, employment_type: 'Full-time', salary_grade_id: '', headcount: 1, job_description: '', qualifications: '', experience: '', skills: '', approval_authority: '' },
  'cost-centres': { company_id: parent.company_id || '', name: '' },
  'salary-grades': { name: '', min_amount: '', max_amount: '' },
}[level]);

// Values the API expects: empty strings become null, numbers become numbers, skills a list.
const toPayload = (level, f) => {
  const out = {};
  Object.entries(f).forEach(([k, v]) => {
    if (k === 'skills') out[k] = String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === 'is_top') out[k] = Boolean(v);
    else if (/_id$|^headcount$|_amount$/.test(k)) out[k] = v === '' || v == null ? null : Number(v);
    else out[k] = v === '' ? null : v;
  });
  return out;
};
const fromRow = (level, row) => {
  const f = { ...blank(level) };
  Object.keys(f).forEach((k) => {
    const v = row[k];
    if (k === 'skills') f[k] = Array.isArray(v) ? v.join(', ') : (v || '');
    else if (k === 'approval_authority') f[k] = typeof v === 'string' ? v : (v ? JSON.stringify(v) : '');
    else f[k] = v ?? (k === 'is_top' ? false : '');
  });
  return f;
};

export default function OrgForm({ level, row, parent, copyOf, onClose, onSaved }) {
  const toast = useToast();
  const { can } = useHrMe();
  const editing = Boolean(row);
  const [f, setF] = useState(() => {
    if (editing) return fromRow(level, row);
    if (copyOf) return { ...fromRow(level, copyOf), [LEVEL[level].name]: `${copyOf[LEVEL[level].name]} (copy)`, is_top: false };
    return blank(level, parent);
  });
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ companies: [], divisions: [], departments: [], teams: [], positions: [], 'cost-centres': [], 'salary-grades': [], branches: [] });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cost = can('org.view_cost');

  useEffect(() => {
    const need = { divisions: ['companies'], departments: ['divisions', ...(cost ? ['cost-centres'] : [])], teams: ['departments'], positions: ['departments', 'teams', 'positions', ...(cost ? ['salary-grades'] : [])], 'cost-centres': ['companies'] }[level] || [];
    Promise.all(need.map((l) => fetchLevel(l).then((rows) => [l, rows.filter((r) => r.is_active !== false)])))
      .then((pairs) => setOpts((o) => ({ ...o, ...Object.fromEntries(pairs) })))
      .catch(() => {});
    if (level === 'departments') api.get('/hr/org/branches').then((r) => setOpts((o) => ({ ...o, branches: r.data }))).catch(() => {});
  }, [level, cost]);

  const save = async () => {
    setBusy(true);
    try {
      const body = { ...toPayload(level, f), reason: reason || undefined };
      const r = editing ? await api.patch(`/hr/org/${level}/${row.id}`, body) : await api.post(`/hr/org/${level}`, body);
      const sent = r.status === 202 ? (r.data.change_requests || [r.data.change_request]).filter(Boolean) : [];
      if (sent.length) toast.success(`Sent for approval: ${sent.map((c) => c.code).join(', ')}`);
      else toast.success(editing ? 'Saved' : `${LEVEL[level].one} added`);
      onSaved?.(r.data);
    } catch (e) {
      toast.error(errText(e));
    } finally { setBusy(false); }
  };

  const pick = (k, label, rows, nameKey = 'name', { required, none = 'None' } = {}) => (
    <Field label={label} required={required}>
      <Select value={f[k] ?? ''} onChange={set(k)}>
        <option value="">{required ? 'Choose…' : none}</option>
        {rows.map((r) => <option key={r.id} value={r.id}>{r[nameKey]}{r.code ? ` (${r.code})` : ''}</option>)}
      </Select>
    </Field>
  );
  const text = (k, label, opt = {}) => <Field label={label} required={opt.required} full={opt.full}><Input value={f[k] ?? ''} onChange={set(k)} type={opt.type || 'text'} /></Field>;

  const approvalNote = {
    departments: editing ? 'Moving a department to another division, or deactivating it, goes to the HR Manager and the CEO.' : 'A new department goes to the HR Manager and the CEO before it is created.',
    positions: editing ? 'Changing the title, salary grade or reporting line goes to the HR Manager and the CEO.' : 'A new position goes to the HR Manager and the CEO before it is created.',
    'salary-grades': editing ? 'Changing the pay range goes to the HR Manager and the CEO.' : null,
  }[level];
  const teamsHere = opts.teams.filter((t) => String(t.department_id) === String(f.department_id));

  return (
    <Drawer title={`${editing ? 'Edit' : 'New'} ${LEVEL[level].one.toLowerCase()}`} onClose={onClose} width={520}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : `Add ${LEVEL[level].one.toLowerCase()}`}</Button></>}>
      <div className="hrm">
        {approvalNote && <p className="hrm-note">{approvalNote}</p>}
        <div className="hrm-form">
          {level === 'companies' && <>
            {text('name', 'Legal name', { required: true, full: true })}
            {text('trading_name', 'Trading name', { full: true })}
            {text('registration_no', 'Registration no.')}{text('tin', 'TIN')}
            {text('bin', 'BIN')}{text('phone', 'Phone')}
            {text('email', 'Email', { type: 'email' })}{text('website', 'Website')}
            <Field label="Address" full><Textarea rows={2} value={f.address ?? ''} onChange={set('address')} /></Field>
          </>}
          {level === 'divisions' && <>
            {pick('company_id', 'Company', opts.companies, 'name', { required: true })}
            {text('name', 'Division name', { required: true })}
            {text('business_function', 'Business function')}{text('website', 'Website')}
          </>}
          {level === 'departments' && <>
            {pick('division_id', 'Division', opts.divisions, 'name', { required: true })}
            {text('name', 'Department name', { required: true })}
            {pick('location_branch_id', 'Location', opts.branches, 'name', { none: 'Not set' })}
            {cost && pick('cost_centre_id', 'Cost centre', opts['cost-centres'], 'name', { none: 'Not set' })}
          </>}
          {level === 'teams' && <>
            {pick('department_id', 'Department', opts.departments, 'name', { required: true })}
            {text('name', 'Team name', { required: true })}
          </>}
          {level === 'positions' && <>
            {text('title', 'Position title', { required: true, full: true })}
            {pick('department_id', 'Department', opts.departments, 'name', { required: true })}
            {pick('team_id', 'Team', teamsHere, 'name', { none: 'No team' })}
            {pick('reports_to_position_id', 'Reports to', opts.positions.filter((p) => !row || p.id !== row.id), 'title', { none: f.is_top ? 'Top of the company' : 'Not set' })}
            <Field label="Employment type"><Select value={f.employment_type ?? ''} onChange={set('employment_type')}>{EMPLOYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            {cost && pick('salary_grade_id', 'Salary grade', opts['salary-grades'], 'name', { none: 'Not set' })}
            {text('headcount', 'Seats', { type: 'number' })}
            <Field label="Top of the company" full>
              <label className="hrm-note" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={Boolean(f.is_top)} onChange={set('is_top')} /> This position reports to nobody (for example the CEO)
              </label>
            </Field>
            <Field label="Job description" full><Textarea rows={4} value={f.job_description ?? ''} onChange={set('job_description')} /></Field>
            {text('qualifications', 'Required qualifications', { full: true })}
            {text('experience', 'Required experience', { full: true })}
            {text('skills', 'Required skills (comma separated)', { full: true })}
            {text('approval_authority', 'Approval authority', { full: true })}
          </>}
          {level === 'cost-centres' && <>
            {pick('company_id', 'Company', opts.companies, 'name', { none: 'All companies' })}
            {text('name', 'Cost centre name', { required: true })}
          </>}
          {level === 'salary-grades' && <>
            {text('name', 'Grade name', { required: true, full: true })}
            {text('min_amount', 'Minimum (Tk / month)', { type: 'number' })}
            {text('max_amount', 'Maximum (Tk / month)', { type: 'number' })}
          </>}
          {approvalNote && <Field label="Reason for the change" full><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The approvers see this" /></Field>}
        </div>
      </div>
    </Drawer>
  );
}
