import React from 'react';
import { Field, Input, Select, Textarea } from '../../ui/kit';
import { fmtDate } from './hrShared';

/*
 * The Employee Master fields (M2 §3), grouped as the profile tabs show them. One list feeds the profile,
 * the edit drawer and the new-employee wizard, so a label only changes here. Links to the organisation
 * (department, position, supervisor…) are picked in EmployeeEdit / EmployeeNew, not here.
 */

const t = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });

export const FIELDS = {
  basic: [
    t('full_name', 'Full name', { required: true, full: true, approval: true }), t('preferred_name', 'Preferred name'),
    t('gender', 'Gender', { type: 'select', options: 'genders' }), t('date_of_birth', 'Date of birth', { type: 'date', approval: true }),
    t('blood_group', 'Blood group', { type: 'select', options: 'bloodGroups' }), t('marital_status', 'Marital status', { type: 'select', options: 'maritalStatuses' }),
    t('nationality', 'Nationality'), t('religion', 'Religion', { sensitive: true, approval: true }),
    t('national_id', 'National ID', { sensitive: true, approval: true }), t('passport_no', 'Passport no.', { sensitive: true, approval: true }),
    t('tin', 'TIN', { sensitive: true, approval: true }),
    t('personal_mobile', 'Personal mobile', { type: 'tel' }), t('personal_email', 'Personal email', { type: 'email' }), t('work_email', 'Work email', { type: 'email' }),
    t('family_details', 'Family details', { type: 'textarea', full: true, sensitive: true, approval: true }),
    t('medical_notes', 'Medical notes', { type: 'textarea', full: true, sensitive: true, approval: true }),
  ],
  contact: [
    t('present_address', 'Present address', { type: 'textarea', full: true }), t('permanent_address', 'Permanent address', { type: 'textarea', full: true }),
    t('city', 'City'), t('district', 'District'), t('postal_code', 'Postal code'), t('country', 'Country'),
    t('emergency_contact_name', 'Emergency contact'), t('emergency_contact_relationship', 'Relationship'),
    t('emergency_contact_phone', 'Emergency phone', { type: 'tel' }), t('emergency_contact_address', 'Emergency contact address', { full: true }),
  ],
  employment: [
    t('joining_date', 'Joining date', { type: 'date', required: true }), t('probation_end_date', 'Probation ends', { type: 'date' }),
    t('confirmation_date', 'Confirmed on', { type: 'date' }), t('contract_end_date', 'Contract ends', { type: 'date' }),
    t('notice_period_days', 'Notice period (days)', { type: 'number' }), t('work_schedule', 'Work schedule'),
  ],
  payroll: [
    t('basic_salary', 'Basic salary (Tk / month)', { type: 'number', approval: true }),
    t('bank_name', 'Bank', { approval: true }), t('bank_branch', 'Bank branch', { approval: true }),
    t('bank_account_no', 'Account no.', { approval: true }), t('mobile_banking_no', 'Mobile banking no.', { approval: true }),
    t('tax_status', 'Tax status', { approval: true }), t('loan_balance', 'Loan balance (Tk)', { type: 'number', approval: true }),
    t('commission_eligible', 'Commission', { type: 'bool', approval: true }), t('bonus_eligible', 'Bonus', { type: 'bool', approval: true }),
    t('overtime_eligible', 'Overtime', { type: 'bool', approval: true }), t('provident_fund_eligible', 'Provident fund', { type: 'bool', approval: true }),
  ],
};

export const STATUS_TONE = {
  Applicant: 'slate', 'Offer Accepted': 'blue', Onboarding: 'blue', Probation: 'amber', Active: 'green', Confirmed: 'green',
  Suspended: 'red', Resigned: 'slate', Terminated: 'red', Retired: 'slate', Deceased: 'slate', Inactive: 'slate',
};

export const ONBOARDING_LABEL = {
  employee_id: 'Employee ID created', notify_manager: 'Manager told', notify_finance: 'Finance told (payroll setup)', notify_it: 'IT told (email and CRM login)',
  collect_documents: 'Documents collected', policy_ack: 'Policies acknowledged', probation_reminder: 'Probation review',
};

export const money = (v) => (v == null || v === '' ? null : `Tk ${Number(v).toLocaleString('en-IN')}`);

/** A stored value as people read it. */
export const show = (f, v) => {
  if (v == null || v === '') return null;
  if (f.type === 'bool') return v === true || v === 1 || v === '1' ? 'Yes' : 'No';
  if (f.type === 'date') return fmtDate(v);
  if (f.key === 'basic_salary' || f.key === 'loan_balance') return money(v);
  return String(v);
};

/** Values the API expects: '' becomes null, numbers become numbers, ticks become booleans. */
export const toPayload = (fields, form) => Object.fromEntries(fields.filter((f) => f.key in form).map((f) => {
  const v = form[f.key];
  if (f.type === 'bool') return [f.key, Boolean(v)];
  if (f.type === 'number') return [f.key, v === '' || v == null ? null : Number(v)];
  return [f.key, v === '' ? null : v];
}));

export function FieldInput({ f, value, onChange, meta }) {
  const set = (e) => onChange(f.key, f.type === 'bool' ? e.target.checked : e.target.value);
  let control;
  if (f.type === 'select') {
    control = <Select value={value ?? ''} onChange={set}><option value="">Not set</option>{(meta?.[f.options] || []).map((o) => <option key={o}>{o}</option>)}</Select>;
  } else if (f.type === 'textarea') {
    control = <Textarea rows={2} value={value ?? ''} onChange={set} />;
  } else if (f.type === 'bool') {
    control = <label className="hrm-note hrm-check"><input type="checkbox" checked={Boolean(Number(value) || value === true)} onChange={set} /> Eligible</label>;
  } else {
    control = <Input type={f.type} value={f.type === 'date' && value ? String(value).slice(0, 10) : value ?? ''} onChange={set} />;
  }
  return <Field label={f.label} required={f.required} full={f.full}>{control}</Field>;
}
