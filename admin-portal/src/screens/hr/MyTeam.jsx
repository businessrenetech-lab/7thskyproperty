import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGet, useHrMe, Loading, Tag, fmtDate } from './hrShared';
import { STATUS_TONE } from './employeeFields';

/*
 * My team (M2 §13; design window 18). A manager's people at a glance: attendance this month, leave left,
 * probation and contract dates, and changes waiting for approval. Training and reviews arrive with their
 * modules; until then the columns say so instead of showing an empty number.
 */

const soon = (d, days) => d && (new Date(d) - Date.now()) / 86400000 <= days;

export default function MyTeam() {
  const nav = useNavigate();
  const { can } = useHrMe();
  const [all, setAll] = useState(false);
  const team = useGet('/hr/employees/team', all ? { scope: 'all' } : {});
  const rows = team.data?.data || [];

  return (
    <div className="hrm">
      <div className="hrm-head">
        <div><h1>My team</h1><p>The people who report to you, directly or through someone, and the units you run.</p></div>
        {can('emp.view_any') && (
          <div className="hrm-tabs">
            <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>My team</button>
            <button type="button" aria-pressed={all} onClick={() => setAll(true)}>Everyone</button>
          </div>
        )}
      </div>
      <section className="hrm-card" aria-label="Team">
        <div className="hrm-card-head"><h2>{rows.length} {rows.length === 1 ? 'person' : 'people'}</h2><small>Attendance is this month</small></div>
        {!team.data ? <Loading error={team.error} reload={team.reload} /> : rows.length ? (
          <div className="hrm-table-wrap">
            <table className="hrm-table">
              <thead><tr><th>Name</th><th>Position</th><th className="num">Attendance</th><th className="num">Leave left</th><th>Probation ends</th><th>Contract ends</th><th>Training</th><th>Next review</th><th className="num">Waiting</th></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id} className="click" tabIndex={0} onClick={() => nav(`/hr/employees/${e.employee_code}`)} onKeyDown={(ev) => { if (ev.key === 'Enter') nav(`/hr/employees/${e.employee_code}`); }}>
                  <td><b>{e.full_name}</b><small>{e.employee_code} · <Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag></small></td>
                  <td>{e.position_title || '—'}<small>{e.department_name}</small></td>
                  <td className="num">{e.attendance_rate == null ? '—' : <span className={e.attendance_rate < 80 ? 'hrm-warn' : ''}>{e.attendance_rate}%</span>}</td>
                  <td className="num">{e.leave_remaining == null ? '—' : `${e.leave_remaining} d`}</td>
                  <td>{e.probation_end_date ? <span className={soon(e.probation_end_date, 14) ? 'hrm-warn' : ''}>{fmtDate(e.probation_end_date)}</span> : '—'}</td>
                  <td>{e.contract_end_date ? <span className={soon(e.contract_end_date, 30) ? 'hrm-warn' : ''}>{fmtDate(e.contract_end_date)}</span> : '—'}</td>
                  <td><small>Not tracked yet</small></td>
                  <td><small>Not tracked yet</small></td>
                  <td className="num">{e.pending_approvals ? <Tag tone="amber">{e.pending_approvals}</Tag> : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="hrm-empty">Nobody reports to you yet. People appear here once their supervisor or department is set to you.</div>}
      </section>
    </div>
  );
}
