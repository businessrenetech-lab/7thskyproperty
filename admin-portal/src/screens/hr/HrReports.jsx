import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../ui/kit';
import { useGet, useHrMe, Loading, errText } from './hrShared';

/*
 * HR reports (design window "Reports"). The nine organisation reports of M1 §8 and the fourteen employee
 * reports of M2 §14 and the ten recruitment reports of M3 §18. Each opens on screen and downloads as CSV.
 */

const ORG = [
  ['structure', 'Organisation structure', 'Every active position by division and department'],
  ['departments', 'Department list', 'Departments, managers and status'],
  ['positions', 'Position list', 'Positions, reporting line and seats'],
  ['reporting-lines', 'Reporting lines', 'Who each position reports to'],
  ['vacancy-by-department', 'Vacancy by department', 'Seats, filled and vacant'],
  ['headcount-by-division', 'Headcount by division', 'People in a seat per division'],
  ['headcount-by-department', 'Headcount by department', 'People in a seat per department'],
  ['position-status', 'Active and inactive positions', 'Every position and its status'],
  ['cost-centres', 'Cost centres', 'Departments and headcount per cost centre', 'org.view_cost'],
];

const PEOPLE = [
  ['employee-master', 'Employee master', 'Everyone on the master with their placement'],
  ['active-employees', 'Active employees', 'People currently on the books'],
  ['inactive-employees', 'Inactive employees', 'Leavers and inactive records'],
  ['probation', 'Probation', 'Who is on probation and when it ends'],
  ['new-joiners', 'New joiners', 'Joined in the last 90 days'],
  ['department-headcount', 'Department headcount', 'Active and probation per department'],
  ['employee-types', 'Employee types', 'People per employee type'],
  ['contract-expiry', 'Contract expiry', 'Contracts ending in 60 days'],
  ['missing-documents', 'Missing documents', 'What each person still owes HR'],
  ['document-expiry', 'Document expiry', 'Expiring in 60 days, or expired'],
  ['salary-grades', 'Salary grades', 'People per salary grade', ['emp.view_payroll', 'org.view_cost']],
  ['transfers', 'Transfers', 'Department moves over time'],
  ['employee-history', 'Employee history', 'Every recorded change'],
  ['emergency-contacts', 'Emergency contacts', 'Who to call for each person'],
];
const RECRUITMENT = [
  ['pipeline', 'Recruitment pipeline', 'Applicants per stage for each vacancy'],
  ['vacancies-by-department', 'Vacancies by department', 'Open, filled and closed'],
  ['time-to-hire', 'Time to hire', 'Days from application to offer accepted'],
  ['cost-per-hire', 'Cost per hire', 'Recruitment cost and hires per vacancy'],
  ['sources', 'Source of candidates', 'Where applicants come from and who gets hired'],
  ['interview-success', 'Interview success rate', 'Interviewed candidates who reached an offer'],
  ['offer-acceptance', 'Offer acceptance rate', 'Offers accepted and declined per vacancy'],
  ['status', 'Recruitment status', 'Every application and where it stands'],
  ['talent-pool', 'Talent pool', 'People kept for future roles'],
  ['vacancy-age', 'Vacancy age', 'Open vacancies by days since publishing'],
];
const GROUPS = [['employees', 'Employees', PEOPLE, 'emp.view_any'], ['org', 'Organisation', ORG], ['recruitment', 'Recruitment', RECRUITMENT, 'rec.manage']];
const BASE = { employees: '/hr/reports/employees', org: '/hr/reports/org', recruitment: '/hr/reports/recruitment' };

export default function HrReports() {
  const { me } = useHrMe();
  if (!me) return <div className="hrm"><Loading /></div>;
  return <Reports />;
}

function Reports() {
  const { can } = useHrMe();
  const [params, setParams] = useSearchParams();
  const allowed = (need) => !need || [].concat(need).some((a) => can(a));
  const groups = GROUPS.filter((g) => allowed(g[3])).map(([key, label, rows]) => [key, label, rows.filter((r) => allowed(r[3]))]);
  const wanted = params.get('r');
  const group = groups.find(([, , rows]) => rows.some((r) => r[0] === wanted)) || groups.find((g) => g[0] === 'org');
  const kind = wanted && group[2].some((r) => r[0] === wanted) ? wanted : group[2][0][0];
  const base = BASE[group[0]];
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const got = useGet(`${base}/${kind}`);
  const { error, reload } = got;
  const data = got.loading ? null : got.data;   // never show the previous report under the new title

  const download = async () => {
    setBusy(true);
    try {
      const r = await api.get(`${base}/${kind}`, { params: { format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(errText(e, 'The file could not be made.')); } finally { setBusy(false); }
  };

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>Reports</h1><p>Employee, organisation and recruitment reports. Open one to see it, or download it as CSV.</p></div>
      </div>
      <div className="hrm-split">
        <section className="hrm-card" aria-label="Report list">
          {groups.length > 1 && (
            <div className="hrm-card-head">
              <div className="hrm-tabs">{groups.map(([key, label, rows]) => <button key={key} type="button" aria-pressed={key === group[0]} onClick={() => setParams({ r: rows[0][0] }, { replace: true })}>{label}<b>{rows.length}</b></button>)}</div>
            </div>
          )}
          {groups.length === 1 && <div className="hrm-card-head"><h2>{group[1]}</h2><small>{group[2].length} reports</small></div>}
          <div className="hrm-inbox">
            {group[2].map(([k, title, sub]) => (
              <button key={k} type="button" className="hrm-req" aria-current={k === kind} onClick={() => setParams({ r: k }, { replace: true })}>
                <div className="top"><b>{title}</b></div><p>{sub}</p>
              </button>
            ))}
          </div>
        </section>
        <section className="hrm-card" aria-label="Report">
          <div className="hrm-card-head">
            <h2>{data?.title || group[2].find((r) => r[0] === kind)?.[1]}</h2>
            <Button variant="secondary" size="sm" icon={Download} disabled={busy || !data} onClick={download}>Download CSV</Button>
          </div>
          {!data ? <div className="hrm-pad"><Loading error={error} reload={reload} /></div> : data.rows.length ? (
            <div className="hrm-table-wrap">
              <table className="hrm-table">
                <thead><tr>{data.columns.map((c) => <th key={c.key} className={typeof data.rows[0][c.key] === 'number' ? 'num' : ''}>{c.label}</th>)}</tr></thead>
                <tbody>{data.rows.map((r, i) => <tr key={i}>{data.columns.map((c) => <td key={c.key} className={typeof r[c.key] === 'number' ? 'num' : ''}>{r[c.key] === '' ? '—' : r[c.key]}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : <div className="hrm-empty">Nothing to report yet.</div>}
        </section>
      </div>
    </div>
  );
}
