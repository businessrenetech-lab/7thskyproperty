import React, { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Drawer, Button, Field, Input, Select } from '../../ui/kit';
import { errText, fetchLevel } from './hrShared';
import { FIELDS, FieldInput, toPayload } from './employeeFields';

/*
 * Edit one section of an employee record. The server splits the change (M2 §9): plain fields are written
 * now, governed ones (pay, bank, transfer, position, status, identity) become approval requests. The
 * drawer says which happened, so nobody thinks a salary change took effect when it is waiting.
 */

const TITLES = { basic: 'Basic details', contact: 'Contact and emergency', employment: 'Employment', payroll: 'Payroll and bank' };
const LINKS = ['department_id', 'team_id', 'position_id', 'supervisor_employee_id', 'work_location_branch_id', 'employee_type', 'status'];

export default function EmployeeEdit({ emp, section, meta, onClose, onSaved }) {
  const toast = useToast();
  const fields = FIELDS[section];
  const keys = section === 'employment' ? [...fields.map((f) => f.key), ...LINKS] : fields.map((f) => f.key);
  const [form, setForm] = useState(() => Object.fromEntries(keys.map((k) => [k, emp[k] ?? ''])));
  const [org, setOrg] = useState(null);
  const [people, setPeople] = useState([]);
  const [promotion, setPromotion] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (section !== 'employment') return;
    Promise.all([fetchLevel('departments'), fetchLevel('teams'), fetchLevel('positions'), api.get('/hr/org/branches').then((r) => r.data),
      api.get('/hr/employees', { params: { limit: 200 } }).then((r) => r.data.data)])
      .then(([departments, teams, positions, branches, list]) => { setOrg({ departments, teams, positions, branches }); setPeople(list.filter((p) => p.id !== emp.id)); })
      .catch((e) => toast.error(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const depId = Number(form.department_id) || null;
  const positionsHere = useMemo(() => (org ? org.positions.filter((p) => p.is_active !== false && p.department_id === depId) : []), [org, depId]);
  const top = Boolean(org?.positions.find((p) => p.id === Number(form.position_id))?.is_top);

  const save = async () => {
    setBusy(true);
    try {
      const body = toPayload(fields, form);
      if (section === 'employment') {
        LINKS.forEach((k) => { body[k] = /_id$/.test(k) ? (form[k] === '' || form[k] == null ? null : Number(form[k])) : form[k] || null; });
        if (!body.status) delete body.status;
      }
      const r = await api.patch(`/hr/employees/${emp.employee_code}`, { ...body, promotion, reason: reason || undefined });
      const asked = r.data.change_requests || [];
      if (asked.length) toast.success(`${r.data.written.length ? 'Saved what needs no approval. ' : ''}Sent for approval: ${asked.map((c) => c.code).join(', ')}`);
      else toast.success(r.data.written.length ? 'Saved' : 'Nothing changed');
      onSaved();
    } catch (e) { toast.error(errText(e)); }
    setBusy(false);
  };

  const pick = (k, label, rows, name, opts = {}) => (
    <Field label={label} required={opts.required} full={opts.full}>
      <Select value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">{opts.none || 'Choose…'}</option>
        {rows.map((r) => <option key={r.id ?? r} value={r.id ?? r}>{typeof r === 'string' ? r : r[name]}</option>)}
      </Select>
    </Field>
  );
  const governed = fields.some((f) => f.approval) || section === 'employment';

  return (
    <Drawer title={`Edit ${TITLES[section].toLowerCase()}`} onClose={onClose} width={560}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={busy || (section === 'employment' && !org)}>{busy ? 'Saving…' : 'Save changes'}</Button></>}>
      <div className="hrm">
        {governed && <p className="hrm-note">Fields marked • need approval before they change. Everything else is saved straight away and logged.</p>}
        <div className="hrm-form" style={{ marginTop: 12 }}>
          {section === 'employment' && org && <>
            {pick('department_id', 'Department •', org.departments.filter((d) => d.is_active !== false), 'name', { required: true })}
            {pick('position_id', 'Position •', positionsHere, 'title', { required: true })}
            {pick('team_id', 'Team •', org.teams.filter((t) => t.department_id === depId && t.is_active !== false), 'name', { none: 'No team' })}
            {pick('supervisor_employee_id', 'Supervisor •', people, 'full_name', { none: top ? 'Nobody (top of the company)' : 'Choose…', required: !top })}
            {pick('employee_type', 'Employee type •', (meta?.types || []).filter((t) => t.is_active !== false).map((t) => t.name), null, { required: true })}
            {pick('status', 'Status •', [emp.status, ...(emp.next_statuses || [])], null, { none: emp.status })}
            {pick('work_location_branch_id', 'Work location', org.branches, 'name', { none: 'Same as the department' })}
            <Field label="Promotion" full>
              <label className="hrm-note hrm-check"><input type="checkbox" checked={promotion} onChange={(e) => setPromotion(e.target.checked)} /> This position change is a promotion (goes to the CEO)</label>
            </Field>
          </>}
          {fields.map((f) => (
            <FieldInput key={f.key} f={f.approval ? { ...f, label: `${f.label} •` } : f} value={form[f.key]} onChange={set} meta={meta} />
          ))}
          {governed && <Field label="Reason for the change" full><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="The approvers see this" /></Field>}
        </div>
      </div>
    </Drawer>
  );
}
