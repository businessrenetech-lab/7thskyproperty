import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button, Field, Input, Select } from '../../ui/kit';
import { useGet, useHrMe, fetchLevel, errText, Loading, Info } from './hrShared';
import { FIELDS, FieldInput, toPayload, money } from './employeeFields';

/*
 * New employee (M2 §4, M1 §10; design window "New employee"). Four steps. Placement cannot be passed
 * until company, division, department, position and supervisor are all known (the top seat needs no
 * supervisor). Saving sends the record to the HR Manager; the employee ID and login are made on approval.
 */

const STEPS = ['Person', 'Placement', 'Pay', 'Login and review'];
const PERSON = ['full_name', 'preferred_name', 'gender', 'date_of_birth', 'national_id', 'personal_mobile', 'personal_email', 'work_email', 'present_address'];
const ALL = [...FIELDS.basic, ...FIELDS.contact, ...FIELDS.employment, ...FIELDS.payroll];

export default function EmployeeNew() {
  const nav = useNavigate();
  const toast = useToast();
  const { can } = useHrMe();
  const meta = useGet('/hr/employees/meta');
  const [step, setStep] = useState(0);
  const [org, setOrg] = useState(null);
  const [people, setPeople] = useState([]);
  const [f, setF] = useState({ employee_type: 'Full-time employee', status: 'Onboarding', login_role: 'employee' });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const pay = can('emp.view_payroll');

  useEffect(() => {
    Promise.all([fetchLevel('divisions'), fetchLevel('departments'), fetchLevel('teams'), fetchLevel('positions'),
      api.get('/hr/employees', { params: { limit: 200, status: 'Onboarding,Probation,Active,Confirmed,Suspended' } }).then((r) => r.data.data)])
      .then(([divisions, departments, teams, positions, list]) => { setOrg({ divisions, departments, teams, positions }); setPeople(list); })
      .catch((e) => toast.error(errText(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dep = org?.departments.find((d) => d.id === Number(f.department_id));
  const div = dep && org.divisions.find((d) => d.id === dep.division_id);
  const pos = org?.positions.find((p) => p.id === Number(f.position_id));
  const top = Boolean(pos?.is_top);
  // Suggest the person holding the position this one reports to.
  const suggested = useMemo(() => (pos?.reports_to_position_id ? people.find((p) => p.position_id === pos.reports_to_position_id) : null), [pos, people]);
  useEffect(() => { if (suggested && !f.supervisor_employee_id) set('supervisor_employee_id', String(suggested.id)); }, [suggested]);   // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [
    !f.full_name && 'full name', !f.employee_type && 'employee type', !f.joining_date && 'joining date',
    !dep && 'department', dep && !div && 'division', !pos && 'position', !top && !f.supervisor_employee_id && 'supervisor',
  ].filter(Boolean);
  const blockedAt = (s) => (s === 0 && !f.full_name ? 'Add the full name.' : s === 1 && missing.length ? `Still needed: ${missing.join(', ')}.` : null);

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...toPayload(ALL, f),
        department_id: Number(f.department_id), position_id: Number(f.position_id), team_id: f.team_id ? Number(f.team_id) : null,
        supervisor_employee_id: top && !f.supervisor_employee_id ? null : Number(f.supervisor_employee_id),
        employee_type: f.employee_type, status: f.status, login_email: f.login_email || undefined, login_role: f.login_role,
      };
      if (!pay) FIELDS.payroll.forEach((x) => delete body[x.key]);
      const r = await api.post('/hr/employees', body);
      toast.success(`${r.data.message}: ${r.data.change_request.code}`);
      nav('/hr/approvals');
    } catch (e) { toast.error(errText(e)); }
    setBusy(false);
  };

  if (!org || !meta.data) return <div className="hrm"><Loading error={meta.error} reload={meta.reload} /></div>;
  const pick = (k, label, rows, name, opts = {}) => (
    <Field label={label} required={opts.required} full={opts.full}>
      <Select value={f[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
        <option value="">{opts.none || 'Choose…'}</option>
        {rows.map((r) => <option key={r.id ?? r} value={r.id ?? r}>{typeof r === 'string' ? r : r[name]}</option>)}
      </Select>
    </Field>
  );
  const fieldsOf = (keys) => keys.map((k) => ALL.find((x) => x.key === k));
  const block = blockedAt(step);

  return (
    <div className="hrm">
      <div className="hrm-head"><div><h1>New employee</h1><p>The HR Manager approves the record; the employee ID and login are created then.</p></div></div>
      <ol className="hrm-wizard" aria-label="Steps">
        {STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined} className={i < step ? 'done' : ''}><span>{i < step ? <Check size={12} aria-hidden="true" /> : i + 1}</span>{s}</li>)}
      </ol>

      <section className="hrm-card" style={{ padding: 18 }} aria-label={STEPS[step]}>
        <div className="hrm-form">
          {step === 0 && fieldsOf(PERSON).map((x) => <FieldInput key={x.key} f={x} value={f[x.key]} onChange={set} meta={meta.data} />)}
          {step === 1 && <>
            {pick('department_id', 'Department', org.departments.filter((d) => d.is_active !== false), 'name', { required: true })}
            {pick('position_id', 'Position', org.positions.filter((p) => p.is_active !== false && p.department_id === Number(f.department_id)), 'title', { required: true, none: dep ? 'Choose…' : 'Choose a department first' })}
            {pick('team_id', 'Team', org.teams.filter((t) => t.is_active !== false && t.department_id === Number(f.department_id)), 'name', { none: 'No team' })}
            {pick('supervisor_employee_id', 'Supervisor', people, 'full_name', { required: !top, none: top ? 'Nobody (top of the company)' : 'Choose…' })}
            {pick('employee_type', 'Employee type', meta.data.types.filter((t) => t.is_active !== false).map((t) => t.name), null, { required: true })}
            {pick('status', 'Starts as', ['Offer Accepted', 'Onboarding', 'Probation', 'Active'], null, { required: true })}
            {fieldsOf(['joining_date', 'probation_end_date', 'contract_end_date', 'notice_period_days']).map((x) => <FieldInput key={x.key} f={x} value={f[x.key]} onChange={set} meta={meta.data} />)}
            <div className="full hrm-facts" style={{ padding: 0, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Info label="Division (from the department)">{div?.name}</Info>
              <Info label="Supervisor suggestion">{suggested ? `${suggested.full_name}, who holds the position above` : top ? 'Top of the company: none needed' : null}</Info>
            </div>
          </>}
          {step === 2 && (pay
            ? FIELDS.payroll.map((x) => <FieldInput key={x.key} f={x} value={f[x.key]} onChange={set} meta={meta.data} />)
            : <p className="hrm-note full">Finance sets up pay after the employee is approved; they are told automatically.</p>)}
          {step === 3 && <>
            <Field label="Login email" full><Input type="email" value={f.login_email ?? ''} onChange={(e) => set('login_email', e.target.value)} placeholder={f.work_email || f.personal_email || 'name@seventhskyproperty.com'} /></Field>
            {pick('login_role', 'Access', meta.data.loginRoles.map((r) => r.key), null, { required: true })}
            <p className="hrm-note full">Every employee gets a login. They receive an email to set their password once the record is approved. Leave the email blank to use the work email.</p>
            <div className="full hrm-facts" style={{ padding: 0, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <Info label="Name">{f.full_name}</Info>
              <Info label="Position">{pos?.title}</Info>
              <Info label="Department">{dep ? `${dep.name} · ${div?.name || ''}` : null}</Info>
              <Info label="Supervisor">{people.find((p) => p.id === Number(f.supervisor_employee_id))?.full_name || (top ? 'None (top)' : null)}</Info>
              <Info label="Type and start">{`${f.employee_type} · ${f.status}`}</Info>
              <Info label="Joining">{f.joining_date}</Info>
              {pay && <Info label="Basic salary">{money(f.basic_salary)}</Info>}
            </div>
          </>}
        </div>
      </section>

      {block && <div className="hrm-banner" role="status"><div className="grow"><b>Cannot go on yet</b><span>{block}</span></div></div>}
      <div className="hrm-actions" style={{ justifyContent: 'space-between' }}>
        <Button variant="secondary" onClick={() => (step ? setStep(step - 1) : nav('/hr/employees'))}>{step ? 'Back' : 'Cancel'}</Button>
        {step < STEPS.length - 1
          ? <Button disabled={Boolean(block)} onClick={() => setStep(step + 1)}>Next</Button>
          : <Button disabled={busy || missing.length > 0} onClick={save}>{busy ? 'Sending…' : 'Send for approval'}</Button>}
      </div>
    </div>
  );
}
